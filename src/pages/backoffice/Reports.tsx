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

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

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
  | "Inventory Purchase Report"
  | "Product History"
  | "Employee Sales"
  | "Store Transfer Report";

type ReportFrequency = "daily" | "weekly" | "monthly" | "yearly";
type ReportScope = "current" | "all";

type GeneratedReportData = {
  report_type: string;
  scope: ReportScope;
  branch_name?: string | null;
  start_date: string;
  end_date: string;
  frequency?: ReportFrequency;
  summary?: Record<string, number>;
  trend?: Array<{ period_label: string; transactions: number; sales: number }>;
  products?: Array<{
    store_id: number;
    branch_name: string;
    product_id: number;
    product_name: string;
    sku: string;
    quantity_sold: number;
    average_unit_price: number;
    total_sales: number;
  }>;
  purchases?: Array<{
    store_id: number;
    branch_name: string;
    purchase_order_id: number;
    po_number: string;
    order_date: string;
    status: string;
    supplier_name: string;
    product_name: string;
    sku: string;
    quantity: number;
    received_quantity: number;
    unit_cost: number;
    line_total: number;
    po_total: number;
    po_paid: number;
    po_balance: number;
  }>;
  history?: Array<{
    id: number;
    store_id: number;
    branch_name: string;
    product_id: number;
    product_name: string;
    sku: string | null;
    movement_type: string | null;
    quantity: number;
    stock_before: number;
    stock_after: number;
    reference_type: string | null;
    reference_number: string | null;
    reason: string | null;
    created_at: string;
  }>;
  employees?: Array<{
    store_id: number;
    branch_name: string;
    cashier_id: number;
    employee_name: string;
    transactions: number;
    total_sales: number;
    total_paid: number;
  }>;
  transfers?: Array<{
    item_id: number;
    transfer_id: number;
    transfer_no: string;
    from_store_id: number;
    from_store: string;
    to_store_id: number;
    to_store: string;
    status: string;
    created_at: string;
    received_at: string | null;
    product_id: number;
    product_name: string;
    sku: string | null;
    quantity: number;
    received_quantity: number;
  }>;
}

function fmt(n: number) {
  return "₱" + Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtQty(n: number) {
  return Number(n || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  });
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="reports-print-summary bg-[#F8FAFC] rounded-xl p-3">
      <p className="text-[10px] text-[#64748B]">{label}</p>
      <p className="text-[16px] font-bold text-[#0F172A] mt-1">{value}</p>
    </div>
  );
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

function formatReportPeriod(
  frequency: ReportFrequency,
  startDate: string,
  endDate: string
) {
  if (frequency === "monthly") {
    return `${startDate.slice(0, 7)} → ${endDate.slice(0, 7)}`;
  }

  if (frequency === "yearly") {
    return `${startDate.slice(0, 4)} → ${endDate.slice(0, 4)}`;
  }

  return `${startDate} → ${endDate}`;
}

function getStoreDisplayName(
  data: GeneratedReportData,
  activeStoreId: number | null | undefined
) {
  if (data.scope === "all") return "All Stores";
  return data.branch_name?.trim() || "Unknown Branch";
}

