import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  StatCard,
  Table,
  Tr,
  Td,
  Badge,
  SectionHeader,
  Tabs,
} from "../components/ui";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

type DashboardCardProps = {
  children: React.ReactNode;
  className?: string;
};

function DashboardCard({
  children,
  className = "",
}: DashboardCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[#E2E8F0] bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}


interface DashboardProps {
  /**
   * Kept optional for backward compatibility with the existing parent.
   * The dashboard now manages its own store filter.
   */
  activeStoreId?: number | null;
  currency?: string;
  onNavigate?: (page: string) => void;
}

interface Store {
  id: number;
  branch_name: string;
  status?: string | null;
  currency?: string | null;
}

interface Summary {
  today_sales: number;
  today_transactions: number;
  today_items: number;
  average_transaction: number;
  low_stock: number;

  sales_trend: number;
  transactions_trend: number;
  items_trend: number;
  average_trend: number;
}

interface ChartPoint {
  label: string;
  sales: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface TopProduct {
  name: string;
  units: number;
  revenue: number;
}

interface Transaction {
  id: number;
  receipt_no: string;
  time: string;
  cashier: string;
  customer: string;
  items: number;
  total: number;
  payment: string;
  status: string;
  refund_status?: string;
}

interface DashboardData {
  summary: Summary;
  today: ChartPoint[];
  weekly: ChartPoint[];
  monthly: ChartPoint[];
  byCategory: CategoryData[];
  topProducts: TopProduct[];
  recentTransactions: Transaction[];
  refundSummary?: {
    today_refund: number;
    refunded_transactions: number;
  };
}

const COLORS = [
  "#4F46E5",
  "#0EA5E9",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
];

function formatMoney(
  value: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `₱${value.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

function statusBadge(status: string) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "completed":
      return (
        <Badge variant="success">
          Completed
        </Badge>
      );

    case "approved":
    case "refunded":
      return (
        <Badge variant="success">
          Refunded
        </Badge>
      );

    case "partial":
    case "partially_refunded":
      return (
        <Badge variant="warning">
          Partially Refunded
        </Badge>
      );

    case "rejected":
      return (
        <Badge variant="danger">
          Rejected
        </Badge>
      );

    case "voided":
      return (
        <Badge variant="neutral">
          Voided
        </Badge>
      );

    case "pending":
      return (
        <Badge variant="warning">
          Pending
        </Badge>
      );

    default:
      return (
        <Badge variant="neutral">
          {status || "Unknown"}
        </Badge>
      );
  }
}

function paymentBadge(payment: string) {
  switch (payment) {
    case "Credit Card":
      return (
        <Badge variant="primary">
          Credit Card
        </Badge>
      );

    case "Debit Card":
      return (
        <Badge variant="info">
          Debit Card
        </Badge>
      );

    case "Cash":
      return (
        <Badge variant="neutral">
          Cash
        </Badge>
      );

    default:
      return (
        <Badge variant="neutral">
          {payment}
        </Badge>
      );
  }
}

function trend(value: number) {
  if (!Number.isFinite(value)) {
    return {
      value: "0%",
      up: true,
    };
  }

  return {
    value: `${Math.abs(value).toFixed(1)}%`,
    up: value >= 0,
  };
}

export default function Dashboard({
  activeStoreId,
  currency = "PHP",
  onNavigate,
}: DashboardProps) {
  const [chartTab, setChartTab] =
    useState("Today");

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [stores, setStores] =
    useState<Store[]>([]);

  const [selectedStoreId, setSelectedStoreId] =
    useState<number | null>(null);

  const [storesLoading, setStoresLoading] =
    useState(true);

  const [storeError, setStoreError] =
    useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const query = selectedStoreId
        ? `?store_id=${encodeURIComponent(selectedStoreId)}`
        : "";

      const response = await fetch(
        `${API_BASE}/dashboard/stats.php${query}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to load dashboard."
        );
      }

      setData(result.data as DashboardData);
    } catch (err) {
      console.error(
        "Dashboard error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard."
      );

      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadStores = async () => {
      try {
        setStoresLoading(true);
        setStoreError("");

        const response = await fetch(
          `${API_BASE}/stores/topbar.php`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Unable to load stores."
          );
        }

        const activeStores: Store[] = (
          Array.isArray(result.stores)
            ? result.stores
            : []
        )
          .filter(
            (store: Store) =>
              String(store.status ?? "active")
                .trim()
                .toLowerCase() === "active"
          )
          .map((store: Store) => ({
            id: Number(store.id),
            branch_name: String(store.branch_name ?? "").trim(),
            status: store.status ?? "active",
            currency: store.currency ?? null,
          }))
          .filter(
            (store: Store) =>
              Number.isInteger(store.id) &&
              store.id > 0 &&
              store.branch_name !== ""
          );

        if (!mounted) return;

        setStores(activeStores);

        // Preserve the existing parent-selected store on first load
        // when it is still an active branch. Otherwise start with All Stores.
        const parentStoreId =
          Number(activeStoreId ?? 0);

        if (
          parentStoreId > 0 &&
          activeStores.some(
            (store) =>
              store.id === parentStoreId
          )
        ) {
          setSelectedStoreId(parentStoreId);
        } else {
          setSelectedStoreId(null);
        }
      } catch (err) {
        console.error(
          "Load dashboard stores error:",
          err
        );

        if (!mounted) return;

        setStores([]);
        setStoreError(
          err instanceof Error
            ? err.message
            : "Unable to load stores."
        );
        setSelectedStoreId(null);
      } finally {
        if (mounted) {
          setStoresLoading(false);
        }
      }
    };

    loadStores();

    return () => {
      mounted = false;
    };
  }, [activeStoreId]);

  useEffect(() => {
    if (storesLoading) return;
    loadDashboard();
  }, [selectedStoreId, storesLoading]);

  const chartData = useMemo(() => {
    if (!data) return [];

    if (chartTab === "Today") {
      return data.today;
    }

    if (chartTab === "Weekly") {
      return data.weekly;
    }

    return data.monthly;
  }, [data, chartTab]);

  const chartKey =
    chartTab === "Today"
      ? "label"
      : "label";

  if (loading) {
    return (
      <div className="p-6">
        <DashboardCard className="p-12 text-center">
          <div className="w-7 h-7 mx-auto border-2 border-[#E2E8F0] border-t-[#4F46E5] rounded-full animate-spin" />

          <p className="text-[12px] text-[#64748B] mt-3">
            Loading dashboard...
          </p>
        </DashboardCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <DashboardCard className="p-8 text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-3">
            !
          </div>

          <h3 className="text-[14px] font-semibold text-[#0F172A]">
            Failed to Load Dashboard
          </h3>

          <p className="text-[12px] text-red-500 mt-1">
            {error}
          </p>

          <button
            onClick={loadDashboard}
            className="mt-4 px-4 h-9 rounded-lg bg-[#4F46E5] text-white text-[12px] font-semibold"
          >
            Try Again
          </button>
        </DashboardCard>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const summary = data.summary;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-[1400px]">
      {/* =====================================================
          DASHBOARD TOOLBAR
      ===================================================== */}
      <DashboardCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V5l7-3 7 3v16" />
                  <path d="M9 9h1" />
                  <path d="M14 9h1" />
                  <path d="M9 13h1" />
                  <path d="M14 13h1" />
                </svg>
              </div>

              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-[#0F172A]">
                  Dashboard
                </h2>
                <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                  {selectedStoreId
                    ? "Viewing performance for the selected branch"
                    : "Viewing consolidated performance across all branches"}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[280px] shrink-0">
            <label
              htmlFor="dashboard-store-filter"
              className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-1.5"
            >
              Branch
            </label>

            <div className="relative">
              <select
                id="dashboard-store-filter"
                value={selectedStoreId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedStoreId(
                    value === "" ? null : Number(value)
                  );
                }}
                disabled={storesLoading}
                className="w-full h-10 appearance-none rounded-xl border border-[#E2E8F0] bg-white px-3 pr-10 text-[12px] font-medium text-[#0F172A] outline-none transition focus:border-[#818CF8] focus:ring-2 focus:ring-[#EEF2FF] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
              >
                <option value="">
                  All Branches
                </option>

                {stores.map((store) => (
                  <option
                    key={store.id}
                    value={store.id}
                  >
                    {store.branch_name}
                  </option>
                ))}
              </select>

              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            {storeError && (
              <p className="text-[10px] text-red-500 mt-1.5">
                {storeError}
              </p>
            )}
          </div>
        </div>
      </DashboardCard>

      {/* =====================================================
          STAT CARDS
      ===================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

        <StatCard
          label="Today's Sales"
          value={formatMoney(
            summary.today_sales,
            currency
          )}
          sub={
            (data.refundSummary?.today_refund ?? 0) > 0
              ? `${summary.today_transactions} transactions · ${formatMoney(
                  data.refundSummary?.today_refund ?? 0,
                  currency
                )} refunded`
              : `${summary.today_transactions} transactions`
          }
          trend={trend(summary.sales_trend)}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <line
                x1="12"
                y1="1"
                x2="12"
                y2="23"
              />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          accent="#4F46E5"
          iconBg="#EEF2FF"
        />

        <StatCard
          label="Today's Refunds"
          value={formatMoney(
            data.refundSummary?.today_refund ?? 0,
            currency
          )}
          sub={`${
            data.refundSummary?.refunded_transactions ?? 0
          } approved today`}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M9 14l-3-3 3-3" />
              <path d="M6 11h8a4 4 0 014 4v1" />
              <path d="M15 10l3 3-3 3" />
              <path d="M18 13h-2a4 4 0 00-4-4H6" />
            </svg>
          }
          accent="#EF4444"
          iconBg="#FEF2F2"
        />

        <StatCard
          label="Transactions"
          value={summary.today_transactions.toLocaleString()}
          sub="Today"
          trend={trend(
            summary.transactions_trend
          )}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
          }
          accent="#0EA5E9"
          iconBg="#F0F9FF"
        />

        <StatCard
          label="Avg Transaction"
          value={formatMoney(
            summary.average_transaction,
            currency
          )}
          sub="Per receipt"
          trend={trend(
            summary.average_trend
          )}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
            </svg>
          }
          accent="#10B981"
          iconBg="#F0FDF4"
        />

        <StatCard
          label="Items Sold"
          value={summary.today_items.toLocaleString()}
          sub="Units today"
          trend={trend(summary.items_trend)}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          accent="#F59E0B"
          iconBg="#FFFBEB"
        />

        <StatCard
          label="Low Stock"
          value={`${summary.low_stock}`}
          sub="Require attention"
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line
                x1="12"
                y1="9"
                x2="12"
                y2="13"
              />
              <line
                x1="12"
                y1="17"
                x2="12.01"
                y2="17"
              />
            </svg>
          }
          accent="#EF4444"
          iconBg="#FEF2F2"
        />
      </div>

      {/* =====================================================
          SALES + CATEGORY
      ===================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <DashboardCard className="lg:col-span-2 p-5">

          <div className="flex items-center justify-between mb-4">

            <div>
              <h3 className="text-[14px] font-semibold text-[#0F172A]">
                Sales Overview
              </h3>

              <p className="text-[12px] text-[#64748B] mt-0.5">
                Revenue trend
              </p>
            </div>

            <div className="shrink-0 overflow-x-auto">
            <Tabs
              tabs={[
                "Today",
                "Weekly",
                "Monthly",
              ]}
              active={chartTab}
              onChange={setChartTab}
            />
            </div>
          </div>

          <ResponsiveContainer
            width="100%"
            height={220}
          >
            <AreaChart
              data={chartData}
              margin={{
                top: 4,
                right: 4,
                bottom: 0,
                left: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="dashboardSalesGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#4F46E5"
                    stopOpacity={0.15}
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
                dataKey={chartKey}
                tick={{
                  fontSize: 11,
                  fill: "#94A3B8",
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                  fill: "#94A3B8",
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                formatter={(value: unknown) => [
                  formatMoney(
                    Number(value),
                    currency
                  ),
                  "Sales",
                ]}
                contentStyle={{
                  background: "#1E293B",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#F8FAFC",
                }}
              />

              <Area
                type="monotone"
                dataKey="sales"
                stroke="#4F46E5"
                strokeWidth={2}
                fill="url(#dashboardSalesGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#4F46E5",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </DashboardCard>

        <DashboardCard className="p-5">

          <div className="mb-4">
            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Sales by Category
            </h3>

            <p className="text-[12px] text-[#64748B] mt-0.5">
              This month
            </p>
          </div>

          {data.byCategory.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-[12px] text-[#94A3B8]">
              No category sales yet
            </div>
          ) : (
            <>
              <ResponsiveContainer
                width="100%"
                height={160}
              >
                <PieChart>
                  <Pie
                    data={data.byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.byCategory.map(
                      (_, i) => (
                        <Cell
                          key={i}
                          fill={
                            COLORS[
                              i %
                                COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    formatter={(
                      value: unknown
                    ) => [
                      formatMoney(
                        Number(value),
                        currency
                      ),
                      "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-1.5 mt-2">
                {data.byCategory
                  .slice(0, 5)
                  .map((category, i) => (
                    <div
                      key={category.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              COLORS[
                                i %
                                  COLORS.length
                              ],
                          }}
                        />

                        <span className="text-[11px] text-[#64748B]">
                          {category.name}
                        </span>
                      </div>

                      <span className="text-[11px] font-medium text-[#374151]">
                        {formatMoney(
                          category.value,
                          currency
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </DashboardCard>
      </div>

      {/* =====================================================
          TOP PRODUCTS + WEEKLY
      ===================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <DashboardCard className="p-5">
          <SectionHeader title="Top Selling Products" />

          {data.topProducts.length === 0 ? (
            <div className="py-10 text-center text-[12px] text-[#94A3B8]">
              No product sales yet
            </div>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map(
                (product, index) => {

                  const highest =
                    data.topProducts[0]
                      ?.revenue || 1;

                  return (
                    <div
                      key={`${product.name}-${index}`}
                      className="flex items-center gap-3"
                    >
                      <span className="w-5 text-[11px] font-bold text-[#CBD5E1]">
                        {index + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#0F172A] truncate">
                          {product.name}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#4F46E5]"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (product.revenue /
                                    highest) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>

                          <span className="text-[10px] text-[#94A3B8]">
                            {product.units} sold
                          </span>
                        </div>
                      </div>

                      <span className="text-[12px] font-semibold text-[#0F172A]">
                        {formatMoney(
                          product.revenue,
                          currency
                        )}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </DashboardCard>

        <DashboardCard className="p-5">
          <SectionHeader title="Weekly Sales Comparison" />

          <ResponsiveContainer
            width="100%"
            height={200}
          >
            <BarChart
              data={data.weekly}
              margin={{
                top: 4,
                right: 4,
                bottom: 0,
                left: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F1F5F9"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 11,
                  fill: "#94A3B8",
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                  fill: "#94A3B8",
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                formatter={(value: unknown) => [
                  formatMoney(
                    Number(value),
                    currency
                  ),
                  "Sales",
                ]}
                contentStyle={{
                  background: "#1E293B",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#F8FAFC",
                }}
              />

              <Bar
                dataKey="sales"
                fill="#4F46E5"
                radius={[
                  4,
                  4,
                  0,
                  0,
                ]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </DashboardCard>
      </div>

      {/* =====================================================
          RECENT TRANSACTIONS
      ===================================================== */}

      <DashboardCard>

        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">

          <div>
            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Recent Transactions
            </h3>

            <p className="text-[12px] text-[#64748B] mt-0.5">
              Latest sales activity
            </p>
          </div>

          <button
            onClick={() =>
              onNavigate?.("sales")
            }
            className="text-[12px] text-[#4F46E5] font-medium hover:text-[#4338CA]"
          >
            View all →
          </button>
        </div>

        {data.recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-[12px] text-[#94A3B8]">
            No transactions yet
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table
            headers={["Receipt #",
              "Time",
              "Cashier",
              "Customer",
              "Items",
              "Total",
              "Payment",
              "Status",
              "",]}
          >
            {data.recentTransactions.map(
              (transaction) => (
                <Tr key={transaction.id}>
                  <Td mono>
                    {transaction.receipt_no}
                  </Td>

                  <Td>
                    <span className="text-[#64748B]">
                      {transaction.time}
                    </span>
                  </Td>

                  <Td>
                    {transaction.cashier ||
                      "Unknown"}
                  </Td>

                  <Td>
                    <span
                      className={
                        transaction.customer ===
                        "Walk-in"
                          ? "text-[#94A3B8]"
                          : ""
                      }
                    >
                      {transaction.customer}
                    </span>
                  </Td>

                  <Td>
                    <span className="bg-[#F1F5F9] text-[#475569] text-[11px] font-medium px-2 py-0.5 rounded-md">
                      {transaction.items}
                    </span>
                  </Td>

                  <Td>
                    <span className="font-semibold text-[#0F172A]">
                      {formatMoney(
                        transaction.total,
                        currency
                      )}
                    </span>
                  </Td>

                  <Td>
                    {paymentBadge(
                      transaction.payment
                    )}
                  </Td>

                  <Td>
                    {statusBadge(
                      transaction.status
                    )}
                  </Td>

                  <Td>
                    <button
                      onClick={() =>
                        onNavigate?.("sales")
                      }
                      className="text-[12px] text-[#4F46E5] font-medium"
                    >
                      View
                    </button>
                  </Td>
                </Tr>
              )
            )}
          </Table>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}