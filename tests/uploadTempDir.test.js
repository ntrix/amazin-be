import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../app.js";
import { startTestDb, stopTestDb, clearTestDb } from "./testDb.js";
import { signTestToken } from "./testAuth.js";

const projectTempDir = path.join(path.resolve(), "tmp", "uploads");
const systemTempDir = "/tmp/uploads";

beforeAll(startTestDb);
afterAll(stopTestDb);
afterEach(async () => {
  await clearTestDb();
  await fs.promises.rm(projectTempDir, { recursive: true, force: true });
});

describe("upload temp files land in the project-local dir, not the shared OS /tmp", () => {
  it("writes to tmp/uploads under the project, and never to /tmp/uploads", async () => {
    const admin = signTestToken({
      _id: "000000000000000000000000",
      name: "Admin",
      email: "admin@test.com",
      isAdmin: true,
    });

    const before = fs.existsSync(systemTempDir)
      ? fs.readdirSync(systemTempDir).length
      : 0;

    const res = await request(app)
      .post("/api/uploads")
      .set("Authorization", `Bearer ${admin}`)
      .field("productId", "000000000000000000000001")
      .attach("images", Buffer.from("fake image bytes"), "test.jpg");

    // the fake productId doesn't exist, so the controller 404s - but only
    // *after* multer has already written the file to disk
    expect(res.status).toBe(404);

    expect(fs.existsSync(projectTempDir)).toBe(true);
    expect(fs.readdirSync(projectTempDir).length).toBeGreaterThan(0);

    const after = fs.existsSync(systemTempDir)
      ? fs.readdirSync(systemTempDir).length
      : 0;
    expect(after).toBe(before);
  });
});
