import "dotenv/config";
import express from "express";
import helmet from "helmet";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./auth/passport.js";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import logger from "./lib/logger.js";
import Sentry from "./lib/sentry.js";
import { AppError } from "./lib/errors.js";
import productRoute from "./routes/productRoute.js";
import userRoute from "./routes/userRoute.js";
import orderRoute from "./routes/orderRoute.js";
import uploadRoute from "./routes/uploadRoute.js";
import configRoute from "./routes/configRoute.js";

const app = express();
app.use(
  helmet({
    referrerPolicy: { policy: "no-referrer-when-downgrade" },
  })
);
app.use(pinoHttp({ logger }));
app.use(cookieParser());
app.use(passport.initialize());

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000"
).split(",");
allowedOrigins.push("https://amazin.vercel.app");
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/uploads", uploadRoute);
app.use("/api/users", userRoute);
app.use("/api/products", productRoute);
app.use("/api/orders", orderRoute);
app.use("/api/config", configRoute);

const __dirname = path.resolve();

app.use("/uploads", express.static(path.join(__dirname, "/uploads")));
app.get("*", (req, res) => res.status(404).send({ message: "Page not found" }));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof AppError) {
    req.log.warn({ err }, "request rejected");
    return res.status(err.statusCode).send({ message: err.message });
  }
  req.log.error({ err }, "unhandled request error");
  Sentry.captureException(err);
  res.status(500).send({ message: "Internal server error" });
});

export default app;
