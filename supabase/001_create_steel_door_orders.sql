create extension if not exists pgcrypto;

create table if not exists public.steel_door_orders (
  id uuid primary key default gen_random_uuid(),

  ghi_chu text,
  lo text,
  lo_gl text,
  don_hang text,
  dai_ly text,

  ngay_dat date,
  ngay_giao date,

  bo_so text,
  model text,
  o_thoang text,
  huong_mo text,
  mau text,

  cao numeric,
  rong numeric,
  khuon text,

  pr numeric,
  khoa text,
  loai_pk text,
  so_canh numeric,
  so_ngay_du_kien_giao numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_steel_door_orders_don_hang
  on public.steel_door_orders (don_hang);

create index if not exists idx_steel_door_orders_ngay_giao
  on public.steel_door_orders (ngay_giao);

alter table public.steel_door_orders enable row level security;

-- Không tạo policy public.
-- Ứng dụng demo truy cập bảng qua API server bằng SERVICE_ROLE_KEY.
