"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";

type AlertRow = {
  id: string;
  level: "CRITICAL" | "WARNING" | "INFO" | "SUCCESS";
  title: string;
  message: string;
  metric: string;
  href: string;
};

export default function PlanningAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [summary, setSummary] = useState({
    critical: 0,
    warning: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch("/api/planning-alerts", {
        cache: "no-store",
      });
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

  return (
    <AppShell>
      <main className="mx-auto max-w-[1600px] p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Planning Exception Management
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Cảnh báo kế hoạch
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              ERP tự phát hiện đơn trễ, công đoạn quá tải và Lô mất cân bằng Cánh / Khung / Phào.
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

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Summary title="Cảnh báo nghiêm trọng" value={summary.critical} tone="red" />
          <Summary title="Cần theo dõi" value={summary.warning} tone="amber" />
          <Summary title="Tổng cảnh báo" value={summary.total} tone="blue" />
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="font-bold text-slate-900">Danh sách cần xử lý</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {!loading && alerts.length === 0 && (
              <div className="p-12 text-center text-sm text-slate-400">
                Không có cảnh báo đáng chú ý.
              </div>
            )}

            {alerts.map((alert) => (
              <div key={alert.id} className="grid gap-3 p-4 md:grid-cols-[110px_1fr_auto] md:items-center">
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${levelClass(alert.level)}`}>
                  {levelLabel(alert.level)}
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
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function Summary({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "red" | "amber" | "blue";
}) {
  const cls =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

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
