import pino from "pino";
import { ENV } from "./ENV.js";

export const logger = pino({
  level: ENV.NODE_ENV === "production" ? "info" : "debug",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
});
