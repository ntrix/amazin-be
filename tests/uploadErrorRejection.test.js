import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";

vi.mock("cloudinary", () => ({
  default: {
    config: vi.fn(),
    v2: {
      uploader: {
        // simulates an SDK callback invoked with a plain string, not an Error -
        // exactly the case S6671 flags
        upload: (filePath, opts, cb) => cb("plain string failure, not an Error"),
      },
    },
  },
}));

import app from "../app.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";
import { signTestToken } from "./testAuth.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
// don't rm() tmp/uploads here - shared real directory, races with other
// upload test files running concurrently. Gitignored, harmless to leave.
afterEach(clearTestDb);

describe("upload failure always rejects with a real Error", () => {
  it("wraps a non-Error rejection reason so the response reflects a proper Error", async () => {
    const seller = await User.create({
      name: "Seller",
      email: "seller@test.com",
      password: "hashed",
      isSeller: true,
    });
    const product = await Product.create({
      name: "Product",
      seller: seller._id,
      category: "Video",
      description: "desc",
      price: 1,
    });
    const token = signTestToken(seller);

    const res = await request(app)
      .post("/api/uploads")
      .set("Authorization", `Bearer ${token}`)
      .field("productId", product._id.toString())
      .attach("images", Buffer.from("fake image"), "test.jpg");

    expect(res.status).toBe(503);
    // "here" + error - only contains "Error:" if the rejection reason was
    // actually wrapped into a real Error instance (Error#toString())
    expect(res.body.message).toContain("Error:");
  });
});
