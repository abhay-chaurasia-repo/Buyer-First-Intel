-- Buyer Community: presence events + structured votes + anonymous aggregation
-- Run in Supabase SQL Editor after 001 and 004.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.presence_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id text not null,
  confirmed_at timestamptz not null default now(),
  distance_meters integer not null,
  accuracy_meters integer not null,
  pin_lat double precision not null,
  pin_lng double precision not null
);

create index if not exists presence_events_property_idx
  on public.presence_events (property_id, confirmed_at desc);

create index if not exists presence_events_user_property_idx
  on public.presence_events (user_id, property_id, confirmed_at desc);

create table if not exists public.community_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id text not null,
  label_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, property_id, label_id)
);

create index if not exists community_votes_property_label_idx
  on public.community_votes (property_id, label_id);

drop trigger if exists community_votes_set_updated_at on public.community_votes;
create trigger community_votes_set_updated_at
  before update on public.community_votes
  for each row execute function public.set_updated_at();

alter table public.presence_events enable row level security;
alter table public.community_votes enable row level security;

-- Own rows only. Aggregates go through SECURITY DEFINER RPCs.
drop policy if exists presence_events_select_own on public.presence_events;
create policy presence_events_select_own
  on public.presence_events for select
  using (auth.uid() = user_id);

drop policy if exists presence_events_insert_own on public.presence_events;
create policy presence_events_insert_own
  on public.presence_events for insert
  with check (auth.uid() = user_id);

drop policy if exists community_votes_select_own on public.community_votes;
create policy community_votes_select_own
  on public.community_votes for select
  using (auth.uid() = user_id);

drop policy if exists community_votes_insert_own on public.community_votes;
create policy community_votes_insert_own
  on public.community_votes for insert
  with check (auth.uid() = user_id);

drop policy if exists community_votes_update_own on public.community_votes;
create policy community_votes_update_own
  on public.community_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists community_votes_delete_own on public.community_votes;
create policy community_votes_delete_own
  on public.community_votes for delete
  using (auth.uid() = user_id);

grant select, insert on public.presence_events to authenticated;
grant select, insert, update, delete on public.community_votes to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.geo_distance_meters(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 2 * 6371000 * asin(least(1::double precision, sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2
    + cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
  )));
$$;

create or replace function public.community_label_requires_visit(p_label_id text)
returns boolean
language sql
immutable
as $$
  select p_label_id not in (
    'published-listing-size-matches-county',
    'published-listing-size-overstated'
  );
$$;

create or replace function public.community_can_contribute(p_user_id uuid, p_property_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.presence_events e
    where e.user_id = p_user_id
      and e.property_id = p_property_id
      and e.confirmed_at >= (timezone('utc', now()) - interval '14 days')
  );
$$;

