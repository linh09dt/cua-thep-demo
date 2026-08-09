-- ============================================================
-- ADVANCED PLANNING + LIGHT MES
-- Phase 1: Material Readiness + Set Readiness
-- Phase 2: Bottleneck Engine
-- Phase 3: Smart Auto Planning
-- Phase 4: Schedule Board (derived from Dispatch/Capacity)
-- Phase 5: Quality / Hold / Traceability
-- Phase 6: Dashboard KPI
-- ============================================================

create extension if not exists pgcrypto;

-- Material readiness is stored at LSX Cha / root level.
create table if not exists public.production_material_readiness (
  id uuid primary key default gen_random_uuid(),
  production_order_id uuid not null unique
    references public.production_orders(id) on delete cascade,
  order_id uuid not null
    references public.steel_door_orders(id) on delete cascade,
  status text not null default 'READY'
    check (status in ('READY','PARTIAL','SHORTAGE','HOLD')),
  readiness_percent numeric not null default 100
    check (readiness_percent >= 0 and readiness_percent <= 100),
  shortage_note text null,
  confirmed_by text null,
  confirmed_at timestamptz null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_material_readiness_status
  on public.production_material_readiness(status, updated_at);

-- Planning runs store the output of the smart planning engine.
create table if not exists public.production_planning_runs (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','APPROVED','CANCELLED')),
  total_recommendations integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_planning_recommendations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null
    references public.production_planning_runs(id) on delete cascade,
  production_order_id uuid not null
    references public.production_orders(id) on delete cascade,
  order_id uuid not null
    references public.steel_door_orders(id) on delete cascade,
  lot_id uuid null
    references public.production_lots(id) on delete set null,
  branch text not null
    check (branch in ('CÁNH','KHUNG','PHÀO','ĐỦ BỘ')),
  operation_id uuid null
    references public.production_operations(id) on delete set null,
  recommended_qty numeric not null default 0 check (recommended_qty >= 0),
  score numeric not null default 0,
  reason text null,
  due_date date null,
  material_status text null,
  bottleneck_rank integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_planning_runs_date
  on public.production_planning_runs(plan_date, created_at desc);

create index if not exists idx_planning_rec_run
  on public.production_planning_recommendations(run_id, score desc);

-- Quality / Hold / Rework / Traceability.
create table if not exists public.production_quality_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null default current_date,
  production_order_id uuid not null
    references public.production_orders(id) on delete cascade,
  order_id uuid not null
    references public.steel_door_orders(id) on delete cascade,
  operation_id uuid null
    references public.production_operations(id) on delete set null,
  event_type text not null
    check (event_type in ('QC','HOLD','REWORK','DEFECT','RELEASE')),
  status text not null default 'OPEN'
    check (status in ('OPEN','CLOSED')),
  quantity numeric not null default 0 check (quantity >= 0),
  reason text null,
  disposition text null,
  created_by text null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quality_events_open
  on public.production_quality_events(status, event_type, event_date);

create index if not exists idx_quality_events_order
  on public.production_quality_events(order_id, production_order_id);

alter table public.production_material_readiness enable row level security;
alter table public.production_planning_runs enable row level security;
alter table public.production_planning_recommendations enable row level security;
alter table public.production_quality_events enable row level security;

-- Demo app works through API server / service role. No public policies.
notify pgrst, 'reload schema';
