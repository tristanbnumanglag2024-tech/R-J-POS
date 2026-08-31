import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Card,
  Badge,
  Button,
  Table,
  Tr,
  Td,
  Modal,
  Input,
  Select,
  Toggle,
} from "../../components/ui";

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "http://sakuracareapi.site/rhea-pos-api";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type DiscountType =
  | "percentage"
  | "fixed";

type DiscountScope =
  | "order"
  | "category"
  | "product";

type DiscountStatus =
  | "active"
  | "inactive"
  | "expired"
  | "scheduled";

interface Discount {
  id: number;
  store_id: number;

  name: string;
  code: string;

  type: DiscountType;
  value: number;

  scope: DiscountScope;

  minOrder: number;

  uses: number;
  maxUses: number | null;

  starts: string;
  ends: string | null;

  status: DiscountStatus;
}

interface DiscountForm {
  name: string;
  code: string;
  type: DiscountType;
  value: string;

  scope: DiscountScope;

  minOrder: string;
  maxUses: string;

  starts: string;
  ends: string;

  status: boolean;
}

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

interface DiscountsProps {
  activeStoreId?: number | null;
}

export default function Discounts({
  activeStoreId,
}: DiscountsProps) {

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [list, setList] =
    useState<Discount[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showAdd, setShowAdd] =
    useState(false);

  const [editDiscount, setEditDiscount] =
    useState<Discount | null>(null);

  const [form, setForm] =
    useState<DiscountForm>({
      name: "",
      code: "",
      type: "percentage",
      value: "",
      scope: "order",
      minOrder: "",
      maxUses: "",
      starts: "",
      ends: "",
      status: true,
    });

  /*
  |--------------------------------------------------------------------------
  | FORM SETTER
  |--------------------------------------------------------------------------
  */

  const set = (
    key: keyof DiscountForm
  ) => (
    value: string | boolean
  ) => {

    setForm((current) => ({
      ...current,
      [key]: value,
    }));

  };

  /*
  |--------------------------------------------------------------------------
  | RESET FORM
  |--------------------------------------------------------------------------
  */

  const resetForm = () => {

    setForm({
      name: "",
      code: "",
      type: "percentage",
      value: "",
      scope: "order",
      minOrder: "",
      maxUses: "",
      starts: "",
      ends: "",
      status: true,
    });

    setEditDiscount(null);
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD DISCOUNTS
  |--------------------------------------------------------------------------
  */

  const loadDiscounts =
    useCallback(async () => {

      if (!activeStoreId) {

        setList([]);

        return;
      }

      try {

        setLoading(true);
        setError("");
        setSuccess("");

        const params =
          new URLSearchParams();

        params.set(
          "store_id",
          String(activeStoreId)
        );

        const response =
          await fetch(
            `${API_BASE}/discounts/list.php?${params.toString()}`,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        const text =
          await response.text();

        console.log(
          "discounts/list.php RAW RESPONSE:",
          text
        );

        let data: any;

        try {

          data =
            JSON.parse(text);

        } catch {

          throw new Error(
            "The discount server returned invalid JSON."
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
              "Failed to load discounts."
          );
        }

        /*
        |--------------------------------------------------------------------------
        | ACCEPT DIFFERENT RESPONSE NAMES
        |--------------------------------------------------------------------------
        */

        const serverDiscounts =
          Array.isArray(data.discounts)
            ? data.discounts
            : Array.isArray(data.items)
            ? data.items
            : [];

        /*
        |--------------------------------------------------------------------------
        | NORMALIZE DATA
        |--------------------------------------------------------------------------
        */

        const normalized: Discount[] =
          serverDiscounts.map(
            (discount: any) => {

              return {
                id: Number(
                  discount.id
                ),

                store_id: Number(
                  discount.store_id ??
                    activeStoreId
                ),

                name:
                  discount.name ??
                  "",

                code:
                  discount.code ??
                  "",

                type:
                  discount.type ===
                  "fixed"
                    ? "fixed"
                    : "percentage",

                value: Number(
                  discount.value ?? 0
                ),

                scope:
                  discount.scope ===
                    "category" ||
                  discount.scope ===
                    "product"
                    ? discount.scope
                    : "order",

                minOrder: Number(
                  discount.minOrder ??
                    discount.min_order ??
                    0
                ),

                uses: Number(
                  discount.uses ??
                    discount.usage_count ??
                    0
                ),

                maxUses:
                  discount.maxUses !==
                    undefined &&
                  discount.maxUses !==
                    null &&
                  discount.maxUses !==
                    ""
                    ? Number(
                        discount.maxUses
                      )
                    : discount.max_uses !==
                        undefined &&
                      discount.max_uses !==
                        null &&
                      discount.max_uses !==
                        ""
                    ? Number(
                        discount.max_uses
                      )
                    : null,

                starts:
                  discount.starts ??
                  discount.start_date ??
                  "",

                ends:
                  discount.ends ??
                  discount.end_date ??
                  null,

                status:
                  discount.status ??
                  "inactive",
              };

            }
          );

        /*
        |--------------------------------------------------------------------------
        | EXTRA STORE SAFETY
        |--------------------------------------------------------------------------
        |
        | Even if the API accidentally returns another store,
        | do not display it.
        |
        */

        const storeDiscounts =
          normalized.filter(
            (discount) =>
              Number(
                discount.store_id
              ) ===
              Number(activeStoreId)
          );

        setList(
          storeDiscounts
        );

      } catch (err) {

        console.error(
          "Load discounts error:",
          err
        );

        setList([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load discounts."
        );

      } finally {

        setLoading(false);

      }

    }, [activeStoreId]);

  /*
  |--------------------------------------------------------------------------
  | LOAD WHEN STORE CHANGES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    setList([]);
    setError("");
    setSuccess("");

    resetForm();

    setShowAdd(false);

    if (!activeStoreId) {
      return;
    }

    loadDiscounts();

  }, [
    activeStoreId,
    loadDiscounts,
  ]);

  /*
  |--------------------------------------------------------------------------
  | STATUS BADGE
  |--------------------------------------------------------------------------
  */

  const statusBadge = (
    status: string
  ) => {

    if (
      status === "active"
    ) {

      return (
        <Badge variant="success">
          Active
        </Badge>
      );

    }

    if (
      status === "expired"
    ) {

      return (
        <Badge variant="neutral">
          Expired
        </Badge>
      );

    }

    if (
      status === "scheduled"
    ) {

      return (
        <Badge variant="info">
          Scheduled
        </Badge>
      );

    }

    return (
      <Badge variant="neutral">
        {status}
      </Badge>
    );

  };

  /*
  |--------------------------------------------------------------------------
  | OPEN ADD
  |--------------------------------------------------------------------------
  */

  const openAdd = () => {

    resetForm();

    setError("");
    setSuccess("");

    setShowAdd(true);

  };

  /*
  |--------------------------------------------------------------------------
  | OPEN EDIT
  |--------------------------------------------------------------------------
  */

  const openEdit = (
    discount: Discount
  ) => {

    /*
    |--------------------------------------------------------------------------
    | STORE SAFETY
    |--------------------------------------------------------------------------
    */

    if (
      Number(
        discount.store_id
      ) !==
      Number(activeStoreId)
    ) {

      setError(
        "This discount does not belong to the selected store."
      );

      return;
    }

    setEditDiscount(
      discount
    );

    setForm({

      name:
        discount.name,

      code:
        discount.code,

      type:
        discount.type,

      value:
        String(
          discount.value
        ),

      scope:
        discount.scope,

      minOrder:
        String(
          discount.minOrder
        ),

      maxUses:
        discount.maxUses !==
        null
          ? String(
              discount.maxUses
            )
          : "",

      starts:
        discount.starts ||
        "",

      ends:
        discount.ends ||
        "",

      status:
        discount.status ===
          "active" ||
        discount.status ===
          "scheduled",

    });

    setError("");
    setSuccess("");

    setShowAdd(true);

  };

  /*
  |--------------------------------------------------------------------------
  | SAVE DISCOUNT
  |--------------------------------------------------------------------------
  */

  const handleSave =
    async () => {

      if (!activeStoreId) {

        setError(
          "Please select a store first."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATION
      |--------------------------------------------------------------------------
      */

      if (
        !form.name.trim()
      ) {

        setError(
          "Discount name is required."
        );

        return;
      }

      const value =
        Number(
          form.value
        );

      if (
        !Number.isFinite(value) ||
        value <= 0
      ) {

        setError(
          "Discount value must be greater than zero."
        );

        return;
      }

      if (
        form.type ===
          "percentage" &&
        value > 100
      ) {

        setError(
          "Percentage discount cannot be greater than 100."
        );

        return;
      }

      const minOrder =
        form.minOrder.trim() === ""
          ? 0
          : Number(
              form.minOrder
            );

      if (
        !Number.isFinite(
          minOrder
        ) ||
        minOrder < 0
      ) {

        setError(
          "Minimum order must be zero or greater."
        );

        return;
      }

      const maxUses =
        form.maxUses.trim() === ""
          ? null
          : Number(
              form.maxUses
            );

      if (
        maxUses !== null &&
        (
          !Number.isFinite(
            maxUses
          ) ||
          maxUses <= 0
        )
      ) {

        setError(
          "Maximum uses must be greater than zero."
        );

        return;
      }

      try {

        setSaving(true);
        setError("");
        setSuccess("");

        /*
        |--------------------------------------------------------------------------
        | PAYLOAD
        |--------------------------------------------------------------------------
        */

        const payload = {

          id:
            editDiscount
              ? editDiscount.id
              : undefined,

          store_id:
            Number(
              activeStoreId
            ),

          name:
            form.name.trim(),

          code:
            form.code
              .trim()
              .toUpperCase(),

          type:
            form.type,

          value,

          scope:
            form.scope,

          min_order:
            minOrder,

          max_uses:
            maxUses,

          starts:
            form.starts ||
            null,

          ends:
            form.ends ||
            null,

          status:
            form.status
              ? "active"
              : "inactive",

        };

        /*
        |--------------------------------------------------------------------------
        | ENDPOINT
        |--------------------------------------------------------------------------
        */

        const endpoint =
          editDiscount
            ? `${API_BASE}/discounts/update.php`
            : `${API_BASE}/discounts/create.php`;

        /*
        |--------------------------------------------------------------------------
        | REQUEST
        |--------------------------------------------------------------------------
        */

        const response =
          await fetch(
            endpoint,
            {
              method: "POST",

              headers: {

                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",

              },

              body:
                JSON.stringify(
                  payload
                ),

            }
          );

        /*
        |--------------------------------------------------------------------------
        | RAW RESPONSE
        |--------------------------------------------------------------------------
        */

        const text =
          await response.text();

        console.log(
          "Discount save RAW RESPONSE:",
          text
        );

        let data: any;

        try {

          data =
            JSON.parse(text);

        } catch {

          throw new Error(
            "The discount server returned invalid JSON."
          );

        }

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
              "Unable to save discount."
          );

        }

        /*
        |--------------------------------------------------------------------------
        | CLOSE MODAL
        |--------------------------------------------------------------------------
        */

        setShowAdd(false);

        resetForm();

        setSuccess(
          data.message ||
            (
              editDiscount
                ? "Discount updated successfully."
                : "Discount created successfully."
            )
        );

        /*
        |--------------------------------------------------------------------------
        | RELOAD FROM DATABASE
        |--------------------------------------------------------------------------
        */

        await loadDiscounts();

      } catch (err) {

        console.error(
          "Save discount error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to save discount."
        );

      } finally {

        setSaving(false);

      }

    };

  /*
  |--------------------------------------------------------------------------
  | DELETE DISCOUNT
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async (
      discount: Discount
    ) => {

      if (!activeStoreId) {

        setError(
          "Please select a store first."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | STORE SAFETY
      |--------------------------------------------------------------------------
      */

      if (
        Number(
          discount.store_id
        ) !==
        Number(activeStoreId)
      ) {

        setError(
          "You cannot delete a discount from another store."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Delete discount "${discount.name}"?\n\nThis action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {

        setError("");
        setSuccess("");

        /*
        |--------------------------------------------------------------------------
        | DELETE REQUEST
        |--------------------------------------------------------------------------
        */

        const response =
          await fetch(
            `${API_BASE}/discounts/delete.php`,
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

                  id:
                    discount.id,

                  store_id:
                    Number(
                      activeStoreId
                    ),

                }),

            }
          );

        const text =
          await response.text();

        console.log(
          "Discount delete RAW RESPONSE:",
          text
        );

        let data: any;

        try {

          data =
            JSON.parse(text);

        } catch {

          throw new Error(
            "The discount server returned invalid JSON."
          );

        }

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
              "Unable to delete discount."
          );

        }

        setSuccess(
          data.message ||
            "Discount deleted successfully."
        );

        /*
        |--------------------------------------------------------------------------
        | RELOAD DATABASE DATA
        |--------------------------------------------------------------------------
        */

        await loadDiscounts();

      } catch (err) {

        console.error(
          "Delete discount error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to delete discount."
        );

      }

    };

  /*
  |--------------------------------------------------------------------------
  | NO STORE SELECTED
  |--------------------------------------------------------------------------
  */

  if (!activeStoreId) {

    return (

      <div className="p-6">

        <Card className="p-10">

          <div className="text-center">

            <div className="w-12 h-12 mx-auto rounded-xl bg-[#EEF2FF] flex items-center justify-center text-2xl mb-3">
              🏪
            </div>

            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Select a Store
            </h3>

            <p className="text-[12px] text-[#64748B] mt-1">
              Please select a store before managing discounts.
            </p>

          </div>

        </Card>

      </div>

    );

  }

  /*
  |--------------------------------------------------------------------------
  | STATS
  |--------------------------------------------------------------------------
  */

  const activeCount =
    list.filter(
      (discount) =>
        discount.status ===
        "active"
    ).length;

  const totalUses =
    list.reduce(
      (
        total,
        discount
      ) =>
        total +
        Number(
          discount.uses || 0
        ),
      0
    );

  const scheduledCount =
    list.filter(
      (discount) =>
        discount.status ===
        "scheduled"
    ).length;

  const expiredCount =
    list.filter(
      (discount) =>
        discount.status ===
        "expired"
    ).length;

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (

    <div className="p-6 space-y-5 max-w-[1200px]">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Discounts
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            Promotions, coupons, and discount rules
          </p>

        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={
            openAdd
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
          Add Discount
        </Button>

      </div>

      {/* ERROR */}

      {error && (

        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">

          <p className="text-[12px] text-red-600">
            {error}
          </p>

        </div>

      )}

      {/* SUCCESS */}

      {success && (

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">

          <p className="text-[12px] text-emerald-600">
            {success}
          </p>

        </div>

      )}

      {/* STATS */}

      <div className="grid grid-cols-4 gap-3">

        {[
          {
            label:
              "Active Discounts",

            value:
              activeCount,

            color:
              "#10B981",
          },

          {
            label:
              "Total Redemptions",

            value:
              totalUses,

            color:
              "#4F46E5",
          },

          {
            label:
              "Scheduled",

            value:
              scheduledCount,

            color:
              "#0EA5E9",
          },

          {
            label:
              "Expired",

            value:
              expiredCount,

            color:
              "#94A3B8",
          },

        ].map(
          (stat) => (

            <Card
              key={
                stat.label
              }
              className="px-5 py-4"
            >

              <p className="text-[11px] text-[#64748B] mb-1">
                {stat.label}
              </p>

              <p
                className="text-[20px] font-bold"
                style={{
                  color:
                    stat.color,
                }}
              >
                {stat.value}
              </p>

            </Card>

          )
        )}

      </div>

      {/* TABLE */}

      <Card>

        <Table
          headers={[
            "Discount Name",
            "Code",
            "Type",
            "Value",
            "Scope",
            "Min Order",
            "Uses",
            "Valid Period",
            "Status",
            "",
          ]}
        >

          {loading ? (

            <Tr>

              <Td>

                <div className="py-10 text-center">

                  <div className="w-6 h-6 mx-auto border-2 border-[#E2E8F0] border-t-[#4F46E5] rounded-full animate-spin" />

                  <p className="text-[11px] text-[#94A3B8] mt-2">
                    Loading discounts...
                  </p>

                </div>

              </Td>

            </Tr>

          ) : list.length === 0 ? (

            <Tr>

              <Td>

                <div className="py-10 text-center">

                  <p className="text-[12px] font-medium text-[#64748B]">
                    No discounts yet
                  </p>

                  <p className="text-[10px] text-[#94A3B8] mt-1">
                    Add a discount for this store to get started.
                  </p>

                </div>

              </Td>

            </Tr>

          ) : (

            list.map(
              (discount) => (

                <Tr
                  key={
                    discount.id
                  }
                >

                  {/* NAME */}

                  <Td>

                    <span className="font-medium text-[#0F172A]">

                      {
                        discount.name
                      }

                    </span>

                  </Td>

                  {/* CODE */}

                  <Td>

                    <span className="font-mono text-[12px] bg-[#EEF2FF] text-[#4F46E5] px-2 py-0.5 rounded-md border border-[#C7D2FE]">

                      {
                        discount.code ||
                        "—"
                      }

                    </span>

                  </Td>

                  {/* TYPE */}

                  <Td>

                    <Badge
                      variant={
                        discount.type ===
                        "percentage"
                          ? "primary"
                          : "info"
                      }
                    >

                      {
                        discount.type ===
                        "percentage"
                          ? "%"
                          : "$"
                      }

                      {" "}

                      {
                        discount.type ===
                        "percentage"
                          ? "Percentage"
                          : "Fixed"
                      }

                    </Badge>

                  </Td>

                  {/* VALUE */}

                  <Td>

                    <span className="font-semibold text-[#0F172A]">

                      {
                        discount.type ===
                        "percentage"
                          ? `${discount.value}%`
                          : `$${discount.value.toFixed(
                              2
                            )}`
                      }

                    </span>

                  </Td>

                  {/* SCOPE */}

                  <Td>

                    <span className="text-[#64748B] capitalize">

                      {
                        discount.scope
                      }

                    </span>

                  </Td>

                  {/* MIN ORDER */}

                  <Td>

                    <span className="text-[#64748B]">

                      {
                        discount.minOrder >
                        0
                          ? `$${discount.minOrder.toFixed(
                              2
                            )}`
                          : "—"
                      }

                    </span>

                  </Td>

                  {/* USES */}

                  <Td>

                    <div>

                      <span className="font-medium">

                        {
                          discount.uses
                        }

                      </span>

                      {
                        discount.maxUses !==
                          null &&
                        discount.maxUses !==
                          undefined && (

                          <span className="text-[#94A3B8]">

                            {" "}
                            /{" "}
                            {
                              discount.maxUses
                            }

                          </span>

                        )
                      }

                    </div>

                  </Td>

                  {/* PERIOD */}

                  <Td>

                    <div className="text-[11px] text-[#64748B]">

                      <div>

                        {
                          discount.starts ||
                          "—"
                        }

                      </div>

                      {
                        discount.ends && (

                          <div>
                            →{" "}
                            {
                              discount.ends
                            }
                          </div>

                        )
                      }

                    </div>

                  </Td>

                  {/* STATUS */}

                  <Td>

                    {
                      statusBadge(
                        discount.status
                      )
                    }

                  </Td>

                  {/* ACTIONS */}

                  <Td>

                    <div className="flex gap-1">

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          openEdit(
                            discount
                          )
                        }
                      >
                        Edit
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          handleDelete(
                            discount
                          )
                        }
                      >
                        Delete
                      </Button>

                    </div>

                  </Td>

                </Tr>

              )
            )

          )}

        </Table>

      </Card>

      {/* ADD / EDIT MODAL */}

      {showAdd && (

        <Modal
          title={
            editDiscount
              ? "Edit Discount"
              : "Add Discount"
          }
          onClose={() => {

            if (!saving) {

              setShowAdd(false);

              resetForm();

            }

          }}
          width="max-w-xl"
        >

          <div className="space-y-4">

            {/* NAME */}

            <Input
              label="Discount Name"
              value={
                form.name
              }
              onChange={
                set("name")
              }
              placeholder="e.g. Summer Sale 20%"
              required
            />

            {/* CODE */}

            <Input
              label="Coupon Code"
              value={
                form.code
              }
              onChange={
                set("code")
              }
              placeholder="e.g. SUMMER20"
            />

            {/* TYPE / VALUE */}

            <div className="grid grid-cols-2 gap-3">

              <Select
                label="Discount Type"
                value={
                  form.type
                }
                onChange={
                  set("type")
                }
                options={[
                  {
                    value:
                      "percentage",
                    label:
                      "Percentage (%)",
                  },

                  {
                    value:
                      "fixed",
                    label:
                      "Fixed Amount ($)",
                  },
                ]}
              />

              <Input
                label={
                  form.type ===
                  "percentage"
                    ? "Percentage (%)"
                    : "Amount ($)"
                }
                value={
                  String(
                    form.value
                  )
                }
                onChange={
                  set("value")
                }
                placeholder={
                  form.type ===
                  "percentage"
                    ? "10"
                    : "0.00"
                }
                type="number"
              />

            </div>

            {/* SCOPE / MIN ORDER */}

            <div className="grid grid-cols-2 gap-3">

              <Select
                label="Apply To"
                value={
                  form.scope
                }
                onChange={
                  set("scope")
                }
                options={[
                  {
                    value:
                      "order",
                    label:
                      "Entire Order",
                  },

                  {
                    value:
                      "category",
                    label:
                      "Category",
                  },

                  {
                    value:
                      "product",
                    label:
                      "Product",
                  },
                ]}
              />

              <Input
                label="Min Order ($)"
                value={
                  String(
                    form.minOrder
                  )
                }
                onChange={
                  set("minOrder")
                }
                placeholder="0.00"
                type="number"
              />

            </div>

            {/* DATES */}

            <div className="grid grid-cols-2 gap-3">

              <Input
                label="Start Date"
                value={
                  form.starts
                }
                onChange={
                  set("starts")
                }
                type="date"
              />

              <Input
                label="End Date"
                value={
                  form.ends
                }
                onChange={
                  set("ends")
                }
                type="date"
              />

            </div>

            {/* MAX USES */}

            <Input
              label="Max Uses (leave blank for unlimited)"
              value={
                String(
                  form.maxUses
                )
              }
              onChange={
                set("maxUses")
              }
              placeholder="Unlimited"
              type="number"
            />

            {/* ACTIVE */}

            <Toggle
              checked={
                form.status
              }
              onChange={(
                value
              ) =>
                set("status")(
                  value
                )
              }
              label="Active immediately"
            />

            {/* BUTTONS */}

            <div className="flex gap-3 pt-1">

              <Button
                variant="primary"
                onClick={
                  handleSave
                }
                disabled={
                  saving
                }
              >

                {saving
                  ? "Saving..."
                  : editDiscount
                  ? "Update Discount"
                  : "Save Discount"}

              </Button>

              <Button
                variant="secondary"
                onClick={() => {

                  if (saving) {
                    return;
                  }

                  setShowAdd(
                    false
                  );

                  resetForm();

                }}
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

    </div>

  );
}