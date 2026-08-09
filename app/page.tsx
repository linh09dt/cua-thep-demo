"use client";

import Link from "next/link";
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

type PlanningAlert = {
  id: string;
  level: "CRITICAL" | "WARNING" | "INFO" | "SUCCESS";
  title: string;
  message: string;
  metric: string;
  href: string;
};

type AdvancedKpi = {
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
  orderCount: number;
};

type AttentionOrder = {
  orderNo: string;
  dealer: string;
  dueDate: string;
  status: string;
  note: string;
  warning: string;
};

type OverallRow = {
  status: string;
  quantity: number;
  percent: number;
};

type DashboardData = {
  cards: Cards;
  advancedKpi: AdvancedKpi;
  topBottlenecks: BottleneckLot[];
  statusChart: StatusRow[];
  branchChart: BranchRow[];
  capacityChart: CapacityRow[];
  dueChart: DueRow[];
  attentionOrders: AttentionOrder[];
  overallProgress: {
    percent: number;
    totalQty: number;
    rows: OverallRow[];
  };
};

const EMPTY: DashboardData = {
  advancedKpi: {
    materialReady: 0,
    materialShortage: 0,
    setReadyQty: 0,
    setGapQty: 0,
    openQuality: 0,
    qualityHold: 0,
    overloadedWorkCenters: 0,
    highLoadWorkCenters: 0,
    recommendationCount: 0,
  },
  topBottlenecks: [],
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
  attentionOrders: [],
  overallProgress: {
    percent: 0,
    totalQty: 0,
    rows: [],
  },
};

