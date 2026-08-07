-- ============================================================
-- PRODUCTION LOT / LÔ SẢN XUẤT
-- Tầng kế hoạch giữa Đơn hàng và Lệnh sản xuất.
-- Một đơn chỉ thuộc một lô đang hoạt động tại một thời điểm.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.production_lots (
  id uuid primary key default gen_random_uuid(),
  lot_no text not null unique,
  lot_name text null,
  production_date date not null,
  target_delivery_date date null,
  priority integer not null default 100,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','RELEASED','RUNNING','COMPLETED','CANCELLED')),
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_lot_items (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null
    references public.production_lots(id)
    on delete cascade,
  order_id uuid not null
    references public.steel_door_orders(id)
    on delete restrict,
  sequence_no integer not null default 10,
  created_at timestamptz not null default now(),
  unique (lot_id, order_id),
  unique (order_id)
);

create index if not exists idx_production_lots_date
  on public.production_lots(production_date, status);

create index if not exists idx_production_lot_items_lot
  on public.production_lot_items(lot_id, sequence_no);

alter table public.production_lots enable row level security;
alter table public.production_lot_items enable row level security;

-- Demo app truy cập qua API server/service role.
-- Không mở policy public.
