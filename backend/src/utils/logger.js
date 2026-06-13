// src/utils/logger.js
const winston = require("winston");

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

// Define log formats for console vs log files
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.printf(
    (info) =>
      `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message}`,
  ),
);

const transports = [
  // 1. Write all errors (and only errors) to error.log
  new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
    format: winston.format.combine(winston.format.json()),
  }),
  // 2. Write all logs (info, HTTP, warn, error) to combined.log
  new winston.transports.File({
    filename: "logs/combined.log",
    format: winston.format.combine(winston.format.json()),
  }),
];

// If we are in development mode, also print colored logs to the VSCode terminal console
if (process.env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        format,
      ),
    }),
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  levels,
  transports,
});

module.exports = logger;
