import { supabaseAdmin } from "@/lib/supabase-admin";

export type PlanningBranch = "CÁNH" | "KHUNG" | "PHÀO" | "ĐỦ BỘ";

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function woNo(value?: string | null) {
  const n = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function branchOfWo(value?: string | null): PlanningBranch | null {
  const n = woNo(value);
  if (n >= 1 && n <= 5) return "CÁNH";
  if (n >= 6 && n <= 10) return "KHUNG";
  if (n >= 11 && n <= 13) return "PHÀO";
  if (n >= 14 && n <= 20) return "ĐỦ BỘ";
  return null;
}

function dateOnly(value?: string | null) {
  return value ? String(value).slice(0, 10) : "";
}

function daysUntil(date: string, today: string) {
  if (!date) return 999;
  const a = new Date(`${today}T00:00:00`).getTime();
  const b = new Date(`${date}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export async function loadPlanningIntelligence(planDate?: string) {
  const today = planDate || new Date().toISOString().slice(0, 10);

  const [
    ordersResult,
    rootsResult,
    opsResult,
    productionResult,
    reportsResult,
    materialResult,
    lotsResult,
    lotItemsResult,
    capacitiesResult,
    dispatchResult,
    qualityResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("steel_door_orders")
      .select("id, don_hang, dai_ly, ngay_giao, model, mau, cao, rong, so_luong, trang_thai"),
    supabaseAdmin
      .from("production_orders")
      .select("id, order_id, production_no, quantity, status")
      .eq("level_no", 1)
      .neq("status", "CANCELLED"),
    supabaseAdmin
      .from("production_operations")
      .select("id, wo_code, operation_name, component_scope, stage_type")
      .eq("is_active", true),
    supabaseAdmin
      .from("production_orders")
      .select("id, order_id, root_id, parent_id, operation_id, production_no, quantity, status, component_type")
      .eq("level_no", 3),
    supabaseAdmin
      .from("production_reports")
      .select("production_order_id, good_qty, ng_qty, report_date"),
    supabaseAdmin
      .from("production_material_readiness")
      .select("production_order_id, order_id, status, readiness_percent, shortage_note, confirmed_by, confirmed_at, updated_at"),
    supabaseAdmin
      .from("production_lots")
      .select("id, lot_no, lot_name, production_date, target_delivery_date, priority, status")
      .in("status", ["DRAFT", "RELEASED", "RUNNING"]),
    supabaseAdmin
      .from("production_lot_items")
      .select("lot_id, order_id, production_order_id, sequence_no"),
    supabaseAdmin
      .from("production_capacities")
      .select("operation_id, capacity_per_day, efficiency_percent, is_active"),
    supabaseAdmin
      .from("production_dispatch_headers")
      .select("operation_id, dispatch_date, status, planned_quantity")
      .neq("status", "CANCELLED"),
    supabaseAdmin
      .from("production_quality_events")
      .select("id, production_order_id, order_id, operation_id, event_type, status, quantity, reason, event_date")
      .eq("status", "OPEN"),
  ]);

  for (const result of [
    ordersResult,
    rootsResult,
    opsResult,
    productionResult,
    reportsResult,
    materialResult,
    lotsResult,
    lotItemsResult,
    capacitiesResult,
    dispatchResult,
    qualityResult,
  ]) {
    if (result.error) throw result.error;
  }

  const orders = ordersResult.data ?? [];
  const roots = rootsResult.data ?? [];
  const operations = opsResult.data ?? [];
  const productionOrders = productionResult.data ?? [];
  const reports = reportsResult.data ?? [];
  const materials = materialResult.data ?? [];
  const lots = lotsResult.data ?? [];
  const lotItems = lotItemsResult.data ?? [];
  const capacities = capacitiesResult.data ?? [];
  const dispatches = dispatchResult.data ?? [];
  const qualityEvents = qualityResult.data ?? [];

  const orderMap = new Map(orders.map((x) => [x.id, x]));
  const rootMap = new Map(roots.map((x) => [x.id, x]));
  const opMap = new Map(operations.map((x) => [x.id, x]));
  const materialMap = new Map(materials.map((x) => [x.production_order_id, x]));
  const lotMap = new Map(lots.map((x) => [x.id, x]));
  const lotByRoot = new Map<string, any>();

  for (const item of lotItems) {
    if (item.production_order_id) {
      const lot = lotMap.get(item.lot_id);
      if (lot) lotByRoot.set(item.production_order_id, lot);
    }
  }

  const reportGood = new Map<string, number>();
  const reportNg = new Map<string, number>();
  for (const report of reports) {
    reportGood.set(
      report.production_order_id,
      (reportGood.get(report.production_order_id) ?? 0) + num(report.good_qty)
    );
    reportNg.set(
      report.production_order_id,
      (reportNg.get(report.production_order_id) ?? 0) + num(report.ng_qty)
    );
  }

  const opsByRoot = new Map<string, any[]>();
  for (const po of productionOrders) {
    if (!po.root_id) continue;
    const list = opsByRoot.get(po.root_id) ?? [];
    list.push(po);
    opsByRoot.set(po.root_id, list);
  }

  const terminalWo: Record<Exclude<PlanningBranch, "ĐỦ BỘ">, string> = {
    "CÁNH": "WO05",
    "KHUNG": "WO10",
    "PHÀO": "WO13",
  };

  function goodAtWo(rootId: string, woCode: string, quantity: number) {
    const rows = opsByRoot.get(rootId) ?? [];
    const row = rows.find((po) => opMap.get(po.operation_id)?.wo_code === woCode);
    if (!row) return 0;
    const good = reportGood.get(row.id) ?? 0;
    if (good > 0) return Math.min(quantity, good);
    return row.status === "COMPLETED" ? quantity : 0;
  }

  const rootRows = roots.map((root) => {
    const order = orderMap.get(root.order_id);
    const quantity = num(root.quantity || order?.so_luong);
    const canhReady = goodAtWo(root.id, terminalWo.CÁNH, quantity);
    const khungReady = goodAtWo(root.id, terminalWo.KHUNG, quantity);
    const phaoReady = goodAtWo(root.id, terminalWo.PHÀO, quantity);
    const setReady = Math.min(canhReady, khungReady, phaoReady);
    const branchGap = {
      "CÁNH": Math.max(0, quantity - canhReady),
      "KHUNG": Math.max(0, quantity - khungReady),
      "PHÀO": Math.max(0, quantity - phaoReady),
    };
    const bottleneckBranch = (Object.entries(branchGap).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "CÁNH") as Exclude<PlanningBranch, "ĐỦ BỘ">;

    const material = materialMap.get(root.id);
    const lot = lotByRoot.get(root.id);
    const openQuality = qualityEvents.filter(
      (x) => x.production_order_id === root.id || x.order_id === root.order_id
    );

    return {
      rootId: root.id,
      productionNo: root.production_no,
      orderId: root.order_id,
      orderNo: order?.don_hang ?? "",
      dealer: order?.dai_ly ?? "",
      dueDate: dateOnly(order?.ngay_giao),
      model: order?.model ?? "",
      color: order?.mau ?? "",
      height: num(order?.cao),
      width: num(order?.rong),
      quantity,
      rootStatus: root.status,
      lotId: lot?.id ?? null,
      lotNo: lot?.lot_no ?? "",
      lotPriority: num(lot?.priority || 100),
      lotStatus: lot?.status ?? "",
      materialStatus: material?.status ?? "READY",
      materialPercent: num(material?.readiness_percent ?? 100),
      materialConfigured: Boolean(material),
      materialNote: material?.shortage_note ?? "",
      canhReady,
      khungReady,
      phaoReady,
      setReady,
      setGap: Math.max(0, quantity - setReady),
      branchGap,
      bottleneckBranch,
      qualityHold: openQuality.some((x) => x.event_type === "HOLD"),
      openQualityCount: openQuality.length,
    };
  });

  const capacityMap = new Map(
    capacities
      .filter((x) => x.is_active)
      .map((x) => [
        x.operation_id,
        Math.round(
          num(x.capacity_per_day) * (num(x.efficiency_percent || 100) / 100)
        ),
      ])
  );

  const plannedByOpDate = new Map<string, number>();
  for (const row of dispatches) {
    const key = `${row.operation_id}|${dateOnly(row.dispatch_date)}`;
    plannedByOpDate.set(
      key,
      (plannedByOpDate.get(key) ?? 0) + num(row.planned_quantity)
    );
  }

  const operationLoad = operations
    .map((op) => {
      const capacity = capacityMap.get(op.id) ?? 0;
      const planned = plannedByOpDate.get(`${op.id}|${today}`) ?? 0;
      return {
        operationId: op.id,
        woCode: op.wo_code,
        operationName: op.operation_name,
        branch: branchOfWo(op.wo_code),
        capacity,
        planned,
        remaining: Math.max(0, capacity - planned),
        loadPercent: capacity > 0 ? Math.round((planned / capacity) * 100) : 0,
      };
    })
    .filter((x) => x.capacity > 0)
    .sort((a, b) => woNo(a.woCode) - woNo(b.woCode));

  const lotRows = lots.map((lot) => {
    const memberRootIds = lotItems
      .filter((x) => x.lot_id === lot.id && x.production_order_id)
      .map((x) => x.production_order_id as string);
    const members = rootRows.filter((x) => memberRootIds.includes(x.rootId));
    const totalQty = members.reduce((s, x) => s + x.quantity, 0);
    const canhReady = members.reduce((s, x) => s + x.canhReady, 0);
    const khungReady = members.reduce((s, x) => s + x.khungReady, 0);
    const phaoReady = members.reduce((s, x) => s + x.phaoReady, 0);
    const setReady = members.reduce((s, x) => s + x.setReady, 0);
    const gaps = {
      "CÁNH": Math.max(0, totalQty - canhReady),
      "KHUNG": Math.max(0, totalQty - khungReady),
      "PHÀO": Math.max(0, totalQty - phaoReady),
    };
    const bottleneckBranch = (Object.entries(gaps).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "CÁNH") as Exclude<PlanningBranch, "ĐỦ BỘ">;

    return {
      id: lot.id,
      lotNo: lot.lot_no,
      lotName: lot.lot_name ?? "",
      productionDate: dateOnly(lot.production_date),
      targetDeliveryDate: dateOnly(lot.target_delivery_date),
      priority: num(lot.priority),
      status: lot.status,
      totalOrders: members.length,
      totalQty,
      canhReady,
      khungReady,
      phaoReady,
      setReady,
      setGap: Math.max(0, totalQty - setReady),
      gaps,
      bottleneckBranch,
      materialShortageOrders: members.filter((x) =>
        ["SHORTAGE", "HOLD"].includes(x.materialStatus)
      ).length,
      qualityHoldOrders: members.filter((x) => x.qualityHold).length,
    };
  });

  const smartRecommendations: any[] = [];
  const branchWoRanges: Record<Exclude<PlanningBranch, "ĐỦ BỘ">, [number, number]> = {
    "CÁNH": [1, 5],
    "KHUNG": [6, 10],
    "PHÀO": [11, 13],
  };

  for (const root of rootRows) {
    if (root.rootStatus === "COMPLETED") continue;
    if (["SHORTAGE", "HOLD"].includes(root.materialStatus)) continue;
    if (root.qualityHold) continue;
    if (!["RELEASED", "RUNNING"].includes(root.lotStatus)) continue;

    const days = daysUntil(root.dueDate, today);
    const dueScore = days < 0 ? 100 : days <= 2 ? 80 : days <= 5 ? 60 : 20;
    const lotScore = Math.max(0, 50 - Math.min(50, root.lotPriority));

    for (const branch of ["CÁNH", "KHUNG", "PHÀO"] as const) {
      const gap = root.branchGap[branch];
      if (gap <= 0) continue;

      const [from, to] = branchWoRanges[branch];
      const rows = (opsByRoot.get(root.rootId) ?? [])
        .map((po) => ({ po, op: opMap.get(po.operation_id) }))
        .filter(({ op }) => {
          const n = woNo(op?.wo_code);
          return n >= from && n <= to;
        })
        .sort((a, b) => woNo(a.op?.wo_code) - woNo(b.op?.wo_code));

      const current = rows.find(({ po }) => po.status !== "COMPLETED") ?? rows.at(-1);
      if (!current?.op) continue;

      const currentOp = current.op;
      const load = operationLoad.find((x) => x.operationId === currentOp.id);
      const available = load?.remaining ?? 0;
      const recommendedQty = Math.max(0, Math.min(gap, available || gap));
      if (recommendedQty <= 0) continue;

      const bottleneckBonus = root.bottleneckBranch === branch ? 40 : 0;
      const materialBonus = root.materialStatus === "READY" ? 20 : 5;
      const score = dueScore + lotScore + bottleneckBonus + materialBonus;

      smartRecommendations.push({
        rootId: root.rootId,
        productionNo: root.productionNo,
        orderId: root.orderId,
        orderNo: root.orderNo,
        lotId: root.lotId,
        lotNo: root.lotNo,
        dueDate: root.dueDate,
        branch,
        operationId: currentOp.id,
        woCode: currentOp.wo_code,
        operationName: currentOp.operation_name,
        materialStatus: root.materialStatus,
        recommendedQty,
        score,
        reason: [
          root.bottleneckBranch === branch ? "Bottleneck của bộ cửa" : "Nhánh còn thiếu",
          days < 0 ? "Đơn trễ hạn" : days <= 2 ? "Sắp đến hạn giao" : "Theo ngày giao",
          `Gap ${gap} bộ`,
        ].join(" • "),
      });
    }
  }

  smartRecommendations.sort((a, b) => b.score - a.score);

  const kpi = {
    materialReady: rootRows.filter((x) => x.materialStatus === "READY").length,
    materialShortage: rootRows.filter((x) =>
      ["SHORTAGE", "HOLD"].includes(x.materialStatus)
    ).length,
    setReadyQty: rootRows.reduce((s, x) => s + x.setReady, 0),
    setGapQty: rootRows.reduce((s, x) => s + x.setGap, 0),
    openQuality: qualityEvents.length,
    qualityHold: qualityEvents.filter((x) => x.event_type === "HOLD").length,
    overloadedWorkCenters: operationLoad.filter((x) => x.loadPercent > 100).length,
    highLoadWorkCenters: operationLoad.filter((x) => x.loadPercent >= 90).length,
    recommendationCount: smartRecommendations.length,
  };

  return {
    planDate: today,
    roots: rootRows,
    lots: lotRows,
    operationLoad,
    smartRecommendations,
    qualityEvents,
    kpi,
  };
}
