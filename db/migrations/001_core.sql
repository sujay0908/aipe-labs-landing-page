-- Members, access and progress (#18, #22)
create extension if not exists pgcrypto;

create table users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,          -- always stored lowercased
  phone       text,
  last_lesson text,                           -- "<course>/<lesson>" for "continue where you left off"
  created_at  timestamptz not null default now()
);

create table enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  cohort      text not null,
  status      text not null check (status in ('pending', 'paid')),
  payment_id  text,
  created_at  timestamptz not null default now(),
  unique (user_id, cohort)
);

create table lesson_progress (
  user_id      uuid not null references users(id) on delete cascade,
  lesson_slug  text not null,                 -- "<course>/<lesson>"
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_slug)
);

-- Magic-link login. Tokens and sessions are stored as SHA-256 hashes.
create table login_tokens (
  token_hash  text primary key,
  email       text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz
);

create table sessions (
  token_hash  text primary key,
  email       text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index sessions_email_idx on sessions (email);
