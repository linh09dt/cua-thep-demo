import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function loadData() {
  const [ordersResult, productionResult, lotsResult, lotItemsResult] =
    await Promise.all([
      supabaseAdmin
        .from("steel_door_orders")
        .select(
          "id, don_hang, dai_ly, ngay_giao, model, mau, cao, rong, so_luong, trang_thai"
        )
        .order("created_at", { ascending: false })
        .limit(500),

      supabaseAdmin
        .from("production_orders")
        .select(`
          id,
          order_id,
          parent_id,
          root_id,
          production_no,
          level_no,
          order_type,
          component_type,
          routing_id,
          quantity,
          status,
          is_blocked,
          blocked_reason,
          created_at,
          production_operations (
            wo_code,
            operation_code,
            operation_name
          )
        `)
        .order("created_at", { ascending: true }),

      supabaseAdmin
        .from("production_lots")
        .select("id, lot_no, status"),

      supabaseAdmin
        .from("production_lot_items")
        .select("lot_id, order_id"),
    ]);

  if (ordersResult.error) throw ordersResult.error;
  if (productionResult.error) throw productionResult.error;
  if (lotsResult.error) throw lotsResult.error;
  if (lotItemsResult.error) throw lotItemsResult.error;

  const lotMap = new Map(
    (lotsResult.data ?? []).map((lot) => [lot.id, lot])
  );

  const lotByOrder = new Map<string, any>();
  for (const item of lotItemsResult.data ?? []) {
    const lot = lotMap.get(item.lot_id);
    if (lot) lotByOrder.set(item.order_id, lot);
  }

  return {
    orders: (ordersResult.data ?? []).map((order) => {
      const lot = lotByOrder.get(order.id);
      return {
        ...order,
        lot_no: lot?.lot_no ?? "",
        lot_status: lot?.status ?? "",
      };
    }),
    productionOrders: productionResult.data ?? [],
  };
}

async function ensureReleasedLot(orderIds: string[]) {
  const { data: items, error: itemError } = await supabaseAdmin
    .from("production_lot_items")
    .select("order_id, lot_id")
    .in("order_id", orderIds);

  if (itemError) throw itemError;

  const lotIds = Array.from(
    new Set((items ?? []).map((item) => item.lot_id))
  );

  if (lotIds.length === 0) {
    throw new Error(
      "Đơn hàng chưa thuộc Lô sản xuất. Hãy tạo và Release Lô trước khi tạo LSX."
    );
  }

  const { data: lots, error: lotError } = await supabaseAdmin
    .from("production_lots")
    .select("id, lot_no, status")
    .in("id", lotIds);

  if (lotError) throw lotError;

  const releasedLotIds = new Set(
    (lots ?? [])
      .filter((lot) => lot.status === "RELEASED" || lot.status === "RUNNING")
      .map((lot) => lot.id)
  );

  const allowedOrders = new Set(
    (items ?? [])
      .filter((item) => releasedLotIds.has(item.lot_id))
      .map((item) => item.order_id)
  );

  const missing = orderIds.filter((id) => !allowedOrders.has(id));
  if (missing.length > 0) {
    throw new Error(
      `${missing.length} đơn chưa thuộc Lô RELEASED. Release Lô trước khi tạo LSX.`
    );
  }
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
        message: error instanceof Error ? error.message : "Không thể tải lệnh sản xuất.",
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
      const orderId = String(body?.orderId ?? "");
      if (!orderId) {
        return NextResponse.json(
          { success: false, message: "Thiếu đơn hàng." },
          { status: 400 }
        );
      }

      await ensureReleasedLot([orderId]);

      const { data, error } = await supabaseAdmin.rpc(
        "create_production_order_tree",
        { p_order_id: orderId }
      );

      if (error) throw error;

      return NextResponse.json({
        success: true,
        rootId: data,
        ...(await loadData()),
      });
    }

    if (action === "create_many") {
      const orderIds = Array.isArray(body?.orderIds)
        ? body.orderIds.filter(Boolean)
        : [];

      if (orderIds.length === 0) {
        return NextResponse.json(
          { success: false, message: "Chưa chọn đơn hàng." },
          { status: 400 }
        );
      }

      await ensureReleasedLot(orderIds);

      for (const orderId of orderIds) {
        const { error } = await supabaseAdmin.rpc(
          "create_production_order_tree",
          { p_order_id: orderId }
        );
        if (error) throw error;
      }

      return NextResponse.json({
        success: true,
        ...(await loadData()),
      });
    }

    return NextResponse.json(
      { success: false, message: "Action không hợp lệ." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Không thể tạo lệnh sản xuất.",
      },
      { status: 500 }
    );
  }
}
