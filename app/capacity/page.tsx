"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type CapacityRow = {
  id: string;
  operationId: string;
  woCode: string;
  operationCode: string;
  operationName: string;
  componentScope: string;
  stageType: string;
  capacityPerDay: number;
  unitName: string;
  shiftsPerDay: number;
  hoursPerShift: number;
  efficiencyPercent: number;
  isActive: boolean;
};

export default function CapacityPage() {
  const [rows, setRows] = useState<CapacityRow[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "info"
  >("info");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadRows();
  }, []);

  async function loadRows() {
    setLoading(true);

    try {
      const response = await fetch("/api/capacity", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải dữ liệu.");
      }

      setRows(result.rows ?? []);
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể tải dữ liệu.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function showMessage(
    text: string,
    type: "success" | "error" | "info" = "info"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function updateRow(
    id: string,
    field: keyof CapacityRow,
    value: string | number | boolean
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
    setMessage("");
  }

  async function saveRow(row: CapacityRow) {
    setSavingId(row.id);

    try {
      const response = await fetch("/api/capacity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ row }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể lưu năng lực.");
      }

      setRows(result.rows ?? []);
      showMessage(`Đã lưu ${row.woCode} - ${row.operationName}.`, "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể lưu năng lực.",
        "error"
      );
    } finally {
      setSavingId(null);
    }
  }

  const filteredRows = useMemo(() => {
    if (filter === "Tất cả") return rows;
    if (filter === "Luồng chung") {
      return rows.filter((row) => row.stageType === "COMMON");
    }

    return rows.filter((row) => row.componentScope === filter);
  }, [rows, filter]);

  const activeRows = useMemo(
    () => rows.filter((row) => row.isActive),
    [rows]
  );

  const bottleneck = useMemo(() => {
    const candidates = activeRows.filter((row) => row.capacityPerDay > 0);

    if (candidates.length === 0) return null;

    return candidates.reduce((min, row) =>
      row.capacityPerDay < min.capacityPerDay ? row : min
    );
  }, [activeRows]);

  const avgCapacity = useMemo(() => {
    if (activeRows.length === 0) return 0;

    const total = activeRows.reduce(
      (sum, row) => sum + Number(row.capacityPerDay || 0),
      0
    );

    return Math.round(total / activeRows.length);
  }, [activeRows]);

  return (
    <AppShell>
      <main className="mx-auto max-w-[1700px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Capacity Master
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Năng lực công đoạn
          </h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">
            Cấu hình năng lực theo từng WO. Bản demo dùng năng lực/ngày để
            phục vụ bước lập kế hoạch và cảnh báo quá tải sau này.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary title="Tổng công đoạn" value={rows.length} />
          <Summary title="Đang hoạt động" value={activeRows.length} />
          <Summary title="Năng lực TB/ngày" value={avgCapacity} />
          <Summary
            title="Nút thắt hiện tại"
            value={
              bottleneck
                ? `${bottleneck.woCode} / ${bottleneck.capacityPerDay}`
                : "-"
            }
            small
          />
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : messageType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Capacity theo WO
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Có thể chỉnh trực tiếp rồi lưu từng công đoạn.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="Tất cả">Tất cả</option>
                <option value="CÁNH">Cánh</option>
                <option value="KHUNG">Khung</option>
                <option value="PHÀO">Phào</option>
                <option value="Luồng chung">Luồng chung</option>
              </select>

              <button
                type="button"
                onClick={loadRows}
                disabled={loading}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "Đang tải..." : "Tải lại"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <Th>WO</Th>
                  <Th>Công đoạn</Th>
                  <Th>Nhóm</Th>
                  <Th>Năng lực/ngày</Th>
                  <Th>Đơn vị</Th>
                  <Th>Số ca</Th>
                  <Th>Giờ/ca</Th>
                  <Th>Hiệu suất %</Th>
                  <Th>Năng lực hiệu dụng</Th>
                  <Th>Hoạt động</Th>
                  <Th>Lưu</Th>
                </tr>
              </thead>

              <tbody>
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      Chưa có dữ liệu năng lực.
                    </td>
                  </tr>
                )}

                {filteredRows.map((row) => {
                  const effectiveCapacity = Math.round(
                    row.capacityPerDay * (row.efficiencyPercent / 100)
                  );

                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <Td strong>{row.woCode}</Td>
                      <Td>{row.operationName}</Td>
                      <Td center>
                        {row.stageType === "COMMON"
                          ? "ĐỦ BỘ"
                          : row.componentScope}
                      </Td>

                      <Td center>
                        <NumberInput
                          value={row.capacityPerDay}
                          min={0}
                          onChange={(value) =>
                            updateRow(
                              row.id,
                              "capacityPerDay",
                              Number(value)
                            )
                          }
                        />
                      </Td>

                      <Td center>
                        <input
                          value={row.unitName}
                          onChange={(e) =>
                            updateRow(row.id, "unitName", e.target.value)
                          }
                          className={textInputClass}
                        />
                      </Td>

                      <Td center>
                        <NumberInput
                          value={row.shiftsPerDay}
                          min={1}
                          max={3}
                          onChange={(value) =>
                            updateRow(
                              row.id,
                              "shiftsPerDay",
                              Number(value)
                            )
                          }
                        />
                      </Td>

                      <Td center>
                        <NumberInput
                          value={row.hoursPerShift}
                          min={1}
                          max={24}
                          step="0.5"
                          onChange={(value) =>
                            updateRow(
                              row.id,
                              "hoursPerShift",
                              Number(value)
                            )
                          }
                        />
                      </Td>

                      <Td center>
                        <NumberInput
                          value={row.efficiencyPercent}
                          min={0}
                          max={100}
                          onChange={(value) =>
                            updateRow(
                              row.id,
                              "efficiencyPercent",
                              Number(value)
                            )
                          }
                        />
                      </Td>

                      <Td center>
                        <span className="font-bold text-blue-700">
                          {effectiveCapacity}
                        </span>
                      </Td>

                      <Td center>
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "isActive",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4"
                        />
                      </Td>

                      <Td center>
                        <button
                          type="button"
                          onClick={() => saveRow(row)}
                          disabled={savingId === row.id}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingId === row.id ? "Đang lưu" : "Lưu"}
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            Năng lực hiệu dụng = Năng lực/ngày × Hiệu suất %. Số liệu hiện tại
            là dữ liệu demo và có thể chỉnh theo thực tế của khách hàng.
          </div>
        </section>
      </main>
    </AppShell>
  );
}

const textInputClass =
  "h-9 w-[110px] rounded-md border border-slate-300 bg-white px-2 text-center text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = "1",
}: {
  value: number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-[90px] rounded-md border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  );
}

function Summary({
  title,
  value,
  small = false,
}: {
  title: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div
        className={`mt-2 font-bold text-slate-900 ${
          small ? "text-lg" : "text-2xl"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap border-r border-slate-700 px-3 py-3 text-center text-xs font-bold uppercase tracking-wide">
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
