-- ============================================================
-- DEMO CỬA THÉP - WIP SETTING THEO CÔNG ĐOẠN
-- Chỉ bổ sung cấu hình WIP.
-- Chưa thay đổi engine Dispatch.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.production_wip_settings (
  id uuid primary key default gen_random_uuid(),

  operation_id uuid not null unique
    references public.production_operations(id)
    on delete cascade,

  wip_min numeric not null default 0,
  wip_target numeric not null default 0,
  wip_max numeric not null default 0,

  unit_name text not null default 'bộ',
  is_active boolean not null default true,
  note text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (wip_min >= 0),
  check (wip_target >= 0),
  check (wip_max >= 0),
  check (wip_min <= wip_target),
  check (wip_target <= wip_max)
);

create index if not exists idx_production_wip_settings_operation
  on public.production_wip_settings(operation_id);

alter table public.production_wip_settings enable row level security;

-- App demo truy cập qua API server/service role.
-- Không mở policy public.

-- ============================================================
-- SEED DEMO WIP CHO TOÀN BỘ WO01-WO20
-- Có thể sửa trên giao diện.
-- ============================================================

insert into public.production_wip_settings (
  operation_id,
  wip_min,
  wip_target,
  wip_max,
  unit_name,
  is_active,
  note
)
select
  o.id,

  case
    when o.wo_code in ('WO01','WO06','WO11') then 20
    when o.wo_code in ('WO03','WO08','WO14','WO16','WO18') then 10
    else 15
  end as wip_min,

  case
    when o.wo_code in ('WO01','WO06','WO11') then 50
    when o.wo_code in ('WO03','WO08','WO14','WO16','WO18') then 30
    else 40
  end as wip_target,

  case
    when o.wo_code in ('WO01','WO06','WO11') then 80
    when o.wo_code in ('WO03','WO08','WO14','WO16','WO18') then 50
    else 65
  end as wip_max,

  'bộ',
  true,
  'WIP demo - có thể điều chỉnh'
from public.production_operations o
on conflict (operation_id) do nothing;

select
  o.wo_code,
  o.operation_name,
  w.wip_min,
  w.wip_target,
  w.wip_max,
  w.unit_name,
  w.is_active
from public.production_wip_settings w
join public.production_operations o
  on o.id = w.operation_id
order by o.wo_code;
