import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";
import { signTestToken } from "./testAuth.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

async function createProduct() {
  return Product.create({
    name: "Product",
    category: "Video",
    description: "desc",
    price: 10,
    countInStock: 5,
  });
}

describe("postReviews", () => {
  it("adds a review and updates the product's rating and review count", async () => {
    const buyer = await User.create({ name: "Buyer", email: "buyer@test.com", password: "hashed" });
    const product = await createProduct();

    const res = await request(app)
      .post(`/api/products/${product._id}/reviews`)
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send({ rating: 5, comment: "Great!" });

    expect(res.status).toBe(201);
    const updated = await Product.findById(product._id);
    expect(updated.numReviews).toBe(1);
    expect(updated.rating).toBe(5);
  });

  it("rejects a second review from the same user on the same product", async () => {
    const buyer = await User.create({ name: "Buyer", email: "buyer@test.com", password: "hashed" });
    const product = await createProduct();

    await request(app)
      .post(`/api/products/${product._id}/reviews`)
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send({ rating: 5, comment: "Great!" });

    const res = await request(app)
      .post(`/api/products/${product._id}/reviews`)
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send({ rating: 1, comment: "Changed my mind" });

    expect(res.status).toBe(409);
    expect((await Product.findById(product._id)).numReviews).toBe(1);
  });

  it("returns 404 when the product doesn't exist", async () => {
    const buyer = await User.create({ name: "Buyer", email: "buyer@test.com", password: "hashed" });

    const res = await request(app)
      .post("/api/products/000000000000000000000099/reviews")
      .set("Authorization", `Bearer ${signTestToken(buyer)}`)
      .send({ rating: 5, comment: "Great!" });

    expect(res.status).toBe(404);
  });

  it("averages the rating across reviews from different users", async () => {
    const buyer1 = await User.create({ name: "Buyer1", email: "buyer1@test.com", password: "hashed" });
    const buyer2 = await User.create({ name: "Buyer2", email: "buyer2@test.com", password: "hashed" });
    const product = await createProduct();

    await request(app)
      .post(`/api/products/${product._id}/reviews`)
      .set("Authorization", `Bearer ${signTestToken(buyer1)}`)
      .send({ rating: 4, comment: "Good" });
    await request(app)
      .post(`/api/products/${product._id}/reviews`)
      .set("Authorization", `Bearer ${signTestToken(buyer2)}`)
      .send({ rating: 2, comment: "Meh" });

    const updated = await Product.findById(product._id);
    expect(updated.numReviews).toBe(2);
    expect(updated.rating).toBe(3);
  });
});
