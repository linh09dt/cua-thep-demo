import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Branch = "CÁNH" | "KHUNG" | "PHÀO" | "ĐỦ BỘ";

type PriorityRule = {
  priority_level: number;
  field_key: string;
  direction: "ASC" | "DESC";
};

type WipSetting = {
  wipMin: number;
  wipTarget: number;
  wipMax: number;
  unitName: string;
  isActive: boolean;
};

type DispatchMetrics = {
  capacity: number;
  capacityReleasedToday: number;
  capacityRemaining: number;
  wipMin: number;
  wipCurrent: number;
  wipTarget: number;
  wipMax: number;
  wipNeedToTarget: number;
  autoDispatchLimit: number;
  unitName: string;
  wipActive: boolean;
  wipStatus:
    | "DISABLED"
    | "LOW"
    | "BELOW_TARGET"
    | "TARGET"
    | "NEAR_MAX"
    | "OVER_MAX";
};

type Candidate = {
  productionOrderId: string;
  productionNo: string;
  parentId: string;
  rootId: string;
  quantity: number;

  salesOrderId: string;
  orderNo: string;
  dealer: string;
  orderDate: string;
  dueDate: string;
  model: string;
  color: string;
  height: number;
  width: number;

  previousWoSequence: string;
};

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

function sortableValue(candidate: Candidate, key: string) {
  switch (key) {
    case "due_date":
      return candidate.dueDate || "9999-12-31";
    case "order_date":
      return candidate.orderDate || "9999-12-31";
    case "dealer":
      return candidate.dealer || "";
    case "model":
      return candidate.model || "";
    case "color":
      return candidate.color || "";
    case "height":
      return Number(candidate.height || 0);
    case "width":
      return Number(candidate.width || 0);
    case "quantity":
      return Number(candidate.quantity || 0);
    case "order_no":
      return candidate.orderNo || "";
    case "previous_wo_sequence":
      return candidate.previousWoSequence || candidate.productionNo;
    case "full_set_ready":
      return 1;
    default:
      return "";
  }
}

function comparePrimitive(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b), "vi", {
    numeric: true,
    sensitivity: "base",
  });
}

function sortCandidates(candidates: Candidate[], rules: PriorityRule[]) {
  return [...candidates].sort((a, b) => {
    for (const rule of rules) {
      const av = sortableValue(a, rule.field_key);
      const bv = sortableValue(b, rule.field_key);
      const compare = comparePrimitive(av, bv);

      if (compare !== 0) {
        return rule.direction === "DESC" ? -compare : compare;
      }
    }

    return a.productionNo.localeCompare(b.productionNo, "vi", {
      numeric: true,
    });
  });
}

async function getOperation(operationId: string) {
  const { data, error } = await supabaseAdmin
    .from("production_operations")
    .select(
      "id, wo_code, operation_code, operation_name, component_scope, stage_type"
    )
    .eq("id", operationId)
    .single();

  if (error) throw error;

  const branch = getBranch(data.wo_code);

  if (!branch) {
    throw new Error("WO này không thuộc luồng Điều độ hiện tại.");
  }

  return {
    ...data,
    branch,
  };
}

async function getCapacity(operationId: string) {
  const { data, error } = await supabaseAdmin
    .from("production_capacities")
    .select("capacity_per_day, efficiency_percent, is_active")
    .eq("operation_id", operationId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.is_active) return 0;

  return Math.round(
    Number(data.capacity_per_day || 0) *
      (Number(data.efficiency_percent || 0) / 100)
  );
}


async function getWipSetting(operationId: string): Promise<WipSetting> {
  const { data, error } = await supabaseAdmin
    .from("production_wip_settings")
    .select("wip_min, wip_target, wip_max, unit_name, is_active")
    .eq("operation_id", operationId)
    .maybeSingle();

  if (error) throw error;

  return {
    wipMin: Number(data?.wip_min ?? 0),
    wipTarget: Number(data?.wip_target ?? 0),
    wipMax: Number(data?.wip_max ?? 0),
    unitName: data?.unit_name ?? "bộ",
    isActive: Boolean(data?.is_active ?? false),
  };
}

