import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import User from "../models/userModel.js";
import { findOrCreateOAuthUser } from "../auth/passport.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(clearTestDb);

describe("findOrCreateOAuthUser", () => {
  it("creates a new user on first login, with no password", async () => {
    const user = await findOrCreateOAuthUser("google", {
      id: "google-1",
      displayName: "Ada Lovelace",
      emails: [{ value: "ada@example.com" }],
    });

    expect(user.googleId).toBe("google-1");
    expect(user.email).toBe("ada@example.com");
    expect(user.password).toBeUndefined();
  });

  it("returns the same user on a repeat login instead of creating a duplicate", async () => {
    const first = await findOrCreateOAuthUser("google", {
      id: "google-1",
      displayName: "Ada Lovelace",
      emails: [{ value: "ada@example.com" }],
    });
    const second = await findOrCreateOAuthUser("google", {
      id: "google-1",
      displayName: "Ada Lovelace",
      emails: [{ value: "ada@example.com" }],
    });

    expect(second._id.toString()).toBe(first._id.toString());
    expect(await User.countDocuments()).toBe(1);
  });

  it("links to an existing password account with the same email instead of creating a duplicate", async () => {
    const existing = await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: bcrypt.hashSync("Password123", 8),
    });

    const linked = await findOrCreateOAuthUser("github", {
      id: "github-1",
      username: "buyer",
      emails: [{ value: "buyer@test.com" }],
    });

    expect(linked._id.toString()).toBe(existing._id.toString());
    expect(linked.githubId).toBe("github-1");
    expect(await User.countDocuments()).toBe(1);
  });

  it("synthesizes a unique email when the provider profile has none", async () => {
    const user = await findOrCreateOAuthUser("github", {
      id: "github-2",
      username: "privateuser",
      emails: [],
    });

    expect(user.email).toBe("github-github-2@no-email.amazin");
    expect(user.name).toBe("privateuser");
  });
});

describe("OAuth login routes", () => {
  it("are not mounted when the provider's credentials are unset (test env)", async () => {
    const google = await request(app).get("/api/users/auth/google");
    const github = await request(app).get("/api/users/auth/github");

    expect(google.status).toBe(404);
    expect(github.status).toBe(404);
  });
});

describe("userModel password requirement", () => {
  it("does not require a password for an OAuth-only user", async () => {
    const user = new User({
      name: "OAuth User",
      email: "oauth@example.com",
      googleId: "google-3",
    });
    await expect(user.validate()).resolves.toBeUndefined();
  });

  it("still requires a password for a non-OAuth user", async () => {
    const user = new User({ name: "No Password", email: "nopass@example.com" });
    await expect(user.validate()).rejects.toThrow();
  });
});
