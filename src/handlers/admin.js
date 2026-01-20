import { Markup } from "telegraf";
import { ENV } from "../config/env.js";
import { adminPanel, backHome } from "../ui/menus.js";
import {
  getActiveUserIds,
  getStats,
  listUsers,
  getTopics,
  createTopic,
  createLesson,
} from "../db/queries.js";
import { broadcastQueue } from "../jobs/queue.js";

// MVP state (server restart bo‘lsa flow reset bo‘ladi — MVP uchun normal)
const ADMIN_STATE = new Map();
// modes:
//  - broadcast_users
//  - broadcast_groups
//  - upload (steps: topic_pick | new_topic_title | lesson_title | video_wait)

export async function openAdminPanel(ctx) {
  await ctx.editMessageText("🛠 Admin panel", adminPanel);
}

/* ---------------- Broadcast ---------------- */
export async function beginBroadcast(ctx) {
  ADMIN_STATE.set(ctx.from.id, { mode: "broadcast_users" });
  await ctx.editMessageText(
    "📣 Hamma userga yuboriladigan xabarni hozir yuboring (text/media)."
  );
}

export async function beginGroups(ctx) {
  ADMIN_STATE.set(ctx.from.id, { mode: "broadcast_groups" });
  await ctx.editMessageText(
    "👥 6 ta guruhga yuboriladigan xabarni hozir yuboring (text/media)."
  );
}

export async function captureAdminMessageForBroadcast(ctx) {
  const st = ADMIN_STATE.get(ctx.from?.id);
  if (!st) return false;

  const fromChatId = ctx.chat.id;
  const messageId = ctx.message.message_id;

  if (st.mode === "broadcast_users") {
    const users = await getActiveUserIds();
    await ctx.reply(`🚀 Navbatga qo‘shyapman: ${users.length} ta user.`);

    for (const chatId of users) {
      await broadcastQueue.add(
        "send",
        { chatId, payload: { type: "copy", fromChatId, messageId } },
        { removeOnComplete: true }
      );
    }

    ADMIN_STATE.delete(ctx.from.id);
    await ctx.reply("✅ Tayyor. Sekin-sekin hammasiga yetib boradi.");
    return true;
  }

  if (st.mode === "broadcast_groups") {
    const groups = ENV.GROUP_USERNAMES;
    if (!groups.length) {
      await ctx.reply(
        "⚠️ GROUP_USERNAMES yo‘q yoki 6 ta emas. Env’ni tekshiring."
      );
      ADMIN_STATE.delete(ctx.from.id);
      return true;
    }

    await ctx.reply(`🚀 Navbatga qo‘shyapman: ${groups.length} ta guruh.`);

    for (const chatId of groups) {
      await broadcastQueue.add(
        "send",
        { chatId, payload: { type: "copy", fromChatId, messageId } },
        { removeOnComplete: true }
      );
    }

    ADMIN_STATE.delete(ctx.from.id);
    await ctx.reply("✅ Guruhlarga ham yuboriladi.");
    return true;
  }

  return false;
}

/* ---------------- Stats ---------------- */
export async function showStats(ctx) {
  const s = await getStats();
  await ctx.editMessageText(
    `📊 Statistika\n` +
      `✅ Active: ${s.active}\n` +
      `⛔ Blocked: ${s.blocked}\n` +
      `🧾 Total: ${s.total}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("👤 Userlar (50)", "A:USERS")],
      [Markup.button.callback("⬅️ Orqaga", "A:PANEL")],
      [Markup.button.callback("🏠 Bosh menyu", "U:HOME")],
    ])
  );
}

export async function showUsersList(ctx) {
  const rows = await listUsers(50, 0);
  const text = rows
    .map((u) => {
      const name =
        [u.first_name, u.last_name].filter(Boolean).join(" ") || "NoName";
      const un = u.username ? `@${u.username}` : "(username yo‘q)";
      return `${u.status === "active" ? "✅" : "⛔"} ${name} — ${un} — ${
        u.tg_id
      }`;
    })
    .join("\n");

  await ctx.editMessageText(
    text || "Bo‘sh.",
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅️ Orqaga", "A:STATS")],
      [Markup.button.callback("🏠 Bosh menyu", "U:HOME")],
    ])
  );
}

/* ---------------- Upload Flow ---------------- */
export async function beginUpload(ctx) {
  const topics = await getTopics();

  const kb = topics.map((t) => [
    Markup.button.callback(`📁 ${t.title}`, `A:UPTOPIC:${t.id}`),
  ]);
  kb.push([Markup.button.callback("➕ Yangi mavzu", "A:UPTOPIC_NEW")]);
  kb.push([Markup.button.callback("⬅️ Orqaga", "A:PANEL")]);

  ADMIN_STATE.set(ctx.from.id, { mode: "upload", step: "topic_pick" });
  await ctx.editMessageText(
    "➕ Video yuklash\n\n1) Mavzuni tanlang:",
    Markup.inlineKeyboard(kb)
  );
}

export async function pickUploadTopic(ctx, topicId) {
  const st = ADMIN_STATE.get(ctx.from.id);
  if (!st || st.mode !== "upload") return;

  st.topicId = Number(topicId);
  st.step = "lesson_title";
  ADMIN_STATE.set(ctx.from.id, st);

  await ctx.editMessageText("2) Video nomini yuboring (oddiy text).");
}

export async function beginNewTopic(ctx) {
  const st = ADMIN_STATE.get(ctx.from.id);
  if (!st || st.mode !== "upload") return;

  st.step = "new_topic_title";
  ADMIN_STATE.set(ctx.from.id, st);

  await ctx.editMessageText("Yangi mavzu nomini yuboring (text).");
}

export async function captureUploadText(ctx) {
  const st = ADMIN_STATE.get(ctx.from?.id);
  if (!st || st.mode !== "upload") return false;

  const text = ctx.message?.text?.trim();
  if (!text) return false;

  if (st.step === "new_topic_title") {
    const topic = await createTopic(text);
    st.topicId = topic.id;
    st.step = "lesson_title";
    ADMIN_STATE.set(ctx.from.id, st);
    await ctx.reply(
      `✅ Mavzu yaratildi: ${topic.title}\n\nEndi video nomini yuboring (text).`
    );
    return true;
  }

  if (st.step === "lesson_title") {
    st.lessonTitle = text;
    st.step = "video_wait";
    ADMIN_STATE.set(ctx.from.id, st);
    await ctx.reply("3) Endi videoni yuboring (Telegram video).");
    return true;
  }

  return false;
}

export async function captureUploadVideo(ctx) {
  const st = ADMIN_STATE.get(ctx.from?.id);
  if (!st || st.mode !== "upload" || st.step !== "video_wait") return false;

  const video = ctx.message?.video;
  if (!video) {
    await ctx.reply(
      "⚠️ Iltimos video yuboring (file/document emas, aynan video)."
    );
    return true;
  }

  // 1) Kanalga video post
  const caption = `🎬 ${st.lessonTitle}`;
  const sent = await ctx.telegram.sendVideo(ENV.CHANNEL_ID, video.file_id, {
    caption,
  });

  // 2) DBga bog‘lash (kanaldagi message_id)
  await createLesson({
    topicId: st.topicId,
    title: st.lessonTitle,
    channelMessageId: sent.message_id,
  });

  ADMIN_STATE.delete(ctx.from.id);
  await ctx.reply("✅ Video kanalga joylandi va mavzuga bog‘landi.", backHome);
  return true;
}
