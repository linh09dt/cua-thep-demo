-- DEMO ERP CỬA THÉP THÁNG 08/2026
-- Mốc "hôm nay" của kịch bản: 09/08/2026.
-- Giữ 200 đơn + Master/Config, dựng lại dữ liệu vận hành demo.

begin;
select public.reset_demo_keep_200_orders();

-- 1) Phân bố 200 đơn: quá khứ / hiện tại / tương lai.
with r as (
  select id,row_number() over(order by don_hang) rn
  from public.steel_door_orders
)
update public.steel_door_orders o set
  ngay_dat=date '2026-07-20'+((r.rn-1)%22),
  ngay_giao=case
    when r.rn<=24 then date '2026-08-03'+((r.rn-1)%6)
    when r.rn<=80 then date '2026-08-09'+((r.rn-25)%7)
    when r.rn<=150 then date '2026-08-16'+((r.rn-81)%8)
    else date '2026-08-24'+((r.rn-151)%8) end,
  trang_thai=case
    when r.rn<=20 then 'Hoàn thành'
    when r.rn<=78 then 'Đang sản xuất'
    when r.rn<=160 then 'Đã lên kế hoạch'
    else 'Mới' end,
  ghi_chu='[DEMO-AUG26] '||case
    when r.rn in(31,67,103) then 'Ưu tiên - nguy cơ trễ giao'
    when r.rn in(42,84,126,142) then 'Thiếu vật tư'
    when r.rn in(55,95,145) then 'Quality Hold'
    when r.rn>160 then 'Nhu cầu tương lai chưa tạo LSX'
    else 'Kịch bản vận hành ERP tháng 08/2026' end
from r where o.id=r.id;

-- 2) Tạo cây LSX cho 160 đơn; 40 đơn còn lại để demo Order Pool chưa kế hoạch.
do $$
declare x record;
begin
 for x in
   select id from (
     select id,row_number() over(order by don_hang) rn
     from public.steel_door_orders
   ) q where rn<=160 order by rn
 loop
   perform public.create_production_order_tree(x.id);
 end loop;
end $$;

-- Trạng thái LSX cha.
with r as (
 select po.id,row_number() over(order by o.don_hang) rn
 from public.production_orders po
 join public.steel_door_orders o on o.id=po.order_id
 where po.level_no=1
)
update public.production_orders po set
 status=case when r.rn<=20 then 'COMPLETED'
             when r.rn<=78 then 'RUNNING'
             else 'RELEASED' end
from r where po.root_id=r.id;

-- Tạo lệch tiến độ Cánh/Khung/Phào để Set Ready/Bottleneck có dữ liệu.
with x as (
 select po.id,po.component_type,op.wo_code,
        dense_rank() over(order by o.don_hang) rn
 from public.production_orders po
 join public.steel_door_orders o on o.id=po.order_id
 left join public.production_operations op on op.id=po.operation_id
)
update public.production_orders po set
 status=case
   when x.rn<=20 then 'COMPLETED'
   when x.rn<=40 and x.component_type='CÁNH'
        and (x.wo_code is null or x.wo_code<='WO05') then 'COMPLETED'
   when x.rn<=40 and x.component_type='KHUNG'
        and x.wo_code in('WO06','WO07','WO08') then 'COMPLETED'
   when x.rn<=40 and x.component_type='PHÀO'
        and x.wo_code in('WO11','WO12') then 'COMPLETED'
   when x.rn<=60 and x.component_type='KHUNG'
        and (x.wo_code is null or x.wo_code<='WO10') then 'COMPLETED'
   when x.rn<=60 and x.component_type='CÁNH'
        and x.wo_code in('WO01','WO02','WO03','WO04') then 'COMPLETED'
   when x.rn<=60 and x.component_type='PHÀO'
        and x.wo_code in('WO11','WO12') then 'COMPLETED'
   when x.rn<=78 and x.component_type='PHÀO'
        and (x.wo_code is null or x.wo_code<='WO13') then 'COMPLETED'
   when x.rn<=78 and x.component_type='CÁNH'
        and x.wo_code in('WO01','WO02','WO03') then 'COMPLETED'
   when x.rn<=78 and x.component_type='KHUNG'
        and x.wo_code in('WO06','WO07','WO08','WO09') then 'COMPLETED'
   else po.status end
