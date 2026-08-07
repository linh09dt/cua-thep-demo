"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type SalesOrder = {
  id: string;
  don_hang: string;
  dai_ly: string;
  ngay_giao: string;
  model: string;
  mau: string;
  cao: number;
  rong: number;
  so_luong: number;
  trang_thai: string;
};

type ProductionOrder = {
  id: string;
  order_id: string;
  parent_id: string | null;
  root_id: string;
  production_no: string;
  level_no: number;
  order_type: string;
  component_type: string;
  routing_id: string | null;
  quantity: number;
  status: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  production_operations?: {
    wo_code?: string;
    operation_code?: string;
    operation_name?: string;
  } | null;
};

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeRoot, setActiveRoot] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch("/api/production-orders", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Không thể tải dữ liệu.");
      setOrders(result.orders ?? []);
      setProductionOrders(result.productionOrders ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  const rootByOrder = useMemo(() => {
    const map = new Map<string, ProductionOrder>();
    productionOrders
      .filter((item) => item.level_no === 1)
      .forEach((item) => map.set(item.order_id, item));
    return map;
  }, [productionOrders]);

  const filteredOrders = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return orders;
    return orders.filter((order) =>
      [order.don_hang, order.dai_ly, order.model, order.mau]
        .some((value) => String(value ?? "").toLowerCase().includes(key))
    );
  }, [orders, search]);

  const activeTree = useMemo(() => {
    if (!activeRoot) return [];
    return productionOrders.filter((item) => item.root_id === activeRoot);
  }, [productionOrders, activeRoot]);

  async function createOne(orderId: string) {
    await createRequest("create", [orderId]);
  }

  async function createSelected() {
    await createRequest("create_many", selected);
  }

  async function createRequest(action: string, orderIds: string[]) {
    if (orderIds.length === 0) {
      setMessage("Chưa chọn đơn hàng.");
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const response = await fetch("/api/production-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "create"
            ? { action, orderId: orderIds[0] }
            : { action, orderIds }
        ),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Không thể tạo LSX.");

      setOrders(result.orders ?? []);
      setProductionOrders(result.productionOrders ?? []);
      setSelected([]);
      if (result.rootId) setActiveRoot(result.rootId);
      setMessage("Đã tạo cây lệnh sản xuất.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo LSX.");
    } finally {
      setCreating(false);
    }
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  function toggleAllVisible() {
    const available = filteredOrders
      .filter((order) => !rootByOrder.has(order.id))
      .map((order) => order.id);

    const allSelected = available.length > 0 && available.every((id) => selected.includes(id));

    setSelected((current) =>
      allSelected
        ? current.filter((id) => !available.includes(id))
        : Array.from(new Set([...current, ...available]))
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-[1750px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Production Orders
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Tạo lệnh sản xuất</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo LSX trực tiếp từ đơn hàng. Sau khi có LSX Cha → Cánh /
            Khung / Phào → WO theo Routing, kế hoạch mới chọn LSX vào Lô sản xuất.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary title="Đơn hàng" value={orders.length} />
          <Summary title="Đã tạo LSX" value={rootByOrder.size} />
          <Summary title="Chưa tạo LSX" value={orders.length - rootByOrder.size} />
          <Summary title="Đang chọn" value={selected.length} />
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="font-bold text-slate-900">Đơn hàng chờ tạo LSX</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Có thể chọn nhiều đơn và tạo cùng lúc.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm đơn hàng..."
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={createSelected}
                  disabled={creating || selected.length === 0}
                  className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {creating ? "Đang tạo..." : `Tạo LSX (${selected.length})`}
                </button>
              </div>
            </div>

            <div className="max-h-[720px] overflow-auto">
              <table className="min-w-[900px] w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                  <tr>
                    <Th>
                      <input type="checkbox" onChange={toggleAllVisible} />
                    </Th>
                    <Th>Đơn hàng</Th>
                    <Th>Đại lý</Th>
                    <Th>Ngày giao</Th>
                    <Th>Model</Th>
                    <Th>Màu</Th>
                    <Th>SL</Th>
                    <Th>LSX</Th>
                    <Th>Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const root = rootByOrder.get(order.id);
                    return (
                      <tr key={order.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <Td center>
                          <input
                            type="checkbox"
                            disabled={Boolean(root)}
                            checked={selected.includes(order.id)}
                            onChange={() => toggle(order.id)}
                          />
                        </Td>
                        <Td strong>{order.don_hang}</Td>
                        <Td>{order.dai_ly}</Td>
                        <Td center>{order.ngay_giao}</Td>
                        <Td center>{order.model}</Td>
                        <Td center>{order.mau}</Td>
                        <Td center>{order.so_luong}</Td>
                        <Td center>
                          {root ? (
                            <button
                              type="button"
                              onClick={() => setActiveRoot(root.id)}
                              className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"
                            >
                              {root.production_no}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Chưa tạo</span>
                          )}
                        </Td>
                        <Td center>
                          {!root && (
                            <button
                              type="button"
                              onClick={() => createOne(order.id)}
                              disabled={creating}
                              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Tạo LSX
                            </button>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-bold text-slate-900">Cây lệnh sản xuất</h2>
              <p className="mt-1 text-xs text-slate-500">
                Bấm mã LSX ở bảng bên trái để xem cấu trúc Cha / Con / Cháu.
              </p>
            </div>

            <div className="max-h-[720px] overflow-auto p-4">
              {!activeRoot ? (
                <div className="py-20 text-center text-sm text-slate-400">
                  Chọn một LSX để xem cây lệnh.
                </div>
              ) : (
                <ProductionTree rows={activeTree} />
              )}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function ProductionTree({ rows }: { rows: ProductionOrder[] }) {
  const root = rows.find((item) => item.level_no === 1);
  if (!root) return null;

  const children = rows.filter((item) => item.parent_id === root.id && item.level_no === 2);
  const common = rows.filter(
    (item) => item.parent_id === root.id && item.level_no === 3
  );

  return (
    <div>
      <Node
        title={root.production_no}
        subtitle={`LSX CHA • SL ${root.quantity}`}
        status={root.status}
        level={0}
      />

      <div className="ml-5 border-l-2 border-slate-200 pl-4">
        {children.map((child) => {
          const operations = rows.filter(
            (item) => item.parent_id === child.id && item.level_no === 3
          );

          return (
            <div key={child.id} className="mb-4">
              <Node
                title={child.production_no}
                subtitle={`LSX CON • ${child.component_type}`}
                status={child.status}
                level={1}
              />
              <div className="ml-5 border-l border-slate-200 pl-4">
                {operations.map((operation) => (
                  <Node
                    key={operation.id}
                    title={operation.production_no}
                    subtitle={`${operation.production_operations?.wo_code ?? ""} • ${
                      operation.production_operations?.operation_name ?? ""
                    }`}
                    status={operation.status}
                    blocked={operation.is_blocked}
                    level={2}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 text-xs font-bold uppercase text-amber-700">
            Điểm hội tụ: Cánh + Khung + Phào → Đủ bộ
          </div>
          <div className="space-y-2">
            {common.map((operation) => (
              <Node
                key={operation.id}
                title={operation.production_no}
                subtitle={`${operation.production_operations?.wo_code ?? ""} • ${
                  operation.production_operations?.operation_name ?? ""
                }`}
                status={operation.status}
                blocked={operation.is_blocked}
                level={2}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Node({
  title,
  subtitle,
  status,
  blocked = false,
}: {
  title: string;
  subtitle: string;
  status: string;
  blocked?: boolean;
  level: number;
}) {
  return (
    <div className="mb-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900">{title}</div>
          <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className="flex gap-1">
          {blocked && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
              CHỜ ĐỦ BỘ
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

function Summary({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap border-r border-slate-700 px-3 py-3 text-center text-xs font-bold uppercase">
      {children}
    </th>
  );
}

function Td({
  children,
  center = false,
  strong = false,
}: {
  children: React.ReactNode;
  center?: boolean;
  strong?: boolean;
}) {
  return (
    <td className={`border-r border-slate-200 px-3 py-3 ${center ? "text-center" : ""} ${
      strong ? "font-semibold text-slate-900" : "text-slate-700"
    }`}>
      {children}
    </td>
  );
}
