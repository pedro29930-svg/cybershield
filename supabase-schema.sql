-- ═══════════════════════════════════════════════════════════════════════
--  CyberShield — Supabase Schema
--  Execute no SQL Editor do seu projeto Supabase
--  Dashboard → SQL Editor → New query → cole isto → Run
-- ═══════════════════════════════════════════════════════════════════════

-- ── Tabela de usuários ──────────────────────────────────────────────────
create table if not exists users (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  email                  text unique not null,
  password_hash          text not null,
  plan                   text not null default 'free'
                           check (plan in ('free','base','plus')),
  scans_used             integer not null default 0,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  plan_activated_at      timestamptz,
  created_at             timestamptz not null default now()
);

-- Índice para login rápido por e-mail
create index if not exists users_email_idx on users (email);

-- ── Tabela de consultas ─────────────────────────────────────────────────
create table if not exists scans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  input      text not null,
  score      integer not null check (score between 0 and 100),
  status     text not null,
  input_type text,
  reasons    jsonb,
  created_at timestamptz not null default now()
);

-- Índice para histórico do usuário
create index if not exists scans_user_id_idx on scans (user_id, created_at desc);

-- ── Row Level Security (RLS) ────────────────────────────────────────────
-- O backend usa a service key (bypassa RLS), então as políticas abaixo
-- servem para proteger o acesso direto pelo cliente (se for usado no futuro)

alter table users enable row level security;
alter table scans enable row level security;

-- Nenhum acesso público direto — tudo passa pelo backend
create policy "no direct access" on users for all using (false);
create policy "no direct access" on scans for all using (false);

-- ── Comentários ─────────────────────────────────────────────────────────
comment on column users.plan           is 'free | base | plus';
comment on column users.scans_used     is 'Contador reiniciado a cada ciclo de cobrança';
comment on column scans.reasons        is 'Array de { sev, msg } em JSON';
