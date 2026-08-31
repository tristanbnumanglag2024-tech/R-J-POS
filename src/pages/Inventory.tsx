import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Card,
  StatCard,
  Badge,
  Button,
  SearchBar,
  Select,
  Table,
  Tr,
  Td,
  Modal,
  Pagination,
} from "../components/ui";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type InventoryItem = {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  cost: number;
  value: number;
  status:
    | "in_stock"
    | "low_stock"
    | "out_of_stock";
  updated: string;
};

type InventorySummary = {
  total_products: number;
  total_units: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
};

type AdjustmentForm = {
  type: "add" | "remove" | "set";
  qty: string;
  reason: string;
  notes: string;
};

type HistoryItem = {
  id: number;
  movement_type: string | null;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reason: string | null;
  notes: string | null;
  created_at: string;
};

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
|
| CHANGE THIS TO YOUR PHP API URL.
|
*/

const API_BASE =
  "http://sakuracareapi.site/rhea-pos-api/inventory";

/*
|--------------------------------------------------------------------------
| STORE ID
|--------------------------------------------------------------------------
|
| Change this according to your application.
|
*/

const STORE_ID = 1;

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function fmt(n: number) {
  return (
    "$" +
    Number(n || 0).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )
  );
}

function fmtQty(n: number) {
  return Number(n || 0).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 2,
    }
  );
}

function stockBadge(
  status: InventoryItem["status"]
) {
  if (status === "out_of_stock") {
    return (
      <Badge variant="danger">
        Out of Stock
      </Badge>
    );
  }

  if (status === "low_stock") {
    return (
      <Badge variant="warning">
        Low Stock
      </Badge>
    );
  }

  return (
    <Badge variant="success">
      In Stock
    </Badge>
  );
}
function getMovementDisplay(movement: any) {
  const type = movement.movement_type;

  if (type === "add") {
    return {
      icon: "+",
      iconClass: "bg-emerald-50 text-emerald-600",
      quantityClass: "text-emerald-600",
      sign: "+",
      label: "Stock Received",
      source: movement.reason || "Inventory received",
    };
  }

  if (type === "remove") {
    return {
      icon: "−",
      iconClass: "bg-red-50 text-red-500",
      quantityClass: "text-red-500",
      sign: "-",
      label: "Stock Out",
      source: movement.reason || "Inventory removed",
    };
  }

  return {
    icon: "↕",
    iconClass: "bg-indigo-50 text-indigo-600",
    quantityClass: "text-indigo-600",
    sign: "",
    label: "Inventory Adjustment",
    source: movement.reason || "Manual adjustment",
  };
}
function getStockPercentage(
  stock: number,
  minStock: number
) {
  if (stock <= 0) return 0;

  const target =
    Math.max(minStock * 3, 1);

  return Math.min(
    100,
    (stock / target) * 100
  );
}

function getMovementLabel(
  type: string
) {
  switch (type) {

    case "receive":
      return "Stock Received";

    case "add":
      return "Stock Added";

    case "remove":
      return "Stock Removed";

    case "set":
      return "Inventory Set";

    case "sale":
      return "Sale";

    case "return":
      return "Stock Return";

    default:
      return "Inventory Movement";
  }
}

function getMovementColor(type: string | null) {
  switch (type) {
    case "receive":
    case "add":
    case "return":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
      };

    case "remove":
    case "sale":
    case "stock_out":
      return {
        bg: "bg-red-50",
        text: "text-red-500",
      };

    case "set":
    case "adjustment":
      return {
        bg: "bg-indigo-50",
        text: "text-indigo-600",
      };

    default:
      return {
        bg: "bg-slate-50",
        text: "text-slate-500",
      };
  }
}

/*
|--------------------------------------------------------------------------
| INVENTORY PAGE
|--------------------------------------------------------------------------
*/

