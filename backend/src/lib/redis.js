import Redis from "ioredis";
import { ENV } from "./ENV.js";

let redisClient = null;
let pubClient = null;
let subClient = null;
let isRedisConnected = false;

// Fallback in-memory map for single-instance dev mode when Redis is not running
const inMemoryUserSockets = new Map();

const createRedisInstance = (role = "default") => {
  const client = new Redis(ENV.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 5000,
    retryStrategy(times) {
      if (times > 3) {
        // Stop retrying if Redis is unreachable
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  client.on("connect", () => {
    isRedisConnected = true;
    console.log(`[Redis] Connected successfully (${role})`);
  });

  client.on("error", (err) => {
    // Suppress spammy connection logs in dev fallback mode
    if (isRedisConnected) {
      console.error(`[Redis Error - ${role}]:`, err.message);
    }
  });

  client.on("close", () => {
    isRedisConnected = false;
  });

  return client;
};

export const initRedis = async () => {
  if (!ENV.ENABLE_REDIS || !ENV.REDIS_URL) {
    console.log("[Redis] No REDIS_URL configured. Running in standalone in-memory mode.");
    return { isRedisConnected: false };
  }

  try {
    redisClient = createRedisInstance("primary");
    pubClient = createRedisInstance("pub");
    subClient = createRedisInstance("sub");

    await Promise.all([
      redisClient.connect().catch((e) => console.warn(`[Redis primary connect]: ${e.message}`)),
      pubClient.connect().catch((e) => console.warn(`[Redis pub connect]: ${e.message}`)),
      subClient.connect().catch((e) => console.warn(`[Redis sub connect]: ${e.message}`)),
    ]);

    if (redisClient.status === "ready") {
      isRedisConnected = true;
      console.log("[Redis] Cluster / Standalone ready for distributed pub/sub & presence");
    } else {
      console.warn("[Redis] Unavailable. Gracefully falling back to in-memory state.");
    }
  } catch (err) {
    console.warn(`[Redis Init Warning] Could not connect to Redis (${err.message}). Using in-memory fallback.`);
  }

  return { redisClient, pubClient, subClient, isRedisConnected };
};

export const getRedisStatus = () => isRedisConnected;

// Presence Helpers with Multi-Session & TTL Support
export const addSocketSession = async (userId, socketId) => {
  if (isRedisConnected && redisClient) {
    try {
      const socketSetKey = `user:sockets:${userId}`;
      const presenceKey = `user:presence:${userId}`;

      const added = await redisClient.sadd(socketSetKey, socketId);
      const count = await redisClient.scard(socketSetKey);
      await redisClient.set(presenceKey, "online", "EX", 60);

      // Track global list of online user IDs
      await redisClient.sadd("global:online_users", userId);

      return { isFirstConnection: count === 1 };
    } catch (e) {
      console.error("[Redis addSocketSession error]:", e.message);
    }
  }

  // In-memory fallback
  if (!inMemoryUserSockets.has(userId)) {
    inMemoryUserSockets.set(userId, new Set());
  }
  const sockets = inMemoryUserSockets.get(userId);
  const isFirst = sockets.size === 0;
  sockets.add(socketId);
  return { isFirstConnection: isFirst };
};

export const removeSocketSession = async (userId, socketId) => {
  if (isRedisConnected && redisClient) {
    try {
      const socketSetKey = `user:sockets:${userId}`;
      const presenceKey = `user:presence:${userId}`;

      await redisClient.srem(socketSetKey, socketId);
      const remaining = await redisClient.scard(socketSetKey);

      if (remaining === 0) {
        await redisClient.del(presenceKey);
        await redisClient.srem("global:online_users", userId);
        return { isLastConnection: true };
      }
      return { isLastConnection: false };
    } catch (e) {
      console.error("[Redis removeSocketSession error]:", e.message);
    }
  }

  // In-memory fallback
  if (inMemoryUserSockets.has(userId)) {
    const sockets = inMemoryUserSockets.get(userId);
    sockets.delete(socketId);
    if (sockets.size === 0) {
      inMemoryUserSockets.delete(userId);
      return { isLastConnection: true };
    }
  }
  return { isLastConnection: false };
};

export const getAllOnlineUserIds = async () => {
  if (isRedisConnected && redisClient) {
    try {
      return await redisClient.smembers("global:online_users");
    } catch (e) {
      console.error("[Redis getAllOnlineUserIds error]:", e.message);
    }
  }

  return Array.from(inMemoryUserSockets.keys());
};

export const refreshUserHeartbeat = async (userId) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(`user:presence:${userId}`, "online", "EX", 60);
    } catch (e) {
      console.error("[Redis refreshUserHeartbeat error]:", e.message);
    }
  }
};

export { redisClient, pubClient, subClient };
