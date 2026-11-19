import { Queue } from "bullmq";
import { ENV } from "../lib/ENV.js";
import { getRedisStatus } from "../lib/redis.js";
import { sendWelcomeEmail } from "../emails/emailHandlers.js";

let emailQueue = null;

export const initEmailQueue = () => {
  if (getRedisStatus()) {
    try {
      emailQueue = new Queue("emailQueue", {
        connection: {
          url: ENV.REDIS_URL,
        },
      });
      console.log("[BullMQ] Email Queue initialized");
    } catch (e) {
      console.warn("[BullMQ Init Error]:", e.message);
    }
  }
};

export const queueWelcomeEmail = async (email, fullName, clientURL) => {
  if (emailQueue && getRedisStatus()) {
    try {
      await emailQueue.add(
        "welcomeEmail",
        { email, fullName, clientURL },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        }
      );
      console.log(`[BullMQ] Enqueued welcome email for ${email}`);
      return;
    } catch (e) {
      console.error("[BullMQ Enqueue Failed]:", e.message);
    }
  }

  // Graceful async fallback without Redis: non-blocking background dispatch
  setImmediate(async () => {
    try {
      await sendWelcomeEmail(email, fullName, clientURL);
    } catch (error) {
      console.error("[Async Email Fallback Error]:", error.message);
    }
  });
};

export { emailQueue };
