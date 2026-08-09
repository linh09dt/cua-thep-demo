"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
const steps=[
["Dashboard điều hành","KPI, cảnh báo và nút thắt của nhà máy.","/"],
["Đơn hàng","Nhu cầu khách hàng, đơn chưa LSX, đang chạy và hoàn thành.","/order-tracking"],
["Lệnh & Lô sản xuất","LSX cha/con/WO và cách gom đơn vào lô kế hoạch.","/production-lots"],
["Material Readiness","READY / PARTIAL / SHORTAGE / HOLD trước khi lập lịch.","/material-readiness"],
["Set Readiness","So sánh Cánh - Khung - Phào; Set Ready lấy theo nhánh thấp nhất.","/set-readiness"],
["Bottleneck","Xác định nhánh/công đoạn đang giữ tốc độ hoàn thành bộ cửa.","/bottleneck"],
["Smart Planning","Xếp hạng theo ngày giao, vật tư, bottleneck, capacity và priority.","/smart-planning"],
["Schedule & Dispatch","Finite-capacity rồi tạo/release Dispatch xuống xưởng.","/schedule-board"],
["Shop Floor & Báo cáo","Good/NG, Remain và Carry Over sang ngày kế tiếp.","/production-report"],
["Quality / Hold","QC, Defect, Rework và Hold block LSX tới khi release.","/quality"],
["Traceability","Order → Lot → LSX → WO → Dispatch → Report → Quality.","/traceability"],
["What-if Planning","Mô phỏng capacity, priority, material trước khi đổi kế hoạch thật.","/what-if-planning"],
] as const;
export default function DemoTour(){const[open,setOpen]=useState(false),[step,setStep]=useState(0);useEffect(()=>{if(localStorage.getItem("erp-demo-tour")==="open")setOpen(true)},[]);
function close(){setOpen(false);localStorage.removeItem("erp-demo-tour")}function start(){setStep(0);setOpen(true);localStorage.setItem("erp-demo-tour","open")}const s=steps[step];
return <><button onClick={start} className="demo-tour-launch">▶ DEMO</button>{open&&<div className="demo-tour-backdrop"><div className="demo-tour-card"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Guided ERP Demo</div><h2 className="mt-1 text-xl font-black">{step+1}. {s[0]}</h2></div><button onClick={close} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Đóng</button></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600" style={{width:`${((step+1)/steps.length)*100}%`}}/></div><p className="mt-4 min-h-[52px] text-sm leading-6 text-slate-600">{s[1]}</p><div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">Bước {step+1}/{steps.length} • Dùng dữ liệu tháng 08/2026 để kể câu chuyện nhu cầu → kế hoạch → xưởng → chất lượng.</div><div className="mt-5 flex flex-wrap justify-between gap-2"><button disabled={step===0} onClick={()=>setStep(v=>Math.max(0,v-1))} className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-30">← Quay lại</button><div className="flex gap-2"><Link href={s[2]} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Mở màn hình ↗</Link>{step<steps.length-1?<button onClick={()=>setStep(v=>v+1)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Tiếp tục →</button>:<button onClick={close} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Hoàn tất</button>}</div></div></div></div>}</>}
