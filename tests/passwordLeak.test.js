import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/userModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";
import { signTestToken } from "./testAuth.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

describe("password hash never leaves user endpoints", () => {
  it("GET /api/users/:id (public) omits password", async () => {
    const user = await User.create({
      name: "Alice",
      email: "alice@test.com",
      password: "hashed-secret",
    });

    const res = await request(app).get(`/api/users/${user._id}`);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("password");
  });

  it("GET /api/users (admin) omits password for every user", async () => {
    const admin = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "hashed-secret",
      isAdmin: true,
    });
    await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "hashed-secret",
    });

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${signTestToken(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const u of res.body) {
      expect(u).not.toHaveProperty("password");
    }
  });

  it("GET /api/users/top-sellers omits password", async () => {
    await User.create({
      name: "Seller",
      email: "seller@test.com",
      password: "hashed-secret",
      isSeller: true,
    });

    const res = await request(app).get("/api/users/top-sellers");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const u of res.body) {
      expect(u).not.toHaveProperty("password");
    }
  });
});
