-- Due Diligence — thin production core
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Creates: profiles, search_usage, RLS, auth trigger, quota RPCs

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  display_name text,
  subscription_active boolean not null default false,
  subscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.search_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  month_key text not null,
  address_normalized text not null,
  searched_at timestamptz not null default now(),
  constraint search_usage_unique_month_address unique (user_id, month_key, address_normalized)
);

create index if not exists search_usage_user_month_idx
  on public.search_usage (user_id, month_key);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on auth.users insert
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, display_name)
  values (
    new.id,
    new.phone,
    coalesce(new.phone, 'Buyer')
  )
  on conflict (id) do update
    set phone = excluded.phone,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Ensure profile for current user (safe to call from client)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.profiles;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, phone, display_name)
  values (
    uid,
    (select phone from auth.users where id = uid),
    coalesce((select phone from auth.users where id = uid), 'Buyer')
  )
  on conflict (id) do nothing;

  select * into row from public.profiles where id = uid;
  return row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Quota helpers (10 free unique addresses / calendar month)
-- ---------------------------------------------------------------------------

create or replace function public.current_month_key()
returns text
language sql
stable
as $$
  select to_char(timezone('utc', now()), 'YYYY-MM');
$$;

create or replace function public.get_search_quota()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  month text := public.current_month_key();
  used int := 0;
  subscribed boolean := false;
  free_cap int := 10;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_profile();

  select subscription_active into subscribed
  from public.profiles
  where id = uid;

  select count(*)::int into used
  from public.search_usage
  where user_id = uid and month_key = month;

  return json_build_object(
    'monthKey', month,
    'used', used,
    'freeCap', free_cap,
    'remaining', case when subscribed then null else greatest(free_cap - used, 0) end,
    'subscribed', coalesce(subscribed, false)
  );
end;
$$;

create or replace function public.consume_search(p_address text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  month text := public.current_month_key();
  normalized text;
  used int := 0;
  subscribed boolean := false;
  free_cap int := 10;
  already boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  normalized := lower(trim(regexp_replace(coalesce(p_address, ''), '\s+', ' ', 'g')));
  if normalized = '' then
    return json_build_object('ok', false, 'reason', 'invalid_address', 'used', 0, 'remaining', 0);
  end if;

  perform public.ensure_profile();

  select subscription_active into subscribed
  from public.profiles where id = uid;

  select exists (
    select 1 from public.search_usage
    where user_id = uid and month_key = month and address_normalized = normalized
  ) into already;

  select count(*)::int into used
  from public.search_usage
  where user_id = uid and month_key = month;

  if coalesce(subscribed, false) then
    if not already then
      insert into public.search_usage (user_id, month_key, address_normalized)
      values (uid, month, normalized)
      on conflict do nothing;
      select count(*)::int into used
      from public.search_usage
      where user_id = uid and month_key = month;
    end if;
    return json_build_object(
      'ok', true,
      'reason', 'subscribed',
      'used', used,
      'remaining', null
    );
  end if;

  if already then
    return json_build_object(
      'ok', true,
      'reason', 'repeat',
      'used', used,
      'remaining', greatest(free_cap - used, 0)
    );
  end if;

  if used >= free_cap then
    return json_build_object(
      'ok', false,
      'reason', 'quota_exceeded',
      'used', used,
      'remaining', 0
    );
  end if;

  insert into public.search_usage (user_id, month_key, address_normalized)
  values (uid, month, normalized);

  used := used + 1;

  return json_build_object(
    'ok', true,
    'reason', 'free',
    'used', used,
    'remaining', greatest(free_cap - used, 0)
  );
end;
$$;

-- Demo subscription flag until Stripe is wired
create or replace function public.activate_search_subscription()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_profile();

  update public.profiles
  set subscription_active = true,
      subscribed_at = coalesce(subscribed_at, now()),
      updated_at = now()
  where id = uid;

  return public.get_search_quota();
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.search_usage enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists search_usage_select_own on public.search_usage;
create policy search_usage_select_own
  on public.search_usage for select
  using (auth.uid() = user_id);

drop policy if exists search_usage_insert_own on public.search_usage;
create policy search_usage_insert_own
  on public.search_usage for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, update, insert on public.profiles to authenticated;
grant select, insert on public.search_usage to authenticated;
grant execute on function public.ensure_profile() to authenticated;
grant execute on function public.get_search_quota() to authenticated;
grant execute on function public.consume_search(text) to authenticated;
grant execute on function public.activate_search_subscription() to authenticated;
