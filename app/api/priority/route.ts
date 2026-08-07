import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PriorityRule = {
  level: number;
  fieldKey: string;
  direction: "ASC" | "DESC";
};

type PriorityPayload = {
  operationId: string;
  isActive: boolean;
  rules: PriorityRule[];
};

function mapRow(row: any) {
  return {
    operationId: row.operation_id,
    woCode: row.production_operations?.wo_code ?? "",
    operationCode: row.production_operations?.operation_code ?? "",
    operationName: row.production_operations?.operation_name ?? "",
    componentScope: row.production_operations?.component_scope ?? "",
    stageType: row.production_operations?.stage_type ?? "",
    isActive: row.is_active ?? true,
    rules: (row.production_priority_rules ?? [])
      .sort((a: any, b: any) => a.priority_level - b.priority_level)
      .map((rule: any) => ({
        id: rule.id,
        level: rule.priority_level,
        fieldKey: rule.field_key,
        direction: rule.direction,
      })),
  };
}

async function loadRows() {
  const { data, error } = await supabaseAdmin
    .from("production_priority_master")
    .select(`
      operation_id,
      is_active,
      production_operations (
        wo_code,
        operation_code,
        operation_name,
        component_scope,
        stage_type
      ),
      production_priority_rules (
        id,
        priority_level,
        field_key,
        direction
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
          error instanceof Error
            ? error.message
            : "Không thể tải Priority Master.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PriorityPayload;

    if (!body.operationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu WO/Công đoạn.",
        },
        { status: 400 }
      );
    }

    const cleanRules = (body.rules ?? [])
      .filter((rule) => rule.fieldKey)
      .slice(0, 5)
      .map((rule, index) => ({
        operation_id: body.operationId,
        priority_level: index + 1,
        field_key: rule.fieldKey,
        direction: rule.direction === "DESC" ? "DESC" : "ASC",
      }));

    const { error: masterError } = await supabaseAdmin
      .from("production_priority_master")
      .upsert(
        {
          operation_id: body.operationId,
          is_active: Boolean(body.isActive),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "operation_id" }
      );

    if (masterError) throw masterError;

    const { error: deleteError } = await supabaseAdmin
      .from("production_priority_rules")
      .delete()
      .eq("operation_id", body.operationId);

    if (deleteError) throw deleteError;

    if (cleanRules.length > 0) {
      const { error: rulesError } = await supabaseAdmin
        .from("production_priority_rules")
        .insert(cleanRules);

      if (rulesError) throw rulesError;
    }

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
          error instanceof Error
            ? error.message
            : "Không thể lưu Priority Master.",
      },
      { status: 500 }
    );
  }
}
