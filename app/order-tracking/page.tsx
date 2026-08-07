"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type ComponentProgress = {
  status: string;
  total: number;
  completed: number;
  percent: number;
  currentWo: string;
  currentOperation: string;
};

type TrackingRow = {
  id: string;
  orderNo: string;
  dealer: string;
  orderDate: string;
  dueDate: string;
  model: string;
  color: string;
  height: number;
  width: number;
  openDirection: string;
  quantity: number;
  lockName: string;
  storedStatus: string;
  systemStatus: string;
  note: string;

  rootId: string | null;
  productionNo: string;
  rootStatus: string;

  canh: ComponentProgress;
  khung: ComponentProgress;
  phao: ComponentProgress;

  fullSetReady: boolean;

  commonTotal: number;
  commonCompleted: number;
  commonCurrentWo: string;
  commonCurrentOperation: string;

  totalOperations: number;
  completedOperations: number;
  overallPercent: number;
};

type StatusOption = {
  id: string;
  code: string;
  name: string;
};

export default function OrderTrackingPage() {
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [lsxFilter, setLsxFilter] = useState("Tất cả");
  const [selected, setSelected] =
    useState<TrackingRow | null>(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/order-tracking", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Không thể tải tình trạng đơn hàng."
        );
      }

      setRows(result.rows ?? []);
      setStatuses(result.statuses ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải tình trạng đơn hàng."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const searchMatched =
        !keyword ||
        [
          row.orderNo,
          row.dealer,
          row.model,
          row.color,
          row.productionNo,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(keyword)
        );

      const statusMatched =
        statusFilter === "Tất cả" ||
        row.systemStatus === statusFilter ||
        row.storedStatus === statusFilter;

      const lsxMatched =
        lsxFilter === "Tất cả" ||
        (lsxFilter === "Đã tạo LSX" &&
          Boolean(row.rootId)) ||
        (lsxFilter === "Chưa tạo LSX" &&
          !row.rootId) ||
        (lsxFilter === "Đủ bộ" &&
          row.fullSetReady) ||
        (lsxFilter === "Chưa đủ bộ" &&
          Boolean(row.rootId) &&
          !row.fullSetReady);

      return (
        searchMatched &&
        statusMatched &&
        lsxMatched
      );
    });
  }, [rows, search, statusFilter, lsxFilter]);

  const summary = useMemo(() => {
    return {
      total: rows.length,
      newOrders: rows.filter(
        (row) =>
          row.systemStatus === "Mới" ||
          !row.rootId
      ).length,
      planned: rows.filter(
        (row) =>
          row.systemStatus === "Đã lên kế hoạch"
      ).length,
      running: rows.filter(
        (row) =>
          row.systemStatus === "Đang sản xuất"
      ).length,
      completed: rows.filter(
        (row) =>
          row.systemStatus === "Hoàn thành"
      ).length,
      fullSet: rows.filter(
        (row) => row.fullSetReady
      ).length,
    };
  }, [rows]);

  return (
    <AppShell>
      <main className="mx-auto max-w-[1900px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Order Tracking
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Theo dõi tình trạng đơn hàng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi từ Đơn hàng → LSX → Cánh /
            Khung / Phào → Đủ bộ → công đoạn chung.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Summary title="Tổng đơn" value={summary.total} />
          <Summary title="Mới / Chưa LSX" value={summary.newOrders} />
          <Summary title="Đã lên kế hoạch" value={summary.planned} />
          <Summary title="Đang sản xuất" value={summary.running} />
          <Summary title="Đủ bộ" value={summary.fullSet} />
          <Summary title="Hoàn thành" value={summary.completed} />
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Danh sách tình trạng đơn hàng
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {filteredRows.length} / {rows.length} đơn
                đang hiển thị
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Tìm đơn, đại lý, model, LSX..."
                className="h-10 min-w-[260px] rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
              />

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className={selectClass}
              >
                <option value="Tất cả">
                  Tất cả tình trạng
                </option>

                {statuses.map((status) => (
                  <option
                    key={status.id}
                    value={status.name}
                  >
                    {status.name}
                  </option>
                ))}

                <option value="Đang sản xuất">
                  Đang sản xuất
                </option>
                <option value="Hoàn thành">
                  Hoàn thành
                </option>
              </select>

              <select
                value={lsxFilter}
                onChange={(e) =>
                  setLsxFilter(e.target.value)
                }
                className={selectClass}
              >
                <option value="Tất cả">
                  Tất cả LSX
                </option>
                <option value="Chưa tạo LSX">
                  Chưa tạo LSX
                </option>
                <option value="Đã tạo LSX">
                  Đã tạo LSX
                </option>
                <option value="Chưa đủ bộ">
                  Chưa đủ bộ
                </option>
                <option value="Đủ bộ">
                  Đủ bộ
                </option>
              </select>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                {loading ? "Đang tải..." : "Tải lại"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1750px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <Th>STT</Th>
                  <Th>Đơn hàng</Th>
                  <Th>Đại lý</Th>
                  <Th>Model</Th>
                  <Th>Màu</Th>
                  <Th>SL</Th>
                  <Th>Ngày giao</Th>
                  <Th>Tình trạng</Th>
                  <Th>LSX Cha</Th>
                  <Th>Cánh</Th>
                  <Th>Khung</Th>
                  <Th>Phào</Th>
                  <Th>Đủ bộ</Th>
                  <Th>Công đoạn chung</Th>
                  <Th>Tiến độ tổng</Th>
                  <Th>Chi tiết</Th>
                </tr>
              </thead>

              <tbody>
                {!loading &&
                  filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={16}
                        className="px-4 py-12 text-center text-slate-400"
                      >
                        Không có đơn hàng phù hợp.
                      </td>
                    </tr>
                  )}

                {filteredRows.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    <Td center>{index + 1}</Td>

                    <Td strong>{row.orderNo}</Td>

                    <Td>{row.dealer}</Td>

                    <Td center>{row.model}</Td>

                    <Td center>{row.color}</Td>

                    <Td center strong>
                      {row.quantity}
                    </Td>

                    <Td center>
                      {formatDate(row.dueDate)}
                    </Td>

                    <Td center>
                      <StatusBadge
                        status={row.systemStatus}
                      />
                    </Td>

                    <Td center>
                      {row.productionNo ? (
                        <span className="font-semibold text-blue-700">
                          {row.productionNo}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Chưa tạo
                        </span>
                      )}
                    </Td>

                    <Td>
                      <MiniProgress
                        progress={row.canh}
                      />
                    </Td>

                    <Td>
                      <MiniProgress
                        progress={row.khung}
                      />
                    </Td>

                    <Td>
                      <MiniProgress
                        progress={row.phao}
                      />
                    </Td>

                    <Td center>
                      {row.rootId ? (
                        row.fullSetReady ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            ĐỦ BỘ
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                            CHƯA ĐỦ
                          </span>
                        )
                      ) : (
                        "-"
                      )}
                    </Td>

                    <Td>
                      <div className="text-xs">
                        <div className="font-semibold text-slate-900">
                          {row.commonCurrentWo}
                        </div>
                        <div className="mt-0.5 text-slate-500">
                          {row.commonCurrentOperation}
                        </div>
                        {row.commonTotal > 0 && (
                          <div className="mt-1 text-slate-400">
                            {row.commonCompleted}/
                            {row.commonTotal}
                          </div>
                        )}
                      </div>
                    </Td>

                    <Td>
                      <OverallProgress
                        value={row.overallPercent}
                        completed={
                          row.completedOperations
                        }
                        total={row.totalOperations}
                      />
                    </Td>

                    <Td center>
                      <button
                        type="button"
                        onClick={() =>
                          setSelected(row)
                        }
                        className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Xem
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <DetailModal
            row={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </main>
    </AppShell>
  );
}

