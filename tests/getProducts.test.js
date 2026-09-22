import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import Product from "../models/productModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

async function seedCatalog() {
  await Product.create([
    { name: "Cheap Shirt", category: "Shirts", description: "d", price: 10, countInStock: 5 },
    { name: "Mid Shirt", category: "Shirts", description: "d", price: 50, countInStock: 5 },
    { name: "Expensive Shoe", category: "Shoes", description: "d", price: 200, countInStock: 5 },
  ]);
}

describe("getProducts", () => {
  it("filters by category", async () => {
    await seedCatalog();

    const res = await request(app).get("/api/products").query({ category: "Shoes" });

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].name).toBe("Expensive Shoe");
  });

  it("filters by price range (min/max)", async () => {
    await seedCatalog();

    const res = await request(app).get("/api/products").query({ min: 20, max: 100 });

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].name).toBe("Mid Shirt");
  });

  it("sorts by price ascending when order=lowest", async () => {
    await seedCatalog();

    const res = await request(app).get("/api/products").query({ order: "lowest" });

    expect(res.status).toBe(200);
    expect(res.body.products.map((p) => p.name)).toEqual([
      "Cheap Shirt",
      "Mid Shirt",
      "Expensive Shoe",
    ]);
  });

  it("paginates results and reports the correct total count and page count", async () => {
    await seedCatalog();

    const res = await request(app)
      .get("/api/products")
      .query({ pageSize: 2, pageNumber: 2, order: "lowest" });

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].name).toBe("Expensive Shoe");
    expect(res.body.count).toBe(3);
    expect(res.body.pages).toBe(2);
  });

  it("falls back to regex search by name when ATLAS_SEARCH_ENABLED is not set", async () => {
    await seedCatalog();
    expect(process.env.ATLAS_SEARCH_ENABLED).not.toBe("true");

    const res = await request(app).get("/api/products").query({ name: "shirt" });

    expect(res.status).toBe(200);
    expect(res.body.products.map((p) => p.name).sort()).toEqual([
      "Cheap Shirt",
      "Mid Shirt",
    ]);
    expect(res.body.count).toBe(2);
  });

  it("routes name search through Atlas Search when ATLAS_SEARCH_ENABLED is true, falling back to regex on failure", async () => {
    await seedCatalog();
    process.env.ATLAS_SEARCH_ENABLED = "true";

    try {
      const res = await request(app).get("/api/products").query({ name: "shirt" });

      // mongodb-memory-server doesn't support $search - the controller must
      // catch that and fall back to the same regex results as the test above,
      // not 500 or return an empty page.
      expect(res.status).toBe(200);
      expect(res.body.products.map((p) => p.name).sort()).toEqual([
        "Cheap Shirt",
        "Mid Shirt",
      ]);
    } finally {
      delete process.env.ATLAS_SEARCH_ENABLED;
    }
  });

  describe("seller filter, category=Video fallback", () => {
    it("falls back to whoever actually owns the Video catalog when the requested seller id doesn't match", async () => {
      const realOwner = new mongoose.Types.ObjectId();
      const staleId = new mongoose.Types.ObjectId();
      await Product.create({
        name: "Some Movie",
        category: "Video",
        description: "d",
        price: 9,
        countInStock: 5,
        seller: realOwner,
      });

      const res = await request(app)
        .get("/api/products")
        .query({ category: "Video", seller: staleId.toString() });

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe("Some Movie");
    });

    it("uses the requested seller as-is when it does own Video products", async () => {
      const owner = new mongoose.Types.ObjectId();
      const otherSeller = new mongoose.Types.ObjectId();
      await Product.create([
        { name: "Owner Movie", category: "Video", description: "d", price: 9, countInStock: 5, seller: owner },
        { name: "Other Movie", category: "Video", description: "d", price: 9, countInStock: 5, seller: otherSeller },
      ]);

      const res = await request(app)
        .get("/api/products")
        .query({ category: "Video", seller: owner.toString() });

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe("Owner Movie");
    });

    it("does not fall back for a non-Video seller filter (a real storefront with 0 products stays 0)", async () => {
      const emptySeller = new mongoose.Types.ObjectId();
      const otherSeller = new mongoose.Types.ObjectId();
      await Product.create({
        name: "Someone Else's Shirt",
        category: "Shirts",
        description: "d",
        price: 9,
        countInStock: 5,
        seller: otherSeller,
      });

      const res = await request(app)
        .get("/api/products")
        .query({ seller: emptySeller.toString() });

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(0);
    });
  });
});
