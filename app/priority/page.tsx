"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type Direction = "ASC" | "DESC";

type PriorityRule = {
  id?: string;
  level: number;
  fieldKey: string;
  direction: Direction;
};

type PriorityRow = {
  operationId: string;
  woCode: string;
  operationCode: string;
  operationName: string;
  componentScope: string;
  stageType: string;
  isActive: boolean;
  rules: PriorityRule[];
};

const PRIORITY_FIELDS = [
  { key: "due_date", label: "Ngày giao" },
  { key: "order_date", label: "Ngày đặt" },
  { key: "dealer", label: "Đại lý" },
  { key: "model", label: "Model" },
  { key: "color", label: "Màu" },
  { key: "height", label: "Cao" },
  { key: "width", label: "Rộng" },
  { key: "quantity", label: "Số lượng" },
  { key: "order_no", label: "Đơn hàng" },
  { key: "full_set_ready", label: "Đủ bộ" },
  { key: "previous_wo_sequence", label: "Thứ tự WO trước" },
];

const DEFAULT_RULE: PriorityRule = {
  level: 1,
  fieldKey: "due_date",
  direction: "ASC",
};

export default function PriorityPage() {
  const [rows, setRows] = useState<PriorityRow[]>([]);
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
      const response = await fetch("/api/priority", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải Priority.");
      }

      setRows(result.rows ?? []);
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể tải Priority.",
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
    operationId: string,
    updater: (row: PriorityRow) => PriorityRow
  ) {
    setRows((current) =>
      current.map((row) =>
        row.operationId === operationId ? updater(row) : row
      )
    );
    setMessage("");
  }

  function updateRule(
    operationId: string,
    index: number,
    field: "fieldKey" | "direction",
    value: string
  ) {
    updateRow(operationId, (row) => {
      const rules = [...row.rules];
      rules[index] = {
        ...rules[index],
        [field]: value,
      };

      return {
        ...row,
        rules: rules.map((rule, currentIndex) => ({
          ...rule,
          level: currentIndex + 1,
        })),
      };
    });
  }

  function addRule(operationId: string) {
    updateRow(operationId, (row) => {
      if (row.rules.length >= 5) return row;

      return {
        ...row,
        rules: [
          ...row.rules,
          {
            level: row.rules.length + 1,
            fieldKey: "",
            direction: "ASC",
          },
        ],
      };
    });
  }

  function removeRule(operationId: string, index: number) {
    updateRow(operationId, (row) => ({
      ...row,
      rules: row.rules
        .filter((_, currentIndex) => currentIndex !== index)
        .map((rule, currentIndex) => ({
          ...rule,
          level: currentIndex + 1,
        })),
    }));
  }

  function moveRule(
    operationId: string,
    index: number,
    direction: -1 | 1
  ) {
    updateRow(operationId, (row) => {
      const target = index + direction;

      if (target < 0 || target >= row.rules.length) return row;

      const rules = [...row.rules];
      const temp = rules[index];
      rules[index] = rules[target];
      rules[target] = temp;

      return {
        ...row,
        rules: rules.map((rule, currentIndex) => ({
          ...rule,
          level: currentIndex + 1,
        })),
      };
    });
  }

  async function saveRow(row: PriorityRow) {
    setSavingId(row.operationId);

    try {
      const response = await fetch("/api/priority", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationId: row.operationId,
          isActive: row.isActive,
          rules: row.rules,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể lưu Priority.");
      }

      setRows(result.rows ?? []);
      showMessage(
        `Đã lưu Priority cho ${row.woCode} - ${row.operationName}.`,
        "success"
      );
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể lưu Priority.",
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

  const activeCount = useMemo(
    () => rows.filter((row) => row.isActive).length,
    [rows]
  );

  const withRulesCount = useMemo(
    () => rows.filter((row) => row.rules.length > 0).length,
    [rows]
  );

  return (
    <AppShell>
      <main className="mx-auto max-w-[1700px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Priority Master
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Priority theo từng WO
          </h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">
            Mỗi WO có thể có thứ tự ưu tiên riêng. Priority chỉ quyết định thứ
            tự xử lý; không được bỏ qua điều kiện đủ bộ của Routing Chung.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary title="Tổng WO" value={rows.length} />
          <Summary title="Priority hoạt động" value={activeCount} />
          <Summary title="WO có Rule" value={withRulesCount} />
          <Summary title="Mức Rule tối đa" value="5" />
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
                Quy tắc ưu tiên theo WO
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Rule 1 được xét trước, sau đó Rule 2, Rule 3...
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

          <div className="divide-y divide-slate-200">
            {!loading && filteredRows.length === 0 && (
              <div className="px-5 py-12 text-center text-slate-500">
                Chưa có WO để cấu hình Priority.
              </div>
            )}

            {filteredRows.map((row) => (
              <div key={row.operationId} className="p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                        {row.woCode}
                      </span>
                      <h3 className="font-bold text-slate-900">
                        {row.operationName}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {row.stageType === "COMMON"
                          ? "ĐỦ BỘ"
                          : row.componentScope}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.operationCode}
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(e) =>
                        updateRow(row.operationId, (current) => ({
                          ...current,
                          isActive: e.target.checked,
                        }))
                      }
                    />
                    Bật Priority
                  </label>
                </div>

                <div className="space-y-2">
                  {row.rules.map((rule, index) => (
                    <div
                      key={`${row.operationId}-${index}`}
                      className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[90px_1fr_140px_140px]"
                    >
                      <div className="flex items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-700">
                        Rule {index + 1}
                      </div>

                      <select
                        value={rule.fieldKey}
                        onChange={(e) =>
                          updateRule(
                            row.operationId,
                            index,
                            "fieldKey",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">Chọn tiêu chí ưu tiên</option>
                        {PRIORITY_FIELDS.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={rule.direction}
                        onChange={(e) =>
                          updateRule(
                            row.operationId,
                            index,
                            "direction",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="ASC">Tăng dần</option>
                        <option value="DESC">Giảm dần</option>
                      </select>

                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => moveRule(row.operationId, index, -1)}
                          disabled={index === 0}
                          className="rounded-md border border-slate-300 bg-white px-2.5 text-sm disabled:opacity-30"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() => moveRule(row.operationId, index, 1)}
                          disabled={index === row.rules.length - 1}
                          className="rounded-md border border-slate-300 bg-white px-2.5 text-sm disabled:opacity-30"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() => removeRule(row.operationId, index)}
                          className="rounded-md bg-red-50 px-3 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          Bỏ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => addRule(row.operationId)}
                    disabled={row.rules.length >= 5}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    + Thêm Rule
                  </button>

                  <button
                    type="button"
                    onClick={() => saveRow(row)}
                    disabled={savingId === row.operationId}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingId === row.operationId
                      ? "Đang lưu..."
                      : "Lưu Priority"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Summary({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
