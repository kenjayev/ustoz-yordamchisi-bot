import { pool } from "./pool.js";

export async function upsertUserSeen(from) {
  await pool.query(
    `insert into users(tg_id, username, first_name, last_name, status, last_seen)
     values($1,$2,$3,$4,'active', now())
     on conflict (tg_id)
     do update set username=excluded.username,
                   first_name=excluded.first_name,
                   last_name=excluded.last_name,
                   last_seen=now()
    `,
    [
      from.id,
      from.username || null,
      from.first_name || null,
      from.last_name || null,
    ]
  );
}

export async function setUserStatus(tg_id, status) {
  await pool.query(`update users set status=$2 where tg_id=$1`, [
    tg_id,
    status,
  ]);
}

export async function getActiveUserIds() {
  const r = await pool.query(`select tg_id from users where status='active'`);
  return r.rows.map((x) => x.tg_id);
}

export async function getStats() {
  const r = await pool.query(`
    select
      count(*) filter (where status='active') as active,
      count(*) filter (where status='blocked') as blocked,
      count(*) as total
    from users
  `);
  return r.rows[0];
}

export async function listUsers(limit = 50, offset = 0) {
  const r = await pool.query(
    `select tg_id, username, first_name, last_name, status, last_seen
     from users
     order by last_seen desc
     limit $1 offset $2`,
    [limit, offset]
  );
  return r.rows;
}

export async function getTopics() {
  const r = await pool.query(`select id, title from topics order by title asc`);
  return r.rows;
}

export async function createTopic(title) {
  const clean = title.trim();
  if (!clean) throw new Error("Topic title empty");

  const r = await pool.query(
    `insert into topics(title) values($1)
     on conflict (title) do update set title=excluded.title
     returning id, title`,
    [clean]
  );
  return r.rows[0];
}

export async function getLessonsByTopic(topicId) {
  const r = await pool.query(
    `select id, title, channel_message_id
     from lessons
     where topic_id=$1
     order by id asc`,
    [topicId]
  );
  return r.rows;
}

export async function createLesson({ topicId, title, channelMessageId }) {
  const clean = title.trim();
  if (!clean) throw new Error("Lesson title empty");

  const r = await pool.query(
    `insert into lessons(topic_id, title, channel_message_id)
     values($1,$2,$3)
     returning id`,
    [topicId, clean, channelMessageId]
  );
  return r.rows[0];
}
