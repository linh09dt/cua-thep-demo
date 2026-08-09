"use client";

import Link from "next/link";
import AppShell from "@/components/app-shell";

const steps = [
  {
    no: "01",
    title: "Dashboard: bắt đầu từ cam kết giao hàng",
    text: "Cho khách xem tổng đơn, đơn trễ, Set Ready, Material Shortage, Quality Hold, Work Center quá tải và các cảnh báo ưu tiên.",
    href: "/",
    action: "Mở Dashboard",
  },
  {
    no: "02",
    title: "Đơn hàng → Lệnh sản xuất",
    text: "Chọn một đơn chưa có LSX. ERP tạo LSX Cha, 3 LSX Con Cánh / Khung / Phào và các WO theo Routing.",
    href: "/production-orders",
    action: "Mở Lệnh sản xuất",
  },
  {
    no: "03",
    title: "Gom LSX vào Lô sản xuất",
    text: "Chọn LSX theo ngày giao/ưu tiên, tạo Production Lot và Release Lô. Lô là tầng kế hoạch, không thay thế LSX hay Dispatch.",
    href: "/production-lots",
    action: "Mở Lô sản xuất",
  },
  {
    no: "04",
    title: "Phase 1: kiểm tra Material Readiness",
    text: "Xác nhận READY / PARTIAL / SHORTAGE / HOLD. LSX thiếu vật tư hoặc Hold không được đưa vào Smart Planning.",
    href: "/material-readiness",
    action: "Kiểm tra vật tư",
  },
  {
    no: "05",
    title: "Phase 1–2: Set Readiness & Bottleneck",
    text: "ERP tính Cánh Ready, Khung Ready, Phào Ready theo từng LSX; Set Ready = MIN của 3 nhánh và xác định nhánh/Work Center đang kéo chậm Lô.",
    href: "/set-readiness",
    action: "Xem Đủ Bộ",
  },
  {
    no: "06",
    title: "Phase 3: Smart Auto Planning",
    text: "Ngày giao + Priority Lô + Material + Set Gap + Bottleneck + Capacity tạo danh sách LSX/WO nên ưu tiên và Planning Score. Planner vẫn là người Release.",
    href: "/smart-planning",
    action: "Mở Smart Plan",
  },
  {
    no: "07",
    title: "Phase 4: finite-capacity 7 ngày",
    text: "Xem Planned/Capacity theo từng WO. Ô quá 100% được đánh dấu Overload để dời lịch hoặc điều chỉnh trước khi xuống xưởng.",
    href: "/schedule-board",
    action: "Mở Schedule Board",
  },
  {
    no: "08",
    title: "Điều độ Cánh / Khung / Phào",
    text: "Dispatch dùng Carry Over → Capacity → WIP Buffer → Eligible → Priority. Có thể tạo tất cả Draft trong từng nhánh rồi kiểm tra trước khi Release.",
    href: "/dispatch",
    action: "Mở Điều độ",
  },
  {
    no: "09",
    title: "Xưởng thực thi & báo cáo",
    text: "Tổ sản xuất chỉ làm Dispatch Released, nhập Good / NG. Remain chưa hoàn thành được Carry Over và chiếm Capacity ngày kế tiếp.",
    href: "/shop-floor",
    action: "Mở Màn hình xưởng",
  },
  {
    no: "10",
    title: "Phase 5: Quality / Hold / Traceability",
    text: "Tạo QC, HOLD, REWORK hoặc DEFECT theo LSX/WO. Quality Hold khóa luồng liên quan cho đến khi QC Release Hold.",
    href: "/quality",
    action: "Mở Quality",
  },
  {
    no: "11",
    title: "Theo dõi đơn & điểm hội tụ Đủ Bộ",
    text: "Trace từ Đơn → LSX → Lô → Cánh/Khung/Phào → Set Ready → WO chung. Không cộng chéo component của các đơn khác nhau.",
    href: "/order-tracking",
    action: "Mở Timeline",
  },
  {
    no: "12",
    title: "Phase 6: đóng vòng điều hành",
    text: "Dashboard và Cảnh báo nhận lại Good/NG, Carry Over, Material, Quality, Bottleneck và Capacity Load để planner lập kế hoạch ngày tiếp theo.",
    href: "/planning-alerts",
    action: "Xem Cảnh báo",
  },
];

export default function DemoScenarioPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-[1550px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            Customer Demo • ERP + APS nhẹ + MES nhẹ
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Kịch bản demo khách hàng
          </h1>
          <p className="mt-1 max-w-5xl text-sm leading-6 text-slate-500">
            Demo theo một câu chuyện xuyên suốt: từ cam kết giao hàng đến Material, Set Ready,
            Bottleneck, finite-capacity, Dispatch, thực thi xưởng, Quality và phản hồi kế hoạch.
            Không cần mở chức năng theo kiểu rời rạc.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard tone="blue" title="Mục tiêu" text="Khách hiểu flow trong 15–20 phút" />
          <InfoCard tone="emerald" title="Thông điệp" text="ERP ưu tiên tạo bộ cửa hoàn chỉnh, không chỉ chạy đầy máy" />
          <InfoCard tone="violet" title="Điểm nhấn" text="Material + Set Ready + Bottleneck + finite Capacity" />
          <InfoCard tone="amber" title="Chuẩn bị lại" text="Reset demo giữ 200 đơn và Master/Config" />
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
            “Hệ thống không chỉ tạo lệnh và ghi nhận sản lượng. ERP kiểm tra vật tư, biết bộ cửa
            đang thiếu Cánh/Khung/Phào ở đâu, tìm bottleneck, giới hạn theo Capacity thực tế,
            điều độ xuống xưởng, kiểm soát Quality và tự đưa dữ liệu thực tế quay lại kế hoạch ngày sau.”
          </p>
        </div>
      </main>
    </AppShell>
  );
}

function InfoCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "blue" | "emerald" | "violet" | "amber";
}) {
  const cls = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-xs font-bold uppercase">{title}</div>
      <div className="mt-2 text-sm font-bold text-slate-900">{text}</div>
    </div>
  );
}
