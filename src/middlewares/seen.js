import { upsertUserSeen } from "../db/queries.js";

export async function seen(ctx, next) {
  if (ctx.from) await upsertUserSeen(ctx.from);
  return next();
}
