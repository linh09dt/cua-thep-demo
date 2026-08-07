-- ============================================================
-- PRODUCTION LOT AFTER LSX
-- New flow:
-- Order -> LSX -> Production Lot -> Dispatch
--
-- Keep order_id for traceability/compatibility.
-- Add production_order_id = LSX CHA (level_no = 1).
-- ============================================================

alter table public.production_lot_items
  add column if not exists production_order_id uuid null
    references public.production_orders(id)
    on delete cascade;

-- Backfill existing Lot Item from order_id -> LSX Cha if it exists.
update public.production_lot_items li
set production_order_id = po.id
from public.production_orders po
where po.order_id = li.order_id
  and po.level_no = 1
  and li.production_order_id is null;

create unique index if not exists ux_production_lot_items_production_order
  on public.production_lot_items(production_order_id)
  where production_order_id is not null;

create index if not exists idx_production_lot_items_production_order
  on public.production_lot_items(production_order_id);

comment on column public.production_lot_items.production_order_id is
  'LSX Cha selected into Production Lot. Flow: Order -> LSX -> Lot -> Dispatch.';