const STATUS_COLORS = ["#9ca3af", "#2f80ed", "#8b5cf6", "#18b7bd"];
const PROGRESS_COLORS: Record<string, string> = {
  "Hoàn thành": "#2fad4a",
  "Đang sản xuất": "#8b46e8",
  "Đã lên kế hoạch": "#3b82f6",
  "Mới / Chưa LSX": "#f4b400",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [planningAlerts, setPlanningAlerts] = useState<PlanningAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
    loadPlanningAlerts();
  }, []);

  async function loadPlanningAlerts() {
    try {
      const response = await fetch("/api/planning-alerts", {
        cache: "no-store",
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setPlanningAlerts((result.alerts ?? []).slice(0, 3));
      }
    } catch {
      // Dashboard chính vẫn hoạt động nếu cảnh báo tạm thời chưa tải được.
    }
  }

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
        advancedKpi: result.advancedKpi ?? EMPTY.advancedKpi,
        topBottlenecks: result.topBottlenecks ?? [],
        statusChart: result.statusChart ?? [],
        branchChart: result.branchChart ?? [],
        capacityChart: result.capacityChart ?? [],
        dueChart: result.dueChart ?? [],
        attentionOrders: result.attentionOrders ?? [],
        overallProgress: result.overallProgress ?? EMPTY.overallProgress,
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

  const totalStatus = useMemo(
    () => data.statusChart.reduce((sum, row) => sum + row.count, 0),
    [data.statusChart]
  );

  return (
    <AppShell>
      <main className="dashboard-page">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-bold text-[#17365b]">
              Dashboard điều hành
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tổng hợp tình hình sản xuất theo thời gian thực
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadData();
              loadPlanningAlerts();
            }}
            disabled={loading}
            className="rounded-lg border border-[#cbd9e8] bg-white px-4 py-2 text-xs font-semibold text-[#315273] shadow-sm hover:bg-slate-50 disabled:opacity-40"
          >
            {loading ? "Đang tải..." : "↻ Tải lại"}
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <Link
          href="/control-tower"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm transition hover:border-blue-300"
        >
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wide text-blue-700">
              Production Control Tower
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Xem một luồng ngoại lệ duy nhất: Delivery → Material → Set/Bottleneck → Capacity/WIP → Quality.
            </div>
          </div>
          <span className="text-xs font-bold text-blue-700">
            Mở Control Tower →
          </span>
        </Link>

        {planningAlerts.length > 0 && (
          <section className="mb-4 rounded-xl border border-amber-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wide text-amber-700">
                  Cảnh báo kế hoạch
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  ERP phát hiện các điểm cần ưu tiên
                </span>
              </div>
              <Link
                href="/planning-alerts"
                className="text-xs font-bold text-blue-700"
              >
                Xem tất cả →
              </Link>
            </div>

            <div className="grid gap-0 md:grid-cols-3">
              {planningAlerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className="border-b border-slate-100 p-4 hover:bg-slate-50 md:border-b-0 md:border-r"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${
                        alert.level === "CRITICAL"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {alert.level === "CRITICAL" ? "CẦN XỬ LÝ" : "THEO DÕI"}
                    </span>
                    <strong className="text-xs text-slate-700">
                      {alert.metric}
                    </strong>
                  </div>
                  <div className="mt-2 text-sm font-bold text-slate-900">
                    {alert.title}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                    {alert.message}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mb-4 rounded-xl border border-blue-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wide text-blue-700">
                Advanced Planning KPI
              </span>
              <span className="ml-2 text-xs text-slate-500">
                Material • Set Ready • Bottleneck • Quality
              </span>
            </div>
            <Link href="/smart-planning" className="text-xs font-bold text-blue-700">
              Mở Smart Planning →
            </Link>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
            <Link href="/material-readiness"><MiniKpi title="Material Ready" value={data.advancedKpi.materialReady} tone="green" /></Link>
            <Link href="/material-readiness"><MiniKpi title="Material Shortage" value={data.advancedKpi.materialShortage} tone="red" /></Link>
            <Link href="/set-readiness"><MiniKpi title="Set Ready" value={data.advancedKpi.setReadyQty} tone="green" /></Link>
            <Link href="/bottleneck"><MiniKpi title="Set Gap" value={data.advancedKpi.setGapQty} tone="amber" /></Link>
            <Link href="/quality"><MiniKpi title="Quality Open" value={data.advancedKpi.openQuality} tone="amber" /></Link>
            <Link href="/quality"><MiniKpi title="Quality Hold" value={data.advancedKpi.qualityHold} tone="red" /></Link>
            <Link href="/schedule-board"><MiniKpi title="WO Overload" value={data.advancedKpi.overloadedWorkCenters} tone="red" /></Link>
            <Link href="/smart-planning"><MiniKpi title="Smart Recs" value={data.advancedKpi.recommendationCount} tone="blue" /></Link>
          </div>

          {data.topBottlenecks.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {data.topBottlenecks.map((lot) => (
                  <Link key={lot.id} href="/bottleneck" className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-bold text-amber-800">
                    {lot.lotNo}: {lot.bottleneckBranch} • Gap {lot.setGap}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
          <MetricCard
            title="Tổng số đơn hàng"
            value={data.cards.totalOrders}
            icon="▤"
            tone="blue"
            note="Tổng đơn trong hệ thống"
          />
          <MetricCard
            title="Tổng số lượng (Bộ)"
            value={formatNumber(data.cards.totalQty)}
            icon="◇"
            tone="green"
            note="Tổng nhu cầu sản xuất"
          />
          <MetricCard
            title="Mới / Chưa LSX"
            value={data.cards.newOrders}
            icon="◷"
            tone="amber"
            note={`${percent(data.cards.newOrders, data.cards.totalOrders)} tổng đơn`}
          />
          <MetricCard
            title="Đã lên kế hoạch"
            value={data.cards.plannedOrders}
            icon="▣"
            tone="blue"
            note={`${percent(data.cards.plannedOrders, data.cards.totalOrders)} tổng đơn`}
          />
          <MetricCard
            title="Đang sản xuất"
            value={data.cards.runningOrders}
            icon="♜"
            tone="violet"
            note={`${percent(data.cards.runningOrders, data.cards.totalOrders)} tổng đơn`}
          />
          <MetricCard
            title="Đủ bộ"
            value={data.cards.fullSetOrders}
            icon="✣"
            tone="green"
            note="Sẵn sàng WO14"
          />
          <MetricCard
            title="Hoàn thành"
            value={data.cards.completedOrders}
            icon="✓"
            tone="cyan"
            note="Đơn đã hoàn thành"
          />
          <MetricCard
            title="Trễ hạn"
            value={data.cards.lateOrders}
            icon="⏰"
            tone="red"
            note={data.cards.lateOrders > 0 ? "Cần xử lý" : "Không có trễ hạn"}
          />
        </div>

        <div className="mb-4 grid gap-4 2xl:grid-cols-[0.95fr_1.25fr_0.58fr]">
          <Panel title="Cơ cấu tình trạng đơn hàng">
            <div className="grid min-h-[300px] items-center gap-3 md:grid-cols-[1fr_1.1fr]">
              <div className="relative h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.statusChart}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={72}
                      outerRadius={108}
                      paddingAngle={1}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {data.statusChart.map((_, index) => (
                        <Cell
                          key={index}
                          fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-slate-500">Tổng</div>
                    <div className="text-3xl font-extrabold text-[#17365b]">
                      {totalStatus}
                    </div>
                    <div className="text-xs font-semibold text-slate-500">đơn</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {data.statusChart.map((row, index) => (
                  <div
                    key={row.status}
                    className="grid grid-cols-[12px_1fr_auto] items-center gap-2 text-xs"
                  >
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{
                        backgroundColor:
                          STATUS_COLORS[index % STATUS_COLORS.length],
                      }}
                    />
                    <span className="font-semibold text-slate-600">
                      {row.status}
                    </span>
                    <span className="font-bold text-[#17365b]">
                      {row.count} ({percentNumber(row.count, totalStatus)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Số LSX con đang chạy và đã hoàn thành theo nhánh">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.branchChart}
                  margin={{ top: 20, right: 14, left: -12, bottom: 0 }}
                  barCategoryGap="38%"
                >
                  <CartesianGrid stroke="#dbe3ec" strokeDasharray="3 3" />
                  <XAxis dataKey="component" tick={{ fontSize: 11, fill: "#42546a" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar
                    dataKey="completed"
                    name="Hoàn thành"
                    fill="#31ad55"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={58}
                  />
                  <Bar
                    dataKey="running"
                    name="Đang chạy"
                    fill="#2f80ed"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={58}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <BottleneckCard bottleneck={bottleneck} />
        </div>

        <div className="mb-4 grid gap-4 2xl:grid-cols-[1fr_1fr]">
          <Panel
            title="Tải Capacity theo WO hôm nay"
            subtitle="So sánh lượng đã điều độ và năng lực hiệu dụng của từng công đoạn."
          >
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.capacityChart}
                  margin={{ top: 10, right: 12, left: -12, bottom: 2 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid stroke="#dbe3ec" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="woCode"
                    tick={{ fontSize: 9, fill: "#42546a" }}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(label) => {
                      const row = data.capacityChart.find(
                        (x) => x.woCode === label
                      );
                      return row
                        ? `${row.woCode} - ${row.operationName}`
                        : label;
                    }}
                  />
                  <Legend
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar
                    dataKey="capacity"
                    name="Capacity hiệu dụng"
                    fill="#85c6ff"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="planned"
                    name="Đã điều độ"
                    fill="#173f7a"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Nhu cầu theo ngày giao (10 ngày tới)"
            subtitle="Theo dõi đồng thời số đơn và tổng số lượng cần giao."
          >
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.dueChart}
                  margin={{ top: 10, right: 14, left: -12, bottom: 2 }}
                >
                  <CartesianGrid stroke="#dbe3ec" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tick={{ fontSize: 10, fill: "#42546a" }}
                  />
                  <YAxis
                    yAxisId="orders"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#2f80ed" }}
                  />
                  <YAxis
                    yAxisId="qty"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#2fad4a" }}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      formatDate(String(value))
                    }
                  />
                  <Legend
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Line
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orderCount"
                    name="Số đơn"
                    stroke="#2f80ed"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="qty"
                    type="monotone"
                    dataKey="quantity"
                    name="Số lượng (Bộ)"
                    stroke="#2fad4a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 2xl:grid-cols-[1.15fr_0.85fr]">
          <AttentionTable rows={data.attentionOrders} />
          <OverallProgress data={data.overallProgress} />
        </div>
      </main>
    </AppShell>
  );
}

type Tone = "blue" | "green" | "amber" | "violet" | "cyan" | "red";

function MiniKpi({
  title,
  value,
  tone = "blue",
}: {
  title: string;
  value: string | number;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  note,
  tone,
}: {
  title: string;
  value: string | number;
  icon: string;
  note: string;
  tone: Tone;
}) {
  const styles: Record<Tone, string> = {
    blue: "border-[#bfdafa] bg-[#f2f8ff] text-[#1671d9]",
    green: "border-[#bfe5c8] bg-[#f2fbf4] text-[#20a94a]",
    amber: "border-[#f3d88b] bg-[#fffaf0] text-[#ed9d00]",
    violet: "border-[#dbc4ff] bg-[#f9f3ff] text-[#8e45e8]",
    cyan: "border-[#b8e5e9] bg-[#f1fcfd] text-[#16a8b1]",
    red: "border-[#f3c1c1] bg-[#fff5f5] text-[#ef3f3f]",
  };

  return (
    <div className={`relative min-h-[112px] rounded-xl border p-4 shadow-sm ${styles[tone]}`}>
      <div className="pr-10 text-xs font-bold">{title}</div>
      <div className="mt-2 text-[29px] font-extrabold leading-none text-[#17365b]">
        {value}
      </div>
      <div className="mt-2 text-[10px] font-semibold opacity-80">
        {note}
      </div>
      <div className="absolute right-3 top-9 flex h-9 w-9 items-center justify-center rounded-full border border-current/20 bg-white/50 text-xl font-black">
        {icon}
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#dbe4ee] bg-white p-4 shadow-sm">
      <div className="mb-2">
        <h2 className="text-sm font-bold text-[#17365b]">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-[10px] text-slate-500">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function BottleneckCard({
  bottleneck,
}: {
  bottleneck: CapacityRow | null;
}) {
  if (!bottleneck) {
    return (
      <Panel title="NÚT THẮT HÔM NAY">
        <div className="py-16 text-center text-sm text-slate-400">
          Chưa có dữ liệu Capacity.
        </div>
      </Panel>
    );
  }

  const overloaded = bottleneck.loadPercent > 100;

  return (
    <section className="rounded-xl border border-[#f0d8d8] bg-white p-4 shadow-sm">
      <div className="text-xs font-extrabold uppercase tracking-wide text-[#ef3f3f]">
        Nút thắt hôm nay
      </div>

      <div className="mt-3 text-2xl font-extrabold text-[#17365b]">
        {bottleneck.woCode}
      </div>
      <div className="text-sm font-bold text-slate-700">
        {bottleneck.operationName}
      </div>

      <div
        className={`mt-3 inline-flex rounded-md border px-2.5 py-1 text-xs font-extrabold ${
          overloaded
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}
      >
        {overloaded
          ? `Quá tải ${bottleneck.loadPercent}%`
          : `Mức tải ${bottleneck.loadPercent}%`}
      </div>

      <div className="mt-4 space-y-2.5">
        <SmallStatus
          label="CAPACITY HIỆU DỤNG"
          value={`${formatNumber(bottleneck.capacity)} Bộ`}
          tone="blue"
        />
        <SmallStatus
          label="ĐÃ ĐIỀU ĐỘ"
          value={`${formatNumber(bottleneck.planned)} Bộ`}
          tone={overloaded ? "red" : "blue"}
        />
        <SmallStatus
          label="MỨC TẢI"
          value={`${bottleneck.loadPercent}%`}
          tone={overloaded ? "red" : "blue"}
        />
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${
            overloaded ? "bg-red-500" : "bg-blue-600"
          }`}
          style={{
            width: `${Math.min(
              100,
              Math.max(0, bottleneck.loadPercent)
            )}%`,
          }}
        />
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        {overloaded
          ? "Cần ưu tiên điều phối để giảm tải công đoạn này."
          : "Công đoạn đang trong giới hạn Capacity."}
      </div>
    </section>
  );
}

function SmallStatus({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "red";
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        tone === "red"
          ? "border-red-100 bg-red-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div
        className={`text-[10px] font-bold ${
          tone === "red" ? "text-red-500" : "text-blue-600"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-extrabold ${
          tone === "red" ? "text-red-600" : "text-[#17365b]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function AttentionTable({
  rows,
}: {
  rows: AttentionOrder[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#dbe4ee] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-bold text-[#17365b]">
          Đơn hàng cần chú ý
        </h2>
        <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
          Ưu tiên theo ngày giao
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-xs">
          <thead>
            <tr className="!bg-[#f7f9fc] text-slate-500">
              <th className="px-4 py-2 text-left">Số đơn hàng</th>
              <th className="px-4 py-2 text-left">Khách hàng</th>
              <th className="px-4 py-2 text-center">Ngày giao</th>
              <th className="px-4 py-2 text-center">Tình trạng</th>
              <th className="px-4 py-2 text-left">Ghi chú</th>
              <th className="px-4 py-2 text-center">Cảnh báo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Không có đơn hàng cần chú ý.
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.orderNo} className="border-t border-slate-100">
                <td className="px-4 py-2 font-bold text-blue-600">{row.orderNo}</td>
                <td className="px-4 py-2 text-slate-700">{row.dealer || "-"}</td>
                <td className="px-4 py-2 text-center text-slate-600">
                  {formatDate(row.dueDate)}
                </td>
                <td className="px-4 py-2 text-center">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-4 py-2 text-slate-600">{row.note}</td>
                <td className="px-4 py-2 text-center text-amber-600">
                  {row.warning}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  let cls = "border-slate-200 bg-slate-50 text-slate-600";

  if (status === "Trễ hạn") {
    cls = "border-red-200 bg-red-50 text-red-600";
  } else if (status === "Đang sản xuất") {
    cls = "border-violet-200 bg-violet-50 text-violet-600";
  } else if (status === "Đã lên kế hoạch") {
    cls = "border-blue-200 bg-blue-50 text-blue-600";
  } else if (status === "Hoàn thành") {
    cls = "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold ${cls}`}>
      {status}
    </span>
  );
}

function OverallProgress({
  data,
}: {
  data: DashboardData["overallProgress"];
}) {
  const pct = Math.max(0, Math.min(100, data.percent));

  return (
    <section className="rounded-xl border border-[#dbe4ee] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-[#17365b]">
        Tiến độ tổng thể
      </h2>

      <div className="mt-3 grid items-center gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative mx-auto h-[170px] w-[260px] overflow-hidden">
          <div
            className="absolute left-5 top-5 h-[220px] w-[220px] rounded-full"
            style={{
              background: `conic-gradient(from 270deg, #2fad4a 0deg ${
                pct * 1.8
              }deg, #e8edf3 ${pct * 1.8}deg 180deg, transparent 180deg 360deg)`,
            }}
          />
          <div className="absolute left-[53px] top-[53px] h-[154px] w-[154px] rounded-full bg-white" />
          <div className="absolute inset-x-0 top-[78px] text-center">
            <div className="text-4xl font-extrabold text-[#2fad4a]">
              {pct}%
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500">
              Tiến độ sản xuất
            </div>
            <div className="text-[10px] text-slate-400">
              tính theo số lượng
            </div>
          </div>
          <div className="absolute bottom-0 left-5 right-5 flex justify-between text-[10px] text-slate-500">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="space-y-3">
          {data.rows.map((row) => (
            <div
              key={row.status}
              className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-xs"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    PROGRESS_COLORS[row.status] ?? "#94a3b8",
                }}
              />
              <span className="font-semibold text-slate-600">{row.status}</span>
              <span className="font-bold text-[#17365b]">
                {formatNumber(row.quantity)} Bộ ({row.percent}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function percent(value: number, total: number) {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function percentNumber(value: number, total: number) {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
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
