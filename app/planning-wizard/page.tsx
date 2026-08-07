"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";

type WizardData = {
  orders: { total: number; pending: number };
  productionOrders: { total: number; running: number };
  lots: { total: number; draft: number; released: number };
  dispatch: { totalToday: number; releasedToday: number };
  reports: { today: number };
};

export default function PlanningWizardPage() {
  const [data, setData] = useState<WizardData | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/planning-wizard", { cache: "no-store" })
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok || !body.success) throw new Error(body.message);
        setData(body.steps);
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Không thể tải Wizard."));
  }, []);

  const steps = [
    {
      no: "01",
      title: "Đơn hàng",
      description: "Kiểm tra nhu cầu và chọn đơn cần đưa vào sản xuất.",
      metric: data ? `${data.orders.pending} chưa có LSX / ${data.orders.total} đơn` : "-",
      href: "/orders",
      action: "Xem đơn hàng",
    },
    {
      no: "02",
      title: "Lệnh sản xuất",
      description: "Tạo LSX Cha → Cánh / Khung / Phào → WO theo Routing.",
      metric: data ? `${data.productionOrders.total} LSX Cha` : "-",
      href: "/production-orders",
      action: "Tạo LSX",
    },
    {
      no: "03",
      title: "Lô sản xuất",
      description: "Gom LSX theo ngày sản xuất, ngày giao và Priority.",
      metric: data ? `${data.lots.released} Released • ${data.lots.draft} Draft` : "-",
      href: "/production-lots",
      action: "Lập Lô",
    },
    {
      no: "04",
      title: "Kiểm tra kế hoạch",
      description: "Xem quá tải Capacity, đơn trễ và mất cân bằng Cánh / Khung / Phào.",
      metric: "Exception Management",
      href: "/planning-alerts",
      action: "Xem cảnh báo",
    },
    {
      no: "05",
      title: "Điều độ sản xuất",
      description: "Eligible → WIP → Capacity → Priority → Dispatch Draft → Release.",
      metric: data ? `${data.dispatch.releasedToday}/${data.dispatch.totalToday} Dispatch Released hôm nay` : "-",
      href: "/dispatch",
      action: "Điều độ",
    },
    {
      no: "06",
      title: "Thực thi xưởng",
      description: "Tổ sản xuất xem việc hôm nay và nhập Good / NG.",
      metric: data ? `${data.reports.today} báo cáo hôm nay` : "-",
      href: "/shop-floor",
      action: "Mở màn hình xưởng",
    },
    {
      no: "07",
      title: "Theo dõi kết quả",
      description: "Theo dõi timeline đơn hàng, Đủ Bộ và Dashboard quản trị.",
      metric: "Order → LSX → Lot → WO → Complete",
      href: "/order-tracking",
      action: "Theo dõi đơn",
    },
  ];

  return (
    <AppShell>
      <main className="mx-auto max-w-[1500px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Step-by-step Production Planning
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Lập kế hoạch từng bước
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hướng dẫn từng bước từ đơn hàng đến thực thi và theo dõi kết quả sản xuất.
          </p>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.no}>
              <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[64px_1fr_260px_auto] md:items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-extrabold text-white">
                  {step.no}
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">{step.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{step.description}</p>
                </div>

                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                  {step.metric}
                </div>

                <Link
                  href={step.href}
                  className="rounded-md bg-blue-600 px-4 py-2.5 text-center text-sm font-bold text-white"
                >
                  {step.action} →
                </Link>
              </div>

              {index < steps.length - 1 && (
                <div className="ml-6 h-5 border-l-2 border-dashed border-slate-300 md:ml-8" />
              )}
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