from x where po.id=x.id and po.level_no in(2,3);

-- 3) 12 lô phủ cả tháng.
insert into public.production_lots
(lot_no,lot_name,production_date,target_delivery_date,priority,status,note) values
('LOT-AUG-01','Đầu tháng - hoàn thành','2026-08-01','2026-08-06',10,'COMPLETED','Lịch sử'),
('LOT-AUG-02','Giao sớm / Carry Over','2026-08-03','2026-08-09',20,'RUNNING','Sát hạn'),
('LOT-AUG-03','Bottleneck Khung','2026-08-05','2026-08-11',30,'RUNNING','Khung chậm hơn Cánh'),
('LOT-AUG-04','Bottleneck Cánh','2026-08-06','2026-08-12',40,'RUNNING','Cánh chậm hơn Khung'),
('LOT-AUG-05','Bottleneck Phào','2026-08-07','2026-08-13',50,'RUNNING','Phào chậm'),
('LOT-AUG-06','Lô hôm nay','2026-08-09','2026-08-15',15,'RELEASED','Trọng tâm demo'),
('LOT-AUG-07','Tuần tới','2026-08-11','2026-08-18',60,'RELEASED','Future'),
('LOT-AUG-08','Giữa tháng','2026-08-14','2026-08-21',70,'RELEASED','Future'),
('LOT-AUG-09','Cuối tháng A','2026-08-18','2026-08-25',80,'DRAFT','Chưa release'),
('LOT-AUG-10','Cuối tháng B','2026-08-22','2026-08-28',90,'DRAFT','Chờ material'),
('LOT-AUG-11','Giao 30/08','2026-08-24','2026-08-30',35,'DRAFT','Priority'),
('LOT-AUG-12','Giao 31/08','2026-08-26','2026-08-31',100,'DRAFT','Future');

with o as (
 select id,row_number() over(order by don_hang) rn
 from public.steel_door_orders
 where id in(select order_id from public.production_orders where level_no=1)
)
insert into public.production_lot_items(lot_id,order_id,sequence_no)
select l.id,o.id,((o.rn-1)%20+1)*10
from o join public.production_lots l on l.lot_no=case
 when o.rn<=20 then 'LOT-AUG-01' when o.rn<=35 then 'LOT-AUG-02'
 when o.rn<=50 then 'LOT-AUG-03' when o.rn<=65 then 'LOT-AUG-04'
 when o.rn<=78 then 'LOT-AUG-05' when o.rn<=92 then 'LOT-AUG-06'
 when o.rn<=108 then 'LOT-AUG-07' when o.rn<=124 then 'LOT-AUG-08'
 when o.rn<=136 then 'LOT-AUG-09' when o.rn<=146 then 'LOT-AUG-10'
 when o.rn<=154 then 'LOT-AUG-11' else 'LOT-AUG-12' end
on conflict(order_id) do nothing;

-- 4) Material: READY/PARTIAL/SHORTAGE/HOLD.
with r as (
 select po.id root_id,po.order_id,row_number() over(order by o.don_hang) rn
 from public.production_orders po join public.steel_door_orders o on o.id=po.order_id
 where po.level_no=1
)
insert into public.production_material_readiness
(production_order_id,order_id,status,readiness_percent,shortage_note,confirmed_by,confirmed_at)
select root_id,order_id,
 case when rn in(42,84,126,142) then 'SHORTAGE'
      when rn in(55,95,145) then 'HOLD'
      when rn in(88,89,90,128,129) then 'PARTIAL' else 'READY' end,
 case when rn in(42,84,126,142) then 55 when rn in(55,95,145) then 75
      when rn in(88,89,90,128,129) then 85 else 100 end,
 case when rn in(42,84) then 'Thiếu thép tấm'
      when rn in(126,142) then 'Thiếu phụ kiện khóa'
      when rn in(55,95,145) then 'Chờ xác nhận kỹ thuật'
      when rn in(88,89,90,128,129) then 'Thiếu một phần phụ kiện' end,
 'Planner Demo','2026-08-09 07:30:00+07'
