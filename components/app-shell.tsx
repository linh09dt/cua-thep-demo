"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type MenuItem = {
  href: string;
  label: string;
  short: string;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    title: "TỔNG QUAN",
    items: [
      { href: "/", label: "Dashboard điều hành", short: "DB" },
      { href: "/order-tracking", label: "Theo dõi đơn hàng", short: "TD" },
      { href: "/erp-logic", label: "Logic vận hành ERP", short: "LG" },
    ],
  },
  {
    title: "KẾ HOẠCH SẢN XUẤT",
    items: [
      { href: "/orders", label: "Đơn hàng", short: "DH" },
      { href: "/production-orders", label: "Lệnh sản xuất", short: "LS" },
      { href: "/dispatch", label: "Điều độ sản xuất", short: "DD" },
      { href: "/capacity", label: "Năng lực công đoạn", short: "NL" },
      { href: "/priority", label: "Priority theo WO", short: "PR" },
    ],
  },
  {
    title: "THỰC THI & BÁO CÁO",
    items: [
      { href: "/production-report", label: "Báo cáo sản xuất", short: "BC" },
    ],
  },
  {
    title: "HỆ THỐNG",
    items: [
      { href: "/catalogs", label: "Danh mục", short: "DM" },
      { href: "/configuration", label: "Cấu hình sản xuất", short: "CH" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function currentTitle(pathname: string) {
  for (const group of menuGroups) {
    const found = group.items.find((item) => isActive(pathname, item.href));
    if (found) return found.label;
  }
  return "ERP Sản xuất";
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = currentTitle(pathname);

  return (
    <div className="erp-app">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileOpen(false)}
          className="erp-overlay"
        />
      )}

      <aside className={`erp-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="erp-brand">
          <div className="erp-brand-mark">S</div>
          <div className="min-w-0">
            <div className="erp-brand-name">STEEL ERP</div>
            <div className="erp-brand-sub">Production Management</div>
          </div>
        </div>

        <div className="erp-plant">
          <div>
            <div className="erp-plant-label">NHÀ MÁY</div>
            <div className="erp-plant-name">Cửa thép - Demo Plant</div>
          </div>
          <span className="erp-status-dot" title="Hệ thống hoạt động" />
        </div>

        <nav className="erp-nav">
          {menuGroups.map((group) => (
            <div key={group.title} className="erp-nav-group">
              <div className="erp-nav-title">{group.title}</div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`erp-nav-item ${active ? "is-active" : ""}`}
                    >
                      <span className="erp-nav-icon">{item.short}</span>
                      <span className="truncate">{item.label}</span>
                      {active && <span className="erp-nav-active-mark" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="erp-sidebar-footer">
          <div className="erp-user-avatar">AD</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-100">
              Administrator
            </div>
            <div className="truncate text-[11px] text-slate-400">
              Kế hoạch sản xuất
            </div>
          </div>
        </div>
      </aside>

      <div className="erp-main">
        <header className="erp-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="erp-mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
            >
              ☰
            </button>

            <div className="min-w-0">
              <div className="erp-breadcrumb">
                ERP / Quản lý sản xuất
              </div>
              <div className="truncate text-base font-bold text-slate-800">
                {title}
              </div>
            </div>
          </div>

          <div className="erp-top-actions">
            <div className="erp-live">
              <span className="erp-live-dot" />
              Hệ thống online
            </div>
            <div className="erp-date">
              {new Intl.DateTimeFormat("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date())}
            </div>
            <div className="erp-top-avatar">AD</div>
          </div>
        </header>

        <div className="erp-content">{children}</div>

        <footer className="erp-footer">
          <span>STEEL ERP • Production Planning & Manufacturing</span>
          <span>Demo System</span>
        </footer>
      </div>
    </div>
  );
}
