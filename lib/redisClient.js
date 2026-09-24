import Redis from "ioredis";
import logger from "./logger.js";

// No REDIS_URL configured (e.g. a dev machine without Redis running) -
// callers must treat a null client as "fail open", never throw.
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    })
  : null;

redis?.on("error", (err) => {
  logger.error({ err }, "redis connection error");
});

export default redis;
