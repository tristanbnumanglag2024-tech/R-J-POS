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

interface Props {
  activeStoreId: number | null;
}

function fmt(v: number) {
  return Number(v || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function storeLabel(s: Store) {
  return s.branch_name || s.store_name || `Store #${s.id}`;
}

function currentAdminName() {
  try {
    const raw = localStorage.getItem("admin");
    if (!raw) return "Admin User";
    const a = JSON.parse(raw);
    return a?.full_name || a?.username || a?.email || "Admin User";
  } catch {
    return "Admin User";
  }
}

function statusLabel(status: TransferStatus) {
  const m: Record<TransferStatus, string> = {
    received: "Received",
    in_transit: "In Transit",
    partial: "Partial",
    pending: "Pending",
    cancelled: "Cancelled",
  };

  return m[status] || "Pending";
}

function statusBadge(status: TransferStatus) {
  const m: Record<
    TransferStatus,
    { variant: "success" | "info" | "warning" | "neutral" | "danger"; label: string }
  > = {
    received: { variant: "success", label: "Received" },
    in_transit: { variant: "info", label: "In Transit" },
    partial: { variant: "warning", label: "Partial" },
    pending: { variant: "neutral", label: "Pending" },
    cancelled: { variant: "danger", label: "Cancelled" },
  };

  const x = m[status] || m.pending;
  return <Badge variant={x.variant}>{x.label}</Badge>;
}

function totalQty(t: Transfer) {
  return t.lines.reduce((s, l) => s + l.qty, 0);
}

function totalReceived(t: Transfer) {
  return t.lines.reduce((s, l) => s + l.received, 0);
}

async function fetchJson(url: string, options?: RequestInit) {
  const r = await fetch(url, options);
  const text = await r.text();

  let d: any;

  try {
    d = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Invalid API response from ${url}: ${text.slice(0, 300)}`
    );
  }

  if (!r.ok || !d.success) {
    throw new Error(d.message || `Request failed with HTTP ${r.status}`);
  }

  return d;
}

/*
|--------------------------------------------------------------------------
| DR EXCEL EXPORT
|--------------------------------------------------------------------------
|
| The DR No. in the table downloads the actual Excel template.
| No PDF conversion is used here.
|--------------------------------------------------------------------------
*/
async function exportDeliveryReceipt(t: Transfer) {
  const endpoint =
    `${API_BASE}/store_transfers/store_transfers_export_excel.php` +
    `?transfer_id=${encodeURIComponent(String(t.id))}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,*/*",
      },
    });

    if (!response.ok) {
      let message = `Unable to export Delivery Receipt (${response.status}).`;

      try {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const data = await response.json();
          if (data?.message) message = String(data.message);
        } else {
          const text = await response.text();
          if (text) message = text.slice(0, 500);
        }
      } catch {
        // Keep default message.
      }

      throw new Error(message);
    }

    const blob = await response.blob();
    const contentType = response.headers.get("content-type") || "";

    const extension = contentType.includes("zip") ? "zip" : "xlsx";

    const filename =
      `${pdfSafeFilename(t.transferNo || "Delivery-Receipt")}.${extension}`;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 15000);
  } catch (error) {
    console.error("Delivery Receipt Excel export error:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Unable to export Delivery Receipt Excel."
    );
  }
}

function pdfSafeFilename(value: unknown) {
  return String(value ?? "Delivery-Receipt")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "Delivery-Receipt";
}

/*
|--------------------------------------------------------------------------
| VIEW REPORT -> PDF
|--------------------------------------------------------------------------
|
| This is intentionally separate from the Excel DR export.
|
| The View modal has a "Download Copy (PDF)" button.
| The browser opens a print-ready Half Letter portrait report:
|
|   5.5 x 8.5 inches
|   portrait
|
| The user can select "Save as PDF" in the browser print dialog.
|
| We do NOT use the server's disabled exec()/shell_exec().
|--------------------------------------------------------------------------
*/
function exportViewReportPdf(t: Transfer) {
  /*
   * Print the report in the CURRENT TAB instead of opening a popup.
   *
   * This avoids browser popup blockers completely.
   * The browser Print dialog can then be used with:
   *   Destination -> Save as PDF
   *   Paper size -> Half Letter
   *   Orientation -> Portrait
   */

  const existing = document.getElementById(
    "rhea-delivery-receipt-print"
  );

  if (existing) {
    existing.remove();
  }

  const rows = t.lines
    .map(
      (line, index) => `
        <tr>
          <td class="center">${index + 1}</td>
          <td>
            <div class="product-name">${escapeHtml(
              line.name || ""
            )}</div>
            ${
              line.sku
                ? `<div class="sku">${escapeHtml(line.sku)}</div>`
                : ""
            }
          </td>
          <td class="number">${fmt(line.qty)}</td>
          <td class="number received">${fmt(line.received)}</td>
          <td class="number">${fmt(line.received - line.qty)}</td>
        </tr>
      `
    )
    .join("");

  let note = "";

  if (t.status === "received") {
    note =
      `Note: This transaction is already received` +
      (t.receivedAt
        ? ` on ${t.receivedAt}`
        : ".") +
      (t.receivedBy
        ? ` Received by ${t.receivedBy}.`
        : "");
  } else if (t.status === "cancelled") {
    note =
      "Note: This transaction is cancelled." +
      (t.cancelReason
        ? ` Reason: ${t.cancelReason}`
        : "");
  } else {
    note =
      "Note: This transaction is not yet received. Status: " +
      (t.status === "partial"
        ? "Partial"
        : "In Transit") +
      ".";
  }

  const report = document.createElement("div");
  report.id = "rhea-delivery-receipt-print";

  report.innerHTML = `
    <style>
      @page {
        size: 5.5in 8.5in;
        margin: 0.25in 0.28in 0.25in 0.28in;
      }

      #rhea-delivery-receipt-print {
        display: none;
      }

      @media print {
        html,
        body {
          width: 5.5in !important;
          min-width: 5.5in !important;
          max-width: 5.5in !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }

        body > * {
          display: none !important;
        }

        body > #rhea-delivery-receipt-print {
          display: block !important;
          width: 4.94in !important;
          margin: 0 auto !important;
          padding: 0 !important;
          color: #111827 !important;
          background: #fff !important;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 8px !important;
        }

        #rhea-delivery-receipt-print * {
          box-sizing: border-box !important;
        }

        #rhea-delivery-receipt-print .title {
          text-align: center;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.4px;
          margin: 0 0 10px;
        }

        #rhea-delivery-receipt-print .top-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 5px;
        }

        #rhea-delivery-receipt-print .label {
          font-size: 6.5px;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        #rhea-delivery-receipt-print .value {
          font-size: 8px;
          font-weight: 700;
        }

        #rhea-delivery-receipt-print .date-row {
          border-bottom: 1px solid #111827;
          padding-bottom: 5px;
          margin-bottom: 9px;
        }

        #rhea-delivery-receipt-print .status {
          display: inline-block;
          padding: 2px 6px;
          border: 1px solid #111827;
          border-radius: 999px;
          font-size: 6.5px;
          font-weight: 700;
        }

        #rhea-delivery-receipt-print table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        #rhea-delivery-receipt-print th,
        #rhea-delivery-receipt-print td {
          border: 1px solid #111827;
          padding: 4px 3px;
          vertical-align: middle;
        }

        #rhea-delivery-receipt-print th {
          font-size: 6.5px;
          text-transform: uppercase;
          font-weight: 800;
          text-align: left;
        }

        #rhea-delivery-receipt-print td {
          font-size: 7.5px;
        }

        #rhea-delivery-receipt-print th:nth-child(1),
        #rhea-delivery-receipt-print td:nth-child(1) {
          width: 7%;
        }

        #rhea-delivery-receipt-print th:nth-child(2),
        #rhea-delivery-receipt-print td:nth-child(2) {
          width: 49%;
        }

        #rhea-delivery-receipt-print th:nth-child(3),
        #rhea-delivery-receipt-print td:nth-child(3) {
          width: 14%;
        }

        #rhea-delivery-receipt-print th:nth-child(4),
        #rhea-delivery-receipt-print td:nth-child(4) {
          width: 15%;
        }

        #rhea-delivery-receipt-print th:nth-child(5),
        #rhea-delivery-receipt-print td:nth-child(5) {
          width: 15%;
        }

        #rhea-delivery-receipt-print .center {
          text-align: center;
        }

        #rhea-delivery-receipt-print .number {
          text-align: right;
        }

        #rhea-delivery-receipt-print .received {
          font-weight: 800;
        }

        #rhea-delivery-receipt-print .product-name {
          font-weight: 700;
          line-height: 1.1;
        }

        #rhea-delivery-receipt-print .sku {
          font-size: 6px;
          color: #64748b;
          margin-top: 1px;
        }

        #rhea-delivery-receipt-print .nothing {
          text-align: center;
          font-size: 7px;
          font-weight: 800;
          padding: 6px 0 8px;
        }

        #rhea-delivery-receipt-print .notes-title {
          font-size: 7.5px;
          font-weight: 800;
          margin-bottom: 3px;
        }

        #rhea-delivery-receipt-print .notes-box {
          border: 1px solid #111827;
          min-height: 48px;
          padding: 5px;
          font-size: 7.5px;
          white-space: pre-wrap;
          margin-bottom: 10px;
        }

        #rhea-delivery-receipt-print .report-note {
          border: 1px solid #64748b;
          padding: 5px 6px;
          margin-bottom: 10px;
          font-size: 7px;
          line-height: 1.3;
        }

        #rhea-delivery-receipt-print .signature {
          margin-top: 8px;
        }

        #rhea-delivery-receipt-print .signature-line {
          border-bottom: 1px solid #111827;
          height: 16px;
        }

        #rhea-delivery-receipt-print .signature-label {
          font-size: 6.5px;
          margin-top: 2px;
        }

        #rhea-delivery-receipt-print .signature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-top: 13px;
        }

        #rhea-delivery-receipt-print .meta {
          margin-top: 9px;
          font-size: 6px;
          color: #475569;
        }
      }
    </style>

    <div class="title">DELIVERY RECEIPT</div>

    <div class="top-grid">
      <div>
        <div class="label">DR No.</div>
        <div class="value">${escapeHtml(t.transferNo)}</div>
      </div>

      <div>
        <div class="label">Transaction Status</div>
        <div class="status">${escapeHtml(
          statusLabel(t.status)
        )}</div>
      </div>
    </div>

    <div class="top-grid">
      <div>
        <div class="label">From Branch</div>
        <div class="value">${escapeHtml(
          t.fromStore
        )}</div>
      </div>

      <div>
        <div class="label">To Branch</div>
        <div class="value">${escapeHtml(
          t.toStore
        )}</div>
      </div>
    </div>

    <div class="top-grid date-row">
      <div>
        <div class="label">Date Created</div>
        <div class="value">${escapeHtml(
          t.createdAt || ""
        )}</div>
      </div>

      <div>
        <div class="label">Received Date</div>
        <div class="value">${escapeHtml(
          t.receivedAt || "Not received"
        )}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>No.</th>
          <th>Item Description</th>
          <th>Expected</th>
          <th>Received</th>
          <th>Difference</th>
        </tr>
      </thead>

      <tbody>
        ${
          rows ||
          `<tr>
            <td colspan="5" class="center">No items</td>
          </tr>`
        }
      </tbody>
    </table>

    <div class="nothing">- NOTHING FOLLOWS -</div>

    <div class="notes-title">Notes:</div>

    <div class="notes-box">${escapeHtml(
      t.notes || ""
    )}</div>

    <div class="report-note">
      ${escapeHtml(note)}
    </div>

    <div class="signature">
      <div class="signature-line"></div>
      <div class="signature-label">
        Prepared/Checked by: ${escapeHtml(
          t.createdBy || ""
        )}
      </div>
    </div>

    <div class="signature-grid">
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">
          Received by: ${escapeHtml(
            t.receivedBy || ""
          )}
        </div>
      </div>

      <div>
        <div class="signature-line"></div>
        <div class="signature-label">
          Date: ${escapeHtml(
            t.receivedAt || ""
          )}
        </div>
      </div>
    </div>

    <div class="meta">
      Delivery Receipt Report
    </div>
  `;

  document.body.appendChild(report);

  const oldTitle = document.title;
  document.title = pdfSafeFilename(
    `${t.transferNo || "Delivery-Receipt"}-Report`
  );

  const cleanup = () => {
    report.remove();
    document.title = oldTitle;
    window.removeEventListener(
      "afterprint",
      cleanup
    );
  };

  window.addEventListener("afterprint", cleanup);

  /*
   * This is called directly by the View modal button,
   * so window.print() is not affected by popup blockers.
   */
  window.print();

  /*
   * Fallback for browsers that do not fire afterprint.
   */
  window.setTimeout(() => {
    if (document.body.contains(report)) {
      cleanup();
    }
  }, 60000);
}

function escapeHtml(v: string) {
  return String(v).replace(/[&<>\"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  }[c] || c));
}

function GenerateReceiptModal({
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
  const [fromStoreId, setFromStoreId] = useState(String(activeStoreId));
  const [toStoreId, setToStoreId] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<CreateLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sourceProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter(
      (p) =>
        p.store_id === Number(fromStoreId) &&
        p.stock > 0 &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q))
    );
  }, [products, fromStoreId, search]);

  const add = (p: Product) => {
    if (lines.some((l) => l.id === p.id)) return;

    setLines((x) => [...x, { ...p, qty: 1 }]);
    setSearch("");
  };

  const qty = (id: number, n: number) =>
    setLines((x) =>
      x.map((l) =>
        l.id === id
          ? {
              ...l,
              qty: Math.min(
                Math.max(1, n || 1),
                l.stock
              ),
            }
          : l
      )
    );

  const submit = async () => {
    setError("");

    if (!fromStoreId || !toStoreId) {
      setError("Select both From and To branches.");
      return;
    }

    if (Number(fromStoreId) === Number(toStoreId)) {
      setError("From and To branches must be different.");
      return;
    }

    if (!lines.length) {
      setError("Add at least one product.");
      return;
    }

    const bad = lines.find(
      (l) => l.qty <= 0 || l.qty > l.stock
    );

    if (bad) {
      setError(
        `${bad.name}: quantity must be between 1 and ${fmt(
          bad.stock
        )}.`
      );
      return;
    }

    try {
      setSaving(true);

      const created = await fetchJson(
  `${API_BASE}/store_transfers/store_transfers_create.php`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from_store_id: Number(fromStoreId),
      to_store_id: Number(toStoreId),
      created_by: currentAdminName(),
      notes: notes.trim(),
      items: lines.map((l) => ({
        product_id: l.id,
        quantity: l.qty,
      })),
    }),
  }
);

const transferId = Number(
  created?.transfer_id ??
  created?.transfer?.id ??
  created?.id ??
  0
);

if (transferId <= 0) {
  throw new Error(
    "Delivery Receipt was created, but the transfer ID was not returned. Auto-dispatch could not be completed."
  );
}

/*
 * AUTO DISPATCH
 *
 * Generate Receipt immediately dispatches the transfer.
 * Source = FROM branch.
 *
 * dispatch.php:
 * - deducts FROM stock
 * - creates transfer_out inventory movement
 * - changes status pending -> in_transit
 */
await fetchJson(
  `${API_BASE}/store_transfers/store_transfers_dispatch.php`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      transfer_id: transferId,
      store_id: Number(fromStoreId),
      user: currentAdminName(),
    }),
  }
);

