import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./ENV.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

// applying auth middleware for socket connections
io.use(socketAuthMiddleware);

// use it to check if user is online or not
export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId]
}

// to store online user
const userSocketMap = {};

io.on("connection", (socket) => {
  // console.log("A User connected", socket.user.fullName);

  const userId = socket.userId;
  userSocketMap[userId] = socket.id;

  // emmit is used to send events to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Voice call events
  socket.on("call-offer", async ({ offer, to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-offer", { offer, from: socket.userId });
    }
  });

  socket.on("call-answer", ({ answer, to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-answer", { answer });
    }
  });

  socket.on("call-reject", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-reject");
    }
  });

  socket.on("call-end", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-end");
    }
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice-candidate", { candidate });
    }
  });

  socket.on("disconnect", () => {
    // console.log("A user disconnected", socket.user.fullName);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server }