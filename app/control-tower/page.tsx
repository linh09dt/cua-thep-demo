"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

const today = () => new Date().toISOString().slice(0, 10);

export default function ControlTowerPage() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/control-tower?date=${date}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setData(result);
          setMessage("");
        } else {
          setMessage(result.message || "Không tải được Control Tower.");
        }
      })
      .catch(() => setMessage("Không tải được Control Tower."));
  }, [date]);

  const kpi = data?.kpi ?? {};

  const primaryActions = useMemo(
    () => (data?.actions ?? []).slice(0, 10),
    [data]
  );

  return (
    <AppShell>
      <main className="mx-auto max-w-[1900px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">
              PRODUCTION CONTROL TOWER
            </p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Trung tâm điều hành sản xuất
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Chỉ hiển thị ngoại lệ cần hành động theo một thứ tự duy nhất:
              Delivery → Material → Set/Bottleneck → Capacity/WIP → Quality.
            </p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 rounded-lg border px-3"
          />
        </div>

        {message && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
            {message}
          </div>
        )}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">
              Ngoại lệ cần xử lý
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Card không lặp ý; mỗi card drill-down về đúng module xử lý.
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <Card title="Late / Blocked" value={(kpi.late ?? 0) + (kpi.blocked ?? 0)} href="/delivery-risk" tone="red" />
            <Card title="At Risk" value={kpi.atRisk ?? 0} href="/delivery-risk" tone="amber" />
            <Card title="Material Shortage" value={kpi.materialShortage ?? 0} href="/material-requirements" tone="red" />
            <Card title="Set Gap" value={kpi.setGap ?? 0} href="/set-readiness" tone="amber" />
            <Card title="WO Overload" value={kpi.overload ?? 0} href="/schedule-board" tone="red" />
            <Card title="WIP Alerts" value={(kpi.wipLow ?? 0) + (kpi.wipHigh ?? 0)} href="/configuration" tone="amber" />
            <Card title="Quality Hold" value={kpi.qualityHold ?? 0} href="/quality" tone="red" />
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-xl border bg-white">
            <Header
              title="Việc cần xử lý ngay"
              subtitle="High trước, sau đó Medium"
            />
            <div className="grid gap-2 p-4 md:grid-cols-2">
              {primaryActions.map((action: any, index: number) => (
                <Link
                  key={`${action.type}-${action.title}-${index}`}
                  href={action.href}
                  className={`rounded-lg border p-3 ${
                    action.severity === "HIGH"
                      ? "border-red-200 bg-red-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <b>
                      {action.type} • {action.title}
                    </b>
                    <span className="text-[10px] font-black">
                      {action.severity}
                    </span>
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">
                    {action.detail}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-white">
            <Header
              title="Top Delivery Risk"
              subtitle="Ngày giao + Material + Set Gap + Quality"
            />
            <div className="max-h-[440px] overflow-auto">
              {(data?.risks ?? []).map((risk: any) => (
                <div
                  key={risk.rootId}
                  className="border-t p-3 first:border-t-0"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <b>{risk.orderNo}</b>
                      <div className="text-xs text-slate-500">
                        {risk.lotNo || "-"} • giao {risk.dueDate}
                      </div>
                    </div>
                    <Pill value={risk.riskLevel} />
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    {risk.riskReasons}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <section className="rounded-xl border bg-white">
            <Header
              title="Capacity Pressure"
              subtitle={`Carry Over toàn nhà máy: ${kpi.carryOver ?? 0}`}
            />
            <div className="space-y-3 p-4">
              {(data?.loads ?? []).slice(0, 8).map((load: any) => (
                <div key={load.operationId}>
                  <div className="flex justify-between text-xs">
                    <b>
                      {load.woCode} • {load.operationName}
                    </b>
                    <span>
                      {load.planned}/{load.capacity} • {load.loadPercent}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-slate-100">
                    <div
                      className={`h-2 rounded ${
                        load.loadPercent > 100
                          ? "bg-red-500"
                          : load.loadPercent >= 90
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(100, load.loadPercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-white">
            <Header
              title="Set / Bottleneck"
              subtitle="Lô lệch Cánh - Khung - Phào"
            />
            <div className="space-y-2 p-4">
              {(data?.lots ?? []).slice(0, 8).map((lot: any) => (
                <Link
                  href="/bottleneck"
                  key={lot.id}
                  className="flex justify-between rounded-lg border bg-slate-50 p-3 text-xs"
                >
                  <span>
                    <b>{lot.lotNo}</b>
                    <br />
                    <span className="text-slate-500">
                      Bottleneck {lot.bottleneckBranch}
                    </span>
                  </span>
                  <span className="text-right">
                    <b>Gap {lot.setGap}</b>
                    <br />
                    Ready {lot.setReady}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-white">
            <Header
              title="Material Pressure"
              subtitle="Vật tư thiếu ảnh hưởng trực tiếp kế hoạch"
            />
            <div className="space-y-2 p-4">
              {(data?.material ?? []).slice(0, 8).map((material: any) => (
                <Link
                  href="/material-requirements"
                  key={material.materialId}
                  className="flex justify-between rounded-lg border p-3 text-xs"
                >
                  <span>
                    <b>{material.code}</b>
                    <br />
                    <span className="text-slate-500">{material.name}</span>
                  </span>
                  <span className="text-right">
                    <b
                      className={
                        material.shortage > 0 ? "text-red-600" : ""
                      }
                    >
                      Thiếu {material.shortage}
                    </b>
                    <br />
                    {material.coveragePercent}% cover
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function Card({
  title,
  value,
  href,
  tone,
}: {
  title: string;
  value: number;
  href: string;
  tone: "red" | "amber";
}) {
  const css =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <Link href={href} className={`rounded-xl border p-4 shadow-sm ${css}`}>
      <div className="text-[10px] font-black uppercase text-slate-500">
        {title}
      </div>
      <div className="mt-1 text-3xl font-black">{value}</div>
      <div className="mt-2 text-[10px] font-bold text-blue-600">
        Drill-down →
      </div>
    </Link>
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

function Pill({ value }: { value: string }) {
  const css =
    value === "LATE" || value === "BLOCKED"
      ? "bg-red-100 text-red-700"
      : value === "AT_RISK"
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";

  return (
    <span className={`h-fit rounded-full px-2 py-1 text-[10px] font-black ${css}`}>
      {value}
    </span>
  );
}
