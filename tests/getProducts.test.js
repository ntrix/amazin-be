import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
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
});
