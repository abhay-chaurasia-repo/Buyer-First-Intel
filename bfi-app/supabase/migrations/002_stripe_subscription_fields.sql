-- Stripe billing fields on profiles
-- Run in Supabase SQL Editor after 001_profiles_search_quota.sql

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text;

create unique index if not exists profiles_stripe_customer_id_uidx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_uidx
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Webhook / service-role updates subscription from Stripe events
create or replace function public.set_subscription_from_stripe(
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
    stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id),
    subscription_status = p_status,
    subscription_active = p_active,
    subscribed_at = case
      when p_active and subscribed_at is null then now()
      when p_active then subscribed_at
      else subscribed_at
    end,
    updated_at = now()
  where id = p_user_id;
end;
$$;

-- Only callable with service role (revoke from authenticated/anon)
revoke all on function public.set_subscription_from_stripe(uuid, text, text, text, boolean) from public;
revoke all on function public.set_subscription_from_stripe(uuid, text, text, text, boolean) from anon;
revoke all on function public.set_subscription_from_stripe(uuid, text, text, text, boolean) from authenticated;
