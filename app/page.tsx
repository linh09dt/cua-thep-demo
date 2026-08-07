import Link from "next/link";
import AppShell from "@/components/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-[1900px] p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Steel Door ERP Demo
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Hệ thống quản lý sản xuất cửa thép
          </h1>

          <p className="mt-3 max-w-3xl text-slate-600">
            Bản demo ban đầu. Hiện tại hệ thống chỉ triển khai chức năng
            nhập đơn hàng theo dữ liệu kế hoạch khách hàng đang sử dụng.
          </p>

          <div className="mt-6">
            <Link
              href="/orders"
              className="inline-flex rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Mở Nhập đơn hàng
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-4">
          <Summary title="Đơn hàng" value="0" />
          <Summary title="Số bộ cửa" value="0" />
          <Summary title="Đang sản xuất" value="0" />
          <Summary title="Hoàn thành" value="0" />
        </section>
      </main>
    </AppShell>
  );
}

function Summary({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
