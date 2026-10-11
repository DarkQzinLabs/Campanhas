-- Campanhas: primeira migração conceitual para PostgreSQL.
-- Revisar em ambiente descartável antes de aplicar em qualquer banco.
-- Sem dados reais, credenciais, usuários privilegiados ou políticas de produção.
-- A camada de autorização/RLS deve ser concluída antes de expor dados pela API.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_subject text unique,
  display_name text not null,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supervisors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.islands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.negotiators (
  id uuid primary key default gen_random_uuid(),
  external_key text,
  name text not null,
  supervisor_id uuid references public.supervisors(id) on delete restrict,
  island_id uuid references public.islands(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_key)
);

create table if not exists public.competitive_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_type text not null check (group_type in ('team', 'campaign_group')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competitive_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.competitive_groups(id) on delete restrict,
  negotiator_id uuid not null references public.negotiators(id) on delete restrict,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  ranking_type text not null check (ranking_type in ('individual', 'squads', 'campaign_teams')),
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'ended')),
  visual_config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  negotiator_id uuid not null references public.negotiators(id) on delete restrict,
  target_cents bigint not null default 0 check (target_cents >= 0),
  included_from date,
  included_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, negotiator_id),
  check (included_to is null or included_from is null or included_to >= included_from)
);

create table if not exists public.campaign_groups (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  name text not null,
  sort_order integer not null default 0,
  visual_config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.campaign_groups(id) on delete restrict,
  negotiator_id uuid not null references public.negotiators(id) on delete restrict,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table if not exists public.campaign_cycles (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'closed', 'champions_announced')),
  champions_announced_at timestamptz,
  announced_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at),
  check (
    (champions_announced_at is null and announced_by is null)
    or (champions_announced_at is not null and announced_by is not null)
  )
);

create table if not exists public.production_entries (
  id uuid primary key default gen_random_uuid(),
  negotiator_id uuid not null references public.negotiators(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  cycle_id uuid references public.campaign_cycles(id) on delete restrict,
  external_key text,
  occurred_at timestamptz not null,
  amount_cents bigint not null check (amount_cents >= 0),
  source_import_id uuid,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.champion_snapshots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  cycle_id uuid not null references public.campaign_cycles(id) on delete restrict,
  announced_at timestamptz not null,
  announced_by uuid not null references public.profiles(id) on delete restrict,
  ranking_type text not null check (ranking_type in ('individual', 'squads', 'campaign_teams')),
  snapshot_payload jsonb not null check (jsonb_typeof(snapshot_payload) = 'object'),
  created_at timestamptz not null default now(),
  unique (cycle_id)
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  file_name text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'previewed', 'processing', 'completed', 'failed', 'cancelled')),
  column_mapping jsonb not null default '{}'::jsonb,
  row_count integer not null default 0 check (row_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  error_report jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.production_entries
  add constraint production_entries_source_import_fk
  foreign key (source_import_id) references public.import_jobs(id) on delete restrict;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_campaign_cycles_campaign on public.campaign_cycles(campaign_id, starts_at);
create index if not exists idx_campaign_members_campaign on public.campaign_members(campaign_id);
create index if not exists idx_campaign_groups_campaign on public.campaign_groups(campaign_id, sort_order);
create index if not exists idx_group_members_negotiator on public.campaign_group_members(negotiator_id);
create index if not exists idx_production_cycle_date on public.production_entries(cycle_id, occurred_at);
create index if not exists idx_production_negotiator_date on public.production_entries(negotiator_id, occurred_at);
create index if not exists idx_import_jobs_created on public.import_jobs(created_at desc);
create index if not exists idx_audit_events_entity on public.audit_events(entity_type, entity_id, occurred_at desc);

-- Snapshots anunciados são imutáveis: operações de correção devem gerar um novo
-- processo administrativo, nunca editar ou apagar o snapshot histórico.
create or replace function public.prevent_champion_snapshot_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Snapshots de campeões são imutáveis';
end;
$$;

drop trigger if exists champion_snapshots_immutable on public.champion_snapshots;
create trigger champion_snapshots_immutable
before update or delete on public.champion_snapshots
for each row execute function public.prevent_champion_snapshot_mutation();

commit;
