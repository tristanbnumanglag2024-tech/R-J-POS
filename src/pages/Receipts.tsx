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
} from "../components/ui";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";
const PER_PAGE = 8;

type ReceiptStatus = "completed" | "refunded" | "cancelled" | string;

interface ReceiptRow {
  id: number;
  receipt_no: string;
  store_id: number;
  store_name: string;
  branch_name: string;
  cashier_id: number | null;
  cashier_name: string;
  customer_id: number | null;
  customer_name: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: string;
  amount_paid: number;
  status: ReceiptStatus;
  created_at: string;
}

interface ReceiptItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  line_total: number;
}

interface ReceiptPayment {
  id: number;
  payment_method: string;
  amount: number;
  reference_no: string | null;
  created_at: string;
}

interface ReceiptDetail extends ReceiptRow {
  notes: string | null;
  updated_at: string;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  receipts?: T[];
  receipt?: T;
  total?: number;
}

function fmt(value: number | string | null | undefined) {
  return "₱" + Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (normalized === "refunded") {
    return <Badge variant="danger">Refunded</Badge>;
  }

  return <Badge variant="neutral">{status}</Badge>;
}

function paymentLabel(value: string) {
  const text = value
    .replace(/_/g, " ")
    .trim();

  if (!text) return "—";

  return text
    .split(/\s+/)
    .map((part) =>
      part.charAt(0).toUpperCase() +
      part.slice(1)
    )
    .join(" ");
}

function formatDateTime(value: string) {
  if (!value) {
    return { date: "—", time: "" };
  }

  const parsed = new Date(
    value.includes("T")
      ? value
      : value.replace(" ", "T")
  );

  if (Number.isNaN(parsed.getTime())) {
    return {
      date: value,
      time: "",
    };
  }

  return {
    date: parsed.toLocaleDateString("en-PH"),
    time: parsed.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

async function readJson<T>(
  response: Response
): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      text.trim().startsWith("<")
        ? "The server returned HTML instead of JSON."
        : `The server returned an invalid response: ${text.substring(
            0,
            300
          )}`
    );
  }
}

function ReceiptPrint({
  receipt,
}: {
  receipt: ReceiptDetail;
}) {
  const itemsTotal = receipt.items.reduce(
    (sum, item) =>
      sum + Number(item.line_total || 0),
    0
  );

  const computedChange = Math.max(
    0,
    Number(receipt.amount_paid || 0) -
      Number(receipt.total || 0)
  );

  const handlePrint = () => {
    const printWindow = window.open(
      "",
      "_blank",
      "width=480,height=760"
    );

    if (!printWindow) {
      window.alert(
        "Please allow pop-ups to print the receipt."
      );
      return;
    }

    const itemRows = receipt.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.product_name)}</td>
            <td class="qty">${item.quantity}</td>
            <td class="money">${fmt(item.unit_price)}</td>
            <td class="money">${fmt(item.line_total)}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(receipt.receipt_no)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 18px;
              background: #fff;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 12px;
            }
            .receipt {
              width: 100%;
              max-width: 380px;
              margin: 0 auto;
            }
            .center { text-align: center; }
            .brand {
              font-size: 18px;
              font-weight: 800;
              margin-bottom: 2px;
            }
            .muted {
              color: #6b7280;
              font-size: 11px;
            }
            .divider {
              border-top: 1px dashed #9ca3af;
              margin: 12px 0;
            }
            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px 12px;
              margin-top: 8px;
            }
            .meta div {
              display: flex;
              justify-content: space-between;
              gap: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              padding: 5px 0;
              vertical-align: top;
            }
            th {
              font-size: 10px;
              color: #6b7280;
              text-align: left;
              border-bottom: 1px solid #d1d5db;
            }
            .qty {
              text-align: center;
              width: 35px;
            }
            .money {
              text-align: right;
              white-space: nowrap;
            }
            .totals {
              margin-top: 10px;
            }
            .line {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              padding: 3px 0;
            }
            .grand {
              border-top: 2px solid #111827;
              margin-top: 5px;
              padding-top: 7px;
              font-weight: 800;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 16px;
              color: #6b7280;
              font-size: 10px;
            }
            @media print {
              body { padding: 0; }
              .receipt { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div class="brand">${escapeHtml(receipt.store_name)}</div>
              <div>${escapeHtml(receipt.branch_name)}</div>
              <div class="muted">${escapeHtml(receipt.store_id ? `Store #${receipt.store_id}` : "")}</div>
            </div>

            <div class="divider"></div>

            <div>
              <strong>Receipt:</strong> ${escapeHtml(receipt.receipt_no)}
            </div>
            <div>
              <strong>Date:</strong> ${escapeHtml(receipt.created_at)}
            </div>

            <div class="meta">
              <div><span>Cashier</span><strong>${escapeHtml(receipt.cashier_name || "—")}</strong></div>
              <div><span>Customer</span><strong>${escapeHtml(receipt.customer_name || "Walk-in")}</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="qty">Qty</th>
                  <th class="money">Price</th>
                  <th class="money">Total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div class="totals">
              <div class="line">
                <span>Subtotal</span>
                <span>${fmt(receipt.subtotal)}</span>
              </div>
              <div class="line">
                <span>Discount</span>
                <span>- ${fmt(receipt.discount)}</span>
              </div>
              <div class="line">
                <span>Tax</span>
                <span>${fmt(receipt.tax)}</span>
              </div>
              <div class="line grand">
                <span>TOTAL</span>
                <span>${fmt(receipt.total)}</span>
              </div>
              <div class="line">
                <span>Payment (${escapeHtml(paymentLabel(receipt.payment_method))})</span>
                <span>${fmt(receipt.amount_paid)}</span>
              </div>
              <div class="line">
                <span>Change</span>
                <span>${fmt(computedChange)}</span>
              </div>
            </div>

            <div class="divider"></div>

            <div class="footer">
              Thank you for shopping with us.<br />
              ${receipt.items.length} item line(s)
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handlePrint}
    >
      Print
    </Button>
  );
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface ReceiptsProps {
  activeStoreId: number | null;
}

