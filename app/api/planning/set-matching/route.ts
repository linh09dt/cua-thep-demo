import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadPlanningIntelligence } from "@/lib/planning-intelligence";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || undefined;
    const intel = await loadPlanningIntelligence(date);
    const orderIds = intel.roots.map(x=>x.orderId);
    const { data: orders, error } = orderIds.length ? await supabaseAdmin.from("steel_door_orders").select("id,don_hang,model,mau,cao,rong,huong_mo,khoa,khuon,o_thoang,loai_pk").in("id",orderIds) : {data:[],error:null};
    if (error) throw error;
    const orderMap = new Map((orders??[]).map(x=>[x.id,x]));
    const rows = intel.roots.map(root => {
      const o = orderMap.get(root.orderId);
      const critical = [o?.model,o?.mau,o?.cao,o?.rong,o?.huong_mo,o?.khoa];
      const missing = ["Model","Màu","Cao","Rộng","Hướng mở","Khóa"].filter((_,i)=>!critical[i]);
      const matchKey = [root.orderNo,o?.model,`${o?.rong??"?"}x${o?.cao??"?"}`,o?.mau,o?.huong_mo,o?.khoa].join(" | ");
      const matchedQty = missing.length || root.qualityHold ? 0 : Math.min(root.canhReady,root.khungReady,root.phaoReady);
      const status = root.qualityHold ? "HOLD" : missing.length ? "MISSING_ATTR" : matchedQty>=root.quantity ? "FULL_MATCH" : matchedQty>0 ? "PARTIAL_MATCH" : "NOT_READY";
      const mismatch = root.qualityHold ? "Quality Hold" : missing.length ? `Thiếu thuộc tính: ${missing.join(", ")}` : root.canhReady===root.khungReady && root.khungReady===root.phaoReady ? "-" : `Lệch Cánh ${root.canhReady} / Khung ${root.khungReady} / Phào ${root.phaoReady}`;
      return {...root,opening:o?.huong_mo??"",lock:o?.khoa??"",frame:o?.khuon??"",vent:o?.o_thoang??"",hardware:o?.loai_pk??"",matchKey,matchedQty,unmatchedQty:Math.max(0,root.quantity-matchedQty),matchStatus:status,mismatchReason:mismatch,missingAttributes:missing};
    });
    return NextResponse.json({success:true,date:intel.planDate,rows,kpi:{full:rows.filter(x=>x.matchStatus==="FULL_MATCH").length,partial:rows.filter(x=>x.matchStatus==="PARTIAL_MATCH").length,notReady:rows.filter(x=>x.matchStatus==="NOT_READY").length,hold:rows.filter(x=>x.matchStatus==="HOLD").length,missing:rows.filter(x=>x.matchStatus==="MISSING_ATTR").length,matchedQty:rows.reduce((s,x)=>s+x.matchedQty,0),unmatchedQty:rows.reduce((s,x)=>s+x.unmatchedQty,0)}});
  } catch (error) {
    return NextResponse.json({success:false,message:error instanceof Error?error.message:"Không tải được Set Matching."},{status:500});
  }
}
