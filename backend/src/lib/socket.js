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

  socket.on("disconnect", () => {
    // console.log("A user disconnected", socket.user.fullName);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server }