"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type Branch = "CÁNH" | "KHUNG" | "PHÀO";

type Operation = {
  id: string;
  wo_code: string;
  operation_code: string;
  operation_name: string;
  component_scope: string;
  branch: Branch;
};

type ReportRow = {
  dispatchItemId: string;
  productionOrderId: string;
  productionNo: string;
  productionStatus: string;
  componentType: string;
  woCode: string;
  operationName: string;
  orderNo: string;
  dealer: string;
  dueDate: string;
  model: string;
  color: string;
  dispatchQty: number;
  goodTotal: number;
  ngTotal: number;
  remain: number;
};

const BRANCHES: Branch[] = ["CÁNH", "KHUNG", "PHÀO"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProductionReportPage() {
  const [branch, setBranch] = useState<Branch>("CÁNH");
  const [reportDate, setReportDate] = useState(today());

  const [operations, setOperations] = useState<Operation[]>([]);
  const [operationId, setOperationId] = useState("");

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [inputs, setInputs] = useState<
    Record<string, { good: string; ng: string }>
  >({});

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadOperations();
  }, []);

  useEffect(() => {
    const branchOps = operations.filter(
      (item) => item.branch === branch
    );

    if (
      branchOps.length > 0 &&
      !branchOps.some((item) => item.id === operationId)
    ) {
      setOperationId(branchOps[0].id);
    }
  }, [branch, operations, operationId]);

  useEffect(() => {
    if (operationId) loadRows();
  }, [reportDate, operationId]);

  async function loadOperations() {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/production-report?date=${encodeURIComponent(reportDate)}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể tải công đoạn."
        );
      }

      setOperations(result.operations ?? []);

      const first = (result.operations ?? []).find(
        (item: Operation) => item.branch === "CÁNH"
      );

      if (first) setOperationId(first.id);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải công đoạn."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadRows() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/production-report?date=${encodeURIComponent(
          reportDate
        )}&operationId=${encodeURIComponent(operationId)}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể tải báo cáo."
        );
      }

      setRows(result.rows ?? []);

      const nextInputs: Record<
        string,
        { good: string; ng: string }
      > = {};

      for (const row of result.rows ?? []) {
        nextInputs[row.dispatchItemId] = {
          good: "",
          ng: "",
        };
      }

      setInputs(nextInputs);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải báo cáo."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveRow(row: ReportRow) {
    const input = inputs[row.dispatchItemId] ?? {
      good: "",
      ng: "",
    };

    const good = Number(input.good || 0);
    const ng = Number(input.ng || 0);

    if (good < 0 || ng < 0) {
      setMessage("Good/NG không hợp lệ.");
      return;
    }

    if (good > row.remain) {
      setMessage(
        `Good vượt Remain. Còn lại ${row.remain}.`
      );
      return;
    }

    setSavingId(row.dispatchItemId);
    setMessage("");

    try {
      const response = await fetch("/api/production-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportDate,
          operationId,
          dispatchItemId: row.dispatchItemId,
          productionOrderId: row.productionOrderId,
          goodQty: good,
          ngQty: ng,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể lưu báo cáo."
        );
      }

      setRows(result.rows ?? []);

      setInputs((current) => ({
        ...current,
        [row.dispatchItemId]: {
          good: "",
          ng: "",
        },
      }));

      setMessage(
        `Đã lưu báo cáo ${row.productionNo}.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu báo cáo."
      );
    } finally {
      setSavingId(null);
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

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.dispatch += Number(row.dispatchQty || 0);
        acc.good += Number(row.goodTotal || 0);
        acc.ng += Number(row.ngTotal || 0);
        acc.remain += Number(row.remain || 0);
        return acc;
      },
      {
        dispatch: 0,
        good: 0,
        ng: 0,
        remain: 0,
      }
    );
  }, [rows]);

  return (
    <AppShell>
      <main className="mx-auto max-w-[1750px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Daily Report
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Báo cáo sản xuất
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Báo cáo trên Dispatch đã Release. Khi Remain = 0,
            WO hoàn thành và WO kế tiếp đủ điều kiện Điều độ.
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
              Báo cáo {toTitle(item)}
            </button>
          ))}
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[220px_1fr_auto]">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Ngày báo cáo
              </span>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
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
                onClick={loadRows}
                disabled={loading || !operationId}
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                {loading ? "Đang tải..." : "Tải lại"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Summary
              title="WO"
              value={selectedOperation?.wo_code ?? "-"}
            />
            <Summary
              title="SL Dispatch"
              value={totals.dispatch}
            />
            <Summary title="Good" value={totals.good} />
            <Summary title="NG" value={totals.ng} />
            <Summary title="Remain" value={totals.remain} />
          </div>
        </section>

        {message && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">
              Dispatch đã Release
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Good được cộng dồn theo ngày. Không cho báo vượt Remain.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1350px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <Th>STT</Th>
                  <Th>LSX</Th>
                  <Th>Đơn hàng</Th>
                  <Th>Đại lý</Th>
                  <Th>Model</Th>
                  <Th>Màu</Th>
                  <Th>Ngày giao</Th>
                  <Th>SL Dispatch</Th>
                  <Th>Good tổng</Th>
                  <Th>NG tổng</Th>
                  <Th>Remain</Th>
                  <Th>Good hôm nay</Th>
                  <Th>NG hôm nay</Th>
                  <Th>Lưu</Th>
                </tr>
              </thead>

              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      Chưa có Dispatch đã Release cho WO này.
                    </td>
                  </tr>
                )}

                {rows.map((row, index) => {
                  const done = row.remain === 0;

                  return (
                    <tr
                      key={row.dispatchItemId}
                      className={`border-t border-slate-200 ${
                        done
                          ? "bg-emerald-50/50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <Td center>{index + 1}</Td>
                      <Td strong>{row.productionNo}</Td>
                      <Td>{row.orderNo}</Td>
                      <Td>{row.dealer}</Td>
                      <Td center>{row.model}</Td>
                      <Td center>{row.color}</Td>
                      <Td center>{formatDate(row.dueDate)}</Td>
                      <Td center strong>
                        {row.dispatchQty}
                      </Td>
                      <Td center>{row.goodTotal}</Td>
                      <Td center>{row.ngTotal}</Td>
                      <Td center strong>
                        <span
                          className={
                            done
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }
                        >
                          {row.remain}
                        </span>
                      </Td>

                      <Td center>
                        <input
                          type="number"
                          min="0"
                          max={row.remain}
                          disabled={done}
                          value={
                            inputs[row.dispatchItemId]?.good ?? ""
                          }
                          onChange={(e) =>
                            setInputs((current) => ({
                              ...current,
                              [row.dispatchItemId]: {
                                good: e.target.value,
                                ng:
                                  current[row.dispatchItemId]?.ng ??
                                  "",
                              },
                            }))
                          }
                          className={numberInputClass}
                        />
                      </Td>

                      <Td center>
                        <input
                          type="number"
                          min="0"
                          disabled={done}
                          value={
                            inputs[row.dispatchItemId]?.ng ?? ""
                          }
                          onChange={(e) =>
                            setInputs((current) => ({
                              ...current,
                              [row.dispatchItemId]: {
                                good:
                                  current[row.dispatchItemId]
                                    ?.good ?? "",
                                ng: e.target.value,
                              },
                            }))
                          }
                          className={numberInputClass}
                        />
                      </Td>

                      <Td center>
                        {done ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            COMPLETED
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => saveRow(row)}
                            disabled={
                              savingId === row.dispatchItemId
                            }
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingId === row.dispatchItemId
                              ? "Đang lưu"
                              : "Lưu"}
                          </button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const numberInputClass =
  "h-9 w-[90px] rounded-md border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

function Summary({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-900">
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
      } ${
        strong
          ? "font-semibold text-slate-900"
          : "text-slate-700"
      }`}
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

function toTitle(value: Branch) {
  if (value === "CÁNH") return "Cánh";
  if (value === "KHUNG") return "Khung";
  return "Phào";
}
