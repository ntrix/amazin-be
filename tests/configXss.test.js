import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";

vi.mock("axios", () => ({
  default: { get: vi.fn() },
}));

import axios from "axios";
import app from "../app.js";
import { startTestDb, stopTestDb } from "./testDb.js";

beforeAll(startTestDb);
afterAll(stopTestDb);

describe("config endpoints always reply as JSON, even if upstream returns a raw string", () => {
  it("GET /api/config/crypto sets application/json even for a string upstream body", async () => {
    // simulates an upstream (Bitfinex) response that isn't parsed JSON - the
    // exact case that used to make res.send() fall back to text/html
    axios.get.mockResolvedValueOnce({ data: "<script>alert(1)</script>" });

    const res = await request(app).get("/api/config/crypto");

    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toBe("<script>alert(1)</script>");
  });

  it("GET /api/config/BTCHist sets application/json even for a string upstream body", async () => {
    axios.get.mockResolvedValueOnce({ data: "<script>alert(1)</script>" });

    const res = await request(app).get("/api/config/BTCHist?count=5");

    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toBe("<script>alert(1)</script>");
  });

  it("still returns normal JSON data for the expected object-shaped upstream response", async () => {
    axios.get.mockResolvedValueOnce({ data: [["tBTCUSD", 50000]] });

    const res = await request(app).get("/api/config/crypto");

    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual([["tBTCUSD", 50000]]);
  });
});
