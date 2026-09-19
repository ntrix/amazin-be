import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";

const mockUpload = vi.fn();
vi.mock("cloudinary", () => ({
  default: {
    config: vi.fn(),
    v2: { uploader: { upload: (...args) => mockUpload(...args) } },
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
afterEach(async () => {
  await clearTestDb();
  mockUpload.mockReset();
});

async function createSellerAndProduct() {
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
  return { seller, product };
}

describe("upload failure never crashes the process and never leaks internals to the client", () => {
  it("responds 500 with a generic message for a non-Error rejection reason (a plain string)", async () => {
    mockUpload.mockImplementation((filePath, opts, cb) =>
      cb("plain string failure, not an Error")
    );
    const { seller, product } = await createSellerAndProduct();

    const res = await request(app)
      .post("/api/uploads")
      .set("Authorization", `Bearer ${signTestToken(seller)}`)
      .field("productId", product._id.toString())
      .attach("images", Buffer.from("fake image"), "test.jpg");

    // on the old code this was 503 and echoed "here" + the raw rejection
    // reason straight into the response body; the internal error class
    // hierarchy now routes anything unexpected to the generic 500 handler,
    // which never leaks internals to the client (detail still reaches the
    // server logs via req.log.error, see app.js)
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Internal server error");
  });

  it("responds 500 with a generic message when the SDK already rejects with a real Error", async () => {
    mockUpload.mockImplementation((filePath, opts, cb) =>
      cb(new Error("cloudinary quota exceeded"))
    );
    const { seller, product } = await createSellerAndProduct();

    const res = await request(app)
      .post("/api/uploads")
      .set("Authorization", `Bearer ${signTestToken(seller)}`)
      .field("productId", product._id.toString())
      .attach("images", Buffer.from("fake image"), "test.jpg");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Internal server error");
  });
});
