import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

vi.mock("@sendgrid/mail", () => ({
  default: { setApiKey: vi.fn(), send: vi.fn() },
}));

import app from "../app.js";

describe("contact form logging is not vulnerable to log injection", () => {
  let logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("strips newlines from user-controlled fields before logging", async () => {
    await request(app)
      .post("/api/users/contact")
      .send({
        name: "Attacker\nFAKE LOG ENTRY: admin logged in",
        email: "a@test.com",
        phone: "123",
        text: "hello\nmore injected lines",
      });

    const loggedArgs = logSpy.mock.calls.flat().join(" ");
    expect(loggedArgs).not.toContain("\n");
    expect(loggedArgs).toContain("Attacker FAKE LOG ENTRY: admin logged in");
  });
});
