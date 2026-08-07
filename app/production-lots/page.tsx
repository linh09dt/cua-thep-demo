"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type Order = {
  id: string;
  orderNo: string;
  dealer: string;
  orderDate: string;
  dueDate: string;
  model: string;
  color: string;
  quantity: number;
  status: string;
};

type LotItem = Order & {
  lotId: string;
  sequenceNo: number;
  canhReady: number;
  khungReady: number;
  phaoReady: number;
  fullSetReady: number;
};

type Lot = {
  id: string;
  lotNo: string;
  lotName: string;
  productionDate: string;
  targetDeliveryDate: string;
  priority: number;
  status: string;
  note: string;
  totalOrders: number;
  totalQty: number;
  canhReady: number;
  khungReady: number;
  phaoReady: number;
  fullSetReady: number;
  items: LotItem[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProductionLotsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [activeLotId, setActiveLotId] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    lotName: "",
    productionDate: today(),
    targetDeliveryDate: "",
    priority: 100,
    note: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch("/api/production-lots", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải lô sản xuất.");
      }
      setLots(result.lots ?? []);
      setOrders(result.unassignedOrders ?? []);
      if (!activeLotId && result.lots?.[0]?.id) {
        setActiveLotId(result.lots[0].id);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể tải lô sản xuất."
      );
    } finally {
      setLoading(false);
    }
  }

  async function action(body: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/production-lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể cập nhật lô.");
      }
      setLots(result.lots ?? []);
      setOrders(result.unassignedOrders ?? []);
      setSelectedOrderIds([]);
      setMessage("Đã cập nhật Lô sản xuất.");
      if (body.action === "create" && result.lots?.[0]?.id) {
        setActiveLotId(result.lots[0].id);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể cập nhật lô."
      );
    } finally {
      setSaving(false);
    }
  }

  const activeLot = useMemo(
    () => lots.find((lot) => lot.id === activeLotId) ?? lots[0] ?? null,
    [lots, activeLotId]
  );

  const filteredOrders = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return orders;
    return orders.filter((order) =>
      [order.orderNo, order.dealer, order.model, order.color].some((value) =>
        String(value ?? "").toLowerCase().includes(key)
      )
    );
  }, [orders, search]);

  function toggleOrder(id: string) {
    setSelectedOrderIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

  function toggleAll() {
    const ids = filteredOrders.map((x) => x.id);
    const all = ids.length > 0 && ids.every((id) => selectedOrderIds.includes(id));
    setSelectedOrderIds((current) =>
      all
        ? current.filter((id) => !ids.includes(id))
        : Array.from(new Set([...current, ...ids]))
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-[1800px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Production Lot
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Lô sản xuất
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gom các đơn theo kế hoạch giao hàng thành một lô. Lô là tầng kế
            hoạch; LSX và Dispatch vẫn chạy riêng theo từng đơn/WO.
          </p>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Summary title="Tổng lô" value={lots.length} />
          <Summary
            title="Lô Released"
            value={lots.filter((x) => x.status === "RELEASED").length}
          />
          <Summary title="Đơn chưa vào lô" value={orders.length} />
          <Summary title="Đang chọn" value={selectedOrderIds.length} />
          <Summary
            title="Đủ bộ của lô"
            value={activeLot ? `${activeLot.fullSetReady}/${activeLot.totalQty}` : "-"}
          />
        </div>

        <div className="grid gap-5 2xl:grid-cols-[410px_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <h2 className="font-bold text-slate-900">Tạo lô mới</h2>
            </div>
            <div className="space-y-3 p-4">
              <Field label="Tên lô">
                <input
                  value={form.lotName}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, lotName: e.target.value }))
                  }
                  placeholder="VD: Lô giao 12/08"
                  className={inputClass}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ngày sản xuất">
                  <input
                    type="date"
                    value={form.productionDate}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, productionDate: e.target.value }))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Ngày giao mục tiêu">
                  <input
                    type="date"
                    value={form.targetDeliveryDate}
                    onChange={(e) =>
                      setForm((x) => ({
                        ...x,
                        targetDeliveryDate: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Priority">
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((x) => ({
                      ...x,
                      priority: Number(e.target.value),
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Ghi chú">
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, note: e.target.value }))
                  }
                  className="min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm"
                />
              </Field>

              <button
                type="button"
                disabled={saving || selectedOrderIds.length === 0}
                onClick={() =>
                  action({
                    action: "create",
                    ...form,
                    orderIds: selectedOrderIds,
                  })
                }
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                Tạo lô với {selectedOrderIds.length} đơn
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Đơn hàng chưa vào lô
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Chọn các đơn có ngày giao/đặc tính phù hợp để tạo lô kế hoạch.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm đơn, đại lý, model..."
                  className="h-10 min-w-[240px] rounded-md border border-slate-300 px-3 text-sm"
                />
                {activeLot?.status === "DRAFT" && (
                  <button
                    type="button"
                    disabled={saving || selectedOrderIds.length === 0}
                    onClick={() =>
                      action({
                        action: "add_orders",
                        lotId: activeLot.id,
                        orderIds: selectedOrderIds,
                      })
                    }
                    className="rounded-md border border-blue-300 bg-blue-50 px-3 text-xs font-bold text-blue-700 disabled:opacity-40"
                  >
                    + Thêm vào lô đang chọn
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[480px] overflow-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 text-white">
                  <tr>
                    <Th>
                      <input type="checkbox" onChange={toggleAll} />
                    </Th>
                    <Th>Đơn hàng</Th>
                    <Th>Đại lý</Th>
                    <Th>Ngày giao</Th>
                    <Th>Model</Th>
                    <Th>Màu</Th>
                    <Th>SL</Th>
                    <Th>Tình trạng</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-200">
                      <Td center>
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => toggleOrder(order.id)}
                        />
                      </Td>
                      <Td strong>{order.orderNo}</Td>
                      <Td>{order.dealer}</Td>
                      <Td center>{formatDate(order.dueDate)}</Td>
                      <Td center>{order.model}</Td>
                      <Td center>{order.color}</Td>
                      <Td center strong>{order.quantity}</Td>
                      <Td center>{order.status}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h2 className="font-bold text-slate-900">Danh sách Lô sản xuất</h2>
              <p className="mt-1 text-xs text-slate-500">
                Release lô để cho phép tạo LSX cho các đơn trong lô.
              </p>
            </div>
            {activeLot?.status === "DRAFT" && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  action({ action: "release", lotId: activeLot.id })
                }
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
              >
                Release Lô
              </button>
            )}
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-[420px_1fr]">
            <div className="space-y-2">
              {lots.map((lot) => (
                <button
                  type="button"
                  key={lot.id}
                  onClick={() => setActiveLotId(lot.id)}
                  className={`w-full rounded-lg border p-3 text-left ${
                    activeLot?.id === lot.id
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{lot.lotNo}</span>
                    <Status status={lot.status} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {lot.totalOrders} đơn • {lot.totalQty} bộ • SX{" "}
                    {formatDate(lot.productionDate)}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-600">
                    Đủ bộ: {lot.fullSetReady}/{lot.totalQty}
                  </div>
                </button>
              ))}
            </div>

            <div>
              {!activeLot ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  Chưa có lô sản xuất.
                </div>
              ) : (
                <>
                  <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <Summary title="Tổng SL" value={activeLot.totalQty} />
                    <Summary
                      title="Cánh Ready"
                      value={`${activeLot.canhReady}/${activeLot.totalQty}`}
                    />
                    <Summary
                      title="Khung Ready"
                      value={`${activeLot.khungReady}/${activeLot.totalQty}`}
                    />
                    <Summary
                      title="Phào Ready"
                      value={`${activeLot.phaoReady}/${activeLot.totalQty}`}
                    />
                    <Summary
                      title="Đủ Bộ Ready"
                      value={`${activeLot.fullSetReady}/${activeLot.totalQty}`}
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[1050px] w-full text-sm">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <Th>Đơn</Th>
                          <Th>Ngày giao</Th>
                          <Th>Model</Th>
                          <Th>Màu</Th>
                          <Th>SL</Th>
                          <Th>Cánh</Th>
                          <Th>Khung</Th>
                          <Th>Phào</Th>
                          <Th>Đủ Bộ</Th>
                          <Th></Th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeLot.items.map((item) => (
                          <tr key={item.id} className="border-t border-slate-200">
                            <Td strong>{item.orderNo}</Td>
                            <Td center>{formatDate(item.dueDate)}</Td>
                            <Td center>{item.model}</Td>
                            <Td center>{item.color}</Td>
                            <Td center strong>{item.quantity}</Td>
                            <Td center>{item.canhReady}</Td>
                            <Td center>{item.khungReady}</Td>
                            <Td center>{item.phaoReady}</Td>
                            <Td center strong>{item.fullSetReady}</Td>
                            <Td center>
                              {activeLot.status === "DRAFT" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    action({
                                      action: "remove_order",
                                      lotId: activeLot.id,
                                      itemId: item.id,
                                    })
                                  }
                                  className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-600"
                                >
                                  Bỏ
                                </button>
                              )}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Summary({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-[10px] font-bold uppercase text-slate-500">{title}</div>
      <div className="mt-1 text-xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const cls =
    status === "RELEASED"
      ? "bg-emerald-100 text-emerald-700"
      : status === "RUNNING"
      ? "bg-amber-100 text-amber-700"
      : status === "COMPLETED"
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${cls}`}>
      {status}
    </span>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-3 py-2.5 text-center text-[10px] font-bold uppercase">
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
    <td
      className={`px-3 py-2.5 ${center ? "text-center" : ""} ${
        strong ? "font-bold text-slate-900" : "text-slate-700"
      }`}
    >
      {children}
    </td>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  const p = value.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : value;
}