from r on conflict(production_order_id) do update set
 status=excluded.status,readiness_percent=excluded.readiness_percent,
 shortage_note=excluded.shortage_note,updated_at=now();

-- 5) Dispatch lịch sử 01-08/08 cho WO01-WO13.
do $$
declare d date; x record;
begin
 for d in select generate_series('2026-08-01'::date,'2026-08-08'::date,'1 day')::date loop
  for x in
   select o.id,o.wo_code,o.component_scope,
          round(c.capacity_per_day*c.efficiency_percent/100.0,0) cap
   from public.production_operations o
   join public.production_capacities c on c.operation_id=o.id
   where substring(o.wo_code,3,2)::int between 1 and 13
  loop
   insert into public.production_dispatch_headers
   (dispatch_date,operation_id,component_type,status,capacity_value,planned_quantity,released_at)
   values(d,x.id,x.component_scope,'RELEASED',x.cap,0,d::timestamptz+interval '7 hours')
   on conflict(dispatch_date,operation_id) do nothing;
  end loop;
 end loop;
end $$;

-- Gắn LSX vào Dispatch lịch sử, tối đa 8 LSX/header.
with c as (
 select h.id dispatch_id,po.id production_order_id,po.quantity,
 row_number() over(partition by h.id order by so.ngay_giao,so.don_hang) rn
 from public.production_dispatch_headers h
 join public.production_orders po on po.operation_id=h.operation_id and po.level_no=3
 join public.steel_door_orders so on so.id=po.order_id
 where h.dispatch_date between '2026-08-01' and '2026-08-08'
   and so.trang_thai in('Hoàn thành','Đang sản xuất')
)
insert into public.production_dispatch_items(dispatch_id,production_order_id,sequence_no,quantity)
select dispatch_id,production_order_id,rn*10,quantity from c where rn<=8 on conflict do nothing;

update public.production_dispatch_headers h set planned_quantity=q.qty
from(select dispatch_id,sum(quantity) qty from public.production_dispatch_items group by dispatch_id)q
where h.id=q.dispatch_id and h.dispatch_date between '2026-08-01' and '2026-08-08';

-- Good/NG lịch sử; 08/08 cố ý chưa xong vài dòng => Carry Over 09/08.
insert into public.production_reports(report_date,dispatch_item_id,production_order_id,good_qty,ng_qty)
select h.dispatch_date,di.id,di.production_order_id,
 case when h.dispatch_date='2026-08-08' and di.sequence_no%40=0 then greatest(0,di.quantity-2)
      when h.dispatch_date in('2026-08-05','2026-08-06') and di.sequence_no%50=0 then greatest(0,di.quantity-1)
      else di.quantity end,
 case when (extract(day from h.dispatch_date)::int+di.sequence_no/10)%7=0 then 1 else 0 end
from public.production_dispatch_headers h
join public.production_dispatch_items di on di.dispatch_id=h.id
where h.dispatch_date between '2026-08-01' and '2026-08-08'
on conflict(report_date,dispatch_item_id) do nothing;

-- 6) Hôm nay 09/08: Released + Draft cùng tồn tại theo WO.
insert into public.production_dispatch_headers
(dispatch_date,operation_id,component_type,status,capacity_value,planned_quantity,released_at)
select '2026-08-09',o.id,o.component_scope,
 case when o.wo_code in('WO01','WO02','WO06','WO07','WO11') then 'RELEASED' else 'DRAFT' end,
 round(c.capacity_per_day*c.efficiency_percent/100.0,0),0,
 case when o.wo_code in('WO01','WO02','WO06','WO07','WO11')
      then '2026-08-09 07:15:00+07'::timestamptz end
from public.production_operations o join public.production_capacities c on c.operation_id=o.id
where substring(o.wo_code,3,2)::int between 1 and 13
on conflict(dispatch_date,operation_id) do nothing;

