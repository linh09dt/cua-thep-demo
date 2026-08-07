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
    rootsResult,
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
      .select(
        "id, lot_id, order_id, production_order_id, sequence_no"
      )
      .order("sequence_no", { ascending: true }),

    supabaseAdmin
      .from("steel_door_orders")
      .select(
        "id, don_hang, dai_ly, ngay_dat, ngay_giao, model, mau, cao, rong, so_luong, trang_thai"
      ),

    supabaseAdmin
      .from("production_orders")
      .select(
        "id, order_id, production_no, quantity, status, created_at"
      )
      .eq("level_no", 1)
      .neq("status", "CANCELLED")
      .order("created_at", { ascending: true }),

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
  if (rootsResult.error) throw rootsResult.error;
  if (productionResult.error) throw productionResult.error;
  if (reportsResult.error) throw reportsResult.error;

  const orderMap = new Map(
    (ordersResult.data ?? []).map((order) => [order.id, order])
  );

  const rootMap = new Map(
    (rootsResult.data ?? []).map((root) => [root.id, root])
  );

  const terminalOps = await getTerminalOperationIds();
  const terminalByOperation = new Map<
    string,
    "CÁNH" | "KHUNG" | "PHÀO"
  >();

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

  const itemsByLot = new Map<string, any[]>();
  const assignedRootIds = new Set<string>();

  for (const item of itemsResult.data ?? []) {
    const root = item.production_order_id
      ? rootMap.get(item.production_order_id)
      : (rootsResult.data ?? []).find(
          (x) => x.order_id === item.order_id
        );

    if (!root) continue;

    assignedRootIds.add(root.id);

    const order = orderMap.get(root.order_id);
    if (!order) continue;

    const ready = readyByOrder.get(root.order_id) ?? {
      canh: 0,
      khung: 0,
      phao: 0,
    };

    const quantity = num(root.quantity || order.so_luong);
    const canhReady = Math.min(quantity, ready.canh);
    const khungReady = Math.min(quantity, ready.khung);
    const phaoReady = Math.min(quantity, ready.phao);
    const fullSetReady = Math.min(
      canhReady,
      khungReady,
      phaoReady
    );

    const row = {
      id: item.id,
      lotId: item.lot_id,
      productionOrderId: root.id,
      productionNo: root.production_no,
      orderId: root.order_id,
      sequenceNo: item.sequence_no,
      orderNo: order.don_hang ?? "",
      dealer: order.dai_ly ?? "",
      orderDate: order.ngay_dat ?? "",
      dueDate: order.ngay_giao ?? "",
      model: order.model ?? "",
      color: order.mau ?? "",
      quantity,
      rootStatus: root.status,
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
      totalQty: items.reduce((s, x) => s + x.quantity, 0),
      canhReady: items.reduce((s, x) => s + x.canhReady, 0),
      khungReady: items.reduce((s, x) => s + x.khungReady, 0),
      phaoReady: items.reduce((s, x) => s + x.phaoReady, 0),
      fullSetReady: items.reduce(
        (s, x) => s + x.fullSetReady,
        0
      ),
      items,
    };
  });

  const unassignedProductionOrders = (rootsResult.data ?? [])
    .filter((root) => !assignedRootIds.has(root.id))
    .map((root) => {
      const order = orderMap.get(root.order_id);

      return {
        id: root.id,
        productionOrderId: root.id,
        productionNo: root.production_no,
        orderId: root.order_id,
        orderNo: order?.don_hang ?? "",
        dealer: order?.dai_ly ?? "",
        orderDate: order?.ngay_dat ?? "",
        dueDate: order?.ngay_giao ?? "",
        model: order?.model ?? "",
        color: order?.mau ?? "",
        quantity: num(root.quantity || order?.so_luong),
        rootStatus: root.status,
      };
    });

  return {
    lots,
    unassignedProductionOrders,
  };
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

