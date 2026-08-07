-- ============================================================
-- DEMO CỬA THÉP - PRODUCTION ORDER 3 CẤP
-- Cấp 1: LSX CHA theo đơn hàng
-- Cấp 2: LSX CON CÁNH / KHUNG / PHÀO
-- Cấp 3:
--   - WO01-WO05 thuộc CON CÁNH
--   - WO06-WO10 thuộc CON KHUNG
--   - WO11-WO13 thuộc CON PHÀO
--   - WO14-WO20 trực thuộc LSX CHA sau điểm hội tụ ĐỦ BỘ
-- ============================================================

create extension if not exists pgcrypto;

create sequence if not exists public.production_order_no_seq start 1;

create table if not exists public.production_orders (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.steel_door_orders(id)
    on delete restrict,

  parent_id uuid null
    references public.production_orders(id)
    on delete cascade,

  root_id uuid null
    references public.production_orders(id)
    on delete cascade,

  production_no text not null unique,

  level_no integer not null check (level_no in (1,2,3)),
  order_type text not null check (order_type in ('PARENT','COMPONENT','OPERATION')),

  component_type text null,
  operation_id uuid null
    references public.production_operations(id)
    on delete restrict,

  routing_id text null
    references public.production_routings(routing_id)
    on delete restrict,

  quantity numeric not null default 0,

  status text not null default 'DRAFT'
    check (status in ('DRAFT','RELEASED','RUNNING','COMPLETED','CANCELLED')),

  is_blocked boolean not null default false,
  blocked_reason text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_production_orders_order
  on public.production_orders(order_id);

create index if not exists idx_production_orders_parent
  on public.production_orders(parent_id);

create index if not exists idx_production_orders_root
  on public.production_orders(root_id);

create index if not exists idx_production_orders_operation
  on public.production_orders(operation_id);

alter table public.production_orders enable row level security;

-- App demo dùng service role qua API server.
-- Không mở policy public.

-- ============================================================
-- FUNCTION TẠO TOÀN BỘ CÂY LSX CHO 1 ĐƠN HÀNG
-- ============================================================

create or replace function public.create_production_order_tree(
  p_order_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.steel_door_orders%rowtype;
  v_root_id uuid;
  v_canh_id uuid;
  v_khung_id uuid;
  v_phao_id uuid;
  v_base_no text;
  v_qty numeric;
  v_op record;
begin
  select *
  into v_order
  from public.steel_door_orders
  where id = p_order_id;

  if not found then
    raise exception 'Không tìm thấy đơn hàng.';
  end if;

  select id
  into v_root_id
  from public.production_orders
  where order_id = p_order_id
    and level_no = 1
    and order_type = 'PARENT'
    and status <> 'CANCELLED'
  limit 1;

  if v_root_id is not null then
    return v_root_id;
  end if;

  v_qty := coalesce(v_order.so_luong, 0);
  v_base_no := 'LSX-' || lpad(nextval('public.production_order_no_seq')::text, 6, '0');

  -- CHA
  insert into public.production_orders (
    order_id, parent_id, root_id, production_no,
    level_no, order_type, component_type,
    quantity, status
  )
  values (
    p_order_id, null, null, v_base_no,
    1, 'PARENT', 'ĐỦ BỘ',
    v_qty, 'DRAFT'
  )
  returning id into v_root_id;

  update public.production_orders
  set root_id = v_root_id
  where id = v_root_id;

  -- CON CÁNH
  insert into public.production_orders (
    order_id, parent_id, root_id, production_no,
    level_no, order_type, component_type, routing_id,
    quantity, status
  )
  values (
    p_order_id, v_root_id, v_root_id, v_base_no || '-CANH',
    2, 'COMPONENT', 'CÁNH', 'RT_CANH',
    v_qty, 'DRAFT'
  )
  returning id into v_canh_id;

  -- CON KHUNG
  insert into public.production_orders (
    order_id, parent_id, root_id, production_no,
    level_no, order_type, component_type, routing_id,
    quantity, status
  )
  values (
    p_order_id, v_root_id, v_root_id, v_base_no || '-KHUNG',
    2, 'COMPONENT', 'KHUNG', 'RT_KHUNG',
    v_qty, 'DRAFT'
  )
  returning id into v_khung_id;

  -- CON PHÀO
  insert into public.production_orders (
    order_id, parent_id, root_id, production_no,
    level_no, order_type, component_type, routing_id,
    quantity, status
  )
  values (
    p_order_id, v_root_id, v_root_id, v_base_no || '-PHAO',
    2, 'COMPONENT', 'PHÀO', 'RT_PHAO',
    v_qty, 'DRAFT'
  )
  returning id into v_phao_id;

  -- CHÁU CÁNH: lấy đúng RT_CANH
  for v_op in
    select
      o.id as operation_id,
      o.wo_code,
      s.sequence_no
    from public.production_routing_steps s
    join public.production_operations o
      on o.id = s.operation_id
    where s.routing_id = 'RT_CANH'
    order by s.sequence_no
  loop
    insert into public.production_orders (
      order_id, parent_id, root_id, production_no,
      level_no, order_type, component_type, operation_id, routing_id,
      quantity, status, is_blocked
    )
    values (
      p_order_id, v_canh_id, v_root_id,
      v_base_no || '-CANH-' || v_op.wo_code,
      3, 'OPERATION', 'CÁNH', v_op.operation_id, 'RT_CANH',
      v_qty, 'DRAFT', false
    );
  end loop;

  -- CHÁU KHUNG
  for v_op in
    select
      o.id as operation_id,
      o.wo_code,
      s.sequence_no
    from public.production_routing_steps s
    join public.production_operations o
      on o.id = s.operation_id
    where s.routing_id = 'RT_KHUNG'
    order by s.sequence_no
  loop
    insert into public.production_orders (
      order_id, parent_id, root_id, production_no,
      level_no, order_type, component_type, operation_id, routing_id,
      quantity, status, is_blocked
    )
    values (
      p_order_id, v_khung_id, v_root_id,
      v_base_no || '-KHUNG-' || v_op.wo_code,
      3, 'OPERATION', 'KHUNG', v_op.operation_id, 'RT_KHUNG',
      v_qty, 'DRAFT', false
    );
  end loop;

  -- CHÁU PHÀO
  for v_op in
    select
      o.id as operation_id,
      o.wo_code,
      s.sequence_no
    from public.production_routing_steps s
    join public.production_operations o
      on o.id = s.operation_id
    where s.routing_id = 'RT_PHAO'
    order by s.sequence_no
  loop
    insert into public.production_orders (
      order_id, parent_id, root_id, production_no,
      level_no, order_type, component_type, operation_id, routing_id,
      quantity, status, is_blocked
    )
    values (
      p_order_id, v_phao_id, v_root_id,
      v_base_no || '-PHAO-' || v_op.wo_code,
      3, 'OPERATION', 'PHÀO', v_op.operation_id, 'RT_PHAO',
      v_qty, 'DRAFT', false
    );
  end loop;

  -- WO CHUNG trực thuộc CHA.
  -- WO14 trở đi khóa cho đến khi đủ bộ.
  for v_op in
    select
      o.id as operation_id,
      o.wo_code,
      s.sequence_no
    from public.production_routing_steps s
    join public.production_operations o
      on o.id = s.operation_id
    where s.routing_id = 'RT_CHUNG'
    order by s.sequence_no
  loop
    insert into public.production_orders (
      order_id, parent_id, root_id, production_no,
      level_no, order_type, component_type, operation_id, routing_id,
      quantity, status, is_blocked, blocked_reason
    )
    values (
      p_order_id, v_root_id, v_root_id,
      v_base_no || '-' || v_op.wo_code,
      3, 'OPERATION', 'ĐỦ BỘ', v_op.operation_id, 'RT_CHUNG',
      v_qty, 'DRAFT', true, 'Chờ hoàn thành Cánh + Khung + Phào'
    );
  end loop;

  return v_root_id;
end;
$$;

-- ============================================================
-- FUNCTION KIỂM TRA ĐỦ BỘ VÀ MỞ WO14
-- Demo hiện tại:
-- COMPONENT CÁNH/KHUNG/PHÀO phải COMPLETED.
-- Khi đủ, mở WO đầu tiên của RT_CHUNG.
-- Các WO chung sau vẫn được quản lý theo thứ tự Routing ở bước báo cáo.
-- ============================================================

create or replace function public.refresh_full_set_gate(
  p_root_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_done_count integer;
  v_first_common_operation uuid;
begin
  select count(*)
  into v_done_count
  from public.production_orders
  where root_id = p_root_id
    and level_no = 2
    and component_type in ('CÁNH','KHUNG','PHÀO')
    and status = 'COMPLETED';

  if v_done_count < 3 then
    return false;
  end if;

  select s.operation_id
  into v_first_common_operation
  from public.production_routing_steps s
  where s.routing_id = 'RT_CHUNG'
  order by s.sequence_no
  limit 1;

  update public.production_orders
  set
    is_blocked = false,
    blocked_reason = null,
    updated_at = now()
  where root_id = p_root_id
    and operation_id = v_first_common_operation;

  return true;
end;
$$;