export default function Inventory({
  activeStoreId,
}: {
  activeStoreId: number | null;
}) {

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [items, setItems] =
    useState<InventoryItem[]>([]);

  const [summary, setSummary] =
    useState<InventorySummary>({
      total_products: 0,
      total_units: 0,
      low_stock: 0,
      out_of_stock: 0,
      total_value: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [adjustModal, setAdjustModal] =
    useState<InventoryItem | null>(null);

  const [historyModal, setHistoryModal] =
    useState<InventoryItem | null>(null);

  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [adjustLoading, setAdjustLoading] =
    useState(false);

  const [adjustForm, setAdjustForm] =
    useState<AdjustmentForm>({
      type: "add",
      qty: "",
      reason: "",
      notes: "",
    });

  const PER_PAGE = 8;

  /*
  |--------------------------------------------------------------------------
  | LOAD INVENTORY
  |--------------------------------------------------------------------------
  */

  const loadInventory = useCallback(async () => {

  try {

    setLoading(true);
    setError("");

    // No store selected
    if (!activeStoreId) {

      setItems([]);

      setSummary({
        total_products: 0,
        total_units: 0,
        low_stock: 0,
        out_of_stock: 0,
        total_value: 0,
      });

      setLoading(false);

      return;
    }

    const params =
      new URLSearchParams();

    // USE THE CURRENTLY SELECTED STORE
    params.set(
      "store_id",
      String(activeStoreId)
    );

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

    const response =
      await fetch(
        `${API_BASE}/inventory.php?${params.toString()}`
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.message ||
        "Failed to load inventory."
      );

    }

    setItems(
      Array.isArray(data.items)
        ? data.items
        : []
    );

    setSummary(
      data.summary || {
        total_products: 0,
        total_units: 0,
        low_stock: 0,
        out_of_stock: 0,
        total_value: 0,
      }
    );

  } catch (err) {

    console.error(
      "Load inventory error:",
      err
    );

    setItems([]);

    setSummary({
      total_products: 0,
      total_units: 0,
      low_stock: 0,
      out_of_stock: 0,
      total_value: 0,
    });

    setError(
      err instanceof Error
        ? err.message
        : "Failed to load inventory."
    );

  } finally {

    setLoading(false);

  }

}, [
  activeStoreId,
  search,
  statusFilter,
]);

       

  /*
  |--------------------------------------------------------------------------
  | LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    loadInventory();

  }, [loadInventory]);

  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  const paged = useMemo(() => {

    return items.slice(
      (page - 1) * PER_PAGE,
      page * PER_PAGE
    );

  }, [items, page]);

  /*
  |--------------------------------------------------------------------------
  | RESET PAGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    setPage(1);

  }, [
     activeStoreId,
  search,
  statusFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | CLEAR FILTERS
  |--------------------------------------------------------------------------
  */

  const clearFilters = () => {

    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN ADJUSTMENT
  |--------------------------------------------------------------------------
  */

  const openAdjustment =
    (item: InventoryItem) => {

      setAdjustModal(item);

      setAdjustForm({
        type: "add",
        qty: "",
        reason: "",
        notes: "",
      });
    };

  /*
  |--------------------------------------------------------------------------
  | ADJUSTMENT QUANTITY
  |--------------------------------------------------------------------------
  */

  const adjustmentQuantity =
    Number(adjustForm.qty) || 0;

  /*
  |--------------------------------------------------------------------------
  | NEW STOCK
  |--------------------------------------------------------------------------
  */

  const newStock =
    adjustModal === null
      ? 0
      : adjustForm.type === "add"
      ? adjustModal.stock +
        adjustmentQuantity
      : adjustForm.type === "remove"
      ? Math.max(
          0,
          adjustModal.stock -
            adjustmentQuantity
        )
      : adjustmentQuantity;

  /*
  |--------------------------------------------------------------------------
  | SAVE ADJUSTMENT
  |--------------------------------------------------------------------------
  */

  const saveAdjustment =
    async () => {

      if (!adjustModal) return;

      if (adjustmentQuantity <= 0) {

        return;
      }

      /*
      | Prevent removing more than stock
      */

      if (
        adjustForm.type === "remove" &&
        adjustmentQuantity >
          adjustModal.stock
      ) {

        setError(
          `Cannot remove ${adjustmentQuantity} units. Current stock is ${adjustModal.stock}.`
        );

        return;
      }

      try {

        setAdjustLoading(true);
        setError("");

        const response =
          await fetch(
            `${API_BASE}/adjust.php`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                store_id:
  activeStoreId,

                product_id:
                  adjustModal.id,

                type:
                  adjustForm.type,

                quantity:
                  adjustmentQuantity,

                reason:
                  adjustForm.reason,

                notes:
                  adjustForm.notes,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
              "Failed to adjust stock."
          );
        }

        /*
        | Close modal
        */

        setAdjustModal(null);

        /*
        | Reload inventory
        */

        await loadInventory();

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Failed to adjust stock."
        );

      } finally {

        setAdjustLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | LOAD HISTORY
  |--------------------------------------------------------------------------
  */

  const openHistory =
    async (item: InventoryItem) => {

      setHistoryModal(item);
      setHistory([]);
      setHistoryLoading(true);

      try {

        const response =
          await fetch(
            `${API_BASE}/inventory-history.php?store_id=${activeStoreId}&product_id=${item.id}`
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
              "Failed to load history."
          );
        }

        setHistory(
          Array.isArray(data.history)
            ? data.history
            : []
        );

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load history."
        );

      } finally {

        setHistoryLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | EXPORT
  |--------------------------------------------------------------------------
  */

  const exportInventory =
    () => {

      const headers = [
        "Product",
        "SKU",
        "Category",
        "On Hand",
        "Minimum Stock",
        "Cost",
        "Value",
        "Status",
        "Updated",
      ];

      const rows =
        items.map((item) => [

          item.name,
          item.sku,
          item.category,
          item.stock,
          item.minStock,
          item.cost,
          item.value,
          item.status,
          item.updated,
        ]);

      const csv = [

        headers.join(","),

        ...rows.map((row) =>
          row
            .map((value) =>
              `"${String(value)
                .replace(/"/g, '""')}"`
            )
            .join(",")
        ),

      ].join("\n");

      const blob =
        new Blob(
          [csv],
          {
            type:
              "text/csv;charset=utf-8;",
          }
        );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        "inventory.csv";

      link.click();

      URL.revokeObjectURL(url);
    };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (

    <div className="p-6 space-y-5 max-w-[1400px]">

      {/* HEADER */}

      <div className="flex items-center justify-between gap-4">

        <div>

          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Inventory
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            Monitor stock levels and track inventory movements
          </p>

        </div>

        <div className="flex items-center gap-2">

          <Button
            variant="secondary"
            size="sm"
            onClick={exportInventory}
            icon={
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line
                  x1="12"
                  y1="15"
                  x2="12"
                  y2="3"
                />
              </svg>
            }
          >
            Export
          </Button>

        </div>

      </div>

      {/* ERROR */}

      {error && (

        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-50 border border-red-100">

          <p className="text-[12px] text-red-600">
            {error}
          </p>

          <button
            onClick={() => setError("")}
            className="text-red-500 text-sm"
          >
            ×
          </button>

        </div>

      )}

      {/* STAT CARDS */}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

        <StatCard
          label="Total Products"
          value={String(
            summary.total_products
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
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          accent="#4F46E5"
          iconBg="#EEF2FF"
        />

        <StatCard
          label="Total Units"
          value={Number(
            summary.total_units || 0
          ).toLocaleString()}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
          }
          accent="#0EA5E9"
          iconBg="#F0F9FF"
        />

        <StatCard
          label="Low Stock"
          value={String(
            summary.low_stock
          )}
          sub="Items need attention"
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71 3L13.71 3.86a2 2 0 00-3.42 0z" />
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
          accent="#F59E0B"
          iconBg="#FFFBEB"
        />

        <StatCard
          label="Out of Stock"
          value={String(
            summary.out_of_stock
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
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <line
                x1="15"
                y1="9"
                x2="9"
                y2="15"
              />
              <line
                x1="9"
                y1="9"
                x2="15"
                y2="15"
              />
            </svg>
          }
          accent="#EF4444"
          iconBg="#FEF2F2"
        />

        <StatCard
          label="Inventory Value"
          value={
            "$" +
            (
              Number(
                summary.total_value || 0
              ) / 1000
            ).toFixed(1) +
            "k"
          }
          sub="At cost"
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
          accent="#10B981"
          iconBg="#F0FDF4"
        />

      </div>

      {/* FILTERS */}

      <Card className="p-4">

        <div className="flex flex-wrap items-center gap-3">

          <SearchBar
            value={search}
            onChange={(value) => {
              setSearch(value);
            }}
            placeholder="Search product, SKU or category..."
          />

          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
            }}
            placeholder="All Status"
            options={[
              {
                value: "in_stock",
                label: "In Stock",
              },
              {
                value: "low_stock",
                label: "Low Stock",
              },
              {
                value: "out_of_stock",
                label: "Out of Stock",
              },
            ]}
          />

          {(search || statusFilter) && (

            <button
              onClick={clearFilters}
              className="text-[12px] text-[#64748B] underline hover:text-[#0F172A]"
            >
              Clear
            </button>

          )}

          <span className="text-[12px] text-[#94A3B8] ml-auto">

            {items.length}{" "}

            {items.length === 1
              ? "product"
              : "products"}

          </span>

        </div>

      </Card>

      {/* TABLE */}

      <Card>

        <Table
          headers={[
            "Product",
            "SKU",
            "Category",
            "On Hand",
            "Min",
            "Cost",
            "Value",
            "Status",
            "Updated",
            "Actions",
          ]}
        >

          {loading ? (
  <Tr>
    <Td>
      <div className="py-12 text-center">
        <div className="w-6 h-6 mx-auto border-2 border-[#E2E8F0] border-t-[#4F46E5] rounded-full animate-spin" />

        <p className="text-[12px] text-[#64748B] mt-3">
          Loading inventory...
        </p>
      </div>
    </Td>
  </Tr>
) : error ? (
  <Tr>
    <Td>
      <div className="py-12 text-center">
        <p className="text-[13px] font-medium text-red-500">
          Failed to load inventory
        </p>

        <p className="text-[11px] text-[#94A3B8] mt-1">
          {error}
        </p>

        <button
          onClick={loadInventory}
          className="mt-3 h-8 px-3 rounded-lg bg-[#EEF2FF] text-[#4F46E5] text-[11px] font-medium"
        >
          Try Again
        </button>
      </div>
    </Td>
  </Tr>
) : paged.length === 0 ?  (

            <Tr>

             <Td>

                <div className="py-12 text-center">

                  <div className="w-10 h-10 mx-auto rounded-full bg-[#F8FAFC] flex items-center justify-center mb-3">

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="1.8"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="7"
                      />
                      <path d="M20 20l-4-4" />
                    </svg>

                  </div>

                  <p className="text-[13px] font-medium text-[#475569]">
                    No inventory found
                  </p>

                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Try changing your search or filters.
                  </p>

                </div>

              </Td>

            </Tr>

          ) : (

            paged.map((item) => {

              const stockPercentage =
                getStockPercentage(
                  item.stock,
                  item.minStock
                );

              return (

                <Tr key={item.id}>

                  {/* PRODUCT */}

                  <Td>

                    <div className="min-w-0">

                      <p className="text-[13px] font-medium text-[#0F172A] max-w-[180px] truncate">
                        {item.name}
                      </p>

                      <p className="text-[10px] text-[#94A3B8] mt-0.5">
                        Product ID #{item.id}
                      </p>

                    </div>

                  </Td>

                  {/* SKU */}

                  <Td mono>
                    {item.sku}
                  </Td>

                  {/* CATEGORY */}

                  <Td>

                    <span className="text-[#64748B]">
                      {item.category}
                    </span>

                  </Td>

                  {/* STOCK */}

                  <Td>

                    <div className="min-w-[110px]">

                      <div className="flex items-center gap-2">

                        <span
                          className={`text-[13px] font-bold ${
                            item.stock === 0
                              ? "text-red-500"
                              : item.stock <=
                                item.minStock
                              ? "text-amber-600"
                              : "text-[#0F172A]"
                          }`}
                        >
                          {fmtQty(item.stock)}
                        </span>

                        <div className="w-14 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">

                          <div
                            className={`h-full rounded-full ${
                              item.stock === 0
                                ? "bg-red-400"
                                : item.stock <=
                                  item.minStock
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                            }`}
                            style={{
                              width:
                                `${stockPercentage}%`,
                            }}
                          />

                        </div>

                      </div>

                    </div>

                  </Td>

                  {/* MIN */}

                  <Td>

                    <span className="text-[#94A3B8]">
                      {fmtQty(
                        item.minStock
                      )}
                    </span>

                  </Td>

                  {/* COST */}

                  <Td>

                    <span className="text-[#64748B]">
                      {fmt(item.cost)}
                    </span>

                  </Td>

                  {/* VALUE */}

                  <Td>

                    <span className="font-semibold text-[#0F172A]">
                      {fmt(item.value)}
                    </span>

                  </Td>

                  {/* STATUS */}

                  <Td>

                    {stockBadge(
                      item.status
                    )}

                  </Td>

                  {/* UPDATED */}

                  <Td>

                    <span className="text-[#94A3B8] text-[11px]">
                      {item.updated}
                    </span>

                  </Td>

                  {/* ACTIONS */}

                  <Td>

                    <div className="flex items-center gap-1">

                      <button
                        onClick={() =>
                          openHistory(item)
                        }
                        className="h-7 px-2.5 rounded-md bg-[#F1F5F9] text-[#475569] text-[11px] font-medium hover:bg-[#E2E8F0] transition-colors"
                      >
                        History
                      </button>

                      <button
                        onClick={() =>
                          openAdjustment(item)
                        }
                        className="h-7 px-2.5 rounded-md bg-[#EEF2FF] text-[#4F46E5] text-[11px] font-medium hover:bg-[#E0E7FF] transition-colors"
                      >
                        Adjust
                      </button>

                    </div>

                  </Td>

                </Tr>

              );
            })

          )}

        </Table>

        <Pagination
          page={page}
          total={items.length}
          perPage={PER_PAGE}
          onChange={setPage}
        />

      </Card>

      {/* ================================================================ */}
      {/* HISTORY MODAL */}
      {/* ================================================================ */}

      {historyModal && (

        <Modal
          title="Stock History"
          onClose={() =>
            setHistoryModal(null)
          }
        >

          <div className="space-y-4">

           {/* PRODUCT */}

<div className="bg-[#F8FAFC] rounded-xl p-4">

  <div className="flex items-start justify-between gap-3">

    <div>

      <p className="text-[14px] font-semibold text-[#0F172A]">
        {historyModal.name}
      </p>

      <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
        {historyModal.sku}
      </p>

    </div>

    {stockBadge(historyModal.status)}

  </div>

  <div className="grid grid-cols-2 gap-3 mt-4">

    <div>

      <p className="text-[10px] text-[#94A3B8]">
        Current Stock
      </p>

      <p className="text-[18px] font-bold text-[#0F172A] mt-0.5">
        {fmtQty(historyModal.stock)}
      </p>

    </div>

    <div>

      <p className="text-[10px] text-[#94A3B8]">
        Minimum Stock
      </p>

      <p className="text-[18px] font-bold text-[#0F172A] mt-0.5">
        {fmtQty(historyModal.minStock)}
      </p>

    </div>

  </div>

</div>


{/* HISTORY */}

<div>

  <div className="flex items-center justify-between mb-3">

    <div>

      <p className="text-[12px] font-semibold text-[#0F172A]">
        Stock Movements
      </p>

      <p className="text-[10px] text-[#94A3B8]">
        Actual inventory movement records
      </p>

    </div>

  </div>


  {/* LOADING */}

  {historyLoading ? (

    <div className="py-8 text-center">

      <div className="w-6 h-6 mx-auto border-2 border-[#E2E8F0] border-t-[#4F46E5] rounded-full animate-spin" />

      <p className="text-[11px] text-[#94A3B8] mt-2">
        Loading history...
      </p>

    </div>


  ) : history.length === 0 ? (

    /* NO HISTORY */

    <div className="py-8 text-center border border-dashed border-[#E2E8F0] rounded-lg">

      <p className="text-[12px] font-medium text-[#64748B]">
        No stock movements yet
      </p>

      <p className="text-[10px] text-[#94A3B8] mt-1">
        Inventory movements will appear here.
      </p>

    </div>


  ) : (

    /* HISTORY LIST */

    <div className="space-y-2">

      {history.map((movement) => {

        /*
        |--------------------------------------------------------------------------
        | MOVEMENT TYPE
        |--------------------------------------------------------------------------
        */

        const movementType =
          String(
            movement.movement_type || ""
          ).toLowerCase();


        /*
        |--------------------------------------------------------------------------
        | DETERMINE MOVEMENT DIRECTION
        |--------------------------------------------------------------------------
        */

        const isRemove =
          movementType === "remove" ||
          movementType === "sale" ||
          movementType === "stock_out";


        const isAdd =
          movementType === "add" ||
          movementType === "receive" ||
          movementType === "return";


        const isAdjustment =
          movementType === "set" ||
          movementType === "adjustment";


        /*
        |--------------------------------------------------------------------------
        | FALLBACK DIRECTION
        |--------------------------------------------------------------------------
        */

        const isStockIncrease =
          Number(movement.stock_after) >
          Number(movement.stock_before);


        const isStockDecrease =
          Number(movement.stock_after) <
          Number(movement.stock_before);


        /*
        |--------------------------------------------------------------------------
        | ICON
        |--------------------------------------------------------------------------
        */

        let movementIcon = "↕";

        if (isRemove) {

          movementIcon = "−";

        } else if (isAdd) {

          movementIcon = "+";

        } else if (isAdjustment) {

          movementIcon = "↕";

        } else if (isStockDecrease) {

          movementIcon = "−";

        } else if (isStockIncrease) {

          movementIcon = "+";

        }


        /*
        |--------------------------------------------------------------------------
        | SIGN
        |--------------------------------------------------------------------------
        */

        let movementSign = "";

        if (isRemove) {

          movementSign = "−";

        } else if (isAdd) {

          movementSign = "+";

        } else if (isAdjustment) {

          movementSign = "↕";

        } else if (isStockDecrease) {

          movementSign = "−";

        } else if (isStockIncrease) {

          movementSign = "+";

        }


        /*
        |--------------------------------------------------------------------------
        | COLOR
        |--------------------------------------------------------------------------
        */

        const color =
          getMovementColor(
            movementType
          );


        return (

          <div
            key={movement.id}
            className="flex items-center justify-between gap-3 p-3 border border-[#E2E8F0] rounded-lg"
          >

            {/* LEFT */}

            <div className="flex items-center gap-3 min-w-0">

              {/* ICON */}

              <div
                className={`
                  w-8 h-8
                  rounded-full
                  ${color.bg}
                  ${color.text}
                  flex
                  items-center
                  justify-center
                  shrink-0
                  text-[15px]
                  font-semibold
                `}
              >

                {movementIcon}

              </div>


              {/* MOVEMENT DETAILS */}

              <div className="min-w-0">

                <p className="text-[12px] font-medium text-[#0F172A] truncate">

                  {getMovementLabel(
                    movementType
                  )}

                </p>


                <p className="text-[10px] text-[#94A3B8] truncate">

                  {movement.reason ||
                    "No reason provided"}

                </p>


                {movement.notes && (

                  <p className="text-[10px] text-[#64748B] mt-0.5 truncate">

                    {movement.notes}

                  </p>

                )}

              </div>

            </div>


            {/* RIGHT */}

            <div className="text-right shrink-0">

              {/* QUANTITY */}

              <p
                className={`
                  text-[12px]
                  font-bold
                  ${color.text}
                `}
              >

                {movementSign}

                {fmtQty(
                  Number(
                    movement.quantity
                  )
                )}

              </p>


              {/* STOCK CHANGE */}

              <p className="text-[10px] text-[#94A3B8]">

                {fmtQty(
                  Number(
                    movement.stock_before
                  )
                )}

                {" → "}

                {fmtQty(
                  Number(
                    movement.stock_after
                  )
                )}

              </p>


              {/* DATE */}

              <p className="text-[9px] text-[#CBD5E1]">

                {movement.created_at}

              </p>

            </div>

          </div>

        );

      })}

    </div>

  )}

</div>

</div>

        </Modal>

      )}

      {/* ================================================================ */}
      {/* ADJUSTMENT MODAL */}
      {/* ================================================================ */}

      {adjustModal && (

        <Modal
          title="Adjust Stock"
          onClose={() => {

            if (!adjustLoading) {
              setAdjustModal(null);
            }

          }}
        >

          <div className="space-y-4">

            {/* PRODUCT */}

            <div className="bg-[#F8FAFC] rounded-xl p-4">

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-[13px] font-semibold text-[#0F172A]">
                    {adjustModal.name}
                  </p>

                  <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
                    {adjustModal.sku}
                  </p>

                </div>

                {stockBadge(
                  adjustModal.status
                )}

              </div>

              <div className="flex items-center gap-2 mt-3">

                <span className="text-[12px] text-[#64748B]">
                  Current Stock:
                </span>

                <span className="text-[14px] font-bold text-[#0F172A]">
                  {fmtQty(
                    adjustModal.stock
                  )}{" "}
                  units
                </span>

              </div>

            </div>

            {/* TYPE */}

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-2">
                Adjustment Type
              </label>

              <div className="grid grid-cols-3 gap-2">

                {[
                  {
                    value: "add",
                    label: "Add Stock",
                  },
                  {
                    value: "remove",
                    label: "Remove",
                  },
                  {
                    value: "set",
                    label: "Set Exact",
                  },
                ].map((type) => {

                  const selected =
                    adjustForm.type ===
                    type.value;

                  return (

                    <button
                      key={type.value}
                      type="button"
                      disabled={adjustLoading}
                      onClick={() =>
                        setAdjustForm(
                          (form) => ({
                            ...form,

                            type:
                              type.value as
                                | "add"
                                | "remove"
                                | "set",
                          })
                        )
                      }
                      className={`h-10 rounded-lg border text-[12px] font-medium transition-all ${
                        selected
                          ? type.value ===
                            "add"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : type.value ===
                              "remove"
                            ? "bg-red-50 border-red-300 text-red-600"
                            : "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {type.label}
                    </button>

                  );
                })}

              </div>

            </div>

            {/* QUANTITY */}

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-1">

                {adjustForm.type ===
                "set"
                  ? "New Stock Quantity"
                  : "Quantity"}

                <span className="text-red-500">
                  {" "}*
                </span>

              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={
                  adjustForm.qty
                }
                disabled={
                  adjustLoading
                }
                onChange={(e) =>
                  setAdjustForm(
                    (form) => ({
                      ...form,
                      qty: e.target.value,
                    })
                  )
                }
                placeholder="Enter quantity"
                className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 disabled:bg-[#F8FAFC]"
              />

              {adjustForm.qty && (

                <div className="mt-2 flex items-center justify-between">

                  <span className="text-[11px] text-[#64748B]">
                    New stock
                  </span>

                  <span
                    className={`text-[12px] font-semibold ${
                      adjustForm.type ===
                      "add"
                        ? "text-emerald-600"
                        : adjustForm.type ===
                          "remove"
                        ? "text-red-600"
                        : "text-indigo-600"
                    }`}
                  >
                    {fmtQty(
                      newStock
                    )}{" "}
                    units
                  </span>

                </div>

              )}

              {adjustForm.type ===
                "remove" &&
                adjustmentQuantity >
                  adjustModal.stock && (

                <p className="text-[10px] text-red-500 mt-1">

                  Quantity cannot exceed current stock.

                </p>

              )}

            </div>

            {/* REASON */}

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-1">
                Reason
              </label>

              <select
                value={
                  adjustForm.reason
                }
                disabled={
                  adjustLoading
                }
                onChange={(e) =>
                  setAdjustForm(
                    (form) => ({
                      ...form,
                      reason:
                        e.target.value,
                    })
                  )
                }
                className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5] bg-white disabled:bg-[#F8FAFC]"
              >

                <option value="">
                  Select reason
                </option>

                <option value="Inventory count correction">
                  Inventory count correction
                </option>

                <option value="Damaged goods">
                  Damaged goods
                </option>

                <option value="Theft / Loss">
                  Theft / Loss
                </option>

                <option value="Return to supplier">
                  Return to supplier
                </option>

                <option value="Other">
                  Other
                </option>

              </select>

            </div>

            {/* NOTES */}

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-1">
                Notes
              </label>

              <textarea
                value={
                  adjustForm.notes
                }
                disabled={
                  adjustLoading
                }
                onChange={(e) =>
                  setAdjustForm(
                    (form) => ({
                      ...form,
                      notes:
                        e.target.value,
                    })
                  )
                }
                placeholder="Add notes about this adjustment..."
                rows={3}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5] resize-none disabled:bg-[#F8FAFC]"
              />

            </div>

            {/* WARNING */}

            <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">

              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#D97706"
                strokeWidth="2"
                className="mt-0.5 shrink-0"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71 3L13.71 3.86a2 2 0 00-3.42 0z" />
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

              <p className="text-[10px] leading-4 text-amber-700">

                Purchase order receipts update
                inventory automatically.
                Use manual adjustments only
                for inventory corrections.
                Sales transactions can be
                connected later.

              </p>

            </div>

            {/* ACTIONS */}

            <div className="flex gap-3 pt-1">

              <Button
                variant="primary"
                onClick={
                  saveAdjustment
                }
                disabled={
                  adjustLoading ||
                  !adjustForm.qty ||
                  adjustmentQuantity <=
                    0 ||
                  (
                    adjustForm.type ===
                      "remove" &&
                    adjustmentQuantity >
                      adjustModal.stock
                  )
                }
              >

                {adjustLoading
                  ? "Saving..."
                  : "Save Adjustment"}

              </Button>

              <Button
                variant="secondary"
                disabled={
                  adjustLoading
                }
                onClick={() =>
                  setAdjustModal(null)
                }
              >
                Cancel
              </Button>

            </div>

          </div>

        </Modal>

      )}

    </div>
  );
}