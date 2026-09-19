import pino from "pino";

const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
const usePrettyPrint = !isTest && process.stdout.isTTY;

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: usePrettyPrint
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      }
    : undefined,
});

export default logger;
