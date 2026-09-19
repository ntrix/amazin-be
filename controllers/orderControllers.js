import Order from "../models/orderModel.js";
import { isOrderOwnerOrAdmin, isOrderSellerOrAdmin } from "../domain/authorization.js";
import { BadRequestError } from "../lib/errors.js";

const NOT_FOUND = "Order Not Found";
const UNAUTHORIZED = "Unauthorized zone";

const orderControllers = {
  async getOrders(req, res) {
    const seller = req.query.seller || "";
    const sellerFilter = seller ? { seller } : {};

    const orders = await Order.find({ ...sellerFilter }).populate(
      "user",
      "name"
    );
    res.send(orders);
  },

  async getMyOrders(req, res) {
    const orders = await Order.find({ user: req.user._id });
    res.send(orders);
  },

  async createOrder(req, res) {
    if (req.body.orderItems.length === 0) {
      throw new BadRequestError("Cart is empty");
    }
    const order = new Order({
      seller: req.body.orderItems[0].seller,
      orderItems: req.body.orderItems,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      itemsPrice: req.body.itemsPrice,
      shippingPrice: req.body.shippingPrice,
      taxPrice: req.body.taxPrice,
      totalPrice: req.body.totalPrice,
      user: req.user._id,
    });
    const createdOrder = await order.save();
    res.status(201).send({ message: "New Order Created", order: createdOrder });
  },

  async getOrder(req, res) {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).send({ message: NOT_FOUND });

    if (!isOrderOwnerOrAdmin(order, req.user))
      return res.status(403).send({ message: UNAUTHORIZED });

    return res.send(order);
  },

  async updateOrderPay(req, res) {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).send({ message: NOT_FOUND });

    if (!isOrderOwnerOrAdmin(order, req.user))
      return res.status(403).send({ message: UNAUTHORIZED });

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };
    const updatedOrder = await order.save();
    return res.send({ message: "Order Paid", order: updatedOrder });
  },

  async deleteOrder(req, res) {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).send({ message: NOT_FOUND });

    const deletedOrder = await order.remove();
    return res.send({ message: "Order Deleted", order: deletedOrder });
  },

  async updateOrderDeliver(req, res) {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).send({ message: NOT_FOUND });

    if (!isOrderSellerOrAdmin(order, req.user))
      return res.status(403).send({ message: UNAUTHORIZED });

    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    return res.send({ message: "Order Delivered", order: updatedOrder });
  },
};

export default orderControllers;
