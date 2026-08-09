"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type SalesOrder = {
  id: string;
  don_hang: string;
  dai_ly: string;
  ngay_giao: string;
  model: string;
  mau: string;
  so_luong: number;
  trang_thai: string;
};

type ProductionOrder = {
  id: string;
  order_id: string;
  production_no: string;
  level_no: number;
  order_type: string;
  component_type: string | null;
  quantity: number;
  status: string;
};

type LotRoot = {
  id: string;
  productionOrderId: string;
  productionNo: string;
  orderId: string;
  orderNo: string;
  dealer: string;
  dueDate: string;
  model: string;
  color: string;
  quantity: number;
  rootStatus: string;
};

type Lot = {
  id: string;
  lotNo: string;
  lotName: string;
  productionDate: string;
  targetDeliveryDate: string;
  priority: number;
  status: string;
  totalOrders: number;
  totalQty: number;
  canhReady: number;
  khungReady: number;
  phaoReady: number;
  fullSetReady: number;
};

type PlanningAlert = {
  id: string;
  level: "CRITICAL" | "WARNING" | "INFO" | "SUCCESS";
  title: string;
  message: string;
  metric: string;
};

type PlanningKpi = {
  materialReady: number;
  materialShortage: number;
  setReadyQty: number;
  setGapQty: number;
  openQuality: number;
  qualityHold: number;
  overloadedWorkCenters: number;
  highLoadWorkCenters: number;
  recommendationCount: number;
};

type BottleneckLot = {
  id: string;
  lotNo: string;
  totalQty: number;
  setReady: number;
  setGap: number;
  bottleneckBranch: string;
};

type SmartRecommendation = {
  rootId: string;
  productionNo: string;
  orderNo: string;
  lotNo: string;
  branch: string;
  woCode: string;
  recommendedQty: number;
  score: number;
  reason: string;
};

type DispatchOperation = {
  id: string;
  wo_code: string;
  operation_name: string;
  branch: string;
};

type DispatchMetrics = {
  capacity: number;
  carryOver?: number;
  capacityRemaining: number;
  wipMin: number;
  wipCurrent: number;
  wipTarget: number;
  wipMax: number;
  wipNeedToTarget: number;
  autoDispatchLimit: number;
  unitName: string;
  wipStatus: string;
};

type DispatchItem = {
  id: string;
  productionOrderId: string;
  productionNo: string;
  orderNo: string;
  dealer: string;
  dueDate: string;
  color: string;
  quantity: number;
};

type ReportOperation = {
  id: string;
  wo_code: string;
  operation_name: string;
  branch: string;
};

type ReportRow = {
  dispatchItemId: string;
  productionOrderId: string;
  productionNo: string;
  orderNo: string;
  dealer: string;
  dueDate: string;
  color: string;
  dispatchQty: number;
  goodTotal: number;
  ngTotal: number;
  remain: number;
};

type TrackingRow = {
  id: string;
  orderNo: string;
  dealer: string;
  dueDate: string;
  quantity: number;
  systemStatus: string;
  productionNo: string;
  lotNo?: string;
  lotStatus?: string;
  overallPercent: number;
  fullSetReady: boolean;
  commonCurrentWo: string;
  commonCurrentOperation: string;
  rootStatus: string;
  canh: {
    percent: number;
    currentWo: string;
    status: string;
  };
  khung: {
    percent: number;
    currentWo: string;
    status: string;
  };
  phao: {
    percent: number;
    currentWo: string;
    status: string;
  };
};

