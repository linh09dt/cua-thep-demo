"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menus = [
  { href: "/", label: "Tổng quan" },
  { href: "/orders", label: "Nhập đơn hàng" },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1900px] items-center justify-between px-5">
          <div>
            <div className="text-lg font-bold text-slate-900">
              DEMO CỬA THÉP
            </div>
            <div className="text-xs text-slate-500">
              Quản lý đơn hàng & sản xuất
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {menus.map((menu) => {
              const active =
                menu.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(menu.href);

              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {menu.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
