"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type RootRow = {
  rootId: string;
  productionNo: string;
  orderNo: string;
  dealer: string;
  lotNo: string;
  dueDate: string;
  model: string;
  color: string;
  quantity: number;
  canhReady: number;
  khungReady: number;
  phaoReady: number;
  setReady: number;
  setGap: number;
  bottleneckBranch: string;
  materialStatus: string;
  qualityHold: boolean;
  blockingWo?: string;
  blockingOperation?: string;
  blockingCapacityRemaining?: number;
  estimatedDaysToReady?: number | null;
};

type LotRow = {
  id: string;
  lotNo: string;
  totalQty: number;
  canhReady: number;
  khungReady: number;
  phaoReady: number;
  setReady: number;
  setGap: number;
  bottleneckBranch: string;
  materialShortageOrders: number;
  qualityHoldOrders: number;
};

export default function SetReadinessPage() {
  const [rows, setRows] = useState<RootRow[]>([]);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [message, setMessage] = useState("");
  const [onlyGap, setOnlyGap] = useState(true);

  async function load() {
    try {
      const response = await fetch("/api/planning/set-readiness", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải Set Readiness.");
      }
      setRows(result.rows ?? []);
      setLots(result.lots ?? []);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải Set Readiness."
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visibleRows = useMemo(
    () => (onlyGap ? rows.filter((row) => row.setGap > 0) : rows),
    [rows, onlyGap]
  );

  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  const setReady = rows.reduce((sum, row) => sum + row.setReady, 0);
  const setGap = Math.max(0, total - setReady);
  const blocked = rows.filter(
    (row) =>
      row.qualityHold ||
      ["SHORTAGE", "HOLD"].includes(row.materialStatus)
  ).length;

  return (
    <AppShell>
      <main className="mx-auto max-w-[1850px] p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Set Synchronization
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">Set Readiness</h1>
            <p className="mt-1 text-sm text-slate-500">
              Không chỉ nhìn Gap: hệ thống chỉ ra nhánh thiếu, WO đang chặn và
              khả năng hoàn tất theo Capacity hiện tại.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={onlyGap}
              onChange={(event) => setOnlyGap(event.target.checked)}
            />
            Chỉ hiện LSX còn Set Gap
          </label>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi title="Tổng nhu cầu" value={total} />
          <Kpi title="Set Ready" value={setReady} tone="green" />
          <Kpi title="Set Gap" value={setGap} tone="amber" />
          <Kpi title="LSX bị chặn" value={blocked} tone="red" />
          <Kpi title="Lô đang theo dõi" value={lots.length} />
        </div>

        <section className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="font-bold">Set Readiness theo Lô</h2>
            <p className="mt-1 text-xs text-slate-500">
              Set Ready = MIN(Cánh Ready, Khung Ready, Phào Ready) theo từng
              LSX rồi cộng lên Lô. Không cộng chéo giữa các đơn.
            </p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2 xl:grid-cols-3">
            {lots.map((lot) => (
              <div
                key={lot.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex justify-between gap-2">
                  <strong>{lot.lotNo}</strong>
                  <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                    Bottleneck: {lot.bottleneckBranch}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <Mini title="Cánh" value={`${lot.canhReady}/${lot.totalQty}`} />
                  <Mini title="Khung" value={`${lot.khungReady}/${lot.totalQty}`} />
                  <Mini title="Phào" value={`${lot.phaoReady}/${lot.totalQty}`} />
                  <Mini title="Đủ Bộ" value={`${lot.setReady}/${lot.totalQty}`} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                    Set Gap {lot.setGap}
                  </span>
                  <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">
                    Material {lot.materialShortageOrders}
                  </span>
                  <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">
                    Quality Hold {lot.qualityHoldOrders}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="font-bold">LSX cần cân bằng đủ bộ</h2>
            <p className="mt-1 text-xs text-slate-500">
              “WO đang chặn” là công đoạn chưa hoàn tất đầu tiên của nhánh
              Bottleneck. ETA chỉ là ước tính theo Capacity còn lại hiện tại.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1550px] w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <Th>LSX</Th>
                  <Th>Đơn</Th>
                  <Th>Lô</Th>
                  <Th>Ngày giao</Th>
                  <Th>SL</Th>
                  <Th>Cánh</Th>
                  <Th>Khung</Th>
                  <Th>Phào</Th>
                  <Th>SET READY</Th>
                  <Th>Gap</Th>
                  <Th>Bottleneck</Th>
                  <Th>WO đang chặn</Th>
                  <Th>Cap còn</Th>
                  <Th>ETA</Th>
                  <Th>Điều kiện</Th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.rootId} className="border-t border-slate-200">
                    <Td strong>{row.productionNo}</Td>
                    <Td strong>{row.orderNo}</Td>
                    <Td center>{row.lotNo || "-"}</Td>
                    <Td center>{fmt(row.dueDate)}</Td>
                    <Td center>{row.quantity}</Td>
                    <Td center>{row.canhReady}</Td>
                    <Td center>{row.khungReady}</Td>
                    <Td center>{row.phaoReady}</Td>
                    <Td center strong>{row.setReady}</Td>
                    <Td center>{row.setGap}</Td>
                    <Td center>
                      <span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-700">
                        {row.bottleneckBranch}
                      </span>
                    </Td>
                    <Td>
                      <b>{row.blockingWo || "-"}</b>
                      <div className="mt-1 text-[10px] text-slate-500">
                        {row.blockingOperation || "-"}
                      </div>
                    </Td>
                    <Td center>{row.blockingCapacityRemaining ?? 0}</Td>
                    <Td center>
                      {row.estimatedDaysToReady === null
                        ? "Không đủ Capacity"
                        : row.estimatedDaysToReady === 0
                        ? "Đã cân bằng"
                        : `${row.estimatedDaysToReady} ngày`}
                    </Td>
                    <Td center>
                      <span
                        className={
                          row.materialStatus === "READY" && !row.qualityHold
                            ? "font-bold text-emerald-700"
                            : "font-bold text-red-700"
                        }
                      >
                        {row.materialStatus}
                        {row.qualityHold ? " / QC HOLD" : ""}
                      </span>
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

function Kpi({
  title,
  value,
  tone = "blue",
}: {
  title: string;
  value: number;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const css =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className={`rounded-xl border p-4 ${css}`}>
      <div className="text-xs font-bold uppercase">{title}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="text-[9px] uppercase text-slate-400">{title}</div>
      <div className="mt-1 font-extrabold">{value}</div>
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
        strong ? "font-bold text-slate-900" : "text-slate-700"
      }`}
    >
      {children}
    </td>
  );
}

function fmt(value: string) {
  const parts = String(value || "").split("-");
  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : value || "-";
}
