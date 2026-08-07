"use client";

import Link from "next/link";
import AppShell from "@/components/app-shell";

const steps = [
  {
    no: "01",
    title: "Bắt đầu từ Dashboard",
    text: "Cho khách xem Tổng đơn, Đang sản xuất, Đủ Bộ, Trễ hạn và các cảnh báo kế hoạch nổi bật.",
    href: "/",
    action: "Mở Dashboard",
  },
  {
    no: "02",
    title: "Tạo Lệnh sản xuất",
    text: "Chọn một đơn chưa có LSX và tạo LSX Cha → Cánh / Khung / Phào → WO theo Routing.",
    href: "/production-orders",
    action: "Mở Lệnh sản xuất",
  },
  {
    no: "03",
    title: "Gom LSX thành Lô",
    text: "Chọn các LSX có ngày giao phù hợp, tạo Production Lot và Release để minh họa kế hoạch theo lô.",
    href: "/production-lots",
    action: "Mở Lô sản xuất",
  },
  {
    no: "04",
    title: "Cho ERP phát hiện vấn đề",
    text: "Mở Cảnh báo kế hoạch và Kế hoạch 7 ngày để chỉ ra đơn trễ, công đoạn quá tải và lô lệch Cánh / Khung / Phào.",
    href: "/planning-alerts",
    action: "Mở Cảnh báo",
  },
  {
    no: "05",
    title: "Điều độ bằng WIP + Capacity + Priority",
    text: "Chọn WO, xem WIP hiện tại/Target, Capacity còn lại và đề xuất Auto Dispatch trước khi Release.",
    href: "/dispatch",
    action: "Mở Điều độ",
  },
  {
    no: "06",
    title: "Xưởng báo cáo trực tiếp",
    text: "Dùng Màn hình xưởng để nhập Good / NG trên Dispatch Released và cho khách thấy tiến độ cập nhật.",
    href: "/shop-floor",
    action: "Mở Màn hình xưởng",
  },
  {
    no: "07",
    title: "Trace đơn hàng",
    text: "Mở Theo dõi đơn hàng, chọn một đơn và xem Timeline từ Đơn → LSX → Lô → Cánh/Khung/Phào → Đủ Bộ → Hoàn thành.",
    href: "/order-tracking",
    action: "Mở Timeline",
  },
];

export default function DemoScenarioPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-[1500px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Customer Demo Mode
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Kịch bản demo khách hàng
          </h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">
            Trình bày ERP theo một câu chuyện xuyên suốt thay vì mở từng chức năng rời rạc.
            Dữ liệu vẫn là dữ liệu thật trong hệ thống demo, không tự sửa trạng thái nghiệp vụ.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-xs font-bold uppercase text-blue-600">Mục tiêu</div>
            <div className="mt-2 font-bold text-slate-900">
              Cho khách hiểu flow trong 10–15 phút
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-bold uppercase text-emerald-700">Thông điệp</div>
            <div className="mt-2 font-bold text-slate-900">
              ERP chủ động phát hiện và điều tiết sản xuất
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-bold uppercase text-amber-700">Chuẩn bị lại</div>
            <div className="mt-2 font-bold text-slate-900">
              Dùng Reset dữ liệu trong Cấu hình khi cần
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.no}>
              <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[60px_1fr_auto] md:items-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#17365b] text-xs font-extrabold text-white">
                  {step.no}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{step.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{step.text}</p>
                </div>
                <Link
                  href={step.href}
                  className="rounded-md bg-blue-600 px-4 py-2.5 text-center text-xs font-bold text-white"
                >
                  {step.action} →
                </Link>
              </div>

              {index < steps.length - 1 && (
                <div className="ml-[22px] h-4 border-l-2 border-dashed border-slate-300" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-5">
          <div className="text-xs font-extrabold uppercase tracking-wide text-violet-700">
            Câu chuyện kết thúc
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            “Hệ thống không chỉ lưu dữ liệu. Từ nhu cầu đơn hàng, ERP tạo LSX, gom kế hoạch
            theo Lô, kiểm tra WIP/Capacity/Priority, điều độ xuống xưởng, nhận báo cáo thực tế
            và tự trả lại tiến độ/cảnh báo cho người quản lý.”
          </p>
        </div>
      </main>
    </AppShell>
  );
}
