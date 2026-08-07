import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function getTerminalOperationIds() {
  const { data, error } = await supabaseAdmin
    .from("production_operations")
    .select("id, wo_code")
    .in("wo_code", ["WO05", "WO10", "WO13"]);

  if (error) throw error;

  const map = new Map<string, string>();
  for (const item of data ?? []) map.set(item.wo_code, item.id);
  return map;
}

async function loadData() {
  const [
    lotsResult,
    itemsResult,
    ordersResult,
    productionResult,
    reportsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("production_lots")
      .select("*")
      .order("production_date", { ascending: false })
      .order("priority", { ascending: true }),

    supabaseAdmin
      .from("production_lot_items")
      .select("id, lot_id, order_id, sequence_no")
      .order("sequence_no", { ascending: true }),

    supabaseAdmin
      .from("steel_door_orders")
      .select(
        "id, don_hang, dai_ly, ngay_dat, ngay_giao, model, mau, cao, rong, so_luong, trang_thai"
      )
      .order("ngay_giao", { ascending: true }),

    supabaseAdmin
      .from("production_orders")
      .select("id, order_id, operation_id, quantity, status, level_no")
      .eq("level_no", 3),

    supabaseAdmin
      .from("production_reports")
      .select("production_order_id, good_qty"),
  ]);

  if (lotsResult.error) throw lotsResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (productionResult.error) throw productionResult.error;
  if (reportsResult.error) throw reportsResult.error;

  const terminalOps = await getTerminalOperationIds();
  const terminalByOperation = new Map<string, "CÁNH" | "KHUNG" | "PHÀO">();

  const wo05 = terminalOps.get("WO05");
  const wo10 = terminalOps.get("WO10");
  const wo13 = terminalOps.get("WO13");
  if (wo05) terminalByOperation.set(wo05, "CÁNH");
  if (wo10) terminalByOperation.set(wo10, "KHUNG");
  if (wo13) terminalByOperation.set(wo13, "PHÀO");

  const reportGoodByProductionOrder = new Map<string, number>();
  for (const report of reportsResult.data ?? []) {
    reportGoodByProductionOrder.set(
      report.production_order_id,
      (reportGoodByProductionOrder.get(report.production_order_id) ?? 0) +
        num(report.good_qty)
    );
  }

  const readyByOrder = new Map<
    string,
    { canh: number; khung: number; phao: number }
  >();

  for (const po of productionResult.data ?? []) {
    const component = terminalByOperation.get(po.operation_id);
    if (!component) continue;

    const orderReady = readyByOrder.get(po.order_id) ?? {
      canh: 0,
      khung: 0,
      phao: 0,
    };

    const reported = reportGoodByProductionOrder.get(po.id) ?? 0;
    const ready =
      reported > 0
        ? Math.min(num(po.quantity), reported)
        : po.status === "COMPLETED"
        ? num(po.quantity)
        : 0;

    if (component === "CÁNH") orderReady.canh = ready;
    if (component === "KHUNG") orderReady.khung = ready;
    if (component === "PHÀO") orderReady.phao = ready;

    readyByOrder.set(po.order_id, orderReady);
  }

  const orderMap = new Map(
    (ordersResult.data ?? []).map((order) => [order.id, order])
  );

  const itemsByLot = new Map<string, any[]>();
  const assignedOrderIds = new Set<string>();

  for (const item of itemsResult.data ?? []) {
    assignedOrderIds.add(item.order_id);
    const order = orderMap.get(item.order_id);
    if (!order) continue;

    const ready = readyByOrder.get(item.order_id) ?? {
      canh: 0,
      khung: 0,
      phao: 0,
    };

    const quantity = num(order.so_luong);
    const canhReady = Math.min(quantity, ready.canh);
    const khungReady = Math.min(quantity, ready.khung);
    const phaoReady = Math.min(quantity, ready.phao);
    const fullSetReady = Math.min(canhReady, khungReady, phaoReady);

    const row = {
      id: item.id,
      lotId: item.lot_id,
      orderId: item.order_id,
      sequenceNo: item.sequence_no,
      orderNo: order.don_hang ?? "",
      dealer: order.dai_ly ?? "",
      orderDate: order.ngay_dat ?? "",
      dueDate: order.ngay_giao ?? "",
      model: order.model ?? "",
      color: order.mau ?? "",
      quantity,
      canhReady,
      khungReady,
      phaoReady,
      fullSetReady,
    };

    const list = itemsByLot.get(item.lot_id) ?? [];
    list.push(row);
    itemsByLot.set(item.lot_id, list);
  }

  const lots = (lotsResult.data ?? []).map((lot) => {
    const items = itemsByLot.get(lot.id) ?? [];

    const totalQty = items.reduce((s, x) => s + x.quantity, 0);
    const canhReady = items.reduce((s, x) => s + x.canhReady, 0);
    const khungReady = items.reduce((s, x) => s + x.khungReady, 0);
    const phaoReady = items.reduce((s, x) => s + x.phaoReady, 0);
    const fullSetReady = items.reduce((s, x) => s + x.fullSetReady, 0);

    return {
      id: lot.id,
      lotNo: lot.lot_no,
      lotName: lot.lot_name ?? "",
      productionDate: lot.production_date,
      targetDeliveryDate: lot.target_delivery_date ?? "",
      priority: lot.priority,
      status: lot.status,
      note: lot.note ?? "",
      totalOrders: items.length,
      totalQty,
      canhReady,
      khungReady,
      phaoReady,
      fullSetReady,
      items,
    };
  });

  const unassignedOrders = (ordersResult.data ?? [])
    .filter((order) => !assignedOrderIds.has(order.id))
    .map((order) => ({
      id: order.id,
      orderNo: order.don_hang ?? "",
      dealer: order.dai_ly ?? "",
      orderDate: order.ngay_dat ?? "",
      dueDate: order.ngay_giao ?? "",
      model: order.model ?? "",
      color: order.mau ?? "",
      quantity: num(order.so_luong),
      status: order.trang_thai ?? "",
    }));

  return { lots, unassignedOrders };
}

