-- ============================================================
-- DEMO CỬA THÉP - BỔ SUNG ĐIỀU ĐỘ ĐỦ BỘ / ROUTING CHUNG
-- Cho phép Dispatch Header nhận component_type = 'ĐỦ BỘ'.
-- Không xóa dữ liệu Dispatch cũ.
-- ============================================================

alter table public.production_dispatch_headers
  drop constraint if exists production_dispatch_headers_component_type_check;

alter table public.production_dispatch_headers
  add constraint production_dispatch_headers_component_type_check
  check (component_type in ('CÁNH','KHUNG','PHÀO','ĐỦ BỘ'));
