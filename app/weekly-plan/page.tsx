"use client";

import { useEffect, useState } from "react";
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

  return (
    <AppShell>
      <main className="mx-auto max-w-[1900px] p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Weekly Production Load
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Kế hoạch sản xuất 7 ngày
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              So sánh lượng Dispatch với Capacity từng WO. Ô đỏ là quá tải.
            </p>
          </div>

          <label>
            <span className="mb-1 block text-xs font-bold text-slate-600">
              Bắt đầu từ
            </span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            />
          </label>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1450px] w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
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
          <Legend cls="bg-slate-50 border-slate-200" text="Chưa có kế hoạch" />
          <Legend cls="bg-emerald-50 border-emerald-200" text="< 80% Capacity" />
          <Legend cls="bg-amber-50 border-amber-200" text="80–100% Capacity" />
          <Legend cls="bg-red-50 border-red-200" text="> 100% Quá tải" />
        </div>
      </main>
    </AppShell>
  );
}

function loadClass(value: number) {
  if (value === 0) return "border-slate-200 bg-slate-50 text-slate-500";
  if (value < 80) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value <= 100) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function Legend({ cls, text }: { cls: string; text: string }) {
  return <span className={`rounded-md border px-3 py-2 ${cls}`}>{text}</span>;
}

function formatDate(value: string) {
  const p = value.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : value;
}
