"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import DemoTour from "@/components/demo-tour";

type MenuItem = {
  href: string;
  label: string;
  short: string;
};

type MenuGroup = {
  title: string;
  theme: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    title: "TỔNG QUAN",
    theme: "overview",
    items: [
      { href: "/", label: "Dashboard điều hành", short: "DB" },
      { href: "/planning-wizard", label: "Lập kế hoạch từng bước", short: "WZ" },
      { href: "/planning-alerts", label: "Cảnh báo kế hoạch", short: "CB" },
      { href: "/weekly-plan", label: "Kế hoạch 7 ngày", short: "7D" },
      { href: "/management-kpi", label: "KPI quản lý", short: "KP" },
      { href: "/what-if-planning", label: "What-if Planning", short: "WI" },
    ],
  },
  {
    title: "TRỢ GIÚP",
    theme: "help",
    items: [
      { href: "/erp-logic", label: "Logic vận hành ERP", short: "LG" },
      { href: "/demo-scenario", label: "Kịch bản demo", short: "DM" },
      { href: "/traceability", label: "Truy xuất sản xuất", short: "TR" },
    ],
  },
  {
    title: "ĐƠN HÀNG",
    theme: "orders",
    items: [
      { href: "/orders", label: "Tạo đơn hàng", short: "DH" },
      { href: "/order-tracking", label: "Theo dõi Đơn Hàng", short: "TD" },
    ],
  },
  {
    title: "KẾ HOẠCH SẢN XUẤT",
    theme: "planning",
    items: [
      { href: "/production-orders", label: "Lệnh sản xuất", short: "LS" },
      { href: "/production-lots", label: "Lô sản xuất", short: "LO" },
      { href: "/material-readiness", label: "Sẵn sàng vật tư", short: "MR" },
      { href: "/set-readiness", label: "Sẵn sàng đủ bộ", short: "SR" },
      { href: "/bottleneck", label: "Phân tích nút thắt", short: "BN" },
      { href: "/smart-planning", label: "Kế hoạch thông minh", short: "SP" },
      { href: "/schedule-board", label: "Bảng lịch sản xuất", short: "SB" },
      { href: "/dispatch", label: "Điều độ sản xuất", short: "DD" },
    ],
  },
  {
    title: "THỰC THI VÀ BÁO CÁO",
    theme: "report",
    items: [
      { href: "/shop-floor", label: "Màn hình xưởng", short: "SX" },
      { href: "/quality", label: "Chất lượng / Hold", short: "QC" },
      { href: "/production-report", label: "Báo cáo sản xuất", short: "BC" },
    ],
  },
  {
    title: "CẤU HÌNH",
    theme: "config",
    items: [
      { href: "/capacity", label: "Năng lực công đoạn", short: "NL" },
      { href: "/priority", label: "Priority theo WO", short: "PR" },
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
          <div className="erp-brand-mark">↗</div>
          <div className="min-w-0">
            <div className="erp-brand-name">ERP</div>
            <div className="erp-brand-sub">Quản lý & kế hoạch sản xuất</div>
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
            <div key={group.title} className={`erp-nav-group erp-nav-${group.theme}`}>
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
            <div className="erp-mobile-title">
              {title}
            </div>
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
        <DemoTour />

        <footer className="erp-footer">
          <span>STEEL ERP • Production Planning & Manufacturing</span>
          <span>Demo System</span>
        </footer>
      </div>
    </div>
  );
}
