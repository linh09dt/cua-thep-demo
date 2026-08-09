-- ============================================================
-- UPDATE RESET DEMO FOR ADVANCED PLANNING / MES
-- Keeps 200 demo orders and all master/configuration.
-- Also clears Planning Runs / Material / Quality.
-- Uses WHERE true for environments that reject DELETE without WHERE.
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
  v_deleted_planning_runs integer := 0;
  v_deleted_quality integer := 0;
  v_deleted_material integer := 0;
begin
  select count(*) into v_before_orders
  from public.steel_door_orders;

  create temporary table tmp_keep_orders (
    id uuid primary key
  ) on commit drop;

  insert into tmp_keep_orders(id)
  select id
  from public.steel_door_orders
  where ghi_chu like '[DEMO200]%'
  order by don_hang, created_at, id
  limit 200;

  insert into tmp_keep_orders(id)
  select o.id
  from public.steel_door_orders o
  where not exists (
    select 1 from tmp_keep_orders k where k.id = o.id
  )
  order by o.created_at, o.don_hang, o.id
  limit greatest(0, 200 - (select count(*) from tmp_keep_orders));

  -- Advanced planning / MES first.
  if to_regclass('public.production_planning_runs') is not null then
    delete from public.production_planning_runs where true;
    get diagnostics v_deleted_planning_runs = row_count;
  end if;

  if to_regclass('public.production_quality_events') is not null then
    delete from public.production_quality_events where true;
    get diagnostics v_deleted_quality = row_count;
  end if;

  if to_regclass('public.production_material_readiness') is not null then
    delete from public.production_material_readiness where true;
    get diagnostics v_deleted_material = row_count;
  end if;

  delete from public.production_reports where true;
  get diagnostics v_deleted_reports = row_count;

  delete from public.production_dispatch_items where true;
  get diagnostics v_deleted_dispatch_items = row_count;

  delete from public.production_dispatch_headers where true;
  get diagnostics v_deleted_dispatch_headers = row_count;

  delete from public.production_orders where true;
  get diagnostics v_deleted_production_orders = row_count;

  delete from public.production_lot_items where true;
  get diagnostics v_deleted_lot_items = row_count;

  delete from public.production_lots where true;
  get diagnostics v_deleted_lots = row_count;

  delete from public.steel_door_orders o
  where not exists (
    select 1 from tmp_keep_orders k where k.id = o.id
  );
  get diagnostics v_deleted_orders = row_count;

  update public.steel_door_orders
  set trang_thai = 'Mới', updated_at = now()
  where id in (select id from tmp_keep_orders);

  if to_regclass('public.production_order_no_seq') is not null then
    perform setval('public.production_order_no_seq', 1, false);
  end if;

  select count(*) into v_after_orders
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
    'deleted_reports', v_deleted_reports,
    'deleted_planning_runs', v_deleted_planning_runs,
    'deleted_quality_events', v_deleted_quality,
    'deleted_material_readiness', v_deleted_material
  );
end;
$$;

revoke all on function public.reset_demo_keep_200_orders()
from public, anon, authenticated;

grant execute on function public.reset_demo_keep_200_orders()
to service_role;

notify pgrst, 'reload schema';
