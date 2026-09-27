-- Schema initiala pentru aplicatia de economie (proiect Supabase separat de logica).
-- Toate tabelele au RLS activ si nicio politica: doar backend-ul (service_role) are acces.

create extension if not exists pgcrypto;

create table if not exists public.allowed_students (
    id uuid primary key default gen_random_uuid(),
    email text not null unique check (email = lower(btrim(email)) and email <> ''),
    name text not null check (btrim(name) <> ''),
    is_blocked boolean not null default false,
    force_logout boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.auth_sessions (
    id uuid primary key default gen_random_uuid(),
    token_hash text not null unique,
    role text not null check (role in ('student', 'admin')),
    email text,
    display_name text not null,
    device text,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    ended_at timestamptz,
    is_active boolean not null default true
);
create index if not exists auth_sessions_email_idx on public.auth_sessions (email);
create index if not exists auth_sessions_active_idx on public.auth_sessions (is_active, last_seen_at desc);

create table if not exists public.app_settings (
    key text primary key,
    value text not null,
    updated_at timestamptz not null default now()
);

create table if not exists public.test_reports (
    id uuid primary key default gen_random_uuid(),
    student_email text not null,
    student_name text not null,
    report_type text not null check (report_type in ('final', 'admission', 'recap')),
    test_name text not null,
    test_id text,
    chapter_number integer check (chapter_number between 1 and 19),
    year integer,
    session_label text,
    variant text,
    economy_range text,
    score integer not null check (score >= 0),
    total integer not null check (total > 0 and score <= total),
    elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
    question_ids jsonb not null default '[]'::jsonb,
    answers jsonb not null default '{}'::jsonb,
    archive_code text not null unique,
    submitted_at timestamptz not null default now()
);
create index if not exists test_reports_submitted_idx on public.test_reports (submitted_at desc);
create index if not exists test_reports_email_idx on public.test_reports (student_email);

create table if not exists public.test_activity (
    id uuid primary key default gen_random_uuid(),
    student_email text not null,
    activity_key text not null,
    test_name text not null,
    progress integer not null default 0 check (progress between 0 and 100),
    state text not null default 'in_progress' check (state in ('in_progress', 'finished', 'abandoned')),
    score integer,
    total integer,
    started_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (student_email, activity_key)
);
create index if not exists test_activity_updated_idx on public.test_activity (updated_at desc);

alter table public.allowed_students enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.app_settings enable row level security;
alter table public.test_reports enable row level security;
alter table public.test_activity enable row level security;

revoke all on public.allowed_students, public.auth_sessions, public.app_settings,
    public.test_reports, public.test_activity from anon, authenticated;

-- Bucket privat pentru manualele PDF (servite doar prin link-uri semnate de backend).
insert into storage.buckets (id, name, public)
values ('library', 'library', false)
on conflict (id) do update set public = false;
