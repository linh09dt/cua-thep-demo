"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type DayPlan = {
  date: string;
  planned: number;
  capacity: number;
  loadPercent: number;
};

type Row = {
  operationId: string;
  woCode: string;
  operationName: string;
  componentScope: string;
  capacity: number;
  days: DayPlan[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function WeeklyPlanPage() {
  const [start, setStart] = useState(today());
  const [dates, setDates] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      const response = await fetch(`/api/weekly-plan?start=${start}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải kế hoạch.");
      }
      setDates(result.dates ?? []);
      setRows(result.rows ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải kế hoạch.");
    }
  }

  useEffect(() => {
    loadData();
  }, [start]);

  const summary = useMemo(() => {
    let planned = 0;
    let capacity = 0;
    let overloadCells = 0;
    let highLoadCells = 0;

    for (const row of rows) {
      for (const day of row.days) {
        planned += day.planned;
        capacity += day.capacity;
        if (day.loadPercent > 100) overloadCells += 1;
        else if (day.loadPercent >= 90) highLoadCells += 1;
      }
    }

    return {
      planned,
      capacity,
      overloadCells,
      highLoadCells,
      avgLoad: capacity > 0 ? Math.round((planned / capacity) * 100) : 0,
    };
  }, [rows]);

  return (
    <AppShell>
      <main className="mx-auto max-w-[1900px] p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Phase 4 • Finite Capacity • 7-Day View
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Kế hoạch sản xuất 7 ngày
            </h1>
            <p className="mt-1 max-w-5xl text-sm leading-6 text-slate-500">
              Bản xem nhanh Planned/Capacity theo từng WO trong 7 ngày. Capacity là giới hạn hữu hạn;
              ô quá 100% là Overload cần reschedule. Dùng cùng Schedule Board để xem sâu hơn.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-600">Bắt đầu từ</span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <Link
              href="/schedule-board"
              className="flex h-10 items-center rounded-md bg-blue-600 px-4 text-xs font-bold text-white"
            >
              Mở Schedule Board →
            </Link>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Summary title="Tổng Planned" value={summary.planned} />
          <Summary title="Tổng Capacity" value={summary.capacity} />
          <Summary title="Load TB" value={`${summary.avgLoad}%`} />
          <Summary title="WO-Day tải cao" value={summary.highLoadCells} tone="amber" />
          <Summary title="WO-Day quá tải" value={summary.overloadCells} tone="red" />
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="font-bold text-slate-900">Finite Capacity Matrix</div>
            <div className="mt-1 text-xs text-slate-500">
              Mỗi ô = Planned / Capacity. Priority, Bottleneck, Material và Set Readiness được xử lý ở Smart Planning trước khi planner chốt Dispatch.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-3 py-3 text-left">Nhánh</th>
                  <th className="px-3 py-3 text-left">WO</th>
                  <th className="px-3 py-3 text-left">Công đoạn</th>
                  <th className="px-3 py-3 text-center">Capacity/ngày</th>
                  {dates.map((date) => (
                    <th key={date} className="px-3 py-3 text-center">
                      {formatDate(date)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.operationId} className="border-t border-slate-200">
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${branchClass(row.woCode)}`}>
                        {branchLabel(row.woCode)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900">{row.woCode}</td>
                    <td className="px-3 py-3 text-slate-700">{row.operationName}</td>
                    <td className="px-3 py-3 text-center font-bold">{row.capacity}</td>

                    {row.days.map((day) => (
                      <td key={day.date} className="p-1.5 text-center">
                        <div className={`rounded-md border px-2 py-2 ${loadClass(day.loadPercent)}`}>
                          <div className="font-extrabold">
                            {day.planned}/{day.capacity}
                          </div>
                          <div className="mt-1 text-[10px] font-bold">
                            {day.loadPercent}%
                            {day.loadPercent > 100 ? ` • +${day.planned - day.capacity}` : ""}
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Legend cls="bg-slate-50 border-slate-200" text="0%: chưa có kế hoạch" />
          <Legend cls="bg-emerald-50 border-emerald-200" text="< 90%: còn dư năng lực" />
          <Legend cls="bg-amber-50 border-amber-200" text="90–100%: tải cao" />
          <Legend cls="bg-red-50 border-red-200" text="> 100%: Overload, cần reschedule" />
        </div>
      </main>
    </AppShell>
  );
}

function Summary({
  title,
  value,
  tone = "slate",
}: {
  title: string;
  value: string | number;
  tone?: "slate" | "amber" | "red";
}) {
  const cls =
    tone === "red"
      ? "border-red-200 bg-red-50"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cls}`}>
      <div className="text-[10px] font-bold uppercase text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function loadClass(value: number) {
  if (value === 0) return "border-slate-200 bg-slate-50 text-slate-500";
  if (value < 90) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value <= 100) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function branchLabel(woCode: string) {
  const n = Number(woCode.replace(/\D/g, ""));
  if (n >= 1 && n <= 5) return "CÁNH";
  if (n >= 6 && n <= 10) return "KHUNG";
  if (n >= 11 && n <= 13) return "PHÀO";
  return "ĐỦ BỘ";
}

function branchClass(woCode: string) {
  const branch = branchLabel(woCode);
  if (branch === "CÁNH") return "bg-blue-100 text-blue-700";
  if (branch === "KHUNG") return "bg-emerald-100 text-emerald-700";
  if (branch === "PHÀO") return "bg-violet-100 text-violet-700";
  return "bg-amber-100 text-amber-700";
}

function Legend({ cls, text }: { cls: string; text: string }) {
  return <span className={`rounded-md border px-3 py-2 ${cls}`}>{text}</span>;
}

function formatDate(value: string) {
  const p = value.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : value;
}
