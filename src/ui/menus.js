import { Markup } from "telegraf";

export function mainMenu(isAdmin) {
  const rows = [
    [Markup.button.callback("📚 Video darsliklar", "U:TOPICS")],
    [Markup.button.callback("❓ Yordam", "U:HELP")],
  ];

  if (isAdmin) {
    rows.splice(1, 0, [Markup.button.callback("🛠 Admin panel", "A:PANEL")]);
  }

  return Markup.inlineKeyboard(rows);
}

export const backHome = Markup.inlineKeyboard([
  [Markup.button.callback("🏠 Bosh menyu", "U:HOME")],
]);

export const adminPanel = Markup.inlineKeyboard([
  [Markup.button.callback("➕ Video yuklash", "A:UPLOAD")],
  [Markup.button.callback("📣 Broadcast (users)", "A:BCAST")],
  [Markup.button.callback("👥 6 ta guruhga yuborish", "A:GROUPS")],
  [Markup.button.callback("📊 Statistika", "A:STATS")],
  [Markup.button.callback("🏠 Bosh menyu", "U:HOME")],
]);
