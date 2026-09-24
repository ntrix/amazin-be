import redis from "../lib/redisClient.js";
import logger from "../lib/logger.js";

// Replaces the old in-memory setTimeout lockout (lost on every restart,
// meaningless across multiple instances/regions). Redis TTLs do the
// expiring instead, so state survives restarts and is shared across
// every BE instance that points at the same Redis.
export const WARNING_THRESHOLD = 3; // 3rd failed attempt sends a warning email
export const LOCK_THRESHOLD = 5; // 5th failed attempt locks the account
const LOCK_TTL_SECONDS = 15 * 60;
const FAIL_COUNT_TTL_SECONDS = 15 * 60;

const lockKey = (email) => `login-lock:${email}`;
const countKey = (email) => `login-fail-count:${email}`;

// Redis unreachable/unconfigured -> don't block real logins over an
// infra outage; log it so the outage is still visible.
async function isLocked(email) {
  if (!redis) return false;
  try {
    return Boolean(await redis.get(lockKey(email)));
  } catch (err) {
    logger.error({ err, email }, "redis unavailable, failing open on lockout check");
    return false;
  }
}

async function recordFailure(email) {
  if (!redis) return 0;
  try {
    const count = await redis.incr(countKey(email));
    if (count === 1) await redis.expire(countKey(email), FAIL_COUNT_TTL_SECONDS);
    if (count >= LOCK_THRESHOLD) {
      await redis.set(lockKey(email), "1", "EX", LOCK_TTL_SECONDS);
    }
    return count;
  } catch (err) {
    logger.error({ err, email }, "redis unavailable, failing open on recordFailure");
    return 0;
  }
}

async function resetFailures(email) {
  if (!redis) return;
  try {
    await redis.del(countKey(email), lockKey(email));
  } catch (err) {
    logger.error({ err, email }, "redis unavailable, failing open on resetFailures");
  }
}

export default { isLocked, recordFailure, resetFailures, WARNING_THRESHOLD, LOCK_THRESHOLD };
