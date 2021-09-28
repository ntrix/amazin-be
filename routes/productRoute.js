import express from "express";
import asyncHandler from "express-async-handler";
import productControllers from "../controllers/productControllers.js";
import { checkToken } from "../auth/token.js";
import { isAdmin, isSellerOrAdmin } from "../auth/rolls.js";
import { config } from "dotenv";

config();
const productRoute = express.Router();

productRoute.get(
  `/admin-backup-my-db/${process.env.DB_key}`,
  checkToken,
  isAdmin,
  asyncHandler(productControllers.adminBackup)
);

productRoute.get(
  `/admin-change-my-db/${process.env.DB_key}`,
  checkToken,
  isAdmin,
  asyncHandler(productControllers.adminUpdate)
);

productRoute.get("/", asyncHandler(productControllers.getProducts));

productRoute.get("/categories", asyncHandler(productControllers.getCategories));

productRoute.get("/admin-seed-my-db", asyncHandler(productControllers.seedDB));

productRoute.get("/:id", asyncHandler(productControllers.getProduct));

productRoute.use(checkToken);

productRoute.post(
  "/",
  isSellerOrAdmin,
  asyncHandler(productControllers.createProduct)
);

productRoute.put(
  "/:id",
  isSellerOrAdmin,
  asyncHandler(productControllers.updateProduct)
);

productRoute.delete(
  "/:id",
  isAdmin,
  asyncHandler(productControllers.deleteProduct)
);

productRoute.post("/:id/reviews", asyncHandler(productControllers.postReviews));

export default productRoute;
