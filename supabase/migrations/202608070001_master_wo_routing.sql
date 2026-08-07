-- =========================================================
-- DEMO CỬA THÉP
-- MASTER DATA: WO + ROUTING
-- Logic:
-- 1) Cánh / Khung / Phào chạy routing riêng.
-- 2) Chỉ khi cả 3 nhánh hoàn thành mới được vào RT_CHUNG.
-- 3) RT_CHUNG: Hàn liên kết -> Vệ sinh trước sơn -> Sơn
--    -> Dán vân -> Lắp ráp/Đóng gói -> Nhập kho -> Xuất kho.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.production_operations (
  id uuid primary key default gen_random_uuid(),
  wo_code text not null unique,
  operation_code text not null unique,
  operation_name text not null,
  component_scope text not null,
  stage_type text not null check (stage_type in ('BRANCH', 'COMMON')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_routings (
  routing_id text primary key,
  routing_name text not null,
  component_type text not null,
  routing_type text not null check (routing_type in ('BRANCH', 'COMMON')),
  requires_full_set boolean not null default false,
  required_components text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_routing_steps (
  id uuid primary key default gen_random_uuid(),
  routing_id text not null
    references public.production_routings(routing_id)
    on delete cascade,
  operation_id uuid not null
    references public.production_operations(id)
    on delete restrict,
  sequence_no integer not null,
  created_at timestamptz not null default now(),
  unique (routing_id, sequence_no),
  unique (routing_id, operation_id)
);

create index if not exists idx_production_operations_stage
  on public.production_operations(stage_type, component_scope);

create index if not exists idx_production_routing_steps_route
  on public.production_routing_steps(routing_id, sequence_no);

alter table public.production_operations enable row level security;
alter table public.production_routings enable row level security;
alter table public.production_routing_steps enable row level security;

-- App demo truy cập qua API server bằng service role.
-- Không mở policy public ở migration này.

-- =========================
-- SEED WO MASTER
-- =========================

insert into public.production_operations
  (wo_code, operation_code, operation_name, component_scope, stage_type)
values
  ('WO01', 'LASER_CANH', 'Laser Cánh', 'CÁNH', 'BRANCH'),
  ('WO02', 'CHAN_CANH', 'Chấn Cánh', 'CÁNH', 'BRANCH'),
  ('WO03', 'HAN_CANH', 'Hàn Cánh', 'CÁNH', 'BRANCH'),
  ('WO04', 'PHUN_KEO_VAO_GIAY', 'Phun keo / Vào giấy', 'CÁNH', 'BRANCH'),
  ('WO05', 'EP_CANH', 'Ép Cánh', 'CÁNH', 'BRANCH'),

  ('WO06', 'LASER_KHUNG', 'Laser Khung', 'KHUNG', 'BRANCH'),
  ('WO07', 'CHAN_KHUNG', 'Chấn Khung', 'KHUNG', 'BRANCH'),
  ('WO08', 'HAN_KHUNG_PK', 'Hàn Khung / PK', 'KHUNG', 'BRANCH'),
  ('WO09', 'HAN_GHEP', 'Hàn Ghép', 'KHUNG', 'BRANCH'),
  ('WO10', 'MAI_PHANG', 'Mài Phẳng', 'KHUNG', 'BRANCH'),

  ('WO11', 'LASER_PHAO', 'Laser Phào', 'PHÀO', 'BRANCH'),
  ('WO12', 'CHAN_PHAO', 'Chấn Phào', 'PHÀO', 'BRANCH'),
  ('WO13', 'HAN_PHAO', 'Hàn Phào', 'PHÀO', 'BRANCH'),

  ('WO14', 'HAN_LIEN_KET', 'Hàn Liên Kết', 'ĐỦ BỘ', 'COMMON'),
  ('WO15', 'VE_SINH_TRUOC_SON', 'Vệ Sinh Trước Sơn', 'ĐỦ BỘ', 'COMMON'),
  ('WO16', 'SON', 'Sơn', 'ĐỦ BỘ', 'COMMON'),
  ('WO17', 'DAN_VAN', 'Dán Vân', 'ĐỦ BỘ', 'COMMON'),
  ('WO18', 'LAP_RAP_DONG_GOI', 'Lắp Ráp / Đóng Gói', 'ĐỦ BỘ', 'COMMON'),
  ('WO19', 'NHAP_KHO', 'Nhập Kho', 'ĐỦ BỘ', 'COMMON'),
  ('WO20', 'XUAT_KHO', 'Xuất Kho', 'ĐỦ BỘ', 'COMMON')
on conflict (wo_code) do update set
  operation_code = excluded.operation_code,
  operation_name = excluded.operation_name,
  component_scope = excluded.component_scope,
  stage_type = excluded.stage_type,
  updated_at = now();

-- =========================
-- SEED ROUTING MASTER
-- =========================

insert into public.production_routings
  (
    routing_id,
    routing_name,
    component_type,
    routing_type,
    requires_full_set,
    required_components
  )
values
  (
    'RT_CANH',
    'Routing Cánh',
    'CÁNH',
    'BRANCH',
    false,
    '{}'
  ),
  (
    'RT_KHUNG',
    'Routing Khung',
    'KHUNG',
    'BRANCH',
    false,
    '{}'
  ),
  (
    'RT_PHAO',
    'Routing Phào',
    'PHÀO',
    'BRANCH',
    false,
    '{}'
  ),
  (
    'RT_CHUNG',
    'Routing Chung Sau Đủ Bộ',
    'ĐỦ BỘ',
    'COMMON',
    true,
    array['CÁNH','KHUNG','PHÀO']
  )
on conflict (routing_id) do update set
  routing_name = excluded.routing_name,
  component_type = excluded.component_type,
  routing_type = excluded.routing_type,
  requires_full_set = excluded.requires_full_set,
  required_components = excluded.required_components,
  updated_at = now();

-- =========================
-- SEED ROUTING STEPS
-- Xóa đúng step của 4 routing demo rồi seed lại.
-- Không xóa WO Master.
-- =========================

delete from public.production_routing_steps
where routing_id in ('RT_CANH', 'RT_KHUNG', 'RT_PHAO', 'RT_CHUNG');

insert into public.production_routing_steps
  (routing_id, operation_id, sequence_no)
select
  'RT_CANH',
  id,
  case wo_code
    when 'WO01' then 10
    when 'WO02' then 20
    when 'WO03' then 30
    when 'WO04' then 40
    when 'WO05' then 50
  end
from public.production_operations
where wo_code in ('WO01','WO02','WO03','WO04','WO05');

insert into public.production_routing_steps
  (routing_id, operation_id, sequence_no)
select
  'RT_KHUNG',
  id,
  case wo_code
    when 'WO06' then 10
    when 'WO07' then 20
    when 'WO08' then 30
    when 'WO09' then 40
    when 'WO10' then 50
  end
from public.production_operations
where wo_code in ('WO06','WO07','WO08','WO09','WO10');

insert into public.production_routing_steps
  (routing_id, operation_id, sequence_no)
select
  'RT_PHAO',
  id,
  case wo_code
    when 'WO11' then 10
    when 'WO12' then 20
    when 'WO13' then 30
  end
from public.production_operations
where wo_code in ('WO11','WO12','WO13');

insert into public.production_routing_steps
  (routing_id, operation_id, sequence_no)
select
  'RT_CHUNG',
  id,
  case wo_code
    when 'WO14' then 10
    when 'WO15' then 20
    when 'WO16' then 30
    when 'WO17' then 40
    when 'WO18' then 50
    when 'WO19' then 60
    when 'WO20' then 70
  end
from public.production_operations
where wo_code in ('WO14','WO15','WO16','WO17','WO18','WO19','WO20');
