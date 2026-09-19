import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn().mockRejectedValue(new Error("Unauthorized")),
  },
}));

import app from "../app.js";

describe("contact form survives a SendGrid failure", () => {
  it("responds 500 instead of leaving an unhandled rejection when sgMail.send rejects", async () => {
    const res = await request(app)
      .post("/api/users/contact")
      .send({ name: "A", email: "a@test.com", phone: "123", text: "hi" });

    // on the old (unfixed) code this assertion fails: sgMail.send() was
    // fired without awaiting it, so the handler always answered 200
    // immediately and the rejection surfaced later as an unhandled
    // rejection that crashed the whole process instead of failing here
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Failed to send message");
  });
});
