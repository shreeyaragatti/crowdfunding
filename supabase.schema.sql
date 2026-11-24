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
-- RBAC, campaign workflow, and verification documents (added)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'creator' check (role in ('creator', 'admin')),
  wallet_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.campaign_metadata
  add column if not exists creator_id uuid references public.profiles(id) on delete set null,
  add column if not exists review_notes text,
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists published_at timestamptz;

alter table public.campaign_metadata alter column creator_address drop not null;

update public.campaign_metadata set status = 'published' where status = 'deployed';
update public.campaign_metadata set status = 'draft' where status = 'created';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_metadata_status_check'
  ) then
    alter table public.campaign_metadata
      add constraint campaign_metadata_status_check
      check (status in ('draft', 'pending_review', 'needs_info', 'approved', 'rejected', 'published'));
  end if;
end $$;

create index if not exists campaign_metadata_creator_id_idx
  on public.campaign_metadata (creator_id, created_at desc);
create index if not exists campaign_metadata_status_idx
  on public.campaign_metadata (status, created_at desc);

create table if not exists public.campaign_supporting_documents (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaign_metadata(id) on delete cascade,
  uploader_id uuid references public.profiles(id) on delete set null,
  document_type text not null,
  document_name text not null,
  document_url text,
  document_path text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists campaign_supporting_documents_campaign_idx
  on public.campaign_supporting_documents (campaign_id, created_at desc);

alter table public.campaign_supporting_documents enable row level security;
revoke all on public.campaign_supporting_documents from anon, authenticated;

create table if not exists public.campaign_review_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaign_metadata(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null check (actor_role in ('creator', 'admin', 'system')),
  action text not null check (action in ('submitted', 'approved', 'rejected', 'info_requested', 'published')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists campaign_review_events_campaign_idx
  on public.campaign_review_events (campaign_id, created_at desc);

alter table public.campaign_review_events enable row level security;
revoke all on public.campaign_review_events from anon, authenticated;

drop policy if exists "Campaign metadata is publicly readable" on public.campaign_metadata;
drop policy if exists "Published campaigns are publicly readable" on public.campaign_metadata;
create policy "Published campaigns are publicly readable"
  on public.campaign_metadata
  for select
  to anon, authenticated
  using (status = 'published');
