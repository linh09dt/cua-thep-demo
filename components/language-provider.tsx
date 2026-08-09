"use client";
import React,{createContext,useCallback,useContext,useEffect,useMemo,useState}from"react";
export type AppLanguage="vi"|"en";
type Ctx={language:AppLanguage;setLanguage:(v:AppLanguage)=>void;toggleLanguage:()=>void};
const LanguageContext=createContext<Ctx|null>(null);

const exact:Record<string,string>={
  "TỔNG QUAN":"OVERVIEW","TRỢ GIÚP":"HELP","ĐƠN HÀNG":"ORDERS","KẾ HOẠCH SẢN XUẤT":"PRODUCTION PLANNING",
  "THỰC THI VÀ BÁO CÁO":"EXECUTION & REPORTING","CẤU HÌNH":"CONFIGURATION","Dashboard điều hành":"Executive Dashboard","Lập kế hoạch từng bước":"Step-by-step Planning",
  "Cảnh báo kế hoạch":"Planning Alerts","Kế hoạch 7 ngày":"7-day Plan","KPI quản lý":"Management KPI","Việc cần xử lý":"Action Center",
  "Rủi ro giao hàng":"Delivery Risk","Họp sản xuất đầu ca":"Daily Production Meeting","So sánh phương án":"Scenario Comparison","Logic vận hành ERP":"ERP Operating Logic",
  "Kịch bản demo":"Demo Scenario","Truy xuất sản xuất":"Production Traceability","Tạo đơn hàng":"Create Order","Theo dõi Đơn Hàng":"Order Tracking",
  "Lệnh sản xuất":"Production Orders","Lô sản xuất":"Production Lots","Sẵn sàng vật tư":"Material Readiness","Sẵn sàng đủ bộ":"Set Readiness",
  "Phân tích nút thắt":"Bottleneck Analysis","Kế hoạch thông minh":"Smart Planning","Bảng lịch sản xuất":"Production Schedule Board","Điều độ sản xuất":"Production Dispatch",
  "Màn hình xưởng":"Shop Floor","Chất lượng / Hold":"Quality / Hold","Báo cáo sản xuất":"Production Report","Sẵn sàng giao hàng":"Shipping Readiness",
  "Tổn thất sản xuất":"Production Loss","Năng lực công đoạn":"Operation Capacity","Priority theo WO":"WO Priority","Danh mục":"Catalogs",
  "Cấu hình sản xuất":"Production Configuration","NHÀ MÁY":"PLANT","Cửa thép - Demo Plant":"Steel Door - Demo Plant","Hệ thống hoạt động":"System operational",
  "Hệ thống online":"System online","Quản lý & kế hoạch sản xuất":"Production Management & Planning","Kế hoạch sản xuất":"Production Planning","ERP / Quản lý sản xuất":"ERP / Production Management",
  "ERP Sản xuất":"Production ERP","Mở menu":"Open menu","Đóng menu":"Close menu","Hôm nay":"Today",
  "Hôm qua":"Yesterday","Ngày mai":"Tomorrow","Tất cả":"All","Tìm kiếm":"Search",
  "Làm mới":"Refresh","Lưu":"Save","Hủy":"Cancel","Đóng":"Close",
  "Xóa":"Delete","Sửa":"Edit","Thêm":"Add","Tạo mới":"Create",
  "Xác nhận":"Confirm","Áp dụng":"Apply","Quay lại":"Back","Tiếp tục":"Continue",
  "Hoàn tất":"Complete","Chi tiết":"Details","Trạng thái":"Status","Ngày":"Date",
  "Số lượng":"Quantity","Ghi chú":"Note","Màu":"Color","Model":"Model",
  "Đại lý":"Dealer","Ngày giao":"Delivery date","Ngày đặt":"Order date","Đơn hàng":"Order",
  "Công đoạn":"Operation","Năng lực":"Capacity","Ưu tiên":"Priority","Nhánh":"Branch",
  "Vật tư":"Material","Chất lượng":"Quality","Kế hoạch":"Plan","Thực tế":"Actual",
  "Còn lại":"Remaining","Tổng":"Total","Đã hoàn thành":"Completed","Đang sản xuất":"In Production",
  "Đã lên kế hoạch":"Planned","Mới":"New","Hoàn thành":"Completed","Đã phát hành":"Released",
  "Nháp":"Draft","Thiếu vật tư":"Material Shortage","Sẵn sàng":"Ready","Đang chờ":"Waiting",
  "Quá tải":"Overload","Nút thắt":"Bottleneck","Cảnh báo":"Alert","Rủi ro":"Risk",
  "Trễ hạn":"Late","Đúng hạn":"On Track","Bị chặn":"Blocked","Không có dữ liệu":"No data",
  "Đang tải...":"Loading...","Đang tải":"Loading","Không có":"None","Chưa có":"Not available",
  "Chưa xác nhận":"Not confirmed","Không giới hạn":"Unlimited","Cánh":"Door Leaf","Khung":"Frame",
  "Phào":"Trim","Đủ bộ":"Complete Set","Bộ cửa":"Door Set","Sơn":"Painting",
  "Đóng gói":"Packing","Kho thành phẩm":"Finished Goods Warehouse","Giao hàng":"Shipping","Sản xuất":"Production",
  "Điều độ":"Dispatch","Báo cáo":"Report","Cấu hình":"Configuration","Bắt đầu demo":"Start Demo",
  "Mở màn hình ↗":"Open screen ↗","Dùng dữ liệu tháng 08/2026 để kể câu chuyện nhu cầu → kế hoạch → xưởng → chất lượng.":"Use August 2026 demo data to tell the story from demand → planning → shop floor → quality.","Guided ERP Demo":"Guided ERP Demo","Không ghi database, không Release Dispatch.":"Does not write to the database or Release Dispatch.",
  "Chỉ là simulation, không thay đổi dữ liệu thật.":"Simulation only; real data is not changed.","Mô phỏng trước khi đổi kế hoạch thật.":"Simulate before changing the real plan.","Tổng hợp tình hình sản xuất theo thời gian thực":"Real-time production overview","ERP phát hiện các điểm cần priority":"ERP detects items requiring priority",
  "Xem tất cả →":"View all →","Mở Smart Planning →":"Open Smart Planning →","Tổng số lượng (Bộ)":"Total quantity (Sets)","Tổng nhu cầu production":"Total production demand",
  "Mới / Chưa LSX":"New / No Production Order","Tổng đơn trong hệ thống":"Total orders in the system","Cơ cấu tình trạng đơn hàng":"Order status breakdown","Số LSX con đang chạy và đã hoàn thành theo nhánh":"Running and completed child production orders by branch",
  "NÚT THẮT HÔM NAY":"TODAY'S BOTTLENECK","CAPACITY HIỆU DỤNG":"EFFECTIVE CAPACITY","ĐÃ ĐIỀU ĐỘ":"DISPATCHED","Cần xử lý":"Action required",
  "CẦN XỬ LÝ":"ACTION REQUIRED","ngày":"days","bộ":"sets","Bộ":"Sets",
  "Đơn":"Orders","đơn":"orders","Hiệu dụng":"Effective","Đã điều độ":"Dispatched",
  "Hàn Cánh":"Door Leaf Welding","Hàn Khung":"Frame Welding","Hàn Phào":"Trim Welding","Laser Cánh":"Door Leaf Laser Cutting",
  "Laser Khung":"Frame Laser Cutting","Laser Phào":"Trim Laser Cutting","Chấn Cánh":"Door Leaf Bending","Chấn Khung":"Frame Bending",
  "Chấn Phào":"Trim Bending","Ép Cánh":"Door Leaf Pressing","Vệ sinh trước sơn":"Pre-paint Cleaning","Dán vân":"Wood-grain Lamination",
  "Lắp ráp / Đóng gói":"Assembly / Packing","Nhập kho":"Warehouse Receipt","Xuất kho":"Shipping","Không có lô trễ hạn":"No late lots",
  "Không có đơn trễ hạn":"No late orders","Sẵn sàng WO14":"Ready for WO14","Đơn đã hoàn thành":"Completed orders","Tổng đơn":"Total orders",
  "Tổng số lượng":"Total quantity","Chưa LSX":"No Production Order","Đang chạy":"Running","Capacity hiệu dụng":"Effective capacity",
  "Mức tải":"Load","Khách hàng":"Customer","Số đơn hàng":"Order number","Số đơn":"Orders",
  "Ngày hoàn thành":"Completion date","Ngày báo cáo":"Report date","Ngày điều độ":"Dispatch date","Ngày kế hoạch":"Plan date",
  "Ngày sản xuất":"Production date","Ngày giao hàng":"Delivery date","Chưa xử lý":"Pending","Đã xử lý":"Resolved",
  "Đang xử lý":"In progress","Cần ưu tiên":"Priority required","Ưu tiên xử lý":"Prioritize","Không có cảnh báo":"No alerts",
  "Không có cảnh báo kế hoạch":"No planning alerts","Chưa có LSX":"No production order","Đã có LSX":"Production order created","Chưa tạo LSX":"Production order not created",
  "Đã tạo LSX":"Production order created","Chưa tạo Draft":"Draft not created","Đã Release":"Released","Chưa Release":"Not released",
  "Thiếu WIP":"Low WIP","Vượt WIP":"WIP above maximum","Trong giới hạn":"Within limits","Luồng đủ bộ":"Complete-set flow",
  "Nhánh riêng":"Independent branch","Điểm hội tụ":"Merge point","Đủ điều kiện":"Eligible","Không đủ điều kiện":"Not eligible",
  "Đã báo cáo":"Reported","Chưa báo cáo":"Not reported","Còn dư":"Remaining","Chuyển ngày sau":"Carry over to next day",
  "Carry Over ngày trước":"Previous-day carry over","Chưa hoàn tất":"Incomplete","Hoàn tất hôm nay":"Completed today","Tiến độ tổng thể":"Overall progress",
  "Tiến độ sản xuất":"Production progress","Tải Capacity theo WO hôm nay":"Today's capacity load by WO","Nhu cầu theo ngày giao (10 ngày tới)":"Demand by delivery date (next 10 days)","Đơn hàng cần chú ý":"Orders requiring attention"
};
const rules:[RegExp,string][]=[
[/trễ hạn/gi,"late"],[/cần xử lý/gi,"action required"],[/chưa LSX/gi,"no production order"],
[/tổng hợp tình hình/gi,"overview"],[/theo thời gian thực/gi,"in real time"],
[/cơ cấu tình trạng/gi,"status breakdown"],[/số LSX con/gi,"child production orders"],
[/đã hoàn thành/gi,"completed"],[/theo nhánh/gi,"by branch"],[/hiệu dụng/gi,"effective"],
[/đã điều độ/gi,"dispatched"],[/đại lý/gi,"dealer"],[/khách hàng/gi,"customer"],
[/xem tất cả/gi,"view all"],[/mở Smart Planning/gi,"open Smart Planning"],
[/tổng nhu cầu/gi,"total demand"],[/tổng đơn/gi,"total orders"],[/số đơn/gi,"orders"],
[/mới\s*\/\s*chưa/gi,"new / not yet"],[/cần ưu tiên/gi,"priority required"],
[/hàn cánh/gi,"door leaf welding"],[/hàn khung/gi,"frame welding"],[/hàn phào/gi,"trim welding"],
[/laser cánh/gi,"door leaf laser cutting"],[/laser khung/gi,"frame laser cutting"],[/laser phào/gi,"trim laser cutting"],
[/chấn cánh/gi,"door leaf bending"],[/chấn khung/gi,"frame bending"],[/chấn phào/gi,"trim bending"],
[/ép cánh/gi,"door leaf pressing"],[/đủ bộ/gi,"complete set"],[/cánh/gi,"door leaf"],
[/khung/gi,"frame"],[/phào/gi,"trim"],[/bộ\b/gi,"sets"],[/ngày\b/gi,"days"],[/đơn\b/gi,"orders"],

[/Không tải được/gi,"Unable to load"],[/Không thể tải/gi,"Unable to load"],[/Không thể/gi,"Unable to"],[/Không có dữ liệu/gi,"No data"],[/Chưa có dữ liệu/gi,"No data yet"],[/Chưa tạo/gi,"Not created"],[/Chưa vào lô/gi,"Not assigned to lot"],[/Chưa hoàn thành/gi,"Not completed"],[/đơn hàng/gi,"orders"],[/Đơn hàng/g,"Orders"],[/lệnh sản xuất/gi,"production orders"],[/Lệnh sản xuất/g,"Production Orders"],[/lô sản xuất/gi,"production lots"],[/Lô sản xuất/g,"Production Lots"],[/ngày giao/gi,"delivery date"],[/Ngày giao/g,"Delivery Date"],[/ngày sản xuất/gi,"production date"],[/Ngày sản xuất/g,"Production Date"],[/kế hoạch/gi,"plan"],[/Kế hoạch/g,"Plan"],[/sản xuất/gi,"production"],[/Sản xuất/g,"Production"],[/công đoạn/gi,"operation"],[/Công đoạn/g,"Operation"],[/năng lực/gi,"capacity"],[/Năng lực/g,"Capacity"],[/vật tư/gi,"material"],[/Vật tư/g,"Material"],[/chất lượng/gi,"quality"],[/Chất lượng/g,"Quality"],[/điều độ/gi,"dispatch"],[/Điều độ/g,"Dispatch"],[/báo cáo/gi,"report"],[/Báo cáo/g,"Report"],[/sẵn sàng/gi,"ready"],[/Sẵn sàng/g,"Ready"],[/cảnh báo/gi,"alert"],[/Cảnh báo/g,"Alert"],[/rủi ro/gi,"risk"],[/Rủi ro/g,"Risk"],[/trễ/gi,"late"],[/Trễ/g,"Late"],[/quá tải/gi,"overload"],[/Quá tải/g,"Overload"],[/nút thắt/gi,"bottleneck"],[/Nút thắt/g,"Bottleneck"],[/số lượng/gi,"quantity"],[/Số lượng/g,"Quantity"],[/trạng thái/gi,"status"],[/Trạng thái/g,"Status"],[/ưu tiên/gi,"priority"],[/Ưu tiên/g,"Priority"],[/còn lại/gi,"remaining"],[/Còn lại/g,"Remaining"],[/hoàn thành/gi,"completed"],[/Hoàn thành/g,"Completed"],[/đang chạy/gi,"running"],[/Đang chạy/g,"Running"],[/đang chờ/gi,"waiting"],[/Đang chờ/g,"Waiting"],[/thiếu/gi,"shortage"],[/Thiếu/g,"Shortage"],[/hôm nay/gi,"today"],[/Hôm nay/g,"Today"],[/hôm qua/gi,"yesterday"],[/Hôm qua/g,"Yesterday"],[/ngày mai/gi,"tomorrow"],[/Ngày mai/g,"Tomorrow"],[/theo lô/gi,"by lot"],[/theo ngày/gi,"by date"],[/theo WO/gi,"by WO"],[/theo nhánh/gi,"by branch"],[/Tổng số/gi,"Total"],[/Tổng/gi,"Total"],[/Xem chi tiết/gi,"View details"],[/Mở màn hình/gi,"Open screen"],[/Tìm/gi,"Search"],[/Làm mới/gi,"Refresh"],[/Cập nhật/gi,"Update"],[/Thêm mới/gi,"Add new"],[/Tạo/gi,"Create"],[/Xóa/gi,"Delete"],[/Lưu/gi,"Save"],[/Hủy/gi,"Cancel"]
];
function toEnglish(input:string){const lead=input.match(/^\s*/)?.[0]||"",trail=input.match(/\s*$/)?.[0]||"",core=input.trim();if(!core)return input;if(exact[core])return lead+exact[core]+trail;let out=core;for(const[r,v]of rules)out=out.replace(r,v);return lead+out+trail}
const originalText=new WeakMap<Text,string>(),originalAttrs=new WeakMap<Element,Map<string,string>>();
function translateRoot(root:ParentNode,lang:AppLanguage){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n:Node|null;while((n=walker.nextNode())){const t=n as Text;if(!t.parentElement||["SCRIPT","STYLE","CODE","PRE"].includes(t.parentElement.tagName))continue;if(!originalText.has(t))originalText.set(t,t.data);const base=originalText.get(t)!;const next=lang==="en"?toEnglish(base):base;if(t.data!==next)t.data=next}const els=root.querySelectorAll?.("[placeholder],[title],[aria-label]")||[];els.forEach(el=>{let m=originalAttrs.get(el);if(!m){m=new Map;originalAttrs.set(el,m)};["placeholder","title","aria-label"].forEach(a=>{const cur=el.getAttribute(a);if(cur!==null&&!m!.has(a))m!.set(a,cur);const base=m!.get(a);if(base!==undefined)el.setAttribute(a,lang==="en"?toEnglish(base):base)})})}
export function LanguageProvider({children}:{children:React.ReactNode}){const[language,setState]=useState<AppLanguage>("vi");useEffect(()=>{const saved=localStorage.getItem("steel-erp-language") as AppLanguage|null;if(saved==="en"||saved==="vi")setState(saved)},[]);useEffect(()=>{document.documentElement.lang=language;translateRoot(document.body,language);const ob=new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData"&&m.target.parentNode)translateRoot(m.target.parentNode,language);m.addedNodes.forEach(n=>{if(n.nodeType===1)translateRoot(n as Element,language);else if(n.nodeType===3&&n.parentNode)translateRoot(n.parentNode,language)})}});ob.observe(document.body,{subtree:true,childList:true,characterData:true});return()=>ob.disconnect()},[language]);const setLanguage=useCallback((v:AppLanguage)=>{localStorage.setItem("steel-erp-language",v);setState(v)},[]);const toggleLanguage=useCallback(()=>setLanguage(language==="vi"?"en":"vi"),[language,setLanguage]);const value=useMemo(()=>({language,setLanguage,toggleLanguage}),[language,setLanguage,toggleLanguage]);return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>}
export function useLanguage(){const c=useContext(LanguageContext);if(!c)throw new Error("useLanguage must be used inside LanguageProvider");return c}
