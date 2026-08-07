-- ============================================================
-- DEMO CỬA THÉP - THÊM MASTER TÌNH TRẠNG ĐƠN HÀNG
-- Mở rộng order_master_data thêm category ORDER_STATUS.
-- Không xóa dữ liệu cũ.
-- ============================================================

alter table public.order_master_data
  drop constraint if exists order_master_data_category_check;

alter table public.order_master_data
  add constraint order_master_data_category_check
  check (
    category in (
      'MODEL',
      'COLOR',
      'LOCK',
      'OPEN_DIRECTION',
      'ORDER_STATUS'
    )
  );

insert into public.order_master_data
  (category, code, name, sort_order, is_active)
values
  ('ORDER_STATUS', 'MOI', 'Mới', 10, true),
  ('ORDER_STATUS', 'DA_LEN_KE_HOACH', 'Đã lên kế hoạch', 20, true),
  ('ORDER_STATUS', 'DANG_SAN_XUAT', 'Đang sản xuất', 30, true),
  ('ORDER_STATUS', 'HOAN_THANH', 'Hoàn thành', 40, true)
on conflict (category, code) do nothing;
