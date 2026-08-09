import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadMaterialRequirements, recalculateMaterialReadiness } from "@/lib/material-requirements";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || undefined;
    return NextResponse.json({ success: true, ...(await loadMaterialRequirements(date)) });
  } catch (error) {
    return NextResponse.json({ success:false, message:error instanceof Error?error.message:"Không tải được nhu cầu vật tư." },{status:500});
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action ?? "");
    if (action === "update_inventory") {
      const materialId = String(body?.materialId ?? "");
      const onHand = Number(body?.onHand ?? 0);
      const reserved = Number(body?.reserved ?? 0);
      if (!materialId || onHand < 0 || reserved < 0) throw new Error("Dữ liệu tồn kho không hợp lệ.");
      const { error } = await supabaseAdmin.from("material_inventory").upsert({material_id:materialId,on_hand_qty:onHand,reserved_qty:reserved,updated_at:new Date().toISOString()},{onConflict:"material_id"});
      if (error) throw error;
      return NextResponse.json({success:true,message:"Đã cập nhật tồn kho.",...(await loadMaterialRequirements())});
    }
    if (action === "recalculate") {
      const result = await recalculateMaterialReadiness();
      return NextResponse.json({success:true,message:`Đã tính lại Material Readiness cho ${result.updated} LSX.`,...(await loadMaterialRequirements())});
    }
    return NextResponse.json({success:false,message:"Action không hợp lệ."},{status:400});
  } catch (error) {
    return NextResponse.json({success:false,message:error instanceof Error?error.message:"Không thể cập nhật vật tư."},{status:500});
  }
}