function MiniProgress({
  progress,
}: {
  progress: ComponentProgress;
}) {
  if (progress.total === 0) {
    return (
      <div className="text-xs text-slate-400">
        Chưa tạo
      </div>
    );
  }

  return (
    <div className="min-w-[145px]">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800">
          {progress.currentWo}
        </span>
        <span className="text-slate-500">
          {progress.completed}/{progress.total}
        </span>
      </div>

      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-slate-700"
          style={{
            width: `${Math.min(
              100,
              Math.max(0, progress.percent)
            )}%`,
          }}
        />
      </div>

      <div className="mt-1 truncate text-[10px] text-slate-500">
        {progress.currentOperation}
      </div>
    </div>
  );
}

function OverallProgress({
  value,
  completed,
  total,
}: {
  value: number;
  completed: number;
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="text-xs text-slate-400">
        Chưa có LSX
      </div>
    );
  }

  return (
    <div className="min-w-[130px]">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-900">
          {value}%
        </span>
        <span className="text-slate-500">
          {completed}/{total} WO
        </span>
      </div>

      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-slate-900"
          style={{
            width: `${Math.min(
              100,
              Math.max(0, value)
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function DetailModal({
  row,
  onClose,
}: {
  row: TrackingRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">
              Chi tiết đơn hàng
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {row.orderNo}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
          >
            Đóng
          </button>
        </div>

        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Đại lý" value={row.dealer} />
            <Info label="Model" value={row.model} />
            <Info label="Màu" value={row.color} />
            <Info label="Số lượng" value={row.quantity} />
            <Info
              label="Kích thước"
              value={`${row.height} × ${row.width}`}
            />
            <Info
              label="Hướng mở"
              value={row.openDirection}
            />
            <Info label="Khóa" value={row.lockName} />
            <Info
              label="Ngày giao"
              value={formatDate(row.dueDate)}
            />
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-slate-500">
                  LSX Cha
                </div>
                <div className="mt-1 font-bold text-slate-900">
                  {row.productionNo ||
                    "Chưa tạo lệnh sản xuất"}
                </div>
              </div>

              <StatusBadge
                status={row.systemStatus}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <ComponentCard
              title="Cánh"
              progress={row.canh}
            />
            <ComponentCard
              title="Khung"
              progress={row.khung}
            />
            <ComponentCard
              title="Phào"
              progress={row.phao}
            />
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-bold uppercase text-amber-700">
              Điểm hội tụ
            </div>

            <div className="mt-1 text-lg font-bold text-slate-900">
              {row.fullSetReady
                ? "ĐÃ ĐỦ BỘ"
                : "CHƯA ĐỦ BỘ"}
            </div>

            <div className="mt-2 text-sm text-slate-600">
              Công đoạn chung hiện tại:{" "}
              <strong>
                {row.commonCurrentWo} -{" "}
                {row.commonCurrentOperation}
              </strong>
            </div>
          </div>

          <div className="mt-5">
            <OverallProgress
              value={row.overallPercent}
              completed={row.completedOperations}
              total={row.totalOperations}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentCard({
  title,
  progress,
}: {
  title: string;
  progress: ComponentProgress;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="font-bold text-slate-900">
        {title}
      </div>

      <div className="mt-3">
        <MiniProgress progress={progress} />
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Trạng thái:{" "}
        <strong className="text-slate-700">
          {progress.status}
        </strong>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

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
      <div className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let className =
    "bg-slate-100 text-slate-700";

  if (status === "Đã lên kế hoạch") {
    className = "bg-blue-100 text-blue-700";
  } else if (status === "Đang sản xuất") {
    className = "bg-amber-100 text-amber-800";
  } else if (status === "Hoàn thành") {
    className =
      "bg-emerald-100 text-emerald-700";
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
    >
      {status}
    </span>
  );
}

const selectClass =
  "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500";

function Th({
  children,
}: {
  children: React.ReactNode;
}) {
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
