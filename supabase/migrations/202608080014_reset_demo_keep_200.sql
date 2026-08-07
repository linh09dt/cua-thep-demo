-- ============================================================
-- RESET DỮ LIỆU DEMO - GIỮ LẠI ĐÚNG 200 ĐƠN HÀNG
--
-- GIỮ NGUYÊN:
-- - steel_door_orders: đúng 200 dòng
-- - order_master_data
-- - production_operations
-- - production_routings
-- - production_routing_steps
-- - production_capacities
-- - production_priority_master / rules
-- - production_wip_settings
--
-- XÓA:
-- - production_reports
-- - production_dispatch_items / headers
-- - production_orders
-- - production_lot_items / production_lots
--
-- 200 đơn được ưu tiên giữ:
-- 1) các đơn [DEMO200]
-- 2) nếu thiếu thì lấy thêm đơn cũ nhất còn lại
--
-- Sau reset:
-- - 200 đơn được đưa về trạng thái "Mới"
-- - sequence LSX được đưa về 1
-- ============================================================

create or replace function public.reset_demo_keep_200_orders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before_orders integer := 0;
  v_after_orders integer := 0;
  v_deleted_orders integer := 0;
  v_deleted_reports integer := 0;
  v_deleted_dispatch_items integer := 0;
  v_deleted_dispatch_headers integer := 0;
  v_deleted_production_orders integer := 0;
  v_deleted_lot_items integer := 0;
  v_deleted_lots integer := 0;
begin
  select count(*)
  into v_before_orders
  from public.steel_door_orders;

  create temporary table tmp_keep_orders (
    id uuid primary key
  ) on commit drop;

  -- Ưu tiên bộ 200 demo chuẩn hiện có.
  insert into tmp_keep_orders(id)
  select id
  from public.steel_door_orders
  where ghi_chu like '[DEMO200]%'
  order by don_hang, created_at, id
  limit 200;

  -- Nếu [DEMO200] chưa đủ 200 thì lấy thêm đơn cũ nhất.
  insert into tmp_keep_orders(id)
  select o.id
  from public.steel_door_orders o
  where not exists (
    select 1
    from tmp_keep_orders k
    where k.id = o.id
  )
  order by o.created_at, o.don_hang, o.id
  limit greatest(
    0,
    200 - (select count(*) from tmp_keep_orders)
  );

  -- 1. Báo cáo
  delete from public.production_reports;
  get diagnostics v_deleted_reports = row_count;

  -- 2. Dispatch
  delete from public.production_dispatch_items;
  get diagnostics v_deleted_dispatch_items = row_count;

  delete from public.production_dispatch_headers;
  get diagnostics v_deleted_dispatch_headers = row_count;

  -- 3. Production Orders / LSX / WO
  delete from public.production_orders;
  get diagnostics v_deleted_production_orders = row_count;

  -- 4. Production Lots
  delete from public.production_lot_items;
  get diagnostics v_deleted_lot_items = row_count;

  delete from public.production_lots;
  get diagnostics v_deleted_lots = row_count;

  -- 5. Chỉ giữ đúng tối đa 200 đơn đã chọn.
  delete from public.steel_door_orders o
  where not exists (
    select 1
    from tmp_keep_orders k
    where k.id = o.id
  );
  get diagnostics v_deleted_orders = row_count;

  -- 6. Đưa các đơn giữ lại về trạng thái đầu vào.
  update public.steel_door_orders
  set
    trang_thai = 'Mới',
    updated_at = now()
  where id in (
    select id from tmp_keep_orders
  );

  -- 7. Reset sequence LSX để demo lại từ LSX-000001.
  if to_regclass('public.production_order_no_seq') is not null then
    perform setval(
      'public.production_order_no_seq',
      1,
      false
    );
  end if;

  select count(*)
  into v_after_orders
  from public.steel_door_orders;

  return jsonb_build_object(
    'success', true,
    'orders_before', v_before_orders,
    'orders_after', v_after_orders,
    'deleted_orders', v_deleted_orders,
    'deleted_lots', v_deleted_lots,
    'deleted_lot_items', v_deleted_lot_items,
    'deleted_production_orders', v_deleted_production_orders,
    'deleted_dispatch_headers', v_deleted_dispatch_headers,
    'deleted_dispatch_items', v_deleted_dispatch_items,
    'deleted_reports', v_deleted_reports
  );
end;
$$;

-- Chỉ API server/service role được phép gọi.
revoke all on function public.reset_demo_keep_200_orders()
from public, anon, authenticated;

grant execute on function public.reset_demo_keep_200_orders()
to service_role;
