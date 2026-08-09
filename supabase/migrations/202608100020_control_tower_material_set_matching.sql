-- ============================================================
-- CONTROL TOWER + MATERIAL REQUIREMENT + SET MATCHING SUPPORT
-- Keeps existing ERP logic intact. Adds planning master data only.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.material_items (
  id uuid primary key default gen_random_uuid(),
  material_code text not null unique,
  material_name text not null,
  category text not null default 'OTHER',
  uom text not null default 'EA',
  safety_stock numeric not null default 0 check (safety_stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.material_inventory (
  material_id uuid primary key references public.material_items(id) on delete cascade,
  on_hand_qty numeric not null default 0 check (on_hand_qty >= 0),
  reserved_qty numeric not null default 0 check (reserved_qty >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.material_bom_rules (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  material_id uuid not null references public.material_items(id) on delete cascade,
  qty_per_set numeric not null check (qty_per_set > 0),
  required_for text not null default 'SET'
    check (required_for in ('SET','CÁNH','KHUNG','PHÀO')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(model, material_id, required_for)
);

create index if not exists idx_material_bom_model
  on public.material_bom_rules(model, is_active);

alter table public.material_items enable row level security;
alter table public.material_inventory enable row level security;
alter table public.material_bom_rules enable row level security;

-- Seed a practical steel-door demo BOM. Values are illustrative master data,
-- not a change to production routing/business logic.
insert into public.material_items(material_code,material_name,category,uom,safety_stock)
values
 ('ST-08','Thép tấm 0.8 mm','STEEL','KG',500),
 ('ST-12','Thép tấm 1.2 mm','STEEL','KG',350),
 ('CORE-HC','Giấy tổ ong / Honeycomb','CORE','M2',120),
 ('HINGE-SS','Bản lề inox','HARDWARE','EA',80),
 ('LOCK-BODY','Thân khóa','HARDWARE','EA',50),
 ('SEAL-RUB','Gioăng cao su','HARDWARE','M',200),
 ('POWDER','Bột sơn','FINISH','KG',80),
 ('FILM-WG','Film vân gỗ','FINISH','M2',100)
on conflict(material_code) do update set
 material_name=excluded.material_name,
 category=excluded.category,
 uom=excluded.uom,
 safety_stock=excluded.safety_stock,
 updated_at=now();

insert into public.material_inventory(material_id,on_hand_qty,reserved_qty)
select id,
 case material_code
  when 'ST-08' then 5200 when 'ST-12' then 3500 when 'CORE-HC' then 950
  when 'HINGE-SS' then 1250 when 'LOCK-BODY' then 380 when 'SEAL-RUB' then 4200
  when 'POWDER' then 620 when 'FILM-WG' then 780 else 0 end,
 0
from public.material_items
on conflict(material_id) do nothing;

-- Same basic material families, different consumption by model.
insert into public.material_bom_rules(model,material_id,qty_per_set,required_for)
select m.model,i.id,m.qty,m.branch
from (values
 ('M01','ST-08',18::numeric,'CÁNH'),('M01','ST-12',12::numeric,'KHUNG'),('M01','CORE-HC',1.75::numeric,'CÁNH'),('M01','HINGE-SS',3::numeric,'SET'),('M01','LOCK-BODY',1::numeric,'SET'),('M01','SEAL-RUB',6.2::numeric,'SET'),('M01','POWDER',0.9::numeric,'SET'),('M01','FILM-WG',1.9::numeric,'SET'),
 ('M02','ST-08',20::numeric,'CÁNH'),('M02','ST-12',13::numeric,'KHUNG'),('M02','CORE-HC',1.90::numeric,'CÁNH'),('M02','HINGE-SS',3::numeric,'SET'),('M02','LOCK-BODY',1::numeric,'SET'),('M02','SEAL-RUB',6.5::numeric,'SET'),('M02','POWDER',1.0::numeric,'SET'),('M02','FILM-WG',2.0::numeric,'SET'),
 ('M03','ST-08',22::numeric,'CÁNH'),('M03','ST-12',14::numeric,'KHUNG'),('M03','CORE-HC',2.05::numeric,'CÁNH'),('M03','HINGE-SS',4::numeric,'SET'),('M03','LOCK-BODY',1::numeric,'SET'),('M03','SEAL-RUB',6.8::numeric,'SET'),('M03','POWDER',1.1::numeric,'SET'),('M03','FILM-WG',2.1::numeric,'SET'),
 ('M04','ST-08',24::numeric,'CÁNH'),('M04','ST-12',15::numeric,'KHUNG'),('M04','CORE-HC',2.20::numeric,'CÁNH'),('M04','HINGE-SS',4::numeric,'SET'),('M04','LOCK-BODY',1::numeric,'SET'),('M04','SEAL-RUB',7.0::numeric,'SET'),('M04','POWDER',1.2::numeric,'SET'),('M04','FILM-WG',2.2::numeric,'SET')
) as m(model,code,qty,branch)
join public.material_items i on i.material_code=m.code
on conflict(model,material_id,required_for) do update set
 qty_per_set=excluded.qty_per_set,is_active=true,updated_at=now();

notify pgrst, 'reload schema';
