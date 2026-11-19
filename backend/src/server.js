import express from "express";
import crypto from "crypto";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";

import { ENV } from "./lib/ENV.js";
import { logger } from "./lib/logger.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js";
import { getRedisStatus } from "./lib/redis.js";
import { initEmailQueue } from "./queues/email.queue.js";
import { startEmailWorker } from "./workers/email.worker.js";

const __dirname = path.resolve();
const PORT = ENV.PORT || 5000;

// Request correlation ID & timing middleware
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("x-request-id", req.id);
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path !== "/api/health") {
      logger.info({
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: duration,
      });
    }
  });
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(
  cors({
    origin: [ENV.CLIENT_URL || "http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(cookieParser());

// Liveness & Readiness health check endpoint for load balancers & container orchestrators
app.get("/api/health", (_, res) => {
  const isMongoHealthy = mongoose.connection.readyState === 1;
  const isRedisHealthy = getRedisStatus();

  const isHealthy = isMongoHealthy; // MongoDB is mandatory, Redis is clustered enhancement
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      database: isMongoHealthy ? "connected" : "disconnected",
      redis: isRedisHealthy ? "connected" : "offline_fallback",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Static frontend serving in production
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
  });
}

// Global error handler middleware
app.use((err, req, res, _next) => {
  logger.error({
    requestId: req.id,
    error: err.message,
    stack: err.stack,
  });
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT} [Environment: ${ENV.NODE_ENV}]`);
  await connectDB();
  initEmailQueue();
  startEmailWorker();
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    logger.info("HTTP & WebSocket server closed.");
    try {
      await mongoose.connection.close(false);
      logger.info("MongoDB connection closed.");
    } catch (e) {
      logger.error("Error closing MongoDB connection:", e.message);
    }
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
