import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Badge,
  Button,
  Table,
  Tr,
  Td,
  Pagination,
  Modal,
} from "../../components/ui";

const API_BASE = "http://sakuracareapi.site/rhea-pos-api";

type Product = {
  id: number;
  store_id: number;
  name: string;
  sku: string | null;
  stock: number;
  cost?: number | null;
  status?: string;
};

type Adjustment = {
  id: number;
  store_id: number;
  product_id: number;
  variant_id?: number | null;
  product: string;
  sku: string;
  type: string;
  quantity: number;
  reason: string | null;
  notes: string | null;
  before: number;
  after: number;
  reference_type?: string | null;
  reference_id?: number | null;
  reference_number?: string | null;
  created_at: string;
  user?: string | null;
};

type AdjustmentForm = {
  product_id: string;
  type: "add" | "remove" | "set";
  qty: string;
  reason: string;
  notes: string;
};

type StockAdjustmentsProps = {
  activeStoreId: number | null;
};


/*
|--------------------------------------------------------------------------
| FORMATTERS
|--------------------------------------------------------------------------
*/

function fmtQty(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}


/*
|--------------------------------------------------------------------------
| TYPE BADGE
|--------------------------------------------------------------------------
*/

const typeBadge = (type: string) => {
  switch (type) {
    case "add":
      return (
        <Badge variant="success">
          + Add
        </Badge>
      );

    case "remove":
      return (
        <Badge variant="danger">
          − Remove
        </Badge>
      );

    case "set":
      return (
        <Badge variant="info">
          ↕ Set
        </Badge>
      );

    default:
      return (
        <Badge variant="neutral">
          {type}
        </Badge>
      );
  }
};


/*
|--------------------------------------------------------------------------
| MOVEMENT COLOR
|--------------------------------------------------------------------------
*/

function getMovementColor(type: string) {
  switch (type) {
    case "add":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
      };

    case "remove":
      return {
        bg: "bg-red-50",
        text: "text-red-500",
      };

    case "set":
      return {
        bg: "bg-indigo-50",
        text: "text-indigo-600",
      };

    default:
      return {
        bg: "bg-slate-50",
        text: "text-slate-600",
      };
  }
}


