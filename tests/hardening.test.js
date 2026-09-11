import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { startTestDb, stopTestDb } from "./testDb.js";

beforeAll(startTestDb);
afterAll(stopTestDb);

describe("CORS allowlist", () => {
  it("reflects an allowed origin", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Origin", "http://localhost:3000");
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000"
    );
  });

  it("does not reflect a disallowed origin", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Origin", "https://evil.com");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("rate limiting", () => {
  it("attaches rate-limit headers to /api responses", async () => {
    const res = await request(app).get("/api/products");
    expect(res.headers).toHaveProperty("x-ratelimit-limit");
  });
});

describe("error handler", () => {
  it("hides internal error details behind a generic message", async () => {
    const res = await request(app).get("/api/products/not-a-valid-object-id");
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Internal server error");
  });
});
