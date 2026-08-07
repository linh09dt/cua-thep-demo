import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AlertLevel = "CRITICAL" | "WARNING" | "INFO" | "SUCCESS";

function dateKey(value?: string | null) {
  return value ? String(value).slice(0, 10) : "";
}

function diffDays(from: string, to: string) {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      ordersResult,
      rootsResult,
      operationsResult,
      capacitiesResult,
      headersResult,
      lotsResult,
      lotItemsResult,
      allProductionResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("steel_door_orders")
        .select("id, don_hang, dai_ly, ngay_giao, so_luong, trang_thai"),

      supabaseAdmin
        .from("production_orders")
        .select("id, order_id, status, quantity")
        .eq("level_no", 1)
        .neq("status", "CANCELLED"),

      supabaseAdmin
        .from("production_operations")
        .select("id, wo_code, operation_name")
        .eq("is_active", true),

      supabaseAdmin
        .from("production_capacities")
        .select("operation_id, capacity_per_day, efficiency_percent, is_active"),

      supabaseAdmin
        .from("production_dispatch_headers")
        .select("operation_id, dispatch_date, status, planned_quantity")
        .eq("dispatch_date", today)
        .neq("status", "CANCELLED"),

      supabaseAdmin
        .from("production_lots")
        .select("id, lot_no, status, target_delivery_date")
        .in("status", ["DRAFT", "RELEASED", "RUNNING"]),

      supabaseAdmin
        .from("production_lot_items")
        .select("lot_id, order_id"),

      supabaseAdmin
        .from("production_orders")
        .select(`
          id,
          order_id,
          root_id,
          level_no,
          status,
          operation_id,
          quantity,
          production_operations (
            wo_code
          )
        `)
        .eq("level_no", 3),
    ]);

    for (const result of [
      ordersResult,
      rootsResult,
      operationsResult,
      capacitiesResult,
      headersResult,
      lotsResult,
      lotItemsResult,
      allProductionResult,
    ]) {
      if (result.error) throw result.error;
    }

    const alerts: Array<{
      id: string;
      level: AlertLevel;
      title: string;
      message: string;
      metric: string;
      href: string;
    }> = [];

    const orderMap = new Map<string, any>(
      (ordersResult.data ?? []).map((item: any) => [item.id, item])
    );
    const rootMap = new Map<string, any>(
      (rootsResult.data ?? []).map((item: any) => [item.order_id, item])
    );

    // 1. Trễ hạn / sắp đến hạn
    for (const order of ordersResult.data ?? []) {
      const root = rootMap.get(order.id);
      const completed = root?.status === "COMPLETED";
      const due = dateKey(order.ngay_giao);
      if (!due || completed) continue;

      const days = diffDays(today, due);

      if (days < 0) {
        alerts.push({
          id: `late-${order.id}`,
          level: "CRITICAL",
          title: `${order.don_hang} trễ hạn`,
          message: `${order.dai_ly || "Khách hàng"} • trễ ${Math.abs(days)} ngày • ${Number(order.so_luong || 0)} bộ`,
          metric: `${Math.abs(days)} ngày`,
          href: "/order-tracking",
        });
      } else if (days <= 2) {
        alerts.push({
          id: `due-${order.id}`,
          level: "WARNING",
          title: `${order.don_hang} sắp đến hạn`,
          message: `Ngày giao ${due} • còn ${days} ngày`,
          metric: `${days} ngày`,
          href: "/order-tracking",
        });
      }
    }

    // 2. Capacity hôm nay
    const operationMap = new Map<string, any>(
      (operationsResult.data ?? []).map((item: any) => [item.id, item])
    );
    const capacityMap = new Map<string, number>(
      (capacitiesResult.data ?? [])
        .filter((item: any) => item.is_active)
        .map((item: any) => [
          item.operation_id,
          Math.round(
            Number(item.capacity_per_day || 0) *
              (Number(item.efficiency_percent || 100) / 100)
          ),
        ])
    );

    for (const header of headersResult.data ?? []) {
      const capacity = capacityMap.get(header.operation_id) ?? 0;
      const planned = Number(header.planned_quantity || 0);
      if (capacity <= 0 || planned <= capacity) continue;

      const op = operationMap.get(header.operation_id);
      const load = Math.round((planned / capacity) * 100);

      alerts.push({
        id: `cap-${header.operation_id}`,
        level: "CRITICAL",
        title: `${op?.wo_code || "WO"} quá Capacity`,
        message: `${op?.operation_name || ""} • kế hoạch ${planned}/${capacity} bộ`,
        metric: `${load}%`,
        href: "/dispatch",
      });
    }

    // 3. Lô mất cân bằng Cánh / Khung / Phào.
    const operationsByRoot = new Map<string, any[]>();
    for (const po of allProductionResult.data ?? []) {
      if (!po.root_id) continue;
      const list = operationsByRoot.get(po.root_id) ?? [];
      list.push(po);
      operationsByRoot.set(po.root_id, list);
    }

    const itemsByLot = new Map<string, any[]>();

    for (const item of lotItemsResult.data ?? []) {
      const list = itemsByLot.get(item.lot_id) ?? [];
      list.push(item);
      itemsByLot.set(item.lot_id, list);
    }

    for (const lot of lotsResult.data ?? []) {
      const items = itemsByLot.get(lot.id) ?? [];
      let total = 0;
      let canh = 0;
      let khung = 0;
      let phao = 0;

      for (const item of items) {
        const root = rootMap.get(item.order_id);
        if (!root) continue;

        const qty = Number(root.quantity || orderMap.get(root.order_id)?.so_luong || 0);
        total += qty;

        const rows = operationsByRoot.get(root.id) ?? [];
        const isDone = (wo: string) =>
          rows.some(
            (row) =>
              row.production_operations?.wo_code === wo &&
              row.status === "COMPLETED"
          );

        if (isDone("WO05")) canh += qty;
        if (isDone("WO10")) khung += qty;
        if (isDone("WO13")) phao += qty;
      }

      if (total <= 0) continue;

      const minReady = Math.min(canh, khung, phao);
      const maxReady = Math.max(canh, khung, phao);
      const gap = maxReady - minReady;

      if (gap > 0 && gap >= Math.max(10, total * 0.15)) {
        const bottleneck =
          khung === minReady ? "Khung" : phao === minReady ? "Phào" : "Cánh";

        alerts.push({
          id: `lot-${lot.id}`,
          level: "WARNING",
          title: `${lot.lot_no} lệch tiến độ`,
          message: `Cánh ${canh}/${total} • Khung ${khung}/${total} • Phào ${phao}/${total}. Nút thắt: ${bottleneck}.`,
          metric: `Gap ${gap}`,
          href: "/production-lots",
        });
      }
    }

    const rank: Record<AlertLevel, number> = {
      CRITICAL: 1,
      WARNING: 2,
      INFO: 3,
      SUCCESS: 4,
    };

    alerts.sort((a, b) => rank[a.level] - rank[b.level]);

    const summary = {
      critical: alerts.filter((x) => x.level === "CRITICAL").length,
      warning: alerts.filter((x) => x.level === "WARNING").length,
      total: alerts.length,
    };

    return NextResponse.json({
      success: true,
      date: today,
      summary,
      alerts: alerts.slice(0, 40),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể tải cảnh báo kế hoạch.",
      },
      { status: 500 }
    );
  }
}