with c as (
 select h.id dispatch_id,po.id production_order_id,po.quantity,
 row_number() over(partition by h.id order by so.ngay_giao,so.don_hang) rn
 from public.production_dispatch_headers h
 join public.production_orders po on po.operation_id=h.operation_id and po.level_no=3
 join public.steel_door_orders so on so.id=po.order_id
 where h.dispatch_date='2026-08-09' and so.trang_thai in('Đang sản xuất','Đã lên kế hoạch')
)
insert into public.production_dispatch_items(dispatch_id,production_order_id,sequence_no,quantity)
select dispatch_id,production_order_id,rn*10,quantity from c where rn<=10 on conflict do nothing;

update public.production_dispatch_headers h set planned_quantity=q.qty
from(select dispatch_id,sum(quantity) qty from public.production_dispatch_items group by dispatch_id)q
where h.id=q.dispatch_id and h.dispatch_date='2026-08-09';

insert into public.production_reports(report_date,dispatch_item_id,production_order_id,good_qty,ng_qty)
select '2026-08-09',di.id,di.production_order_id,
 greatest(0,round(di.quantity*0.65,0)),
 case when di.sequence_no%40=0 then 1 else 0 end
from public.production_dispatch_headers h join public.production_dispatch_items di on di.dispatch_id=h.id
where h.dispatch_date='2026-08-09' and h.status='RELEASED'
on conflict(report_date,dispatch_item_id) do nothing;

-- 7) Tương lai 10-31/08: Schedule Board finite-capacity.
-- Có ngày quá tải có chủ đích để Cảnh báo kế hoạch có dữ liệu.
do $$
declare d date;
begin
 for d in select generate_series('2026-08-10'::date,'2026-08-31'::date,'1 day')::date loop
  insert into public.production_dispatch_headers
  (dispatch_date,operation_id,component_type,status,capacity_value,planned_quantity)
  select d,o.id,o.component_scope,'DRAFT',
   round(c.capacity_per_day*c.efficiency_percent/100.0,0),
   case
    when d in('2026-08-12','2026-08-18') and o.wo_code in('WO03','WO08','WO14')
     then round(c.capacity_per_day*c.efficiency_percent/100.0,0)+15
    when extract(isodow from d) in(6,7)
     then round(c.capacity_per_day*c.efficiency_percent/100.0*0.55,0)
    else round(c.capacity_per_day*c.efficiency_percent/100.0*
         (0.72+(substring(o.wo_code,3,2)::int%4)*0.06),0) end
  from public.production_operations o join public.production_capacities c on c.operation_id=o.id
  on conflict(dispatch_date,operation_id) do nothing;
 end loop;
end $$;

-- 8) Quality: QC / DEFECT / REWORK / HOLD / RELEASE.
with r as (
 select po.id root_id,po.order_id,row_number() over(order by o.don_hang) rn
 from public.production_orders po join public.steel_door_orders o on o.id=po.order_id
 where po.level_no=1
),e as (
 select * from(values
 (12,'2026-08-03'::date,'QC','CLOSED',2::numeric,'Kích thước đạt','PASS'),
 (24,'2026-08-05'::date,'DEFECT','CLOSED',1::numeric,'Xước bề mặt','REWORKED'),
 (31,'2026-08-07'::date,'REWORK','OPEN',2::numeric,'Sửa mối hàn','REWORK'),
 (42,'2026-08-08'::date,'QC','OPEN',3::numeric,'Kiểm vật tư thay thế','WAIT'),
 (55,'2026-08-09'::date,'HOLD','OPEN',4::numeric,'Sai khác màu mẫu','HOLD'),
 (67,'2026-08-09'::date,'DEFECT','OPEN',2::numeric,'Cong nhẹ khung','REVIEW'),
 (72,'2026-08-09'::date,'REWORK','OPEN',3::numeric,'Sửa bề mặt trước sơn','REWORK'),
 (95,'2026-08-09'::date,'HOLD','OPEN',5::numeric,'Chờ xác nhận phụ kiện','HOLD'),
 (103,'2026-08-10'::date,'QC','OPEN',4::numeric,'QC trước sơn dự kiến','PLANNED'),
 (118,'2026-08-12'::date,'QC','OPEN',6::numeric,'First-piece inspection','PLANNED')
 )v(rn,event_date,event_type,status,quantity,reason,disposition)
)
insert into public.production_quality_events
(event_date,production_order_id,order_id,event_type,status,quantity,reason,disposition,created_by,closed_at)
select e.event_date,r.root_id,r.order_id,e.event_type,e.status,e.quantity,e.reason,e.disposition,'QC Demo',
 case when e.status='CLOSED' then e.event_date::timestamptz+interval '15 hours' end