async function nextLotNo(productionDate: string) {
  const compact = productionDate.replaceAll("-", "");
  const prefix = `LOT-${compact}-`;

  const { data, error } = await supabaseAdmin
    .from("production_lots")
    .select("lot_no")
    .like("lot_no", `${prefix}%`)
    .order("lot_no", { ascending: false })
    .limit(1);

  if (error) throw error;

  const last = data?.[0]?.lot_no ?? "";
  const lastNo = Number(last.slice(prefix.length)) || 0;
  return `${prefix}${String(lastNo + 1).padStart(3, "0")}`;
}

async function addOrders(lotId: string, orderIds: string[]) {
  if (orderIds.length === 0) return;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("production_lot_items")
    .select("sequence_no")
    .eq("lot_id", lotId)
    .order("sequence_no", { ascending: false })
    .limit(1);

  if (existingError) throw existingError;

  const start = Number(existing?.[0]?.sequence_no ?? 0);

  const { error } = await supabaseAdmin
    .from("production_lot_items")
    .insert(
      orderIds.map((orderId, index) => ({
        lot_id: lotId,
        order_id: orderId,
        sequence_no: start + (index + 1) * 10,
      }))
    );

  if (error) throw error;
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      ...(await loadData()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể tải Lô sản xuất.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action ?? "");

    if (action === "create") {
      const productionDate = String(body?.productionDate ?? "");
      const targetDeliveryDate = String(body?.targetDeliveryDate ?? "");
      const lotName = String(body?.lotName ?? "").trim();
      const note = String(body?.note ?? "").trim();
      const priority = Number(body?.priority ?? 100);
      const orderIds = Array.isArray(body?.orderIds)
        ? body.orderIds.filter(Boolean)
        : [];

      if (!productionDate) {
        return NextResponse.json(
          { success: false, message: "Thiếu ngày sản xuất." },
          { status: 400 }
        );
      }

      if (orderIds.length === 0) {
        return NextResponse.json(
          { success: false, message: "Chưa chọn đơn hàng cho lô." },
          { status: 400 }
        );
      }

      const lotNo = await nextLotNo(productionDate);

      const { data: lot, error } = await supabaseAdmin
        .from("production_lots")
        .insert({
          lot_no: lotNo,
          lot_name: lotName || null,
          production_date: productionDate,
          target_delivery_date: targetDeliveryDate || null,
          priority: Number.isFinite(priority) ? priority : 100,
          status: "DRAFT",
          note: note || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      try {
        await addOrders(lot.id, orderIds);
      } catch (error) {
        await supabaseAdmin
          .from("production_lots")
          .delete()
          .eq("id", lot.id);
        throw error;
      }
    } else if (action === "add_orders") {
      const lotId = String(body?.lotId ?? "");
      const orderIds = Array.isArray(body?.orderIds)
        ? body.orderIds.filter(Boolean)
        : [];

      const { data: lot, error: lotError } = await supabaseAdmin
        .from("production_lots")
        .select("status")
        .eq("id", lotId)
        .single();

      if (lotError) throw lotError;
      if (lot.status !== "DRAFT") {
        throw new Error("Chỉ được thêm đơn khi Lô đang DRAFT.");
      }

      await addOrders(lotId, orderIds);
    } else if (action === "remove_order") {
      const lotId = String(body?.lotId ?? "");
      const itemId = String(body?.itemId ?? "");

      const { data: lot, error: lotError } = await supabaseAdmin
        .from("production_lots")
        .select("status")
        .eq("id", lotId)
        .single();

      if (lotError) throw lotError;
      if (lot.status !== "DRAFT") {
        throw new Error("Chỉ được bỏ đơn khi Lô đang DRAFT.");
      }

      const { error } = await supabaseAdmin
        .from("production_lot_items")
        .delete()
        .eq("id", itemId)
        .eq("lot_id", lotId);

      if (error) throw error;
    } else if (action === "release") {
      const lotId = String(body?.lotId ?? "");

      const { count, error: countError } = await supabaseAdmin
        .from("production_lot_items")
        .select("*", { count: "exact", head: true })
        .eq("lot_id", lotId);

      if (countError) throw countError;
      if (!count) throw new Error("Lô chưa có đơn hàng.");

      const { error } = await supabaseAdmin
        .from("production_lots")
        .update({
          status: "RELEASED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lotId)
        .eq("status", "DRAFT");

      if (error) throw error;
    } else {
      return NextResponse.json(
        { success: false, message: "Action không hợp lệ." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      ...(await loadData()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật Lô sản xuất.",
      },
      { status: 500 }
    );
  }
}