const TOTAL_STEPS = 7;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PlanningWizardPage() {
  const [current, setCurrent] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Step 1 + 2
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [orderSearch, setOrderSearch] = useState("");

  // Step 3
  const [lots, setLots] = useState<Lot[]>([]);
  const [unassignedRoots, setUnassignedRoots] = useState<LotRoot[]>([]);
  const [selectedRootIds, setSelectedRootIds] = useState<string[]>([]);
  const [lotForm, setLotForm] = useState({
    lotName: "",
    productionDate: today(),
    targetDeliveryDate: "",
    priority: 100,
  });

  // Step 4 - Advanced Planning Intelligence
  const [alerts, setAlerts] = useState<PlanningAlert[]>([]);
  const [planningKpi, setPlanningKpi] = useState<PlanningKpi | null>(null);
  const [bottleneckLots, setBottleneckLots] = useState<BottleneckLot[]>([]);
  const [smartRecommendations, setSmartRecommendations] = useState<SmartRecommendation[]>([]);

  // Step 5
  const [dispatchDate, setDispatchDate] = useState(today());
  const [dispatchOperations, setDispatchOperations] = useState<DispatchOperation[]>([]);
  const [dispatchOperationId, setDispatchOperationId] = useState("");
  const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
  const [dispatchHeader, setDispatchHeader] = useState<any>(null);
  const [dispatchMetrics, setDispatchMetrics] = useState<DispatchMetrics | null>(null);

  // Step 6
  const [reportDate, setReportDate] = useState(today());
  const [reportOperations, setReportOperations] = useState<ReportOperation[]>([]);
  const [reportOperationId, setReportOperationId] = useState("");
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [reportInputs, setReportInputs] = useState<
    Record<string, { good: number; ng: number }>
  >({});

  // Step 7
  const [trackingRows, setTrackingRows] = useState<TrackingRow[]>([]);
  const [trackingSearch, setTrackingSearch] = useState("");
  const [trackingId, setTrackingId] = useState("");

  useEffect(() => {
    loadOrdersAndProduction();
  }, []);

  useEffect(() => {
    if (current === 2) loadLots();
    if (current === 3) loadAlerts();
    if (current === 4) loadDispatch();
    if (current === 5) loadReport();
    if (current === 6) loadTracking();
  }, [current]);

  useEffect(() => {
    if (current === 4) loadDispatch(dispatchOperationId);
  }, [dispatchDate, dispatchOperationId]);

  useEffect(() => {
    if (current === 5) loadReport(reportOperationId);
  }, [reportDate, reportOperationId]);

  const rootByOrder = useMemo(() => {
    const map = new Map<string, ProductionOrder>();
    for (const row of productionOrders) {
      if (row.level_no === 1 && row.order_type === "PARENT") {
        map.set(row.order_id, row);
      }
    }
    return map;
  }, [productionOrders]);

  const pendingOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (rootByOrder.has(order.id)) return false;
        const key = orderSearch.trim().toLowerCase();
        if (!key) return true;
        return [order.don_hang, order.dai_ly, order.model, order.mau].some((value) =>
          String(value ?? "").toLowerCase().includes(key)
        );
      }),
    [orders, rootByOrder, orderSearch]
  );

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedOrderIds.includes(order.id)),
    [orders, selectedOrderIds]
  );

  const selectedTracking = useMemo(
    () =>
      trackingRows.find((row) => row.id === trackingId) ??
      trackingRows.find((row) => {
        const key = trackingSearch.trim().toLowerCase();
        if (!key) return false;
        return [row.orderNo, row.dealer, row.productionNo, row.lotNo].some((value) =>
          String(value ?? "").toLowerCase().includes(key)
        );
      }) ??
      null,
    [trackingRows, trackingId, trackingSearch]
  );

  const stepTitles = [
    "Đơn hàng",
    "Lệnh sản xuất",
    "Lô sản xuất",
    "Sẵn sàng & Smart Plan",
    "Điều độ sản xuất",
    "Xưởng & Quality",
    "Theo dõi kết quả",
  ];

  async function jsonFetch(url: string, options?: RequestInit) {
    const response = await fetch(url, {
      cache: "no-store",
      ...options,
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể xử lý dữ liệu.");
    }

    return result;
  }

  async function run(task: () => Promise<void>, success?: string) {
    setBusy(true);
    setMessage("");

    try {
      await task();
      if (success) setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xử lý.");
    } finally {
      setBusy(false);
    }
  }

  async function loadOrdersAndProduction() {
    await run(async () => {
      const result = await jsonFetch("/api/production-orders");
      setOrders(result.orders ?? []);
      setProductionOrders(result.productionOrders ?? []);
    });
  }

  async function createSelectedProductionOrders() {
    if (selectedOrderIds.length === 0) {
      setMessage("Chưa chọn đơn hàng để tạo LSX.");
      return;
    }

    await run(async () => {
      const result = await jsonFetch("/api/production-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_many",
          orderIds: selectedOrderIds,
        }),
      });

      setOrders(result.orders ?? []);
      setProductionOrders(result.productionOrders ?? []);
      setSelectedOrderIds([]);
    }, "Đã tạo LSX cho các đơn hàng đã chọn.");
  }

  async function loadLots() {
    await run(async () => {
      const result = await jsonFetch("/api/production-lots");
      setLots(result.lots ?? []);
      setUnassignedRoots(result.unassignedProductionOrders ?? []);
    });
  }

  async function createLot() {
    if (selectedRootIds.length === 0) {
      setMessage("Chưa chọn LSX để tạo Lô.");
      return;
    }

    await run(async () => {
      const result = await jsonFetch("/api/production-lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...lotForm,
          productionOrderIds: selectedRootIds,
        }),
      });

      setLots(result.lots ?? []);
      setUnassignedRoots(result.unassignedProductionOrders ?? []);
      setSelectedRootIds([]);
    }, "Đã tạo Lô sản xuất.");
  }

  async function releaseLot(lotId: string) {
    await run(async () => {
      const result = await jsonFetch("/api/production-lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "release",
          lotId,
        }),
      });

      setLots(result.lots ?? []);
      setUnassignedRoots(result.unassignedProductionOrders ?? []);
    }, "Đã Release Lô sản xuất.");
  }

  async function loadAlerts() {
    await run(async () => {
      const [alertResult, intelligence] = await Promise.all([
        jsonFetch("/api/planning-alerts"),
        jsonFetch("/api/planning/bottleneck"),
      ]);

      setAlerts(alertResult.alerts ?? []);
      setPlanningKpi(intelligence.kpi ?? null);
      setBottleneckLots(
        [...(intelligence.lots ?? [])]
          .filter((item: BottleneckLot) => Number(item.setGap || 0) > 0)
          .sort((a: BottleneckLot, b: BottleneckLot) => b.setGap - a.setGap)
          .slice(0, 6)
      );
      setSmartRecommendations((intelligence.recommendations ?? []).slice(0, 8));
    });
  }

  async function loadDispatch(selectedOperationId = dispatchOperationId) {
    await run(async () => {
      const params = new URLSearchParams({ date: dispatchDate });
      if (selectedOperationId) params.set("operationId", selectedOperationId);

      const result = await jsonFetch(`/api/dispatch?${params.toString()}`);
      setDispatchOperations(result.operations ?? []);

      const resolvedId =
        selectedOperationId || result.operations?.[0]?.id || "";

      if (!selectedOperationId && resolvedId) {
        setDispatchOperationId(resolvedId);
        return;
      }

      setDispatchItems(result.items ?? []);
      setDispatchHeader(result.header ?? null);
      setDispatchMetrics(result.metrics ?? null);
    });
  }

  async function dispatchAction(action: "auto_generate" | "release") {
    if (!dispatchOperationId) {
      setMessage("Chưa chọn WO.");
      return;
    }

    await run(async () => {
      const result = await jsonFetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          dispatchDate,
          operationId: dispatchOperationId,
        }),
      });

      setDispatchItems(result.items ?? []);
      setDispatchHeader(result.header ?? null);
      setDispatchMetrics(result.metrics ?? null);
    }, action === "release" ? "Đã Release Dispatch." : "Đã tạo Dispatch Draft.");
  }

  async function loadReport(selectedOperationId = reportOperationId) {
    await run(async () => {
      const params = new URLSearchParams({ date: reportDate });
      if (selectedOperationId) params.set("operationId", selectedOperationId);

      const result = await jsonFetch(`/api/production-report?${params.toString()}`);
      setReportOperations(result.operations ?? []);

      const resolvedId =
        selectedOperationId || result.operations?.[0]?.id || "";

      if (!selectedOperationId && resolvedId) {
        setReportOperationId(resolvedId);
        return;
      }

      setReportRows(result.rows ?? []);
    });
  }

  async function saveReport(row: ReportRow) {
    const input = reportInputs[row.dispatchItemId] ?? { good: 0, ng: 0 };

    await run(async () => {
      const result = await jsonFetch("/api/production-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate,
          operationId: reportOperationId,
          dispatchItemId: row.dispatchItemId,
          productionOrderId: row.productionOrderId,
          goodQty: Number(input.good || 0),
          ngQty: Number(input.ng || 0),
        }),
      });

      setReportRows(result.rows ?? []);
      setReportInputs((current) => ({
        ...current,
        [row.dispatchItemId]: { good: 0, ng: 0 },
      }));
    }, "Đã cập nhật Good / NG.");
  }

  async function loadTracking() {
    await run(async () => {
      const result = await jsonFetch("/api/order-tracking");
      setTrackingRows(result.rows ?? []);
      if (!trackingId && result.rows?.[0]?.id) {
        setTrackingId(result.rows[0].id);
      }
    });
  }

  function next() {
    setMessage("");
    setCurrent((value) => Math.min(TOTAL_STEPS - 1, value + 1));
  }

  function previous() {
    setMessage("");
    setCurrent((value) => Math.max(0, value - 1));
  }

  return (
    <AppShell>
      <main className="min-h-[calc(100vh-64px)] bg-slate-100 p-3 sm:p-5">
        <section className="mx-auto max-w-[1700px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <header className="border-b border-slate-200 px-4 py-4 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
                  Lập kế hoạch từng bước
                </p>
                <h1 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
                  Toàn bộ quy trình trong một workspace
                </h1>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Một workspace khép kín: Đơn → LSX → Lô → Material/Set/Bottleneck/Smart Plan → Dispatch → Xưởng → Theo dõi.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Tiến độ
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  Bước {current + 1}/{TOTAL_STEPS}
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto pb-1">
              <div className="relative min-w-[760px]">
                <div className="absolute left-5 right-5 top-4 h-1 rounded-full bg-slate-200" />
                <div
                  className="absolute left-5 top-4 h-1 rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `calc(${(current / (TOTAL_STEPS - 1)) * 100}% - ${
                      current === 0 ? 0 : 40
                    }px)`,
                  }}
                />

                <div className="relative flex justify-between">
                  {stepTitles.map((title, index) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => setCurrent(index)}
                      className="flex w-[110px] flex-col items-center"
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-extrabold ${
                          index < current
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : index === current
                            ? "border-blue-600 bg-blue-600 text-white ring-4 ring-blue-100"
                            : "border-slate-300 bg-white text-slate-400"
                        }`}
                      >
                        {index < current ? "✓" : index + 1}
                      </span>
                      <span
                        className={`mt-2 text-center text-[10px] font-bold ${
                          index === current ? "text-blue-700" : "text-slate-500"
                        }`}
                      >
                        {title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          {message && (
            <div
              className={`mx-4 mt-4 rounded-lg border px-4 py-3 text-sm sm:mx-7 ${
                message.startsWith("Đã")
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <div className="min-h-[560px] p-4 sm:p-7">
            {current === 0 && (
              <StepOrders
                orders={pendingOrders}
                selectedIds={selectedOrderIds}
                search={orderSearch}
                busy={busy}
                onSearch={setOrderSearch}
                onToggle={(id) =>
                  setSelectedOrderIds((currentIds) =>
                    currentIds.includes(id)
                      ? currentIds.filter((x) => x !== id)
                      : [...currentIds, id]
                  )
                }
                onToggleAll={() => {
                  const ids = pendingOrders.map((x) => x.id);
                  const allSelected =
                    ids.length > 0 &&
                    ids.every((id) => selectedOrderIds.includes(id));

                  setSelectedOrderIds(
                    allSelected
                      ? selectedOrderIds.filter((id) => !ids.includes(id))
                      : Array.from(new Set([...selectedOrderIds, ...ids]))
                  );
                }}
              />
            )}

            {current === 1 && (
              <StepProductionOrders
                selectedOrders={selectedOrders}
                totalRoots={rootByOrder.size}
                busy={busy}
                onCreate={createSelectedProductionOrders}
                onRefresh={loadOrdersAndProduction}
              />
            )}

            {current === 2 && (
              <StepLots
                roots={unassignedRoots}
                lots={lots}
                selectedIds={selectedRootIds}
                form={lotForm}
                busy={busy}
                onForm={setLotForm}
                onToggle={(id) =>
                  setSelectedRootIds((currentIds) =>
                    currentIds.includes(id)
                      ? currentIds.filter((x) => x !== id)
                      : [...currentIds, id]
                  )
                }
                onCreate={createLot}
                onRelease={releaseLot}
                onRefresh={loadLots}
              />
            )}

            {current === 3 && (
              <StepAlerts
                alerts={alerts}
                kpi={planningKpi}
                bottlenecks={bottleneckLots}
                recommendations={smartRecommendations}
                busy={busy}
                onRefresh={loadAlerts}
              />
            )}

            {current === 4 && (
              <StepDispatch
                date={dispatchDate}
                operations={dispatchOperations}
                operationId={dispatchOperationId}
                metrics={dispatchMetrics}
                items={dispatchItems}
                header={dispatchHeader}
                busy={busy}
                onDate={setDispatchDate}
                onOperation={setDispatchOperationId}
                onAuto={() => dispatchAction("auto_generate")}
                onRelease={() => dispatchAction("release")}
                onRefresh={() => loadDispatch(dispatchOperationId)}
              />
            )}

            {current === 5 && (
              <StepShopFloor
                date={reportDate}
                operations={reportOperations}
                operationId={reportOperationId}
                rows={reportRows}
                inputs={reportInputs}
                busy={busy}
                onDate={setReportDate}
                onOperation={setReportOperationId}
                onInput={(itemId, field, value) =>
                  setReportInputs((currentInputs) => ({
                    ...currentInputs,
                    [itemId]: {
                      ...(currentInputs[itemId] ?? { good: 0, ng: 0 }),
                      [field]: value,
                    },
                  }))
                }
                onSave={saveReport}
                onRefresh={() => loadReport(reportOperationId)}
              />
            )}

            {current === 6 && (
              <StepTracking
                rows={trackingRows}
                selected={selectedTracking}
                search={trackingSearch}
                busy={busy}
                onSearch={setTrackingSearch}
                onSelect={setTrackingId}
                onRefresh={loadTracking}
              />
            )}
          </div>

          <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:px-7">
            <button
              type="button"
              disabled={current === 0 || busy}
              onClick={previous}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
            >
              ← Quay lại
            </button>

            <span className="text-xs font-bold text-slate-400">
              {current + 1} / {TOTAL_STEPS}
            </span>

            {current < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                disabled={busy}
                onClick={next}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-extrabold text-white disabled:opacity-40"
              >
                Tiếp tục →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrent(0)}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-extrabold text-white"
              >
                Hoàn tất • Làm lại
              </button>
            )}
          </footer>
        </section>
      </main>
    </AppShell>
  );
}

function StepTitle({
  no,
  title,
  description,
  action,
}: {
  no: number;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase text-blue-700">
          Bước {no}/7
        </span>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StepOrders({
  orders,
  selectedIds,
  search,
  busy,
  onSearch,
  onToggle,
  onToggleAll,
}: {
  orders: SalesOrder[];
  selectedIds: string[];
  search: string;
  busy: boolean;
  onSearch: (value: string) => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  return (
    <>
      <StepTitle
        no={1}
        title="Chọn đơn hàng cần sản xuất"
        description="Chọn trực tiếp trong workspace. Danh sách chỉ gồm đơn chưa có LSX Cha."
        action={
          <SummaryBox title="Đã chọn" value={selectedIds.length} />
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Tìm số đơn, đại lý, Model, màu..."
          className="h-10 min-w-[300px] flex-1 rounded-md border border-slate-300 px-3 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={onToggleAll}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold"
        >
          Chọn / bỏ tất cả
        </button>
      </div>

      <DataTable>
        <thead>
          <tr className="bg-slate-900 text-white">
            <Th>Chọn</Th>
            <Th>Đơn hàng</Th>
            <Th>Đại lý</Th>
            <Th>Ngày giao</Th>
            <Th>Model</Th>
            <Th>Màu</Th>
            <Th>SL</Th>
          </tr>
        </thead>
        <tbody>
          {orders.slice(0, 100).map((order) => (
            <tr key={order.id} className="border-t border-slate-200">
              <Td center>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(order.id)}
                  onChange={() => onToggle(order.id)}
                />
              </Td>
              <Td strong>{order.don_hang}</Td>
              <Td>{order.dai_ly}</Td>
              <Td center>{formatDate(order.ngay_giao)}</Td>
              <Td center>{order.model}</Td>
              <Td center>{order.mau}</Td>
              <Td center strong>{order.so_luong}</Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </>
  );
}

function StepProductionOrders({
  selectedOrders,
  totalRoots,
  busy,
  onCreate,
  onRefresh,
}: {
  selectedOrders: SalesOrder[];
  totalRoots: number;
  busy: boolean;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <StepTitle
        no={2}
        title="Tạo Lệnh sản xuất"
        description="Tạo LSX Cha → Cánh / Khung / Phào → WO theo Routing cho các đơn đã chọn ở Bước 1."
        action={
          <div className="flex gap-2">
            <SummaryBox title="LSX Cha hiện có" value={totalRoots} />
            <SummaryBox title="Chờ tạo" value={selectedOrders.length} />
          </div>
        }
      />

      {selectedOrders.length === 0 ? (
        <EmptyState text="Không còn đơn đang chờ tạo LSX. Nếu vừa tạo xong, bạn có thể Tiếp tục sang Lô sản xuất." />
      ) : (
        <>
          <DataTable>
            <thead>
              <tr className="bg-slate-900 text-white">
                <Th>Đơn hàng</Th>
                <Th>Đại lý</Th>
                <Th>Ngày giao</Th>
                <Th>Model</Th>
                <Th>Màu</Th>
                <Th>SL</Th>
              </tr>
            </thead>
            <tbody>
              {selectedOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-200">
                  <Td strong>{order.don_hang}</Td>
                  <Td>{order.dai_ly}</Td>
                  <Td center>{formatDate(order.ngay_giao)}</Td>
                  <Td center>{order.model}</Td>
                  <Td center>{order.mau}</Td>
                  <Td center strong>{order.so_luong}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCreate}
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
            >
              Tạo {selectedOrders.length} LSX
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onRefresh}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold"
            >
              Tải lại
            </button>
          </div>
        </>
      )}
    </>
  );
}

function StepLots({
  roots,
  lots,
  selectedIds,
  form,
  busy,
  onForm,
  onToggle,
  onCreate,
  onRelease,
  onRefresh,
}: {
  roots: LotRoot[];
  lots: Lot[];
  selectedIds: string[];
  form: {
    lotName: string;
    productionDate: string;
    targetDeliveryDate: string;
    priority: number;
  };
  busy: boolean;
  onForm: (value: any) => void;
  onToggle: (id: string) => void;
  onCreate: () => void;
  onRelease: (lotId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <StepTitle
        no={3}
        title="Gom LSX thành Lô sản xuất"
        description="Chọn LSX Cha đã tạo, gom thành Production Lot rồi Release ngay trong cùng bước."
        action={
          <div className="flex gap-2">
            <SummaryBox title="LSX chưa vào lô" value={roots.length} />
            <SummaryBox title="Lô hiện có" value={lots.length} />
          </div>
        }
      />

      <div className="mb-5 grid gap-3 lg:grid-cols-4">
        <input
          value={form.lotName}
          onChange={(e) => onForm({ ...form, lotName: e.target.value })}
          placeholder="Tên Lô"
          className={inputClass}
        />
        <input
          type="date"
          value={form.productionDate}
          onChange={(e) =>
            onForm({ ...form, productionDate: e.target.value })
          }
          className={inputClass}
        />
        <input
          type="date"
          value={form.targetDeliveryDate}
          onChange={(e) =>
            onForm({ ...form, targetDeliveryDate: e.target.value })
          }
          className={inputClass}
        />
        <input
          type="number"
          value={form.priority}
          onChange={(e) =>
            onForm({ ...form, priority: Number(e.target.value) })
          }
          className={inputClass}
          placeholder="Priority"
        />
      </div>

      <DataTable>
        <thead>
          <tr className="bg-slate-900 text-white">
            <Th>Chọn</Th>
            <Th>LSX</Th>
            <Th>Đơn hàng</Th>
            <Th>Đại lý</Th>
            <Th>Ngày giao</Th>
            <Th>Model</Th>
            <Th>Màu</Th>
            <Th>SL</Th>
          </tr>
        </thead>
        <tbody>
          {roots.slice(0, 100).map((root) => (
            <tr key={root.productionOrderId} className="border-t border-slate-200">
              <Td center>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(root.productionOrderId)}
                  onChange={() => onToggle(root.productionOrderId)}
                />
              </Td>
              <Td strong>{root.productionNo}</Td>
              <Td strong>{root.orderNo}</Td>
              <Td>{root.dealer}</Td>
              <Td center>{formatDate(root.dueDate)}</Td>
              <Td center>{root.model}</Td>
              <Td center>{root.color}</Td>
              <Td center strong>{root.quantity}</Td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || selectedIds.length === 0}
          onClick={onCreate}
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
        >
          Tạo Lô với {selectedIds.length} LSX
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold"
        >
          Tải lại
        </button>
      </div>

      {lots.length > 0 && (
        <div className="mt-6 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {lots.slice(0, 9).map((lot) => (
            <div
              key={lot.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="text-slate-900">{lot.lotNo}</strong>
                <StatusPill value={lot.status} />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {lot.totalOrders} LSX • {lot.totalQty} bộ • Đủ Bộ{" "}
                {lot.fullSetReady}/{lot.totalQty}
              </div>
              {lot.status === "DRAFT" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRelease(lot.id)}
                  className="mt-3 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                  Release Lô
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StepAlerts({
  alerts,
  kpi,
  bottlenecks,
  recommendations,
  busy,
  onRefresh,
}: {
  alerts: PlanningAlert[];
  kpi: PlanningKpi | null;
  bottlenecks: BottleneckLot[];
  recommendations: SmartRecommendation[];
  busy: boolean;
  onRefresh: () => void;
}) {
  return (
    <>
      <StepTitle
        no={4}
        title="Kiểm tra sẵn sàng & tối ưu kế hoạch"
        description="Trước khi Dispatch, ERP kiểm tra Material Readiness, Set Readiness, Bottleneck, Quality Hold, Capacity Load và Smart Recommendation trong cùng workspace."
        action={
          <button
            type="button"
            disabled={busy}
            onClick={onRefresh}
            className="rounded-md border border-slate-300 px-4 py-2 text-xs font-bold"
          >
            Tính lại kế hoạch
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <SummaryBox title="Material Ready" value={kpi?.materialReady ?? 0} />
        <SummaryBox title="Material Shortage" value={kpi?.materialShortage ?? 0} />
        <SummaryBox title="Set Ready" value={kpi?.setReadyQty ?? 0} />
        <SummaryBox title="Set Gap" value={kpi?.setGapQty ?? 0} />
        <SummaryBox title="Quality Hold" value={kpi?.qualityHold ?? 0} />
        <SummaryBox title="WO Overload" value={kpi?.overloadedWorkCenters ?? 0} />
        <SummaryBox title="Smart đề xuất" value={kpi?.recommendationCount ?? 0} />
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="font-bold text-slate-900">Bottleneck theo Lô</div>
          <p className="mt-1 text-xs text-slate-500">
            Ưu tiên nơi làm tăng số Set Ready, không chỉ nơi còn dư Capacity.
          </p>
          <div className="mt-3 space-y-2">
            {bottlenecks.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-400">
                Chưa phát hiện Lô có Set Gap đáng chú ý.
              </div>
            )}
            {bottlenecks.map((lot) => (
              <div key={lot.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong>{lot.lotNo}</strong>
                  <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
                    {lot.bottleneckBranch}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Set Ready {lot.setReady}/{lot.totalQty} • Gap {lot.setGap}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="font-bold text-slate-900">Smart Planning đề xuất</div>
          <p className="mt-1 text-xs text-slate-500">
            Score dựa trên ngày giao + Priority Lô + Material + Bottleneck; SL đề xuất luôn bị giới hạn bởi Capacity còn lại.
          </p>
          <div className="mt-3 space-y-2">
            {recommendations.length === 0 && (
              <div className="rounded-lg border border-dashed border-blue-200 bg-white p-5 text-center text-xs text-slate-400">
                Chưa có đề xuất phù hợp.
              </div>
            )}
            {recommendations.map((item, index) => (
              <div key={`${item.rootId}-${item.branch}`} className="rounded-lg border border-blue-100 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm">
                    #{index + 1} {item.productionNo} • {item.woCode}
                  </strong>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
                    Score {item.score}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.orderNo} • {item.branch} • đề xuất {item.recommendedQty} bộ
                </div>
                <div className="mt-1 text-[10px] text-slate-400">{item.reason}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="font-bold text-slate-900">Planning Exceptions</div>
          <div className="mt-1 text-xs text-slate-500">
            Material Shortage / Quality Hold / Set Gap / Overload / Delivery Risk phải được nhìn thấy trước khi Release.
          </div>
        </div>

        {alerts.length === 0 ? (
          <EmptyState text="Không có cảnh báo đáng chú ý." />
        ) : (
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {alerts.slice(0, 16).map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 ${
                  alert.level === "CRITICAL"
                    ? "border-red-200 bg-red-50"
                    : alert.level === "WARNING"
                    ? "border-amber-200 bg-amber-50"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase">
                    {alert.level === "CRITICAL" ? "Cần xử lý" : alert.level === "WARNING" ? "Theo dõi" : "Thông tin"}
                  </span>
                  <strong>{alert.metric}</strong>
                </div>
                <div className="mt-2 font-bold text-slate-900">{alert.title}</div>
                <div className="mt-1 text-sm text-slate-600">{alert.message}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function StepDispatch({
  date,
  operations,
  operationId,
  metrics,
  items,
  header,
  busy,
  onDate,
  onOperation,
  onAuto,
  onRelease,
  onRefresh,
}: {
  date: string;
  operations: DispatchOperation[];
  operationId: string;
  metrics: DispatchMetrics | null;
  items: DispatchItem[];
  header: any;
  busy: boolean;
  onDate: (value: string) => void;
  onOperation: (value: string) => void;
  onAuto: () => void;
  onRelease: () => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <StepTitle
        no={5}
        title="Điều độ sản xuất"
        description="Sau Smart Plan, Dispatch thực thi theo một công thức thống nhất: Carry Over → Capacity còn lại → WIP Buffer → Eligible → Priority; planner kiểm tra rồi mới Release xuống xưởng."
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
        <input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className={inputClass}
        />
        <select
          value={operationId}
          onChange={(e) => onOperation(e.target.value)}
          className={inputClass}
        >
          {operations.map((op) => (
            <option key={op.id} value={op.id}>
              {op.wo_code} - {op.operation_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="rounded-md border border-slate-300 px-4 py-2 text-xs font-bold"
        >
          Tải lại
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryBox title="Capacity còn lại" value={metrics?.capacityRemaining ?? 0} />
        <SummaryBox title="Carry Over" value={metrics?.carryOver ?? 0} />
        <SummaryBox title="WIP hiện tại" value={metrics?.wipCurrent ?? 0} />
        <SummaryBox title="WIP Target" value={metrics?.wipTarget ?? 0} />
        <SummaryBox title="Thiếu đến Target" value={metrics?.wipNeedToTarget ?? 0} />
        <SummaryBox title="Auto Dispatch đề xuất" value={metrics?.autoDispatchLimit ?? 0} />
      </div>

      <DataTable>
        <thead>
          <tr className="bg-slate-900 text-white">
            <Th>STT</Th>
            <Th>LSX</Th>
            <Th>Đơn</Th>
            <Th>Khách hàng</Th>
            <Th>Ngày giao</Th>
            <Th>Màu</Th>
            <Th>SL</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="border-t border-slate-200">
              <Td center>{index + 1}</Td>
              <Td strong>{item.productionNo}</Td>
              <Td strong>{item.orderNo}</Td>
              <Td>{item.dealer}</Td>
              <Td center>{formatDate(item.dueDate)}</Td>
              <Td center>{item.color}</Td>
              <Td center strong>{item.quantity}</Td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="p-10 text-center text-sm text-slate-400">
                Dispatch Draft chưa có LSX.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !operationId || header?.status === "RELEASED"}
          onClick={onAuto}
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
        >
          Tạo Auto Dispatch
        </button>
        <button
          type="button"
          disabled={
            busy ||
            !header ||
            header?.status !== "DRAFT" ||
            items.length === 0
          }
          onClick={onRelease}
          className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
        >
          Release Dispatch
        </button>
        <StatusPill value={header?.status ?? "CHƯA TẠO"} />
      </div>
    </>
  );
}

function StepShopFloor({
  date,
  operations,
  operationId,
  rows,
  inputs,
  busy,
  onDate,
  onOperation,
  onInput,
  onSave,
  onRefresh,
}: {
  date: string;
  operations: ReportOperation[];
  operationId: string;
  rows: ReportRow[];
  inputs: Record<string, { good: number; ng: number }>;
  busy: boolean;
  onDate: (value: string) => void;
  onOperation: (value: string) => void;
  onInput: (
    itemId: string,
    field: "good" | "ng",
    value: number
  ) => void;
  onSave: (row: ReportRow) => void;
  onRefresh: () => void;
}) {
  const totals = rows.reduce(
    (acc, row) => ({
      dispatch: acc.dispatch + row.dispatchQty,
      good: acc.good + row.goodTotal,
      remain: acc.remain + row.remain,
    }),
    { dispatch: 0, good: 0, remain: 0 }
  );

  return (
    <>
      <StepTitle
        no={6}
        title="Thực thi xưởng & phản hồi chất lượng"
        description="Xem Dispatch Released, nhập Good / NG. Remain sẽ Carry Over; các Quality Hold mở sẽ xuất hiện ở bước kiểm tra kế hoạch để chặn đề xuất tiếp theo."
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
        <input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className={inputClass}
        />
        <select
          value={operationId}
          onChange={(e) => onOperation(e.target.value)}
          className={inputClass}
        >
          {operations.map((op) => (
            <option key={op.id} value={op.id}>
              {op.wo_code} - {op.operation_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="rounded-md border border-slate-300 px-4 py-2 text-xs font-bold"
        >
          Tải lại
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <SummaryBox title="Dispatch" value={totals.dispatch} />
        <SummaryBox title="Good" value={totals.good} />
        <SummaryBox title="Remain" value={totals.remain} />
      </div>

      <DataTable>
        <thead>
          <tr className="bg-slate-900 text-white">
            <Th>LSX</Th>
            <Th>Đơn</Th>
            <Th>Khách hàng</Th>
            <Th>Dispatch</Th>
            <Th>Good</Th>
            <Th>Remain</Th>
            <Th>Good hôm nay</Th>
            <Th>NG hôm nay</Th>
            <Th>Lưu</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const input = inputs[row.dispatchItemId] ?? { good: 0, ng: 0 };

            return (
              <tr key={row.dispatchItemId} className="border-t border-slate-200">
                <Td strong>{row.productionNo}</Td>
                <Td strong>{row.orderNo}</Td>
                <Td>{row.dealer}</Td>
                <Td center>{row.dispatchQty}</Td>
                <Td center>{row.goodTotal}</Td>
                <Td center strong>{row.remain}</Td>
                <Td center>
                  <input
                    type="number"
                    min="0"
                    max={row.remain}
                    value={input.good}
                    onChange={(e) =>
                      onInput(row.dispatchItemId, "good", Number(e.target.value))
                    }
                    className="h-9 w-20 rounded-md border border-slate-300 px-2 text-right"
                  />
                </Td>
                <Td center>
                  <input
                    type="number"
                    min="0"
                    value={input.ng}
                    onChange={(e) =>
                      onInput(row.dispatchItemId, "ng", Number(e.target.value))
                    }
                    className="h-9 w-20 rounded-md border border-slate-300 px-2 text-right"
                  />
                </Td>
                <Td center>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSave(row)}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                  >
                    Lưu
                  </button>
                </Td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="p-10 text-center text-sm text-slate-400">
                Chưa có Dispatch Released cho WO này.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </>
  );
}

function StepTracking({
  rows,
  selected,
  search,
  busy,
  onSearch,
  onSelect,
  onRefresh,
}: {
  rows: TrackingRow[];
  selected: TrackingRow | null;
  search: string;
  busy: boolean;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  const filtered = rows
    .filter((row) => {
      const key = search.trim().toLowerCase();
      if (!key) return true;
      return [row.orderNo, row.dealer, row.productionNo, row.lotNo].some((value) =>
        String(value ?? "").toLowerCase().includes(key)
      );
    })
    .slice(0, 50);

  return (
    <>
      <StepTitle
        no={7}
        title="Theo dõi kết quả"
        description="Tra cứu đơn hàng và xem timeline tiến độ ngay trong bước cuối."
        action={
          <button
            type="button"
            disabled={busy}
            onClick={onRefresh}
            className="rounded-md border border-slate-300 px-4 py-2 text-xs font-bold"
          >
            Tải lại
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
        <div>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Tìm đơn, khách hàng, LSX, Lô..."
            className="mb-3 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
          />

          <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-200">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row.id)}
                className={`block w-full border-b border-slate-100 p-3 text-left ${
                  selected?.id === row.id ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <strong>{row.orderNo}</strong>
                  <span className="text-xs font-bold text-blue-700">
                    {row.overallPercent}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {row.dealer} • {row.productionNo || "Chưa LSX"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-slate-400">
                  {selected.lotNo || "Chưa vào Lô"}
                </div>
                <h3 className="mt-1 text-2xl font-extrabold text-slate-900">
                  {selected.orderNo}
                </h3>
                <div className="mt-1 text-sm text-slate-500">
                  {selected.dealer} • {selected.quantity} bộ • Giao{" "}
                  {formatDate(selected.dueDate)}
                </div>
              </div>
              <StatusPill value={selected.systemStatus} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ProgressCard title="Cánh" value={selected.canh.percent} wo={selected.canh.currentWo} />
              <ProgressCard title="Khung" value={selected.khung.percent} wo={selected.khung.currentWo} />
              <ProgressCard title="Phào" value={selected.phao.percent} wo={selected.phao.currentWo} />
              <ProgressCard
                title="Đủ Bộ"
                value={selected.fullSetReady ? 100 : 0}
                wo={selected.fullSetReady ? "READY" : "CHỜ"}
              />
            </div>

            <div className="mt-5">
              <Timeline selected={selected} />
            </div>
          </div>
        ) : (
          <EmptyState text="Chọn một đơn hàng để xem Timeline." />
        )}
      </div>
    </>
  );
}

function Timeline({ selected }: { selected: TrackingRow }) {
  const steps = [
    ["Đơn hàng", true],
    ["LSX", Boolean(selected.productionNo)],
    ["Lô", Boolean(selected.lotNo)],
    ["Cánh", selected.canh.percent >= 100],
    ["Khung", selected.khung.percent >= 100],
    ["Phào", selected.phao.percent >= 100],
    ["Đủ Bộ", selected.fullSetReady],
    ["Công đoạn chung", selected.commonCurrentWo !== "-"],
    ["Hoàn thành", selected.rootStatus === "COMPLETED"],
  ] as const;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[900px] items-start">
        {steps.map(([title, done], index) => (
          <div key={title} className="relative flex flex-1 flex-col items-center">
            {index < steps.length - 1 && (
              <div className="absolute left-1/2 top-4 h-0.5 w-full bg-slate-300" />
            )}
            <div
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-extrabold ${
                done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300 bg-white text-slate-400"
              }`}
            >
              {done ? "✓" : index + 1}
            </div>
            <div className="mt-2 text-center text-[10px] font-bold text-slate-600">
              {title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressCard({
  title,
  value,
  wo,
}: {
  title: string;
  value: number;
  wo: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm">{title}</strong>
        <span className="text-xs font-bold text-blue-700">{wo}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <div className="mt-2 text-right text-xs font-bold text-slate-600">{value}%</div>
    </div>
  );
}

function SummaryBox({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="min-w-[120px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[9px] font-bold uppercase text-slate-400">{title}</div>
      <div className="mt-1 text-lg font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-h-[430px] overflow-auto rounded-xl border border-slate-200">
      <table className="min-w-[900px] w-full text-sm">{children}</table>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-extrabold text-blue-700">
      {value || "-"}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-3 text-center text-xs font-bold">{children}</th>;
}

function Td({
  children,
  center = false,
  strong = false,
}: {
  children: React.ReactNode;
  center?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3 ${
        center ? "text-center" : ""
      } ${strong ? "font-bold text-slate-900" : "text-slate-700"}`}
    >
      {children}
    </td>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function formatDate(value: string) {
  if (!value) return "-";
  const p = value.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : value;
}
