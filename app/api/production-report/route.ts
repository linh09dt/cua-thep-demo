import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Branch = "CÁNH" | "KHUNG" | "PHÀO" | "ĐỦ BỘ";

function numericWo(woCode: string) {
  const value = Number(String(woCode).replace(/\D/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function getBranch(woCode: string): Branch | null {
  const no = numericWo(woCode);

  if (no >= 1 && no <= 5) return "CÁNH";
  if (no >= 6 && no <= 10) return "KHUNG";
  if (no >= 11 && no <= 13) return "PHÀO";
  if (no >= 14 && no <= 20) return "ĐỦ BỘ";

  return null;
}

async function loadOperations() {
  const { data, error } = await supabaseAdmin
    .from("production_operations")
    .select("id, wo_code, operation_code, operation_name, component_scope, stage_type")
    .eq("is_active", true);

  if (error) throw error;

  return (data ?? [])
    .filter((item) => Boolean(getBranch(item.wo_code)))
    .sort((a, b) => numericWo(a.wo_code) - numericWo(b.wo_code))
    .map((item) => ({
      ...item,
      branch: getBranch(item.wo_code),
    }));
}

async function loadScreen(reportDate: string, operationId?: string) {
  const operations = await loadOperations();

  if (!operationId) {
    return {
      operations,
      rows: [],
    };
  }

  const { data: headers, error: headerError } = await supabaseAdmin
    .from("production_dispatch_headers")
    .select("id, dispatch_date, operation_id, status")
    .eq("operation_id", operationId)
    .eq("status", "RELEASED");

  if (headerError) throw headerError;

  const headerIds = (headers ?? []).map((item) => item.id);

  if (headerIds.length === 0) {
    return {
      operations,
      rows: [],
    };
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("production_dispatch_items")
    .select(`
      id,
      dispatch_id,
      production_order_id,
      sequence_no,
      quantity,
      production_orders (
        id,
        parent_id,
        root_id,
        production_no,
        status,
        component_type,
        order_id,
        production_operations (
          wo_code,
          operation_name
        ),
        steel_door_orders (
          don_hang,
          dai_ly,
          ngay_giao,
          model,
          mau
        )
      )
    `)
    .in("dispatch_id", headerIds)
    .order("sequence_no", { ascending: true });

  if (itemsError) throw itemsError;

  const itemIds = (items ?? []).map((item) => item.id);

  let reportRows: any[] = [];

  if (itemIds.length > 0) {
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from("production_reports")
      .select("dispatch_item_id, good_qty, ng_qty")
      .in("dispatch_item_id", itemIds)
      .lte("report_date", reportDate);

    if (reportsError) throw reportsError;

    const totals = new Map<
      string,
      { good: number; ng: number }
    >();

    for (const report of reports ?? []) {
      const current = totals.get(report.dispatch_item_id) ?? {
        good: 0,
        ng: 0,
      };

      current.good += Number(report.good_qty || 0);
      current.ng += Number(report.ng_qty || 0);

      totals.set(report.dispatch_item_id, current);
    }

    reportRows = (items ?? []).map((item: any) => {
      const total = totals.get(item.id) ?? { good: 0, ng: 0 };

      const dispatchQty = Number(item.quantity || 0);
      const remain = Math.max(0, dispatchQty - total.good);

      return {
        dispatchItemId: item.id,
        productionOrderId: item.production_order_id,
        productionNo: item.production_orders?.production_no ?? "",
        productionStatus: item.production_orders?.status ?? "",
        componentType: item.production_orders?.component_type ?? "",
        woCode:
          item.production_orders?.production_operations?.wo_code ?? "",
        operationName:
          item.production_orders?.production_operations?.operation_name ?? "",
        orderNo:
          item.production_orders?.steel_door_orders?.don_hang ?? "",
        dealer:
          item.production_orders?.steel_door_orders?.dai_ly ?? "",
        dueDate:
          item.production_orders?.steel_door_orders?.ngay_giao ?? "",
        model:
          item.production_orders?.steel_door_orders?.model ?? "",
        color:
          item.production_orders?.steel_door_orders?.mau ?? "",
        dispatchQty,
        goodTotal: total.good,
        ngTotal: total.ng,
        remain,
      };
    });
  }

  return {
    operations,
    rows: reportRows,
  };
}

async function completeOperationIfNeeded(productionOrderId: string) {
  const { data: productionOrder, error: orderError } = await supabaseAdmin
    .from("production_orders")
    .select(`
      id,
      parent_id,
      root_id,
      quantity,
      status,
      operation_id,
      component_type,
      production_operations (
        wo_code
      )
    `)
    .eq("id", productionOrderId)
    .single();

  if (orderError) throw orderError;

  const { data: dispatchItems, error: dispatchError } = await supabaseAdmin
    .from("production_dispatch_items")
    .select(`
      id,
      quantity,
      production_dispatch_headers!inner (
        status
      )
    `)
    .eq("production_order_id", productionOrderId)
    .eq("production_dispatch_headers.status", "RELEASED");

  if (dispatchError) throw dispatchError;

  const itemIds = (dispatchItems ?? []).map((item) => item.id);

  if (itemIds.length === 0) return;

  const dispatchQty = (dispatchItems ?? []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const { data: reports, error: reportError } = await supabaseAdmin
    .from("production_reports")
    .select("good_qty")
    .in("dispatch_item_id", itemIds);

  if (reportError) throw reportError;

  const goodQty = (reports ?? []).reduce(
    (sum, report) => sum + Number(report.good_qty || 0),
    0
  );

  if (dispatchQty <= 0 || goodQty < dispatchQty) return;

  const { error: completeError } = await supabaseAdmin
    .from("production_orders")
    .update({
      status: "COMPLETED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productionOrderId);

  if (completeError) throw completeError;

  const parentId = productionOrder.parent_id;

  if (!parentId) return;

  const { data: currentStep, error: currentStepError } = await supabaseAdmin
    .from("production_routing_steps")
    .select("routing_id, sequence_no")
    .eq("operation_id", productionOrder.operation_id)
    .single();

  if (currentStepError) throw currentStepError;

  const { data: nextStep, error: nextStepError } = await supabaseAdmin
    .from("production_routing_steps")
    .select("operation_id, sequence_no")
    .eq("routing_id", currentStep.routing_id)
    .gt("sequence_no", currentStep.sequence_no)
    .order("sequence_no", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextStepError) throw nextStepError;

  if (nextStep) {
    const { error: nextOrderError } = await supabaseAdmin
      .from("production_orders")
      .update({
        status: "DRAFT",
        updated_at: new Date().toISOString(),
      })
      .eq("parent_id", parentId)
      .eq("operation_id", nextStep.operation_id)
      .neq("status", "CANCELLED");

    if (nextOrderError) throw nextOrderError;

    return;
  }

  const rootId = productionOrder.root_id;

  // Luồng chung ĐỦ BỘ:
  // WO20 là công đoạn cuối RT_CHUNG. Khi WO20 hoàn thành,
  // đánh dấu LSX Cha/Root hoàn thành.
  if (productionOrder.component_type === "ĐỦ BỘ") {
    if (rootId) {
      const { error: completeRootError } = await supabaseAdmin
        .from("production_orders")
        .update({
          status: "COMPLETED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", rootId)
        .eq("level_no", 1);

      if (completeRootError) throw completeRootError;
    }

    return;
  }

  // Cánh / Khung / Phào:
  // Khi hết Routing nhánh thì LSX Con hoàn thành,
  // sau đó kiểm tra đủ bộ để mở WO14.
  const { error: completeParentError } = await supabaseAdmin
    .from("production_orders")
    .update({
      status: "COMPLETED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", parentId)
    .eq("level_no", 2);

  if (completeParentError) throw completeParentError;

  if (rootId) {
    const { error: gateError } = await supabaseAdmin.rpc(
      "refresh_full_set_gate",
      {
        p_root_id: rootId,
      }
    );

    if (gateError) throw gateError;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const reportDate =
      url.searchParams.get("date") ||
      new Date().toISOString().slice(0, 10);

    const operationId =
      url.searchParams.get("operationId") || undefined;

    return NextResponse.json({
      success: true,
      ...(await loadScreen(reportDate, operationId)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể tải báo cáo sản xuất.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const reportDate = String(body?.reportDate ?? "");
    const operationId = String(body?.operationId ?? "");
    const dispatchItemId = String(body?.dispatchItemId ?? "");
    const productionOrderId = String(body?.productionOrderId ?? "");

    const goodQty = Number(body?.goodQty ?? 0);
    const ngQty = Number(body?.ngQty ?? 0);

    if (
      !reportDate ||
      !operationId ||
      !dispatchItemId ||
      !productionOrderId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu dữ liệu báo cáo.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(goodQty) ||
      !Number.isFinite(ngQty) ||
      goodQty < 0 ||
      ngQty < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Good/NG không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const { data: dispatchItem, error: itemError } = await supabaseAdmin
      .from("production_dispatch_items")
      .select(`
        id,
        quantity,
        production_order_id,
        production_dispatch_headers!inner (
          status
        )
      `)
      .eq("id", dispatchItemId)
      .eq("production_order_id", productionOrderId)
      .eq("production_dispatch_headers.status", "RELEASED")
      .single();

    if (itemError) throw itemError;

    const { data: existingReports, error: existingError } =
      await supabaseAdmin
        .from("production_reports")
        .select("good_qty, ng_qty")
        .eq("dispatch_item_id", dispatchItemId)
        .neq("report_date", reportDate);

    if (existingError) throw existingError;

    const oldGood = (existingReports ?? []).reduce(
      (sum, item) => sum + Number(item.good_qty || 0),
      0
    );

    const dispatchQty = Number(dispatchItem.quantity || 0);

    if (oldGood + goodQty > dispatchQty) {
      return NextResponse.json(
        {
          success: false,
          message: `Good vượt SL Dispatch. Đã báo ${oldGood}/${dispatchQty}.`,
        },
        { status: 400 }
      );
    }

    const { error: upsertError } = await supabaseAdmin
      .from("production_reports")
      .upsert(
        {
          report_date: reportDate,
          dispatch_item_id: dispatchItemId,
          production_order_id: productionOrderId,
          good_qty: goodQty,
          ng_qty: ngQty,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "report_date,dispatch_item_id",
        }
      );

    if (upsertError) throw upsertError;

    const { error: runningError } = await supabaseAdmin
      .from("production_orders")
      .update({
        status: "RUNNING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", productionOrderId)
      .in("status", ["DRAFT", "RELEASED"]);

    if (runningError) throw runningError;

    await completeOperationIfNeeded(productionOrderId);

    return NextResponse.json({
      success: true,
      ...(await loadScreen(reportDate, operationId)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể lưu báo cáo sản xuất.",
      },
      { status: 500 }
    );
  }
}
