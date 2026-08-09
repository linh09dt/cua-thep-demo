"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type Lot = {
  id: string;
  lotNo: string;
  totalQty: number;
  canhReady: number;
  khungReady: number;
  phaoReady: number;
  setReady: number;
  setGap: number;
  bottleneckBranch: string;
  gaps: Record<string, number>;
};

type Load = {
  operationId: string;
  woCode: string;
  operationName: string;
  branch: string;
  capacity: number;
  planned: number;
  remaining: number;
  loadPercent: number;
};

type Recommendation = {
  rootId: string;
  orderNo: string;
  lotNo: string;
  branch: string;
  woCode: string;
  operationName: string;
  recommendedQty: number;
  score: number;
  reason: string;
};

export default function BottleneckPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/planning/bottleneck", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải Bottleneck.");
      }
      setLots(result.lots ?? []);
      setLoads(result.operationLoad ?? []);
      setRecommendations(result.recommendations ?? []);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể tải Bottleneck."
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  const topLots = useMemo(
    () => [...lots].filter((x) => x.setGap > 0).sort((a, b) => b.setGap - a.setGap).slice(0, 10),
    [lots]
  );

  const criticalLoads = useMemo(
    () => [...loads].sort((a, b) => b.loadPercent - a.loadPercent),
    [loads]
  );

  return (
    <AppShell>
      <main className="mx-auto max-w-[1850px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase text-blue-600">
            Constraint Management
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">Bottleneck Engine</h1>
          <p className="mt-1 text-sm text-slate-500">
            Một luồng phân tích duy nhất: Set Gap → nhánh thiếu → WO đang tải cao
            → đề xuất LSX cần ưu tiên.
          </p>
        </div>

        {message && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <Header
              title="Bottleneck theo Lô"
              subtitle="Lô có Set Gap lớn nhất được đưa lên trước"
            />
            <div className="space-y-3 p-4">
              {topLots.map((lot) => (
                <div key={lot.id} className="rounded-lg border p-3">
                  <div className="flex justify-between gap-2">
                    <strong>{lot.lotNo}</strong>
                    <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
                      {lot.bottleneckBranch}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <Box title="Cánh Gap" value={lot.gaps.CÁNH} />
                    <Box title="Khung Gap" value={lot.gaps.KHUNG} />
                    <Box title="Phào Gap" value={lot.gaps.PHÀO} />
                    <Box title="Set Gap" value={lot.setGap} />
                  </div>
                  <div className="mt-3 text-xs font-bold text-slate-600">
                    Hành động: ưu tiên nhánh {lot.bottleneckBranch} để tăng Set Ready.
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <Header
              title="Capacity Pressure hôm nay"
              subtitle="Không đề xuất vượt Capacity còn lại"
            />
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <Th>WO</Th>
                    <Th>Công đoạn</Th>
                    <Th>Cap</Th>
                    <Th>Plan</Th>
                    <Th>Còn</Th>
                    <Th>Load</Th>
                  </tr>
                </thead>
                <tbody>
                  {criticalLoads.map((row) => (
                    <tr key={row.operationId} className="border-t">
                      <Td strong>{row.woCode}</Td>
                      <Td>{row.operationName}</Td>
                      <Td center>{row.capacity}</Td>
                      <Td center>{row.planned}</Td>
                      <Td center>{row.remaining}</Td>
                      <Td center>
                        <span
                          className={`rounded-full px-2 py-1 font-bold ${
                            row.loadPercent > 100
                              ? "bg-red-100 text-red-700"
                              : row.loadPercent >= 90
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {row.loadPercent}%
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Header
            title="LSX nên ưu tiên để tháo Bottleneck"
            subtitle="Ngày giao + Bottleneck + Material Ready + Capacity còn lại"
          />
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <Th>Rank</Th>
                  <Th>Đơn</Th>
                  <Th>Lô</Th>
                  <Th>Nhánh</Th>
                  <Th>WO</Th>
                  <Th>SL đề xuất</Th>
                  <Th>Score</Th>
                  <Th>Lý do</Th>
                </tr>
              </thead>
              <tbody>
                {recommendations.slice(0, 30).map((row, index) => (
                  <tr
                    key={`${row.rootId}-${row.branch}`}
                    className="border-t border-slate-200"
                  >
                    <Td center>{index + 1}</Td>
                    <Td strong>{row.orderNo}</Td>
                    <Td center>{row.lotNo || "-"}</Td>
                    <Td center>{row.branch}</Td>
                    <Td>
                      <b>{row.woCode}</b>
                      <div className="mt-1 text-[10px] text-slate-500">
                        {row.operationName}
                      </div>
                    </Td>
                    <Td center strong>{row.recommendedQty}</Td>
                    <Td center>{row.score}</Td>
                    <Td>{row.reason}</Td>
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

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b bg-slate-50 px-4 py-3">
      <b>{title}</b>
      <span className="ml-2 text-xs text-slate-500">{subtitle}</span>
    </div>
  );
}

function Box({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="text-[9px] uppercase text-slate-400">{title}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-3 text-center">{children}</th>;
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
      className={`px-3 py-3 ${center ? "text-center" : ""} ${
        strong ? "font-bold" : ""
      }`}
    >
      {children}
    </td>
  );
}
