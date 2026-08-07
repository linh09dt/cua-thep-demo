"use client";

import AppShell from "@/components/app-shell";

const steps = [
  {
    no: "01",
    title: "Nhập đơn hàng",
    description:
      "Sales nhập đơn trực tiếp trên web. Model, Màu, Khóa, Hướng mở và Tình trạng lấy từ Master Data.",
    detail: "Nguồn dữ liệu đầu vào của toàn bộ ERP.",
  },
  {
    no: "02",
    title: "Tạo lệnh sản xuất",
    description:
      "Mỗi đơn hàng tạo 1 LSX Cha. Từ LSX Cha tự sinh 3 LSX Con: Cánh, Khung, Phào.",
    detail: "Cấu trúc LSX Cha → LSX Con → WO.",
  },
  {
    no: "03",
    title: "Sinh WO theo Routing",
    description:
      "Routing quyết định LSX Con phải đi qua các WO nào. Cánh, Khung, Phào có Routing riêng.",
    detail: "Không hard-code trình tự công đoạn trong đơn hàng.",
  },
  {
    no: "04",
    title: "Capacity theo WO",
    description:
      "Mỗi WO có Capacity hiệu dụng và WIP Min / Target / Max để điều tiết lượng công việc.",
    detail:
      "Capacity giới hạn lượng cấp trong ngày; WIP giữ dòng sản xuất không thiếu việc hoặc ùn việc.",
  },
  {
    no: "05",
    title: "Priority theo WO",
    description:
      "Mỗi WO có rule ưu tiên riêng như Ngày giao, Màu, Ngày đặt, Thứ tự WO trước.",
    detail: "Priority quyết định thứ tự công việc trước khi cấp xuống xưởng.",
  },
  {
    no: "06",
    title: "Điều độ sản xuất",
    description:
      "Điều độ tách Cánh / Khung / Phào / Đủ bộ. Auto Dispatch lấy Eligible → WIP → Capacity → Priority → Draft.",
    detail:
      "Với Cánh/Khung/Phào, WO sau được Eligible khi Dispatch WO trước đã RELEASED.",
  },
  {
    no: "07",
    title: "Release Dispatch",
    description:
      "Dispatch sau khi Release trở thành danh sách công việc chính thức của xưởng theo ngày và WO.",
    detail: "Chỉ Dispatch Released mới được báo cáo sản xuất.",
  },
  {
    no: "08",
    title: "Báo cáo sản xuất",
    description:
      "Xưởng nhập Good / NG theo Dispatch. Remain = SL Dispatch - Good.",
    detail: "Remain = 0 thì WO hiện tại Completed.",
  },
  {
    no: "09",
    title: "Điều độ gối đầu công đoạn",
    description:
      "Trong 3 nhánh Cánh / Khung / Phào, WO sau được phép điều độ khi Dispatch WO trước đã RELEASED, không chờ hoàn thành toàn bộ.",
    detail:
      "WIP Target và Capacity quyết định lượng cấp; Priority quyết định LSX nào đi trước.",
  },
  {
    no: "10",
    title: "Điểm hội tụ đủ bộ",
    description:
      "WO05 Cánh + WO10 Khung + WO13 Phào hoàn thành thì 3 LSX Con Completed và hệ thống xác nhận Đủ bộ.",
    detail: "Đủ bộ mới được mở WO14 Hàn liên kết.",
  },
  {
    no: "11",
    title: "Luồng chung sau đủ bộ",
    description:
      "Hàn liên kết → Vệ sinh trước sơn → Sơn → Dán vân → Lắp ráp/Đóng gói → Nhập kho → Xuất kho.",
    detail: "Từ đây sản phẩm được quản lý theo bộ cửa hoàn chỉnh.",
  },
  {
    no: "12",
    title: "Theo dõi & Dashboard",
    description:
      "Quản lý xem tình trạng từng đơn, tiến độ Cánh/Khung/Phào, Đủ bộ, WO hiện tại, tải Capacity và đơn trễ.",
    detail: "Một màn hình tổng hợp từ Đơn hàng đến sản xuất.",
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
            Màn hình mô tả toàn bộ cách hệ thống vận hành từ lúc nhận đơn hàng
            đến lúc hoàn thành sản xuất. Dùng để demo cho khách và thống nhất
            quy trình trước khi phát triển sâu hơn.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Luồng tổng thể
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="flex min-w-[1580px] items-center gap-2">
              <FlowBox title="Đơn hàng" sub="Web Order" />
              <Arrow />
              <FlowBox title="LSX Cha" sub="1 đơn = 1 LSX" />
              <Arrow />
              <FlowBox title="LSX Con" sub="Cánh / Khung / Phào" />
              <Arrow />
              <FlowBox title="Routing" sub="Sinh WO" />
              <Arrow />
              <FlowBox title="Capacity" sub="Giới hạn/ngày" />
              <Arrow />
              <FlowBox title="WIP" sub="Min / Target / Max" />
              <Arrow />
              <FlowBox title="Priority" sub="Thứ tự ưu tiên" />
              <Arrow />
              <FlowBox title="Dispatch" sub="Điều độ" />
              <Arrow />
              <FlowBox title="Report" sub="Good / NG" />
              <Arrow />
              <FlowBox title="Đủ bộ" sub="Điểm hội tụ" />
              <Arrow />
              <FlowBox title="WO chung" sub="WO14 → WO20" />
              <Arrow />
              <FlowBox title="Hoàn thành" sub="Dashboard" />
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
                text="WIP hiện tại = lượng Dispatch RELEASED tại WO - Good đã báo cáo. So sánh với WIP Min / Target / Max."
              />
              <LogicRow
                no="3"
                title="Tính lượng cần cấp"
                text="Nếu WIP dưới Target, engine tính lượng thiếu đến Target. Nếu WIP đạt Max thì không Auto Dispatch thêm."
              />
              <LogicRow
                no="4"
                title="Kiểm tra Capacity"
                text="Lượng Auto Dispatch không vượt Capacity hiệu dụng còn lại trong ngày."
              />
              <LogicRow
                no="5"
                title="Đọc Priority"
                text="Sau khi biết lượng cần cấp, engine sắp Eligible theo Priority riêng của WO để chọn LSX."
              />
              <LogicRow
                no="6"
                title="Tạo Dispatch Draft"
                text="Không tách LSX. Người kế hoạch được thêm/bỏ thủ công nhưng không được vượt Capacity hoặc WIP Max."
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
                <strong>Nhu cầu WIP</strong> = MAX(0, WIP Target - WIP hiện tại)
              </div>

              <div className="mt-2 text-sm text-slate-700">
                <strong>Auto Dispatch tối đa</strong> = MIN(Nhu cầu WIP, Capacity còn lại)
              </div>

              <div className="mt-2 text-sm text-slate-700">
                <strong>Remain</strong> = SL Dispatch - Good
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-bold text-slate-900">
              12 bước vận hành
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Trình tự chính của ERP demo hiện tại.
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
              title="Capacity + Priority"
              text="Quyết định lượng cấp và thứ tự công việc."
            />
            <Principle
              title="Report kéo luồng"
              text="Báo cáo hoàn thành WO trước mới mở WO sau."
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
