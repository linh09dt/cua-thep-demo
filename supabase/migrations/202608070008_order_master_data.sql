-- ============================================================
-- DEMO CỬA THÉP - MASTER DATA CHO ĐƠN HÀNG
-- Danh mục:
-- MODEL / COLOR / LOCK / OPEN_DIRECTION
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.order_master_data (
  id uuid primary key default gen_random_uuid(),

  category text not null
    check (category in ('MODEL','COLOR','LOCK','OPEN_DIRECTION')),

  code text not null,
  name text not null,

  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (category, code)
);

create index if not exists idx_order_master_data_category
  on public.order_master_data(category, is_active, sort_order);

alter table public.order_master_data enable row level security;

-- App truy cập qua API server/service role.
-- Không mở policy public.

-- Seed đúng các giá trị demo đang dùng trước đây.

insert into public.order_master_data
(category, code, name, sort_order)
values
  ('MODEL', 'M01', 'M01', 10),
  ('MODEL', 'M02', 'M02', 20),
  ('MODEL', 'M03', 'M03', 30),
  ('MODEL', 'M04', 'M04', 40),

  ('COLOR', 'TRANG', 'Trắng', 10),
  ('COLOR', 'XAM', 'Xám', 20),
  ('COLOR', 'DEN', 'Đen', 30),
  ('COLOR', 'VAN_GO', 'Vân gỗ', 40),

  ('LOCK', 'KHOA_CO', 'Khóa cơ', 10),
  ('LOCK', 'KHOA_TAY_GAT', 'Khóa tay gạt', 20),
  ('LOCK', 'KHOA_DIEN_TU', 'Khóa điện tử', 30),

  ('OPEN_DIRECTION', 'TRAI', 'Trái', 10),
  ('OPEN_DIRECTION', 'PHAI', 'Phải', 20),
  ('OPEN_DIRECTION', 'HAI_CANH', '2 cánh', 30)
on conflict (category, code) do nothing;
