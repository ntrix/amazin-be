import { describe, it, expect, afterEach, vi } from "vitest";

describe("JWT secret fail-fast", () => {
  const original = process.env.JWT_SECRET_A;

  afterEach(() => {
    process.env.JWT_SECRET_A = original;
    vi.resetModules();
  });

  it("throws on import when JWT_SECRET_A is unset, instead of falling back to a public secret", async () => {
    delete process.env.JWT_SECRET_A;
    vi.resetModules();
    await expect(import("../auth/token.js")).rejects.toThrow(
      "JWT_SECRET_A environment variable is required"
    );
  });

  it("loads fine once JWT_SECRET_A is set", async () => {
    process.env.JWT_SECRET_A = "some-secret";
    vi.resetModules();
    const mod = await import("../auth/token.js");
    expect(mod.generateToken).toBeTypeOf("function");
  });
});
