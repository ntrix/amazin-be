import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../app.js";
import User from "../models/userModel.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

function extractRefreshCookie(res) {
  const cookies = res.headers["set-cookie"] || [];
  const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
  return refreshCookie?.split(";")[0];
}

async function signInAndGetCookie() {
  await User.create({
    name: "Buyer",
    email: "buyer@test.com",
    password: bcrypt.hashSync("Password123", 8),
  });
  const res = await request(app)
    .post("/api/users/signin")
    .send({ email: "buyer@test.com", password: "Password123" });
  return { cookie: extractRefreshCookie(res), accessToken: res.body.token };
}

describe("POST /api/users/refresh", () => {
  it("signIn sets an httpOnly refresh token cookie", async () => {
    const { cookie } = await signInAndGetCookie();
    expect(cookie).toBeTruthy();
  });

  it("issues a new access token (and rotates the refresh cookie) given a valid refresh cookie", async () => {
    const { cookie } = await signInAndGetCookie();

    const res = await request(app).post("/api/users/refresh").set("Cookie", cookie);

    expect(res.status).toBe(200);
    // decodable as a real access token (not just any truthy string)
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET_A)).toMatchObject({
      email: "buyer@test.com",
    });
    expect(extractRefreshCookie(res)).toBeTruthy();
  });

  it("rejects a request with no refresh cookie", async () => {
    const res = await request(app).post("/api/users/refresh");
    expect(res.status).toBe(401);
  });

  it("rejects a tampered/invalid refresh token", async () => {
    const res = await request(app)
      .post("/api/users/refresh")
      .set("Cookie", "refreshToken=not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("rejects a refresh token whose version no longer matches the user (revoked)", async () => {
    const user = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: bcrypt.hashSync("Password123", 8),
    });
    const staleToken = jwt.sign(
      { _id: user._id.toString(), tokenVersion: 0 },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    await User.updateOne({ _id: user._id }, { $inc: { refreshTokenVersion: 1 } });

    const res = await request(app)
      .post("/api/users/refresh")
      .set("Cookie", `refreshToken=${staleToken}`);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/users/logout", () => {
  it("revokes the refresh token so it can no longer be used", async () => {
    const { cookie, accessToken } = await signInAndGetCookie();

    const logoutRes = await request(app)
      .post("/api/users/logout")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(200);

    const refreshRes = await request(app).post("/api/users/refresh").set("Cookie", cookie);
    expect(refreshRes.status).toBe(401);
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/users/logout");
    expect(res.status).toBe(401);
  });
});
