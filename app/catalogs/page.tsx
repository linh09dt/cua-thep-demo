"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type Category =
  | "MODEL"
  | "COLOR"
  | "LOCK"
  | "OPEN_DIRECTION"
  | "ORDER_STATUS";

type MasterRow = {
  id: string;
  category: Category;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

const TABS: { key: Category; label: string }[] = [
  { key: "MODEL", label: "Model" },
  { key: "COLOR", label: "Màu" },
  { key: "LOCK", label: "Khóa" },
  { key: "OPEN_DIRECTION", label: "Hướng mở" },
  { key: "ORDER_STATUS", label: "Tình trạng đơn hàng" },
];

const EMPTY = {
  id: "",
  code: "",
  name: "",
  sortOrder: 10,
  isActive: true,
};

export default function CatalogsPage() {
  const [activeTab, setActiveTab] = useState<Category>("MODEL");
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const response = await fetch("/api/master-data", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải danh mục.");
      }

      setRows(
        (result.rows ?? []).map((row: any) => ({
          id: row.id,
          category: row.category,
          code: row.code,
          name: row.name,
          sortOrder: row.sort_order,
          isActive: row.is_active,
        }))
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải danh mục."
      );
    } finally {
      setLoading(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          id: form.id,
          category: activeTab,
          code: form.code,
          name: form.name,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể lưu.");
      }

      setForm(EMPTY);
      setMessage("Đã lưu danh mục.");
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu danh mục."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: MasterRow) {
    const ok = window.confirm(`Xóa "${row.name}"?`);
    if (!ok) return;

    try {
      const response = await fetch("/api/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: row.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể xóa.");
      }

      if (form.id === row.id) {
        setForm(EMPTY);
      }

      setMessage("Đã xóa danh mục.");
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa danh mục."
      );
    }
  }

  const filtered = useMemo(
    () =>
      rows
        .filter((row) => row.category === activeTab)
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder ||
            a.name.localeCompare(b.name, "vi")
        ),
    [rows, activeTab]
  );

  const activeLabel =
    TABS.find((item) => item.key === activeTab)?.label ?? "";

  return (
    <AppShell>
      <main className="mx-auto max-w-[1500px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Master Data
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Danh mục
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Danh mục dùng chung cho nhập đơn hàng. Module này độc lập với Cấu hình sản xuất.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setForm(EMPTY);
                setMessage("");
              }}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                {form.id ? `Sửa ${activeLabel}` : `Thêm ${activeLabel}`}
              </h2>
            </div>

            <form onSubmit={save} className="space-y-4 p-5">
              <Field label="Mã *">
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      code: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Tên hiển thị *">
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      name: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Thứ tự">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      isActive: e.target.checked,
                    }))
                  }
                />
                Đang sử dụng
              </label>

              <div className="flex gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setForm(EMPTY)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Nhập lại
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                Danh sách {activeLabel}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {loading ? "Đang tải..." : `${filtered.length} giá trị`}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <Th>STT</Th>
                    <Th>Mã</Th>
                    <Th>Tên</Th>
                    <Th>Thứ tự</Th>
                    <Th>Trạng thái</Th>
                    <Th>Thao tác</Th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row, index) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <Td center>{index + 1}</Td>
                      <Td strong>{row.code}</Td>
                      <Td>{row.name}</Td>
                      <Td center>{row.sortOrder}</Td>
                      <Td center>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {row.isActive ? "Đang dùng" : "Tắt"}
                        </span>
                      </Td>
                      <Td center>
                        <div className="flex justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                id: row.id,
                                code: row.code,
                                name: row.name,
                                sortOrder: row.sortOrder,
                                isActive: row.isActive,
                              })
                            }
                            className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => remove(row)}
                            className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
                          >
                            Xóa
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-r border-slate-700 px-3 py-3 text-center text-xs font-bold uppercase">
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
