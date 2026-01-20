import { ENV } from "../config/env.js";

export function adminOnly(ctx, next) {
  const id = ctx.from?.id;
  if (!id || !ENV.ADMIN_IDS.includes(id)) {
    // callback bo‘lsa alert qilib qo‘yamiz, message bo‘lsa reply
    if (ctx.callbackQuery)
      return ctx.answerCbQuery("⛔ Admin emassiz", { show_alert: true });
    return ctx.reply("⛔ Bu bo‘lim faqat admin uchun.");
  }
  return next();
}
