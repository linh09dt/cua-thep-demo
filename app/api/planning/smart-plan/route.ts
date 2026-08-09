import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadPlanningIntelligence } from "@/lib/planning-intelligence";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || undefined;
    const data = await loadPlanningIntelligence(date);
    return NextResponse.json({
      success: true,
      planDate: data.planDate,
      recommendations: data.smartRecommendations,
      kpi: data.kpi,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Không thể tạo đề xuất kế hoạch." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const planDate = String(body?.planDate ?? new Date().toISOString().slice(0, 10));
    const data = await loadPlanningIntelligence(planDate);
    const recommendations = data.smartRecommendations.slice(0, 200);

    const { data: run, error: runError } = await supabaseAdmin
      .from("production_planning_runs")
      .insert({
        plan_date: planDate,
        status: "DRAFT",
        total_recommendations: recommendations.length,
        summary: {
          kpi: data.kpi,
          topBottleneckLots: data.lots
            .filter((x) => x.setGap > 0)
            .sort((a, b) => b.setGap - a.setGap)
            .slice(0, 10),
        },
      })
      .select("id")
      .single();

    if (runError) throw runError;

    if (recommendations.length > 0) {
      const { error: recError } = await supabaseAdmin
        .from("production_planning_recommendations")
        .insert(
          recommendations.map((x, index) => ({
            run_id: run.id,
            production_order_id: x.rootId,
            order_id: x.orderId,
            lot_id: x.lotId,
            branch: x.branch,
            operation_id: x.operationId,
            recommended_qty: x.recommendedQty,
            score: x.score,
            reason: x.reason,
            due_date: x.dueDate || null,
            material_status: x.materialStatus,
            bottleneck_rank: index + 1,
          }))
        );
      if (recError) throw recError;
    }

    return NextResponse.json({
      success: true,
      runId: run.id,
      planDate,
      recommendations,
      kpi: data.kpi,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Không thể lưu Smart Plan." },
      { status: 500 }
    );
  }
}
