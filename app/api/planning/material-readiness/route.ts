import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadPlanningIntelligence } from "@/lib/planning-intelligence";

export async function GET() {
  try {
    const data = await loadPlanningIntelligence();
    return NextResponse.json({ success: true, rows: data.roots, kpi: data.kpi });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Không thể tải Material Readiness." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productionOrderId = String(body?.productionOrderId ?? "");
    const status = String(body?.status ?? "READY");
    const readinessPercent = Number(body?.readinessPercent ?? 100);
    const shortageNote = String(body?.shortageNote ?? "").trim();
    const confirmedBy = String(body?.confirmedBy ?? "Planner").trim();

    if (!productionOrderId) {
      return NextResponse.json({ success: false, message: "Thiếu LSX Cha." }, { status: 400 });
    }

    if (!["READY", "PARTIAL", "SHORTAGE", "HOLD"].includes(status)) {
      return NextResponse.json({ success: false, message: "Trạng thái vật tư không hợp lệ." }, { status: 400 });
    }

    const { data: root, error: rootError } = await supabaseAdmin
      .from("production_orders")
      .select("id, order_id, level_no")
      .eq("id", productionOrderId)
      .single();

    if (rootError) throw rootError;
    if (root.level_no !== 1) throw new Error("Material Readiness chỉ cấu hình tại LSX Cha.");

    const { error } = await supabaseAdmin
      .from("production_material_readiness")
      .upsert(
        {
          production_order_id: productionOrderId,
          order_id: root.order_id,
          status,
          readiness_percent: Math.max(0, Math.min(100, readinessPercent)),
          shortage_note: shortageNote || null,
          confirmed_by: confirmedBy || null,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "production_order_id" }
      );

    if (error) throw error;

    const data = await loadPlanningIntelligence();
    return NextResponse.json({ success: true, rows: data.roots, kpi: data.kpi });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Không thể cập nhật Material Readiness." },
      { status: 500 }
    );
  }
}
