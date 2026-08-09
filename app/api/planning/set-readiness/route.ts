import { NextResponse } from "next/server";
import { loadPlanningIntelligence } from "@/lib/planning-intelligence";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || undefined;
    const data = await loadPlanningIntelligence(date);
    return NextResponse.json({
      success: true,
      planDate: data.planDate,
      rows: data.roots,
      lots: data.lots,
      kpi: data.kpi,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Không thể tính Set Readiness." },
      { status: 500 }
    );
  }
}
