-- ============================================================
-- Voco BEO Board — Supabase schema
-- Run this once in your Supabase project's SQL Editor
-- (Project → SQL Editor → New query → paste all of this → Run)
-- ============================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------
-- EVENTS TABLE
-- ----------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),

  name text not null default '',
  event_date date not null,
  event_time text default '',
  room text default '',
  guests integer,
  internet_code text default '',

  -- each stored as jsonb, e.g. am_break = {"time":"", "location":"", "item":""}
  am_break jsonb not null default '{}'::jsonb,
  pm_break jsonb not null default '{}'::jsonb,
  lunch    jsonb not null default '{}'::jsonb,
  dinner   jsonb not null default '{}'::jsonb,
  avit     jsonb not null default '{}'::jsonb,
  banquet  jsonb not null default '{}'::jsonb,

  pdf_path text,          -- storage object path in the 'beo-pdfs' bucket
  pdf_name text,

  created_by uuid references auth.users(id),
  created_by_name text default '',
  uploaded_at timestamptz not null default now(),

  updated_by uuid references auth.users(id),
  updated_by_name text default '',
  updated_at timestamptz not null default now()
);

create index if not exists events_date_idx on public.events (event_date);

-- Keep updated_at fresh automatically on every UPDATE
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------
-- ROW LEVEL SECURITY
-- Anyone (including anonymous / view-only visitors) can READ.
-- Only signed-in staff accounts can INSERT / UPDATE / DELETE.
-- ----------------------------------------------------------
alter table public.events enable row level security;

drop policy if exists "Public can read events" on public.events;
create policy "Public can read events"
  on public.events for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff can insert events" on public.events;
create policy "Staff can insert events"
  on public.events for insert
  to authenticated
  with check (true);

drop policy if exists "Staff can update events" on public.events;
create policy "Staff can update events"
  on public.events for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Staff can delete events" on public.events;
create policy "Staff can delete events"
  on public.events for delete
  to authenticated
  using (true);

-- ----------------------------------------------------------
-- STORAGE BUCKET for the original BEO PDFs
-- Run this section too — it creates the bucket and its policies.
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('beo-pdfs', 'beo-pdfs', true)
on conflict (id) do nothing;

drop policy if exists "Public can view BEO pdfs" on storage.objects;
create policy "Public can view BEO pdfs"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'beo-pdfs');

drop policy if exists "Staff can upload BEO pdfs" on storage.objects;
create policy "Staff can upload BEO pdfs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'beo-pdfs');

drop policy if exists "Staff can update BEO pdfs" on storage.objects;
create policy "Staff can update BEO pdfs"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'beo-pdfs');

drop policy if exists "Staff can delete BEO pdfs" on storage.objects;
create policy "Staff can delete BEO pdfs"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'beo-pdfs');

-- ============================================================
-- Done. Next: create your 4-5 staff logins under
-- Authentication → Users → Add user, and set each one's
-- "display_name" and "role" in User Metadata (JSON), e.g.:
--   {"display_name": "AV", "role": "av"}
-- See the project README for the full walkthrough.
-- ============================================================
