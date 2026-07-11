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
