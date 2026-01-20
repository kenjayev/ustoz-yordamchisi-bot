import { Worker } from "bullmq";
import { connection } from "./queue.js";
import { setUserStatus } from "../db/queries.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function startWorker(bot) {
  new Worker(
    "broadcast",
    async (job) => {
      const { chatId, payload } = job.data;

      try {
        if (payload.type === "copy") {
          await bot.telegram.copyMessage(
            chatId,
            payload.fromChatId,
            payload.messageId
          );
          return true;
        }

        if (payload.type === "text") {
          await bot.telegram.sendMessage(chatId, payload.text);
          return true;
        }

        return true;
      } catch (e) {
        const msg = String(e?.message || e);

        // blocked / forbidden
        if (msg.includes("bot was blocked") || msg.includes("Forbidden")) {
          // chatId user bo‘lsa tg_idga teng bo‘ladi, group username bo‘lsa bu update qilinmaydi (normal)
          if (typeof chatId === "number")
            await setUserStatus(chatId, "blocked");
          return true;
        }

        // rate limit
        const retryAfter = e?.parameters?.retry_after;
        if (retryAfter && msg.includes("Too Many Requests")) {
          await sleep((retryAfter + 1) * 1000);
          throw e; // bullmq retry
        }

        throw e;
      }
    },
    {
      connection,
      concurrency: 10,
      attempts: 5,
      backoff: { type: "exponential", delay: 1000 },
    }
  );
}
