-- =========================================================
-- DEMO CỬA THÉP - PRIORITY MASTER THEO WO
-- Mỗi WO có thể có tối đa 5 mức Priority.
-- Priority chỉ dùng để sắp xếp công việc.
-- Không bỏ qua điều kiện đủ bộ của RT_CHUNG.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.production_priority_master (
  operation_id uuid primary key
    references public.production_operations(id)
    on delete cascade,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_priority_rules (
  id uuid primary key default gen_random_uuid(),

  operation_id uuid not null
    references public.production_priority_master(operation_id)
    on delete cascade,

  priority_level integer not null,
  field_key text not null,
  direction text not null default 'ASC'
    check (direction in ('ASC', 'DESC')),

  created_at timestamptz not null default now(),

  check (priority_level >= 1 and priority_level <= 5),

  unique (operation_id, priority_level)
);

create index if not exists idx_priority_rules_operation
  on public.production_priority_rules(operation_id, priority_level);

alter table public.production_priority_master enable row level security;
alter table public.production_priority_rules enable row level security;

-- App demo truy cập qua server API bằng service role.
-- Không tạo policy public.

-- =========================================================
-- SEED MASTER CHO TOÀN BỘ WO HIỆN TẠI
-- =========================================================

insert into public.production_priority_master (
  operation_id,
  is_active
)
select
  id,
  true
from public.production_operations
on conflict (operation_id) do nothing;

-- =========================================================
-- SEED PRIORITY DEMO
-- Chỉ seed khi WO chưa có rule.
-- =========================================================

-- CÁNH
insert into public.production_priority_rules
  (operation_id, priority_level, field_key, direction)
select o.id, v.priority_level, v.field_key, v.direction
from public.production_operations o
join (
  values
    ('WO01', 1, 'due_date', 'ASC'),
    ('WO01', 2, 'order_date', 'ASC'),

    ('WO02', 1, 'previous_wo_sequence', 'ASC'),
    ('WO02', 2, 'due_date', 'ASC'),

    ('WO03', 1, 'previous_wo_sequence', 'ASC'),
    ('WO03', 2, 'due_date', 'ASC'),

    ('WO04', 1, 'previous_wo_sequence', 'ASC'),
    ('WO04', 2, 'due_date', 'ASC'),

    ('WO05', 1, 'previous_wo_sequence', 'ASC'),
    ('WO05', 2, 'due_date', 'ASC')
) as v(wo_code, priority_level, field_key, direction)
  on o.wo_code = v.wo_code
on conflict (operation_id, priority_level) do nothing;

-- KHUNG
insert into public.production_priority_rules
  (operation_id, priority_level, field_key, direction)
select o.id, v.priority_level, v.field_key, v.direction
from public.production_operations o
join (
  values
    ('WO06', 1, 'due_date', 'ASC'),
    ('WO06', 2, 'order_date', 'ASC'),

    ('WO07', 1, 'previous_wo_sequence', 'ASC'),
    ('WO07', 2, 'due_date', 'ASC'),

    ('WO08', 1, 'previous_wo_sequence', 'ASC'),
    ('WO08', 2, 'due_date', 'ASC'),

    ('WO09', 1, 'previous_wo_sequence', 'ASC'),
    ('WO09', 2, 'due_date', 'ASC'),

    ('WO10', 1, 'previous_wo_sequence', 'ASC'),
    ('WO10', 2, 'due_date', 'ASC')
) as v(wo_code, priority_level, field_key, direction)
  on o.wo_code = v.wo_code
on conflict (operation_id, priority_level) do nothing;

-- PHÀO
insert into public.production_priority_rules
  (operation_id, priority_level, field_key, direction)
select o.id, v.priority_level, v.field_key, v.direction
from public.production_operations o
join (
  values
    ('WO11', 1, 'due_date', 'ASC'),
    ('WO11', 2, 'order_date', 'ASC'),

    ('WO12', 1, 'previous_wo_sequence', 'ASC'),
    ('WO12', 2, 'due_date', 'ASC'),

    ('WO13', 1, 'previous_wo_sequence', 'ASC'),
    ('WO13', 2, 'due_date', 'ASC')
) as v(wo_code, priority_level, field_key, direction)
  on o.wo_code = v.wo_code
on conflict (operation_id, priority_level) do nothing;

-- LUỒNG CHUNG
insert into public.production_priority_rules
  (operation_id, priority_level, field_key, direction)
select o.id, v.priority_level, v.field_key, v.direction
from public.production_operations o
join (
  values
    ('WO14', 1, 'full_set_ready', 'DESC'),
    ('WO14', 2, 'due_date', 'ASC'),

    ('WO15', 1, 'previous_wo_sequence', 'ASC'),
    ('WO15', 2, 'due_date', 'ASC'),

    ('WO16', 1, 'color', 'ASC'),
    ('WO16', 2, 'due_date', 'ASC'),

    ('WO17', 1, 'color', 'ASC'),
    ('WO17', 2, 'due_date', 'ASC'),

    ('WO18', 1, 'due_date', 'ASC'),
    ('WO18', 2, 'previous_wo_sequence', 'ASC'),

    ('WO19', 1, 'due_date', 'ASC'),
    ('WO19', 2, 'previous_wo_sequence', 'ASC'),

    ('WO20', 1, 'due_date', 'ASC'),
    ('WO20', 2, 'order_no', 'ASC')
) as v(wo_code, priority_level, field_key, direction)
  on o.wo_code = v.wo_code
on conflict (operation_id, priority_level) do nothing;

-- Kiểm tra
select
  o.wo_code,
  o.operation_name,
  p.is_active,
  r.priority_level,
  r.field_key,
  r.direction
from public.production_priority_master p
join public.production_operations o
  on o.id = p.operation_id
left join public.production_priority_rules r
  on r.operation_id = p.operation_id
order by o.wo_code, r.priority_level;
