import pino from "pino";
import { config } from "../config";

export const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  }),
  base: { service: "rishikesh-travel-api" },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.apiKey"],
    censor: "[REDACTED]",
  },
});
