"use client";

import AppShell from "@/components/app-shell";

const steps = [
  {
    no: "01",
    title: "Nhập đơn hàng",
    description:
      "Sales nhập đơn trực tiếp trên web. Model, Màu, Khóa, Hướng mở lấy từ Master Data.",
    detail: "Ngày giao là cam kết đầu vào cho toàn bộ Planning Engine.",
  },
  {
    no: "02",
    title: "Tạo lệnh sản xuất",
    description:
      "Mỗi đơn tạo 1 LSX Cha; hệ thống sinh 3 LSX Con Cánh / Khung / Phào và các WO theo Routing.",
    detail: "LSX được tạo trước khi đưa vào Lô sản xuất.",
  },
  {
    no: "03",
    title: "Lập Lô sản xuất",
    description:
      "Planner gom các LSX Cha theo ngày sản xuất, ngày giao và Priority rồi Release Lô.",
    detail: "Chỉ Lô RELEASED/RUNNING được Smart Planning xét ưu tiên.",
  },
  {
    no: "04",
    title: "Material Readiness",
    description:
      "Xác nhận READY / PARTIAL / SHORTAGE / HOLD tại LSX Cha trước khi lập kế hoạch.",
    detail: "SHORTAGE/HOLD bị loại khỏi Smart Recommendation.",
  },
  {
    no: "05",
    title: "Routing & WO",
    description:
      "Cánh, Khung, Phào chạy Routing riêng; WO01–WO13 là các nhánh trước điểm hội tụ.",
    detail: "Routing được cấu hình, không hard-code theo đơn hàng.",
  },
  {
    no: "06",
    title: "Capacity + WIP Buffer",
    description:
      "Capacity là giới hạn cứng; WIP Min/Target/Max mô tả buffer giữa các WO.",
    detail: "WO đầu chạy theo Capacity; WO sau chừa phần thiếu WIP Target.",
  },
  {
    no: "07",
    title: "Priority theo WO",
    description:
      "Eligible được sắp theo Priority riêng từng WO trước khi chọn vào Dispatch.",
    detail: "Priority không làm vượt Capacity.",
  },
  {
    no: "08",
    title: "Set Readiness",
    description:
      "Tính Good thực tế tại WO05/WO10/WO13 theo từng LSX và xác định số bộ sẵn sàng.",
    detail: "Set Ready = MIN(Cánh Ready, Khung Ready, Phào Ready) theo đúng LSX, không cộng chéo đơn.",
  },
  {
    no: "09",
    title: "Bottleneck Engine",
    description:
      "So sánh Set Gap, Branch Gap và Capacity Load để biết nhánh/Work Center đang kéo chậm Lô.",
    detail: "Mục tiêu là tăng bộ hoàn chỉnh, không chỉ chạy đầy máy.",
  },
  {
    no: "10",
    title: "Smart Auto Planning",
    description:
      "Ngày giao + Priority Lô + Material + Bottleneck + Capacity tạo Planning Score và lượng đề xuất.",
    detail: "Planning Run được lưu để audit; không tự Release Dispatch.",
  },
  {
    no: "11",
    title: "Schedule Board 7 ngày",
    description:
      "Planned/Capacity theo từng WO được hiển thị như finite-capacity schedule.",
    detail: "Overload >100% phải reschedule hoặc điều chỉnh nguồn lực.",
  },
  {
    no: "12",
    title: "Auto Dispatch theo nhánh",
    description:
      "Cánh/Khung/Phào có thể tạo Draft cho toàn bộ WO theo Carry Over → Capacity → WIP Buffer → Eligible → Priority.",
    detail: "Không tự Release; planner kiểm tra trước khi xuống xưởng.",
  },
  {
    no: "13",
    title: "Release Dispatch",
    description:
      "Dispatch RELEASED là danh sách công việc chính thức của xưởng và mở Eligible cho WO sau trong nhánh.",
    detail: "WO sau không cần chờ WO trước Completed toàn bộ.",
  },
  {
    no: "14",
    title: "Shop Floor Report",
    description:
      "Xưởng nhập Good / NG theo Dispatch Released; Remain là phần chưa hoàn thành.",
    detail: "Good thực tế cập nhật WIP, Set Ready và tiến độ đơn.",
  },
  {
    no: "15",
    title: "Carry Over",
    description:
      "Remain của Dispatch ngày trước được chuyển sang ngày mới và chiếm Capacity trước việc mới.",
    detail: "Không tạo trùng LSX/WO khi Carry Over.",
  },
  {
    no: "16",
    title: "Điểm hội tụ Đủ Bộ",
    description:
      "Cánh + Khung + Phào phải đủ theo cùng LSX trước khi mở luồng chung WO14–WO20.",
    detail: "Set Ready là checkpoint thực tế trước công đoạn chung.",
  },
  {
    no: "17",
    title: "Quality / Hold / Traceability",
    description:
      "QC, HOLD, REWORK, DEFECT được trace theo LSX/WO; Hold khóa luồng liên quan.",
    detail: "Chỉ QC Release Hold mới mở lại sản xuất.",
  },
  {
    no: "18",
    title: "Luồng chung sau Đủ Bộ",
    description:
      "WO14 Hàn liên kết → WO15 Vệ sinh → WO16 Sơn → WO17 Dán vân → WO18 Đóng gói → WO19 Nhập kho → WO20 Xuất kho.",
    detail: "Từ điểm hội tụ, sản phẩm được quản lý theo bộ cửa hoàn chỉnh.",
  },
  {
    no: "19",
    title: "Dashboard & Closed-loop Planning",
    description:
      "Material, Set Gap, Bottleneck, Capacity, Good/NG, Carry Over và Quality quay lại Dashboard/Cảnh báo.",
    detail: "Kết quả hôm nay là đầu vào để lập kế hoạch ngày tiếp theo.",
  },
];

