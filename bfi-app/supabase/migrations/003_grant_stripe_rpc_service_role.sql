-- Fix: allow service role (webhooks / edge functions) to update subscription
-- Run in Supabase SQL Editor

grant execute on function public.set_subscription_from_stripe(uuid, text, text, text, boolean)
  to service_role;
