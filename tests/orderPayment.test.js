import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";
import { signTestToken } from "./testAuth.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

const orderPayload = (userId) => ({
  orderItems: [{ name: "Item", qty: 1, image: "/img.png", price: 10, product: "000000000000000000000099" }],
  shippingAddress: { fullName: "Buyer", address: "1 Main St", city: "City", postalCode: "00000", country: "Country" },
  paymentMethod: "PayPal",
  itemsPrice: 10,
  shippingPrice: 1,
  taxPrice: 1,
  totalPrice: 12,
  user: userId,
});

describe("updateOrderPay", () => {
  it("PUT /api/orders/:id/pay marks the order paid and stores the PayPal payment result", async () => {
    const buyer = await User.create({ name: "Buyer", email: "buyer@test.com", password: "hashed" });
    const order = await Order.create(orderPayload(buyer._id));

    const res = await request(app)
      .put(`/api/orders/${order._id}/pay`)
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send({ id: "PAYID-123", status: "COMPLETED", update_time: "2026-09-20T00:00:00Z", email_address: "buyer@test.com" });

    expect(res.status).toBe(200);
    const updated = await Order.findById(order._id);
    expect(updated.isPaid).toBe(true);
    expect(updated.paidAt).toBeTruthy();
    expect(updated.paymentResult.id).toBe("PAYID-123");
    expect(updated.paymentResult.status).toBe("COMPLETED");
  });

  it("PUT /api/orders/:id/pay blocks a user who doesn't own the order", async () => {
    const buyer = await User.create({ name: "Buyer", email: "buyer@test.com", password: "hashed" });
    const stranger = await User.create({ name: "Stranger", email: "stranger@test.com", password: "hashed" });
    const order = await Order.create(orderPayload(buyer._id));

    const res = await request(app)
      .put(`/api/orders/${order._id}/pay`)
      .set("Authorization", `Bearer ${signTestToken(stranger)}`)
      .send({ id: "PAYID-123", status: "COMPLETED" });

    expect(res.status).toBe(403);
    expect((await Order.findById(order._id)).isPaid).toBe(false);
  });

  it("PUT /api/orders/:id/pay returns 404 for an order that doesn't exist", async () => {
    const buyer = await User.create({ name: "Buyer", email: "buyer@test.com", password: "hashed" });

    const res = await request(app)
      .put("/api/orders/000000000000000000000099/pay")
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send({ id: "PAYID-123", status: "COMPLETED" });

    expect(res.status).toBe(404);
  });
});