create or replace function public.community_summary_payload(p_property_id text, p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  latest timestamptz;
  presence_n int := 0;
  labels json;
begin
  select max(confirmed_at) into latest
  from public.presence_events
  where user_id = p_user_id and property_id = p_property_id;

  select count(distinct user_id)::int into presence_n
  from public.presence_events
  where property_id = p_property_id;

  select coalesce(json_agg(row_to_json(x)), '[]'::json)
  into labels
  from (
    select
      v.label_id as id,
      count(*)::int as count,
      bool_or(v.user_id = p_user_id) as mine
    from public.community_votes v
    where v.property_id = p_property_id
    group by v.label_id
  ) x;

  return json_build_object(
    'propertyId', p_property_id,
    'canContribute', public.community_can_contribute(p_user_id, p_property_id),
    'myLatestPresence', latest,
    'presenceCount', presence_n,
    'labels', labels
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- record_presence
-- ---------------------------------------------------------------------------

create or replace function public.record_presence(
  p_property_id text,
  p_device_lat double precision,
  p_device_lng double precision,
  p_pin_lat double precision,
  p_pin_lng double precision,
  p_accuracy_meters double precision
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  dist double precision;
  acc integer;
  today_count int := 0;
  event_id uuid;
  confirmed timestamptz;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_profile();

  if p_property_id is null or length(trim(p_property_id)) < 2 then
    return json_build_object('ok', false, 'reason', 'invalid_property');
  end if;

  if p_device_lat is null or p_device_lng is null or p_pin_lat is null or p_pin_lng is null then
    return json_build_object('ok', false, 'reason', 'no_pin');
  end if;

  acc := round(coalesce(p_accuracy_meters, 9999))::int;
  if acc > 80 then
    return json_build_object('ok', false, 'reason', 'inaccurate', 'accuracyMeters', acc);
  end if;

  dist := public.geo_distance_meters(p_device_lat, p_device_lng, p_pin_lat, p_pin_lng);
  if dist > 100 then
    return json_build_object(
      'ok', false,
      'reason', 'too_far',
      'distanceMeters', round(dist)::int,
      'accuracyMeters', acc
    );
  end if;

  select count(*)::int into today_count
  from public.presence_events
  where user_id = uid
    and property_id = p_property_id
    and confirmed_at >= (timezone('utc', now())::date)::timestamptz;

  if today_count >= 12 then
    return json_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  insert into public.presence_events (
    user_id, property_id, distance_meters, accuracy_meters, pin_lat, pin_lng
  ) values (
    uid, trim(p_property_id), round(dist)::int, acc, p_pin_lat, p_pin_lng
  )
  returning id, confirmed_at into event_id, confirmed;

  return json_build_object(
    'ok', true,
    'id', event_id,
    'confirmedAt', confirmed,
    'distanceMeters', round(dist)::int,
    'accuracyMeters', acc,
    'canContribute', true,
    'summary', public.community_summary_payload(trim(p_property_id), uid)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- toggle_community_vote  (remote GLA does not need presence)
-- ---------------------------------------------------------------------------

create or replace function public.toggle_community_vote(
  p_property_id text,
  p_label_id text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  already boolean := false;
  needs_visit boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_profile();

  if p_property_id is null or length(trim(p_property_id)) < 2 then
    return json_build_object('ok', false, 'reason', 'invalid_property');
  end if;

  if p_label_id is null or p_label_id !~ '^[a-z0-9-]{3,80}$' then
    return json_build_object('ok', false, 'reason', 'invalid_label');
  end if;

  needs_visit := public.community_label_requires_visit(p_label_id);
  if needs_visit and not public.community_can_contribute(uid, trim(p_property_id)) then
    return json_build_object(
      'ok', false,
      'reason', 'presence_required',
      'summary', public.community_summary_payload(trim(p_property_id), uid)
    );
  end if;

  select exists (
    select 1 from public.community_votes
    where user_id = uid and property_id = trim(p_property_id) and label_id = p_label_id
  ) into already;

  if already then
    delete from public.community_votes
    where user_id = uid and property_id = trim(p_property_id) and label_id = p_label_id;
  else
    -- Remote GLA pair: match vs overstated — one only
    if p_label_id in (
      'published-listing-size-matches-county',
      'published-listing-size-overstated'
    ) then
      delete from public.community_votes
      where user_id = uid
        and property_id = trim(p_property_id)
        and label_id in (
          'published-listing-size-matches-county',
          'published-listing-size-overstated'
        )
        and label_id <> p_label_id;
    end if;

    insert into public.community_votes (user_id, property_id, label_id)
    values (uid, trim(p_property_id), p_label_id)
    on conflict (user_id, property_id, label_id) do update
      set updated_at = now();
  end if;

  return json_build_object(
    'ok', true,
    'voted', not already,
    'labelId', p_label_id,
    'summary', public.community_summary_payload(trim(p_property_id), uid)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Reads (counts / anonymous log — no other buyer identities)
-- ---------------------------------------------------------------------------

create or replace function public.get_community_summary(p_property_id text)
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
  if p_property_id is null or length(trim(p_property_id)) < 2 then
    return json_build_object('ok', false, 'reason', 'invalid_property');
  end if;
  return public.community_summary_payload(trim(p_property_id), uid);
end;
$$;

create or replace function public.get_presence_log(p_property_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  events json;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  perform public.ensure_profile();
  if p_property_id is null or length(trim(p_property_id)) < 2 then
    return json_build_object('ok', false, 'reason', 'invalid_property');
  end if;

  select coalesce(json_agg(row_to_json(x) order by x."confirmedAt" desc), '[]'::json)
  into events
  from (
    select
      e.id,
      e.confirmed_at as "confirmedAt",
      e.distance_meters as "distanceMeters",
      e.accuracy_meters as "accuracyMeters",
      (e.user_id = uid) as "isYou",
      case
        when e.user_id = uid then (
          select coalesce(json_agg(v.label_id), '[]'::json)
          from public.community_votes v
          where v.user_id = uid and v.property_id = e.property_id
        )
        else '[]'::json
      end as "communityLabelIds"
    from public.presence_events e
    where e.property_id = trim(p_property_id)
  ) x;

  return json_build_object('ok', true, 'propertyId', trim(p_property_id), 'events', events);
end;
$$;

grant execute on function public.geo_distance_meters(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.record_presence(text, double precision, double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.toggle_community_vote(text, text) to authenticated;
grant execute on function public.get_community_summary(text) to authenticated;
grant execute on function public.get_presence_log(text) to authenticated;
