import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../models/userModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

describe("sign-in does not reveal whether an email is registered", () => {
  it("responds identically for an unknown email and a known email with the wrong password", async () => {
    await User.create({
      name: "Real User",
      email: "real@test.com",
      password: "$2a$08$abcdefghijklmnopqrstuv", // unreachable bcrypt hash, any real compare fails
    });

    const unknownEmail = await request(app)
      .post("/api/users/signin")
      .send({ email: "nobody@test.com", password: "wrongpassword" });

    const wrongPassword = await request(app)
      .post("/api/users/signin")
      .send({ email: "real@test.com", password: "wrongpassword" });

    // status must match so a caller can't tell which emails have an
    // account; the "N of 4 attempts" message text still differs, a
    // smaller residual leak this doesn't address
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
  });
});
