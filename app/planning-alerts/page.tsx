"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type AlertRow = {
  id: string;
  level: "CRITICAL" | "WARNING" | "INFO" | "SUCCESS";
  title: string;
  message: string;
  metric: string;
  href: string;
};

type Filter = "ALL" | "DELIVERY" | "MATERIAL" | "SET" | "CAPACITY" | "QUALITY";

export default function PlanningAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [summary, setSummary] = useState({ critical: 0, warning: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch("/api/planning-alerts", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải cảnh báo.");
      }
      setAlerts(result.alerts ?? []);
      setSummary(result.summary ?? { critical: 0, warning: 0, total: 0 });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải cảnh báo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      ALL: alerts.length,
      DELIVERY: 0,
      MATERIAL: 0,
      SET: 0,
      CAPACITY: 0,
      QUALITY: 0,
    };

    for (const alert of alerts) result[categoryOf(alert)] += 1;
    return result;
  }, [alerts]);

  const visible = useMemo(
    () => alerts.filter((alert) => filter === "ALL" || categoryOf(alert) === filter),
    [alerts, filter]
  );

  return (
    <AppShell>
      <main className="mx-auto max-w-[1650px] p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Planning Exception Management • Phase 1–6
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Cảnh báo kế hoạch</h1>
            <p className="mt-1 max-w-5xl text-sm leading-6 text-slate-500">
              Một nơi gom các ngoại lệ ảnh hưởng đến cam kết giao hàng: trễ đơn, thiếu/Hold vật tư,
              thiếu Set Ready, bottleneck Cánh/Khung/Phào, Capacity quá tải và Quality Hold.
              Planner xử lý ngoại lệ trước khi Release kế hoạch xuống xưởng.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Summary title="Cần xử lý ngay" value={summary.critical} tone="red" />
          <Summary title="Cần theo dõi" value={summary.warning} tone="amber" />
          <Summary title="Material" value={counts.MATERIAL} tone="violet" />
          <Summary title="Set / Bottleneck" value={counts.SET} tone="blue" />
          <Summary title="Quality Hold" value={counts.QUALITY} tone="slate" />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {([
            ["ALL", "Tất cả"],
            ["DELIVERY", "Ngày giao"],
            ["MATERIAL", "Vật tư"],
            ["SET", "Set/Bottleneck"],
            ["CAPACITY", "Capacity"],
            ["QUALITY", "Quality"],
          ] as Array<[Filter, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-2 text-xs font-bold ${
                filter === value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {label} ({counts[value]})
            </button>
          ))}
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">Danh sách ngoại lệ cần xử lý</h2>
              <p className="mt-1 text-xs text-slate-500">
                Ưu tiên: Critical → Warning → Info. Mỗi cảnh báo dẫn đến đúng module cần xử lý.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-500">{visible.length} cảnh báo</div>
          </div>

          <div className="divide-y divide-slate-100">
            {!loading && visible.length === 0 && (
              <div className="p-12 text-center text-sm text-slate-400">
                Không có cảnh báo trong nhóm này.
              </div>
            )}

            {visible.map((alert) => {
              const category = categoryOf(alert);
              return (
                <div
                  key={alert.id}
                  className="grid gap-3 p-4 md:grid-cols-[120px_130px_1fr_auto] md:items-center"
                >
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${levelClass(alert.level)}`}>
                    {levelLabel(alert.level)}
                  </span>

                  <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${categoryClass(category)}`}>
                    {categoryLabel(category)}
                  </span>

                  <div>
                    <div className="font-bold text-slate-900">{alert.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{alert.message}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <strong className="text-sm text-slate-800">{alert.metric}</strong>
                    <Link
                      href={alert.href}
                      className="rounded-md bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                    >
                      Xử lý →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function categoryOf(alert: AlertRow): Exclude<Filter, "ALL"> {
  if (alert.href.startsWith("/material-readiness")) return "MATERIAL";
  if (alert.href.startsWith("/quality")) return "QUALITY";
  if (alert.href.startsWith("/set-readiness") || alert.href.startsWith("/production-lots")) return "SET";
  if (alert.href.startsWith("/dispatch") || alert.href.startsWith("/schedule-board")) return "CAPACITY";
  return "DELIVERY";
}

function Summary({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "red" | "amber" | "blue" | "violet" | "slate";
}) {
  const cls = {
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-xs font-bold uppercase">{title}</div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
    </div>
  );
}

function levelLabel(level: AlertRow["level"]) {
  if (level === "CRITICAL") return "CẦN XỬ LÝ";
  if (level === "WARNING") return "THEO DÕI";
  if (level === "SUCCESS") return "TỐT";
  return "THÔNG TIN";
}

function levelClass(level: AlertRow["level"]) {
  if (level === "CRITICAL") return "bg-red-100 text-red-700";
  if (level === "WARNING") return "bg-amber-100 text-amber-700";
  if (level === "SUCCESS") return "bg-emerald-100 text-emerald-700";
  return "bg-blue-100 text-blue-700";
}

function categoryLabel(category: Exclude<Filter, "ALL">) {
  if (category === "MATERIAL") return "MATERIAL";
  if (category === "QUALITY") return "QUALITY";
  if (category === "SET") return "SET / BOTTLENECK";
  if (category === "CAPACITY") return "CAPACITY";
  return "DELIVERY";
}

function categoryClass(category: Exclude<Filter, "ALL">) {
  if (category === "MATERIAL") return "bg-violet-100 text-violet-700";
  if (category === "QUALITY") return "bg-rose-100 text-rose-700";
  if (category === "SET") return "bg-cyan-100 text-cyan-700";
  if (category === "CAPACITY") return "bg-orange-100 text-orange-700";
  return "bg-sky-100 text-sky-700";
}
