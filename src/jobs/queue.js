import IORedis from "ioredis";
import { Queue } from "bullmq";
import { ENV } from "../config/env.js";

export const connection = new IORedis(ENV.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const broadcastQueue = new Queue("broadcast", { connection });
