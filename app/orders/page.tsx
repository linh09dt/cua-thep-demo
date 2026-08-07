"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type OrderStatus =
  | "Mới"
  | "Đã lên kế hoạch"
  | "Đang sản xuất"
  | "Hoàn thành";

type OrderRow = {
  id: string;
  donHang: string;
  daiLy: string;
  ngayDat: string;
  ngayGiao: string;
  model: string;
  mau: string;
  cao: string;
  rong: string;
  huongMo: string;
  soLuong: string;
  khoa: string;
  ghiChu: string;
  trangThai: OrderStatus;
};

const MODEL_OPTIONS = ["M01", "M02", "M03", "M04"];
const COLOR_OPTIONS = ["Trắng", "Xám", "Đen", "Vân gỗ"];
const OPEN_OPTIONS = ["Trái", "Phải", "2 cánh"];
const LOCK_OPTIONS = ["Khóa cơ", "Khóa tay gạt", "Khóa điện tử"];

const STATUS_OPTIONS: OrderStatus[] = [
  "Mới",
  "Đã lên kế hoạch",
  "Đang sản xuất",
  "Hoàn thành",
];

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyOrder(): OrderRow {
  return {
    id: createId(),
    donHang: "",
    daiLy: "",
    ngayDat: today(),
    ngayGiao: "",
    model: "",
    mau: "",
    cao: "",
    rong: "",
    huongMo: "",
    soLuong: "1",
    khoa: "",
    ghiChu: "",
    trangThai: "Mới",
  };
}

