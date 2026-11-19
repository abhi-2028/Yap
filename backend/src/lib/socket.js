import { Server } from "socket.io";
import http from "http";
import express from "express";
import { createAdapter } from "@socket.io/redis-adapter";
import { ENV } from "./ENV.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import {
  initRedis,
  pubClient,
  subClient,
  addSocketSession,
  removeSocketSession,
  getAllOnlineUserIds,
  refreshUserHeartbeat,
  getRedisStatus,
} from "./redis.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL, "http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 25000,
});

// Initialize Redis and mount adapter if available
initRedis().then(({ isRedisConnected }) => {
  if (isRedisConnected && pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[Socket.IO] Redis Adapter mounted successfully for cross-instance routing");
  } else {
    console.log("[Socket.IO] Running in standalone in-memory adapter mode");
  }
}).catch((e) => {
  console.warn("[Socket.IO Adapter Warning]:", e.message);
});

// Authentication middleware for socket connections
io.use(socketAuthMiddleware);

/**
 * Returns room identifier for delivering messages to all connected sessions of a user.
 */
export const getReceiverRoom = (userId) => `user:${userId}`;

// Backward-compatible alias for existing controllers
export const getReceiverSocketId = (userId) => `user:${userId}`;

io.on("connection", async (socket) => {
  const userId = socket.userId;
  const userRoom = getReceiverRoom(userId);

  // Each user joins their personal room (supports multi-device / multi-tab)
  socket.join(userRoom);

  // Register session in distributed store (Redis / in-memory fallback)
  const { isFirstConnection } = await addSocketSession(userId, socket.id);

  // If this is the user's first active connection, broadcast delta presence event
  if (isFirstConnection) {
    io.emit("userOnline", { userId });
  }

  // Backward-compatible presence broadcast to keep existing frontend functioning
  const onlineUsers = await getAllOnlineUserIds();
  io.emit("getOnlineUsers", onlineUsers);

  // Heartbeat to keep presence active with TTL
  socket.on("heartbeat", () => {
    refreshUserHeartbeat(userId);
  });

  // Client delivery confirmation (Receipts)
  socket.on("messageDelivered", ({ messageId, senderId }) => {
    if (senderId) {
      io.to(getReceiverRoom(senderId)).emit("messageDeliveryReceipt", {
        messageId,
        status: "delivered",
        deliveredAt: new Date().toISOString(),
      });
    }
  });

  // Client read confirmation (Seen receipts)
  socket.on("messageRead", ({ messageId, senderId }) => {
    if (senderId) {
      io.to(getReceiverRoom(senderId)).emit("messageReadReceipt", {
        messageId,
        status: "read",
        readAt: new Date().toISOString(),
      });
    }
  });

  socket.on("disconnect", async () => {
    const { isLastConnection } = await removeSocketSession(userId, socket.id);

    // If all tabs/devices of this user disconnected, broadcast offline event
    if (isLastConnection) {
      io.emit("userOffline", { userId });
    }

    const currentOnlineUsers = await getAllOnlineUserIds();
    io.emit("getOnlineUsers", currentOnlineUsers);
  });
});

export { io, app, server };
