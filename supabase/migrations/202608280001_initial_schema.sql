create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'member');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.sync_status as enum ('running', 'succeeded', 'failed');
create type public.note_visibility as enum ('private', 'office');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null check (kind in ('gib', 'sgk', 'resmi_gazete')),
  base_url text not null unique,
  enabled boolean not null default true,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  status public.sync_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  found_count integer not null default 0 check (found_count >= 0),
  changed_count integer not null default 0 check (changed_count >= 0),
  error_message text
);

create table public.source_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  external_key text not null,
  title text not null,
  summary text not null default '',
  source_url text not null,
  published_at timestamptz,
  content_hash text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  review_status public.review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (source_id, external_key)
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  source_item_id uuid references public.source_items(id) on delete set null,
  source_id uuid not null references public.sources(id) on delete restrict,
  external_key text not null,
  title text not null,
  description text not null default '',
  tax_type text not null,
  action_type text not null,
  period_description text not null default '',
  starts_on date,
  due_on date not null,
  priority smallint not null default 2 check (priority between 1 and 3),
  source_url text not null,
  review_status public.review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_key)
);

create table public.updates (
  id uuid primary key default gen_random_uuid(),
  source_item_id uuid not null unique references public.source_items(id) on delete cascade,
  title text not null,
  summary text not null default '',
  source_url text not null,
  published_at timestamptz,
  review_status public.review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  reminder_at timestamptz,
  visibility public.note_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('calendar_event', 'update')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table public.read_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  update_id uuid not null references public.updates(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, update_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index calendar_events_due_on_idx on public.calendar_events (due_on) where review_status = 'approved';
create index source_items_review_idx on public.source_items (review_status, first_seen_at desc);
create index updates_published_idx on public.updates (published_at desc) where review_status = 'approved';
create index notes_owner_idx on public.notes (owner_id, updated_at desc);
create index sync_runs_source_idx on public.sync_runs (source_id, started_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger sources_set_updated_at before update on public.sources for each row execute function public.set_updated_at();
create trigger calendar_events_set_updated_at before update on public.calendar_events for each row execute function public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.sync_runs enable row level security;
alter table public.source_items enable row level security;
alter table public.calendar_events enable row level security;
alter table public.updates enable row level security;
alter table public.notes enable row level security;
alter table public.favorites enable row level security;
alter table public.read_items enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles read self or admin" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "admins update profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated read sources" on public.sources for select to authenticated using (true);
create policy "admins manage sources" on public.sources for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read sync runs" on public.sync_runs for select to authenticated using (public.is_admin());
create policy "admins manage sync runs" on public.sync_runs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage source items" on public.source_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "members read approved calendar" on public.calendar_events for select to authenticated using (review_status = 'approved' or public.is_admin());
create policy "admins manage calendar" on public.calendar_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members read approved updates" on public.updates for select to authenticated using (review_status = 'approved' or public.is_admin());
create policy "admins manage updates" on public.updates for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "members read visible notes" on public.notes for select to authenticated using (owner_id = (select auth.uid()) or visibility = 'office' or public.is_admin());
create policy "members create own notes" on public.notes for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "members update own notes" on public.notes for update to authenticated using (owner_id = (select auth.uid()) or public.is_admin()) with check (owner_id = (select auth.uid()) or public.is_admin());
create policy "members delete own notes" on public.notes for delete to authenticated using (owner_id = (select auth.uid()) or public.is_admin());

create policy "members manage own favorites" on public.favorites for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members manage own read state" on public.read_items for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "admins read audit logs" on public.audit_logs for select to authenticated using (public.is_admin());

grant usage on schema public to authenticated;
grant select on public.sources, public.calendar_events, public.updates to authenticated;
grant select, insert, update, delete on public.notes, public.favorites, public.read_items to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.sync_runs, public.source_items to authenticated;
grant insert, update, delete on public.sources, public.calendar_events, public.updates to authenticated;
grant select on public.audit_logs to authenticated;

insert into public.sources (name, kind, base_url) values
  ('GİB Vergi Takvimi', 'gib', 'https://www.gib.gov.tr/vergi-takvimi'),
  ('SGK Duyuruları', 'sgk', 'https://www.sgk.gov.tr/Duyuru'),
  ('Resmî Gazete', 'resmi_gazete', 'https://www.resmigazete.gov.tr/')
on conflict (base_url) do nothing;
