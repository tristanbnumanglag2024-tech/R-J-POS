import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  SearchBar,
  Select,
  Table,
  Tr,
  Td,
  Pagination,
  Modal,
} from "../components/ui";

interface SalesProps {
  activeStoreId?: number | null;
}

interface StoreOption {
  id: number;
  branch_name: string;
}

interface Sale {
  id: number;
  store_id: number;
  branch_name?: string;
  cashier_id: number;
  cashier: string;
  cashier_email: string;
  receipt_no: string;
  customer_id: number | null;
  customer: string;
  subtotal: number;
  discount: number;
  taxtotal: number;
  total: number;
  payment_method: string;
  amount_paid: number;
  status: string;
  refund_status?: string | null;
  display_status?: string | null;
  notes: string | null;
  items: number;
  created_at: string;
  updated_at: string;
}

interface SaleItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  line_total: number;
}

interface SaleDetail extends Sale {
  items_detail: SaleItem[];
}

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

type SalesCardProps = {
  children: React.ReactNode;
  className?: string;
};

function SalesCard({ children, className = "" }: SalesCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[#E2E8F0] bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}


function fmt(value: number) {
  return "₱" + Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function statusBadge(status: string) {
  const value = status.toLowerCase();

  if (value === "completed") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (value === "refunded" || value === "approved") {
    return <Badge variant="danger">Refunded</Badge>;
  }

  if (value === "partial" || value === "partially_refunded") {
    return <Badge variant="warning">Partially Refunded</Badge>;
  }

  if (value === "pending") {
    return <Badge variant="warning">Pending</Badge>;
  }

  if (value === "rejected") {
    return <Badge variant="warning">Rejected</Badge>;
  }

  if (value === "voided") {
    return <Badge variant="neutral">Voided</Badge>;
  }

  return <Badge variant="neutral">{status}</Badge>;
}

function payBadge(payment: string) {
  const value = payment.toLowerCase();

  if (value === "cash") {
    return <Badge variant="neutral">Cash</Badge>;
  }

  if (value.includes("credit")) {
    return <Badge variant="primary">{payment}</Badge>;
  }

  if (value.includes("debit")) {
    return <Badge variant="info">{payment}</Badge>;
  }

  return <Badge variant="neutral">{payment}</Badge>;
}

export default function Sales({ activeStoreId }: SalesProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [cashierFilter, setCashierFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Centralized branch filter. 0 = All Branches.
  const [storeFilter, setStoreFilter] = useState<number>(0);
  const [stores, setStores] = useState<StoreOption[]>([]);

  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const PER_PAGE = 8;

  // ============================================================
  // LOAD STORES
  // ============================================================

  useEffect(() => {
    const loadStores = async () => {
      try {
        const response = await fetch(`${API_BASE}/stores/topbar.php`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || "Unable to load stores.");
        }

        const rows = Array.isArray(data.stores)
          ? data.stores
          : Array.isArray(data.data?.stores)
            ? data.data.stores
            : [];

        const normalized: StoreOption[] = rows
          .map((store: any) => ({
            id: Number(store.id),
            branch_name: String(
              store.branch_name ?? store.store_name ?? `Store #${store.id}`
            ),
          }))
          .filter((store: StoreOption) => store.id > 0);

        setStores(normalized);

        // Keep compatibility with a parent-selected store when provided.
        if (activeStoreId && activeStoreId > 0) {
          setStoreFilter(activeStoreId);
        }
      } catch (err) {
        console.error("Load stores error:", err);
      }
    };

    loadStores();
  }, [activeStoreId]);

  // ============================================================
  // LOAD SALES
  // ============================================================

  useEffect(() => {
    const loadSales = async () => {
      try {
        setLoading(true);
        setError("");

        const query =
          storeFilter > 0
            ? `?store_id=${encodeURIComponent(storeFilter)}`
            : "";

        const response = await fetch(
          `${API_BASE}/pos/sales/list.php${query}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || "Unable to load sales.");
        }

        setSales(Array.isArray(data.sales) ? data.sales : []);
        setPage(1);
      } catch (err) {
        console.error("Load sales error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load sales."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSales();
  }, [storeFilter]);

  // ============================================================
  // BRANCH OPTIONS
  // ============================================================

  const branchOptions = useMemo(
    () => [
      { value: "0", label: "All Branches" },
      ...stores.map((store) => ({
        value: String(store.id),
        label: store.branch_name,
      })),
    ],
    [stores]
  );

  // ============================================================
  // CASHIERS
  // ============================================================

  const cashierOptions = useMemo(() => {
    const map = new Map<number, string>();

    sales.forEach((sale) => {
      if (sale.cashier_id && sale.cashier) {
        map.set(sale.cashier_id, sale.cashier);
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      value: String(id),
      label: name,
    }));
  }, [sales]);

  // ============================================================
  // PAYMENT METHODS
  // ============================================================

  const paymentOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        sales
          .map((sale) => sale.payment_method)
          .filter(Boolean)
      )
    );

    return values.map((value) => ({
      value,
      label: value,
    }));
  }, [sales]);

  // ============================================================
  // STATUS OPTIONS
  // ============================================================

  const statusOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        sales
          .map((sale) => sale.display_status || sale.refund_status || sale.status)
          .filter(Boolean)
      )
    );

    return values.map((value) => ({
      value,
      label:
        value.charAt(0).toUpperCase() +
        value.slice(1),
    }));
  }, [sales]);

  // ============================================================
  // DATE FILTER
  // ============================================================

  const filtered = useMemo(() => {
    const now = new Date();

    return sales.filter((sale) => {
      const saleDate = new Date(sale.created_at);

      let matchDate = true;

      if (dateFilter === "today") {
        matchDate =
          saleDate.toDateString() === now.toDateString();
      }

      if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);

        matchDate = saleDate >= weekAgo;
      }

      if (dateFilter === "month") {
        matchDate =
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear();
      }

      const query = search.toLowerCase().trim();

      const matchSearch =
        !query ||
        sale.receipt_no.toLowerCase().includes(query) ||
        sale.cashier.toLowerCase().includes(query) ||
        sale.cashier_email.toLowerCase().includes(query) ||
        sale.customer.toLowerCase().includes(query);

      const matchCashier =
        !cashierFilter ||
        String(sale.cashier_id) === cashierFilter;

      const matchPayment =
        !payFilter ||
        sale.payment_method === payFilter;

      const matchStatus =
        !statusFilter ||
        (sale.display_status || sale.refund_status || sale.status) === statusFilter;

      return (
        matchDate &&
        matchSearch &&
        matchCashier &&
        matchPayment &&
        matchStatus
      );
    });
  }, [
    sales,
    search,
    dateFilter,
    cashierFilter,
    payFilter,
    statusFilter,
  ]);

  // ============================================================
  // PAGINATION
  // ============================================================

  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  // ============================================================
  // SUMMARY
  // ============================================================

  const totalSales = filtered.reduce(
    (sum, sale) =>
      sale.status === "completed"
        ? sum + Number(sale.total)
        : sum,
    0
  );

  const totalTransactions = filtered.filter(
    (sale) => sale.status === "completed"
  ).length;

  const getOriginalSaleTotal = (sale: Sale) =>
    Math.max(
      0,
      Number(sale.subtotal || 0) -
        Number(sale.discount || 0) +
        Number(sale.taxtotal || 0)
    );

  const getRefundAmount = (sale: Sale) => {
    const status = String(
      sale.display_status ||
        sale.refund_status ||
        sale.status ||
        ""
    ).trim().toLowerCase();

    // Only approved refunds affect the Refunds total.
    if (
      status !== "refunded" &&
      status !== "partial" &&
      status !== "partially_refunded"
    ) {
      return 0;
    }

    const originalTotal = getOriginalSaleTotal(sale);
    const currentNetTotal = Math.max(0, Number(sale.total || 0));

    return Math.max(0, originalTotal - currentNetTotal);
  };

  const totalRefunds = filtered.reduce(
    (sum, sale) => sum + getRefundAmount(sale),
    0
  );

  // ============================================================
  // VIEW SALE
  // ============================================================

  const viewSale = async (saleId: number) => {
    try {
      setDetailLoading(true);

      const response = await fetch(
        `${API_BASE}/pos/sales/view.php?id=${saleId}${
          storeFilter > 0
            ? `&store_id=${encodeURIComponent(storeFilter)}`
            : ""
        }`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message || "Unable to load transaction."
        );
      }

      setDetail(data.sale);
    } catch (err) {
      console.error("View sale error:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Unable to load transaction."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearch("");
    setStoreFilter(0);
    setDateFilter("today");
    setCashierFilter("");
    setPayFilter("");
    setStatusFilter("");
    setPage(1);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Sales
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            All transactions and receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            Export CSV
          </Button>

          <Button variant="secondary" size="sm">
            Print Report
          </Button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-3">
        <SalesCard className="px-5 py-4 flex items-center justify-between">
          <span className="text-[12px] text-[#64748B]">
            Total Sales
          </span>

          <span className="text-[16px] font-bold text-emerald-500">
            {fmt(totalSales)}
          </span>
        </SalesCard>

        <SalesCard className="px-5 py-4 flex items-center justify-between">
          <span className="text-[12px] text-[#64748B]">
            Transactions
          </span>

          <span className="text-[16px] font-bold text-[#4F46E5]">
            {totalTransactions}
          </span>
        </SalesCard>

        <SalesCard className="px-5 py-4 flex items-center justify-between">
          <span className="text-[12px] text-[#64748B]">
            Refunds
          </span>

          <span className="text-[16px] font-bold text-red-500">
            {fmt(totalRefunds)}
          </span>
        </SalesCard>
      </div>

      {/* FILTERS */}
      <SalesCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">

          <Select
            value={String(storeFilter)}
            onChange={(value) => {
              setStoreFilter(Number(value) || 0);
              setPage(1);
            }}
            options={branchOptions}
          />

          <SearchBar
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Receipt #, cashier, email..."
          />

          <Select
            value={dateFilter}
            onChange={(value) => {
              setDateFilter(value);
              setPage(1);
            }}
            options={[
              { value: "today", label: "Today" },
              { value: "week", label: "This Week" },
              { value: "month", label: "This Month" },
              { value: "all", label: "All Time" },
            ]}
          />

          <Select
            value={cashierFilter}
            onChange={(value) => {
              setCashierFilter(value);
              setPage(1);
            }}
            placeholder="All Cashiers"
            options={cashierOptions}
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

          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            placeholder="All Status"
            options={statusOptions}
          />

          {(search ||
            dateFilter !== "today" ||
            cashierFilter ||
            payFilter ||
            statusFilter) && (
            <button
              onClick={clearFilters}
              className="text-[12px] text-[#64748B] underline"
            >
              Clear
            </button>
          )}

          <span className="text-[12px] text-[#94A3B8] ml-auto">
            {filtered.length} transactions
          </span>
        </div>
      </SalesCard>

      {/* ERROR */}
      {error && (
        <SalesCard className="p-4 border-red-200 bg-red-50">
          <p className="text-[12px] text-red-600">
            {error}
          </p>
        </SalesCard>
      )}

      {/* TABLE */}
      <SalesCard>
        {loading ? (
          <div className="p-10 text-center">
            <p className="text-[13px] text-[#64748B]">
              Loading sales...
            </p>
          </div>
        ) : (
          <>
            <Table
              headers={[
                "Receipt #",
                "Branch",
                "Date",
                "Time",
                "Cashier",
                "Customer",
                "Items",
                "Subtotal",
                "Disc.",
                "Tax",
                "Total",
                "Payment",
                "Status",
                "",
              ]}
            >
              {paged.map((sale) => {
                const dateTime =
                  formatDateTime(sale.created_at);

                return (
                  <Tr
                    key={sale.id}
                    onClick={() => viewSale(sale.id)}
                  >
                    <Td mono>
                      <span className="text-[#4F46E5]">
                        {sale.receipt_no}
                      </span>
                    </Td>

                    <Td>
                      <span className="font-medium text-[#334155]">
                        {sale.branch_name || `Store #${sale.store_id}`}
                      </span>
                    </Td>

                    <Td>
                      <span className="text-[#64748B]">
                        {dateTime.date}
                      </span>
                    </Td>

                    <Td>
                      <span className="text-[#64748B]">
                        {dateTime.time}
                      </span>
                    </Td>

                    <Td>
                      <div>
                        <p>{sale.cashier}</p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {sale.cashier_email}
                        </p>
                      </div>
                    </Td>

                    <Td>
                      <span
                        className={
                          sale.customer === "Walk-in"
                            ? "text-[#94A3B8]"
                            : ""
                        }
                      >
                        {sale.customer}
                      </span>
                    </Td>

                    <Td>
                      <span className="bg-[#F1F5F9] text-[#475569] text-[11px] font-medium px-2 py-0.5 rounded-md">
                        {sale.items}
                      </span>
                    </Td>

                    <Td>
                      {fmt(sale.subtotal)}
                    </Td>

                    <Td>
                      {Number(sale.discount) > 0 ? (
                        <span className="text-emerald-600">
                          -{fmt(sale.discount)}
                        </span>
                      ) : (
                        <span className="text-[#CBD5E1]">
                          —
                        </span>
                      )}
                    </Td>

                    <Td>
                      <span className="text-[#64748B]">
                        {fmt(sale.taxtotal)}
                      </span>
                    </Td>

                    <Td>
                      <span
                        className={
                          getRefundAmount(sale) > 0
                            ? "font-semibold text-red-600"
                            : "font-semibold text-[#0F172A]"
                        }
                      >
                        {fmt(sale.total)}
                      </span>
                    </Td>

                    <Td>
                      {payBadge(sale.payment_method)}
                    </Td>

                    <Td>
                      {statusBadge(
                        sale.display_status ||
                          sale.refund_status ||
                          sale.status
                      )}
                    </Td>

                    <Td>
                      <button
                        className="text-[12px] text-[#4F46E5] font-medium hover:text-[#4338CA]"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewSale(sale.id);
                        }}
                      >
                        View →
                      </button>
                    </Td>
                  </Tr>
                );
              })}
            </Table>

            {paged.length === 0 && (
              <div className="p-10 text-center">
                <p className="text-[13px] font-medium text-[#475569]">
                  No sales found
                </p>

                <p className="text-[11px] text-[#94A3B8] mt-1">
                  There are no transactions matching your filters.
                </p>
              </div>
            )}

            <Pagination
              page={page}
              total={filtered.length}
              perPage={PER_PAGE}
              onChange={setPage}
            />
          </>
        )}
      </SalesCard>

      {/* DETAIL MODAL */}
      {detail && (
        <Modal
          title={`Transaction ${detail.receipt_no}`}
          onClose={() => setDetail(null)}
          width="max-w-2xl"
        >
          {detailLoading ? (
            <div className="p-8 text-center">
              <p className="text-[13px] text-[#64748B]">
                Loading transaction...
              </p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* INFO */}
              <div className="grid grid-cols-2 gap-4 text-[13px]">

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">
                      Date & Time
                    </span>

                    <span className="font-medium">
                      {formatDateTime(
                        detail.created_at
                      ).date}{" "}
                      {formatDateTime(
                        detail.created_at
                      ).time}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64748B]">
                      Cashier
                    </span>

                    <span className="font-medium">
                      {detail.cashier}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64748B]">
                      Customer
                    </span>

                    <span className="font-medium">
                      {detail.customer}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">
                      Payment
                    </span>

                    {payBadge(
                      detail.payment_method
                    )}
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64748B]">
                      Status
                    </span>

                    {statusBadge(
                      detail.display_status ||
                        detail.refund_status ||
                        detail.status
                    )}
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64748B]">
                      Items
                    </span>

                    <span className="font-medium">
                      {detail.items} items
                    </span>
                  </div>
                </div>
              </div>

              {/* REAL LINE ITEMS */}
              <div>
                <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                  Items Purchased
                </p>

                <div className="space-y-2">
                  {detail.items_detail.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0"
                      >
                        <div>
                          <p className="text-[13px] font-medium text-[#0F172A]">
                            {item.product_name}
                          </p>

                          <p className="text-[10px] text-[#94A3B8]">
                            {item.sku || "No SKU"} ·
                            {" "}x{item.quantity}
                            {" "}×{" "}
                            {fmt(item.unit_price)}
                          </p>
                        </div>

                        <span className="text-[13px] font-semibold">
                          {fmt(item.line_total)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* TOTALS */}
              <div className="bg-[#F8FAFC] rounded-xl p-4 space-y-2 text-[13px]">

                <div className="flex justify-between">
                  <span className="text-[#64748B]">
                    Subtotal
                  </span>

                  <span>
                    {fmt(detail.subtotal)}
                  </span>
                </div>

                {Number(detail.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>

                    <span>
                      -{fmt(detail.discount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-[#64748B]">
                    Tax
                  </span>

                  <span>
                    {fmt(detail.taxtotal)}
                  </span>
                </div>

                <div className="flex justify-between font-bold text-[15px] pt-2 border-t border-[#E2E8F0]">
                  <span>Total</span>

                  <span className="text-[#4F46E5]">
                    {fmt(detail.total)}
                  </span>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-[#64748B]">
                    Amount Paid
                  </span>

                  <span>
                    {fmt(detail.amount_paid)}
                  </span>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3">
                <Button variant="secondary" size="sm">
                  Print Receipt
                </Button>

                <Button variant="secondary" size="sm">
                  Email Receipt
                </Button>

              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}