await onCreated();
onClose();

    
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to generate receipt."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Generate Delivery Receipt" onClose={onClose}>
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium block mb-1.5">
              From Branch *
            </label>

            <select
              value={fromStoreId}
              onChange={(e) => {
                setFromStoreId(e.target.value);
                setLines([]);
              }}
              disabled={saving}
              className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {storeLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] font-medium block mb-1.5">
              To Branch *
            </label>

            <select
              value={toStoreId}
              onChange={(e) => setToStoreId(e.target.value)}
              disabled={saving}
              className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
            >
              <option value="">Select destination...</option>

              {stores
                .filter(
                  (s) => s.id !== Number(fromStoreId)
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {storeLabel(s)}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[12px] font-medium block mb-1.5">
            Add Product
          </label>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product by name or SKU..."
            className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0]"
          />

          {search.trim() && (
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-xl">
              {sourceProducts.length ? (
                sourceProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => add(p)}
                    disabled={lines.some(
                      (l) => l.id === p.id
                    )}
                    className="w-full px-3 py-2.5 border-b last:border-0 flex justify-between text-left hover:bg-slate-50 disabled:opacity-40"
                  >
                    <span>
                      <b className="text-[12px]">
                        {p.name}
                      </b>
                      <br />
                      <small>{p.sku}</small>
                    </span>

                    <span className="text-[11px] text-emerald-600">
                      {fmt(p.stock)} in stock
                    </span>
                  </button>
                ))
              ) : (
                <p className="p-4 text-center text-[11px] text-slate-400">
                  No available products found.
                </p>
              )}
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left text-[9px]">
                    Product
                  </th>
                  <th className="p-2 text-right text-[9px]">
                    Stock
                  </th>
                  <th className="p-2 text-right text-[9px]">
                    Qty
                  </th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2 text-[11px]">
                      {l.name}
                      <br />
                      <small>{l.sku}</small>
                    </td>

                    <td className="p-2 text-right text-[11px]">
                      {fmt(l.stock)}
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        min={1}
                        max={l.stock}
                        value={l.qty}
                        onChange={(e) =>
                          qty(
                            l.id,
                            Number(e.target.value)
                          )
                        }
                        className="w-16 h-7 text-center text-[11px] border rounded-md ml-auto block"
                      />
                    </td>

                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLines((x) =>
                            x.filter(
                              (a) => a.id !== l.id
                            )
                          )
                        }
                        className="text-[11px] text-red-500"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <label className="text-[12px] font-medium block mb-1.5">
            Notes
          </label>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 text-[12px] rounded-lg border resize-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Generating..." : "Generate Receipt"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ReceiveByDRModal({
  onClose,
  onReceived,
}: {
  onClose: () => void;
  onReceived: () => Promise<void>;
}) {
  const [dr, setDr] = useState("");
  const [data, setData] = useState<any>(null);
  const [actual, setActual] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchDR = async () => {
    setError("");

    if (!dr.trim()) {
      setError("Enter a Delivery Receipt number.");
      return;
    }

    try {
      setLoading(true);

      const d = await fetchJson(
        `${API_BASE}/store_transfers/store_transfers_get.php?transfer_no=${encodeURIComponent(
          dr.trim()
        )}`
      );

      setData(d.transfer);

      const init: Record<number, number> = {};

      (d.transfer.lines || []).forEach((l: any) => {
        init[l.id] = Math.max(
          0,
          Number(l.qty) - Number(l.received || 0)
        );
      });

      setActual(init);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Delivery Receipt not found."
      );
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!data) return;

    setError("");

    if (
      data.status === "cancelled" ||
      data.status === "received"
    ) {
      setError(
        "This transaction is not available for receiving."
      );
      return;
    }

    try {
      setSaving(true);

      await fetchJson(
        `${API_BASE}/store_transfers/store_transfers_receive.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            transfer_id: data.id,
            store_id: data.toStoreId,
            user: currentAdminName(),
            items: data.lines.map((l: any) => ({
              item_id: l.id,
              quantity: Number(actual[l.id] || 0),
            })),
          }),
        }
      );

      await onReceived();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to receive delivery receipt."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Received Delivery Receipt" onClose={onClose}>
      <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={dr}
            onChange={(e) => setDr(e.target.value)}
            placeholder="Enter DR No."
            className="flex-1 h-9 px-3 text-[12px] rounded-lg border"
          />

          <Button
            variant="primary"
            onClick={fetchDR}
            disabled={loading}
          >
            {loading ? "Fetching..." : "Fetch"}
          </Button>
        </div>

        {data && (
          <>
            <div className="rounded-xl border bg-slate-50 p-3 text-[11px]">
              <b>{data.transferNo}</b>

              <div className="mt-1">
                {data.fromStore} → {data.toStore}
              </div>

              <div className="mt-1">
                Status: {statusBadge(data.status)}
              </div>
            </div>

            {data.status !== "cancelled" &&
              data.status !== "received" && (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-2 text-left text-[9px]">
                          Product
                        </th>
                        <th className="p-2 text-right text-[9px]">
                          Expected Received
                        </th>
                        <th className="p-2 text-right text-[9px]">
                          Actual Received
                        </th>
                        <th className="p-2 text-right text-[9px]">
                          Difference
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.lines.map((l: any) => (
                        <tr key={l.id} className="border-t">
                          <td className="p-2 text-[11px]">
                            {l.name}
                            <br />
                            <small>{l.sku}</small>
                          </td>

                          <td className="p-2 text-right text-[11px]">
                            {fmt(
                              Number(l.qty) -
                                Number(l.received || 0)
                            )}
                          </td>

                          <td className="p-2">
                            <input
                              type="number"
                              min={0}
                              max={
                                Number(l.qty) -
                                Number(l.received || 0)
                              }
                              value={actual[l.id] ?? 0}
                              onChange={(e) =>
                                setActual((x) => ({
                                  ...x,
                                  [l.id]: Math.min(
                                    Math.max(
                                      0,
                                      Number(e.target.value) ||
                                        0
                                    ),
                                    Number(l.qty) -
                                      Number(
                                        l.received || 0
                                      )
                                  ),
                                }))
                              }
                              className="w-20 h-7 text-center text-[11px] border rounded-md ml-auto block"
                            />
                          </td>

                          <td className="p-2 text-right text-[11px] font-semibold">
                            {fmt(
                              Number(actual[l.id] || 0) -
                                (Number(l.qty) -
                                  Number(l.received || 0))
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            <div className="flex justify-end gap-2">
              {data.status !== "cancelled" &&
                data.status !== "received" && (
                  <Button
                    variant="primary"
                    onClick={submit}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Confirm Received"}
                  </Button>
                )}

              <Button
                variant="secondary"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

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
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const canCancel =
    transfer.status !== "received" &&
    transfer.status !== "cancelled";

  const cancel = async () => {
    if (!reason.trim()) {
      setError("Cancellation reason is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await fetchJson(
        `${API_BASE}/store_transfers/store_transfers_cancel.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            transfer_id: transfer.id,
            store_id: activeStoreId,
            reason: reason.trim(),
          }),
        }
      );

      await onRefresh();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to cancel transaction."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`View ${transfer.transferNo}`}
      onClose={onClose}
    >
      <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border p-4">
          <div>
            <p className="text-[10px] text-slate-400">
              Transaction Status
            </p>

            <div className="mt-1">
              {statusBadge(transfer.status)}
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-400">
              DR No.
            </p>

            <p className="font-bold text-indigo-600">
              {transfer.transferNo}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] text-slate-400">
              From Branch
            </p>

            <p className="text-[11px] font-semibold mt-1">
              {transfer.fromStore}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] text-slate-400">
              To Branch
            </p>

            <p className="text-[11px] font-semibold mt-1">
              {transfer.toStore}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] text-slate-400">
              Date Created
            </p>

            <p className="text-[11px] mt-1">
              {transfer.createdAt}
            </p>
          </div>

          <div>
            <p className="text-[9px] text-slate-400">
              Received Date
            </p>

            <p className="text-[11px] mt-1">
              {transfer.receivedAt || "Not received"}
            </p>
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left text-[9px]">
                  Product
                </th>

                <th className="p-2 text-right text-[9px]">
                  Expected
                </th>

                <th className="p-2 text-right text-[9px]">
                  Received
                </th>

                <th className="p-2 text-right text-[9px]">
                  Difference
                </th>
              </tr>
            </thead>

            <tbody>
              {transfer.lines.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2 text-[11px]">
                    {l.name}
                    <br />
                    <small>{l.sku}</small>
                  </td>

                  <td className="p-2 text-right text-[11px]">
                    {fmt(l.qty)}
                  </td>

                  <td className="p-2 text-right text-[11px] font-semibold text-emerald-600">
                    {fmt(l.received)}
                  </td>

                  <td className="p-2 text-right text-[11px] font-semibold">
                    {fmt(l.received - l.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transfer.status === "received" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-700">
            Note: This transaction is already received
            {transfer.receivedAt
              ? ` on ${transfer.receivedAt}`
              : "."}
            {transfer.receivedBy
              ? ` Received by ${transfer.receivedBy}.`
              : ""}
          </div>
        ) : transfer.status === "cancelled" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
            <b>Note: This transaction is cancelled.</b>

            {transfer.cancelReason && (
              <div className="mt-1">
                Reason: {transfer.cancelReason}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-700">
            Note: This transaction is not yet received.
            Status:{" "}
            {transfer.status === "partial"
              ? "Partial"
              : "In Transit"}
            .
          </div>
        )}

        {transfer.notes && (
          <div className="rounded-xl border p-3">
            <p className="text-[9px] uppercase text-slate-400">
              Notes
            </p>

            <p className="text-[11px] mt-1 whitespace-pre-wrap">
              {transfer.notes}
            </p>
          </div>
        )}

        {showCancel && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[12px] font-semibold text-red-700">
              Cancel Transaction
            </p>

            <textarea
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
              rows={2}
              className="w-full mt-2 px-3 py-2 text-[11px] rounded-lg border resize-none"
              placeholder="Cancellation reason..."
            />

            <div className="flex justify-end gap-2 mt-2">
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
                onClick={cancel}
                disabled={loading}
              >
                {loading
                  ? "Cancelling..."
                  : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        )}

        {!showCancel && (
          <div className="flex justify-end gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => exportViewReportPdf(transfer)}
            >
              Download Copy (PDF)
            </Button>

            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowCancel(true)}
              >
                Cancel Transaction
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function StoreTransfers({
  activeStoreId,
}: Props) {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] =
    useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showGenerate, setShowGenerate] =
    useState(false);
  const [showReceived, setShowReceived] =
    useState(false);
  const [detail, setDetail] = useState<Transfer | null>(
    null
  );

  const PER_PAGE = 8;

  const loadStores = async () => {
    const d = await fetchJson(
      `${API_BASE}/stores/list.php`
    );

    setStores(
      Array.isArray(d.stores)
        ? d.stores.map((s: any) => ({
            id: Number(s.id),
            store_name: s.store_name || "",
            branch_name: s.branch_name || "",
            status: s.status,
          }))
        : []
    );
  };

  const loadProducts = async () => {
    if (!activeStoreId) {
      setProducts([]);
      return;
    }

    setLoadingProducts(true);

    try {
      const d = await fetchJson(
        `${API_BASE}/inventory/inventory.php?store_id=${activeStoreId}`
      );

      const raw = Array.isArray(d.items)
        ? d.items
        : Array.isArray(d.products)
          ? d.products
          : [];

      setProducts(
        raw
          .map((p: any) => ({
            id: Number(
              p.product_id ?? p.id ?? 0
            ),
            name:
              p.name ||
              p.product_name ||
              "",
            sku: p.sku || "",
            stock: Number(p.stock || 0),
            store_id: Number(
              p.store_id ?? activeStoreId
            ),
          }))
          .filter(
            (p: Product) =>
              p.id > 0 &&
              p.store_id === Number(activeStoreId) &&
              p.stock > 0
          )
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadTransfers = async () => {
    if (!activeStoreId) {
      setTransfers([]);
      return;
    }

    const d = await fetchJson(
      `${API_BASE}/store_transfers/store_transfers_list.php?store_id=${activeStoreId}`
    );

    setTransfers(
      Array.isArray(d.transfers)
        ? d.transfers.map((t: any) => ({
            id: Number(t.id),
            transferNo:
              t.transferNo ||
              t.transfer_no ||
              "",
            fromStoreId: Number(
              t.fromStoreId ??
                t.from_store_id
            ),
            fromStore: t.fromStore || "",
            toStoreId: Number(
              t.toStoreId ??
                t.to_store_id
            ),
            toStore: t.toStore || "",
            status:
              t.status as TransferStatus,
            notes: t.notes || "",
            createdBy:
              t.createdBy ||
              t.created_by ||
              "",
            receivedBy:
              t.receivedBy ??
              t.received_by ??
              null,
            receivedAt:
              t.receivedAt ??
              t.received_at ??
              null,
            cancelReason:
              t.cancelReason ??
              t.cancel_reason ??
              null,
            createdAt:
              t.createdAt ||
              t.created_at ||
              "",
            updatedAt:
              t.updatedAt ||
              t.updated_at ||
              "",
            lines: Array.isArray(t.lines)
              ? t.lines.map((l: any) => ({
                  id: Number(l.id),
                  productId: Number(
                    l.source_product_id ??
                      l.productId ??
                      0
                  ),
                  name:
                    l.name ||
                    l.product_name ||
                    "",
                  sku: l.sku || "",
                  qty: Number(
                    l.qty ??
                      l.quantity ??
                      0
                  ),
                  received: Number(
                    l.received ??
                      l.received_quantity ??
                      0
                  ),
                  unitCost: Number(
                    l.unitCost ??
                      l.unit_cost ??
                      0
                  ),
                }))
              : [],
          }))
        : []
    );
  };

  const refresh = async () => {
    setError("");

    try {
      setLoading(true);

      await Promise.all([
        loadStores(),
        loadProducts(),
        loadTransfers(),
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to load data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setDetail(null);
    refresh();
  }, [activeStoreId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transfers.filter(
      (t) =>
        (!q ||
          t.transferNo
            .toLowerCase()
            .includes(q) ||
          t.fromStore
            .toLowerCase()
            .includes(q) ||
          t.toStore
            .toLowerCase()
            .includes(q) ||
          t.lines.some(
            (l) =>
              l.name
                .toLowerCase()
                .includes(q) ||
              l.sku
                .toLowerCase()
                .includes(q)
          )) &&
        (!statusFilter ||
          t.status === statusFilter) &&
        (!storeFilter ||
          String(t.fromStoreId) ===
            storeFilter ||
          String(t.toStoreId) ===
            storeFilter)
    );
  }, [
    transfers,
    search,
    statusFilter,
    storeFilter,
  ]);

  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  const inTransit = transfers.filter(
    (t) =>
      t.status === "in_transit" ||
      t.status === "partial"
  ).length;

  const received = transfers.filter(
    (t) => t.status === "received"
  ).length;

  const units = transfers.reduce(
    (s, t) =>
      t.status === "cancelled"
        ? s
        : s + totalQty(t),
    0
  );

  if (!activeStoreId) {
    return (
      <div className="p-6">
        <Card className="p-10">
          <div className="text-center">
            <p className="font-semibold">
              No store selected
            </p>

            <p className="text-[12px] text-slate-500 mt-1">
              Select a store before managing delivery
              receipts.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1350px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Store Transfers
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            Delivery receipts between branches with
            receiving and audit trail.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowReceived(true)}
          >
            Received
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowGenerate(true)}
            disabled={
              loadingProducts ||
              stores.length < 2
            }
          >
            Generate Receipt
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Receipts",
            value: transfers.length,
          },
          {
            label: "In Transit",
            value: inTransit,
          },
          {
            label: "Received",
            value: received,
          },
          {
            label: "Units",
            value: fmt(units),
          },
        ].map((x) => (
          <Card
            key={x.label}
            className="px-5 py-4"
          >
            <p className="text-[11px] text-slate-500 mb-1">
              {x.label}
            </p>

            <p className="text-[20px] font-bold">
              {x.value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="DR no, store, SKU, product..."
          />

          <Select
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            placeholder="All Status"
            options={[
              {
                value: "in_transit",
                label: "In Transit",
              },
              {
                value: "partial",
                label: "Partial",
              },
              {
                value: "received",
                label: "Received",
              },
              {
                value: "cancelled",
                label: "Cancelled",
              },
              {
                value: "pending",
                label: "Pending",
              },
            ]}
          />

          <Select
            value={storeFilter}
            onChange={(v) => {
              setStoreFilter(v);
              setPage(1);
            }}
            placeholder="All Stores"
            options={stores.map((s) => ({
              value: String(s.id),
              label: storeLabel(s),
            }))}
          />

          {(search ||
            statusFilter ||
            storeFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setStoreFilter("");
                setPage(1);
              }}
              className="text-[12px] underline text-slate-500"
            >
              Clear
            </button>
          )}

          <span className="ml-auto text-[11px] text-slate-400">
            {filtered.length} record
            {filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3.5 border-b flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold">
              Delivery Receipt Log
            </p>

            <p className="text-[10px] text-slate-400 mt-0.5">
              Click the DR No. to download the Excel
              receipt. Use View for receiving details
              and the PDF copy.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-14 text-center">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />

            <p className="text-[11px] text-slate-400 mt-2">
              Loading records...
            </p>
          </div>
        ) : paged.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[13px] font-semibold">
              No delivery receipts found
            </p>
          </div>
        ) : (
          <Table
            headers={[
              "DR No.",
              "Date",
              "From",
              "To",
              "Products",
              "Units",
              "Status",
              "Action",
            ]}
          >
            {paged.map((t) => (
              <Tr
                key={t.id}
                onClick={() => setDetail(t)}
              >
                <Td mono>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void exportDeliveryReceipt(t);
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    {t.transferNo}
                  </button>

                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {t.createdBy}
                  </p>
                </Td>

                <Td>
                  <span className="text-[11px] text-slate-500">
                    {t.createdAt}
                  </span>
                </Td>

                <Td>
                  <span className="text-[11px] font-medium">
                    {t.fromStore}
                  </span>
                </Td>

                <Td>
                  <span className="text-[11px] font-semibold">
                    {t.toStore}
                  </span>
                </Td>

                <Td>
                  <span className="text-[11px]">
                    {t.lines.length} SKU
                    {t.lines.length !== 1
                      ? "s"
                      : ""}
                  </span>
                </Td>

                <Td>
                  <span className="text-[11px] font-bold">
                    {fmt(totalQty(t))}
                  </span>
                </Td>

                <Td>
                  {statusBadge(t.status)}
                </Td>

                <Td>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetail(t);
                    }}
                    className="h-7 px-3 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-semibold"
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

      {showGenerate && (
        <GenerateReceiptModal
          activeStoreId={activeStoreId}
          stores={stores}
          products={products}
          onClose={() => setShowGenerate(false)}
          onCreated={async () => {
            await Promise.all([
              loadTransfers(),
              loadProducts(),
            ]);
          }}
        />
      )}

      {showReceived && (
        <ReceiveByDRModal
          onClose={() => setShowReceived(false)}
          onReceived={async () => {
            await Promise.all([
              loadTransfers(),
              loadProducts(),
            ]);
          }}
        />
      )}

      {detail && (
        <DetailModal
          transfer={detail}
          activeStoreId={activeStoreId}
          onClose={() => setDetail(null)}
          onRefresh={async () => {
            await Promise.all([
              loadTransfers(),
              loadProducts(),
            ]);
          }}
        />
      )}
    </div>
  );
}