async function addProductionOrders(
  lotId: string,
  productionOrderIds: string[]
) {
  if (productionOrderIds.length === 0) return;

  const { data: roots, error: rootsError } =
    await supabaseAdmin
      .from("production_orders")
      .select("id, order_id, level_no, status")
      .in("id", productionOrderIds);

  if (rootsError) throw rootsError;

  const validRoots = (roots ?? []).filter(
    (item) =>
      item.level_no === 1 &&
      item.status !== "CANCELLED"
  );

  if (validRoots.length !== productionOrderIds.length) {
    throw new Error(
      "Lô chỉ được nhận LSX Cha hợp lệ."
    );
  }

  const { data: existingAssignments, error: assignmentError } =
    await supabaseAdmin
      .from("production_lot_items")
      .select("production_order_id")
      .in("production_order_id", productionOrderIds);

  if (assignmentError) throw assignmentError;

  if ((existingAssignments ?? []).length > 0) {
    throw new Error(
      "Có LSX đã thuộc một Lô sản xuất khác."
    );
  }

  const { data: existing, error: existingError } =
    await supabaseAdmin
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
      validRoots.map((root, index) => ({
        lot_id: lotId,
        order_id: root.order_id,
        production_order_id: root.id,
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
      const productionDate = String(
        body?.productionDate ?? ""
      );
      const targetDeliveryDate = String(
        body?.targetDeliveryDate ?? ""
      );
      const lotName = String(body?.lotName ?? "").trim();
      const note = String(body?.note ?? "").trim();
      const priority = Number(body?.priority ?? 100);
      const productionOrderIds = Array.isArray(
        body?.productionOrderIds
      )
        ? body.productionOrderIds.filter(Boolean)
        : [];

      if (!productionDate) {
        return NextResponse.json(
          {
            success: false,
            message: "Thiếu ngày sản xuất.",
          },
          { status: 400 }
        );
      }

      if (productionOrderIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Chưa chọn LSX cho Lô.",
          },
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
          target_delivery_date:
            targetDeliveryDate || null,
          priority: Number.isFinite(priority)
            ? priority
            : 100,
          status: "DRAFT",
          note: note || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      try {
        await addProductionOrders(
          lot.id,
          productionOrderIds
        );
      } catch (error) {
        await supabaseAdmin
          .from("production_lots")
          .delete()
          .eq("id", lot.id);

        throw error;
      }
    } else if (action === "add_production_orders") {
      const lotId = String(body?.lotId ?? "");
      const productionOrderIds = Array.isArray(
        body?.productionOrderIds
      )
        ? body.productionOrderIds.filter(Boolean)
        : [];

      const { data: lot, error: lotError } =
        await supabaseAdmin
          .from("production_lots")
          .select("status")
          .eq("id", lotId)
          .single();

      if (lotError) throw lotError;

      if (lot.status !== "DRAFT") {
        throw new Error(
          "Chỉ được thêm LSX khi Lô đang DRAFT."
        );
      }

      await addProductionOrders(
        lotId,
        productionOrderIds
      );
    } else if (action === "remove_production_order") {
      const lotId = String(body?.lotId ?? "");
      const itemId = String(body?.itemId ?? "");

      const { data: lot, error: lotError } =
        await supabaseAdmin
          .from("production_lots")
          .select("status")
          .eq("id", lotId)
          .single();

      if (lotError) throw lotError;

      if (lot.status !== "DRAFT") {
        throw new Error(
          "Chỉ được bỏ LSX khi Lô đang DRAFT."
        );
      }

      const { error } = await supabaseAdmin
        .from("production_lot_items")
        .delete()
        .eq("id", itemId)
        .eq("lot_id", lotId);

      if (error) throw error;
    } else if (action === "release") {
      const lotId = String(body?.lotId ?? "");

      const { count, error: countError } =
        await supabaseAdmin
          .from("production_lot_items")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("lot_id", lotId);

      if (countError) throw countError;
      if (!count) {
        throw new Error("Lô chưa có LSX.");
      }

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
        {
          success: false,
          message: "Action không hợp lệ.",
        },
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
