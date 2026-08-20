-- Shared ATTOM property snapshot, 24 hours max.
-- Same address searched by another user reuses this row instead of calling ATTOM again.
-- ATTOM's published API terms prohibit storing content longer than 24 hours without a
-- bulk/data license. Do not lengthen expires_at without written permission from ATTOM.
--
-- Service-role only. RLS is on with no anon/authenticated policies so the browser
-- cannot read county JSON even if someone discovers the table.

create table if not exists public.attom_lookup_cache (
  cache_key text primary key,
  property jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists attom_lookup_cache_expires_at_idx
  on public.attom_lookup_cache (expires_at);

alter table public.attom_lookup_cache enable row level security;

comment on table public.attom_lookup_cache is
  '24h ATTOM snapshot keyed by normalized address. Edge Function service role only.';
