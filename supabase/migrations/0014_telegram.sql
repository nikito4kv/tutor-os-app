-- tutorOS — Telegram notifications (срез 11).
-- Adds the Telegram link fields for tutor/student and an idempotency journal for
-- all outgoing notifications (so a re-fired cron can't double-send). Follows the
-- accounting-core principle: no queues, no workers — delivery is either a sync
-- Server Action (event) or a single polled route (scheduled). See ADR-0005.

-- ---------------------------------------------------------------------------
-- Link fields
-- ---------------------------------------------------------------------------

-- Tutor connects their OWN Telegram via a short-lived one-time code: the app
-- mints telegram_link_code, the bot resolves it on /start and stores the chat id.
alter table public.tutor
  add column if not exists telegram_chat_id              bigint,
  add column if not exists telegram_linked_at            timestamptz,
  add column if not exists telegram_link_code            text,
  add column if not exists telegram_link_code_expires_at timestamptz;

-- Student is linked by the tutor using the SAME code as the share link
-- (student.share_token) — the bot resolves it on /start and stores the chat id.
alter table public.student
  add column if not exists telegram_chat_id   bigint,
  add column if not exists telegram_linked_at timestamptz;

-- Fast lookup of a pending tutor link code from the webhook.
create index if not exists tutor_telegram_link_code_idx
  on public.tutor (telegram_link_code)
  where telegram_link_code is not null;

-- ---------------------------------------------------------------------------
-- Notification journal — idempotency + observability
-- ---------------------------------------------------------------------------
-- dedup_key is the idempotency gate: a UNIQUE non-null key (e.g.
-- 'lesson_24h:<lesson_id>') blocks a second send. Event notifications that fire
-- exactly once may leave it NULL (Postgres treats NULLs as distinct in UNIQUE).
create table if not exists public.notification (
  id             uuid primary key default gen_random_uuid(),
  channel        text not null default 'telegram',
  recipient_kind text not null check (recipient_kind in ('tutor', 'student')),
  recipient_id   uuid not null,
  event          text not null,
  dedup_key      text unique,
  status         text not null default 'sent' check (status in ('sent', 'failed')),
  error          text,
  created_at     timestamptz not null default now()
);

-- If this migration is applied to a database where the table was created
-- manually or by a partially replayed migration, keep the expected shape without
-- dropping data.
alter table public.notification
  add column if not exists channel        text not null default 'telegram',
  add column if not exists recipient_kind text not null default 'tutor',
  add column if not exists recipient_id   uuid,
  add column if not exists event          text not null default 'unknown',
  add column if not exists dedup_key      text,
  add column if not exists status         text not null default 'sent',
  add column if not exists error          text,
  add column if not exists created_at     timestamptz not null default now();

create unique index if not exists notification_dedup_key_unique_idx
  on public.notification (dedup_key)
  where dedup_key is not null;

-- Help the cron's "have I already sent X for this lesson/homework?" probes.
create index if not exists notification_dedup_key_idx on public.notification (dedup_key);

-- RLS on, NO policies: the table is touched only by trusted server code through
-- the service-role client (webhook + cron + best-effort notifiers). Neither a
-- signed-in tutor (authenticated) nor the public student page (anon) may read it.
alter table public.notification enable row level security;
