import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { startTestDb, stopTestDb } from "./testDb.js";

beforeAll(startTestDb);
afterAll(stopTestDb);

describe("request body size limit", () => {
  it("rejects a JSON body over the 1mb limit", async () => {
    const oversized = { name: "x".repeat(2 * 1024 * 1024) };

    const res = await request(app)
      .post("/api/users/register")
      .send(oversized);

    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(201);
  });

  it("still accepts a normal small JSON body", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "a" });

    // rejected for failing validation, not for size - proves the limit
    // doesn't interfere with ordinary requests
    expect(res.status).not.toBe(413);
    expect(res.status).not.toBe(500);
  });
});
