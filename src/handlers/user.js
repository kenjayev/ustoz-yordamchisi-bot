import { Markup } from "telegraf";
import { ENV } from "../config/env.js";
import { getTopics, getLessonsByTopic } from "../db/queries.js";
import { mainMenu, backHome } from "../ui/menus.js";

export function isAdmin(ctx) {
  return ENV.ADMIN_IDS.includes(ctx.from?.id);
}

export async function start(ctx) {
  await ctx.reply(
    "Salom! 👋\n📚 Bu botda video darsliklarni mavzular bo‘yicha olasiz.",
    mainMenu(isAdmin(ctx))
  );
}

export async function home(ctx) {
  await ctx.editMessageText("🏠 Bosh menyu", mainMenu(isAdmin(ctx)));
}

export async function help(ctx) {
  await ctx.editMessageText(
    "📌 Qanday ishlaydi:\n" +
      "1) 📚 Video darsliklar → mavzu tanlang\n" +
      "2) Video tugmasini bosing → bot yuboradi\n",
    backHome
  );
}

export async function showTopics(ctx) {
  const topics = await getTopics();
  if (topics.length === 0) {
    return ctx.editMessageText("Hozircha mavzular yo‘q 😅", backHome);
  }

  const kb = topics.map((t) => [
    Markup.button.callback(`📁 ${t.title}`, `U:TOPIC:${t.id}`),
  ]);
  kb.push([Markup.button.callback("🏠 Bosh menyu", "U:HOME")]);

  return ctx.editMessageText("📚 Mavzuni tanlang:", Markup.inlineKeyboard(kb));
}

export async function showLessons(ctx, topicId) {
  const lessons = await getLessonsByTopic(Number(topicId));
  if (lessons.length === 0) {
    return ctx.editMessageText("Bu mavzuda hali video yo‘q.", backHome);
  }

  const kb = lessons.map((l) => [
    Markup.button.callback(`🎬 ${l.title}`, `U:LESSON:${l.channel_message_id}`),
  ]);
  kb.push([Markup.button.callback("⬅️ Orqaga", "U:TOPICS")]);
  kb.push([Markup.button.callback("🏠 Bosh menyu", "U:HOME")]);

  return ctx.editMessageText("🎞 Videolar ro‘yxati:", Markup.inlineKeyboard(kb));
}

export async function sendLesson(ctx, channelMessageId) {
  await ctx.answerCbQuery();
  await ctx.telegram.copyMessage(
    ctx.from.id,
    ENV.CHANNEL_ID,
    Number(channelMessageId)
  );
}
