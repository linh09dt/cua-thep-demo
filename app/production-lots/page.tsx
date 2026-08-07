"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type ProductionRoot = {
  id: string;
  productionOrderId: string;
  productionNo: string;
  orderId: string;
  orderNo: string;
  dealer: string;
  orderDate: string;
  dueDate: string;
  model: string;
  color: string;
  quantity: number;
  rootStatus: string;
};

type LotItem = ProductionRoot & {
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
  const [productionOrders, setProductionOrders] = useState<
    ProductionRoot[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
      const response = await fetch(
        "/api/production-lots",
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Không thể tải Lô sản xuất."
        );
      }

      setLots(result.lots ?? []);
      setProductionOrders(
        result.unassignedProductionOrders ?? []
      );

      if (
        !activeLotId &&
        result.lots?.[0]?.id
      ) {
        setActiveLotId(result.lots[0].id);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải Lô sản xuất."
      );
    } finally {
      setLoading(false);
    }
  }

  async function action(
    body: Record<string, unknown>
  ) {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/production-lots",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Không thể cập nhật Lô."
        );
      }

      setLots(result.lots ?? []);
      setProductionOrders(
        result.unassignedProductionOrders ?? []
      );
      setSelectedIds([]);
      setMessage("Đã cập nhật Lô sản xuất.");

      if (
        body.action === "create" &&
        result.lots?.[0]?.id
      ) {
        setActiveLotId(result.lots[0].id);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật Lô."
      );
    } finally {
      setSaving(false);
    }
  }

  const activeLot = useMemo(
    () =>
      lots.find((lot) => lot.id === activeLotId) ??
      lots[0] ??
      null,
    [lots, activeLotId]
  );

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();

    if (!key) return productionOrders;

    return productionOrders.filter((item) =>
      [
        item.productionNo,
        item.orderNo,
        item.dealer,
        item.model,
        item.color,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(key)
      )
    );
  }, [productionOrders, search]);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

  function toggleAll() {
    const ids = filtered.map(
      (x) => x.productionOrderId
    );

    const all =
      ids.length > 0 &&
      ids.every((id) => selectedIds.includes(id));

    setSelectedIds((current) =>
      all
        ? current.filter(
            (id) => !ids.includes(id)
          )
        : Array.from(
            new Set([...current, ...ids])
          )
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
            Chọn LSX đã được tạo để gom thành Lô kế hoạch.
            Lô không tạo LSX và không thay thế Dispatch.
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
            value={
              lots.filter(
                (x) => x.status === "RELEASED"
              ).length
            }
          />
          <Summary
            title="LSX chưa vào lô"
            value={productionOrders.length}
          />
          <Summary
            title="Đang chọn"
            value={selectedIds.length}
          />
          <Summary
            title="Đủ bộ của lô"
            value={
              activeLot
                ? `${activeLot.fullSetReady}/${activeLot.totalQty}`
                : "-"
            }
          />
        </div>

        <div className="grid gap-5 2xl:grid-cols-[410px_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <h2 className="font-bold text-slate-900">
                Tạo lô mới
              </h2>
            </div>

            <div className="space-y-3 p-4">
              <Field label="Tên lô">
                <input
                  value={form.lotName}
                  onChange={(e) =>
                    setForm((x) => ({
                      ...x,
                      lotName: e.target.value,
                    }))
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
                      setForm((x) => ({
                        ...x,
                        productionDate:
                          e.target.value,
                      }))
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
                        targetDeliveryDate:
                          e.target.value,
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
                      priority: Number(
                        e.target.value
                      ),
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Ghi chú">
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm((x) => ({
                      ...x,
                      note: e.target.value,
                    }))
                  }
                  className="min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm"
                />
              </Field>

              <button
                type="button"
                disabled={
                  saving || selectedIds.length === 0
                }
                onClick={() =>
                  action({
                    action: "create",
                    ...form,
                    productionOrderIds: selectedIds,
                  })
                }
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                Tạo lô với {selectedIds.length} LSX
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  LSX chưa vào lô
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Chỉ hiển thị LSX Cha đã tạo và chưa
                  thuộc Lô sản xuất nào.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Tìm LSX, đơn, đại lý..."
                  className="h-10 min-w-[240px] rounded-md border border-slate-300 px-3 text-sm"
                />

                {activeLot?.status === "DRAFT" && (
                  <button
                    type="button"
                    disabled={
                      saving ||
                      selectedIds.length === 0
                    }
                    onClick={() =>
                      action({
                        action:
                          "add_production_orders",
                        lotId: activeLot.id,
                        productionOrderIds:
                          selectedIds,
                      })
                    }
                    className="rounded-md border border-blue-300 bg-blue-50 px-3 text-xs font-bold text-blue-700 disabled:opacity-40"
                  >
                    + Thêm LSX vào lô đang chọn
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[480px] overflow-auto">
              <table className="min-w-[1050px] w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 text-white">
                  <tr>
                    <Th>
                      <input
                        type="checkbox"
                        onChange={toggleAll}
                      />
                    </Th>
                    <Th>LSX Cha</Th>
                    <Th>Đơn hàng</Th>
                    <Th>Đại lý</Th>
                    <Th>Ngày giao</Th>
                    <Th>Model</Th>
                    <Th>Màu</Th>
                    <Th>SL</Th>
                    <Th>Trạng thái LSX</Th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.productionOrderId}
                      className="border-t border-slate-200"
                    >
                      <Td center>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(
                            item.productionOrderId
                          )}
                          onChange={() =>
                            toggle(
                              item.productionOrderId
                            )
                          }
                        />
                      </Td>
                      <Td strong>
                        {item.productionNo}
                      </Td>
                      <Td strong>{item.orderNo}</Td>
                      <Td>{item.dealer}</Td>
                      <Td center>
                        {formatDate(item.dueDate)}
                      </Td>
                      <Td center>{item.model}</Td>
                      <Td center>{item.color}</Td>
                      <Td center strong>
                        {item.quantity}
                      </Td>
                      <Td center>
                        {item.rootStatus}
                      </Td>
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
              <h2 className="font-bold text-slate-900">
                Danh sách Lô sản xuất
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Theo dõi tiến độ LSX trong từng Lô.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-[360px_1fr]">
            <div className="space-y-2">
              {lots.map((lot) => (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() =>
                    setActiveLotId(lot.id)
                  }
                  className={`w-full rounded-lg border p-3 text-left ${
                    activeLot?.id === lot.id
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      {lot.lotNo}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                      {lot.status}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {lot.lotName || "Lô sản xuất"} •{" "}
                    {lot.totalOrders} LSX • {lot.totalQty} bộ
                  </div>

                  <div className="mt-2 text-xs text-slate-600">
                    Đủ bộ:{" "}
                    <strong>
                      {lot.fullSetReady}/{lot.totalQty}
                    </strong>
                  </div>
                </button>
              ))}
            </div>

            <div>
              {!activeLot ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">
                  Chưa có Lô sản xuất.
                </div>
              ) : (
                <LotDetail
                  lot={activeLot}
                  saving={saving}
                  onAction={action}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function LotDetail({
  lot,
  saving,
  onAction,
}: {
  lot: Lot;
  saving: boolean;
  onAction: (
    body: Record<string, unknown>
  ) => Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-bold text-slate-900">
              {lot.lotNo}{" "}
              {lot.lotName
                ? `- ${lot.lotName}`
                : ""}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Ngày SX {formatDate(lot.productionDate)} •
              Giao mục tiêu{" "}
              {formatDate(lot.targetDeliveryDate)} •
              Priority {lot.priority}
            </div>
          </div>

          {lot.status === "DRAFT" && (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                onAction({
                  action: "release",
                  lotId: lot.id,
                })
              }
              className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              Release Lô
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <Summary
          title="Tổng"
          value={lot.totalQty}
        />
        <Summary
          title="Cánh Ready"
          value={lot.canhReady}
        />
        <Summary
          title="Khung Ready"
          value={lot.khungReady}
        />
        <Summary
          title="Phào Ready"
          value={lot.phaoReady}
        />
        <Summary
          title="Đủ Bộ Ready"
          value={lot.fullSetReady}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <Th>STT</Th>
              <Th>LSX</Th>
              <Th>Đơn hàng</Th>
              <Th>Ngày giao</Th>
              <Th>SL</Th>
              <Th>Cánh</Th>
              <Th>Khung</Th>
              <Th>Phào</Th>
              <Th>Đủ Bộ</Th>
              <Th></Th>
            </tr>
          </thead>

          <tbody>
            {lot.items.map((item, index) => (
              <tr
                key={item.id}
                className="border-t border-slate-200"
              >
                <Td center>{index + 1}</Td>
                <Td strong>
                  {item.productionNo}
                </Td>
                <Td strong>{item.orderNo}</Td>
                <Td center>
                  {formatDate(item.dueDate)}
                </Td>
                <Td center>{item.quantity}</Td>
                <Td center>
                  {item.canhReady}/{item.quantity}
                </Td>
                <Td center>
                  {item.khungReady}/{item.quantity}
                </Td>
                <Td center>
                  {item.phaoReady}/{item.quantity}
                </Td>
                <Td center strong>
                  {item.fullSetReady}/
                  {item.quantity}
                </Td>
                <Td center>
                  {lot.status === "DRAFT" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        onAction({
                          action:
                            "remove_production_order",
                          lotId: lot.id,
                          itemId: item.id,
                        })
                      }
                      className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600"
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
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">
        {label}
      </span>
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
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-bold uppercase text-slate-500">
        {title}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <th className="px-3 py-2 text-center text-xs font-bold">
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
      className={`px-3 py-2 ${
        center ? "text-center" : ""
      } ${
        strong
          ? "font-semibold text-slate-900"
          : "text-slate-700"
      }`}
    >
      {children}
    </td>
  );
}

function formatDate(value: string) {
  if (!value) return "-";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
