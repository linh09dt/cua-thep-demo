import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function loadData() {
  const [eventsResult, rootsResult, ordersResult, opsResult] = await Promise.all([
    supabaseAdmin
      .from("production_quality_events")
      .select("id, event_date, production_order_id, order_id, operation_id, event_type, status, quantity, reason, disposition, created_by, created_at, closed_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("production_orders")
      .select("id, order_id, production_no, quantity, status, is_blocked, blocked_reason")
      .eq("level_no", 1)
      .neq("status", "CANCELLED"),
    supabaseAdmin
      .from("steel_door_orders")
      .select("id, don_hang, dai_ly, ngay_giao, model, mau, so_luong"),
    supabaseAdmin
      .from("production_operations")
      .select("id, wo_code, operation_name")
      .eq("is_active", true),
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (rootsResult.error) throw rootsResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (opsResult.error) throw opsResult.error;

  const orderMap = new Map((ordersResult.data ?? []).map((x) => [x.id, x]));
  const rootMap = new Map((rootsResult.data ?? []).map((x) => [x.id, x]));
  const opMap = new Map((opsResult.data ?? []).map((x) => [x.id, x]));

  return {
    roots: (rootsResult.data ?? []).map((root) => ({
      ...root,
      order: orderMap.get(root.order_id) ?? null,
    })),
    operations: opsResult.data ?? [],
    events: (eventsResult.data ?? []).map((event) => ({
      ...event,
      productionNo: rootMap.get(event.production_order_id)?.production_no ?? "",
      orderNo: orderMap.get(event.order_id)?.don_hang ?? "",
      dealer: orderMap.get(event.order_id)?.dai_ly ?? "",
      woCode: event.operation_id ? opMap.get(event.operation_id)?.wo_code ?? "" : "",
      operationName: event.operation_id ? opMap.get(event.operation_id)?.operation_name ?? "" : "",
    })),
  };
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, ...(await loadData()) });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Không thể tải Quality." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action ?? "create");

    if (action === "close") {
      const id = String(body?.id ?? "");
      const { error } = await supabaseAdmin
        .from("production_quality_events")
        .update({ status: "CLOSED", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, ...(await loadData()) });
    }

    if (action === "release_hold") {
      const productionOrderId = String(body?.productionOrderId ?? "");
      const { data: root, error: rootError } = await supabaseAdmin
        .from("production_orders")
        .select("id, order_id")
        .eq("id", productionOrderId)
        .single();
      if (rootError) throw rootError;

      const { error: closeError } = await supabaseAdmin
        .from("production_quality_events")
        .update({ status: "CLOSED", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("production_order_id", productionOrderId)
        .eq("event_type", "HOLD")
        .eq("status", "OPEN");
      if (closeError) throw closeError;

      const { error: unblockError } = await supabaseAdmin
        .from("production_orders")
        .update({ is_blocked: false, blocked_reason: null, updated_at: new Date().toISOString() })
        .eq("root_id", productionOrderId);
      if (unblockError) throw unblockError;

      const { error: eventError } = await supabaseAdmin
        .from("production_quality_events")
        .insert({
          production_order_id: productionOrderId,
          order_id: root.order_id,
          event_type: "RELEASE",
          status: "CLOSED",
          quantity: 0,
          reason: String(body?.reason ?? "Release Quality Hold"),
          disposition: "RELEASED",
          created_by: String(body?.createdBy ?? "QC"),
          closed_at: new Date().toISOString(),
        });
      if (eventError) throw eventError;

      return NextResponse.json({ success: true, ...(await loadData()) });
    }

    const productionOrderId = String(body?.productionOrderId ?? "");
    const operationId = body?.operationId ? String(body.operationId) : null;
    const eventType = String(body?.eventType ?? "QC");
    const quantity = Number(body?.quantity ?? 0);
    const reason = String(body?.reason ?? "").trim();
    const disposition = String(body?.disposition ?? "").trim();
    const createdBy = String(body?.createdBy ?? "QC").trim();

    if (!productionOrderId) {
      return NextResponse.json({ success: false, message: "Thiếu LSX." }, { status: 400 });
    }

    const { data: root, error: rootError } = await supabaseAdmin
      .from("production_orders")
      .select("id, order_id, level_no")
      .eq("id", productionOrderId)
      .single();
    if (rootError) throw rootError;
    if (root.level_no !== 1) throw new Error("Quality Event demo được quản lý tại LSX Cha.");

    const { error: insertError } = await supabaseAdmin
      .from("production_quality_events")
      .insert({
        production_order_id: productionOrderId,
        order_id: root.order_id,
        operation_id: operationId,
        event_type: eventType,
        status: "OPEN",
        quantity: Math.max(0, quantity),
        reason: reason || null,
        disposition: disposition || null,
        created_by: createdBy || null,
      });
    if (insertError) throw insertError;

    if (eventType === "HOLD") {
      const { error: blockError } = await supabaseAdmin
        .from("production_orders")
        .update({
          is_blocked: true,
          blocked_reason: reason || "Quality Hold",
          updated_at: new Date().toISOString(),
        })
        .eq("root_id", productionOrderId);
      if (blockError) throw blockError;
    }

    return NextResponse.json({ success: true, ...(await loadData()) });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Không thể cập nhật Quality." },
      { status: 500 }
    );
  }
}
