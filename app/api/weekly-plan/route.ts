import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function numericWo(value?: string | null) {
  const n = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const start =
      url.searchParams.get("start") ||
      new Date().toISOString().slice(0, 10);
    const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const end = dates[6];

    const [operationsResult, capacitiesResult, headersResult] =
      await Promise.all([
        supabaseAdmin
          .from("production_operations")
          .select("id, wo_code, operation_name, component_scope")
          .eq("is_active", true),
        supabaseAdmin
          .from("production_capacities")
          .select("operation_id, capacity_per_day, efficiency_percent, is_active"),
        supabaseAdmin
          .from("production_dispatch_headers")
          .select("operation_id, dispatch_date, status, planned_quantity")
          .gte("dispatch_date", start)
          .lte("dispatch_date", end)
          .neq("status", "CANCELLED"),
      ]);

    if (operationsResult.error) throw operationsResult.error;
    if (capacitiesResult.error) throw capacitiesResult.error;
    if (headersResult.error) throw headersResult.error;

    const capMap = new Map<string, number>(
      (capacitiesResult.data ?? [])
        .filter((x: any) => x.is_active)
        .map((x: any) => [
          x.operation_id,
          Math.round(
            Number(x.capacity_per_day || 0) *
              (Number(x.efficiency_percent || 100) / 100)
          ),
        ])
    );

    const planMap = new Map<string, number>();
    for (const h of headersResult.data ?? []) {
      const key = `${h.operation_id}|${h.dispatch_date}`;
      planMap.set(key, (planMap.get(key) ?? 0) + Number(h.planned_quantity || 0));
    }

    const rows = (operationsResult.data ?? [])
      .map((op: any) => {
        const capacity = capMap.get(op.id) ?? 0;
        return {
          operationId: op.id,
          woCode: op.wo_code,
          operationName: op.operation_name,
          componentScope: op.component_scope,
          capacity,
          days: dates.map((date) => {
            const planned = planMap.get(`${op.id}|${date}`) ?? 0;
            const loadPercent =
              capacity > 0 ? Math.round((planned / capacity) * 100) : 0;
            return { date, planned, capacity, loadPercent };
          }),
        };
      })
      .filter((row: any) => row.capacity > 0)
      .sort((a: any, b: any) => numericWo(a.woCode) - numericWo(b.woCode));

    return NextResponse.json({
      success: true,
      start,
      dates,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể tải kế hoạch 7 ngày.",
      },
      { status: 500 }
    );
  }
}
