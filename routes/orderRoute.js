import express from "express";
import asyncHandler from "express-async-handler";
import orderControllers from "../controllers/orderControllers.js";
import { isAdmin, isAuth, isSellerOrAdmin } from "../utils.js";

const orderRoute = express.Router();

orderRoute.use(isAuth);

orderRoute.get("/", isSellerOrAdmin, asyncHandler(orderControllers.getOrders));

orderRoute.get("/mine", asyncHandler(orderControllers.getMyOrder));

orderRoute.post("/", asyncHandler(orderControllers.createOrder));

orderRoute.get("/:id", asyncHandler(orderControllers.getOrder));

orderRoute.put("/:id/pay", asyncHandler(orderControllers.updateOrderPay));

orderRoute.delete("/:id", isAdmin, asyncHandler(orderControllers.deleteOrder));

orderRoute.put(
  "/:id/deliver",
  isAdmin,
  asyncHandler(orderControllers.updateOrderDeliver)
);

export default orderRoute;
