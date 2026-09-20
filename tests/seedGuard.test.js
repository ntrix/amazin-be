import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

describe("seed endpoints only run against an empty collection", () => {
  it("GET /api/users/seed seeds when the users collection is empty", async () => {
    const res = await request(app).get("/api/users/seed");
    expect(res.status).toBe(200);
    expect(await User.countDocuments()).toBeGreaterThan(0);
  });

  it("GET /api/users/seed is blocked once users already exist", async () => {
    await User.create({
      name: "Existing",
      email: "existing@test.com",
      password: "hashed",
    });

    const res = await request(app).get("/api/users/seed");
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Already seeded");
  });

  it("GET /api/products/admin-seed-my-db is blocked once products already exist", async () => {
    const seller = await User.create({
      name: "Seller",
      email: "seller@test.com",
      password: "hashed",
      isSeller: true,
    });
    await Product.create({
      name: "Existing product",
      seller: seller._id,
      category: "Video",
      description: "desc",
      price: 1,
    });

    const res = await request(app).get("/api/products/admin-seed-my-db");
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Already seeded");
  });

  it("both seed endpoints are hidden (404) when NODE_ENV=production", async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const users = await request(app).get("/api/users/seed");
      const products = await request(app).get("/api/products/admin-seed-my-db");

      expect(users.status).toBe(404);
      expect(products.status).toBe(404);
      expect(await User.countDocuments()).toBe(0);
    } finally {
      process.env.NODE_ENV = original;
    }
  });
});
