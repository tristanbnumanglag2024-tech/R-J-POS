import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, Button } from "../../components/ui";

const API_BASE = "http://localhost/rhea-pos-api";

type Sale = {
  id: number;
  store_id: number;
  cashier_id: number;
  cashier: string | null;
  cashier_email?: string | null;
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
  notes?: string | null;
  items: number;
  created_at: string;
  updated_at?: string;
};

interface ReportsProps {
  activeStoreId?: number | null;
}

type ReportType =
  | "Sales Report"
  | "Transaction Report"
  | "Payment Methods"
  | "Employee Sales";

function fmt(n: number) {
  return "₱" + Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateLabel(value: string) {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function dateTimeLabel(value: string) {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleString("en-PH");
}

function normalizePayment(value: string) {
  const v = String(value || "").toLowerCase();

  if (v === "cash") return "Cash";
  if (v === "credit") return "Credit Card";
  if (v === "credit card") return "Credit Card";
  if (v === "debit") return "Debit Card";
  if (v === "debit card") return "Debit Card";
  if (v === "ewallet") return "E-Wallet";
  if (v === "e-wallet") return "E-Wallet";
  if (v === "bank") return "Bank Transfer";
  if (v === "bank transfer") return "Bank Transfer";

  return value || "Other";
}

export default function Reports({
  activeStoreId,
}: ReportsProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [period, setPeriod] = useState<
    "Today" | "7 Days" | "30 Days" | "All"
  >("30 Days");

  const [generating, setGenerating] =
    useState<ReportType | null>(null);

  const [generatedReport, setGeneratedReport] =
    useState<ReportType | null>(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD SALES
  |--------------------------------------------------------------------------
  */

  const loadSales = async () => {
    if (!activeStoreId) {
      setSales([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/pos/sales/list.php?store_id=${activeStoreId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load sales."
        );
      }

      const rows = Array.isArray(data.sales)
        ? data.sales
        : [];

      setSales(
        rows.map((sale: any) => ({
          ...sale,
          id: Number(sale.id),
          store_id: Number(sale.store_id),
          cashier_id: Number(sale.cashier_id),
          customer_id:
            sale.customer_id !== null
              ? Number(sale.customer_id)
              : null,
          subtotal: Number(sale.subtotal || 0),
          discount: Number(sale.discount || 0),
          taxtotal: Number(sale.taxtotal || 0),
          total: Number(sale.total || 0),
          amount_paid: Number(
            sale.amount_paid || 0
          ),
          items: Number(sale.items || 0),
        }))
      );
    } catch (err) {
      console.error("Reports load error:", err);

      setSales([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sales."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [activeStoreId]);

  /*
  |--------------------------------------------------------------------------
  | PERIOD FILTER
  |--------------------------------------------------------------------------
  */

  const filteredSales = useMemo(() => {
    const now = new Date();

    return sales.filter((sale) => {
      const date = new Date(sale.created_at);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      if (period === "All") {
        return true;
      }

      const diff =
        now.getTime() - date.getTime();

      if (period === "Today") {
        return (
          date.toDateString() ===
          now.toDateString()
        );
      }

      if (period === "7 Days") {
        return (
          diff <=
          7 * 24 * 60 * 60 * 1000
        );
      }

      return (
        diff <=
        30 * 24 * 60 * 60 * 1000
      );
    });
  }, [sales, period]);

  /*
  |--------------------------------------------------------------------------
  | COMPLETED SALES
  |--------------------------------------------------------------------------
  */

  const completedSales = useMemo(
    () =>
      filteredSales.filter(
        (sale) =>
          sale.status === "completed"
      ),
    [filteredSales]
  );

  /*
  |--------------------------------------------------------------------------
  | KPI
  |--------------------------------------------------------------------------
  */

  const totalRevenue = useMemo(
    () =>
      completedSales.reduce(
        (sum, sale) =>
          sum + Number(sale.total || 0),
        0
      ),
    [completedSales]
  );

  const transactionCount =
    completedSales.length;

  const totalItems = useMemo(
    () =>
      completedSales.reduce(
        (sum, sale) =>
          sum + Number(sale.items || 0),
        0
      ),
    [completedSales]
  );

  const averageOrder =
    transactionCount > 0
      ? totalRevenue / transactionCount
      : 0;

  const refundedCount = filteredSales.filter(
    (sale) =>
      sale.status === "refunded"
  ).length;

  const refundRate =
    filteredSales.length > 0
      ? (refundedCount /
          filteredSales.length) *
        100
      : 0;

  /*
  |--------------------------------------------------------------------------
  | REVENUE BY DAY
  |--------------------------------------------------------------------------
  */

  const revenueChart = useMemo(() => {
    const map: Record<
      string,
      {
        label: string;
        sales: number;
        transactions: number;
      }
    > = {};

    completedSales.forEach((sale) => {
      const d = new Date(
        sale.created_at
      );

      if (Number.isNaN(d.getTime())) {
        return;
      }

      const key =
        d.toISOString().slice(0, 10);

      if (!map[key]) {
        map[key] = {
          label: d.toLocaleDateString(
            "en-PH",
            {
              month: "short",
              day: "numeric",
            }
          ),
          sales: 0,
          transactions: 0,
        };
      }

      map[key].sales += sale.total;
      map[key].transactions += 1;
    });

    return Object.entries(map)
      .sort(([a], [b]) =>
        a.localeCompare(b)
      )
      .slice(-30)
      .map(([, value]) => value);
  }, [completedSales]);

  /*
  |--------------------------------------------------------------------------
  | CASHIER PERFORMANCE
  |--------------------------------------------------------------------------
  */

  const cashierPerformance =
    useMemo(() => {
      const map: Record<
        string,
        {
          name: string;
          sales: number;
          transactions: number;
          items: number;
        }
      > = {};

      completedSales.forEach((sale) => {
        const name =
          sale.cashier ||
          `Cashier #${sale.cashier_id}`;

        if (!map[name]) {
          map[name] = {
            name,
            sales: 0,
            transactions: 0,
            items: 0,
          };
        }

        map[name].sales += sale.total;
        map[name].transactions += 1;
        map[name].items += sale.items;
      });

      return Object.values(map)
        .sort(
          (a, b) =>
            b.sales - a.sales
        )
        .slice(0, 10);
    }, [completedSales]);

  /*
  |--------------------------------------------------------------------------
  | PAYMENT METHODS
  |--------------------------------------------------------------------------
  */

  const paymentBreakdown =
    useMemo(() => {
      const map: Record<
        string,
        number
      > = {};

      completedSales.forEach((sale) => {
        const method =
          normalizePayment(
            sale.payment_method
          );

        map[method] =
          (map[method] || 0) +
          sale.total;
      });

      return Object.entries(map)
        .map(
          ([method, amount]) => ({
            method,
            amount,
            percentage:
              totalRevenue > 0
                ? (amount /
                    totalRevenue) *
                  100
                : 0,
          })
        )
        .sort(
          (a, b) =>
            b.amount - a.amount
        );
    }, [
      completedSales,
      totalRevenue,
    ]);

  /*
  |--------------------------------------------------------------------------
  | GENERATE REPORT
  |--------------------------------------------------------------------------
  */

  const generateReport = (
    type: ReportType
  ) => {
    setGenerating(type);

    setTimeout(() => {
      setGenerating(null);
      setGeneratedReport(type);
    }, 500);
  };

  /*
  |--------------------------------------------------------------------------
  | CSV EXPORT
  |--------------------------------------------------------------------------
  */

  const exportCSV = () => {
    if (!filteredSales.length) {
      alert("No sales data to export.");
      return;
    }

    const headers = [
      "Receipt No",
      "Date",
      "Cashier",
      "Customer",
      "Items",
      "Subtotal",
      "Discount",
      "Tax",
      "Total",
      "Payment Method",
      "Amount Paid",
      "Status",
    ];

    const rows = filteredSales.map(
      (sale) => [
        sale.receipt_no,
        dateTimeLabel(
          sale.created_at
        ),
        sale.cashier ||
          `Cashier #${sale.cashier_id}`,
        sale.customer || "Walk-in",
        sale.items,
        sale.subtotal.toFixed(2),
        sale.discount.toFixed(2),
        sale.taxtotal.toFixed(2),
        sale.total.toFixed(2),
        normalizePayment(
          sale.payment_method
        ),
        sale.amount_paid.toFixed(2),
        sale.status,
      ]
    );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `sales-report-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  };

  /*
  |--------------------------------------------------------------------------
  | PRINT REPORT
  |--------------------------------------------------------------------------
  */

  const printReport = () => {
    window.print();
  };

  const reportTypes: {
    icon: string;
    name: ReportType;
    desc: string;
  }[] = [
    {
      icon: "📊",
      name: "Sales Report",
      desc:
        "Revenue, transactions and daily performance",
    },
    {
      icon: "🧾",
      name: "Transaction Report",
      desc:
        "Complete transaction activity",
    },
    {
      icon: "💳",
      name: "Payment Methods",
      desc:
        "Payment method collection breakdown",
    },
    {
      icon: "🧑‍💼",
      name: "Employee Sales",
      desc:
        "Cashier sales performance",
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Reports
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            Real-time sales analytics and business reports
          </p>
        </div>

        <div className="flex items-center gap-2">

          <select
            value={period}
            onChange={(e) =>
              setPeriod(
                e.target.value as
                  | "Today"
                  | "7 Days"
                  | "30 Days"
                  | "All"
              )
            }
            className="h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
          >
            <option value="Today">
              Today
            </option>
            <option value="7 Days">
              Last 7 Days
            </option>
            <option value="30 Days">
              Last 30 Days
            </option>
            <option value="All">
              All Time
            </option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={exportCSV}
          >
            Export CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={printReport}
          >
            Print Report
          </Button>

        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-600">
          {error}
        </div>
      )}

      {!activeStoreId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-700">
          Select a store to view reports.
        </div>
      )}

      {/* KPI */}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

        {[
          {
            label: "Total Revenue",
            value: fmt(totalRevenue),
          },
          {
            label: "Transactions",
            value:
              transactionCount.toLocaleString(),
          },
          {
            label: "Average Order",
            value: fmt(averageOrder),
          },
          {
            label: "Items Sold",
            value:
              totalItems.toLocaleString(),
          },
          {
            label: "Refund Rate",
            value:
              refundRate.toFixed(1) + "%",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="px-4 py-4"
          >
            <p className="text-[11px] text-[#64748B]">
              {item.label}
            </p>

            <p className="text-[19px] font-bold text-[#0F172A] mt-1">
              {loading
                ? "..."
                : item.value}
            </p>

            <p className="text-[10px] text-[#94A3B8] mt-1">
              {period === "All"
                ? "All recorded data"
                : period}
            </p>
          </Card>
        ))}

      </div>

      {/* CHARTS */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <Card className="lg:col-span-2 p-5">

          <div className="mb-4">
            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Revenue Trend
            </h3>

            <p className="text-[12px] text-[#64748B]">
              Actual completed sales
            </p>
          </div>

          <ResponsiveContainer
            width="100%"
            height={250}
          >
            <AreaChart
              data={revenueChart}
            >
              <defs>
                <linearGradient
                  id="reportRevenue"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#4F46E5"
                    stopOpacity={0.18}
                  />
                  <stop
                    offset="95%"
                    stopColor="#4F46E5"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F1F5F9"
              />

              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 10,
                  fill: "#94A3B8",
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fontSize: 10,
                  fill: "#94A3B8",
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  `₱${(
                    v / 1000
                  ).toFixed(0)}k`
                }
              />

              <Tooltip
                formatter={(
                  value: unknown
                ) => [
                  fmt(Number(value)),
                  "Revenue",
                ]}
              />

              <Area
                type="monotone"
                dataKey="sales"
                stroke="#4F46E5"
                strokeWidth={2}
                fill="url(#reportRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>

        </Card>

        {/* PAYMENT */}

        <Card className="p-5">

          <h3 className="text-[14px] font-semibold text-[#0F172A]">
            Payment Methods
          </h3>

          <p className="text-[12px] text-[#64748B] mt-0.5 mb-5">
            Completed transaction collection
          </p>

          {paymentBreakdown.length ===
          0 ? (
            <div className="py-12 text-center text-[12px] text-[#94A3B8]">
              No payment data
            </div>
          ) : (
            <div className="space-y-4">

              {paymentBreakdown.map(
                (payment) => (
                  <div
                    key={payment.method}
                  >
                    <div className="flex justify-between mb-1">

                      <span className="text-[12px] text-[#374151]">
                        {payment.method}
                      </span>

                      <span className="text-[12px] font-semibold text-[#0F172A]">
                        {fmt(
                          payment.amount
                        )}
                      </span>

                    </div>

                    <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">

                      <div
                        className="h-full rounded-full bg-[#4F46E5]"
                        style={{
                          width: `${Math.min(
                            payment.percentage,
                            100
                          )}%`,
                        }}
                      />

                    </div>

                    <p className="text-[10px] text-[#94A3B8] mt-1">
                      {payment.percentage.toFixed(
                        1
                      )}
                      %
                    </p>

                  </div>
                )
              )}

            </div>
          )}

        </Card>

      </div>

      {/* CASHIER */}

      <Card className="p-5">

        <div className="mb-4">
          <h3 className="text-[14px] font-semibold text-[#0F172A]">
            Cashier Performance
          </h3>

          <p className="text-[12px] text-[#64748B]">
            Ranked by completed sales
          </p>
        </div>

        {cashierPerformance.length ===
        0 ? (
          <div className="py-10 text-center text-[12px] text-[#94A3B8]">
            No cashier sales data
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <BarChart
              data={
                cashierPerformance
              }
              margin={{
                left: 0,
                right: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F1F5F9"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 10,
                  fill: "#94A3B8",
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fontSize: 10,
                  fill: "#94A3B8",
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  `₱${(
                    v / 1000
                  ).toFixed(0)}k`
                }
              />

              <Tooltip
                formatter={(
                  value: unknown
                ) => [
                  fmt(Number(value)),
                  "Sales",
                ]}
              />

              <Bar
                dataKey="sales"
                fill="#4F46E5"
                radius={[
                  5,
                  5,
                  0,
                  0,
                ]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

      </Card>

      {/* REPORT GENERATOR */}

      <Card className="p-5">

        <div className="mb-4">
          <h3 className="text-[14px] font-semibold text-[#0F172A]">
            Generate Reports
          </h3>

          <p className="text-[12px] text-[#64748B]">
            Generate a printable report using the selected store's actual data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

          {reportTypes.map(
            (report) => (
              <button
                key={report.name}
                onClick={() =>
                  generateReport(
                    report.name
                  )
                }
                disabled={
                  !activeStoreId ||
                  loading
                }
                className="text-left p-4 rounded-xl border border-[#E2E8F0] hover:border-[#4F46E5] hover:bg-[#EEF2FF]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >

                <div className="text-2xl mb-2">
                  {report.icon}
                </div>

                <p className="text-[12px] font-semibold text-[#0F172A]">
                  {report.name}
                </p>

                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {report.desc}
                </p>

                <p className="text-[11px] text-[#4F46E5] font-medium mt-3">
                  {generating ===
                  report.name
                    ? "Generating..."
                    : "Generate →"}
                </p>

              </button>
            )
          )}

        </div>

      </Card>

      {/* GENERATED REPORT PREVIEW */}

      {generatedReport && (
        <Card className="p-6 print:shadow-none">

          <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4 mb-5">

            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#94A3B8]">
                Rhea POS
              </p>

              <h2 className="text-[20px] font-bold text-[#0F172A] mt-1">
                {generatedReport}
              </h2>

              <p className="text-[11px] text-[#64748B] mt-1">
                Period: {period}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-[#94A3B8]">
                Generated
              </p>

              <p className="text-[11px] font-medium text-[#374151]">
                {new Date().toLocaleString(
                  "en-PH"
                )}
              </p>
            </div>

          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">

            <div className="bg-[#F8FAFC] rounded-xl p-3">
              <p className="text-[10px] text-[#64748B]">
                Revenue
              </p>
              <p className="text-[16px] font-bold text-[#0F172A]">
                {fmt(totalRevenue)}
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-3">
              <p className="text-[10px] text-[#64748B]">
                Transactions
              </p>
              <p className="text-[16px] font-bold text-[#0F172A]">
                {transactionCount}
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-3">
              <p className="text-[10px] text-[#64748B]">
                Items Sold
              </p>
              <p className="text-[16px] font-bold text-[#0F172A]">
                {totalItems}
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-3">
              <p className="text-[10px] text-[#64748B]">
                Average Order
              </p>
              <p className="text-[16px] font-bold text-[#0F172A]">
                {fmt(averageOrder)}
              </p>
            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-[11px]">

              <thead>
                <tr className="border-b border-[#E2E8F0] text-left">

                  <th className="py-2">
                    Receipt
                  </th>

                  <th className="py-2">
                    Date
                  </th>

                  <th className="py-2">
                    Cashier
                  </th>

                  <th className="py-2">
                    Customer
                  </th>

                  <th className="py-2 text-right">
                    Items
                  </th>

                  <th className="py-2 text-right">
                    Total
                  </th>

                  <th className="py-2">
                    Payment
                  </th>

                  <th className="py-2">
                    Status
                  </th>

                </tr>
              </thead>

              <tbody>

                {filteredSales
                  .slice(0, 100)
                  .map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-[#F1F5F9]"
                    >

                      <td className="py-2 font-mono">
                        {sale.receipt_no}
                      </td>

                      <td className="py-2 text-[#64748B]">
                        {dateLabel(
                          sale.created_at
                        )}
                      </td>

                      <td className="py-2">
                        {sale.cashier ||
                          `Cashier #${sale.cashier_id}`}
                      </td>

                      <td className="py-2">
                        {sale.customer ||
                          "Walk-in"}
                      </td>

                      <td className="py-2 text-right">
                        {sale.items}
                      </td>

                      <td className="py-2 text-right font-semibold">
                        {fmt(
                          sale.total
                        )}
                      </td>

                      <td className="py-2">
                        {normalizePayment(
                          sale.payment_method
                        )}
                      </td>

                      <td className="py-2 capitalize">
                        {sale.status}
                      </td>

                    </tr>
                  ))}

              </tbody>

            </table>

          </div>

          <div className="flex justify-end gap-2 mt-5 print:hidden">

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setGeneratedReport(
                  null
                )
              }
            >
              Close
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={printReport}
            >
              Print Report
            </Button>

          </div>

        </Card>
      )}

    </div>
  );
}