export default function Receipts({
  activeStoreId,
}: ReceiptsProps) {
  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [payFilter, setPayFilter] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [receipts, setReceipts] =
    useState<ReceiptRow[]>([]);

  const [selected, setSelected] =
    useState<ReceiptDetail | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [total, setTotal] =
    useState(0);

  const selectedId =
    selected?.id ?? null;

  const loadReceipts = async (
    requestedPage = page
  ) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(requestedPage),
        per_page: String(PER_PAGE),
      });

      if (activeStoreId !== null && activeStoreId > 0) {
        params.set("store_id", String(activeStoreId));
      }

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (statusFilter) {
        params.set(
          "status",
          statusFilter
        );
      }

      if (payFilter) {
        params.set(
          "payment_method",
          payFilter
        );
      }

      const response = await fetch(
        `${API_BASE}/receipts/list.php?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const data =
        await readJson<ApiResponse<ReceiptRow>>(
          response
        );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to load receipts."
        );
      }

      const rows =
        Array.isArray(data.receipts)
          ? data.receipts
          : [];

      setReceipts(rows);
      setTotal(
        Number(data.total || 0)
      );

      if (rows.length === 0) {
        setSelected(null);
        return;
      }

      const keepSelected =
        rows.some(
          (row) =>
            row.id === selectedId
        );

      if (!keepSelected) {
        await loadReceiptDetail(
          rows[0].id
        );
      }
    } catch (err) {
      console.error(
        "Load receipts error:",
        err
      );

      setReceipts([]);
      setTotal(0);
      setSelected(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load receipts."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadReceiptDetail = async (
    receiptId: number
  ) => {
    try {
      setDetailLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/receipts/detail.php?id=${encodeURIComponent(
          String(receiptId)
        )}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const data =
        await readJson<ApiResponse<ReceiptDetail>>(
          response
        );

      if (
        !response.ok ||
        !data.success ||
        !data.receipt
      ) {
        throw new Error(
          data.message ||
            "Failed to load receipt details."
        );
      }

      setSelected(
        data.receipt
      );
    } catch (err) {
      console.error(
        "Load receipt detail error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load receipt details."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts(1);
    // Filters intentionally trigger a new server-side query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    statusFilter,
    payFilter,
    activeStoreId,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    payFilter,
  ]);

  const paymentOptions =
    useMemo(() => {
      const unique = new Map<
        string,
        string
      >();

      receipts.forEach((receipt) => {
        if (
          receipt.payment_method
        ) {
          unique.set(
            receipt.payment_method,
            paymentLabel(
              receipt.payment_method
            )
          );
        }
      });

      return Array.from(
        unique.entries()
      )
        .sort((a, b) =>
          a[1].localeCompare(b[1])
        )
        .map(
          ([value, label]) => ({
            value,
            label,
          })
        );
    }, [receipts]);

  const pageRows = receipts;

  return (
    <div className="p-6 space-y-4 max-w-[1400px]">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Receipt # or customer name..."
          />

          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            placeholder="All Status"
            options={[
              {
                value: "completed",
                label: "Completed",
              },
              {
                value: "refunded",
                label: "Refunded",
              },
              {
                value: "cancelled",
                label: "Cancelled",
              },
            ]}
          />

          <Select
            value={payFilter}
            onChange={(value) => {
              setPayFilter(value);
              setPage(1);
            }}
            placeholder="All Payments"
            options={paymentOptions}
          />

          {(search ||
            statusFilter ||
            payFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPayFilter("");
                setPage(1);
              }}
              className="text-[12px] text-[#64748B] underline"
            >
              Clear
            </button>
          )}

          <span className="text-[12px] text-[#94A3B8] ml-auto">
            {total.toLocaleString()} receipts
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Receipt list */}
        <div className="xl:col-span-2">
          <Card>
            {loading ? (
              <div className="p-10 text-center text-[13px] text-[#64748B]">
                Loading receipts...
              </div>
            ) : pageRows.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-[#94A3B8]">
                No receipts found.
              </div>
            ) : (
              <>
                <Table
                  headers={[
                    "Receipt",
                    "Date",
                    "Total",
                    "Status",
                    "",
                  ]}
                >
                  {pageRows.map(
                    (receipt) => {
                      const dateTime =
                        formatDateTime(
                          receipt.created_at
                        );

                      const active =
                        selected?.id ===
                        receipt.id;

                      return (
                        <Tr
                          key={receipt.id}
                          onClick={() =>
                            loadReceiptDetail(
                              receipt.id
                            )
                          }
                        >
                          <Td>
                            <div>
                              <p
                                className={`text-[12px] font-mono font-medium ${
                                  active
                                    ? "text-[#4F46E5]"
                                    : "text-[#0F172A]"
                                }`}
                              >
                                {
                                  receipt.receipt_no
                                }
                              </p>

                              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                                {
                                  receipt.cashier_name
                                }
                              </p>
                            </div>
                          </Td>

                          <Td>
                            <span className="text-[11px] text-[#64748B]">
                              {dateTime.date}{" "}
                              {dateTime.time}
                            </span>
                          </Td>

                          <Td>
                            <span className="text-[12px] font-semibold text-[#0F172A]">
                              {fmt(
                                receipt.total
                              )}
                            </span>
                          </Td>

                          <Td>
                            {statusBadge(
                              receipt.status
                            )}
                          </Td>

                          <Td>
                            {active && (
                              <div className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                            )}
                          </Td>
                        </Tr>
                      );
                    }
                  )}
                </Table>

                <Pagination
                  page={page}
                  total={total}
                  perPage={PER_PAGE}
                  onChange={(nextPage) => {
                    setPage(nextPage);
                    loadReceipts(
                      nextPage
                    );
                  }}
                />
              </>
            )}
          </Card>
        </div>

        {/* Receipt detail */}
        <div className="xl:col-span-3">
          {detailLoading ? (
            <Card className="flex items-center justify-center h-64">
              <p className="text-[13px] text-[#94A3B8]">
                Loading receipt...
              </p>
            </Card>
          ) : selected ? (
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
                <span className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Receipt Preview
                </span>

                <div className="flex items-center gap-2">
                  <ReceiptPrint
                    receipt={selected}
                  />

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled
                  >
                    Email
                  </Button>

                  {selected.status ===
                    "completed" && (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled
                    >
                      Refund
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Store header */}
                <div className="text-center mb-6 pb-4 border-b border-dashed border-[#E2E8F0]">
                  <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center mx-auto mb-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <rect
                        x="1"
                        y="1"
                        width="6"
                        height="6"
                        rx="1.5"
                        fill="white"
                        opacity="0.9"
                      />
                      <rect
                        x="9"
                        y="1"
                        width="6"
                        height="6"
                        rx="1.5"
                        fill="white"
                        opacity="0.6"
                      />
                      <rect
                        x="1"
                        y="9"
                        width="6"
                        height="6"
                        rx="1.5"
                        fill="white"
                        opacity="0.6"
                      />
                      <rect
                        x="9"
                        y="9"
                        width="6"
                        height="6"
                        rx="1.5"
                        fill="white"
                        opacity="0.9"
                      />
                    </svg>
                  </div>

                  <h3 className="text-[15px] font-bold text-[#0F172A]">
                    {selected.store_name}
                  </h3>

                  <p className="text-[12px] text-[#64748B]">
                    {selected.branch_name}
                  </p>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 mb-5 text-[12px]">
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <span className="text-[#94A3B8] w-24">
                        Receipt #
                      </span>
                      <span className="font-mono font-semibold text-[#0F172A]">
                        {
                          selected.receipt_no
                        }
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <span className="text-[#94A3B8] w-24">
                        Date
                      </span>
                      <span>
                        {
                          formatDateTime(
                            selected.created_at
                          ).date
                        }
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <span className="text-[#94A3B8] w-24">
                        Time
                      </span>
                      <span>
                        {
                          formatDateTime(
                            selected.created_at
                          ).time
                        }
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <span className="text-[#94A3B8] w-20">
                        Cashier
                      </span>
                      <span>
                        {
                          selected.cashier_name
                        }
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <span className="text-[#94A3B8] w-20">
                        Customer
                      </span>
                      <span>
                        {
                          selected.customer_name ||
                          "Walk-in"
                        }
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <span className="text-[#94A3B8] w-20">
                        Status
                      </span>
                      {statusBadge(
                        selected.status
                      )}
                    </div>
                  </div>
                </div>

                {/* Line items */}
                <div className="border border-[#F1F5F9] rounded-xl overflow-hidden mb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#F8FAFC]">
                        <tr>
                          {[
                            "Product",
                            "Qty",
                            "Unit Price",
                            "Discount",
                            "Tax",
                            "Total",
                          ].map(
                            (header) => (
                              <th
                                key={
                                  header
                                }
                                className="px-3 py-2.5 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {selected.items.map(
                          (item) => (
                            <tr
                              key={item.id}
                              className="border-t border-[#F1F5F9]"
                            >
                              <td className="px-3 py-2.5 text-[12px] text-[#0F172A] font-medium">
                                <div>
                                  <p>
                                    {
                                      item.product_name
                                    }
                                  </p>
                                  {item.sku && (
                                    <p className="text-[9px] text-[#94A3B8] font-mono mt-0.5">
                                      {
                                        item.sku
                                      }
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="px-3 py-2.5 text-[12px] text-[#64748B]">
                                {
                                  item.quantity
                                }
                              </td>

                              <td className="px-3 py-2.5 text-[12px]">
                                {fmt(
                                  item.unit_price
                                )}
                              </td>

                              <td className="px-3 py-2.5 text-[12px] text-emerald-600">
                                {Number(
                                  item.discount
                                ) > 0
                                  ? `-${fmt(
                                      item.discount
                                    )}`
                                  : "—"}
                              </td>

                              <td className="px-3 py-2.5 text-[12px] text-[#94A3B8]">
                                {fmt(
                                  item.tax
                                )}
                              </td>

                              <td className="px-3 py-2.5 text-[12px] font-semibold text-[#0F172A]">
                                {fmt(
                                  item.line_total
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">
                      Subtotal
                    </span>
                    <span>
                      {fmt(
                        selected.subtotal
                      )}
                    </span>
                  </div>

                  {Number(
                    selected.discount
                  ) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>
                        Discount
                      </span>
                      <span>
                        -
                        {fmt(
                          selected.discount
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-[#64748B]">
                      Tax
                    </span>
                    <span>
                      {fmt(
                        selected.tax
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold text-[15px] pt-2 border-t-2 border-[#0F172A]">
                    <span>TOTAL</span>
                    <span className="text-[#4F46E5]">
                      {fmt(
                        selected.total
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-[12px] pt-1">
                    <span className="text-[#64748B]">
                      Payment (
                      {paymentLabel(
                        selected.payment_method
                      )}
                      )
                    </span>

                    <span className="font-semibold">
                      {fmt(
                        selected.amount_paid
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#64748B]">
                      Change
                    </span>

                    <span className="font-semibold text-emerald-600">
                      {fmt(
                        Math.max(
                          0,
                          Number(
                            selected.amount_paid
                          ) -
                            Number(
                              selected.total
                            )
                        )
                      )}
                    </span>
                  </div>
                </div>

                {selected.notes && (
                  <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-[#94A3B8]">
                      Notes
                    </p>
                    <p className="text-[12px] text-[#475569] mt-1">
                      {selected.notes}
                    </p>
                  </div>
                )}

                <div className="text-center mt-6 pt-4 border-t border-dashed border-[#E2E8F0]">
                  <p className="text-[11px] text-[#94A3B8]">
                    Thank you for shopping with us.
                  </p>

                  <p className="text-[10px] text-[#CBD5E1] mt-1">
                    Receipt generated from Rhea POS.
                  </p>
                </div>

                {selected.items.length === 0 && (
                  <p className="text-center text-[12px] text-[#94A3B8] mt-4">
                    No sale items were found for this receipt.
                  </p>
                )}

              </div>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-64">
              <p className="text-[13px] text-[#94A3B8]">
                Select a receipt to preview
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
