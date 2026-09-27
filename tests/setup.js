import { vi } from "vitest";

// Every test file gets an in-memory Redis instead of a real connection -
// keeps login-lockout tests deterministic and network-free.
vi.mock("ioredis", async () => {
  const { default: RedisMock } = await import("ioredis-mock");
  return { default: RedisMock };
});