from e join r on r.rn=e.rn;

update public.production_orders set is_blocked=true,blocked_reason='QUALITY HOLD - Demo 08/2026'
where root_id in(select production_order_id from public.production_quality_events where event_type='HOLD' and status='OPEN');

-- 9) Smart Planning: quá khứ, hôm nay, ngày mai, ngày overload.
insert into public.production_planning_runs(plan_date,status,total_recommendations,summary,created_at) values
('2026-08-07','APPROVED',8,'{"scenario":"historical"}','2026-08-07 07:00:00+07'),
('2026-08-08','APPROVED',10,'{"scenario":"carry_over"}','2026-08-08 07:00:00+07'),
('2026-08-09','DRAFT',14,'{"scenario":"today"}','2026-08-09 07:00:00+07'),
('2026-08-10','DRAFT',12,'{"scenario":"future"}','2026-08-09 08:00:00+07'),
('2026-08-12','DRAFT',12,'{"scenario":"overload"}','2026-08-09 08:05:00+07');

with runs as(
 select id,plan_date from public.production_planning_runs
 where plan_date in('2026-08-07','2026-08-08','2026-08-09','2026-08-10','2026-08-12')
),r as(
 select po.id root_id,po.order_id,o.ngay_giao,row_number() over(order by o.ngay_giao,o.don_hang) rn
 from public.production_orders po join public.steel_door_orders o on o.id=po.order_id where po.level_no=1
),lm as(select order_id,lot_id from public.production_lot_items)
insert into public.production_planning_recommendations
(run_id,production_order_id,order_id,lot_id,branch,operation_id,recommended_qty,score,reason,due_date,material_status,bottleneck_rank)
select ru.id,r.root_id,r.order_id,lm.lot_id,
 case when r.rn%4=1 then 'KHUNG' when r.rn%4=2 then 'CÁNH'
      when r.rn%4=3 then 'PHÀO' else 'ĐỦ BỘ' end,
 op.id,4+(r.rn%9),
 130-r.rn+case when r.ngay_giao<=ru.plan_date+2 then 35 else 0 end,
 case when r.ngay_giao<ru.plan_date then 'Trễ hạn + ưu tiên bottleneck'
      when r.rn%7=0 then 'Material chưa đủ'
      when r.rn%5=0 then 'Cân bằng Set Ready'
      else 'Ngày giao gần + Capacity + Priority' end,
 r.ngay_giao,coalesce(m.status,'READY'),1+(r.rn%4)
from runs ru join r on r.rn between 21 and 34
left join lm on lm.order_id=r.order_id
left join public.production_material_readiness m on m.production_order_id=r.root_id
join public.production_operations op on op.wo_code=case
 when r.rn%4=1 then 'WO08' when r.rn%4=2 then 'WO03'
 when r.rn%4=3 then 'WO13' else 'WO14' end;

select 'AUGUST_DEMO_READY' result,
 (select count(*) from public.steel_door_orders) orders,
 (select count(*) from public.production_lots where lot_no like 'LOT-AUG-%') lots,
 (select count(*) from public.production_orders where level_no=1) root_lsx,
 (select count(*) from public.production_dispatch_headers where dispatch_date between '2026-08-01' and '2026-08-31') dispatch_headers,
 (select count(*) from public.production_reports where report_date between '2026-08-01' and '2026-08-09') reports,
 (select count(*) from public.production_quality_events) quality_events;

commit;
