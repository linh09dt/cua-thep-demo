"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type Branch = "CÁNH" | "KHUNG" | "PHÀO" | "ĐỦ BỘ";

type Operation = {
  id: string;
  wo_code: string;
  operation_code: string;
  operation_name: string;
  component_scope: string;
  stage_type: string;
  branch: Branch;
};

type Candidate = {
  productionOrderId: string;
  productionNo: string;
  quantity: number;
  orderNo: string;
  dealer: string;
  orderDate: string;
  dueDate: string;
  model: string;
  color: string;
  height: number;
  width: number;
};

type DispatchItem = {
  id: string;
  productionOrderId: string;
  sequenceNo: number;
  quantity: number;
  productionNo: string;
  orderNo: string;
  dealer: string;
  dueDate: string;
  model: string;
  color: string;
  height: number;
  width: number;
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

type Header = {
  id: string;
  dispatch_date: string;
  operation_id: string;
  component_type: Branch;
  status: "DRAFT" | "RELEASED" | "CANCELLED";
  capacity_value: number;
  planned_quantity: number;
};

const BRANCHES: Branch[] = ["CÁNH", "KHUNG", "PHÀO", "ĐỦ BỘ"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function DispatchPage() {
  const [branch, setBranch] = useState<Branch>("CÁNH");
  const [dispatchDate, setDispatchDate] = useState(today());
  const [operations, setOperations] = useState<Operation[]>([]);
  const [operationId, setOperationId] = useState("");

  const [header, setHeader] = useState<Header | null>(null);
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [eligible, setEligible] = useState<Candidate[]>([]);
  const [capacity, setCapacity] = useState(0);
  const [metrics, setMetrics] = useState<DispatchMetrics | null>(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    loadOperations();
  }, []);

  useEffect(() => {
    const branchOps = operations.filter((item) => item.branch === branch);

    if (
      branchOps.length > 0 &&
      !branchOps.some((item) => item.id === operationId)
    ) {
      setOperationId(branchOps[0].id);
    }
  }, [branch, operations, operationId]);

  useEffect(() => {
    if (operationId) {
      loadScreen();
    }
  }, [dispatchDate, operationId]);

  async function loadOperations() {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/dispatch?date=${encodeURIComponent(dispatchDate)}`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải WO.");
      }

      setOperations(result.operations ?? []);

      const first = (result.operations ?? []).find(
        (item: Operation) => item.branch === "CÁNH"
      );

      if (first) setOperationId(first.id);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể tải WO."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadScreen() {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/dispatch?date=${encodeURIComponent(
          dispatchDate
        )}&operationId=${encodeURIComponent(operationId)}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải Điều độ.");
      }

      setHeader(result.header ?? null);
      setItems(result.items ?? []);
      setEligible(result.eligible ?? []);
      setCapacity(Number(result.capacity ?? 0));
      setMetrics(result.metrics ?? null);
      setMetrics(result.metrics ?? null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể tải Điều độ."
      );
    } finally {
      setLoading(false);
    }
  }

  async function doAction(
    action: string,
    extra: Record<string, unknown> = {}
  ) {
    if (!operationId) return;

    setWorking(true);
    setMessage("");

    try {
      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          dispatchDate,
          operationId,
          ...extra,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể xử lý Điều độ.");
      }

      setHeader(result.header ?? null);
      setItems(result.items ?? []);
      setEligible(result.eligible ?? []);
      setCapacity(Number(result.capacity ?? 0));
      setMetrics(result.metrics ?? null);
      setMetrics(result.metrics ?? null);

      if (action === "auto_generate") {
        setMessage("Đã tự động tạo Dispatch Draft theo Priority + Capacity.");
      } else if (action === "release") {
        setMessage("Đã Release Dispatch.");
      } else if (action === "add_item") {
        setMessage("Đã thêm LSX vào Draft.");
      } else if (action === "remove_item") {
        setMessage("Đã bỏ LSX khỏi Draft.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể xử lý Điều độ."
      );
    } finally {
      setWorking(false);
    }
  }

  const branchOperations = useMemo(
    () => operations.filter((item) => item.branch === branch),
    [operations, branch]
  );

  const selectedOperation = useMemo(
    () => operations.find((item) => item.id === operationId),
    [operations, operationId]
  );

  const planned = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items]
  );

  const remaining = Math.max(0, capacity - planned);
  const loadPercent =
    capacity > 0 ? Math.round((planned / capacity) * 100) : 0;

  const isReleased = header?.status === "RELEASED";

  return (
    <AppShell>
      <main className="mx-auto max-w-[1750px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Dispatch
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Điều độ sản xuất
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tách riêng Cánh / Khung / Phào và luồng Đủ Bộ. WO14 chỉ nhận bộ đã hoàn thành đủ 3 nhánh; các WO sau tiếp tục theo Routing chung.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {BRANCHES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setBranch(item)}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold ${
                branch === item
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Điều độ {toTitle(item)}
            </button>
          ))}
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[220px_1fr_auto_auto]">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Ngày điều độ
              </span>
              <input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Công đoạn
              </span>
              <select
                value={operationId}
                onChange={(e) => setOperationId(e.target.value)}
                className={inputClass}
              >
                {branchOperations.map((operation) => (
                  <option key={operation.id} value={operation.id}>
                    {operation.wo_code} - {operation.operation_name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => doAction("auto_generate")}
                disabled={working || isReleased || !operationId}
                className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Tự động điều độ
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => doAction("release")}
                disabled={working || isReleased || items.length === 0}
                className="h-11 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                Release Dispatch
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Summary title="WO" value={selectedOperation?.wo_code ?? "-"} />
            <Summary title="Capacity hiệu dụng" value={capacity} />
            <Summary
              title="Capacity còn lại"
              value={metrics?.capacityRemaining ?? remaining}
            />
            <Summary
              title="WIP hiện tại"
              value={`${metrics?.wipCurrent ?? 0} ${
                metrics?.unitName ?? "bộ"
              }`}
            />
            <Summary
              title="Đề xuất Auto Dispatch"
              value={`${metrics?.autoDispatchLimit ?? 0} ${
                metrics?.unitName ?? "bộ"
              }`}
              warning={(metrics?.wipStatus ?? "") === "OVER_MAX"}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Summary
              title="WIP Min"
              value={`${metrics?.wipMin ?? 0} ${metrics?.unitName ?? "bộ"}`}
            />
            <Summary
              title="WIP Target"
              value={`${metrics?.wipTarget ?? 0} ${
                metrics?.unitName ?? "bộ"
              }`}
            />
            <Summary
              title="WIP Max"
              value={`${metrics?.wipMax ?? 0} ${metrics?.unitName ?? "bộ"}`}
            />
            <Summary
              title="Thiếu đến Target"
              value={`${metrics?.wipNeedToTarget ?? 0} ${
                metrics?.unitName ?? "bộ"
              }`}
            />
            <Summary
              title="Draft hiện tại"
              value={`${planned} ${metrics?.unitName ?? "bộ"}`}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span
              className={`rounded-full px-3 py-1 font-bold ${
                isReleased
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {header?.status ?? "CHƯA TẠO DRAFT"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
              {toTitle(branch)}
            </span>
            {metrics && (
              <span
                className={`rounded-full px-3 py-1 font-bold ${wipStatusClass(
                  metrics.wipStatus
                )}`}
              >
                {wipStatusLabel(metrics.wipStatus)}
              </span>
            )}
          </div>
        </section>

        {message && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">Dispatch Draft</h2>
              <p className="mt-1 text-xs text-slate-500">
                Thứ tự đã được tạo theo Priority của WO. Auto Dispatch không
                tách một LSX thành nhiều phần.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <Th>ƯT</Th>
                    <Th>LSX</Th>
                    <Th>Đơn hàng</Th>
                    <Th>Đại lý</Th>
                    <Th>Model</Th>
                    <Th>Màu</Th>
                    <Th>Kích thước</Th>
                    <Th>SL</Th>
                    <Th>Ngày giao</Th>
                    <Th>Thao tác</Th>
                  </tr>
                </thead>

                <tbody>
                  {!loading && items.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-12 text-center text-slate-400"
                      >
                        Chưa có Dispatch Draft.
                      </td>
                    </tr>
                  )}

                  {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <Td center strong>
                        {index + 1}
                      </Td>
                      <Td strong>{item.productionNo}</Td>
                      <Td>{item.orderNo}</Td>
                      <Td>{item.dealer}</Td>
                      <Td center>{item.model}</Td>
                      <Td center>{item.color}</Td>
                      <Td center>
                        {item.height} × {item.width}
                      </Td>
                      <Td center strong>
                        {item.quantity}
                      </Td>
                      <Td center>{formatDate(item.dueDate)}</Td>
                      <Td center>
                        <button
                          type="button"
                          onClick={() =>
                            doAction("remove_item", { itemId: item.id })
                          }
                          disabled={working || isReleased}
                          className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-30"
                        >
                          Bỏ
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                LSX đủ điều kiện
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {branch === "ĐỦ BỘ"
                  ? "WO14 chỉ xuất hiện khi Cánh + Khung + Phào đã COMPLETED. WO15-WO20 chỉ xuất hiện khi WO chung trước đã COMPLETED."
                  : "WO đầu nhánh vào trực tiếp. WO sau được Eligible khi Dispatch của WO trước đã RELEASED; lượng Auto Dispatch được giới hạn bởi WIP Target và Capacity."}
              </p>
            </div>

            <div className="max-h-[650px] divide-y divide-slate-200 overflow-auto">
              {eligible.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-slate-400">
                  Không có LSX đủ điều kiện.
                </div>
              )}

              {eligible.map((candidate) => (
                <div
                  key={candidate.productionOrderId}
                  className="p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">
                        {candidate.productionNo}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {candidate.orderNo} • {candidate.model} •{" "}
                        {candidate.color}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Giao {formatDate(candidate.dueDate)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900">
                        SL {candidate.quantity}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          doAction("add_item", {
                            productionOrderId:
                              candidate.productionOrderId,
                          })
                        }
                        disabled={working || isReleased}
                        className="mt-2 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-30"
                      >
                        + Thêm
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Summary({
  title,
  value,
  warning = false,
}: {
  title: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        warning
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div
        className={`mt-1 text-xl font-bold ${
          warning ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap border-r border-slate-700 px-3 py-3 text-center text-xs font-bold uppercase">
      {children}
    </th>
  );
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
      className={`border-r border-slate-200 px-3 py-3 ${
        center ? "text-center" : ""
      } ${strong ? "font-semibold text-slate-900" : "text-slate-700"}`}
    >
      {children}
    </td>
  );
}

function formatDate(value: string) {
  if (!value) return "-";

  const parts = value.split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function wipStatusLabel(
  status: DispatchMetrics["wipStatus"]
) {
  if (status === "DISABLED") return "WIP chưa bật";
  if (status === "LOW") return "Thiếu WIP";
  if (status === "BELOW_TARGET") return "Đang bù WIP";
  if (status === "TARGET") return "Đạt WIP Target";
  if (status === "NEAR_MAX") return "WIP gần Max";
  return "WIP vượt Max";
}

function wipStatusClass(
  status: DispatchMetrics["wipStatus"]
) {
  if (status === "LOW") return "bg-red-100 text-red-700";
  if (status === "BELOW_TARGET")
    return "bg-amber-100 text-amber-700";
  if (status === "TARGET")
    return "bg-emerald-100 text-emerald-700";
  if (status === "NEAR_MAX")
    return "bg-orange-100 text-orange-700";
  if (status === "OVER_MAX")
    return "bg-red-200 text-red-800";
  return "bg-slate-100 text-slate-600";
}

function toTitle(value: Branch) {
  if (value === "CÁNH") return "Cánh";
  if (value === "KHUNG") return "Khung";
  if (value === "PHÀO") return "Phào";
  return "Đủ Bộ";
}