function ReportTable({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[#E2E8F0] text-left">
            {columns.map((column) => (
              <th
                key={column}
                className="py-2"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
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

  const [generatedData, setGeneratedData] =
    useState<GeneratedReportData | null>(null);

  const [reportStartDate, setReportStartDate] =
    useState(() => {
      const d = new Date();
      return `${d.getFullYear()}-01-01`;
    });

  const [reportEndDate, setReportEndDate] =
    useState(() =>
      new Date().toISOString().slice(0, 10)
    );

  const [reportFrequency, setReportFrequency] =
    useState<ReportFrequency>("daily");

  const [reportScope, setReportScope] =
    useState<ReportScope>("current");

  /*
  |--------------------------------------------------------------------------
  | NORMALIZE REPORT RANGE BY FREQUENCY
  |--------------------------------------------------------------------------
  |
  | Daily  -> exact date range
  | Weekly -> exact date range
  | Monthly -> month range (stored internally as first/last day)
  | Yearly  -> year range (stored internally as Jan 1 / Dec 31)
  |--------------------------------------------------------------------------
  */

  const applyReportFrequency = (
    nextFrequency: ReportFrequency
  ) => {
    setReportFrequency(nextFrequency);

    const today = new Date();

    if (nextFrequency === "monthly") {
      const currentMonth =
        `${today.getFullYear()}-${String(
          today.getMonth() + 1
        ).padStart(2, "0")}`;

      const startMonth = reportStartDate.slice(0, 7);
      const endMonth = reportEndDate.slice(0, 7);

      setReportStartDate(
        startMonth || currentMonth
      );

      setReportEndDate(
        endMonth || currentMonth
      );

      return;
    }

    if (nextFrequency === "yearly") {
      const currentYear =
        String(today.getFullYear());

      const startYear =
        reportStartDate.slice(0, 4) ||
        currentYear;

      const endYear =
        reportEndDate.slice(0, 4) ||
        currentYear;

      setReportStartDate(
        `${startYear}-01-01`
      );

      setReportEndDate(
        `${endYear}-12-31`
      );

      return;
    }

    /*
    | Daily / Weekly return to full dates.
    */

    if (
      reportStartDate.length === 7
    ) {
      setReportStartDate(
        `${reportStartDate}-01`
      );
    }

    if (
      reportEndDate.length === 7
    ) {
      const [year, month] =
        reportEndDate.split("-").map(Number);

      const lastDay =
        new Date(
          year,
          month,
          0
        ).getDate();

      setReportEndDate(
        `${reportEndDate}-${String(
          lastDay
        ).padStart(2, "0")}`
      );
    }
  };

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

  const generateReport = async (
    type: ReportType
  ) => {
    if (!activeStoreId) {
      setError("Please select a store first.");
      return;
    }

    if (!reportStartDate || !reportEndDate) {
      setError(
        "Please select both a start date and end date."
      );
      return;
    }

    if (reportStartDate > reportEndDate) {
      setError(
        "Start date cannot be after end date."
      );
      return;
    }

    const reportTypeMap: Record<ReportType, string> = {
      "Sales Report": "sales",
      "Inventory Purchase Report": "purchases",
      "Product History": "product_history",
      "Employee Sales": "employee_sales",
      "Store Transfer Report": "transfers",
    };

    try {
      setGenerating(type);
      setError("");
      setGeneratedReport(null);
      setGeneratedData(null);

      let apiStartDate = reportStartDate;
      let apiEndDate = reportEndDate;

      if (reportFrequency === "monthly") {
        const startMonth = reportStartDate.slice(0, 7);
        const endMonth = reportEndDate.slice(0, 7);

        if (!/^\d{4}-\d{2}$/.test(startMonth) ||
            !/^\d{4}-\d{2}$/.test(endMonth)) {
          setError(
            "Please select valid start and end months."
          );
          return;
        }

        apiStartDate =
          `${startMonth}-01`;

        const [endYear, endMonthNumber] =
          endMonth.split("-").map(Number);

        const lastDay =
          new Date(
            endYear,
            endMonthNumber,
            0
          ).getDate();

        apiEndDate =
          `${endMonth}-${String(
            lastDay
          ).padStart(2, "0")}`;
      }

      if (reportFrequency === "yearly") {
        const startYear =
          reportStartDate.slice(0, 4);

        const endYear =
          reportEndDate.slice(0, 4);

        if (!/^\d{4}$/.test(startYear) ||
            !/^\d{4}$/.test(endYear)) {
          setError(
            "Please select valid start and end years."
          );
          return;
        }

        apiStartDate =
          `${startYear}-01-01`;

        apiEndDate =
          `${endYear}-12-31`;
      }

      const params = new URLSearchParams({
        report_type: reportTypeMap[type],
        start_date: apiStartDate,
        end_date: apiEndDate,
        scope: reportScope,
        store_id: String(activeStoreId),
        frequency: reportFrequency,
      });

      const response = await fetch(
        `${API_BASE}/reports/generate.php?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const text = await response.text();
      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Report API did not return valid JSON:\n${text.substring(
            0,
            500
          )}`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to generate report."
        );
      }

      setGeneratedReport(type);
      setGeneratedData({
        report_type:
          data.report_type ||
          reportTypeMap[type],
        scope:
          data.scope || reportScope,
        start_date:
          data.start_date ||
          apiStartDate,
        end_date:
          data.end_date ||
          apiEndDate,
        frequency:
          data.frequency ||
          reportFrequency,
        summary: data.summary || {},
        trend:
          Array.isArray(data.trend)
            ? data.trend
            : undefined,
        products:
          Array.isArray(data.products)
            ? data.products
            : undefined,
        purchases:
          Array.isArray(data.purchases)
            ? data.purchases
            : undefined,
        history:
          Array.isArray(data.history)
            ? data.history
            : undefined,
        employees:
          Array.isArray(data.employees)
            ? data.employees
            : undefined,
        transfers:
          Array.isArray(data.transfers)
            ? data.transfers
            : undefined,
      });
    } catch (err) {
      console.error(
        "Generate report error:",
        err
      );
      setGeneratedReport(null);
      setGeneratedData(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate report."
      );
    } finally {
      setGenerating(null);
    }
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
        "Product sales, quantity and sales revenue",
    },
    {
      icon: "📦",
      name: "Inventory Purchase Report",
      desc:
        "Purchased items, supplier costs and balances",
    },
    {
      icon: "↕️",
      name: "Product History",
      desc:
        "Complete inventory movement history",
    },
    {
      icon: "🧑‍💼",
      name: "Employee Sales",
      desc:
        "Sales performance by cashier",
    },
    {
      icon: "🔄",
      name: "Store Transfer Report",
      desc:
        "Products transferred between stores",
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          html,
          body,
          #root {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
          }

          body * {
            visibility: hidden;
          }

          .reports-screen,
          .reports-screen * {
            visibility: visible;
          }

          .reports-screen {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .reports-screen > *:not(.reports-print-area) {
            display: none !important;
          }

          .reports-screen .reports-print-area {
            display: block !important;
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .reports-print-area,
          .reports-print-area * {
            color: #111827 !important;
          }

          .reports-print-header {
            display: block !important;
          }

          .reports-print-table table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
          }

          .reports-print-table thead {
            display: table-header-group !important;
          }

          .reports-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .reports-print-table th,
          .reports-print-table td {
            border-bottom: 1px solid #d1d5db !important;
            padding: 4px 3px !important;
            font-size: 8px !important;
            line-height: 1.25 !important;
          }

          .reports-print-summary {
            border: 1px solid #d1d5db !important;
            background: #f8fafc !important;
          }

          .reports-signatures {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 16mm !important;
            margin-top: 18mm !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .reports-print-totals {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print\:hidden,
          .reports-print-actions {
            display: none !important;
          }
        }

        @media screen {
          .reports-print-header {
            display: none;
          }

          .reports-signatures {
            display: none;
          }
        }
      `}</style>

      <div className="reports-screen p-6 space-y-6 max-w-[1400px]">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Reports
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            Analytics and printable business reports
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
            Choose the report, date range, frequency and store scope.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-[11px] font-medium text-[#64748B] block mb-1">
              {reportFrequency === "monthly"
                ? "Start Month"
                : reportFrequency === "yearly"
                ? "Start Year"
                : "Start Date"}
            </label>

            {reportFrequency === "monthly" ? (
              <input
                type="month"
                value={reportStartDate.slice(0, 7)}
                onChange={(e) => {
                  if (e.target.value) {
                    setReportStartDate(
                      `${e.target.value}-01`
                    );
                  }
                }}
                className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
              />
            ) : reportFrequency === "yearly" ? (
              <input
                type="number"
                min="2000"
                max="2100"
                value={reportStartDate.slice(0, 4)}
                onChange={(e) => {
                  const year = e.target.value;
                  if (year.length <= 4) {
                    setReportStartDate(
                      `${year || "2000"}-01-01`
                    );
                  }
                }}
                className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
              />
            ) : (
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) =>
                  setReportStartDate(e.target.value)
                }
                className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
              />
            )}
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#64748B] block mb-1">
              {reportFrequency === "monthly"
                ? "End Month"
                : reportFrequency === "yearly"
                ? "End Year"
                : "End Date"}
            </label>

            {reportFrequency === "monthly" ? (
              <input
                type="month"
                value={reportEndDate.slice(0, 7)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month] =
                      e.target.value.split("-").map(Number);

                    const lastDay =
                      new Date(
                        year,
                        month,
                        0
                      ).getDate();

                    setReportEndDate(
                      `${e.target.value}-${String(
                        lastDay
                      ).padStart(2, "0")}`
                    );
                  }
                }}
                className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
              />
            ) : reportFrequency === "yearly" ? (
              <input
                type="number"
                min="2000"
                max="2100"
                value={reportEndDate.slice(0, 4)}
                onChange={(e) => {
                  const year = e.target.value;
                  if (year.length <= 4) {
                    setReportEndDate(
                      `${year || "2000"}-12-31`
                    );
                  }
                }}
                className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
              />
            ) : (
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) =>
                  setReportEndDate(e.target.value)
                }
                className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
              />
            )}
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#64748B] block mb-1">
              Report Grouping
            </label>

            <select
              value={reportFrequency}
              onChange={(e) =>
                applyReportFrequency(
                  e.target.value as ReportFrequency
                )
              }
              className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#64748B] block mb-1">
              Store Scope
            </label>
            <select
              value={reportScope}
              onChange={(e) =>
                setReportScope(
                  e.target.value as ReportScope
                )
              }
              className="w-full h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white"
            >
              <option value="current">
                Current Store
              </option>
              <option value="all">
                All Stores
              </option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {reportTypes.map((report) => (
            <button
              key={report.name}
              type="button"
              onClick={() =>
                generateReport(report.name)
              }
              disabled={
                !activeStoreId ||
                generating !== null
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
                {generating === report.name
                  ? "Generating..."
                  : "Generate →"}
              </p>
            </button>
          ))}
        </div>
      </Card>

      {generatedReport && generatedData && (
        <Card className="reports-print-area p-6 print:shadow-none reports-print-table">
          <div className="reports-print-header border-b-2 border-[#111827] pb-3 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-[#64748B]">
                  Rhea POS
                </p>
                <h1 className="text-[22px] font-bold text-[#111827] mt-1">
                  OFFICIAL BUSINESS REPORT
                </h1>
                <p className="text-[11px] text-[#374151] mt-1">
                  {generatedReport}
                </p>
              </div>

              <div className="text-right text-[10px] text-[#374151]">
                <p>
                  Store Scope:{" "}
                  <span className="font-semibold">
                    {getStoreDisplayName(
                      generatedData,
                      activeStoreId
                    )}
                  </span>
                </p>
                <p className="mt-1">
                  Period:{" "}
                  <span className="font-semibold">
                    {formatReportPeriod(
                      generatedData.frequency ||
                        reportFrequency,
                      generatedData.start_date,
                      generatedData.end_date
                    )}
                  </span>
                </p>
                <p className="mt-1">
                  Generated:{" "}
                  <span className="font-semibold">
                    {new Date().toLocaleString("en-PH")}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4 mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#94A3B8]">
                Rhea POS
              </p>

              <h2 className="text-[20px] font-bold text-[#0F172A] mt-1">
                {generatedReport}
              </h2>

              <p className="text-[11px] text-[#64748B] mt-1">
                {formatReportPeriod(
                  generatedData.frequency ||
                    reportFrequency,
                  generatedData.start_date,
                  generatedData.end_date
                )}
                {" · "}
                {getStoreDisplayName(
                  generatedData,
                  activeStoreId
                )}
                {generatedReport === "Sales Report"
                  ? ` · ${generatedData.frequency}`
                  : ""}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-[#94A3B8]">
                Generated
              </p>
              <p className="text-[11px] font-medium text-[#374151]">
                {new Date().toLocaleString("en-PH")}
              </p>
            </div>
          </div>

          {generatedReport === "Sales Report" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <InfoBox
                  label="Sales Revenue"
                  value={fmt(
                    Number(
                      generatedData.summary?.total_sales || 0
                    )
                  )}
                />
                <InfoBox
                  label="Transactions"
                  value={String(
                    generatedData.summary?.transactions || 0
                  )}
                />
                <InfoBox
                  label="Amount Paid"
                  value={fmt(
                    Number(
                      generatedData.summary?.total_paid || 0
                    )
                  )}
                />
                <InfoBox
                  label="Discount"
                  value={fmt(
                    Number(
                      generatedData.summary?.discount || 0
                    )
                  )}
                />
              </div>

              <ReportTable
                columns={[
                  "Store",
                  "Product",
                  "SKU",
                  "Qty",
                  "Avg. Unit Price",
                  "Total Sales",
                ]}
              >
                {generatedData.products?.map((row) => (
                  <tr
                    key={`${row.store_id}-${row.product_id}`}
                    className="border-b border-[#F1F5F9]"
                  >
                    <td className="py-2">
                      {row.branch_name || "Unknown Branch"}
                    </td>
                    <td className="py-2">
                      {row.product_name}
                    </td>
                    <td className="py-2 font-mono">
                      {row.sku || "—"}
                    </td>
                    <td className="py-2 text-right">
                      {fmtQty(row.quantity_sold)}
                    </td>
                    <td className="py-2 text-right">
                      {fmt(row.average_unit_price)}
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {fmt(row.total_sales)}
                    </td>
                  </tr>
                ))}

                <tr className="font-bold border-t border-[#E2E8F0]">
                  <td colSpan={5} className="py-3 text-right">
                    Total Sales
                  </td>
                  <td className="py-3 text-right">
                    {fmt(
                      Number(
                        generatedData.summary?.total_sales || 0
                      )
                    )}
                  </td>
                </tr>
              </ReportTable>
            </>
          )}

          {generatedReport === "Inventory Purchase Report" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <InfoBox
                  label="Total Purchase"
                  value={fmt(
                    Number(
                      generatedData.summary?.total_purchase || 0
                    )
                  )}
                />
                <InfoBox
                  label="Total Paid"
                  value={fmt(
                    Number(
                      generatedData.summary?.total_paid || 0
                    )
                  )}
                />
                <InfoBox
                  label="Outstanding Balance"
                  value={fmt(
                    Number(
                      generatedData.summary?.total_balance || 0
                    )
                  )}
                />
                <InfoBox
                  label="Purchase Orders"
                  value={String(
                    generatedData.summary?.purchase_orders || 0
                  )}
                />
              </div>

              <ReportTable
                columns={[
                  "Store",
                  "Product",
                  "Supplier",
                  "PO",
                  "Qty",
                  "Unit Cost",
                  "Total",
                  "PO Balance",
                ]}
              >
                {generatedData.purchases?.map(
                  (row, index) => (
                    <tr
                        key={`${row.purchase_order_id}-${row.sku || row.product_name}-${index}`}
                      className="border-b border-[#F1F5F9]"
                    >
                      <td className="py-2">
                        {row.branch_name || "Unknown Branch"}
                      </td>
                      <td className="py-2">
                        {row.product_name}
                      </td>
                      <td className="py-2">
                        {row.supplier_name}
                      </td>
                      <td className="py-2 font-mono">
                        {row.po_number}
                      </td>
                      <td className="py-2 text-right">
                        {fmtQty(row.quantity)}
                      </td>
                      <td className="py-2 text-right">
                        {fmt(row.unit_cost)}
                      </td>
                      <td className="py-2 text-right font-semibold">
                        {fmt(row.line_total)}
                      </td>
                      <td className="py-2 text-right text-amber-600 font-semibold">
                        {fmt(row.po_balance)}
                      </td>
                    </tr>
                  )
                )}

                <tr className="font-bold border-t border-[#E2E8F0]">
                  <td colSpan={7} className="py-3 text-right">
                    Total Purchase
                  </td>
                  <td className="py-3 text-right">
                    {fmt(Number(generatedData.summary?.total_purchase || 0))}
                  </td>
                </tr>
              </ReportTable>

              <div className="reports-print-totals mt-4 ml-auto max-w-[420px] border-t border-[#E2E8F0] pt-3 space-y-2">
                <div className="flex items-center justify-between text-[12px] font-semibold text-[#334155]">
                  <span>Total Purchase</span>
                  <span>{fmt(Number(generatedData.summary?.total_purchase || 0))}</span>
                </div>
                <div className="flex items-center justify-between text-[12px] font-semibold text-amber-600">
                  <span>Total Balance (Outstanding)</span>
                  <span>{fmt(Number(generatedData.summary?.total_balance || 0))}</span>
                </div>
              </div>
            </>
          )}

          {generatedReport === "Product History" && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <InfoBox
                  label="Total Movements"
                  value={String(
                    generatedData.summary?.movements || 0
                  )}
                />
                <InfoBox
                  label="Store Scope"
                  value={getStoreDisplayName(
                    generatedData,
                    activeStoreId
                  )}
                />
              </div>

              <ReportTable
                columns={[
                  "Date",
                  "Store",
                  "Product",
                  "Movement",
                  "Qty",
                  "Stock",
                  "Reference",
                ]}
              >
                {generatedData.history?.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#F1F5F9]"
                  >
                    <td className="py-2">
                      {dateTimeLabel(row.created_at)}
                    </td>
                    <td className="py-2">
                      {row.branch_name || "Unknown Branch"}
                    </td>
                    <td className="py-2">
                      {row.product_name}
                      <div className="text-[#94A3B8] font-mono">
                        {row.sku || "—"}
                      </div>
                    </td>
                    <td className="py-2">
                      {row.movement_type || "unknown"}
                    </td>
                    <td className="py-2 text-right">
                      {row.movement_type === "set_exact"
                        ? fmtQty(row.stock_after)
                        : fmtQty(Math.abs(row.quantity))}
                    </td>
                    <td className="py-2">
                      {fmtQty(row.stock_before)} →{" "}
                      {fmtQty(row.stock_after)}
                    </td>
                    <td className="py-2">
                      {row.reference_number ||
                        row.reason ||
                        "—"}
                    </td>
                  </tr>
                ))}
              </ReportTable>
            </>
          )}

          {generatedReport === "Employee Sales" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <InfoBox
                  label="Employees"
                  value={String(
                    generatedData.summary?.employees || 0
                  )}
                />
                <InfoBox
                  label="Transactions"
                  value={String(
                    generatedData.summary?.transactions || 0
                  )}
                />
                <InfoBox
                  label="Total Sales"
                  value={fmt(
                    Number(
                      generatedData.summary?.total_sales || 0
                    )
                  )}
                />
              </div>

              <ReportTable
                columns={[
                  "Store",
                  "Employee",
                  "Transactions",
                  "Sales",
                  "Paid",
                ]}
              >
                {generatedData.employees?.map((row) => (
                  <tr
                    key={`${row.store_id}-${row.cashier_id}`}
                    className="border-b border-[#F1F5F9]"
                  >
                    <td className="py-2">
                      {row.branch_name || "Unknown Branch"}
                    </td>
                    <td className="py-2 font-medium">
                      {row.employee_name}
                    </td>
                    <td className="py-2 text-right">
                      {row.transactions}
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {fmt(row.total_sales)}
                    </td>
                    <td className="py-2 text-right">
                      {fmt(row.total_paid)}
                    </td>
                  </tr>
                ))}
              </ReportTable>
            </>
          )}

          {generatedReport === "Store Transfer Report" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <InfoBox
                  label="Transfer Items"
                  value={String(
                    generatedData.summary?.items || 0
                  )}
                />
                <InfoBox
                  label="Transferred Qty"
                  value={fmtQty(
                    Number(
                      generatedData.summary?.quantity || 0
                    )
                  )}
                />
                <InfoBox
                  label="Received Qty"
                  value={fmtQty(
                    Number(
                      generatedData.summary?.received_quantity || 0
                    )
                  )}
                />
              </div>

              <ReportTable
                columns={[
                  "Transfer",
                  "From",
                  "To",
                  "Product",
                  "Qty",
                  "Received",
                  "Status",
                ]}
              >
                {generatedData.transfers?.map((row) => (
                  <tr
                    key={row.item_id}
                    className="border-b border-[#F1F5F9]"
                  >
                    <td className="py-2 font-mono">
                      {row.transfer_no}
                    </td>
                    <td className="py-2">
                      {row.from_store}
                    </td>
                    <td className="py-2">
                      {row.to_store}
                    </td>
                    <td className="py-2">
                      {row.product_name}
                      <div className="text-[#94A3B8] font-mono">
                        {row.sku || "—"}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      {fmtQty(row.quantity)}
                    </td>
                    <td className="py-2 text-right">
                      {fmtQty(row.received_quantity)}
                    </td>
                    <td className="py-2 capitalize">
                      {row.status.replace("_", " ")}
                    </td>
                  </tr>
                ))}
              </ReportTable>
            </>
          )}

          {!(
            (generatedData.products?.length || 0) ||
            (generatedData.purchases?.length || 0) ||
            (generatedData.history?.length || 0) ||
            (generatedData.employees?.length || 0) ||
            (generatedData.transfers?.length || 0)
          ) && (
            <div className="py-12 text-center text-[12px] text-[#94A3B8]">
              No data found for the selected date range and store scope.
            </div>
          )}

          <div className="reports-signatures grid-cols-3 gap-10 mt-14 pt-6 border-t border-[#CBD5E1]">
            <div>
              <p className="text-[10px] text-[#64748B] mb-10">
                Prepared by
              </p>
              <div className="border-b border-[#111827]"></div>
              <p className="text-[10px] font-semibold mt-1">
                Signature / Printed Name
              </p>
            </div>

            <div>
              <p className="text-[10px] text-[#64748B] mb-10">
                Checked by
              </p>
              <div className="border-b border-[#111827]"></div>
              <p className="text-[10px] font-semibold mt-1">
                Signature / Printed Name
              </p>
            </div>

            <div>
              <p className="text-[10px] text-[#64748B] mb-10">
                Approved by
              </p>
              <div className="border-b border-[#111827]"></div>
              <p className="text-[10px] font-semibold mt-1">
                Signature / Printed Name
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5 print:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setGeneratedReport(null);
                setGeneratedData(null);
              }}
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
    </>
  );
}