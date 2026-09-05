import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Badge,
  Button,
  SearchBar,
  Select,
  Table,
  Tr,
  Td,
  Pagination,
  Modal,
} from "../../components/ui";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

type TransferStatus =
  | "pending"
  | "in_transit"
  | "received"
  | "partial"
  | "cancelled";

type Store = {
  id: number;
  store_name: string;
  branch_name: string;
  status?: string;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  stock: number;
  store_id: number;
};

type TransferLine = {
  id: number;
  productId: number;
  name: string;
  sku: string;
  qty: number;
  received: number;
  unitCost: number;
};

type Transfer = {
  id: number;
  transferNo: string;
  fromStoreId: number;
  fromStore: string;
  toStoreId: number;
  toStore: string;
  status: TransferStatus;
  notes: string;
  createdBy: string;
  receivedBy?: string | null;
  receivedAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  lines: TransferLine[];
};

type CreateLine = Product & { qty: number };

interface StoreTransfersProps {
  activeStoreId: number | null;
}

function fmt(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function storeLabel(store: Store) {
  return store.branch_name || store.store_name || `Store #${store.id}`;
}

function currentAdminName() {
  try {
    const raw = localStorage.getItem("admin");
    if (!raw) return "Admin User";
    const admin = JSON.parse(raw);
    return (
      admin?.full_name ||
      admin?.username ||
      admin?.email ||
      "Admin User"
    );
  } catch {
    return "Admin User";
  }
}

function statusBadge(status: TransferStatus) {
  const map: Record<
    TransferStatus,
    {
      variant:
        | "success"
        | "info"
        | "warning"
        | "danger"
        | "neutral";
      label: string;
    }
  > = {
    received: { variant: "success", label: "Received" },
    in_transit: { variant: "info", label: "In Transit" },
    partial: { variant: "warning", label: "Partial" },
    pending: { variant: "neutral", label: "Pending" },
    cancelled: { variant: "danger", label: "Cancelled" },
  };

  const item = map[status] || map.pending;
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

function totalQty(transfer: Transfer) {
  return transfer.lines.reduce((sum, line) => sum + line.qty, 0);
}

function totalReceived(transfer: Transfer) {
  return transfer.lines.reduce(
    (sum, line) => sum + line.received,
    0
  );
}

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Invalid API response from ${url}: ${text.slice(0, 300)}`
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || `Request failed with HTTP ${response.status}`
    );
  }

  return data;
}

// ============================================================================
// CREATE TRANSFER MODAL
// ============================================================================

function CreateTransferModal({
  activeStoreId,
  stores,
  products,
  onClose,
  onCreated,
}: {
  activeStoreId: number;
  stores: Store[];
  products: Product[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [toStoreId, setToStoreId] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<CreateLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((product) => {
      if (product.store_id !== activeStoreId) return false;
      if (product.stock <= 0) return false;
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q)
      );
    });
  }, [products, activeStoreId, search]);

  const addProduct = (product: Product) => {
    if (lines.some((line) => line.id === product.id)) {
      return;
    }

    setLines((current) => [
      ...current,
      {
        ...product,
        qty: 1,
      },
    ]);
    setSearch("");
    setError("");
  };

  const updateQty = (productId: number, qty: number) => {
    setLines((current) =>
      current.map((line) =>
        line.id === productId
          ? {
              ...line,
              qty: Math.min(
                Math.max(1, Number.isFinite(qty) ? qty : 1),
                line.stock
              ),
            }
          : line
      )
    );
  };

  const removeLine = (productId: number) => {
    setLines((current) =>
      current.filter((line) => line.id !== productId)
    );
  };

  const handleSubmit = async () => {
    setError("");

    if (!toStoreId) {
      setError("Please select a destination store.");
      return;
    }

    if (lines.length === 0) {
      setError("Add at least one product to transfer.");
      return;
    }

    const invalid = lines.find(
      (line) => line.qty <= 0 || line.qty > line.stock
    );

    if (invalid) {
      setError(
        `${invalid.name}: transfer quantity must be between 1 and ${fmt(
          invalid.stock
        )}.`
      );
      return;
    }

    try {
      setSaving(true);

      await fetchJson(`${API_BASE}/store_transfers/store_transfers_create.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          from_store_id: activeStoreId,
          to_store_id: Number(toStoreId),
          created_by: currentAdminName(),
          notes: notes.trim(),
          items: lines.map((line) => ({
            product_id: line.id,
            quantity: line.qty,
          })),
        }),
      });

      await onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create transfer."
      );
    } finally {
      setSaving(false);
    }
  };

  const sourceStore = stores.find(
    (store) => store.id === activeStoreId
  );

  return (
    <Modal title="Create Store Transfer" onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium text-[#374151] block mb-1.5">
              From Store
            </label>
            <div className="h-9 px-3 flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[12px] font-medium text-[#0F172A]">
              {sourceStore ? storeLabel(sourceStore) : "Current Store"}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#374151] block mb-1.5">
              To Store <span className="text-red-500">*</span>
            </label>
            <select
              value={toStoreId}
              onChange={(e) => {
                setToStoreId(e.target.value);
                setError("");
              }}
              disabled={saving}
              className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="">Select destination...</option>
              {stores
                .filter((store) => store.id !== activeStoreId)
                .map((store) => (
                  <option key={store.id} value={store.id}>
                    {storeLabel(store)}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {toStoreId && (
          <div className="flex items-center justify-center gap-3 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] px-4 py-3">
            <span className="text-[12px] font-semibold text-[#4338CA]">
              {sourceStore ? storeLabel(sourceStore) : "Current Store"}
            </span>
            <span className="text-[#6366F1]">→</span>
            <span className="text-[12px] font-semibold text-[#4338CA]">
              {storeLabel(
                stores.find((store) => store.id === Number(toStoreId))!
              )}
            </span>
          </div>
        )}

        <div>
          <label className="text-[12px] font-medium text-[#374151] block mb-1.5">
            Add Products
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={saving}
            placeholder="Search product by name or SKU..."
            className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
          />

          {search.trim() && (
            <div className="mt-2 max-h-40 overflow-y-auto border border-[#E2E8F0] rounded-xl">
              {availableProducts.length === 0 ? (
                <p className="p-4 text-[11px] text-center text-[#94A3B8]">
                  No available products found.
                </p>
              ) : (
                availableProducts.map((product) => {
                  const alreadyAdded = lines.some(
                    (line) => line.id === product.id
                  );

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={saving || alreadyAdded}
                      onClick={() => addProduct(product)}
                      className="w-full px-3 py-2.5 border-b border-[#F1F5F9] last:border-0 flex items-center justify-between text-left hover:bg-[#F8FAFC] disabled:opacity-40"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#0F172A] truncate">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-[#94A3B8] font-mono">
                          {product.sku}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 shrink-0">
                        {fmt(product.stock)} in stock
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-medium text-[#374151]">
                Transfer Lines
              </label>
              <span className="text-[10px] text-[#94A3B8]">
                {lines.length} SKU{lines.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-[#94A3B8]">
                      Product
                    </th>
                    <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-[#94A3B8]">
                      Stock
                    </th>
                    <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-[#94A3B8]">
                      Qty
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-t border-[#F1F5F9]">
                      <td className="px-3 py-2.5">
                        <p className="text-[11px] font-medium text-[#0F172A] truncate max-w-[190px]">
                          {line.name}
                        </p>
                        <p className="text-[9px] text-[#94A3B8] font-mono">
                          {line.sku}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-emerald-600">
                        {fmt(line.stock)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              updateQty(line.id, line.qty - 1)
                            }
                            className="w-6 h-6 rounded-md bg-[#F1F5F9] text-[#475569]"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={line.stock}
                            value={line.qty}
                            disabled={saving}
                            onChange={(e) =>
                              updateQty(line.id, Number(e.target.value))
                            }
                            className="w-12 h-6 text-center text-[11px] font-semibold rounded-md border border-[#E2E8F0]"
                          />
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              updateQty(line.id, line.qty + 1)
                            }
                            className="w-6 h-6 rounded-md bg-[#F1F5F9] text-[#475569]"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => removeLine(line.id)}
                          className="text-[11px] text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-[10px] text-[#64748B]">
                      Total transfer quantity
                    </td>
                    <td colSpan={2} className="px-3 py-2 text-right text-[12px] font-bold text-[#4F46E5]">
                      {fmt(lines.reduce((sum, line) => sum + line.qty, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div>
          <label className="text-[12px] font-medium text-[#374151] block mb-1.5">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
            rows={3}
            placeholder="Reason, instructions, or transfer notes..."
            className="w-full px-3 py-2.5 text-[12px] rounded-lg border border-[#E2E8F0] resize-none focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Transfer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// RECEIVE MODAL
// ============================================================================

function ReceiveModal({
  transfer,
  onClose,
  onReceived,
}: {
  transfer: Transfer;
  onClose: () => void;
  onReceived: () => Promise<void>;
}) {
  const [received, setReceived] = useState<Record<number, number>>(
    Object.fromEntries(
      transfer.lines.map((line) => [
        line.id,
        Math.max(0, line.qty - line.received),
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const remaining = (line: TransferLine) =>
    Math.max(0, line.qty - line.received);

  const totalToReceive = transfer.lines.reduce(
    (sum, line) =>
      sum + Math.min(remaining(line), Number(received[line.id] || 0)),
    0
  );

  const submit = async () => {
    setError("");

    if (totalToReceive <= 0) {
      setError("Enter at least one quantity to receive.");
      return;
    }

    for (const line of transfer.lines) {
      const qty = Number(received[line.id] || 0);
      if (qty < 0 || qty > remaining(line)) {
        setError(
          `${line.name}: receive quantity cannot exceed ${fmt(
            remaining(line)
          )}.`
        );
        return;
      }
    }

    try {
      setSaving(true);

      await fetchJson(`${API_BASE}/store_transfers/store_transfers_receive.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          transfer_id: transfer.id,
          store_id: transfer.toStoreId,
          user: currentAdminName(),
          items: transfer.lines.map((line) => ({
            item_id: line.id,
            quantity: Number(received[line.id] || 0),
          })),
        }),
      });

      await onReceived();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to receive transfer."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Receive ${transfer.transferNo}`} onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3">
          <p className="text-[10px] text-[#94A3B8]">Route</p>
          <p className="text-[12px] font-semibold text-[#0F172A] mt-0.5">
            {transfer.fromStore} <span className="text-[#6366F1]">→</span>{" "}
            {transfer.toStore}
          </p>
        </div>

        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="px-3 py-2 text-left text-[9px] uppercase text-[#94A3B8]">
                  Product
                </th>
                <th className="px-3 py-2 text-right text-[9px] uppercase text-[#94A3B8]">
                  Sent
                </th>
                <th className="px-3 py-2 text-right text-[9px] uppercase text-[#94A3B8]">
                  Received
                </th>
                <th className="px-3 py-2 text-right text-[9px] uppercase text-[#94A3B8]">
                  Receive Now
                </th>
              </tr>
            </thead>
            <tbody>
              {transfer.lines.map((line) => {
                const left = remaining(line);
                return (
                  <tr key={line.id} className="border-t border-[#F1F5F9]">
                    <td className="px-3 py-2.5">
                      <p className="text-[11px] font-medium text-[#0F172A]">
                        {line.name}
                      </p>
                      <p className="text-[9px] text-[#94A3B8] font-mono">
                        {line.sku}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] font-semibold">
                      {fmt(line.qty)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] text-emerald-600 font-semibold">
                      {fmt(line.received)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#475569]">
                      ₱{Number(line.unitCost || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={left}
                        value={received[line.id] ?? 0}
                        disabled={saving || left <= 0}
                        onChange={(e) =>
                          setReceived((current) => ({
                            ...current,
                            [line.id]: Math.min(
                              Math.max(0, Number(e.target.value) || 0),
                              left
                            ),
                          }))
                        }
                        className="w-20 ml-auto h-7 block text-center text-[11px] font-semibold rounded-md border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
                      />
                      {left > 0 && (
                        <p className="text-[9px] text-[#94A3B8] text-right mt-1">
                          {fmt(left)} left
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 text-[11px] font-semibold text-[#64748B]">
                  Receive now
                </td>
                <td className="px-3 py-2.5 text-right text-[13px] font-bold text-[#4F46E5]">
                  {fmt(totalToReceive)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? "Receiving..." : "Confirm Receipt"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// DETAILS MODAL
// ============================================================================

function DetailModal({
  transfer,
  activeStoreId,
  onClose,
  onRefresh,
}: {
  transfer: Transfer;
  activeStoreId: number;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState("");

  const isSource = transfer.fromStoreId === activeStoreId;
  const isDestination = transfer.toStoreId === activeStoreId;
  const canSend = isSource && transfer.status === "pending";
  const canReceive =
    isDestination &&
    (transfer.status === "in_transit" || transfer.status === "partial");
  const canCancel = isSource && transfer.status === "pending";

  const sendTransfer = async () => {
    if (!canSend) return;
    setError("");

    try {
      setLoading(true);
      await fetchJson(`${API_BASE}/store_transfers/store_transfers_dispatch.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          transfer_id: transfer.id,
          store_id: activeStoreId,
          user: currentAdminName(),
        }),
      });

      await onRefresh();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send transfer."
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelTransfer = async () => {
    if (!canCancel) return;
    if (!cancelReason.trim()) {
      setError("Cancellation reason is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await fetchJson(`${API_BASE}/store_transfers/store_transfers_cancel.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          transfer_id: transfer.id,
          store_id: activeStoreId,
          reason: cancelReason.trim(),
        }),
      });

      await onRefresh();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel transfer."
      );
    } finally {
      setLoading(false);
    }
  };

  if (showReceive) {
    return (
      <ReceiveModal
        transfer={transfer}
        onClose={() => setShowReceive(false)}
        onReceived={onRefresh}
      />
    );
  }

  return (
    <Modal title={transfer.transferNo} onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] px-4 py-3">
          <div>
            <p className="text-[10px] text-[#94A3B8]">Transfer status</p>
            <div className="mt-1">{statusBadge(transfer.status)}</div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#94A3B8]">Total units</p>
            <p className="text-[15px] font-bold text-[#0F172A]">
              {fmt(totalQty(transfer))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#EEF2FF] rounded-xl px-4 py-3">
          <div className="flex-1 text-center min-w-0">
            <p className="text-[9px] uppercase tracking-wider font-semibold text-[#6366F1]">
              From
            </p>
            <p className="text-[12px] font-bold text-[#4338CA] truncate">
              {transfer.fromStore}
            </p>
          </div>
          <span className="text-[#6366F1] text-lg">→</span>
          <div className="flex-1 text-center min-w-0">
            <p className="text-[9px] uppercase tracking-wider font-semibold text-[#6366F1]">
              To
            </p>
            <p className="text-[12px] font-bold text-[#4338CA] truncate">
              {transfer.toStore}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#F8FAFC] px-3 py-3">
            <p className="text-[9px] text-[#94A3B8]">Created</p>
            <p className="text-[11px] font-medium text-[#334155] mt-1">
              {transfer.createdAt}
            </p>
            <p className="text-[10px] text-[#64748B] mt-0.5">
              by {transfer.createdBy}
            </p>
          </div>
          <div className="rounded-xl bg-[#F8FAFC] px-3 py-3">
            <p className="text-[9px] text-[#94A3B8]">Received</p>
            <p className="text-[11px] font-medium text-[#334155] mt-1">
              {transfer.receivedAt || "Not received"}
            </p>
            {transfer.receivedBy && (
              <p className="text-[10px] text-[#64748B] mt-0.5">
                by {transfer.receivedBy}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-[12px] font-semibold text-[#374151] mb-2">
            Transfer Items
          </p>
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="px-3 py-2 text-left text-[9px] uppercase text-[#94A3B8]">
                    Product
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] uppercase text-[#94A3B8]">
                    Sent
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] uppercase text-[#94A3B8]">
                    Received
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] uppercase text-[#94A3B8]">
                    Unit Cost
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] uppercase text-[#94A3B8]">
                    Remaining
                  </th>
                </tr>
              </thead>
              <tbody>
                {transfer.lines.map((line) => (
                  <tr key={line.id} className="border-t border-[#F1F5F9]">
                    <td className="px-3 py-2.5">
                      <p className="text-[11px] font-medium text-[#0F172A]">
                        {line.name}
                      </p>
                      <p className="text-[9px] text-[#94A3B8] font-mono">
                        {line.sku}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] font-semibold">
                      {fmt(line.qty)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-emerald-600">
                      {fmt(line.received)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#475569]">
                      ₱{Number(line.unitCost || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-amber-600">
                      {fmt(Math.max(0, line.qty - line.received))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {transfer.notes && (
          <div className="rounded-xl border border-[#E2E8F0] px-3 py-3">
            <p className="text-[9px] uppercase tracking-wider text-[#94A3B8]">
              Notes
            </p>
            <p className="text-[11px] text-[#475569] mt-1 whitespace-pre-wrap">
              {transfer.notes}
            </p>
          </div>
        )}

        {transfer.cancelReason && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3">
            <p className="text-[9px] uppercase tracking-wider text-red-400">
              Cancellation reason
            </p>
            <p className="text-[11px] text-red-700 mt-1">
              {transfer.cancelReason}
            </p>
          </div>
        )}

        {showCancel && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="text-[12px] font-semibold text-red-700">
              Cancel Transfer
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              disabled={loading}
              rows={2}
              placeholder="Reason for cancellation..."
              className="w-full px-3 py-2 text-[11px] rounded-lg border border-red-200 resize-none bg-white"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCancel(false)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={cancelTransfer}
                disabled={loading}
              >
                {loading ? "Cancelling..." : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        )}

        {!showCancel && (
          <div className="flex items-center justify-end gap-2 pt-1">
            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowCancel(true)}
                disabled={loading}
              >
                Cancel Transfer
              </Button>
            )}

            {canSend && (
              <Button
                variant="primary"
                size="sm"
                onClick={sendTransfer}
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Transfer"}
              </Button>
            )}

            {canReceive && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowReceive(true)}
                disabled={loading}
              >
                Receive Stock
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function StoreTransfers({
  activeStoreId,
}: StoreTransfersProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<Transfer | null>(null);

  const PER_PAGE = 8;

  const loadStores = async () => {
    const data = await fetchJson(`${API_BASE}/stores/list.php`);
    const nextStores: Store[] = Array.isArray(data.stores)
      ? data.stores.map((store: any) => ({
          id: Number(store.id),
          store_name: store.store_name || "",
          branch_name: store.branch_name || "",
          status: store.status,
        }))
      : [];

    setStores(nextStores);
  };

  const loadProducts = async () => {
    if (!activeStoreId) {
      setProducts([]);
      return;
    }

    setLoadingProducts(true);
    try {
      const data = await fetchJson(
        `${API_BASE}/products/list.php?store_id=${encodeURIComponent(
          activeStoreId
        )}`
      );

      const nextProducts: Product[] = Array.isArray(data.products)
        ? data.products
            .filter(
              (product: any) =>
                Number(product.store_id) === Number(activeStoreId) &&
                (!product.status || product.status === "active")
            )
            .map((product: any) => ({
              id: Number(product.id),
              name: product.name || "",
              sku: product.sku || "",
              stock: Number(product.stock || 0),
              store_id: Number(product.store_id),
            }))
        : [];

      setProducts(nextProducts);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadTransfers = async () => {
    if (!activeStoreId) {
      setTransfers([]);
      return;
    }

    const data = await fetchJson(
      `${API_BASE}/store_transfers/store_transfers_list.php?store_id=${encodeURIComponent(
        activeStoreId
      )}`
    );

    const nextTransfers: Transfer[] = Array.isArray(data.transfers)
      ? data.transfers.map((transfer: any) => ({
          id: Number(transfer.id),
          transferNo: transfer.transferNo || transfer.transfer_no || "",
          fromStoreId: Number(transfer.fromStoreId ?? transfer.from_store_id),
          fromStore: transfer.fromStore || "",
          toStoreId: Number(transfer.toStoreId ?? transfer.to_store_id),
          toStore: transfer.toStore || "",
          status: transfer.status as TransferStatus,
          notes: transfer.notes || "",
          createdBy: transfer.createdBy || transfer.created_by || "",
          receivedBy: transfer.receivedBy ?? transfer.received_by ?? null,
          receivedAt: transfer.receivedAt ?? transfer.received_at ?? null,
          cancelReason: transfer.cancelReason ?? transfer.cancel_reason ?? null,
          createdAt: transfer.createdAt || transfer.created_at || "",
          updatedAt: transfer.updatedAt || transfer.updated_at || "",
          lines: Array.isArray(transfer.lines)
            ? transfer.lines.map((line: any) => ({
                id: Number(line.id),
                productId: Number(line.source_product_id ?? line.productId ?? 0),
                name: line.name || line.product_name || "",
                sku: line.sku || "",
                qty: Number(line.qty ?? line.quantity ?? 0),
                received: Number(line.received ?? line.received_quantity ?? 0),
                unitCost: Number(line.unitCost ?? line.unit_cost ?? 0),
              }))
            : [],
        }))
      : [];

    setTransfers(nextTransfers);
  };

  const refreshAll = async () => {
    setError("");

    try {
      setLoading(true);
      await Promise.all([
        loadStores(),
        loadProducts(),
        loadTransfers(),
      ]);
    } catch (err) {
      console.error("Store transfer load error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load store transfer data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setDetail(null);
    refreshAll();
  }, [activeStoreId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transfers.filter((transfer) => {
      const matchesSearch =
        !q ||
        transfer.transferNo.toLowerCase().includes(q) ||
        transfer.fromStore.toLowerCase().includes(q) ||
        transfer.toStore.toLowerCase().includes(q) ||
        transfer.lines.some(
          (line) =>
            line.name.toLowerCase().includes(q) ||
            line.sku.toLowerCase().includes(q)
        );

      const matchesStatus =
        !statusFilter || transfer.status === statusFilter;

      const matchesStore =
        !storeFilter ||
        String(transfer.fromStoreId) === storeFilter ||
        String(transfer.toStoreId) === storeFilter;

      return matchesSearch && matchesStatus && matchesStore;
    });
  }, [transfers, search, statusFilter, storeFilter]);

  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  const incomingPending = transfers.filter(
    (transfer) =>
      transfer.toStoreId === activeStoreId &&
      (transfer.status === "in_transit" ||
        transfer.status === "partial")
  ).length;

  const outgoingPending = transfers.filter(
    (transfer) =>
      transfer.fromStoreId === activeStoreId &&
      (transfer.status === "pending" ||
        transfer.status === "in_transit")
  ).length;

  const receivedCount = transfers.filter(
    (transfer) =>
      transfer.toStoreId === activeStoreId &&
      transfer.status === "received"
  ).length;

  const unitsInScope = transfers.reduce((sum, transfer) => {
    if (transfer.status === "cancelled") return sum;
    return sum + totalQty(transfer);
  }, 0);

  if (!activeStoreId) {
    return (
      <div className="p-6">
        <Card className="p-10">
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#0F172A]">
              No store selected
            </p>
            <p className="text-[12px] text-[#64748B] mt-1">
              Select a store before managing store transfers.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1350px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Store Transfers
          </h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Real stock transfers between branches with receiving and audit trail.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreate(true)}
          disabled={loadingProducts || stores.length < 2}
          icon={
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          }
        >
          New Transfer
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Transfers",
            value: transfers.length,
          },
          {
            label: "To Receive",
            value: incomingPending,
          },
          {
            label: "Outgoing",
            value: outgoingPending,
          },
          {
            label: "Received",
            value: receivedCount,
          },
          {
            label: "Units",
            value: fmt(unitsInScope),
          },
        ].map((item) => (
          <Card key={item.label} className="px-5 py-4">
            <p className="text-[11px] text-[#64748B] mb-1">
              {item.label}
            </p>
            <p className="text-[20px] font-bold text-[#0F172A]">
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Transfer no, store, SKU, product..."
          />

          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            placeholder="All Status"
            options={[
              { value: "pending", label: "Pending" },
              { value: "in_transit", label: "In Transit" },
              { value: "partial", label: "Partial" },
              { value: "received", label: "Received" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />

          <Select
            value={storeFilter}
            onChange={(value) => {
              setStoreFilter(value);
              setPage(1);
            }}
            placeholder="All Stores"
            options={stores.map((store) => ({
              value: String(store.id),
              label: storeLabel(store),
            }))}
          />

          {(search || statusFilter || storeFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setStoreFilter("");
                setPage(1);
              }}
              className="text-[12px] text-[#64748B] underline"
            >
              Clear
            </button>
          )}

          <span className="ml-auto text-[11px] text-[#94A3B8]">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#0F172A]">
              Transfer Log
            </p>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">
              Source stock decreases when sent. Destination stock increases when received.
            </p>
          </div>
          <span className="text-[10px] text-[#94A3B8]">
            Store ID {activeStoreId}
          </span>
        </div>

        {loading ? (
          <div className="py-14 text-center">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-[#E2E8F0] border-t-[#4F46E5] animate-spin" />
            <p className="text-[11px] text-[#94A3B8] mt-2">
              Loading transfer records...
            </p>
          </div>
        ) : paged.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[13px] font-semibold text-[#0F172A]">
              No transfer records found
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Create a transfer to move inventory between stores.
            </p>
          </div>
        ) : (
          <Table
            headers={[
              "Transfer",
              "Date",
              "From",
              "To",
              "Products",
              "Units",
              "Status",
              "Action",
            ]}
          >
            {paged.map((transfer) => (
              <Tr
                key={transfer.id}
                onClick={() => setDetail(transfer)}
              >
                <Td mono>
                  <div>
                    <p className="text-[11px] font-semibold text-[#4F46E5]">
                      {transfer.transferNo}
                    </p>
                    <p className="text-[9px] text-[#94A3B8] mt-0.5">
                      {transfer.createdBy}
                    </p>
                  </div>
                </Td>

                <Td>
                  <span className="text-[11px] text-[#64748B]">
                    {transfer.createdAt}
                  </span>
                </Td>

                <Td>
                  <span className="text-[11px] font-medium text-[#475569]">
                    {transfer.fromStore}
                  </span>
                </Td>

                <Td>
                  <span className="text-[11px] font-semibold text-[#0F172A]">
                    {transfer.toStore}
                  </span>
                </Td>

                <Td>
                  <span className="text-[11px] text-[#64748B]">
                    {transfer.lines.length} SKU
                    {transfer.lines.length !== 1 ? "s" : ""}
                  </span>
                </Td>

                <Td>
                  <div>
                    <span className="text-[11px] font-bold text-[#0F172A]">
                      {fmt(totalQty(transfer))}
                    </span>
                    {transfer.status === "partial" && (
                      <p className="text-[9px] text-amber-600 mt-0.5">
                        {fmt(totalReceived(transfer))} received
                      </p>
                    )}
                  </div>
                </Td>

                <Td>{statusBadge(transfer.status)}</Td>

                <Td>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDetail(transfer);
                    }}
                    className="h-7 px-3 rounded-lg bg-[#EEF2FF] text-[#4F46E5] text-[11px] font-semibold hover:bg-[#E0E7FF]"
                  >
                    View
                  </button>
                </Td>
              </Tr>
            ))}
          </Table>
        )}

        <Pagination
          page={page}
          total={filtered.length}
          perPage={PER_PAGE}
          onChange={setPage}
        />
      </Card>

      {showCreate && (
        <CreateTransferModal
          activeStoreId={activeStoreId}
          stores={stores}
          products={products}
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            await Promise.all([loadTransfers(), loadProducts()]);
          }}
        />
      )}

      {detail && (
        <DetailModal
          transfer={detail}
          activeStoreId={activeStoreId}
          onClose={() => setDetail(null)}
          onRefresh={async () => {
            await Promise.all([loadTransfers(), loadProducts()]);
          }}
        />
      )}
    </div>
  );
}
