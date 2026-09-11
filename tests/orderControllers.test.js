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

const orderPayload = (overrides = {}) => ({
  orderItems: [
    {
      name: "Item",
      qty: 1,
      image: "/img.png",
      price: 10,
      product: "000000000000000000000099",
    },
  ],
  shippingAddress: {
    fullName: "Buyer",
    address: "1 Main St",
    city: "City",
    postalCode: "00000",
    country: "Country",
  },
  paymentMethod: "PayPal",
  itemsPrice: 10,
  shippingPrice: 1,
  taxPrice: 1,
  totalPrice: 12,
  ...overrides,
});

describe("orderControllers", () => {
  it("POST /api/orders creates an order for the authenticated buyer", async () => {
    const buyer = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: "hashed",
    });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send(orderPayload());

    expect(res.status).toBe(201);
    expect(res.body.order.user).toBe(buyer._id.toString());
  });

  it("POST /api/orders rejects an empty cart", async () => {
    const buyer = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: "hashed",
    });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send(orderPayload({ orderItems: [] }));

    expect(res.status).toBe(411);
  });

  it("GET /api/orders/mine only returns the caller's own orders", async () => {
    const buyer = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: "hashed",
    });
    const otherBuyer = await User.create({
      name: "Other",
      email: "other@test.com",
      password: "hashed",
    });
    await Order.create({ ...orderPayload(), user: buyer._id });
    await Order.create({ ...orderPayload(), user: otherBuyer._id });

    const res = await request(app)
      .get("/api/orders/mine")
      .set("Authorization", `Bearer ${signTestToken(buyer)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user).toBe(buyer._id.toString());
  });

  it("GET /api/orders/:id lets the owning buyer view their order", async () => {
    const buyer = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: "hashed",
    });
    const order = await Order.create({ ...orderPayload(), user: buyer._id });

    const res = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Authorization", `Bearer ${signTestToken(buyer)}`);

    expect(res.status).toBe(200);
  });

  it("GET /api/orders/:id blocks an unrelated user", async () => {
    const buyer = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: "hashed",
    });
    const stranger = await User.create({
      name: "Stranger",
      email: "stranger@test.com",
      password: "hashed",
    });
    const order = await Order.create({ ...orderPayload(), user: buyer._id });

    const res = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Authorization", `Bearer ${signTestToken(stranger)}`);

    expect(res.status).toBe(401);
  });

  it("GET /api/orders/:id lets an admin view any order", async () => {
    const buyer = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: "hashed",
    });
    const admin = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "hashed",
      isAdmin: true,
    });
    const order = await Order.create({ ...orderPayload(), user: buyer._id });

    const res = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Authorization", `Bearer ${signTestToken(admin)}`);

    expect(res.status).toBe(200);
  });
});
