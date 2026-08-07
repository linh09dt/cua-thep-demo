import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ProductionOrderRow = {
  id: string;
  order_id: string;
  parent_id: string | null;
  root_id: string | null;
  production_no: string;
  level_no: number;
  order_type: string;
  component_type: string | null;
  status: string;
  is_blocked: boolean;
  operation_id: string | null;
  production_operations?: {
    wo_code?: string | null;
    operation_name?: string | null;
  } | null;
};

function numericWo(woCode?: string | null) {
  if (!woCode) return 0;
  const value = Number(String(woCode).replace(/\D/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function componentProgress(
  component: "CÁNH" | "KHUNG" | "PHÀO",
  productionRows: ProductionOrderRow[]
) {
  const child = productionRows.find(
    (item) =>
      item.level_no === 2 &&
      item.order_type === "COMPONENT" &&
      item.component_type === component
  );

  if (!child) {
    return {
      status: "CHƯA TẠO",
      total: 0,
      completed: 0,
      percent: 0,
      currentWo: "-",
      currentOperation: "-",
    };
  }

  const operations = productionRows
    .filter(
      (item) =>
        item.level_no === 3 &&
        item.parent_id === child.id &&
        item.component_type === component
    )
    .sort(
      (a, b) =>
        numericWo(a.production_operations?.wo_code) -
        numericWo(b.production_operations?.wo_code)
    );

  const completed = operations.filter(
    (item) => item.status === "COMPLETED"
  ).length;

  const active =
    operations.find(
      (item) =>
        item.status === "RUNNING" ||
        item.status === "RELEASED"
    ) ??
    operations.find(
      (item) =>
        item.status !== "COMPLETED" &&
        item.status !== "CANCELLED"
    );

  const percent =
    operations.length > 0
      ? Math.round((completed / operations.length) * 100)
      : 0;

  return {
    status: child.status,
    total: operations.length,
    completed,
    percent,
    currentWo:
      active?.production_operations?.wo_code ??
      (completed === operations.length && operations.length > 0
        ? "DONE"
        : "-"),
    currentOperation:
      active?.production_operations?.operation_name ??
      (completed === operations.length && operations.length > 0
        ? "Hoàn thành"
        : "-"),
  };
}

function deriveSystemStatus(
  storedStatus: string,
  root: ProductionOrderRow | undefined,
  productionRows: ProductionOrderRow[]
) {
  if (!root) {
    return storedStatus || "Mới";
  }

  if (root.status === "COMPLETED") {
    return "Hoàn thành";
  }

  const operationRows = productionRows.filter(
    (item) => item.level_no === 3
  );

  const hasRunning = operationRows.some(
    (item) =>
      item.status === "RUNNING" ||
      item.status === "RELEASED"
  );

  const hasCompleted = operationRows.some(
    (item) => item.status === "COMPLETED"
  );

  if (hasRunning || hasCompleted) {
    return "Đang sản xuất";
  }

  return "Đã lên kế hoạch";
}

export async function GET() {
  try {
    const [ordersResult, productionResult, statusResult] =
      await Promise.all([
        supabaseAdmin
          .from("steel_door_orders")
          .select(
            "id, don_hang, dai_ly, ngay_dat, ngay_giao, model, mau, cao, rong, huong_mo, so_luong, khoa, trang_thai, ghi_chu, created_at"
          )
          .order("created_at", { ascending: false }),

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
            status,
            is_blocked,
            operation_id,
            production_operations (
              wo_code,
              operation_name
            )
          `)
          .order("created_at", { ascending: true }),

        supabaseAdmin
          .from("order_master_data")
          .select("id, code, name, sort_order")
          .eq("category", "ORDER_STATUS")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

    if (ordersResult.error) throw ordersResult.error;
    if (productionResult.error) throw productionResult.error;
    if (statusResult.error) throw statusResult.error;

    const { data: lotItems, error: lotItemsError } =
      await supabaseAdmin
        .from("production_lot_items")
        .select("lot_id, order_id, production_order_id");

    if (lotItemsError) throw lotItemsError;

    const lotIds = Array.from(
      new Set((lotItems ?? []).map((item) => item.lot_id))
    );

    let lots: any[] = [];

    if (lotIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("production_lots")
        .select("id, lot_no, lot_name, status, production_date, target_delivery_date")
        .in("id", lotIds);

      if (error) throw error;
      lots = data ?? [];
    }

    const lotMap = new Map(
      lots.map((lot) => [lot.id, lot])
    );

    const lotByOrder = new Map<string, any>();

    for (const item of lotItems ?? []) {
      const lot = lotMap.get(item.lot_id);
      if (lot) lotByOrder.set(item.order_id, lot);
    }

    const productionOrders =
      (productionResult.data ?? []) as unknown as ProductionOrderRow[];

    const productionBySalesOrder = new Map<
      string,
      ProductionOrderRow[]
    >();

    for (const item of productionOrders) {
      const current =
        productionBySalesOrder.get(item.order_id) ?? [];
      current.push(item);
      productionBySalesOrder.set(item.order_id, current);
    }

    const rows = (ordersResult.data ?? []).map((order) => {
      const productionRows =
        productionBySalesOrder.get(order.id) ?? [];

      const root = productionRows.find(
        (item) =>
          item.level_no === 1 &&
          item.order_type === "PARENT" &&
          item.status !== "CANCELLED"
      );

      const canh = componentProgress("CÁNH", productionRows);
      const khung = componentProgress("KHUNG", productionRows);
      const phao = componentProgress("PHÀO", productionRows);

      const commonOperations = productionRows
        .filter(
          (item) =>
            item.level_no === 3 &&
            item.component_type === "ĐỦ BỘ"
        )
        .sort(
          (a, b) =>
            numericWo(a.production_operations?.wo_code) -
            numericWo(b.production_operations?.wo_code)
        );

      const commonCompleted = commonOperations.filter(
        (item) => item.status === "COMPLETED"
      ).length;

      const commonActive =
        commonOperations.find(
          (item) =>
            !item.is_blocked &&
            (item.status === "RUNNING" ||
              item.status === "RELEASED")
        ) ??
        commonOperations.find(
          (item) =>
            !item.is_blocked &&
            item.status !== "COMPLETED" &&
            item.status !== "CANCELLED"
        );

      const fullSetReady =
        canh.status === "COMPLETED" &&
        khung.status === "COMPLETED" &&
        phao.status === "COMPLETED";

      const allOperations = productionRows.filter(
        (item) => item.level_no === 3
      );

      const completedOperations = allOperations.filter(
        (item) => item.status === "COMPLETED"
      ).length;

      const overallPercent =
        allOperations.length > 0
          ? Math.round(
              (completedOperations / allOperations.length) *
                100
            )
          : 0;

      const lot = lotByOrder.get(order.id);

      return {
        id: order.id,
        orderNo: order.don_hang ?? "",
        dealer: order.dai_ly ?? "",
        orderDate: order.ngay_dat ?? "",
        dueDate: order.ngay_giao ?? "",
        model: order.model ?? "",
        color: order.mau ?? "",
        height: Number(order.cao ?? 0),
        width: Number(order.rong ?? 0),
        openDirection: order.huong_mo ?? "",
        quantity: Number(order.so_luong ?? 0),
        lockName: order.khoa ?? "",
        storedStatus: order.trang_thai ?? "Mới",
        systemStatus: deriveSystemStatus(
          order.trang_thai ?? "Mới",
          root,
          productionRows
        ),
        note: order.ghi_chu ?? "",

        lotNo: lot?.lot_no ?? "",
        lotName: lot?.lot_name ?? "",
        lotStatus: lot?.status ?? "",
        lotProductionDate: lot?.production_date ?? "",
        lotTargetDeliveryDate: lot?.target_delivery_date ?? "",

        rootId: root?.id ?? null,
        productionNo: root?.production_no ?? "",
        rootStatus: root?.status ?? "CHƯA TẠO",

        canh,
        khung,
        phao,

        fullSetReady,
        commonTotal: commonOperations.length,
        commonCompleted,
        commonCurrentWo:
          commonActive?.production_operations?.wo_code ??
          (commonCompleted === commonOperations.length &&
          commonOperations.length > 0
            ? "DONE"
            : "-"),
        commonCurrentOperation:
          commonActive?.production_operations?.operation_name ??
          (commonCompleted === commonOperations.length &&
          commonOperations.length > 0
            ? "Hoàn thành"
            : "-"),

        totalOperations: allOperations.length,
        completedOperations,
        overallPercent,
      };
    });

    return NextResponse.json({
      success: true,
      rows,
      statuses: (statusResult.data ?? []).map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể tải tình trạng đơn hàng.",
      },
      { status: 500 }
    );
  }
}
