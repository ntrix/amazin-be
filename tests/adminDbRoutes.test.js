import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/userModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";
import { signTestToken } from "./testAuth.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

describe("admin DB routes (backup/change)", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/products/admin-backup-my-db");
    expect(res.status).toBe(401);
  });

  it("rejects a non-admin user", async () => {
    const seller = await User.create({
      name: "Seller",
      email: "seller@test.com",
      password: "hashed",
      isSeller: true,
    });

    const res = await request(app)
      .get("/api/products/admin-backup-my-db")
      .set("Authorization", `Bearer ${signTestToken(seller)}`);

    expect(res.status).toBe(403);
  });

  it("allows an admin user", async () => {
    const admin = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "hashed",
      isAdmin: true,
    });

    const res = await request(app)
      .get("/api/products/admin-backup-my-db")
      .set("Authorization", `Bearer ${signTestToken(admin)}`);

    expect(res.status).toBe(200);
  });
});
