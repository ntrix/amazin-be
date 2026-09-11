import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";
import { signTestToken } from "./testAuth.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
// don't rm() tmp/uploads here - shared real directory, races with other
// upload test files running concurrently. Gitignored, harmless to leave.
afterEach(clearTestDb);

describe("multer file size limit", () => {
  it("rejects a file over the 5mb limit", async () => {
    const admin = signTestToken({
      _id: "000000000000000000000000",
      name: "Admin",
      email: "admin@test.com",
      isAdmin: true,
    });
    const oversized = Buffer.alloc(6 * 1024 * 1024, "a");

    const res = await request(app)
      .post("/api/uploads")
      .set("Authorization", `Bearer ${admin}`)
      .field("productId", "000000000000000000000001")
      .attach("images", oversized, "big.jpg");

    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(201);
  });
});
