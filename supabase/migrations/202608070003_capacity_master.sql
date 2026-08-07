-- =========================================================
-- DEMO CỬA THÉP - CAPACITY MASTER
-- Gắn năng lực trực tiếp theo từng WO/Công đoạn.
-- Không thay đổi Routing hiện tại.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.production_capacities (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique
    references public.production_operations(id)
    on delete cascade,

  capacity_per_day numeric not null default 0,
  unit_name text not null default 'bộ/ngày',
  shifts_per_day numeric not null default 1,
  hours_per_shift numeric not null default 8,
  efficiency_percent numeric not null default 90,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (capacity_per_day >= 0),
  check (shifts_per_day > 0),
  check (hours_per_shift > 0),
  check (efficiency_percent >= 0 and efficiency_percent <= 100)
);

create index if not exists idx_production_capacities_operation
  on public.production_capacities(operation_id);

alter table public.production_capacities enable row level security;

-- App demo truy cập bằng service role từ API server.
-- Không mở policy public.

-- =========================================================
-- SEED CAPACITY DEMO
-- Số liệu chỉ để trình diễn, có thể sửa trên giao diện.
-- =========================================================

insert into public.production_capacities (
  operation_id,
  capacity_per_day,
  unit_name,
  shifts_per_day,
  hours_per_shift,
  efficiency_percent,
  is_active
)
select
  o.id,
  case o.wo_code
    when 'WO01' then 120
    when 'WO02' then 110
    when 'WO03' then 85
    when 'WO04' then 100
    when 'WO05' then 80

    when 'WO06' then 120
    when 'WO07' then 110
    when 'WO08' then 90
    when 'WO09' then 85
    when 'WO10' then 100

    when 'WO11' then 130
    when 'WO12' then 120
    when 'WO13' then 100

    when 'WO14' then 75
    when 'WO15' then 110
    when 'WO16' then 95
    when 'WO17' then 90
    when 'WO18' then 80
    when 'WO19' then 150
    when 'WO20' then 180
    else 100
  end,
  'bộ/ngày',
  1,
  8,
  case
    when o.wo_code in ('WO03','WO08','WO09','WO14','WO18') then 85
    else 90
  end,
  true
from public.production_operations o
on conflict (operation_id) do nothing;

-- Kiểm tra dữ liệu
select
  o.wo_code,
  o.operation_name,
  c.capacity_per_day,
  c.unit_name,
  c.shifts_per_day,
  c.hours_per_shift,
  c.efficiency_percent,
  round(c.capacity_per_day * c.efficiency_percent / 100.0, 0)
    as effective_capacity,
  c.is_active
from public.production_capacities c
join public.production_operations o
  on o.id = c.operation_id
order by o.wo_code;
