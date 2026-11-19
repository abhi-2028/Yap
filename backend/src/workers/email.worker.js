import { Worker } from "bullmq";
import { ENV } from "../lib/ENV.js";
import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import { getRedisStatus } from "../lib/redis.js";

let emailWorker = null;

export const startEmailWorker = () => {
  if (!getRedisStatus()) {
    console.log("[BullMQ Worker] Skipping worker startup (Redis offline/fallback mode)");
    return null;
  }

  try {
    emailWorker = new Worker(
      "emailQueue",
      async (job) => {
        if (job.name === "welcomeEmail") {
          const { email, fullName, clientURL } = job.data;
          console.log(`[BullMQ Worker] Processing welcome email for ${email} (Job #${job.id})`);
          await sendWelcomeEmail(email, fullName, clientURL);
        }
      },
      {
        connection: {
          url: ENV.REDIS_URL,
        },
        concurrency: 5,
      }
    );

    emailWorker.on("completed", (job) => {
      console.log(`[BullMQ Worker] Job ${job.id} completed successfully`);
    });

    emailWorker.on("failed", (job, err) => {
      console.error(`[BullMQ Worker] Job ${job?.id} failed with error:`, err.message);
    });

    console.log("[BullMQ Worker] Email Worker listening for jobs");
    return emailWorker;
  } catch (e) {
    console.warn("[BullMQ Worker Init Error]:", e.message);
    return null;
  }
};
