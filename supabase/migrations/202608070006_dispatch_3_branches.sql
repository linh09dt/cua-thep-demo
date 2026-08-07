-- ============================================================
-- DEMO CỬA THÉP - DISPATCH 3 NHÁNH
-- Tab CÁNH : WO01-WO05
-- Tab KHUNG: WO06-WO10
-- Tab PHÀO : WO11-WO13
--
-- Chưa tạo Dispatch cho WO14-WO20.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.production_dispatch_headers (
  id uuid primary key default gen_random_uuid(),

  dispatch_date date not null,
  operation_id uuid not null
    references public.production_operations(id)
    on delete restrict,

  component_type text not null
    check (component_type in ('CÁNH','KHUNG','PHÀO')),

  status text not null default 'DRAFT'
    check (status in ('DRAFT','RELEASED','CANCELLED')),

  capacity_value numeric not null default 0,
  planned_quantity numeric not null default 0,

  released_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (dispatch_date, operation_id)
);

create table if not exists public.production_dispatch_items (
  id uuid primary key default gen_random_uuid(),

  dispatch_id uuid not null
    references public.production_dispatch_headers(id)
    on delete cascade,

  production_order_id uuid not null
    references public.production_orders(id)
    on delete restrict,

  sequence_no integer not null,
  quantity numeric not null default 0,

  created_at timestamptz not null default now(),

  unique (dispatch_id, production_order_id),
  unique (dispatch_id, sequence_no)
);

create index if not exists idx_dispatch_header_date
  on public.production_dispatch_headers(dispatch_date, operation_id);

create index if not exists idx_dispatch_items_order
  on public.production_dispatch_items(production_order_id);

alter table public.production_dispatch_headers enable row level security;
alter table public.production_dispatch_items enable row level security;

-- Demo app truy cập qua API server bằng service role.
-- Không tạo policy public.
