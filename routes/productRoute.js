import express from "express";
import asyncHandler from "express-async-handler";
import productControllers from "../controllers/productControllers.js";
import { isAdmin, isAuth, isSellerOrAdmin } from "../utils.js";

const productRoute = express.Router();

productRoute.get(
  "/admin-backup-my-db",
  asyncHandler(productControllers.adminBackup)
);

productRoute.get(
  "/admin-change-my-db",
  asyncHandler(productControllers.adminUpdate)
);

productRoute.get("/", asyncHandler(productControllers.getProducts));

productRoute.get("/categories", asyncHandler(productControllers.getCategories));

productRoute.get("/admin-seed-my-db", asyncHandler(productControllers.seedDB));

productRoute.get("/:id", asyncHandler(productControllers.getProduct));

productRoute.use(isAuth);

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
