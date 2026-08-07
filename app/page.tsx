"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "@/components/app-shell";

type Cards = {
  totalOrders: number;
  totalQty: number;
  newOrders: number;
  plannedOrders: number;
  runningOrders: number;
  fullSetOrders: number;
  completedOrders: number;
  lateOrders: number;
};

type StatusRow = {
  status: string;
  count: number;
};

type BranchRow = {
  component: string;
  total: number;
  running: number;
  completed: number;
  completionPercent: number;
};

type CapacityRow = {
  woCode: string;
  operationName: string;
  capacity: number;
  planned: number;
  loadPercent: number;
};

type DueRow = {
  date: string;
  quantity: number;
};

type DashboardData = {
  cards: Cards;
  statusChart: StatusRow[];
  branchChart: BranchRow[];
  capacityChart: CapacityRow[];
  dueChart: DueRow[];
};

const EMPTY: DashboardData = {
  cards: {
    totalOrders: 0,
    totalQty: 0,
    newOrders: 0,
    plannedOrders: 0,
    runningOrders: 0,
    fullSetOrders: 0,
    completedOrders: 0,
    lateOrders: 0,
  },
  statusChart: [],
  branchChart: [],
  capacityChart: [],
  dueChart: [],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải Dashboard.");
      }

      setData({
        cards: result.cards ?? EMPTY.cards,
        statusChart: result.statusChart ?? [],
        branchChart: result.branchChart ?? [],
        capacityChart: result.capacityChart ?? [],
        dueChart: result.dueChart ?? [],
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải Dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  const bottleneck = useMemo(() => {
    const rows = data.capacityChart.filter((x) => x.capacity > 0);
    if (rows.length === 0) return null;

    return rows.reduce((best, row) =>
      row.loadPercent > best.loadPercent ? row : best
    );
  }, [data.capacityChart]);

  return (
    <AppShell>
      <main className="mx-auto max-w-[1900px] p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Executive Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Dashboard sản xuất cửa thép
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tổng hợp đơn hàng, tiến độ sản xuất và tải công đoạn từ dữ liệu hiện tại.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <MetricCard title="Tổng đơn" value={data.cards.totalOrders} />
          <MetricCard title="Tổng số lượng" value={data.cards.totalQty} />
          <MetricCard title="Mới / Chưa LSX" value={data.cards.newOrders} />
          <MetricCard title="Đã lên kế hoạch" value={data.cards.plannedOrders} />
          <MetricCard title="Đang sản xuất" value={data.cards.runningOrders} />
          <MetricCard title="Đủ bộ" value={data.cards.fullSetOrders} />
          <MetricCard title="Hoàn thành" value={data.cards.completedOrders} />
          <MetricCard
            title="Trễ hạn"
            value={data.cards.lateOrders}
            warning={data.cards.lateOrders > 0}
          />
        </div>

        <div className="mb-5 grid gap-5 xl:grid-cols-2">
          <ChartCard
            title="Cơ cấu tình trạng đơn hàng"
            subtitle="Số đơn theo trạng thái hệ thống hiện tại."
          >
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={data.statusChart}
                  dataKey="count"
                  nameKey="status"
                  outerRadius={110}
                  label
                >
                  {data.statusChart.map((_, index) => (
                    <Cell key={index} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Tiến độ 3 nhánh sản xuất"
            subtitle="Số LSX con đang chạy và đã hoàn thành theo Cánh / Khung / Phào."
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.branchChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="component" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="running" name="Đang chạy" />
                <Bar dataKey="completed" name="Hoàn thành" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="mb-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <ChartCard
            title="Tải Capacity theo WO hôm nay"
            subtitle="So sánh lượng đã điều độ và năng lực hiệu dụng của từng công đoạn."
          >
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={data.capacityChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="woCode" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value, name, props) => [
                    value,
                    name,
                  ]}
                  labelFormatter={(label) => {
                    const row = data.capacityChart.find(
                      (x) => x.woCode === label
                    );
                    return row
                      ? `${row.woCode} - ${row.operationName}`
                      : label;
                  }}
                />
                <Legend />
                <Bar dataKey="capacity" name="Capacity hiệu dụng" />
                <Bar dataKey="planned" name="Đã điều độ" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Nút thắt hôm nay
            </div>

            {bottleneck ? (
              <>
                <div className="mt-3 text-3xl font-bold text-slate-900">
                  {bottleneck.woCode}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-700">
                  {bottleneck.operationName}
                </div>

                <div className="mt-5 grid gap-3">
                  <SmallMetric
                    label="Capacity"
                    value={bottleneck.capacity}
                  />
                  <SmallMetric
                    label="Đã điều độ"
                    value={bottleneck.planned}
                  />
                  <SmallMetric
                    label="Mức tải"
                    value={`${bottleneck.loadPercent}%`}
                  />
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-slate-900"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, bottleneck.loadPercent)
                      )}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="mt-8 text-sm text-slate-400">
                Chưa có dữ liệu Capacity.
              </div>
            )}
          </section>
        </div>

        <ChartCard
          title="Nhu cầu theo ngày giao"
          subtitle="Tổng số lượng đơn theo các ngày giao gần nhất."
        >
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.dueChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
              />
              <YAxis allowDecimals={false} />
              <Tooltip
                labelFormatter={(value) =>
                  formatDate(String(value))
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="quantity"
                name="Số lượng"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </main>
    </AppShell>
  );
}

function MetricCard({
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
      className={`rounded-xl border p-4 shadow-sm ${
        warning
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div
        className={`mt-2 text-2xl font-bold ${
          warning ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "-";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateShort(value: string) {
  if (!value) return "-";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}`;
}