async function getReleasedQuantity(operationId: string) {
  const { data: headers, error: headerError } = await supabaseAdmin
    .from("production_dispatch_headers")
    .select("id")
    .eq("operation_id", operationId)
    .eq("status", "RELEASED");

  if (headerError) throw headerError;

  const headerIds = (headers ?? []).map((item) => item.id);
  if (headerIds.length === 0) return 0;

  const { data: items, error: itemError } = await supabaseAdmin
    .from("production_dispatch_items")
    .select("quantity")
    .in("dispatch_id", headerIds);

  if (itemError) throw itemError;

  return (items ?? []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
}

async function getReportedGood(operationId: string) {
  const { data: productionOrders, error: orderError } = await supabaseAdmin
    .from("production_orders")
    .select("id")
    .eq("operation_id", operationId)
    .eq("level_no", 3);

  if (orderError) throw orderError;

  const orderIds = (productionOrders ?? []).map((item) => item.id);
  if (orderIds.length === 0) return 0;

  const { data: reports, error: reportError } = await supabaseAdmin
    .from("production_reports")
    .select("good_qty")
    .in("production_order_id", orderIds);

  if (reportError) throw reportError;

  return (reports ?? []).reduce(
    (sum, item) => sum + Number(item.good_qty || 0),
    0
  );
}

async function getReleasedToday(
  operationId: string,
  dispatchDate: string
) {
  const { data, error } = await supabaseAdmin
    .from("production_dispatch_headers")
    .select("planned_quantity")
    .eq("operation_id", operationId)
    .eq("dispatch_date", dispatchDate)
    .eq("status", "RELEASED");

  if (error) throw error;

  return (data ?? []).reduce(
    (sum, item) => sum + Number(item.planned_quantity || 0),
    0
  );
}

function getWipStatus(
  setting: WipSetting,
  wipCurrent: number
): DispatchMetrics["wipStatus"] {
  if (!setting.isActive) return "DISABLED";
  if (setting.wipMax > 0 && wipCurrent > setting.wipMax) return "OVER_MAX";
  if (wipCurrent < setting.wipMin) return "LOW";
  if (wipCurrent < setting.wipTarget) return "BELOW_TARGET";
  if (
    setting.wipMax > 0 &&
    wipCurrent >= Math.max(setting.wipTarget, setting.wipMax * 0.9)
  ) {
    return "NEAR_MAX";
  }
  return "TARGET";
}

async function getDispatchMetrics(
  operationId: string,
  dispatchDate: string
): Promise<DispatchMetrics> {
  const [capacity, setting, releasedQty, goodQty, releasedToday] =
    await Promise.all([
      getCapacity(operationId),
      getWipSetting(operationId),
      getReleasedQuantity(operationId),
      getReportedGood(operationId),
      getReleasedToday(operationId, dispatchDate),
    ]);

  // WIP hiện tại của WO = lượng Dispatch đã RELEASED tại chính WO đó
  // nhưng chưa được báo Good hoàn thành.
  const wipCurrent = Math.max(0, releasedQty - goodQty);
  const capacityRemaining = Math.max(0, capacity - releasedToday);

  // Nếu WIP chưa bật hoặc Target = 0 thì giữ cơ chế Capacity hiện tại.
  const wipNeedToTarget =
    setting.isActive && setting.wipTarget > 0
      ? Math.max(0, setting.wipTarget - wipCurrent)
      : capacityRemaining;

  const overMax =
    setting.isActive &&
    setting.wipMax > 0 &&
    wipCurrent >= setting.wipMax;

  const autoDispatchLimit = overMax
    ? 0
    : Math.max(
        0,
        Math.min(capacityRemaining, wipNeedToTarget)
      );

  return {
    capacity,
    capacityReleasedToday: releasedToday,
    capacityRemaining,
    wipMin: setting.wipMin,
    wipCurrent,
    wipTarget: setting.wipTarget,
    wipMax: setting.wipMax,
    wipNeedToTarget,
    autoDispatchLimit,
    unitName: setting.unitName,
    wipActive: setting.isActive,
    wipStatus: getWipStatus(setting, wipCurrent),
  };
}

async function getPriorityRules(operationId: string) {
  const { data, error } = await supabaseAdmin
    .from("production_priority_rules")
    .select("priority_level, field_key, direction")
    .eq("operation_id", operationId)
    .order("priority_level", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PriorityRule[];
}

async function getRoutingContext(operationId: string) {
  const { data: currentStep, error: currentError } = await supabaseAdmin
    .from("production_routing_steps")
    .select("routing_id, sequence_no")
    .eq("operation_id", operationId)
    .single();

  if (currentError) throw currentError;

  const { data: previousStep, error: previousError } = await supabaseAdmin
    .from("production_routing_steps")
    .select("operation_id, sequence_no")
    .eq("routing_id", currentStep.routing_id)
    .lt("sequence_no", currentStep.sequence_no)
    .order("sequence_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousError) throw previousError;

  return {
    routingId: currentStep.routing_id,
    sequenceNo: currentStep.sequence_no,
    previousOperationId: previousStep?.operation_id ?? null,
  };
}

async function getReleasedOrderIds(operationId: string) {
  const { data, error } = await supabaseAdmin
    .from("production_dispatch_headers")
    .select(`
      id,
      production_dispatch_items (
        production_order_id
      )
    `)
    .eq("operation_id", operationId)
    .eq("status", "RELEASED");

  if (error) throw error;

  const ids = new Set<string>();

  for (const header of data ?? []) {
    for (const item of header.production_dispatch_items ?? []) {
      ids.add(item.production_order_id);
    }
  }

  return ids;
}

function mapCandidate(item: any, previousWoSequence?: string): Candidate {
  const sales = item.steel_door_orders ?? {};

  return {
    productionOrderId: item.id,
    productionNo: item.production_no,
    parentId: item.parent_id,
    rootId: item.root_id,
    quantity: Number(item.quantity || 0),

    salesOrderId: sales.id ?? item.order_id,
    orderNo: sales.don_hang ?? "",
    dealer: sales.dai_ly ?? "",
    orderDate: sales.ngay_dat ?? "",
    dueDate: sales.ngay_giao ?? "",
    model: sales.model ?? "",
    color: sales.mau ?? "",
    height: Number(sales.cao || 0),
    width: Number(sales.rong || 0),

    previousWoSequence: previousWoSequence ?? item.production_no,
  };
}

async function getCandidates(operationId: string) {
  const operation = await getOperation(operationId);
  const routing = await getRoutingContext(operationId);

  let query = supabaseAdmin
    .from("production_orders")
    .select(`
      id,
      parent_id,
      root_id,
      production_no,
      quantity,
      status,
      is_blocked,
      order_id,
      steel_door_orders (
        id,
        don_hang,
        dai_ly,
        ngay_dat,
        ngay_giao,
        model,
        mau,
        cao,
        rong
      )
    `)
    .eq("operation_id", operationId)
    .eq("level_no", 3)
    .not("status", "in", '("COMPLETED","CANCELLED")');

  // WO14 chỉ được mở bởi refresh_full_set_gate() sau khi
  // Cánh + Khung + Phào đều COMPLETED. Các WO chung sau cũng
  // không được phép vượt qua trạng thái khóa.
  if (operation.branch === "ĐỦ BỘ") {
    query = query.eq("is_blocked", false);
  }

  const { data: currentOrders, error: ordersError } = await query;
  if (ordersError) throw ordersError;

  const releasedIds = await getReleasedOrderIds(operationId);

  let eligibleCurrent = (currentOrders ?? []).filter(
    (item) => !releasedIds.has(item.id)
  );

  if (!routing.previousOperationId) {
    return eligibleCurrent.map((item: any) => mapCandidate(item));
  }

  const parentIds = eligibleCurrent
    .map((item) => item.parent_id)
    .filter(Boolean) as string[];

  if (parentIds.length === 0) return [];

  // CÁNH / KHUNG / PHÀO:
  // WO sau được Eligible ngay khi Dispatch của WO trước đã RELEASED.
  // Không còn chờ WO trước COMPLETED để cho phép điều độ gối đầu.
  if (
    operation.branch === "CÁNH" ||
    operation.branch === "KHUNG" ||
    operation.branch === "PHÀO"
  ) {
    const { data: previousOrders, error: previousOrdersError } =
      await supabaseAdmin
        .from("production_orders")
        .select("id, parent_id, production_no")
        .eq("operation_id", routing.previousOperationId)
        .in("parent_id", parentIds);

    if (previousOrdersError) throw previousOrdersError;

    const releasedPreviousIds = await getReleasedOrderIds(
      routing.previousOperationId
    );

    const releasedByParent = new Map<string, string>();

    for (const item of previousOrders ?? []) {
      if (
        item.parent_id &&
        releasedPreviousIds.has(item.id)
      ) {
        releasedByParent.set(item.parent_id, item.production_no);
      }
    }

    eligibleCurrent = eligibleCurrent.filter(
      (item) =>
        item.parent_id &&
        releasedByParent.has(item.parent_id)
    );

    return eligibleCurrent.map((item: any) =>
      mapCandidate(
        item,
        releasedByParent.get(item.parent_id) ?? item.production_no
      )
    );
  }

  // LUỒNG ĐỦ BỘ WO15-WO20:
  // Giữ nguyên logic an toàn hiện tại: WO chung trước phải COMPLETED.
  // WO14 vẫn do refresh_full_set_gate() mở khi đủ Cánh + Khung + Phào.
  const { data: previousOrders, error: previousOrdersError } =
    await supabaseAdmin
      .from("production_orders")
      .select("parent_id, production_no, status")
      .eq("operation_id", routing.previousOperationId)
      .in("parent_id", parentIds)
      .eq("status", "COMPLETED");

  if (previousOrdersError) throw previousOrdersError;

  const completedByParent = new Map<string, string>();

  for (const item of previousOrders ?? []) {
    if (item.parent_id) {
      completedByParent.set(item.parent_id, item.production_no);
    }
  }

  eligibleCurrent = eligibleCurrent.filter(
    (item) =>
      item.parent_id &&
      completedByParent.has(item.parent_id)
  );

  return eligibleCurrent.map((item: any) =>
    mapCandidate(
      item,
      completedByParent.get(item.parent_id) ?? item.production_no
    )
  );
}

async function getOrCreateHeader(
  dispatchDate: string,
  operationId: string,
  branch: Branch
) {
  const capacity = await getCapacity(operationId);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("production_dispatch_headers")
    .select("*")
    .eq("dispatch_date", dispatchDate)
    .eq("operation_id", operationId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (existing.status === "DRAFT") {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("production_dispatch_headers")
        .update({
          capacity_value: capacity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      return updated;
    }

    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("production_dispatch_headers")
    .insert({
      dispatch_date: dispatchDate,
      operation_id: operationId,
      component_type: branch,
      status: "DRAFT",
      capacity_value: capacity,
      planned_quantity: 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function recalcHeader(dispatchId: string) {
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("production_dispatch_items")
    .select("quantity")
    .eq("dispatch_id", dispatchId);

  if (itemsError) throw itemsError;

  const total = (items ?? []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const { error } = await supabaseAdmin
    .from("production_dispatch_headers")
    .update({
      planned_quantity: total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dispatchId);

  if (error) throw error;
}

async function loadScreen(dispatchDate: string, operationId?: string) {
  const { data: operations, error: operationsError } = await supabaseAdmin
    .from("production_operations")
    .select(
      "id, wo_code, operation_code, operation_name, component_scope, stage_type"
    )
    .eq("is_active", true);

  if (operationsError) throw operationsError;

  const dispatchOperations = (operations ?? [])
    .filter((item) => Boolean(getBranch(item.wo_code)))
    .sort((a, b) => numericWo(a.wo_code) - numericWo(b.wo_code))
    .map((item) => ({
      ...item,
      branch: getBranch(item.wo_code),
    }));

  if (!operationId) {
    return {
      operations: dispatchOperations,
      header: null,
      items: [],
      eligible: [],
      capacity: 0,
      metrics: null,
      rules: [],
    };
  }

  const operation = await getOperation(operationId);
  const metrics = await getDispatchMetrics(operationId, dispatchDate);
  const capacity = metrics.capacity;
  const rules = await getPriorityRules(operationId);
  const eligible = sortCandidates(await getCandidates(operationId), rules);

  const { data: header, error: headerError } = await supabaseAdmin
    .from("production_dispatch_headers")
    .select("*")
    .eq("dispatch_date", dispatchDate)
    .eq("operation_id", operationId)
    .maybeSingle();

  if (headerError) throw headerError;

  let items: any[] = [];

  if (header) {
    const { data: itemRows, error: itemError } = await supabaseAdmin
      .from("production_dispatch_items")
      .select(`
        id,
        production_order_id,
        sequence_no,
        quantity,
        production_orders (
          production_no,
          order_id,
          steel_door_orders (
            don_hang,
            dai_ly,
            ngay_giao,
            model,
            mau,
            cao,
            rong
          )
        )
      `)
      .eq("dispatch_id", header.id)
      .order("sequence_no", { ascending: true });

    if (itemError) throw itemError;

    items = (itemRows ?? []).map((item: any) => ({
      id: item.id,
      productionOrderId: item.production_order_id,
      sequenceNo: item.sequence_no,
      quantity: Number(item.quantity || 0),
      productionNo: item.production_orders?.production_no ?? "",
      orderNo: item.production_orders?.steel_door_orders?.don_hang ?? "",
      dealer: item.production_orders?.steel_door_orders?.dai_ly ?? "",
      dueDate: item.production_orders?.steel_door_orders?.ngay_giao ?? "",
      model: item.production_orders?.steel_door_orders?.model ?? "",
      color: item.production_orders?.steel_door_orders?.mau ?? "",
      height: Number(item.production_orders?.steel_door_orders?.cao || 0),
      width: Number(item.production_orders?.steel_door_orders?.rong || 0),
    }));
  }

  const currentIds = new Set(items.map((item) => item.productionOrderId));

  return {
    operations: dispatchOperations,
    operation,
    header,
    items,
    eligible: eligible.filter(
      (candidate) => !currentIds.has(candidate.productionOrderId)
    ),
    capacity,
    metrics,
    rules,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dispatchDate =
      url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const operationId = url.searchParams.get("operationId") || undefined;

    return NextResponse.json({
      success: true,
      ...(await loadScreen(dispatchDate, operationId)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Không thể tải Điều độ.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action ?? "");
    const dispatchDate = String(body?.dispatchDate ?? "");
    const operationId = String(body?.operationId ?? "");

    if (!dispatchDate || !operationId) {
      return NextResponse.json(
        { success: false, message: "Thiếu ngày điều độ hoặc WO." },
        { status: 400 }
      );
    }

    const operation = await getOperation(operationId);

    if (action === "auto_generate") {
      const header = await getOrCreateHeader(
        dispatchDate,
        operationId,
        operation.branch
      );

      if (header.status !== "DRAFT") {
        throw new Error("Dispatch đã Release, không thể tạo lại Draft.");
      }

      const candidates = sortCandidates(
        await getCandidates(operationId),
        await getPriorityRules(operationId)
      );

      const metrics = await getDispatchMetrics(
        operationId,
        dispatchDate
      );
      const dispatchLimit = metrics.autoDispatchLimit;

      let used = 0;
      const selected: Candidate[] = [];

      for (const candidate of candidates) {
        const qty = Number(candidate.quantity || 0);
        if (qty <= 0) continue;

        // Không tách LSX. Chỉ lấy dòng nào còn nằm trong
        // giới hạn nhỏ hơn giữa WIP cần bù và Capacity còn lại.
        if (used + qty <= dispatchLimit) {
          selected.push(candidate);
          used += qty;
        }
      }

      const { error: deleteError } = await supabaseAdmin
        .from("production_dispatch_items")
        .delete()
        .eq("dispatch_id", header.id);

      if (deleteError) throw deleteError;

      if (selected.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from("production_dispatch_items")
          .insert(
            selected.map((item, index) => ({
              dispatch_id: header.id,
              production_order_id: item.productionOrderId,
              sequence_no: (index + 1) * 10,
              quantity: item.quantity,
            }))
          );

        if (insertError) throw insertError;
      }

      await recalcHeader(header.id);
    } else if (action === "add_item") {
      const productionOrderId = String(body?.productionOrderId ?? "");
      if (!productionOrderId) throw new Error("Thiếu LSX cần thêm.");

      const header = await getOrCreateHeader(
        dispatchDate,
        operationId,
        operation.branch
      );

      if (header.status !== "DRAFT") {
        throw new Error("Dispatch đã Release.");
      }

      const candidates = await getCandidates(operationId);
      const candidate = candidates.find(
        (item) => item.productionOrderId === productionOrderId
      );

      if (!candidate) {
        throw new Error("LSX chưa đủ điều kiện vào WO này.");
      }

      const { data: currentItems, error: currentError } = await supabaseAdmin
        .from("production_dispatch_items")
        .select("sequence_no, quantity")
        .eq("dispatch_id", header.id)
        .order("sequence_no", { ascending: false });

      if (currentError) throw currentError;

      const used = (currentItems ?? []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );

      const metrics = await getDispatchMetrics(
        operationId,
        dispatchDate
      );

      const capacityAvailableForDraft = Math.max(
        0,
        metrics.capacityRemaining - used
      );

      if (candidate.quantity > capacityAvailableForDraft) {
        throw new Error(
          `Vượt Capacity còn lại: cần ${candidate.quantity}, còn ${capacityAvailableForDraft}.`
        );
      }

      if (
        metrics.wipActive &&
        metrics.wipMax > 0 &&
        metrics.wipCurrent + used + candidate.quantity >
          metrics.wipMax
      ) {
        throw new Error(
          `Vượt WIP Max: ${
            metrics.wipCurrent + used + candidate.quantity
          }/${metrics.wipMax} ${metrics.unitName}.`
        );
      }

      const nextSequence = (currentItems?.[0]?.sequence_no ?? 0) + 10;

      const { error } = await supabaseAdmin
        .from("production_dispatch_items")
        .insert({
          dispatch_id: header.id,
          production_order_id: candidate.productionOrderId,
          sequence_no: nextSequence,
          quantity: candidate.quantity,
        });

      if (error) throw error;
      await recalcHeader(header.id);
    } else if (action === "remove_item") {
      const itemId = String(body?.itemId ?? "");

      const { data: header, error: headerError } = await supabaseAdmin
        .from("production_dispatch_headers")
        .select("*")
        .eq("dispatch_date", dispatchDate)
        .eq("operation_id", operationId)
        .single();

      if (headerError) throw headerError;
      if (header.status !== "DRAFT") throw new Error("Dispatch đã Release.");

      const { error } = await supabaseAdmin
        .from("production_dispatch_items")
        .delete()
        .eq("id", itemId)
        .eq("dispatch_id", header.id);

      if (error) throw error;
      await recalcHeader(header.id);
    } else if (action === "release") {
      const { data: header, error: headerError } = await supabaseAdmin
        .from("production_dispatch_headers")
        .select("*")
        .eq("dispatch_date", dispatchDate)
        .eq("operation_id", operationId)
        .single();

      if (headerError) throw headerError;
      if (header.status !== "DRAFT") {
        throw new Error("Dispatch không còn ở trạng thái Draft.");
      }

      const { data: items, error: itemError } = await supabaseAdmin
        .from("production_dispatch_items")
        .select("production_order_id")
        .eq("dispatch_id", header.id);

      if (itemError) throw itemError;
      if (!items || items.length === 0) {
        throw new Error("Dispatch Draft chưa có LSX.");
      }

      const { error: releaseError } = await supabaseAdmin
        .from("production_dispatch_headers")
        .update({
          status: "RELEASED",
          released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", header.id);

      if (releaseError) throw releaseError;

      const productionOrderIds = items.map((item) => item.production_order_id);

      const { error: poError } = await supabaseAdmin
        .from("production_orders")
        .update({
          status: "RELEASED",
          updated_at: new Date().toISOString(),
        })
        .in("id", productionOrderIds)
        .eq("status", "DRAFT");

      if (poError) throw poError;
    } else {
      return NextResponse.json(
        { success: false, message: "Action không hợp lệ." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      ...(await loadScreen(dispatchDate, operationId)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Không thể xử lý Điều độ.",
      },
      { status: 500 }
    );
  }
}
