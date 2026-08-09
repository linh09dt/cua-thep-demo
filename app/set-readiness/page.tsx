"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";

type RootRow = { rootId: string; productionNo: string; orderNo: string; dealer: string; lotNo: string; dueDate: string; model: string; color: string; quantity: number; canhReady: number; khungReady: number; phaoReady: number; setReady: number; setGap: number; bottleneckBranch: string; materialStatus: string; qualityHold: boolean };
type LotRow = { id: string; lotNo: string; totalQty: number; canhReady: number; khungReady: number; phaoReady: number; setReady: number; setGap: number; bottleneckBranch: string; materialShortageOrders: number; qualityHoldOrders: number };

export default function SetReadinessPage() {
  const [rows, setRows] = useState<RootRow[]>([]);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    try { const r = await fetch("/api/planning/set-readiness", { cache: "no-store" }); const j = await r.json(); if (!r.ok || !j.success) throw new Error(j.message); setRows(j.rows ?? []); setLots(j.lots ?? []); setMessage(""); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Không thể tải Set Readiness."); }
  }
  useEffect(() => { load(); }, []);

  const total = rows.reduce((s, x) => s + x.quantity, 0);
  const setReady = rows.reduce((s, x) => s + x.setReady, 0);

  return <AppShell><main className="mx-auto max-w-[1800px] p-5">
    <Header />
    {message && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>}
    <div className="mb-5 grid gap-3 sm:grid-cols-4"><Kpi t="Tổng nhu cầu" v={total} /><Kpi t="Set Ready" v={setReady} tone="green" /><Kpi t="Set Gap" v={Math.max(0,total-setReady)} tone="amber" /><Kpi t="Lô đang chạy" v={lots.length} /></div>

    <section className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 p-4"><h2 className="font-bold">Set Readiness theo Lô</h2><p className="mt-1 text-xs text-slate-500">Set Ready = MIN(Cánh Ready, Khung Ready, Phào Ready) theo từng LSX rồi cộng lên Lô.</p></div>
      <div className="grid gap-3 p-4 lg:grid-cols-2 xl:grid-cols-3">{lots.map((lot) => <div key={lot.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-2"><strong>{lot.lotNo}</strong><span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">Bottleneck: {lot.bottleneckBranch}</span></div><div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs"><Mini t="Cánh" v={`${lot.canhReady}/${lot.totalQty}`} /><Mini t="Khung" v={`${lot.khungReady}/${lot.totalQty}`} /><Mini t="Phào" v={`${lot.phaoReady}/${lot.totalQty}`} /><Mini t="Đủ Bộ" v={`${lot.setReady}/${lot.totalQty}`} /></div><div className="mt-3 text-xs text-slate-500">Material shortage: {lot.materialShortageOrders} • Quality Hold: {lot.qualityHoldOrders}</div></div>)}</div>
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[1300px] w-full text-xs"><thead><tr className="bg-slate-900 text-white"><Th>LSX</Th><Th>Đơn</Th><Th>Lô</Th><Th>Ngày giao</Th><Th>SL</Th><Th>Cánh</Th><Th>Khung</Th><Th>Phào</Th><Th>SET READY</Th><Th>Gap</Th><Th>Bottleneck</Th><Th>Điều kiện</Th></tr></thead><tbody>{rows.map((x) => <tr key={x.rootId} className="border-t border-slate-200"><Td strong>{x.productionNo}</Td><Td strong>{x.orderNo}</Td><Td center>{x.lotNo || "-"}</Td><Td center>{fmt(x.dueDate)}</Td><Td center>{x.quantity}</Td><Td center>{x.canhReady}</Td><Td center>{x.khungReady}</Td><Td center>{x.phaoReady}</Td><Td center strong>{x.setReady}</Td><Td center>{x.setGap}</Td><Td center><span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-700">{x.bottleneckBranch}</span></Td><Td center><span className={x.materialStatus === "READY" && !x.qualityHold ? "text-emerald-700" : "text-red-700"}>{x.materialStatus}{x.qualityHold ? " / QC HOLD" : ""}</span></Td></tr>)}</tbody></table></div></section>
  </main></AppShell>;
}

function Header(){return <div className="mb-5"><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Phase 1 • Set Matching</p><h1 className="mt-1 text-2xl font-extrabold">Set Readiness</h1><p className="mt-1 text-sm text-slate-500">Đồng bộ đúng bộ Cánh + Khung + Phào theo từng đơn/LSX trước công đoạn chung.</p></div>}
function Kpi({t,v,tone="blue"}:{t:string;v:number;tone?:string}){const c=tone==="green"?"border-emerald-200 bg-emerald-50 text-emerald-700":tone==="amber"?"border-amber-200 bg-amber-50 text-amber-700":"border-blue-200 bg-blue-50 text-blue-700";return <div className={`rounded-xl border p-4 ${c}`}><div className="text-xs font-bold uppercase">{t}</div><div className="mt-2 text-3xl font-black">{v}</div></div>}
function Mini({t,v}:{t:string;v:string}){return <div className="rounded-lg bg-slate-50 p-2"><div className="text-[9px] uppercase text-slate-400">{t}</div><div className="mt-1 font-extrabold">{v}</div></div>}
function Th({children}:{children?:React.ReactNode}){return <th className="px-3 py-3 text-center">{children}</th>}
function Td({children,center=false,strong=false}:{children:React.ReactNode;center?:boolean;strong?:boolean}){return <td className={`px-3 py-3 ${center?"text-center":""} ${strong?"font-bold text-slate-900":"text-slate-700"}`}>{children}</td>}
function fmt(v:string){const p=String(v||"").split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v||"-"}
