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

async function createSellerAndProduct() {
  const seller = await User.create({
    name: "Seller A",
    email: "sellerA@test.com",
    password: "hashed",
    isSeller: true,
  });
  const product = await Product.create({
    name: "Seller A's product",
    seller: seller._id,
    category: "Video",
    description: "desc",
    price: 10,
  });
  return { seller, product };
}

describe("updateProduct ownership", () => {
  it("blocks a different seller from editing someone else's product", async () => {
    const { product } = await createSellerAndProduct();
    const sellerB = await User.create({
      name: "Seller B",
      email: "sellerB@test.com",
      password: "hashed",
      isSeller: true,
    });

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${signTestToken(sellerB)}`)
      .send({ name: "Hacked" });

    expect(res.status).toBe(403);

    const untouched = await Product.findById(product._id);
    expect(untouched.name).toBe("Seller A's product");
  });

  it("allows the owning seller to edit their own product", async () => {
    const { seller, product } = await createSellerAndProduct();

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${signTestToken(seller)}`)
      .send({
        name: "Updated by owner",
        price: 20,
        category: "Video",
        description: "desc",
        countInStock: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.product.name).toBe("Updated by owner");
  });

  it("allows an admin to edit any seller's product", async () => {
    const { product } = await createSellerAndProduct();
    const admin = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "hashed",
      isAdmin: true,
    });

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${signTestToken(admin)}`)
      .send({
        name: "Updated by admin",
        price: 30,
        category: "Video",
        description: "desc",
        countInStock: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.product.name).toBe("Updated by admin");
  });
});
