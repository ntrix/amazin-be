import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

describe("User model", () => {
  it("enforces unique email and defaults isAdmin/isSeller to false", async () => {
    // unique: true builds an index in the background - wait for it,
    // otherwise the second create() below can race ahead of the index
    await User.init();

    const user = await User.create({
      name: "Alice",
      email: "alice@test.com",
      password: "hashed",
    });
    expect(user.isAdmin).toBe(false);
    expect(user.isSeller).toBe(false);

    await expect(
      User.create({
        name: "Alice Again",
        email: "alice@test.com",
        password: "hashed",
      })
    ).rejects.toThrow();
  });
});

describe("Product model", () => {
  it("rejects a product missing required fields", async () => {
    await expect(
      Product.create({ name: "Incomplete Product" })
    ).rejects.toThrow();
  });
});
