import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import User from "../models/userModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";
import { signTestToken } from "./testAuth.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

describe("updateProfile", () => {
  it("PATCH /api/users/profile updates the authenticated user's own name/email/currency", async () => {
    const user = await User.create({ name: "Buyer", email: "buyer@test.com", password: "hashed" });

    const res = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${signTestToken(user)}`)
      .send({ _id: user._id.toString(), name: "New Name", email: "new@test.com", currency: "EUR" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
    expect(res.body.email).toBe("new@test.com");
    expect((await User.findById(user._id)).currency).toBe("EUR");
  });

  it("PATCH /api/users/profile verifies the user as a seller and stores the seller profile", async () => {
    const user = await User.create({ name: "Buyer", email: "buyer@test.com", password: "hashed" });

    const res = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${signTestToken(user)}`)
      .send({
        _id: user._id.toString(),
        verify: true,
        seller: { name: "My Shop", description: "Selling things" },
      });

    expect(res.status).toBe(200);
    expect(res.body.isSeller).toBe(true);
    expect(res.body.seller.name).toBe("My Shop");
    expect((await User.findById(user._id)).isSeller).toBe(true);
  });

  it("PATCH /api/users/profile rejects a password change with the wrong current password", async () => {
    const user = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: bcrypt.hashSync("Correct123", 8),
    });

    const res = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${signTestToken(user)}`)
      .send({ _id: user._id.toString(), oldPassword: "WrongPassword1", password: "New12345" });

    expect(res.status).toBe(401);
  });

  it("PATCH /api/users/profile rejects a new password that doesn't match its confirmation", async () => {
    const user = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: bcrypt.hashSync("Correct123", 8),
    });

    const res = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${signTestToken(user)}`)
      .send({
        _id: user._id.toString(),
        oldPassword: "Correct123",
        password: "New12345",
        confirmPassword: "Different1",
      });

    expect(res.status).toBe(400);
  });
});
