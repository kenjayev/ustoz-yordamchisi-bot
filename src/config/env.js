import "dotenv/config";

export const ENV = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  CHANNEL_ID: Number(process.env.CHANNEL_ID),
  ADMIN_IDS: (process.env.ADMIN_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number),
  GROUP_IDS: (process.env.GROUP_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .slice(0, 6),
  GROUP_USERNAMES: (process.env.GROUP_USERNAMES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6),
};

if (!ENV.BOT_TOKEN) throw new Error("BOT_TOKEN yo‘q");
if (!ENV.DATABASE_URL) throw new Error("DATABASE_URL yo‘q");
if (!ENV.REDIS_URL) throw new Error("REDIS_URL yo‘q");
if (!ENV.CHANNEL_ID) throw new Error("CHANNEL_ID yo‘q");
