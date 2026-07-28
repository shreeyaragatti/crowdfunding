create table if not exists public.campaign_metadata (
  id uuid primary key default gen_random_uuid(),
  contract_address text unique,
  creator_address text not null,
  name text not null,
  description text not null,
  image_url text,
  target_wei text not null,
  minimum_contribution_wei text not null,
  transaction_hash text,
  status text not null default 'draft',
  category text not null default 'general',
  beneficiary_type text not null default 'general',
  beneficiary_count integer not null default 1,
  location text,
  urgency_level text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_metadata_creator_address_idx
  on public.campaign_metadata (lower(creator_address));

create table if not exists public.withdrawal_request_metadata (
  id uuid primary key default gen_random_uuid(),
  campaign_address text not null,
  request_index integer,
  creator_address text not null,
  recipient_address text not null,
  description text not null,
  value_wei text not null,
  transaction_hash text,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists withdrawal_request_campaign_address_idx
  on public.withdrawal_request_metadata (lower(campaign_address));

create table if not exists public.chain_events (
  id uuid primary key default gen_random_uuid(),
  contract_address text not null,
  event_name text not null,
  transaction_hash text not null,
  block_number bigint,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists chain_events_transaction_event_idx
  on public.chain_events (transaction_hash, event_name);

create table if not exists public.campaign_donations (
  id uuid primary key default gen_random_uuid(),
  campaign_address text not null,
  donor_address text not null,
  donor_name text,
  amount_wei text not null,
  message text,
  transaction_hash text,
  source text not null default 'dev',
  created_at timestamptz not null default now()
);

create index if not exists campaign_donations_campaign_address_idx
  on public.campaign_donations (lower(campaign_address), created_at desc);

create table if not exists public.campaign_proofs (
  id uuid primary key default gen_random_uuid(),
  campaign_address text not null,
  uploader_address text,
  title text not null,
  description text not null,
  proof_url text,
  proof_path text,
  proof_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_proofs_campaign_address_idx
  on public.campaign_proofs (lower(campaign_address), created_at desc);

alter table public.campaign_metadata enable row level security;
alter table public.withdrawal_request_metadata enable row level security;
alter table public.chain_events enable row level security;
alter table public.campaign_donations enable row level security;
alter table public.campaign_proofs enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.campaign_metadata to anon, authenticated;
grant select on public.withdrawal_request_metadata to anon, authenticated;
grant select on public.chain_events to anon, authenticated;
grant select on public.campaign_donations to anon, authenticated;
grant select on public.campaign_proofs to anon, authenticated;

drop policy if exists "Campaign metadata is publicly readable" on public.campaign_metadata;
create policy "Campaign metadata is publicly readable"
  on public.campaign_metadata
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Withdrawal request metadata is publicly readable" on public.withdrawal_request_metadata;
create policy "Withdrawal request metadata is publicly readable"
  on public.withdrawal_request_metadata
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Chain events are publicly readable" on public.chain_events;
create policy "Chain events are publicly readable"
  on public.chain_events
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Campaign donations are publicly readable" on public.campaign_donations;
create policy "Campaign donations are publicly readable"
  on public.campaign_donations
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Campaign proofs are publicly readable" on public.campaign_proofs;
create policy "Campaign proofs are publicly readable"
  on public.campaign_proofs
  for select
  to anon, authenticated
  using (true);
