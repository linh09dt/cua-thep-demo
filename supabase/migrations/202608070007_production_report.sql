-- ============================================================
-- DEMO CỬA THÉP - BÁO CÁO SẢN XUẤT 3 NHÁNH
-- CÁNH : WO01-WO05
-- KHUNG: WO06-WO10
-- PHÀO : WO11-WO13
--
-- Báo cáo dựa trên Dispatch RELEASED.
-- Good/NG được cộng dồn.
-- Remain = Dispatch Qty - Good.
-- Khi Remain = 0:
--   WO hiện tại -> COMPLETED
--   WO kế tiếp đủ điều kiện Điều độ
-- Khi WO cuối nhánh hoàn thành:
--   LSX CON -> COMPLETED
-- Nếu cả Cánh + Khung + Phào hoàn thành:
--   gọi refresh_full_set_gate(root_id) để mở WO14.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.production_reports (
  id uuid primary key default gen_random_uuid(),

  report_date date not null,

  dispatch_item_id uuid not null
    references public.production_dispatch_items(id)
    on delete restrict,

  production_order_id uuid not null
    references public.production_orders(id)
    on delete restrict,

  good_qty numeric not null default 0,
  ng_qty numeric not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (report_date, dispatch_item_id),

  check (good_qty >= 0),
  check (ng_qty >= 0)
);

create index if not exists idx_production_reports_date
  on public.production_reports(report_date);

create index if not exists idx_production_reports_order
  on public.production_reports(production_order_id);

alter table public.production_reports enable row level security;

-- Demo app dùng API server/service role.
-- Không mở policy public.
