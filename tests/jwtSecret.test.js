import { describe, it, expect, afterEach, vi } from "vitest";

describe("JWT secret fail-fast", () => {
  const originalAccess = process.env.JWT_SECRET_A;
  const originalRefresh = process.env.JWT_REFRESH_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET_A = originalAccess;
    process.env.JWT_REFRESH_SECRET = originalRefresh;
    vi.resetModules();
  });

  it("throws on import when JWT_SECRET_A is unset, instead of falling back to a public secret", async () => {
    delete process.env.JWT_SECRET_A;
    vi.resetModules();
    await expect(import("../auth/token.js")).rejects.toThrow(
      "JWT_SECRET_A environment variable is required"
    );
  });

  it("throws on import when JWT_REFRESH_SECRET is unset", async () => {
    process.env.JWT_SECRET_A = "some-secret";
    delete process.env.JWT_REFRESH_SECRET;
    vi.resetModules();
    await expect(import("../auth/token.js")).rejects.toThrow(
      "JWT_REFRESH_SECRET environment variable is required"
    );
  });

  it("loads fine once both secrets are set", async () => {
    process.env.JWT_SECRET_A = "some-secret";
    process.env.JWT_REFRESH_SECRET = "some-other-secret";
    vi.resetModules();
    const mod = await import("../auth/token.js");
    expect(mod.generateAccessToken).toBeTypeOf("function");
    expect(mod.generateRefreshToken).toBeTypeOf("function");
  });
});
