import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CapacityPayload = {
  id: string;
  operationId: string;
  capacityPerDay: number;
  unitName: string;
  shiftsPerDay: number;
  hoursPerShift: number;
  efficiencyPercent: number;
  isActive: boolean;
};

function mapRow(row: any) {
  return {
    id: row.id,
    operationId: row.operation_id,
    woCode: row.production_operations?.wo_code ?? "",
    operationCode: row.production_operations?.operation_code ?? "",
    operationName: row.production_operations?.operation_name ?? "",
    componentScope: row.production_operations?.component_scope ?? "",
    stageType: row.production_operations?.stage_type ?? "",
    capacityPerDay: Number(row.capacity_per_day ?? 0),
    unitName: row.unit_name ?? "bộ/ngày",
    shiftsPerDay: Number(row.shifts_per_day ?? 1),
    hoursPerShift: Number(row.hours_per_shift ?? 8),
    efficiencyPercent: Number(row.efficiency_percent ?? 100),
    isActive: Boolean(row.is_active),
  };
}

async function loadRows() {
  const { data, error } = await supabaseAdmin
    .from("production_capacities")
    .select(`
      *,
      production_operations (
        wo_code,
        operation_code,
        operation_name,
        component_scope,
        stage_type
      )
    `);

  if (error) throw error;

  return (data ?? [])
    .map(mapRow)
    .sort((a, b) =>
      a.woCode.localeCompare(b.woCode, undefined, { numeric: true })
    );
}

export async function GET() {
  try {
    const rows = await loadRows();

    return NextResponse.json({
      success: true,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Không thể tải năng lực.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const row = body?.row as CapacityPayload;

    if (!row?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu ID năng lực công đoạn.",
        },
        { status: 400 }
      );
    }

    if (
      Number(row.capacityPerDay) < 0 ||
      Number(row.shiftsPerDay) <= 0 ||
      Number(row.hoursPerShift) <= 0 ||
      Number(row.efficiencyPercent) < 0 ||
      Number(row.efficiencyPercent) > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Thông số năng lực không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("production_capacities")
      .update({
        capacity_per_day: Number(row.capacityPerDay),
        unit_name: row.unitName?.trim() || "bộ/ngày",
        shifts_per_day: Number(row.shiftsPerDay),
        hours_per_shift: Number(row.hoursPerShift),
        efficiency_percent: Number(row.efficiencyPercent),
        is_active: Boolean(row.isActive),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (error) throw error;

    const rows = await loadRows();

    return NextResponse.json({
      success: true,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Không thể lưu năng lực.",
      },
      { status: 500 }
    );
  }
}
