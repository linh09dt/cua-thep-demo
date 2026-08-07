import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function loadData() {
  const [ordersResult, productionResult] = await Promise.all([
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
  ]);

  if (ordersResult.error) throw ordersResult.error;
  if (productionResult.error) throw productionResult.error;

  return {
    orders: ordersResult.data ?? [],
    productionOrders: productionResult.data ?? [],
  };
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
