-- DEMO CỬA THÉP
-- Bổ sung đúng 2 trường cần cho giao diện nhập trực tiếp trên web.
-- Không xóa hoặc đổi các cột cũ.

alter table public.steel_door_orders
  add column if not exists so_luong numeric;

alter table public.steel_door_orders
  add column if not exists trang_thai text not null default 'Mới';

update public.steel_door_orders
set so_luong = coalesce(so_luong, so_canh)
where so_luong is null;

update public.steel_door_orders
set trang_thai = 'Mới'
where trang_thai is null or btrim(trang_thai) = '';

create index if not exists idx_steel_door_orders_trang_thai
  on public.steel_door_orders (trang_thai);
