"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type Operation = {
  id: string;
  wo_code: string;
  operation_name: string;
  branch: string;
};

type Row = {
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ShopFloorPage() {
  const [date, setDate] = useState(today());
  const [operations, setOperations] = useState<Operation[]>([]);
  const [operationId, setOperationId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [inputs, setInputs] = useState<Record<string, { good: number; ng: number }>>({});
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");

  async function loadData(selected = operationId) {
    const params = new URLSearchParams({ date });
    if (selected) params.set("operationId", selected);

    try {
      const response = await fetch(`/api/production-report?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);

      setOperations(result.operations ?? []);
      setRows(result.rows ?? []);
      if (!selected && result.operations?.[0]?.id) {
        setOperationId(result.operations[0].id);
      }
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải màn hình xưởng.");
    }
  }

  useEffect(() => {
    loadData();
  }, [date, operationId]);

  const selectedOperation = operations.find((x) => x.id === operationId);
  const totals = useMemo(
    () => ({
      planned: rows.reduce((s, x) => s + Number(x.dispatchQty || 0), 0),
      good: rows.reduce((s, x) => s + Number(x.goodTotal || 0), 0),
      remain: rows.reduce((s, x) => s + Number(x.remain || 0), 0),
    }),
    [rows]
  );

  async function report(row: Row) {
    const input = inputs[row.dispatchItemId] ?? { good: 0, ng: 0 };
    setSavingId(row.dispatchItemId);

    try {
      const response = await fetch("/api/production-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate: date,
          operationId,
          dispatchItemId: row.dispatchItemId,
          productionOrderId: row.productionOrderId,
          goodQty: Number(input.good || 0),
          ngQty: Number(input.ng || 0),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setRows(result.rows ?? []);
      setInputs((current) => ({
        ...current,
        [row.dispatchItemId]: { good: 0, ng: 0 },
      }));
      setMessage("Đã cập nhật báo cáo sản xuất.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu báo cáo.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-[1800px] p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Shop Floor Execution
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Màn hình xưởng
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Công việc Dispatch đã Release và báo cáo Good / NG ngay tại công đoạn.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            />
            <select
              value={operationId}
              onChange={(e) => setOperationId(e.target.value)}
              className="h-10 min-w-[260px] rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              {operations.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.wo_code} - {op.operation_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary title="Công đoạn" value={selectedOperation?.wo_code ?? "-"} />
          <Summary title="Kế hoạch hôm nay" value={totals.planned} />
          <Summary title="Đã hoàn thành" value={totals.good} />
          <Summary title="Còn lại" value={totals.remain} />
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="font-bold text-slate-900">
              {selectedOperation?.wo_code} - {selectedOperation?.operation_name}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <Th>LSX</Th>
                  <Th>Đơn hàng</Th>
                  <Th>Khách hàng</Th>
                  <Th>Ngày giao</Th>
                  <Th>Màu</Th>
                  <Th>Dispatch</Th>
                  <Th>Good</Th>
                  <Th>NG</Th>
                  <Th>Remain</Th>
                  <Th>Good hôm nay</Th>
                  <Th>NG hôm nay</Th>
                  <Th>Báo cáo</Th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-12 text-center text-slate-400">
                      Chưa có Dispatch Released cho công đoạn này.
                    </td>
                  </tr>
                )}

                {rows.map((row) => {
                  const input = inputs[row.dispatchItemId] ?? { good: 0, ng: 0 };
                  return (
                    <tr key={row.dispatchItemId} className="border-t border-slate-200">
                      <Td strong>{row.productionNo}</Td>
                      <Td strong>{row.orderNo}</Td>
                      <Td>{row.dealer}</Td>
                      <Td center>{formatDate(row.dueDate)}</Td>
                      <Td center>{row.color}</Td>
                      <Td center strong>{row.dispatchQty}</Td>
                      <Td center>{row.goodTotal}</Td>
                      <Td center>{row.ngTotal}</Td>
                      <Td center strong>{row.remain}</Td>
                      <Td center>
                        <input
                          type="number"
                          min="0"
                          max={row.remain}
                          value={input.good}
                          onChange={(e) =>
                            setInputs((current) => ({
                              ...current,
                              [row.dispatchItemId]: {
                                ...input,
                                good: Number(e.target.value),
                              },
                            }))
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
                            setInputs((current) => ({
                              ...current,
                              [row.dispatchItemId]: {
                                ...input,
                                ng: Number(e.target.value),
                              },
                            }))
                          }
                          className="h-9 w-20 rounded-md border border-slate-300 px-2 text-right"
                        />
                      </Td>
                      <Td center>
                        <button
                          type="button"
                          disabled={savingId === row.dispatchItemId}
                          onClick={() => report(row)}
                          className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                        >
                          {savingId === row.dispatchItemId ? "Đang lưu..." : "Lưu"}
                        </button>
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

function Summary({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 text-center text-xs font-bold uppercase">{children}</th>;
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
    <td className={`px-3 py-3 ${center ? "text-center" : ""} ${strong ? "font-bold text-slate-900" : "text-slate-700"}`}>
      {children}
    </td>
  );
}

function formatDate(value: string) {
  const p = String(value || "").split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : value || "-";
}