export default function ErpLogicPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-[1700px] p-5">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            ERP Operating Logic
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Logic vận hành ERP
          </h1>
          <p className="mt-1 max-w-5xl text-sm text-slate-500">
            Màn hình mô tả toàn bộ logic ERP/MES cửa thép từ Đơn hàng → LSX → Lô →
            Material Readiness → Set Readiness → Bottleneck → Smart Planning → Dispatch →
            Shop Floor → Quality → Dashboard. Kiến trúc mới giữ nguyên Routing/WO hiện tại,
            nhưng bổ sung lớp Planning theo finite-capacity và constraint để ưu tiên tạo nhiều bộ cửa hoàn chỉnh nhất.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Luồng tổng thể
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="flex min-w-[2150px] items-center gap-2">
              <FlowBox title="Đơn hàng" sub="Web Order" />
              <Arrow />
              <FlowBox title="LSX Cha" sub="1 đơn = 1 LSX" />
              <Arrow />
              <FlowBox title="Lô sản xuất" sub="Gom LSX kế hoạch" />
              <Arrow />
              <FlowBox title="Material" sub="Ready / Shortage" />
              <Arrow />
              <FlowBox title="LSX Con" sub="Cánh / Khung / Phào" />
              <Arrow />
              <FlowBox title="Routing" sub="Sinh WO" />
              <Arrow />
              <FlowBox title="Capacity" sub="Giới hạn/ngày" />
              <Arrow />
              <FlowBox title="WIP" sub="Min / Target / Max" />
              <Arrow />
              <FlowBox title="Set Ready" sub="Cánh + Khung + Phào" />
              <Arrow />
              <FlowBox title="Bottleneck" sub="Gap / Constraint" />
              <Arrow />
              <FlowBox title="Priority" sub="Thứ tự ưu tiên" />
              <Arrow />
              <FlowBox title="Smart Plan" sub="Score / Capacity" />
              <Arrow />
              <FlowBox title="Schedule" sub="Finite Capacity" />
              <Arrow />
              <FlowBox title="Dispatch" sub="Draft / Release" />
              <Arrow />
              <FlowBox title="Report" sub="Good / NG" />
              <Arrow />
              <FlowBox title="Carry Over" sub="Remain ngày trước" />
              <Arrow />
              <FlowBox title="Đủ bộ" sub="Điểm hội tụ" />
              <Arrow />
              <FlowBox title="Quality" sub="QC / Hold / Rework" />
              <Arrow />
              <FlowBox title="WO chung" sub="WO14 → WO20" />
              <Arrow />
              <FlowBox title="Hoàn thành" sub="Dashboard / Re-plan" />
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-bold text-slate-900">
                3 nhánh sản xuất riêng
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Cánh, Khung, Phào chạy độc lập cho đến khi hoàn thành công đoạn riêng.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <BranchCard
                title="CÁNH"
                items={[
                  "WO01 Laser Cánh",
                  "WO02 Chấn Cánh",
                  "WO03 Hàn Cánh",
                  "WO04 Phun keo / Vào giấy",
                  "WO05 Ép Cánh",
                ]}
              />

              <BranchCard
                title="KHUNG"
                items={[
                  "WO06 Laser Khung",
                  "WO07 Chấn Khung",
                  "WO08 Hàn Khung / PK",
                  "WO09 Hàn Ghép",
                  "WO10 Mài Phẳng",
                ]}
              />

              <BranchCard
                title="PHÀO"
                items={[
                  "WO11 Laser Phào",
                  "WO12 Chấn Phào",
                  "WO13 Hàn Phào",
                ]}
              />
            </div>

            <div className="mt-5 flex flex-col items-center">
              <div className="text-2xl text-slate-400">↓</div>

              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-4 text-center">
                <div className="text-xs font-bold uppercase text-amber-700">
                  Điểm hội tụ
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  CÁNH + KHUNG + PHÀO = ĐỦ BỘ
                </div>
              </div>

              <div className="text-2xl text-slate-400">↓</div>

              <div className="w-full rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="text-center text-xs font-bold uppercase text-blue-700">
                  Luồng chung sau đủ bộ
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-slate-700">
                  <span>WO14 Hàn liên kết</span>
                  <span>→</span>
                  <span>WO15 Vệ sinh</span>
                  <span>→</span>
                  <span>WO16 Sơn</span>
                  <span>→</span>
                  <span>WO17 Dán vân</span>
                  <span>→</span>
                  <span>WO18 Đóng gói</span>
                  <span>→</span>
                  <span>WO19 Nhập kho</span>
                  <span>→</span>
                  <span>WO20 Xuất kho</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-bold text-slate-900">
                Logic Điều độ
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Quy tắc chọn LSX trước khi Release xuống xưởng.
              </p>
            </div>

            <div className="space-y-3">
              <LogicRow
                no="1"
                title="Kiểm tra Eligible"
                text="WO đầu nhánh nhận LSX mới. Với Cánh / Khung / Phào, WO sau nhận LSX khi Dispatch WO trước đã RELEASED."
              />
              <LogicRow
                no="2"
                title="Đọc WIP của WO"
                text="WIP là buffer giữa các WO. Min cảnh báo thiếu việc, Target là mức đệm mong muốn, Max cảnh báo ùn. WIP không thay thế Capacity."
              />
              <LogicRow
                no="3"
                title="Tính Carry Over + WIP Buffer"
                text="Carry Over ngày trước chiếm Capacity trước. WO đầu nhánh dùng Capacity còn lại; WO sau chừa phần thiếu để đạt WIP Target rồi mới cấp phần Capacity còn lại."
              />
              <LogicRow
                no="4"
                title="Kiểm tra Capacity hữu hạn"
                text="Capacity hiệu dụng là giới hạn cứng trong ngày. Engine không che quá tải; phần vượt phải Carry Over hoặc reschedule sang ngày sau."
              />
              <LogicRow
                no="5"
                title="Đọc Priority"
                text="Sau khi biết lượng cần cấp, engine sắp Eligible theo Priority riêng của WO để chọn LSX."
              />
              <LogicRow
                no="6"
                title="Tạo Dispatch Draft"
                text="Không tách LSX. Engine chọn theo Eligible + Priority trong giới hạn Auto Limit. WIP Max dùng cảnh báo, Capacity vẫn là giới hạn cứng."
              />
              <LogicRow
                no="7"
                title="Release Dispatch"
                text="Sau Release, công việc chính thức xuống xưởng và đồng thời mở Eligible cho WO sau trong cùng nhánh."
              />
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase text-slate-500">
                Công thức demo
              </div>

              <div className="mt-2 text-sm text-slate-700">
                <strong>Capacity hiệu dụng</strong> = Capacity/ngày × Hiệu suất %
              </div>

              <div className="mt-2 text-sm text-slate-700">
                <strong>WIP hiện tại</strong> = Dispatch RELEASED tại WO - Good đã báo cáo
              </div>

              <div className="mt-2 text-sm text-slate-700">
                <strong>WIP Buffer thiếu</strong> = MAX(0, WIP Target - WIP hiện tại)
              </div>

              <div className="mt-2 text-sm text-slate-700">
                <strong>WO đầu nhánh</strong> = MIN(Eligible, Capacity còn lại sau Carry Over)
              </div>

              <div className="mt-2 text-sm text-slate-700">
                <strong>WO sau</strong> = MIN(Eligible, MAX(0, Capacity còn lại - WIP Buffer thiếu))
              </div>

              <div className="mt-2 text-sm text-slate-700">
                <strong>Remain / Carry Over</strong> = SL Dispatch - Good
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-bold text-slate-900">
              19 bước vận hành + 6 Phase Planning/MES
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Trình tự đầy đủ từ nhận đơn đến finite-capacity planning, shop-floor execution, quality và phản hồi kế hoạch.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.no}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {step.no}
                  </div>

                  <div>
                    <div className="font-bold text-slate-900">
                      {step.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {step.description}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      {step.detail}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Nguyên tắc hệ thống
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Principle
              title="Master Data"
              text="Danh mục được cấu hình, không hard-code."
            />
            <Principle
              title="Routing"
              text="Quy định đường đi công đoạn của sản phẩm."
            />
            <Principle
              title="Finite Capacity + Constraint"
              text="Capacity là trần; Bottleneck/Set Gap quyết định chỗ cần ưu tiên."
            />
            <Principle
              title="Closed-loop Planning"
              text="Good/NG, Quality Hold và Carry Over quay lại Planning cho ngày tiếp theo."
            />
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function FlowBox({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  return (
    <div className="min-w-[118px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-[10px] text-slate-500">{sub}</div>
    </div>
  );
}

function Arrow() {
  return <div className="text-xl text-slate-400">→</div>;
}

function BranchCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-center font-bold text-slate-900">
        {title}
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item}>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700">
              {item}
            </div>
            {index < items.length - 1 && (
              <div className="py-0.5 text-center text-slate-400">
                ↓
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LogicRow({
  no,
  title,
  text,
}: {
  no: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {no}
      </div>

      <div>
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{text}</div>
      </div>
    </div>
  );
}

function Principle({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-4">
      <div className="font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{text}</div>
    </div>
  );
}
