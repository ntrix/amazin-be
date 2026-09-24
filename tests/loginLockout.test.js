import { describe, it, expect, vi, afterEach } from "vitest";
import loginLockout from "../auth/loginLockout.js";
import redis from "../lib/redisClient.js";

describe("loginLockout", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await redis.flushall();
  });

  it("does not lock before the 5th failed attempt", async () => {
    const email = "notlocked@test.com";
    for (let i = 0; i < 4; i++) {
      await loginLockout.recordFailure(email);
    }
    expect(await loginLockout.isLocked(email)).toBe(false);
  });

  it("locks on the 5th failed attempt", async () => {
    const email = "locked@test.com";
    for (let i = 0; i < 5; i++) {
      await loginLockout.recordFailure(email);
    }
    expect(await loginLockout.isLocked(email)).toBe(true);
  });

  it("resetFailures clears both the counter and an active lock", async () => {
    const email = "reset@test.com";
    for (let i = 0; i < 5; i++) {
      await loginLockout.recordFailure(email);
    }
    expect(await loginLockout.isLocked(email)).toBe(true);

    await loginLockout.resetFailures(email);

    expect(await loginLockout.isLocked(email)).toBe(false);
    // counter itself was cleared too, not just the lock flag - a 6th
    // failure right after a reset must count as failure #1, not #6
    expect(await loginLockout.recordFailure(email)).toBe(1);
  });

  it("fails open (does not lock, does not throw) when Redis errors out", async () => {
    vi.spyOn(redis, "incr").mockRejectedValueOnce(new Error("redis down"));
    vi.spyOn(redis, "get").mockRejectedValueOnce(new Error("redis down"));
    const email = "outage@test.com";

    await expect(loginLockout.recordFailure(email)).resolves.toBe(0);
    await expect(loginLockout.isLocked(email)).resolves.toBe(false);
  });
});
