"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type Row = {
  rootId: string;
  productionNo: string;
  orderNo: string;
  dealer: string;
  dueDate: string;
  model: string;
  color: string;
  quantity: number;
  lotNo: string;
  materialStatus: string;
  materialPercent: number;
  materialConfigured: boolean;
  materialNote: string;
};

export default function MaterialReadinessPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");

  async function loadData() {
    try {
      const r = await fetch("/api/planning/material-readiness", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message);
      setRows(j.rows ?? []);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không thể tải Material Readiness.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function save(row: Row, status: string) {
    setWorking(row.rootId);
    try {
      const readinessPercent = status === "READY" ? 100 : status === "PARTIAL" ? 50 : 0;
      const r = await fetch("/api/planning/material-readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionOrderId: row.rootId,
          status,
          readinessPercent,
          shortageNote: status === "SHORTAGE" ? "Thiếu vật tư - cần xác nhận" : "",
          confirmedBy: "Planner",
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message);
      setRows(j.rows ?? []);
      setMessage(`Đã cập nhật ${row.productionNo}: ${status}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không thể cập nhật.");
    } finally {
      setWorking("");
    }
  }

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return rows;
    return rows.filter((x) =>
      [x.productionNo, x.orderNo, x.dealer, x.model, x.color, x.lotNo]
        .some((v) => String(v ?? "").toLowerCase().includes(key))
    );
  }, [rows, search]);

  const ready = rows.filter((x) => x.materialStatus === "READY").length;
  const shortage = rows.filter((x) => ["SHORTAGE", "HOLD"].includes(x.materialStatus)).length;

  return (
    <AppShell>
      <main className="mx-auto max-w-[1800px] p-5">
        <Header title="Material Readiness" subtitle="Phase 1 • Chỉ cho kế hoạch chạy khi vật tư đủ điều kiện." />
        {message && <Notice text={message} />}

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Kpi title="LSX Cha" value={rows.length} />
          <Kpi title="Material Ready" value={ready} tone="green" />
          <Kpi title="Shortage / Hold" value={shortage} tone="red" />
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h2 className="font-bold text-slate-900">Xác nhận vật tư theo LSX</h2>
              <p className="mt-1 text-xs text-slate-500">READY / PARTIAL / SHORTAGE / HOLD. Chưa cấu hình được coi READY trong demo để không làm gián đoạn luồng hiện tại.</p>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm LSX, đơn, model..." className="h-10 min-w-[280px] rounded-md border border-slate-300 px-3 text-sm" />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1300px] w-full text-xs">
              <thead><tr className="bg-slate-900 text-white"><Th>LSX</Th><Th>Đơn</Th><Th>Khách hàng</Th><Th>Ngày giao</Th><Th>Lô</Th><Th>Model</Th><Th>Màu</Th><Th>SL</Th><Th>Material</Th><Th>Thao tác</Th></tr></thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.rootId} className="border-t border-slate-200">
                    <Td strong>{row.productionNo}</Td><Td strong>{row.orderNo}</Td><Td>{row.dealer}</Td><Td center>{fmt(row.dueDate)}</Td><Td center>{row.lotNo || "-"}</Td><Td center>{row.model}</Td><Td center>{row.color}</Td><Td center strong>{row.quantity}</Td>
                    <Td center><Badge value={row.materialStatus} /><div className="mt-1 text-[10px] text-slate-400">{row.materialConfigured ? `${row.materialPercent}%` : "Auto demo"}</div></Td>
                    <Td center>
                      <div className="flex justify-center gap-1">
                        {[
                          ["READY", "Đủ"], ["PARTIAL", "Một phần"], ["SHORTAGE", "Thiếu"], ["HOLD", "Hold"],
                        ].map(([status, label]) => (
                          <button key={status} disabled={working === row.rootId} onClick={() => save(row, status)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-bold hover:bg-slate-50 disabled:opacity-40">{label}</button>
                        ))}
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

function Header({ title, subtitle }: { title: string; subtitle: string }) { return <div className="mb-5"><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Advanced Planning</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>; }
function Notice({ text }: { text: string }) { return <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{text}</div>; }
function Kpi({ title, value, tone = "blue" }: { title: string; value: number; tone?: string }) { const cls = tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-700"; return <div className={`rounded-xl border p-4 ${cls}`}><div className="text-xs font-bold uppercase">{title}</div><div className="mt-2 text-3xl font-black">{value}</div></div>; }
function Badge({ value }: { value: string }) { const cls = value === "READY" ? "bg-emerald-100 text-emerald-700" : value === "PARTIAL" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${cls}`}>{value}</span>; }
function Th({ children }: { children?: React.ReactNode }) { return <th className="px-3 py-3 text-center font-bold">{children}</th>; }
function Td({ children, center = false, strong = false }: { children: React.ReactNode; center?: boolean; strong?: boolean }) { return <td className={`px-3 py-3 ${center ? "text-center" : ""} ${strong ? "font-bold text-slate-900" : "text-slate-700"}`}>{children}</td>; }
function fmt(v: string) { const p = String(v || "").split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : v || "-"; }
