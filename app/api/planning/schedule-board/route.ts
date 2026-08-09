import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function woNo(value?: string | null) {
  const n = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get("start") || new Date().toISOString().slice(0, 10);
    const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const end = dates[6];

    const [opsResult, capsResult, dispatchResult] = await Promise.all([
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

    if (opsResult.error) throw opsResult.error;
    if (capsResult.error) throw capsResult.error;
    if (dispatchResult.error) throw dispatchResult.error;

    const capMap = new Map(
      (capsResult.data ?? [])
        .filter((x) => x.is_active)
        .map((x) => [
          x.operation_id,
          Math.round(Number(x.capacity_per_day || 0) * (Number(x.efficiency_percent || 100) / 100)),
        ])
    );

    const planMap = new Map<string, number>();
    for (const row of dispatchResult.data ?? []) {
      const key = `${row.operation_id}|${String(row.dispatch_date).slice(0, 10)}`;
      planMap.set(key, (planMap.get(key) ?? 0) + Number(row.planned_quantity || 0));
    }

    const rows = (opsResult.data ?? [])
      .map((op) => {
        const capacity = capMap.get(op.id) ?? 0;
        return {
          operationId: op.id,
          woCode: op.wo_code,
          operationName: op.operation_name,
          capacity,
          days: dates.map((date) => {
            const planned = planMap.get(`${op.id}|${date}`) ?? 0;
            return {
              date,
              planned,
              capacity,
              remaining: Math.max(0, capacity - planned),
              overload: Math.max(0, planned - capacity),
              loadPercent: capacity > 0 ? Math.round((planned / capacity) * 100) : 0,
            };
          }),
        };
      })
      .filter((x) => x.capacity > 0)
      .sort((a, b) => woNo(a.woCode) - woNo(b.woCode));

    return NextResponse.json({ success: true, start, dates, rows });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Không thể tải Schedule Board." },
      { status: 500 }
    );
  }
}
