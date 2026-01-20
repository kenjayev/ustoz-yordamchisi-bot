import pg from "pg";
import { ENV } from "../config/env.js";

export const pool = new pg.Pool({
  connectionString: ENV.DATABASE_URL,
  // hostingda SSL kerak bo‘lishi mumkin; Render/Railway ko‘pincha o‘zi handle qiladi
  // ssl: { rejectUnauthorized: false },
});
