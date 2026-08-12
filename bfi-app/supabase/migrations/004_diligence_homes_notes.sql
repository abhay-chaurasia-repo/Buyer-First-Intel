-- Diligence cloud sync: Homes in Diligence + private notes
-- Run in Supabase SQL Editor

create table if not exists public.diligence_homes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id text not null,
  address text not null,
  city text not null,
  state text not null,
  zip_code text not null default '',
  bedrooms numeric not null default 0,
  bathrooms numeric not null default 0,
  sqft integer not null default 0,
  starred_at timestamptz not null default now(),
  visited_at timestamptz,
  planned_visit_at timestamptz,
  reminder_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create index if not exists diligence_homes_user_idx
  on public.diligence_homes (user_id, starred_at desc);

create table if not exists public.property_notes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  note_id text not null,
  property_id text not null,
  body text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, note_id)
);

create index if not exists property_notes_user_property_idx
  on public.property_notes (user_id, property_id, created_at desc);

alter table public.diligence_homes enable row level security;
alter table public.property_notes enable row level security;

drop policy if exists diligence_homes_select_own on public.diligence_homes;
create policy diligence_homes_select_own
  on public.diligence_homes for select
  using (auth.uid() = user_id);

drop policy if exists diligence_homes_insert_own on public.diligence_homes;
create policy diligence_homes_insert_own
  on public.diligence_homes for insert
  with check (auth.uid() = user_id);

drop policy if exists diligence_homes_update_own on public.diligence_homes;
create policy diligence_homes_update_own
  on public.diligence_homes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists diligence_homes_delete_own on public.diligence_homes;
create policy diligence_homes_delete_own
  on public.diligence_homes for delete
  using (auth.uid() = user_id);

drop policy if exists property_notes_select_own on public.property_notes;
create policy property_notes_select_own
  on public.property_notes for select
  using (auth.uid() = user_id);

drop policy if exists property_notes_insert_own on public.property_notes;
create policy property_notes_insert_own
  on public.property_notes for insert
  with check (auth.uid() = user_id);

drop policy if exists property_notes_update_own on public.property_notes;
create policy property_notes_update_own
  on public.property_notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists property_notes_delete_own on public.property_notes;
create policy property_notes_delete_own
  on public.property_notes for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.diligence_homes to authenticated;
grant select, insert, update, delete on public.property_notes to authenticated;
