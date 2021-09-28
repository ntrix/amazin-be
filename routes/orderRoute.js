import express from "express";
import asyncHandler from "express-async-handler";
import orderControllers from "../controllers/orderControllers.js";
import { checkToken } from "../auth/token.js";
import { isAdmin, isSellerOrAdmin } from "../auth/rolls.js";

const orderRoute = express.Router();

orderRoute.use(checkToken);

orderRoute.get("/", isSellerOrAdmin, asyncHandler(orderControllers.getOrders));

orderRoute.get("/mine", asyncHandler(orderControllers.getMyOrders));

orderRoute.post("/", asyncHandler(orderControllers.createOrder));

// auth buyer, auth seller or admin
orderRoute.get("/:id", asyncHandler(orderControllers.getOrder));

// auth buyer, auth seller or admin
orderRoute.put("/:id/pay", asyncHandler(orderControllers.updateOrderPay));

orderRoute.delete("/:id", isAdmin, asyncHandler(orderControllers.deleteOrder));

// auth seller or Admin
orderRoute.put(
  "/:id/deliver",
  isAdmin,
  asyncHandler(orderControllers.updateOrderDeliver)
);

export default orderRoute;
