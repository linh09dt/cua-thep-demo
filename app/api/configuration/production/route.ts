import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type OperationPayload = {
  id?: string;
  woCode: string;
  operationCode: string;
  operationName: string;
  componentScope: string;
  stageType: "BRANCH" | "COMMON";
  isActive: boolean;
};

type SaveRoutingPayload = {
  routingId: string;
  operationIds: string[];
};

async function loadData() {
  const [
    operationsResult,
    routingsResult,
    stepsResult,
    wipResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("production_operations")
      .select("*")
      .order("wo_code", { ascending: true }),
    supabaseAdmin
      .from("production_routings")
      .select("*")
      .order("routing_id", { ascending: true }),
    supabaseAdmin
      .from("production_routing_steps")
      .select("*")
      .order("sequence_no", { ascending: true }),
    supabaseAdmin
      .from("production_wip_settings")
      .select("*"),
  ]);

  if (operationsResult.error) throw operationsResult.error;
  if (routingsResult.error) throw routingsResult.error;
  if (stepsResult.error) throw stepsResult.error;
  if (wipResult.error) throw wipResult.error;

  const operations = operationsResult.data ?? [];
  const steps = stepsResult.data ?? [];
  const wipRows = wipResult.data ?? [];

  const wipByOperation = new Map(
    wipRows.map((item) => [item.operation_id, item])
  );

  const routings = (routingsResult.data ?? []).map((routing) => ({
    routingId: routing.routing_id,
    routingName: routing.routing_name,
    componentType: routing.component_type,
    routingType: routing.routing_type,
    requiresFullSet: routing.requires_full_set,
    requiredComponents: routing.required_components ?? [],
    isActive: routing.is_active,
    steps: steps
      .filter((step) => step.routing_id === routing.routing_id)
      .map((step) => {
        const operation = operations.find(
          (item) => item.id === step.operation_id
        );

        return {
          id: step.id,
          sequenceNo: step.sequence_no,
          operationId: step.operation_id,
          woCode: operation?.wo_code ?? "",
          operationCode: operation?.operation_code ?? "",
          operationName: operation?.operation_name ?? "",
          componentScope: operation?.component_scope ?? "",
        };
      }),
  }));

  return {
    operations: operations.map((item) => ({
      id: item.id,
      woCode: item.wo_code,
      operationCode: item.operation_code,
      operationName: item.operation_name,
      componentScope: item.component_scope,
      stageType: item.stage_type,
      isActive: item.is_active,
    })),
    wipSettings: operations.map((item) => {
      const wip = wipByOperation.get(item.id);

      return {
        operationId: item.id,
        woCode: item.wo_code,
        operationName: item.operation_name,
        componentScope: item.component_scope,
        stageType: item.stage_type,
        wipMin: Number(wip?.wip_min ?? 0),
        wipTarget: Number(wip?.wip_target ?? 0),
        wipMax: Number(wip?.wip_max ?? 0),
        unitName: wip?.unit_name ?? "bộ",
        isActive: wip?.is_active ?? true,
        note: wip?.note ?? "",
      };
    }),
    routings,
  };
}

export async function GET() {
  try {
    const data = await loadData();

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Không thể tải cấu hình.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action ?? "");

    if (action === "save_operation") {
      const operation = body?.operation as OperationPayload;

      if (
        !operation?.woCode?.trim() ||
        !operation?.operationCode?.trim() ||
        !operation?.operationName?.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "WO, mã công đoạn và tên công đoạn là bắt buộc.",
          },
          { status: 400 }
        );
      }

      const payload = {
        wo_code: operation.woCode.trim().toUpperCase(),
        operation_code: operation.operationCode.trim().toUpperCase(),
        operation_name: operation.operationName.trim(),
        component_scope: operation.componentScope || "CHUNG",
        stage_type: operation.stageType || "BRANCH",
        is_active: operation.isActive ?? true,
        updated_at: new Date().toISOString(),
      };

      if (operation.id) {
        const { error } = await supabaseAdmin
          .from("production_operations")
          .update(payload)
          .eq("id", operation.id);

        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin
          .from("production_operations")
          .insert(payload);

        if (error) throw error;
      }
    } else if (action === "delete_operation") {
      const id = String(body?.id ?? "");

      if (!id) {
        return NextResponse.json(
          { success: false, message: "Thiếu ID công đoạn." },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("production_operations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } else if (action === "save_wip") {
      const operationId = String(body?.operationId ?? "");
      const wipMin = Number(body?.wipMin ?? 0);
      const wipTarget = Number(body?.wipTarget ?? 0);
      const wipMax = Number(body?.wipMax ?? 0);
      const unitName = String(body?.unitName ?? "bộ").trim() || "bộ";
      const isActive = body?.isActive !== false;
      const note = String(body?.note ?? "").trim();

      if (!operationId) {
        return NextResponse.json(
          { success: false, message: "Thiếu công đoạn/WO." },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(wipMin) ||
        !Number.isFinite(wipTarget) ||
        !Number.isFinite(wipMax) ||
        wipMin < 0 ||
        wipTarget < 0 ||
        wipMax < 0
      ) {
        return NextResponse.json(
          { success: false, message: "Giá trị WIP không hợp lệ." },
          { status: 400 }
        );
      }

      if (!(wipMin <= wipTarget && wipTarget <= wipMax)) {
        return NextResponse.json(
          {
            success: false,
            message: "WIP phải thỏa: Min ≤ Target ≤ Max.",
          },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("production_wip_settings")
        .upsert(
          {
            operation_id: operationId,
            wip_min: wipMin,
            wip_target: wipTarget,
            wip_max: wipMax,
            unit_name: unitName,
            is_active: Boolean(isActive),
            note: note || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "operation_id" }
        );

      if (error) throw error;
    } else if (action === "save_routing") {
      const routing = body as SaveRoutingPayload & { action: string };

      if (!routing.routingId) {
        return NextResponse.json(
          { success: false, message: "Thiếu Routing ID." },
          { status: 400 }
        );
      }

      const operationIds = Array.isArray(routing.operationIds)
        ? routing.operationIds.filter(Boolean)
        : [];

      const { error: deleteError } = await supabaseAdmin
        .from("production_routing_steps")
        .delete()
        .eq("routing_id", routing.routingId);

      if (deleteError) throw deleteError;

      if (operationIds.length > 0) {
        const rows = operationIds.map((operationId, index) => ({
          routing_id: routing.routingId,
          operation_id: operationId,
          sequence_no: (index + 1) * 10,
        }));

        const { error: insertError } = await supabaseAdmin
          .from("production_routing_steps")
          .insert(rows);

        if (insertError) throw insertError;
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Action không hợp lệ." },
        { status: 400 }
      );
    }

    const data = await loadData();

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Không thể lưu cấu hình.",
      },
      { status: 500 }
    );
  }
}
