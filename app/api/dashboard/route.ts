import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function numericWo(value?: string | null) {
  const n = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function dateKey(value?: string | null) {
  return value ? String(value).slice(0, 10) : "";
}

export async function GET() {
  try {
    const [
      ordersResult,
      productionResult,
      operationsResult,
      capacitiesResult,
      dispatchResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("steel_door_orders")
        .select("id, don_hang, ngay_giao, so_luong, trang_thai, created_at"),

      supabaseAdmin
        .from("production_orders")
        .select(
          "id, order_id, parent_id, root_id, level_no, order_type, component_type, status, is_blocked, operation_id"
        ),

      supabaseAdmin
        .from("production_operations")
        .select("id, wo_code, operation_name, component_scope, stage_type")
        .eq("is_active", true),

      supabaseAdmin
        .from("production_capacities")
        .select("operation_id, capacity_per_day, efficiency_percent, is_active"),

      supabaseAdmin
        .from("production_dispatch_headers")
        .select("operation_id, dispatch_date, status, planned_quantity"),
    ]);

    if (ordersResult.error) throw ordersResult.error;
    if (productionResult.error) throw productionResult.error;
    if (operationsResult.error) throw operationsResult.error;
    if (capacitiesResult.error) throw capacitiesResult.error;
    if (dispatchResult.error) throw dispatchResult.error;

    const orders = ordersResult.data ?? [];
    const productionOrders = productionResult.data ?? [];
    const operations = operationsResult.data ?? [];
    const capacities = capacitiesResult.data ?? [];
    const dispatches = dispatchResult.data ?? [];

    const today = new Date().toISOString().slice(0, 10);

    const rootByOrder = new Map<string, any>();
    const productionByOrder = new Map<string, any[]>();

    for (const po of productionOrders) {
      const list = productionByOrder.get(po.order_id) ?? [];
      list.push(po);
      productionByOrder.set(po.order_id, list);

      if (
        po.level_no === 1 &&
        po.order_type === "PARENT" &&
        po.status !== "CANCELLED"
      ) {
        rootByOrder.set(po.order_id, po);
      }
    }

    let totalQty = 0;
    let newCount = 0;
    let plannedCount = 0;
    let runningCount = 0;
    let completedCount = 0;
    let fullSetCount = 0;
    let lateCount = 0;

    const statusMap = new Map<string, number>();

    const dueDateMap = new Map<string, number>();

    for (const order of orders) {
      totalQty += Number(order.so_luong ?? 0);

      const list = productionByOrder.get(order.id) ?? [];
      const root = rootByOrder.get(order.id);

      const branchChildren = list.filter(
        (x) =>
          x.level_no === 2 &&
          x.order_type === "COMPONENT" &&
          ["CÁNH", "KHUNG", "PHÀO"].includes(x.component_type)
      );

      const fullSetReady =
        branchChildren.length === 3 &&
        branchChildren.every((x) => x.status === "COMPLETED");

      if (fullSetReady) fullSetCount++;

      const operationsForOrder = list.filter((x) => x.level_no === 3);

      const hasActivity = operationsForOrder.some(
        (x) =>
          x.status === "RUNNING" ||
          x.status === "RELEASED" ||
          x.status === "COMPLETED"
      );

      let derivedStatus = order.trang_thai ?? "Mới";

      if (!root) {
        derivedStatus = order.trang_thai ?? "Mới";
      } else if (root.status === "COMPLETED") {
        derivedStatus = "Hoàn thành";
      } else if (hasActivity) {
        derivedStatus = "Đang sản xuất";
      } else {
        derivedStatus = "Đã lên kế hoạch";
      }

      statusMap.set(
        derivedStatus,
        (statusMap.get(derivedStatus) ?? 0) + 1
      );

      if (!root || derivedStatus === "Mới") newCount++;
      else if (derivedStatus === "Đã lên kế hoạch") plannedCount++;
      else if (derivedStatus === "Đang sản xuất") runningCount++;
      else if (derivedStatus === "Hoàn thành") completedCount++;

      const due = dateKey(order.ngay_giao);
      if (due) {
        dueDateMap.set(due, (dueDateMap.get(due) ?? 0) + Number(order.so_luong ?? 0));

        if (due < today && derivedStatus !== "Hoàn thành") {
          lateCount++;
        }
      }
    }

    const operationMap = new Map(
      operations.map((x) => [x.id, x])
    );

    const capacityMap = new Map(
      capacities
        .filter((x) => x.is_active)
        .map((x) => [
          x.operation_id,
          Math.round(
            Number(x.capacity_per_day ?? 0) *
              (Number(x.efficiency_percent ?? 0) / 100)
          ),
        ])
    );

    const todayDispatchByOperation = new Map<string, number>();

    for (const d of dispatches) {
      if (
        dateKey(d.dispatch_date) === today &&
        d.status !== "CANCELLED"
      ) {
        todayDispatchByOperation.set(
          d.operation_id,
          (todayDispatchByOperation.get(d.operation_id) ?? 0) +
            Number(d.planned_quantity ?? 0)
        );
      }
    }

    const capacityChart = operations
      .map((op) => {
        const cap = capacityMap.get(op.id) ?? 0;
        const planned = todayDispatchByOperation.get(op.id) ?? 0;
        const loadPercent =
          cap > 0 ? Math.round((planned / cap) * 100) : 0;

        return {
          woCode: op.wo_code,
          operationName: op.operation_name,
          capacity: cap,
          planned,
          loadPercent,
        };
      })
      .filter((x) => x.capacity > 0)
      .sort((a, b) => numericWo(a.woCode) - numericWo(b.woCode));

    function branchProgress(component: string) {
      const children = productionOrders.filter(
        (x) =>
          x.level_no === 2 &&
          x.order_type === "COMPONENT" &&
          x.component_type === component
      );

      const total = children.length;
      const completed = children.filter(
        (x) => x.status === "COMPLETED"
      ).length;

      const running = children.filter(
        (x) =>
          x.status === "RUNNING" ||
          x.status === "RELEASED"
      ).length;

      return {
        component,
        total,
        running,
        completed,
        completionPercent:
          total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }

    const dueChart = [...dueDateMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 14)
      .map(([date, quantity]) => ({
        date,
        quantity,
      }));

    return NextResponse.json({
      success: true,
      cards: {
        totalOrders: orders.length,
        totalQty,
        newOrders: newCount,
        plannedOrders: plannedCount,
        runningOrders: runningCount,
        fullSetOrders: fullSetCount,
        completedOrders: completedCount,
        lateOrders: lateCount,
      },
      statusChart: [...statusMap.entries()].map(([status, count]) => ({
        status,
        count,
      })),
      branchChart: [
        branchProgress("CÁNH"),
        branchProgress("KHUNG"),
        branchProgress("PHÀO"),
      ],
      capacityChart,
      dueChart,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể tải Dashboard.",
      },
      { status: 500 }
    );
  }
}
