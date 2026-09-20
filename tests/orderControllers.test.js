import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";
import { signTestToken } from "./testAuth.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

async function createProduct(overrides = {}) {
  return Product.create({
    name: "Product",
    category: "Video",
    description: "desc",
    price: 10,
    countInStock: 5,
    ...overrides,
  });
}

const orderPayload = (productId, overrides = {}) => ({
  orderItems: [
    {
      name: "Item",
      qty: 1,
      image: "/img.png",
      price: 10,
      product: productId ?? "000000000000000000000099",
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
  it("POST /api/orders creates an order for the authenticated buyer and decrements stock", async () => {
    const buyer = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: "hashed",
    });
    const product = await createProduct({ countInStock: 5 });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send(orderPayload(product._id));

    expect(res.status).toBe(201);
    expect(res.body.order.user).toBe(buyer._id.toString());
    expect((await Product.findById(product._id)).countInStock).toBe(4);
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
      .send(orderPayload(undefined, { orderItems: [] }));

    expect(res.status).toBe(400);
  });

  it("POST /api/orders rejects an order that exceeds available stock, without changing it", async () => {
    const buyer = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: "hashed",
    });
    const product = await createProduct({ countInStock: 2 });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send(orderPayload(product._id, { orderItems: [{ name: "Item", qty: 3, image: "/img.png", price: 10, product: product._id }] }));

    expect(res.status).toBe(409);
    expect((await Product.findById(product._id)).countInStock).toBe(2);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("POST /api/orders rolls back stock already reserved when a later item in the cart is out of stock", async () => {
    const buyer = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: "hashed",
    });
    const inStock = await createProduct({ name: "In stock", countInStock: 5 });
    const outOfStock = await createProduct({ name: "Out of stock", countInStock: 1 });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send(
        orderPayload(undefined, {
          orderItems: [
            { name: "In stock", qty: 1, image: "/img.png", price: 10, product: inStock._id },
            { name: "Out of stock", qty: 5, image: "/img.png", price: 10, product: outOfStock._id },
          ],
        })
      );

    expect(res.status).toBe(409);
    expect((await Product.findById(inStock._id)).countInStock).toBe(5);
    expect((await Product.findById(outOfStock._id)).countInStock).toBe(1);
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

    expect(res.status).toBe(403);
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
