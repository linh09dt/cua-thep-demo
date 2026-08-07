"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type WizardData = {
  orders: { total: number; pending: number };
  productionOrders: { total: number; running: number };
  lots: { total: number; draft: number; released: number };
  dispatch: { totalToday: number; releasedToday: number };
  reports: { today: number };
};

type Step = {
  no: number;
  title: string;
  eyebrow: string;
  description: string;
  metric: string;
  metricLabel: string;
  href: string;
  action: string;
  note: string;
};

export default function PlanningWizardPage() {
  const [data, setData] = useState<WizardData | null>(null);
  const [message, setMessage] = useState("");
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/planning-wizard", { cache: "no-store" })
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok || !body.success) {
          throw new Error(body.message || "Không thể tải dữ liệu.");
        }
        setData(body.steps);
      })
      .catch((e) =>
        setMessage(
          e instanceof Error
            ? e.message
            : "Không thể tải dữ liệu lập kế hoạch."
        )
      );
  }, []);

  const steps = useMemo<Step[]>(
    () => [
      {
        no: 1,
        title: "Đơn hàng",
        eyebrow: "Bắt đầu từ nhu cầu khách hàng",
        description:
          "Kiểm tra danh sách đơn hàng và chọn các đơn cần đưa vào kế hoạch sản xuất.",
        metric: data
          ? `${data.orders.pending}`
          : "—",
        metricLabel: data
          ? `đơn chưa có LSX / ${data.orders.total} đơn`
          : "Đang tải dữ liệu...",
        href: "/orders",
        action: "Mở đơn hàng",
        note: "Hoàn thành bước này khi các đơn cần sản xuất đã được xác định.",
      },
      {
        no: 2,
        title: "Lệnh sản xuất",
        eyebrow: "Chuyển nhu cầu thành cấu trúc sản xuất",
        description:
          "Tạo LSX Cha, sau đó hệ thống sinh Cánh / Khung / Phào và các WO theo Routing.",
        metric: data ? `${data.productionOrders.total}` : "—",
        metricLabel: "LSX Cha đã tạo",
        href: "/production-orders",
        action: "Tạo / xem LSX",
        note: "LSX được tạo trước, sau đó mới đưa vào Lô sản xuất.",
      },
      {
        no: 3,
        title: "Lô sản xuất",
        eyebrow: "Gom LSX thành kế hoạch theo lô",
        description:
          "Chọn các LSX phù hợp để gom Lô, kiểm tra ngày sản xuất / ngày giao rồi Release Lô.",
        metric: data ? `${data.lots.draft} / ${data.lots.released}` : "—",
        metricLabel: "Lô Draft / Released",
        href: "/production-lots",
        action: "Lập Lô",
        note: "Chỉ LSX đã sẵn sàng mới được đưa vào kế hoạch theo Lô.",
      },
      {
        no: 4,
        title: "Kiểm tra kế hoạch",
        eyebrow: "Phát hiện ngoại lệ trước khi điều độ",
        description:
          "Kiểm tra đơn trễ, WO quá Capacity và sự mất cân bằng giữa Cánh / Khung / Phào.",
        metric: "ERP",
        metricLabel: "tự phát hiện ngoại lệ",
        href: "/planning-alerts",
        action: "Xem cảnh báo",
        note: "Ưu tiên xử lý các cảnh báo nghiêm trọng trước khi Release Dispatch.",
      },
      {
        no: 5,
        title: "Điều độ sản xuất",
        eyebrow: "Cấp việc theo năng lực thực tế",
        description:
          "Hệ thống tính Eligible + WIP + Capacity + Priority để đề xuất Dispatch cho từng WO.",
        metric: data
          ? `${data.dispatch.releasedToday}/${data.dispatch.totalToday}`
          : "—",
        metricLabel: "Dispatch Released / tổng hôm nay",
        href: "/dispatch",
        action: "Mở điều độ",
        note: "Kiểm tra đề xuất, điều chỉnh khi cần rồi Release Dispatch xuống xưởng.",
      },
      {
        no: 6,
        title: "Thực thi xưởng",
        eyebrow: "Sản xuất theo Dispatch đã Release",
        description:
          "Tổ sản xuất xem công việc được giao và nhập Good / NG trực tiếp theo WO.",
        metric: data ? `${data.reports.today}` : "—",
        metricLabel: "báo cáo sản xuất hôm nay",
        href: "/shop-floor",
        action: "Mở màn hình xưởng",
        note: "Báo cáo thực tế sẽ cập nhật Remain và tiến độ sản xuất.",
      },
      {
        no: 7,
        title: "Theo dõi kết quả",
        eyebrow: "Khép kín vòng điều hành",
        description:
          "Theo dõi Timeline đơn hàng, tiến độ Cánh / Khung / Phào, Đủ Bộ và Dashboard quản trị.",
        metric: "100%",
        metricLabel: "trace từ đơn hàng đến hoàn thành",
        href: "/order-tracking",
        action: "Theo dõi đơn",
        note: "Kết quả thực tế quay lại Dashboard và cảnh báo để lập kế hoạch tiếp theo.",
      },
    ],
    [data]
  );

  const step = steps[current];
  const progress = ((current + 1) / steps.length) * 100;

  function previous() {
    setCurrent((value) => Math.max(0, value - 1));
  }

  function next() {
    setCurrent((value) => Math.min(steps.length - 1, value + 1));
  }

  function restart() {
    setCurrent(0);
  }

  return (
    <AppShell>
      <main className="min-h-[calc(100vh-64px)] bg-slate-100 p-3 sm:p-5">
        <div className="mx-auto flex min-h-[calc(100vh-104px)] max-w-[1280px] items-center justify-center">
          <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
                    Lập kế hoạch từng bước
                  </p>
                  <h1 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
                    Hướng dẫn vận hành kế hoạch sản xuất
                  </h1>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    Đi lần lượt từ Đơn hàng → LSX → Lô → Kiểm tra → Điều độ → Xưởng → Theo dõi.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Tiến độ
                  </div>
                  <div className="mt-0.5 text-sm font-extrabold text-slate-900">
                    Bước {current + 1}/{steps.length}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="relative">
                  <div className="absolute left-0 right-0 top-4 h-1 rounded-full bg-slate-200" />
                  <div
                    className="absolute left-0 top-4 h-1 rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${Math.max(0, progress - 100 / steps.length / 2)}%` }}
                  />

                  <div className="relative flex justify-between">
                    {steps.map((item, index) => {
                      const done = index < current;
                      const active = index === current;

                      return (
                        <button
                          key={item.no}
                          type="button"
                          onClick={() => setCurrent(index)}
                          className="group flex min-w-0 flex-col items-center"
                          title={`Bước ${item.no}: ${item.title}`}
                        >
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-extrabold transition ${
                              done
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : active
                                ? "border-blue-600 bg-blue-600 text-white ring-4 ring-blue-100"
                                : "border-slate-300 bg-white text-slate-400"
                            }`}
                          >
                            {done ? "✓" : item.no}
                          </span>

                          <span
                            className={`mt-2 hidden max-w-[105px] text-center text-[10px] font-bold leading-4 sm:block ${
                              active ? "text-blue-700" : "text-slate-500"
                            }`}
                          >
                            {item.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </header>

            {message && (
              <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">
                {message}
              </div>
            )}

            <div className="grid min-h-[430px] gap-0 lg:grid-cols-[1fr_330px]">
              <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase text-blue-700">
                    Bước {step.no}/{steps.length}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {step.eyebrow}
                  </span>
                </div>

                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  {step.title}
                </h2>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  {step.description}
                </p>

                <div className="mt-7 max-w-md rounded-xl border border-blue-100 bg-blue-50 p-5">
                  <div className="text-4xl font-black text-blue-700">
                    {step.metric}
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-700">
                    {step.metricLabel}
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <strong>Điều kiện chuyển bước:</strong> {step.note}
                </div>

                <div className="mt-7">
                  <Link
                    href={step.href}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    {step.action} ↗
                  </Link>
                </div>
              </div>

              <aside className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0 lg:p-7">
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Luồng ERP
                </div>

                <div className="mt-5 space-y-1">
                  {steps.map((item, index) => (
                    <button
                      key={item.no}
                      type="button"
                      onClick={() => setCurrent(index)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        index === current
                          ? "bg-blue-600 text-white shadow-sm"
                          : index < current
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                          index === current
                            ? "bg-white/20 text-white"
                            : index < current
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {index < current ? "✓" : item.no}
                      </span>
                      <span className="text-xs font-bold">{item.title}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">
                    Nguyên tắc điều độ
                  </div>
                  <div className="mt-2 text-xs font-bold leading-6 text-slate-700">
                    Eligible → WIP → Capacity → Priority → Dispatch
                  </div>
                </div>
              </aside>
            </div>

            <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:px-7">
              <button
                type="button"
                onClick={previous}
                disabled={current === 0}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Quay lại
              </button>

              <div className="text-xs font-semibold text-slate-400">
                {current + 1} / {steps.length}
              </div>

              {current < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="min-h-10 rounded-lg bg-slate-900 px-5 py-2 text-sm font-extrabold text-white"
                >
                  Tiếp tục →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={restart}
                  className="min-h-10 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-extrabold text-white"
                >
                  Hoàn tất • Xem lại từ đầu
                </button>
              )}
            </footer>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
