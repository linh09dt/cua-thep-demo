-- =========================================================
-- DEMO CỬA THÉP - SEED 200 ĐƠN HÀNG
-- Chỉ thêm dữ liệu demo, không thay đổi cấu trúc bảng.
--
-- Có thể chạy lại an toàn:
-- 1) Xóa đúng các dòng demo có ghi_chu bắt đầu bằng [DEMO200]
-- 2) Tạo lại 200 dòng mới.
-- =========================================================

delete from public.steel_door_orders
where ghi_chu like '[DEMO200]%';

with demo_data as (
  select
    gs as stt,

    'DH-2026-' || lpad(gs::text, 4, '0') as don_hang,

    (array[
      'Đại lý An Phát',
      'Đại lý Minh Long',
      'Đại lý Thành Công',
      'Đại lý Hoàng Gia',
      'Đại lý Phúc Khang',
      'Đại lý Tân Thành',
      'Đại lý Gia Hưng',
      'Đại lý Hòa Bình',
      'Đại lý Đại Phát',
      'Đại lý Nam Việt',
      'Đại lý Đông Á',
      'Đại lý Hưng Thịnh'
    ])[1 + ((gs - 1) % 12)] as dai_ly,

    date '2026-08-01' + ((gs - 1) % 25) as ngay_dat,

    date '2026-08-08'
      + ((gs - 1) % 28)
      + case
          when gs % 9 = 0 then 5
          when gs % 5 = 0 then 3
          else 0
        end as ngay_giao,

    (array['M01','M02','M03','M04'])[
      1 + ((gs - 1) % 4)
    ] as model,

    (array['Trắng','Xám','Đen','Vân gỗ'])[
      1 + ((gs * 3 - 1) % 4)
    ] as mau,

    (array[2000,2050,2100,2150,2200,2250,2300])[
      1 + ((gs - 1) % 7)
    ]::numeric as cao,

    (array[800,850,900,950,1000,1050,1100,1200,1400,1600])[
      1 + ((gs * 2 - 1) % 10)
    ]::numeric as rong,

    (array['Trái','Phải','2 cánh'])[
      1 + ((gs - 1) % 3)
    ] as huong_mo,

    (1 + ((gs * 7) % 12))::numeric as so_luong,

    (array['Khóa cơ','Khóa tay gạt','Khóa điện tử'])[
      1 + ((gs * 2 - 1) % 3)
    ] as khoa,

    case
      when gs % 17 = 0 then 'Ưu tiên giao sớm'
      when gs % 13 = 0 then 'Khách yêu cầu kiểm tra màu trước khi giao'
      when gs % 11 = 0 then 'Đơn hàng công trình'
      when gs % 7 = 0 then 'Yêu cầu đóng gói kỹ'
      else 'Đơn hàng demo'
    end as ghi_chu_demo,

    case
      when gs <= 115 then 'Mới'
      when gs <= 155 then 'Đã lên kế hoạch'
      when gs <= 185 then 'Đang sản xuất'
      else 'Hoàn thành'
    end as trang_thai

  from generate_series(1, 200) gs
)

insert into public.steel_door_orders (
  id,
  don_hang,
  dai_ly,
  ngay_dat,
  ngay_giao,
  model,
  mau,
  cao,
  rong,
  huong_mo,
  so_luong,
  khoa,
  ghi_chu,
  trang_thai,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  don_hang,
  dai_ly,
  ngay_dat,
  ngay_giao,
  model,
  mau,
  cao,
  rong,
  huong_mo,
  so_luong,
  khoa,
  '[DEMO200] ' || ghi_chu_demo,
  trang_thai,
  now() - ((200 - stt) * interval '3 minutes'),
  now()
from demo_data
order by stt;

-- Kiểm tra kết quả
select
  count(*) as tong_don_demo,
  sum(so_luong) as tong_so_luong,
  count(*) filter (where trang_thai = 'Mới') as moi,
  count(*) filter (where trang_thai = 'Đã lên kế hoạch') as da_len_ke_hoach,
  count(*) filter (where trang_thai = 'Đang sản xuất') as dang_san_xuat,
  count(*) filter (where trang_thai = 'Hoàn thành') as hoan_thanh
from public.steel_door_orders
where ghi_chu like '[DEMO200]%';