export default function OrdersPage() {
  const [form, setForm] = useState<OrderRow>(emptyOrder());
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);

    try {
      const response = await fetch("/api/orders", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải dữ liệu.");
      }

      setRows(result.rows ?? []);
    } catch (error) {
      showMessage(
        error instanceof Error
          ? `Lỗi tải dữ liệu: ${error.message}`
          : "Không thể tải dữ liệu.",
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

  function updateForm(field: keyof OrderRow, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setMessage("");
  }

  function validateForm() {
    if (!form.donHang.trim()) return "Vui lòng nhập số đơn hàng.";
    if (!form.daiLy.trim()) return "Vui lòng nhập đại lý.";
    if (!form.ngayGiao) return "Vui lòng chọn ngày giao.";
    if (!form.model) return "Vui lòng chọn Model.";
    if (!form.mau) return "Vui lòng chọn màu.";
    if (!form.cao || Number(form.cao) <= 0) return "Chiều cao chưa hợp lệ.";
    if (!form.rong || Number(form.rong) <= 0) return "Chiều rộng chưa hợp lệ.";
    if (!form.soLuong || Number(form.soLuong) <= 0)
      return "Số lượng chưa hợp lệ.";

    return "";
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validation = validateForm();

    if (validation) {
      showMessage(validation, "error");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: [form],
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể lưu đơn hàng.");
      }

      showMessage(
        editingId ? "Đã cập nhật đơn hàng." : "Đã lưu đơn hàng mới.",
        "success"
      );

      setEditingId(null);
      setForm(emptyOrder());
      await loadOrders();
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể lưu đơn hàng.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  function editOrder(row: OrderRow) {
    setForm({ ...row });
    setEditingId(row.id);
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyOrder());
    setMessage("");
  }

  async function deleteOrder(row: OrderRow) {
    const ok = window.confirm(
      `Bạn có chắc muốn xóa đơn ${row.donHang || ""}?`
    );

    if (!ok) return;

    try {
      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: row.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể xóa đơn hàng.");
      }

      if (editingId === row.id) {
        cancelEdit();
      }

      showMessage("Đã xóa đơn hàng.", "success");
      await loadOrders();
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể xóa đơn hàng.",
        "error"
      );
    }
  }

  async function moveToPlan(row: OrderRow) {
    if (row.trangThai !== "Mới") {
      showMessage(
        `Đơn ${row.donHang} đang ở trạng thái "${row.trangThai}".`,
        "info"
      );
      return;
    }

    const updatedRow: OrderRow = {
      ...row,
      trangThai: "Đã lên kế hoạch",
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: [updatedRow],
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể cập nhật trạng thái.");
      }

      showMessage(
        `Đơn ${row.donHang} đã được đưa vào kế hoạch.`,
        "success"
      );

      await loadOrders();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái.",
        "error"
      );
    }
  }

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "Tất cả" || row.trangThai === statusFilter;

      const matchesSearch =
        !keyword ||
        row.donHang.toLowerCase().includes(keyword) ||
        row.daiLy.toLowerCase().includes(keyword) ||
        row.model.toLowerCase().includes(keyword) ||
        row.mau.toLowerCase().includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const totalQty = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.soLuong || 0), 0);
  }, [rows]);

  const plannedCount = useMemo(() => {
    return rows.filter((row) => row.trangThai === "Đã lên kế hoạch").length;
  }, [rows]);

  const inProductionCount = useMemo(() => {
    return rows.filter((row) => row.trangThai === "Đang sản xuất").length;
  }, [rows]);

  return (
    <AppShell>
      <main className="mx-auto max-w-[1600px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Đơn hàng
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Nhập đơn hàng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sales nhập đơn trực tiếp trên web. Dữ liệu được lưu vào Supabase
            và chuyển tiếp sang bước kế hoạch sản xuất.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Tổng đơn" value={rows.length} />
          <SummaryCard title="Tổng số lượng" value={totalQty} />
          <SummaryCard title="Đã lên kế hoạch" value={plannedCount} />
          <SummaryCard title="Đang sản xuất" value={inProductionCount} />
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

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">
                  {editingId ? "Sửa đơn hàng" : "Thông tin đơn hàng"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Các trường có dấu * là thông tin chính cho bản demo.
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Đơn hàng *">
                <input
                  value={form.donHang}
                  onChange={(e) => updateForm("donHang", e.target.value)}
                  placeholder="VD: DH-001"
                  className={inputClass}
                />
              </Field>

              <Field label="Đại lý *">
                <input
                  value={form.daiLy}
                  onChange={(e) => updateForm("daiLy", e.target.value)}
                  placeholder="Tên đại lý"
                  className={inputClass}
                />
              </Field>

              <Field label="Ngày đặt">
                <input
                  type="date"
                  value={form.ngayDat}
                  onChange={(e) => updateForm("ngayDat", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Ngày giao *">
                <input
                  type="date"
                  value={form.ngayGiao}
                  onChange={(e) => updateForm("ngayGiao", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Model *">
                <select
                  value={form.model}
                  onChange={(e) => updateForm("model", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Chọn Model</option>
                  {MODEL_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Màu *">
                <select
                  value={form.mau}
                  onChange={(e) => updateForm("mau", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Chọn màu</option>
                  {COLOR_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Cao (mm) *">
                <input
                  type="number"
                  min="1"
                  value={form.cao}
                  onChange={(e) => updateForm("cao", e.target.value)}
                  placeholder="2200"
                  className={inputClass}
                />
              </Field>

              <Field label="Rộng (mm) *">
                <input
                  type="number"
                  min="1"
                  value={form.rong}
                  onChange={(e) => updateForm("rong", e.target.value)}
                  placeholder="1000"
                  className={inputClass}
                />
              </Field>

              <Field label="Hướng mở">
                <select
                  value={form.huongMo}
                  onChange={(e) => updateForm("huongMo", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Chọn hướng mở</option>
                  {OPEN_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Số lượng *">
                <input
                  type="number"
                  min="1"
                  value={form.soLuong}
                  onChange={(e) => updateForm("soLuong", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Khóa">
                <select
                  value={form.khoa}
                  onChange={(e) => updateForm("khoa", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Chọn loại khóa</option>
                  {LOCK_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Trạng thái">
                <select
                  value={form.trangThai}
                  onChange={(e) =>
                    updateForm("trangThai", e.target.value as OrderStatus)
                  }
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="md:col-span-2 xl:col-span-4">
                <Field label="Ghi chú">
                  <textarea
                    rows={3}
                    value={form.ghiChu}
                    onChange={(e) => updateForm("ghiChu", e.target.value)}
                    placeholder="Ghi chú thêm cho đơn hàng..."
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Nhập lại
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Đang lưu..."
                  : editingId
                  ? "Cập nhật đơn hàng"
                  : "Lưu đơn hàng"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Danh sách đơn hàng
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredRows.length} / {rows.length} đơn đang hiển thị
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm đơn, đại lý, model..."
                  className="h-10 min-w-[250px] rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="Tất cả">Tất cả trạng thái</option>
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={loadOrders}
                  disabled={loading}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {loading ? "Đang tải..." : "Tải lại"}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <Th>STT</Th>
                  <Th>Đơn hàng</Th>
                  <Th>Đại lý</Th>
                  <Th>Model</Th>
                  <Th>Màu</Th>
                  <Th>Kích thước</Th>
                  <Th>SL</Th>
                  <Th>Ngày giao</Th>
                  <Th>Trạng thái</Th>
                  <Th>Thao tác</Th>
                </tr>
              </thead>

              <tbody>
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      Chưa có đơn hàng phù hợp.
                    </td>
                  </tr>
                )}

                {filteredRows.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    <Td center>{index + 1}</Td>
                    <Td strong>{row.donHang}</Td>
                    <Td>{row.daiLy}</Td>
                    <Td>{row.model}</Td>
                    <Td>{row.mau}</Td>
                    <Td center>
                      {row.cao && row.rong ? `${row.cao} × ${row.rong}` : "-"}
                    </Td>
                    <Td center>{row.soLuong}</Td>
                    <Td center>{formatDate(row.ngayGiao)}</Td>
                    <Td center>
                      <StatusBadge status={row.trangThai} />
                    </Td>
                    <Td>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => editOrder(row)}
                          className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteOrder(row)}
                          className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          Xóa
                        </button>

                        <button
                          type="button"
                          onClick={() => moveToPlan(row)}
                          disabled={row.trangThai !== "Mới"}
                          className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Đưa vào kế hoạch
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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

function SummaryCard({
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

function StatusBadge({ status }: { status: OrderStatus }) {
  const className =
    status === "Mới"
      ? "bg-slate-100 text-slate-700"
      : status === "Đã lên kế hoạch"
      ? "bg-blue-100 text-blue-700"
      : status === "Đang sản xuất"
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-700";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}
