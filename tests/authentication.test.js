import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import User from "../models/userModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

describe("signIn", () => {
  it("succeeds with correct credentials, returns a token, and resets the fail counter", async () => {
    const user = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: bcrypt.hashSync("Password123", 8),
      failLoginCount: 2,
    });

    const res = await request(app)
      .post("/api/users/signin")
      .send({ email: "buyer@test.com", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.email).toBe("buyer@test.com");
    expect((await User.findById(user._id)).failLoginCount).toBe(0);
  });

  it("rejects a wrong password and increments the fail counter", async () => {
    await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: bcrypt.hashSync("Password123", 8),
    });

    const res = await request(app)
      .post("/api/users/signin")
      .send({ email: "buyer@test.com", password: "WrongPassword1" });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain("1 of 4 attempts");
  });
});

describe("signUp", () => {
  it("creates a new user and returns a token", async () => {
    const res = await request(app).post("/api/users/register").send({
      name: "New Buyer",
      email: "newbuyer@test.com",
      password: "Password123",
      confirmPassword: "Password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(await User.countDocuments({ email: "newbuyer@test.com" })).toBe(1);
  });

  it("rejects an email that is already registered", async () => {
    await User.create({
      name: "Existing",
      email: "existing@test.com",
      password: bcrypt.hashSync("Password123", 8),
    });

    const res = await request(app).post("/api/users/register").send({
      name: "New Buyer",
      email: "existing@test.com",
      password: "Password123",
      confirmPassword: "Password123",
    });

    expect(res.status).toBe(409);
  });
});
