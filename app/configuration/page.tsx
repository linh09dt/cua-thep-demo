"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";

type StageType = "BRANCH" | "COMMON";

type Operation = {
  id: string;
  woCode: string;
  operationCode: string;
  operationName: string;
  componentScope: string;
  stageType: StageType;
  isActive: boolean;
};

type RoutingStep = {
  id: string;
  sequenceNo: number;
  operationId: string;
  woCode: string;
  operationCode: string;
  operationName: string;
  componentScope: string;
};

type WipSetting = {
  operationId: string;
  woCode: string;
  operationName: string;
  componentScope: string;
  stageType: StageType;
  wipMin: number;
  wipTarget: number;
  wipMax: number;
  unitName: string;
  isActive: boolean;
  note: string;
};

type Routing = {
  routingId: string;
  routingName: string;
  componentType: string;
  routingType: StageType;
  requiresFullSet: boolean;
  requiredComponents: string[];
  isActive: boolean;
  steps: RoutingStep[];
};

const EMPTY_OPERATION: Omit<Operation, "id"> = {
  woCode: "",
  operationCode: "",
  operationName: "",
  componentScope: "CÁNH",
  stageType: "BRANCH",
  isActive: true,
};

export default function ConfigurationPage() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [routings, setRoutings] = useState<Routing[]>([]);
  const [wipSettings, setWipSettings] = useState<WipSetting[]>([]);
  const [activeTab, setActiveTab] = useState<
    "wo" | "routing" | "wip" | "flow" | "reset"
  >("wo");

  const [operationForm, setOperationForm] =
    useState<Omit<Operation, "id"> & { id?: string }>(EMPTY_OPERATION);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "info"
  >("info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<Record<
    string,
    number | boolean
  > | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const response = await fetch("/api/configuration/production", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải cấu hình.");
      }

      setOperations(result.operations ?? []);
      setRoutings(result.routings ?? []);
      setWipSettings(result.wipSettings ?? []);
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể tải cấu hình.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function showMessage(
    text: string,
    type: "success" | "error" | "info" = "info"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  async function saveOperation(event: FormEvent) {
    event.preventDefault();

    setSaving(true);

    try {
      const response = await fetch("/api/configuration/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "save_operation",
          operation: operationForm,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể lưu WO.");
      }

      setOperations(result.operations ?? []);
      setRoutings(result.routings ?? []);
      setWipSettings(result.wipSettings ?? []);
      setOperationForm(EMPTY_OPERATION);
      showMessage("Đã lưu WO/Công đoạn.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể lưu WO.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  function editOperation(operation: Operation) {
    setOperationForm({ ...operation });
    setActiveTab("wo");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteOperation(operation: Operation) {
    const ok = window.confirm(
      `Xóa ${operation.woCode} - ${operation.operationName}?`
    );

    if (!ok) return;

    try {
      const response = await fetch("/api/configuration/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete_operation",
          id: operation.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Không thể xóa. Công đoạn có thể đang được dùng trong Routing."
        );
      }

      setOperations(result.operations ?? []);
      setRoutings(result.routings ?? []);
      setWipSettings(result.wipSettings ?? []);
      showMessage("Đã xóa WO/Công đoạn.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể xóa WO.",
        "error"
      );
    }
  }

  async function saveRouting(routingId: string, operationIds: string[]) {
    setSaving(true);

    try {
      const response = await fetch("/api/configuration/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "save_routing",
          routingId,
          operationIds,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể lưu Routing.");
      }

      setOperations(result.operations ?? []);
      setRoutings(result.routings ?? []);
      setWipSettings(result.wipSettings ?? []);
      showMessage(`Đã cập nhật ${routingId}.`, "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể lưu Routing.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }


  async function saveWip(setting: WipSetting) {
    setSaving(true);

    try {
      const response = await fetch("/api/configuration/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "save_wip",
          operationId: setting.operationId,
          wipMin: setting.wipMin,
          wipTarget: setting.wipTarget,
          wipMax: setting.wipMax,
          unitName: setting.unitName,
          isActive: setting.isActive,
          note: setting.note,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể lưu WIP.");
      }

      setOperations(result.operations ?? []);
      setRoutings(result.routings ?? []);
      setWipSettings(result.wipSettings ?? []);
      showMessage(
        `Đã lưu WIP ${setting.woCode} - ${setting.operationName}.`,
        "success"
      );
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể lưu WIP.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  function updateWip(
    operationId: string,
    field:
      | "wipMin"
      | "wipTarget"
      | "wipMax"
      | "unitName"
      | "isActive"
      | "note",
    value: string | number | boolean
  ) {
    setWipSettings((current) =>
      current.map((item) =>
        item.operationId === operationId
          ? { ...item, [field]: value }
          : item
      )
    );
    setMessage("");
  }


  async function resetDemoData() {
    if (resetConfirmation !== "RESET") {
      showMessage(
        'Nhập chính xác "RESET" để xác nhận.',
        "error"
      );
      return;
    }

    const ok = window.confirm(
      "Xác nhận reset toàn bộ Lô, LSX/WO, Dispatch và Báo cáo? Hệ thống chỉ giữ lại đúng 200 đơn hàng và toàn bộ cấu hình."
    );

    if (!ok) return;

    setResetting(true);
    setResetResult(null);

    try {
      const response = await fetch(
        "/api/configuration/reset",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirmation: resetConfirmation,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể reset dữ liệu."
        );
      }

      setResetResult(result.result ?? null);
      setResetConfirmation("");
      showMessage(
        "Đã reset dữ liệu. Hệ thống giữ lại đúng 200 đơn hàng và toàn bộ cấu hình.",
        "success"
      );

      await loadData();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể reset dữ liệu.",
        "error"
      );
    } finally {
      setResetting(false);
    }
  }

  const branchCount = useMemo(
    () => operations.filter((item) => item.stageType === "BRANCH").length,
    [operations]
  );

  const commonCount = useMemo(
    () => operations.filter((item) => item.stageType === "COMMON").length,
    [operations]
  );

  return (
    <AppShell>
      <main className="mx-auto max-w-[1700px] p-5">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Master Data
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Cấu hình sản xuất
          </h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">
            Cánh, Khung và Phào chạy Routing riêng. Khi cả ba nhánh hoàn thành
            mới được xác nhận đủ bộ và chuyển vào Routing Chung từ Hàn liên kết.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary title="Tổng WO" value={operations.length} />
          <Summary title="WO nhánh riêng" value={branchCount} />
          <Summary title="WO chung" value={commonCount} />
          <Summary title="Routing" value={routings.length} />
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : messageType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          <TabButton active={activeTab === "wo"} onClick={() => setActiveTab("wo")}>
            WO Master
          </TabButton>
          <TabButton
            active={activeTab === "routing"}
            onClick={() => setActiveTab("routing")}
          >
            Routing
          </TabButton>
          <TabButton
            active={activeTab === "wip"}
            onClick={() => setActiveTab("wip")}
          >
            WIP công đoạn
          </TabButton>
          <TabButton
            active={activeTab === "flow"}
            onClick={() => setActiveTab("flow")}
          >
            Luồng đủ bộ
          </TabButton>
          <TabButton
            active={activeTab === "reset"}
            onClick={() => setActiveTab("reset")}
          >
            Reset dữ liệu
          </TabButton>
        </div>

        {activeTab === "wo" && (
          <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h2 className="font-bold text-slate-900">
                  {operationForm.id ? "Sửa WO" : "Thêm WO"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Khai báo công đoạn trước, Routing sẽ sử dụng các WO này.
                </p>
              </div>

              <form onSubmit={saveOperation} className="space-y-4 p-5">
                <Field label="WO *">
                  <input
                    value={operationForm.woCode}
                    onChange={(e) =>
                      setOperationForm((current) => ({
                        ...current,
                        woCode: e.target.value,
                      }))
                    }
                    placeholder="WO21"
                    className={inputClass}
                  />
                </Field>

                <Field label="Mã công đoạn *">
                  <input
                    value={operationForm.operationCode}
                    onChange={(e) =>
                      setOperationForm((current) => ({
                        ...current,
                        operationCode: e.target.value,
                      }))
                    }
                    placeholder="CONG_DOAN_MOI"
                    className={inputClass}
                  />
                </Field>

                <Field label="Tên công đoạn *">
                  <input
                    value={operationForm.operationName}
                    onChange={(e) =>
                      setOperationForm((current) => ({
                        ...current,
                        operationName: e.target.value,
                      }))
                    }
                    placeholder="Tên công đoạn"
                    className={inputClass}
                  />
                </Field>

                <Field label="Phạm vi">
                  <select
                    value={operationForm.componentScope}
                    onChange={(e) =>
                      setOperationForm((current) => ({
                        ...current,
                        componentScope: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="CÁNH">Cánh</option>
                    <option value="KHUNG">Khung</option>
                    <option value="PHÀO">Phào</option>
                    <option value="ĐỦ BỘ">Đủ bộ</option>
                  </select>
                </Field>

                <Field label="Loại luồng">
                  <select
                    value={operationForm.stageType}
                    onChange={(e) =>
                      setOperationForm((current) => ({
                        ...current,
                        stageType: e.target.value as StageType,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="BRANCH">Nhánh riêng</option>
                    <option value="COMMON">Luồng chung</option>
                  </select>
                </Field>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={operationForm.isActive}
                    onChange={(e) =>
                      setOperationForm((current) => ({
                        ...current,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  Hoạt động
                </label>

                <div className="flex gap-2 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setOperationForm(EMPTY_OPERATION)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Nhập lại
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Đang lưu..." : "Lưu WO"}
                  </button>
                </div>
              </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-bold text-slate-900">
                  Danh sách WO / Công đoạn
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {loading ? "Đang tải..." : `${operations.length} công đoạn`}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <Th>WO</Th>
                      <Th>Mã công đoạn</Th>
                      <Th>Tên công đoạn</Th>
                      <Th>Phạm vi</Th>
                      <Th>Luồng</Th>
                      <Th>Trạng thái</Th>
                      <Th>Thao tác</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map((operation) => (
                      <tr
                        key={operation.id}
                        className="border-t border-slate-200 hover:bg-slate-50"
                      >
                        <Td strong>{operation.woCode}</Td>
                        <Td>{operation.operationCode}</Td>
                        <Td>{operation.operationName}</Td>
                        <Td center>{operation.componentScope}</Td>
                        <Td center>
                          {operation.stageType === "BRANCH"
                            ? "Nhánh riêng"
                            : "Luồng chung"}
                        </Td>
                        <Td center>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              operation.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {operation.isActive ? "Hoạt động" : "Tắt"}
                          </span>
                        </Td>
                        <Td center>
                          <div className="flex justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => editOperation(operation)}
                              className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteOperation(operation)}
                              className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                            >
                              Xóa
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === "routing" && (
          <section className="grid gap-5 xl:grid-cols-2">
            {routings.map((routing) => (
              <RoutingEditor
                key={routing.routingId}
                routing={routing}
                operations={operations}
                saving={saving}
                onSave={saveRouting}
              />
            ))}
          </section>
        )}

        {activeTab === "wip" && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                Cài đặt WIP theo từng công đoạn
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Thiết lập lượng WIP tối thiểu, mục tiêu và tối đa cho từng WO.
                Bản này chỉ lưu cấu hình; chưa tự động thay đổi logic Điều độ.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1250px] w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <Th>WO</Th>
                    <Th>Công đoạn</Th>
                    <Th>Phạm vi</Th>
                    <Th>WIP Min</Th>
                    <Th>WIP Target</Th>
                    <Th>WIP Max</Th>
                    <Th>Đơn vị</Th>
                    <Th>Hoạt động</Th>
                    <Th>Ghi chú</Th>
                    <Th>Lưu</Th>
                  </tr>
                </thead>

                <tbody>
                  {wipSettings.map((item) => (
                    <tr
                      key={item.operationId}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <Td strong>{item.woCode}</Td>
                      <Td>{item.operationName}</Td>
                      <Td center>{item.componentScope}</Td>

                      <Td center>
                        <input
                          type="number"
                          min="0"
                          value={item.wipMin}
                          onChange={(e) =>
                            updateWip(
                              item.operationId,
                              "wipMin",
                              Number(e.target.value)
                            )
                          }
                          className={wipNumberClass}
                        />
                      </Td>

                      <Td center>
                        <input
                          type="number"
                          min="0"
                          value={item.wipTarget}
                          onChange={(e) =>
                            updateWip(
                              item.operationId,
                              "wipTarget",
                              Number(e.target.value)
                            )
                          }
                          className={wipNumberClass}
                        />
                      </Td>

                      <Td center>
                        <input
                          type="number"
                          min="0"
                          value={item.wipMax}
                          onChange={(e) =>
                            updateWip(
                              item.operationId,
                              "wipMax",
                              Number(e.target.value)
                            )
                          }
                          className={wipNumberClass}
                        />
                      </Td>

                      <Td center>
                        <input
                          value={item.unitName}
                          onChange={(e) =>
                            updateWip(
                              item.operationId,
                              "unitName",
                              e.target.value
                            )
                          }
                          className="h-9 w-[80px] rounded-md border border-slate-300 bg-white px-2 text-center text-sm"
                        />
                      </Td>

                      <Td center>
                        <input
                          type="checkbox"
                          checked={item.isActive}
                          onChange={(e) =>
                            updateWip(
                              item.operationId,
                              "isActive",
                              e.target.checked
                            )
                          }
                        />
                      </Td>

                      <Td>
                        <input
                          value={item.note}
                          onChange={(e) =>
                            updateWip(
                              item.operationId,
                              "note",
                              e.target.value
                            )
                          }
                          placeholder="Ghi chú WIP"
                          className="h-9 min-w-[220px] w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                        />
                      </Td>

                      <Td center>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => saveWip(item)}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                        >
                          Lưu
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-600">
              Quy tắc kiểm tra dữ liệu:{" "}
              <strong>WIP Min ≤ WIP Target ≤ WIP Max</strong>.
            </div>
          </section>
        )}

        {activeTab === "flow" && (
          <ProductionFlow routings={routings} />
        )}

        {activeTab === "reset" && (
          <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="border-b border-red-100 bg-red-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                Khu vực nguy hiểm
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Reset dữ liệu demo
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Xóa toàn bộ dữ liệu phát sinh để bắt đầu demo lại từ đầu,
                nhưng giữ lại đúng 200 đơn hàng và toàn bộ cấu hình hệ thống.
              </p>
            </div>

            <div className="grid gap-5 p-5 xl:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="font-bold text-emerald-800">
                  Dữ liệu được giữ lại
                </h3>

                <div className="mt-3 space-y-2 text-sm text-emerald-800">
                  <div>✓ Đúng 200 đơn hàng</div>
                  <div>✓ Danh mục Model / Màu / Khóa / Hướng mở</div>
                  <div>✓ WO Master và Routing</div>
                  <div>✓ Capacity công đoạn</div>
                  <div>✓ Priority theo WO</div>
                  <div>✓ WIP Min / Target / Max</div>
                </div>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h3 className="font-bold text-red-800">
                  Dữ liệu sẽ bị xóa
                </h3>

                <div className="mt-3 space-y-2 text-sm text-red-800">
                  <div>× Lô sản xuất</div>
                  <div>× LSX Cha / LSX Con / WO phát sinh</div>
                  <div>× Dispatch Draft / Released</div>
                  <div>× Báo cáo Good / NG</div>
                  <div>× Toàn bộ tiến độ sản xuất phát sinh</div>
                  <div>× Các đơn ngoài 200 đơn được giữ</div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-5">
              <div className="max-w-xl">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-800">
                    Nhập RESET để xác nhận
                  </span>

                  <input
                    value={resetConfirmation}
                    onChange={(e) =>
                      setResetConfirmation(e.target.value)
                    }
                    placeholder="RESET"
                    autoComplete="off"
                    className="h-11 w-full rounded-lg border border-red-300 bg-white px-3 font-mono text-sm font-bold uppercase text-red-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>

                <button
                  type="button"
                  disabled={
                    resetting ||
                    resetConfirmation !== "RESET"
                  }
                  onClick={resetDemoData}
                  className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {resetting
                    ? "Đang reset..."
                    : "RESET DỮ LIỆU DEMO"}
                </button>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  200 đơn được ưu tiên giữ là các đơn có nhãn [DEMO200].
                  Nếu chưa đủ 200, hệ thống tự lấy thêm các đơn cũ nhất.
                  Sau reset, các đơn giữ lại được đưa về trạng thái Mới.
                </p>
              </div>

              {resetResult && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Summary
                    title="Đơn trước reset"
                    value={Number(resetResult.orders_before ?? 0)}
                  />
                  <Summary
                    title="Đơn sau reset"
                    value={Number(resetResult.orders_after ?? 0)}
                  />
                  <Summary
                    title="LSX/WO đã xóa"
                    value={Number(
                      resetResult.deleted_production_orders ?? 0
                    )}
                  />
                  <Summary
                    title="Dispatch đã xóa"
                    value={
                      Number(
                        resetResult.deleted_dispatch_headers ?? 0
                      ) +
                      Number(
                        resetResult.deleted_dispatch_items ?? 0
                      )
                    }
                  />
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}

function RoutingEditor({
  routing,
  operations,
  saving,
  onSave,
}: {
  routing: Routing;
  operations: Operation[];
  saving: boolean;
  onSave: (routingId: string, operationIds: string[]) => Promise<void>;
}) {
  const [operationIds, setOperationIds] = useState(
    routing.steps.map((step) => step.operationId)
  );

  useEffect(() => {
    setOperationIds(routing.steps.map((step) => step.operationId));
  }, [routing]);

  const availableOperations = operations.filter((operation) => {
    if (routing.routingType === "COMMON") {
      return operation.stageType === "COMMON";
    }

    return (
      operation.stageType === "BRANCH" &&
      operation.componentScope === routing.componentType
    );
  });

  function addOperation(id: string) {
    if (!id || operationIds.includes(id)) return;
    setOperationIds((current) => [...current, id]);
  }

  function removeOperation(index: number) {
    setOperationIds((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= operationIds.length) return;

    setOperationIds((current) => {
      const next = [...current];
      const temporary = next[index];
      next[index] = next[target];
      next[target] = temporary;
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {routing.routingId}
            </div>
            <h2 className="mt-1 font-bold text-slate-900">
              {routing.routingName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {routing.routingType === "COMMON"
                ? "Routing chung sau điểm hội tụ đủ bộ"
                : `Routing riêng cho ${routing.componentType}`}
            </p>
          </div>

          {routing.requiresFullSet && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              Yêu cầu đủ bộ
            </span>
          )}
        </div>
      </div>

      {routing.requiresFullSet && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          Điều kiện vào Routing:{" "}
          <strong>{routing.requiredComponents.join(" + ")}</strong> đều hoàn
          thành Routing riêng.
        </div>
      )}

      <div className="space-y-2 p-5">
        {operationIds.map((operationId, index) => {
          const operation = operations.find(
            (item) => item.id === operationId
          );

          if (!operation) return null;

          return (
            <div
              key={`${routing.routingId}-${operationId}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900">
                  {operation.woCode} - {operation.operationName}
                </div>
                <div className="text-xs text-slate-500">
                  {operation.operationCode}
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === operationIds.length - 1}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeOperation(index)}
                  className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600"
                >
                  Bỏ
                </button>
              </div>
            </div>
          );
        })}

        <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
          <select
            defaultValue=""
            onChange={(e) => {
              addOperation(e.target.value);
              e.currentTarget.value = "";
            }}
            className={`${inputClass} flex-1`}
          >
            <option value="">+ Thêm công đoạn vào Routing</option>
            {availableOperations
              .filter((operation) => !operationIds.includes(operation.id))
              .map((operation) => (
                <option key={operation.id} value={operation.id}>
                  {operation.woCode} - {operation.operationName}
                </option>
              ))}
          </select>

          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(routing.routingId, operationIds)}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Lưu Routing
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductionFlow({ routings }: { routings: Routing[] }) {
  const canh = routings.find((item) => item.routingId === "RT_CANH");
  const khung = routings.find((item) => item.routingId === "RT_KHUNG");
  const phao = routings.find((item) => item.routingId === "RT_PHAO");
  const common = routings.find((item) => item.routingId === "RT_CHUNG");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="font-bold text-slate-900">
          Luồng sản xuất theo bộ cửa
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ba nhánh sản xuất độc lập. Không cho đi vào Hàn liên kết nếu chưa đủ
          Cánh + Khung + Phào.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FlowBranch title="CÁNH" routing={canh} />
        <FlowBranch title="KHUNG" routing={khung} />
        <FlowBranch title="PHÀO" routing={phao} />
      </div>

      <div className="my-6 flex flex-col items-center">
        <div className="h-8 w-px bg-slate-300" />
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-4 text-center">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
            Điểm hội tụ
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            KIỂM TRA ĐỦ BỘ
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Cánh hoàn thành + Khung hoàn thành + Phào hoàn thành
          </div>
        </div>
        <div className="h-8 w-px bg-slate-300" />
        <div className="text-xl">↓</div>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-blue-700">
            RT_CHUNG - LUỒNG SAU ĐỦ BỘ
          </div>

          <div className="space-y-2">
            {common?.steps.map((step, index) => (
              <div key={step.id}>
                <div className="rounded-lg border border-blue-200 bg-white px-4 py-3 text-center font-semibold text-slate-900">
                  {step.woCode} - {step.operationName}
                </div>
                {index < common.steps.length - 1 && (
                  <div className="py-1 text-center text-slate-400">↓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowBranch({
  title,
  routing,
}: {
  title: string;
  routing?: Routing;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-center">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {routing?.routingId}
        </div>
        <div className="font-bold text-slate-900">{title}</div>
      </div>

      <div className="space-y-1">
        {routing?.steps.map((step, index) => (
          <div key={step.id}>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800">
              {step.woCode} - {step.operationName}
            </div>
            {index < routing.steps.length - 1 && (
              <div className="py-0.5 text-center text-slate-400">↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const wipNumberClass =
  "h-9 w-[90px] rounded-md border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap border-r border-slate-700 px-3 py-3 text-center text-xs font-bold uppercase tracking-wide">
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
      className={`border-r border-slate-200 px-3 py-3 ${
        center ? "text-center" : ""
      } ${strong ? "font-semibold text-slate-900" : "text-slate-700"}`}
    >
      {children}
    </td>
  );
}
