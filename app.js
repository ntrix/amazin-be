import "dotenv/config";
import express from "express";
import helmet from "helmet";
import path from "path";
import cors from "cors";
import rateLimit from "express-rate-limit";
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

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000"
).split(",");
allowedOrigins.push("https://amazin.vercel.app");
app.use(cors({ origin: allowedOrigins }));

app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

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
  console.error(err);
  res.status(500).send({ message: "Internal server error" });
});

export default app;
