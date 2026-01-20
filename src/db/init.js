import { pool } from "./pool.js";

export async function initDb() {
  await pool.query(`
    create table if not exists users (
      id bigserial primary key,
      tg_id bigint unique not null,
      username text,
      first_name text,
      last_name text,
      status text not null default 'active', -- active|blocked
      created_at timestamptz not null default now(),
      last_seen timestamptz not null default now()
    );

    create table if not exists topics (
      id bigserial primary key,
      title text not null unique,
      created_at timestamptz not null default now()
    );

    create table if not exists lessons (
      id bigserial primary key,
      topic_id bigint not null references topics(id) on delete cascade,
      title text not null,
      channel_message_id integer not null,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_users_status on users(status);
    create index if not exists idx_lessons_topic_id on lessons(topic_id);
  `);
}
