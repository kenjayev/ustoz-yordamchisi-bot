import { Telegraf } from "telegraf";
import { ENV } from "./config/env.js";

import { initDb } from "./db/init.js";
import { setUserStatus } from "./db/queries.js";

import { seen } from "./middlewares/seen.js";
import { adminOnly } from "./middlewares/auth.js";

import { startWorker } from "./jobs/worker.js";

import * as U from "./handlers/user.js";
import * as A from "./handlers/admin.js";

async function main() {
  const bot = new Telegraf(ENV.BOT_TOKEN);

  // DB init (migrations shart emas)
  await initDb();

  // Middlewares
  bot.use(seen);

  // START
  bot.start(U.start);

  // Block/unblock real-time
  bot.on("my_chat_member", async (ctx) => {
    const upd = ctx.update.my_chat_member;
    const userId = upd?.from?.id;
    const status = upd?.new_chat_member?.status;
    if (!userId || !status) return;

    if (status === "kicked") await setUserStatus(userId, "blocked");
    if (status === "member") await setUserStatus(userId, "active");
  });

  // USER callbacks
  bot.action("U:HOME", U.home);
  bot.action("U:HELP", U.help);
  bot.action("U:TOPICS", U.showTopics);
  bot.action(/^U:TOPIC:(\d+)$/, async (ctx) =>
    U.showLessons(ctx, ctx.match[1])
  );
  bot.action(/^U:LESSON:(\d+)$/, async (ctx) =>
    U.sendLesson(ctx, ctx.match[1])
  );

  // ADMIN callbacks (adminOnly)
  bot.action("A:PANEL", adminOnly, A.openAdminPanel);
  bot.action("A:STATS", adminOnly, A.showStats);
  bot.action("A:USERS", adminOnly, A.showUsersList);

  bot.action("A:BCAST", adminOnly, A.beginBroadcast);
  bot.action("A:GROUPS", adminOnly, A.beginGroups);

  bot.action("A:UPLOAD", adminOnly, A.beginUpload);
  bot.action(/^A:UPTOPIC:(\d+)$/, adminOnly, async (ctx) =>
    A.pickUploadTopic(ctx, ctx.match[1])
  );
  bot.action("A:UPTOPIC_NEW", adminOnly, A.beginNewTopic);

  // Admin message capture: broadcast + upload flow
  bot.on("message", adminOnly, async (ctx) => {
    if (await A.captureAdminMessageForBroadcast(ctx)) return;
    if (await A.captureUploadText(ctx)) return;
    if (await A.captureUploadVideo(ctx)) return;
  });

  // Start queue worker
  startWorker(bot);

  // Launch bot
  await bot.launch();
  console.log("Bot running 🚀");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