/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function StockAdjustments({
  activeStoreId,
}: StockAdjustmentsProps) {

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [products, setProducts] =
    useState<Product[]>([]);

  const [adjustments, setAdjustments] =
    useState<Adjustment[]>([]);

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [loadingAdjustments, setLoadingAdjustments] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /*
  |--------------------------------------------------------------------------
  | MODALS
  |--------------------------------------------------------------------------
  */

  const [showModal, setShowModal] =
    useState(false);

  const [detailModal, setDetailModal] =
    useState<Adjustment | null>(null);


  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  const [page, setPage] =
    useState(1);

  const PER_PAGE = 10;


  /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */

  const emptyForm: AdjustmentForm = {
    product_id: "",
    type: "add",
    qty: "",
    reason: "",
    notes: "",
  };

  const [form, setForm] =
    useState<AdjustmentForm>(
      emptyForm
    );


  /*
  |--------------------------------------------------------------------------
  | LOAD PRODUCTS
  |--------------------------------------------------------------------------
  */

  const loadProducts = async () => {

    if (!activeStoreId) {
      setProducts([]);
      return;
    }

    try {

      setLoadingProducts(true);

      const response =
        await fetch(
          `${API_BASE}/products/list.php?store_id=${encodeURIComponent(
            activeStoreId
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
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
            "Failed to load products."
        );
      }

      const rows =
        Array.isArray(data.products)
          ? data.products
          : [];

      const normalized =
        rows
          .filter(
            (product: any) =>
              Number(
                product.store_id
              ) ===
              Number(
                activeStoreId
              )
          )
          .filter(
            (product: any) =>
              !product.status ||
              product.status ===
                "active"
          )
          .map(
            (product: any) => ({
              id: Number(
                product.id
              ),

              store_id: Number(
                product.store_id
              ),

              name:
                product.name ||
                "",

              sku:
                product.sku ||
                null,

              stock: Number(
                product.stock ||
                  0
              ),

              cost:
                product.cost !==
                  null &&
                product.cost !==
                  undefined
                  ? Number(
                      product.cost
                    )
                  : null,

              status:
                product.status ||
                "active",
            })
          );

      setProducts(
        normalized
      );

    } catch (err) {

      console.error(
        "Load products error:",
        err
      );

      setProducts([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load products."
      );

    } finally {

      setLoadingProducts(false);

    }
  };


  /*
  |--------------------------------------------------------------------------
  | LOAD ADJUSTMENTS
  |--------------------------------------------------------------------------
  */

  const loadAdjustments =
    async () => {

      if (!activeStoreId) {
        setAdjustments([]);
        return;
      }

      try {

        setLoadingAdjustments(
          true
        );

        const response = await fetch(
  `${API_BASE}/inventory/adjustments.php?store_id=${encodeURIComponent(
    activeStoreId
  )}`,
  {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
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
              "Failed to load adjustments."
          );
        }

        const rows = Array.isArray(data.adjustments)
  ? data.adjustments
  : Array.isArray(data.items)
  ? data.items
  : [];

        const normalized =
          rows
            .filter(
              (item: any) =>
                Number(
                  item.store_id
                ) ===
                Number(
                  activeStoreId
                )
            )
            .map(
              (item: any) => ({
                id: Number(
                  item.id
                ),

                store_id: Number(
                  item.store_id
                ),

                product_id: Number(
                  item.product_id
                ),

                variant_id:
                  item.variant_id !==
                    null &&
                  item.variant_id !==
                    undefined
                    ? Number(
                        item.variant_id
                      )
                    : null,

                product:
                  item.product ||
                  item.product_name ||
                  "Unknown Product",

                sku:
                  item.sku ||
                  "—",

                type: (() => {
  const before = Number(
    item.before ??
      item.stock_before ??
      0
  );

  const after = Number(
    item.after ??
      item.stock_after ??
      0
  );

  /*
   * Determine the adjustment type
   * from the actual stock movement.
   */

  if (after > before) {
    return "add";
  }

  if (after < before) {
    return "remove";
  }

  return "set";
})(),

                quantity: Number(
                  item.quantity ||
                    0
                ),

                reason:
                  item.reason ||
                  null,

                notes:
                  item.notes ||
                  null,

                before: Number(
                  item.before ??
                    item.stock_before ??
                    0
                ),

                after: Number(
                  item.after ??
                    item.stock_after ??
                    0
                ),

                reference_type:
                  item.reference_type ||
                  null,

                reference_id:
                  item.reference_id !==
                    null &&
                  item.reference_id !==
                    undefined
                    ? Number(
                        item.reference_id
                      )
                    : null,

                reference_number:
                  item.reference_number ||
                  null,

                created_at:
                  item.created_at ||
                  "—",

                user:
                  item.user ||
                  item.user_name ||
                  item.created_by ||
                  null,
              })
            );

        setAdjustments(
          normalized
        );

      } catch (err) {

        console.error(
          "Load adjustments error:",
          err
        );

        setAdjustments([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load adjustments."
        );

      } finally {

        setLoadingAdjustments(
          false
        );

      }
    };


  /*
  |--------------------------------------------------------------------------
  | STORE CHANGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    setProducts([]);
    setAdjustments([]);

    setPage(1);

    setError("");
    setSuccess("");

    setShowModal(false);
    setDetailModal(null);

    setForm(emptyForm);

    if (!activeStoreId) {
      return;
    }

    loadProducts();
    loadAdjustments();

  }, [activeStoreId]);


  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const refreshData = async () => {

    if (!activeStoreId) {
      return;
    }

    await Promise.all([
      loadProducts(),
      loadAdjustments(),
    ]);
  };


  /*
  |--------------------------------------------------------------------------
  | SELECTED PRODUCT
  |--------------------------------------------------------------------------
  */

  const selectedProduct =
    useMemo(() => {

      if (!form.product_id) {
        return null;
      }

      return (
        products.find(
          (product) =>
            String(
              product.id
            ) ===
            String(
              form.product_id
            )
        ) || null
      );

    }, [
      products,
      form.product_id,
    ]);


  /*
  |--------------------------------------------------------------------------
  | NEW STOCK PREVIEW
  |--------------------------------------------------------------------------
  */

  const adjustmentQuantity =
    Number(form.qty) || 0;

  const currentStock =
    selectedProduct
      ? Number(
          selectedProduct.stock
        )
      : 0;

  let newStock =
    currentStock;

  if (
    form.type === "add"
  ) {

    newStock =
      currentStock +
      adjustmentQuantity;

  } else if (
    form.type === "remove"
  ) {

    newStock =
      Math.max(
        0,
        currentStock -
          adjustmentQuantity
      );

  } else if (
    form.type === "set"
  ) {

    newStock =
      adjustmentQuantity;

  }


  /*
  |--------------------------------------------------------------------------
  | OPEN NEW ADJUSTMENT
  |--------------------------------------------------------------------------
  */

  const openNewAdjustment =
    () => {

      setError("");
      setSuccess("");

      setForm({
        product_id: "",
        type: "add",
        qty: "",
        reason: "",
        notes: "",
      });

      setShowModal(true);
    };


  /*
  |--------------------------------------------------------------------------
  | SAVE ADJUSTMENT
  |--------------------------------------------------------------------------
  */

  const saveAdjustment =
    async () => {

      if (!activeStoreId) {

        setError(
          "Please select a store first."
        );

        return;
      }

      if (!selectedProduct) {

        setError(
          "Please select a product."
        );

        return;
      }

      if (
        adjustmentQuantity <= 0
      ) {

        setError(
          "Quantity must be greater than zero."
        );

        return;
      }


      /*
      |--------------------------------------------------------------------------
      | REMOVE VALIDATION
      |--------------------------------------------------------------------------
      */

      if (
        form.type ===
          "remove" &&
        adjustmentQuantity >
          currentStock
      ) {

        setError(
          `Cannot remove ${fmtQty(
            adjustmentQuantity
          )} units. Current stock is ${fmtQty(
            currentStock
          )}.`
        );

        return;
      }


      try {

        setSaving(true);
        setError("");
        setSuccess("");


        const response =
          await fetch(
            `${API_BASE}/inventory/adjust.php`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  store_id:
                    activeStoreId,

                  product_id:
                    selectedProduct.id,

                  type:
                    form.type,

                  quantity:
                    adjustmentQuantity,

                  reason:
                    form.reason.trim(),

                  notes:
                    form.notes.trim(),
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
              "Failed to save adjustment."
          );
        }


        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

        setSuccess(
          data.message ||
            "Stock adjustment saved successfully."
        );

        setShowModal(
          false
        );

        setForm(
          emptyForm
        );


        /*
        |--------------------------------------------------------------------------
        | REFRESH REAL DATABASE DATA
        |--------------------------------------------------------------------------
        */

        await refreshData();

      } catch (err) {

        console.error(
          "Save adjustment error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to save adjustment."
        );

      } finally {

        setSaving(false);

      }
    };


  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        adjustments.length /
          PER_PAGE
      )
    );

  const paged =
    adjustments.slice(
      (page - 1) *
        PER_PAGE,

      page *
        PER_PAGE
    );


  /*
  |--------------------------------------------------------------------------
  | SUMMARY
  |--------------------------------------------------------------------------
  */

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const adjustmentsToday =
    adjustments.filter(
      (item) =>
        String(
          item.created_at
        ).startsWith(today)
    ).length;


  const stockAdded =
    adjustments
      .filter(
        (item) =>
          item.type === "add"
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.quantity
          ),
        0
      );


  const stockRemoved =
    adjustments
      .filter(
        (item) =>
          item.type === "remove"
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.quantity
          ),
        0
      );


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (

    <div className="p-6 space-y-5 max-w-[1200px]">

      {/* ================================================================
          HEADER
      ================================================================ */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Stock Adjustments
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            Manual inventory corrections and reconciliations
          </p>

        </div>


        <Button
          variant="primary"
          size="sm"
          onClick={
            openNewAdjustment
          }
          disabled={
            !activeStoreId
          }
          icon={
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line
                x1="12"
                y1="5"
                x2="12"
                y2="19"
              />

              <line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
              />
            </svg>
          }
        >
          New Adjustment
        </Button>

      </div>


      {/* ================================================================
          ERROR
      ================================================================ */}

      {error && (

        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-[11px] text-red-600">

          {error}

        </div>

      )}


      {/* ================================================================
          SUCCESS
      ================================================================ */}

      {success && (

        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-600">

          {success}

        </div>

      )}


      {/* ================================================================
          NO STORE
      ================================================================ */}

      {!activeStoreId && (

        <Card>

          <div className="py-10 text-center">

            <p className="text-[13px] font-medium text-[#475569]">
              No store selected
            </p>

            <p className="text-[11px] text-[#94A3B8] mt-1">
              Select a store from the top bar to manage stock adjustments.
            </p>

          </div>

        </Card>

      )}


      {/* ================================================================
          STAT CARDS
      ================================================================ */}

      <div className="grid grid-cols-4 gap-3">

        {[
          {
            label:
              "Adjustments Today",
            value:
              adjustmentsToday,
            color:
              "#4F46E5",
          },

          {
            label:
              "Stock Added",
            value:
              `${fmtQty(
                stockAdded
              )} units`,
            color:
              "#10B981",
          },

          {
            label:
              "Stock Removed",
            value:
              `${fmtQty(
                stockRemoved
              )} units`,
            color:
              "#EF4444",
          },

          {
            label:
              "Total This Month",
            value:
              adjustments.length,
            color:
              "#64748B",
          },
        ].map(
          (s) => (

            <Card
              key={s.label}
              className="px-5 py-4"
            >

              <p className="text-[11px] text-[#64748B] mb-1">
                {s.label}
              </p>

              <p
                className="text-[18px] font-bold"
                style={{
                  color:
                    s.color,
                }}
              >
                {s.value}
              </p>

            </Card>

          )
        )}

      </div>


      {/* ================================================================
          TABLE
      ================================================================ */}

      <Card>

        <Table
          headers={[
            "Date",
            "Product",
            "SKU",
            "Type",
            "Qty",
            "Before",
            "After",
            "Reason",
            "User",
            "",
          ]}
        >

          {loadingAdjustments ? (

            <Tr>

              <Td >

                <div className="py-10 text-center">

                  <div className="w-6 h-6 mx-auto border-2 border-[#E2E8F0] border-t-[#4F46E5] rounded-full animate-spin" />

                  <p className="text-[11px] text-[#94A3B8] mt-2">
                    Loading adjustments...
                  </p>

                </div>

              </Td>

            </Tr>

          ) : paged.length === 0 ? (

            <Tr>

              <Td >

                <div className="py-10 text-center">

                  <p className="text-[13px] font-medium text-[#475569]">
                    No stock adjustments yet
                  </p>

                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Manual inventory adjustments will appear here.
                  </p>

                </div>

              </Td>

            </Tr>

          ) : (

            paged.map(
              (a) => (

                <Tr key={a.id}>

                  <Td>

                    <span className="text-[11px] text-[#64748B]">
                      {a.created_at}
                    </span>

                  </Td>


                  <Td>

                    <span className="font-medium text-[#0F172A] max-w-[160px] truncate block">
                      {a.product}
                    </span>

                  </Td>


                  <Td mono>

                    {a.sku}

                  </Td>


                  <Td>

                    {typeBadge(
                      a.type
                    )}

                  </Td>


                  <Td>

                    <span
                      className={`
                        font-bold
                        ${
                          a.type ===
                          "add"
                            ? "text-emerald-600"
                            : a.type ===
                              "remove"
                            ? "text-red-500"
                            : "text-[#4F46E5]"
                        }
                      `}
                    >

                      {a.type ===
                      "add"
                        ? "+"
                        : a.type ===
                          "remove"
                        ? "−"
                        : "↕"}

                      {fmtQty(
                        a.quantity
                      )}

                    </span>

                  </Td>


                  <Td>

                    <span className="text-[#94A3B8]">
                      {fmtQty(
                        a.before
                      )}
                    </span>

                  </Td>


                  <Td>

                    <span className="font-semibold text-[#0F172A]">
                      {fmtQty(
                        a.after
                      )}
                    </span>

                  </Td>


                  <Td>

                    <span className="text-[#64748B] max-w-[160px] truncate block">
                      {a.reason ||
                        "—"}
                    </span>

                  </Td>


                  <Td>

                    <span className="text-[#64748B]">
                      {a.user ||
                        "Admin User"}
                    </span>

                  </Td>


                  <Td>

                    <button
                      onClick={() =>
                        setDetailModal(
                          a
                        )
                      }
                      className="text-[12px] text-[#4F46E5] font-medium hover:text-[#3730A3]"
                    >
                      Details
                    </button>

                  </Td>

                </Tr>

              )
            )

          )}

        </Table>


        <Pagination
          page={page}
          total={
            adjustments.length
          }
          perPage={
            PER_PAGE
          }
          onChange={
            setPage
          }
        />

      </Card>


      {/* ================================================================
          NEW ADJUSTMENT MODAL
      ================================================================ */}

      {showModal && (

        <Modal
          title="New Stock Adjustment"
          onClose={() => {

            if (!saving) {
              setShowModal(
                false
              );
            }

          }}
        >

          <div className="space-y-4">


            {/* PRODUCT */}

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-1">

                Product{" "}

                <span className="text-red-500">
                  *
                </span>

              </label>


              <select
                value={
                  form.product_id
                }
                onChange={(e) =>
                  setForm(
                    (f) => ({
                      ...f,
                      product_id:
                        e.target
                          .value,
                    })
                  )
                }
                disabled={
                  loadingProducts ||
                  saving
                }
                className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
              >

                <option value="">
                  {loadingProducts
                    ? "Loading products..."
                    : "Select product"}
                </option>

                {products.map(
                  (product) => (

                    <option
                      key={
                        product.id
                      }
                      value={
                        product.id
                      }
                    >
                      {product.name}
                      {product.sku
                        ? ` — ${product.sku}`
                        : ""}
                    </option>

                  )
                )}

              </select>

            </div>


            {/* CURRENT STOCK */}

            {selectedProduct && (

              <div className="bg-[#F8FAFC] rounded-xl p-3">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[12px] font-medium text-[#0F172A]">
                      {selectedProduct.name}
                    </p>

                    <p className="text-[10px] text-[#94A3B8] mt-0.5">
                      {selectedProduct.sku ||
                        "No SKU"}
                    </p>

                  </div>


                  <div className="text-right">

                    <p className="text-[10px] text-[#94A3B8]">
                      Current stock
                    </p>

                    <p className="font-bold text-[#0F172A] text-[15px]">
                      {fmtQty(
                        currentStock
                      )}{" "}
                      units
                    </p>

                  </div>

                </div>

              </div>

            )}


            {/* TYPE */}

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-2">
                Adjustment Type
              </label>


              <div className="grid grid-cols-3 gap-2">

                {[
                  {
                    v: "add",
                    l: "Add Stock",
                  },
                  {
                    v: "remove",
                    l: "Remove",
                  },
                  {
                    v: "set",
                    l: "Set Exact",
                  },
                ].map(
                  (t) => (

                    <button
                      key={t.v}
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        setForm(
                          (f) => ({
                            ...f,
                            type:
                              t.v as
                                | "add"
                                | "remove"
                                | "set",
                          })
                        )
                      }
                      className={`
                        h-10 rounded-lg border
                        text-[12px]
                        font-medium
                        transition-all

                        ${
                          form.type ===
                          t.v
                            ? t.v ===
                              "add"
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                              : t.v ===
                                "remove"
                              ? "bg-red-50 border-red-300 text-red-600"
                              : "bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5]"
                            : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                        }
                      `}
                    >
                      {t.l}
                    </button>

                  )
                )}

              </div>

            </div>


            {/* QUANTITY */}

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-1">

                {form.type ===
                "set"
                  ? "New Stock Quantity"
                  : "Quantity"}

                {" "}

                <span className="text-red-500">
                  *
                </span>

              </label>


              <input
                type="number"
                min="0"
                step="any"
                value={
                  form.qty
                }
                disabled={
                  saving
                }
                onChange={(e) =>
                  setForm(
                    (f) => ({
                      ...f,
                      qty:
                        e.target
                          .value,
                    })
                  )
                }
                placeholder={
                  form.type ===
                  "set"
                    ? "Enter new stock"
                    : "Enter quantity"
                }
                className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />


              {form.qty &&
                selectedProduct && (

                  <div className="mt-2 flex items-center justify-between">

                    <span className="text-[11px] text-[#64748B]">
                      New stock
                    </span>

                    <span
                      className={`
                        text-[12px]
                        font-semibold
                        ${
                          form.type ===
                          "add"
                            ? "text-emerald-600"
                            : form.type ===
                              "remove"
                            ? "text-red-600"
                            : "text-indigo-600"
                        }
                      `}
                    >
                      {fmtQty(
                        newStock
                      )}{" "}
                      units
                    </span>

                  </div>

                )}

            </div>


            {/* REASON */}

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-1">
                Reason
              </label>


              <select
                value={
                  form.reason
                }
                disabled={
                  saving
                }
                onChange={(e) =>
                  setForm(
                    (f) => ({
                      ...f,
                      reason:
                        e.target
                          .value,
                    })
                  )
                }
                className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
              >

                <option value="">
                  Select reason
                </option>

                <option>
                  Received shipment
                </option>

                <option>
                  Damaged goods
                </option>

                <option>
                  Inventory count correction
                </option>

                <option>
                  Theft/loss
                </option>

                <option>
                  Return to supplier
                </option>

                <option>
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
                  form.notes
                }
                disabled={
                  saving
                }
                onChange={(e) =>
                  setForm(
                    (f) => ({
                      ...f,
                      notes:
                        e.target
                          .value,
                    })
                  )
                }
                rows={2}
                placeholder="Optional notes..."
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E2E8F0] resize-none focus:outline-none focus:border-[#4F46E5]"
              />

            </div>


            {/* PREVIEW */}

            {selectedProduct &&
              adjustmentQuantity >
                0 && (

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">

                  <div>

                    <p className="text-[10px] text-[#94A3B8]">
                      Stock change
                    </p>

                    <p className="text-[12px] font-medium text-[#475569]">
                      {fmtQty(
                        currentStock
                      )}
                      {" → "}
                      {fmtQty(
                        newStock
                      )}
                    </p>

                  </div>


                  <div className="text-right">

                    <p className="text-[10px] text-[#94A3B8]">
                      Adjustment
                    </p>

                    <p
                      className={`
                        text-[13px]
                        font-bold
                        ${
                          form.type ===
                          "add"
                            ? "text-emerald-600"
                            : form.type ===
                              "remove"
                            ? "text-red-500"
                            : "text-indigo-600"
                        }
                      `}
                    >

                      {form.type ===
                      "add"
                        ? "+"
                        : form.type ===
                          "remove"
                        ? "−"
                        : "↕"}

                      {fmtQty(
                        adjustmentQuantity
                      )}

                    </p>

                  </div>

                </div>

              )}


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


              <p className="text-[10px] leading-4 text-amber-700">

                Stock adjustments are recorded in the inventory movement
                history. Purchase order receipts and sales transactions
                should use their respective transaction workflows.

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
                  saving ||
                  !selectedProduct ||
                  adjustmentQuantity <=
                    0
                }
              >

                {saving
                  ? "Saving..."
                  : "Save Adjustment"}

              </Button>


              <Button
                variant="secondary"
                onClick={() =>
                  setShowModal(
                    false
                  )
                }
                disabled={
                  saving
                }
              >
                Cancel
              </Button>

            </div>

          </div>

        </Modal>

      )}


      {/* ================================================================
          DETAILS MODAL
      ================================================================ */}

      {detailModal && (

        <Modal
          title="Adjustment Details"
          onClose={() =>
            setDetailModal(
              null
            )
          }
        >

          <div className="space-y-4">

            {/* PRODUCT */}

            <div className="bg-[#F8FAFC] rounded-xl p-4">

              <div className="flex items-start justify-between gap-3">

                <div>

                  <p className="text-[14px] font-semibold text-[#0F172A]">
                    {detailModal.product}
                  </p>

                  <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
                    {detailModal.sku}
                  </p>

                </div>

                {typeBadge(
                  detailModal.type
                )}

              </div>


              <div className="grid grid-cols-2 gap-4 mt-4">

                <div>

                  <p className="text-[10px] text-[#94A3B8]">
                    Stock Before
                  </p>

                  <p className="text-[18px] font-bold text-[#0F172A] mt-0.5">
                    {fmtQty(
                      detailModal.before
                    )}
                  </p>

                </div>


                <div>

                  <p className="text-[10px] text-[#94A3B8]">
                    Stock After
                  </p>

                  <p className="text-[18px] font-bold text-[#0F172A] mt-0.5">
                    {fmtQty(
                      detailModal.after
                    )}
                  </p>

                </div>

              </div>

            </div>


            {/* MOVEMENT */}

            <div>

              <p className="text-[12px] font-semibold text-[#0F172A]">
                Adjustment Information
              </p>

              <div className="mt-2 border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0]">

                <div className="flex items-center justify-between px-3 py-2.5">

                  <span className="text-[11px] text-[#94A3B8]">
                    Quantity
                  </span>

                  <span className="text-[12px] font-semibold text-[#0F172A]">

                    {detailModal.type ===
                    "add"
                      ? "+"
                      : detailModal.type ===
                        "remove"
                      ? "−"
                      : "↕"}

                    {fmtQty(
                      detailModal.quantity
                    )}

                  </span>

                </div>


                <div className="flex items-center justify-between px-3 py-2.5">

                  <span className="text-[11px] text-[#94A3B8]">
                    Reason
                  </span>

                  <span className="text-[12px] text-[#475569] text-right max-w-[220px]">
                    {detailModal.reason ||
                      "No reason provided"}
                  </span>

                </div>


                <div className="flex items-center justify-between px-3 py-2.5">

                  <span className="text-[11px] text-[#94A3B8]">
                    User
                  </span>

                  <span className="text-[12px] text-[#475569]">
                    {detailModal.user ||
                      "Admin User"}
                  </span>

                </div>


                <div className="flex items-center justify-between px-3 py-2.5">

                  <span className="text-[11px] text-[#94A3B8]">
                    Date
                  </span>

                  <span className="text-[12px] text-[#475569]">
                    {detailModal.created_at}
                  </span>

                </div>

              </div>

            </div>


            {/* REFERENCE */}

            {(detailModal.reference_type ||
              detailModal.reference_number) && (

              <div>

                <p className="text-[12px] font-semibold text-[#0F172A]">
                  Reference
                </p>

                <div className="mt-2 p-3 rounded-lg bg-[#F8FAFC]">

                  <p className="text-[11px] text-[#64748B]">

                    {detailModal.reference_type ||
                      "Reference"}

                  </p>

                  {detailModal.reference_number && (

                    <p className="text-[12px] font-semibold text-[#0F172A] mt-0.5">

                      {detailModal.reference_number}

                    </p>

                  )}

                </div>

              </div>

            )}


            {/* NOTES */}

            <div>

              <p className="text-[12px] font-semibold text-[#0F172A]">
                Notes
              </p>

              <div className="mt-2 p-3 rounded-lg border border-[#E2E8F0]">

                <p className="text-[11px] text-[#64748B] whitespace-pre-wrap">

                  {detailModal.notes ||
                    "No notes provided."}

                </p>

              </div>

            </div>


            {/* MOVEMENT VISUAL */}

            <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-[#F8FAFC]">

              <div className="text-center">

                <p className="text-[10px] text-[#94A3B8]">
                  Before
                </p>

                <p className="text-[20px] font-bold text-[#0F172A]">
                  {fmtQty(
                    detailModal.before
                  )}
                </p>

              </div>


              <div
                className={`
                  w-9 h-9 rounded-full
                  ${
                    getMovementColor(
                      detailModal.type
                    ).bg
                  }
                  ${
                    getMovementColor(
                      detailModal.type
                    ).text
                  }
                  flex items-center justify-center
                  font-bold
                `}
              >

                {detailModal.type ===
                "add"
                  ? "+"
                  : detailModal.type ===
                    "remove"
                  ? "−"
                  : "↕"}

              </div>


              <div className="text-center">

                <p className="text-[10px] text-[#94A3B8]">
                  After
                </p>

                <p className="text-[20px] font-bold text-[#0F172A]">
                  {fmtQty(
                    detailModal.after
                  )}
                </p>

              </div>

            </div>

          </div>

        </Modal>

      )}

    </div>
  );
}