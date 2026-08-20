-- Buyer Community: one structured observation per user per property.
-- Run in Supabase SQL Editor after 005_community_presence_votes.sql.
-- Replaces Plus/Watch label votes with a GPS-gated observation form.

create table if not exists public.community_observations (
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id text not null,
  noise text not null,
  parking text not null,
  basement text not null,
  moisture text not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, property_id),
  constraint community_observations_noise_chk
    check (noise in ('none', 'moderate', 'significant', 'not_evaluated')),
  constraint community_observations_parking_chk
    check (parking in ('easy', 'limited', 'difficult', 'not_evaluated')),
  constraint community_observations_basement_chk
    check (basement in ('finished', 'partially_finished', 'unfinished', 'not_viewed')),
  constraint community_observations_moisture_chk
    check (moisture in ('observed', 'not_observed', 'not_evaluated'))
);

create index if not exists community_observations_property_idx
  on public.community_observations (property_id);

drop trigger if exists community_observations_set_updated_at on public.community_observations;
create trigger community_observations_set_updated_at
  before update on public.community_observations
  for each row execute function public.set_updated_at();

alter table public.community_observations enable row level security;

drop policy if exists community_observations_select_own on public.community_observations;
create policy community_observations_select_own
  on public.community_observations for select
  using (auth.uid() = user_id);

drop policy if exists community_observations_insert_own on public.community_observations;
create policy community_observations_insert_own
  on public.community_observations for insert
  with check (auth.uid() = user_id);

drop policy if exists community_observations_update_own on public.community_observations;
create policy community_observations_update_own
  on public.community_observations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists community_observations_delete_own on public.community_observations;
create policy community_observations_delete_own
  on public.community_observations for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.community_observations to authenticated;

-- ---------------------------------------------------------------------------
-- Summary payload: field tallies, not label upvotes
-- ---------------------------------------------------------------------------

create or replace function public.community_field_tally(
  p_property_id text,
  p_column text
)
returns json
language plpgsql
stable
as $$
declare
  payload json;
begin
  if p_column = 'noise' then
    select coalesce(json_object_agg(noise, cnt), '{}'::json)
    into payload
    from (
      select noise, count(*)::int as cnt
      from public.community_observations
      where property_id = p_property_id
      group by noise
    ) s;
  elsif p_column = 'parking' then
    select coalesce(json_object_agg(parking, cnt), '{}'::json)
    into payload
    from (
      select parking, count(*)::int as cnt
      from public.community_observations
      where property_id = p_property_id
      group by parking
    ) s;
  elsif p_column = 'basement' then
    select coalesce(json_object_agg(basement, cnt), '{}'::json)
    into payload
    from (
      select basement, count(*)::int as cnt
      from public.community_observations
      where property_id = p_property_id
      group by basement
    ) s;
  elsif p_column = 'moisture' then
    select coalesce(json_object_agg(moisture, cnt), '{}'::json)
    into payload
    from (
      select moisture, count(*)::int as cnt
      from public.community_observations
      where property_id = p_property_id
      group by moisture
    ) s;
  else
    payload := '{}'::json;
  end if;
  return payload;
end;
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
  observation_n int := 0;
  mine public.community_observations%rowtype;
begin
  select max(confirmed_at) into latest
  from public.presence_events
  where user_id = p_user_id and property_id = p_property_id;

  select count(distinct user_id)::int into presence_n
  from public.presence_events
  where property_id = p_property_id;

  select count(*)::int into observation_n
  from public.community_observations
  where property_id = p_property_id;

  select * into mine
  from public.community_observations
  where user_id = p_user_id and property_id = p_property_id;

  return json_build_object(
    'propertyId', p_property_id,
    'canContribute', public.community_can_contribute(p_user_id, p_property_id),
    'myLatestPresence', latest,
    'presenceCount', presence_n,
    'observationCount', observation_n,
    'myObservation', case
      when mine.user_id is null then null
      else json_build_object(
        'noise', mine.noise,
        'parking', mine.parking,
        'basement', mine.basement,
        'moisture', mine.moisture
      )
    end,
    'fields', json_build_object(
      'noise', public.community_field_tally(p_property_id, 'noise'),
      'parking', public.community_field_tally(p_property_id, 'parking'),
      'basement', public.community_field_tally(p_property_id, 'basement'),
      'moisture', public.community_field_tally(p_property_id, 'moisture')
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- upsert_community_observation — unique (user_id, property_id)
-- ---------------------------------------------------------------------------

create or replace function public.upsert_community_observation(
  p_property_id text,
  p_noise text,
  p_parking text,
  p_basement text,
  p_moisture text
)
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

  if p_noise not in ('none', 'moderate', 'significant', 'not_evaluated')
     or p_parking not in ('easy', 'limited', 'difficult', 'not_evaluated')
     or p_basement not in ('finished', 'partially_finished', 'unfinished', 'not_viewed')
     or p_moisture not in ('observed', 'not_observed', 'not_evaluated') then
    return json_build_object('ok', false, 'reason', 'invalid_observation');
  end if;

  if not public.community_can_contribute(uid, trim(p_property_id)) then
    return json_build_object(
      'ok', false,
      'reason', 'presence_required',
      'summary', public.community_summary_payload(trim(p_property_id), uid)
    );
  end if;

  insert into public.community_observations (
    user_id, property_id, noise, parking, basement, moisture, submitted_at, updated_at
  ) values (
    uid, trim(p_property_id), p_noise, p_parking, p_basement, p_moisture, now(), now()
  )
  on conflict (user_id, property_id) do update
    set noise = excluded.noise,
        parking = excluded.parking,
        basement = excluded.basement,
        moisture = excluded.moisture,
        updated_at = now();

  return json_build_object(
    'ok', true,
    'summary', public.community_summary_payload(trim(p_property_id), uid)
  );
end;
$$;

-- Presence log: your observation only, never other buyers' answers
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
          select case
            when o.user_id is null then null
            else json_build_object(
              'noise', o.noise,
              'parking', o.parking,
              'basement', o.basement,
              'moisture', o.moisture
            )
          end
          from public.community_observations o
          where o.user_id = uid and o.property_id = e.property_id
        )
        else null
      end as observation
    from public.presence_events e
    where e.property_id = trim(p_property_id)
  ) x;

  return json_build_object('ok', true, 'propertyId', trim(p_property_id), 'events', events);
end;
$$;

grant execute on function public.community_field_tally(text, text) to authenticated;
grant execute on function public.upsert_community_observation(text, text, text, text, text) to authenticated;
grant execute on function public.get_community_summary(text) to authenticated;
grant execute on function public.get_presence_log(text) to authenticated;
