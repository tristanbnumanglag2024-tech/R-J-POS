import { useEffect, useState } from "react";
import { Card, Button, Input, Toggle } from "../../components/ui";

// ============================================================
// TYPES
// ============================================================

interface Store {
  id: number;
  store_name: string;
  branch_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string;
  currency: string;
  business_registration_no: string | null;
  tax_registration_no: string | null;
  logo: string | null;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
}

interface StoreForm {
  store_name: string;
  branch_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  currency: string;
  business_registration_no: string;
  tax_registration_no: string;
}

// ============================================================
// API
// ============================================================

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

// ============================================================
// DEFAULT STORE FORM
// ============================================================

const emptyStoreForm: StoreForm = {
  store_name: "",
  branch_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  postal_code: "",
  country: "Philippines",
  currency: "PHP",
  business_registration_no: "",
  tax_registration_no: "",
};

// ============================================================
// SETTINGS COMPONENT
// ============================================================

export default function Settings() {
  // ==========================================================
  // TAB
  // ==========================================================

  const [tab, setTab] = useState("stores");

  // ==========================================================
  // STORES
  // ==========================================================

  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

  const [showStoreModal, setShowStoreModal] = useState(false);

  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const [storeForm, setStoreForm] =
    useState<StoreForm>(emptyStoreForm);

  const [savingStore, setSavingStore] = useState(false);

  const [storeError, setStoreError] = useState("");

  const [storeSuccess, setStoreSuccess] = useState("");

  // ==========================================================
  // GENERAL SAVE
  // ==========================================================

  const [saved, setSaved] = useState(false);

  // ==========================================================
  // RECEIPT SETTINGS
  // ==========================================================

  const [receiptSettings, setReceiptSettings] = useState({
    header: "Thank you for shopping at Meridian Retail Co.!",
    footer: "Returns accepted within 30 days with receipt.",
    printFormat: "80mm Thermal Printer",
    autoPrint: "Always",

    showLogo: true,
    showCashier: true,
    showCustomer: true,
    showBarcode: true,
    showTax: true,
    emailReceipt: true,
  });

  // ==========================================================
  // POS SETTINGS
  // ==========================================================

  const [posSettings, setPosSettings] = useState({
    taxRate: "Standard VAT (8%)",
    lowStock: "5",

    allowDiscount: true,
    requireRefundPin: true,
    allowOutOfStock: false,
    showImages: true,
    barcodeScanner: true,
    autoLock: true,
  });

  // ==========================================================
  // NOTIFICATION SETTINGS
  // ==========================================================

  const [notificationSettings, setNotificationSettings] = useState({
    lowStock: true,
    outOfStock: true,
    dailySales: false,
    purchaseOrders: true,
    refunds: true,
    largeTransactions: false,
  });

  // ==========================================================
  // SECURITY SETTINGS
  // ==========================================================

  const [securitySettings, setSecuritySettings] = useState({
    managerDiscount: true,
    refundPin: true,
    autoLock: true,
    loginAttempts: true,
    twoFactor: false,
  });

  // ==========================================================
  // LOAD STORES
  // ==========================================================

  const loadStores = async () => {
    try {
      setLoadingStores(true);
      setStoreError("");

      const response = await fetch(
        `${API_BASE}/stores/list.php`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load stores."
        );
      }

      setStores(data.stores || []);
    } catch (error) {
      console.error("Load stores error:", error);

      setStoreError(
        error instanceof Error
          ? error.message
          : "Unable to load stores."
      );
    } finally {
      setLoadingStores(false);
    }
  };

  // ==========================================================
  // LOAD STORES WHEN PAGE OPENS
  // ==========================================================

  useEffect(() => {
    loadStores();
  }, []);

  // ==========================================================
  // OPEN ADD STORE
  // ==========================================================

  const openAddStore = () => {
    setEditingStore(null);
    setStoreForm({ ...emptyStoreForm });

    setStoreError("");
    setStoreSuccess("");

    setShowStoreModal(true);
  };

  // ==========================================================
  // OPEN EDIT STORE
  // ==========================================================

  const openEditStore = (store: Store) => {
    setEditingStore(store);

    setStoreForm({
      store_name: store.store_name || "",
      branch_name: store.branch_name || "",
      email: store.email || "",
      phone: store.phone || "",
      address: store.address || "",
      city: store.city || "",
      province: store.province || "",
      postal_code: store.postal_code || "",
      country: store.country || "Philippines",
      currency: store.currency || "PHP",
      business_registration_no:
        store.business_registration_no || "",
      tax_registration_no:
        store.tax_registration_no || "",
    });

    setStoreError("");
    setStoreSuccess("");

    setShowStoreModal(true);
  };

  // ==========================================================
  // UPDATE STORE FORM
  //
  // IMPORTANT:
  // Your custom Input component returns a STRING.
  //
  // Therefore:
  //
  // onChange={(value) => ...}
  //
  // NOT:
  //
  // onChange={(e) => e.target.value}
  // ==========================================================

  const updateStoreField = (
    field: keyof StoreForm,
    value: string
  ) => {
    setStoreForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ==========================================================
  // SAVE STORE
  // ==========================================================

  const saveStore = async () => {
    setStoreError("");
    setStoreSuccess("");

    if (!storeForm.store_name.trim()) {
      setStoreError("Please enter the store name.");
      return;
    }

    if (!storeForm.branch_name.trim()) {
      setStoreError("Please enter the branch name.");
      return;
    }

    try {
      setSavingStore(true);

      const endpoint = editingStore
        ? `${API_BASE}/stores/update.php`
        : `${API_BASE}/stores/create.php`;

      const payload = editingStore
        ? {
            id: editingStore.id,
            ...storeForm,
          }
        : storeForm;

      const response = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to save store."
        );
      }

      setStoreSuccess(
        editingStore
          ? "Store updated successfully."
          : "Store created successfully."
      );

      await loadStores();

      setTimeout(() => {
        setShowStoreModal(false);
        setStoreSuccess("");
      }, 900);
    } catch (error) {
      console.error("Save store error:", error);

      setStoreError(
        error instanceof Error
          ? error.message
          : "Unable to save store."
      );
    } finally {
      setSavingStore(false);
    }
  };

  // ==========================================================
  // DEACTIVATE STORE
  // ==========================================================

  const deactivateStore = async (store: Store) => {

  if (store.status === "inactive") {
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to deactivate "${store.branch_name}"?`
  );

  if (!confirmed) {
    return;
  }

  try {

    setStoreError("");

    const response = await fetch(
      `${API_BASE}/stores/delete.php`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: store.id,
          action: "deactivate",
        }),
      }
    );

    const data = await response.json();

    console.log("Deactivate response:", data);

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Failed to deactivate store."
      );
    }

    await loadStores();

  } catch (error) {

    console.error(
      "Deactivate store error:",
      error
    );

    setStoreError(
      error instanceof Error
        ? error.message
        : "Unable to deactivate store."
    );
  }
};
  // ==========================================================
  // REACTIVATE STORE
  // ==========================================================

  const reactivateStore = async (store: Store) => {

  if (store.status === "active") {
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to reactivate "${store.branch_name}"?`
  );

  if (!confirmed) {
    return;
  }

  try {

    setStoreError("");

    const response = await fetch(
      `${API_BASE}/stores/activate.php`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: store.id,
        }),
      }
    );

    const data = await response.json();

    console.log("Activate response:", data);

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Failed to reactivate store."
      );
    }

    await loadStores();

  } catch (error) {

    console.error(
      "Reactivate store error:",
      error
    );

    setStoreError(
      error instanceof Error
        ? error.message
        : "Unable to reactivate store."
    );
  }
};

  // ==========================================================
  // GENERIC SAVE
  // ==========================================================

  const save = () => {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 1800);
  };

  // ==========================================================
  // TABS
  // ==========================================================

  const tabs = [
    {
      id: "store",
      label: "General",
    },
    {
      id: "stores",
      label: "Stores",
    },
    {
      id: "receipt",
      label: "Receipt",
    },
    {
      id: "pos",
      label: "POS",
    },
    {
      id: "notifications",
      label: "Notifications",
    },
    {
      id: "security",
      label: "Security",
    },
  ];

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="p-6 space-y-5 max-w-[1100px]">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div>
        <h2 className="text-[18px] font-bold text-[#0F172A]">
          Settings
        </h2>

        <p className="text-[12px] text-[#64748B] mt-0.5">
          Configure your business, stores, POS and system
          preferences
        </p>
      </div>

      {/* ======================================================
          TABS
      ======================================================= */}

      <div className="flex flex-wrap gap-1 bg-[#F1F5F9] rounded-lg p-1 w-fit">

        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${
              tab === t.id
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-[#64748B] hover:text-[#374151]"
            }`}
          >
            {t.label}
          </button>
        ))}

      </div>

      {/* ======================================================
          GENERAL
      ======================================================= */}

      {tab === "store" && (
        <div className="space-y-4">

          <Card className="p-5">

            <h3 className="text-[13px] font-semibold text-[#0F172A] mb-4">
              Business Information
            </h3>

            <div className="grid grid-cols-2 gap-4">

              <Input
                label="Business Name"
                value="Meridian Retail Co."
                onChange={() => {}}
              />

              <Input
                label="Business Registration No."
                value="BRN-2022-00428"
                onChange={() => {}}
              />

              <Input
                label="VAT / Tax Registration No."
                value="VAT-REG-123-456-789"
                onChange={() => {}}
              />

            </div>

          </Card>

          <Card className="p-5">

            <h3 className="text-[13px] font-semibold text-[#0F172A] mb-4">
              Store Management
            </h3>

            <p className="text-[12px] text-[#64748B]">
              Your business can have multiple stores or
              branches. Each store can have its own inventory,
              sales, purchase orders and POS operations.
            </p>

            <div className="mt-4">

              <Button
                variant="primary"
                size="sm"
                onClick={() => setTab("stores")}
              >
                Manage Stores
              </Button>

            </div>

          </Card>

        </div>
      )}

      {/* ======================================================
          STORES
      ======================================================= */}

      {tab === "stores" && (
        <div className="space-y-4">

          {/* HEADER */}

          <div className="flex items-center justify-between">

            <div>
              <h3 className="text-[14px] font-semibold text-[#0F172A]">
                Stores & Branches
              </h3>

              <p className="text-[12px] text-[#64748B] mt-0.5">
                Manage all stores connected to your business.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={openAddStore}
            >
              + Add Store
            </Button>

          </div>

          {/* ERROR */}

          {storeError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[12px] text-red-600">
              {storeError}
            </div>
          )}

          {/* STORE LIST */}

          <Card className="p-0 overflow-hidden">

            {loadingStores ? (

              <div className="p-10 text-center">

                <div className="inline-flex items-center gap-2 text-[13px] text-[#64748B]">

                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M21 12a9 9 0 11-18 0"
                      opacity="0.3"
                    />

                    <path
                      d="M3 12a9 9 0 019-9"
                    />
                  </svg>

                  Loading stores...

                </div>

              </div>

            ) : stores.length === 0 ? (

              <div className="p-10 text-center">

                <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-3">

                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="1.8"
                  >
                    <path d="M3 21h18" />
                    <path d="M5 21V5l7-3 7 3v16" />
                    <path d="M9 21v-4h6v4" />
                  </svg>

                </div>

                <p className="text-[13px] font-semibold text-[#0F172A]">
                  No stores yet
                </p>

                <p className="text-[12px] text-[#64748B] mt-1">
                  Create your first store or branch.
                </p>

                <div className="mt-4">

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={openAddStore}
                  >
                    + Add Store
                  </Button>

                </div>

              </div>

            ) : (

              <div className="divide-y divide-[#F1F5F9]">

                {stores.map((store) => (

                  <div
                    key={store.id}
                    className="p-5 flex items-center justify-between gap-4 hover:bg-[#FAFBFC] transition-colors"
                  >

                    {/* LEFT */}

                    <div className="flex items-center gap-4 min-w-0">

                      <div className="w-11 h-11 rounded-xl bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">

                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#4F46E5"
                          strokeWidth="1.8"
                        >
                          <path d="M3 21h18" />
                          <path d="M5 21V5l7-3 7 3v16" />
                          <path d="M9 21v-4h6v4" />
                        </svg>

                      </div>

                      <div className="min-w-0">

                        <div className="flex items-center gap-2">

                          <p className="text-[13px] font-semibold text-[#0F172A] truncate">
                            {store.branch_name}
                          </p>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              store.status === "active"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {store.status === "active"
                              ? "Active"
                              : "Inactive"}
                          </span>

                        </div>

                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          {store.store_name}
                        </p>

                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          {[
                            store.city,
                            store.province,
                            store.country,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>

                      </div>

                    </div>

                    {/* RIGHT */}

                    <div className="flex items-center gap-2 flex-shrink-0">

                      <button
                        onClick={() => openEditStore(store)}
                        className="h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                      >
                        Edit
                      </button>

                      {store.status === "active" ? (

                        <button
                          onClick={() =>
                            deactivateStore(store)
                          }
                          className="h-8 px-3 rounded-lg border border-red-200 bg-red-50 text-[11px] font-medium text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Deactivate
                        </button>

                      ) : (

                        <button
                          onClick={() =>
                            reactivateStore(store)
                          }
                          className="h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          Activate
                        </button>

                      )}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </Card>

        </div>
      )}

      {/* ======================================================
          RECEIPT
      ======================================================= */}

      {tab === "receipt" && (
        <Card className="p-5">

          <h3 className="text-[13px] font-semibold text-[#0F172A] mb-4">
            Receipt Configuration
          </h3>

          <div className="space-y-4">

            {/* FIXED CUSTOM INPUT */}

            <Input
              label="Receipt Header Text"
              value={receiptSettings.header}
              onChange={(value) =>
                setReceiptSettings((previous) => ({
                  ...previous,
                  header: value,
                }))
              }
            />

            {/* FIXED CUSTOM INPUT */}

            <Input
              label="Receipt Footer Text"
              value={receiptSettings.footer}
              onChange={(value) =>
                setReceiptSettings((previous) => ({
                  ...previous,
                  footer: value,
                }))
              }
            />

            <div className="grid grid-cols-2 gap-4">

              {/* NATIVE SELECT - target.value IS CORRECT */}

              <div>

                <label className="text-[12px] font-medium text-[#374151] block mb-2">
                  Print Format
                </label>

                <select
                  value={receiptSettings.printFormat}
                  onChange={(e) =>
                    setReceiptSettings((previous) => ({
                      ...previous,
                      printFormat: e.target.value,
                    }))
                  }
                  className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
                >
                  <option>
                    80mm Thermal Printer
                  </option>

                  <option>
                    58mm Thermal Printer
                  </option>

                  <option>
                    A4 PDF
                  </option>
                </select>

              </div>

              {/* NATIVE SELECT */}

              <div>

                <label className="text-[12px] font-medium text-[#374151] block mb-2">
                  Auto-print on sale
                </label>

                <select
                  value={receiptSettings.autoPrint}
                  onChange={(e) =>
                    setReceiptSettings((previous) => ({
                      ...previous,
                      autoPrint: e.target.value,
                    }))
                  }
                  className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
                >
                  <option>Always</option>
                  <option>Ask each time</option>
                  <option>Never</option>
                </select>

              </div>

            </div>

            <div className="space-y-3 pt-2">

              {[
                {
                  label: "Show store logo on receipt",
                  key: "showLogo",
                },
                {
                  label: "Show cashier name",
                  key: "showCashier",
                },
                {
                  label: "Show customer name (if assigned)",
                  key: "showCustomer",
                },
                {
                  label: "Show barcode on receipt",
                  key: "showBarcode",
                },
                {
                  label: "Show tax breakdown",
                  key: "showTax",
                },
                {
                  label: "Offer email receipt option",
                  key: "emailReceipt",
                },
              ].map((opt) => (

                <div
                  key={opt.key}
                  className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0"
                >

                  <span className="text-[13px] text-[#374151]">
                    {opt.label}
                  </span>

                  <Toggle
                    checked={
                      receiptSettings[
                        opt.key as keyof typeof receiptSettings
                      ] as boolean
                    }
                    onChange={() =>
                      setReceiptSettings((previous) => ({
                        ...previous,
                        [opt.key]:
                          !previous[
                            opt.key as keyof typeof receiptSettings
                          ],
                      }))
                    }
                  />

                </div>

              ))}

            </div>

          </div>

        </Card>
      )}

      {/* ======================================================
          POS
      ======================================================= */}

      {tab === "pos" && (
        <Card className="p-5">

          <h3 className="text-[13px] font-semibold text-[#0F172A] mb-4">
            POS Settings
          </h3>

          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">

              {/* TAX SELECT */}

              <div>

                <label className="text-[12px] font-medium text-[#374151] block mb-1">
                  Default Tax Rate
                </label>

                <select
                  value={posSettings.taxRate}
                  onChange={(e) =>
                    setPosSettings((previous) => ({
                      ...previous,
                      taxRate: e.target.value,
                    }))
                  }
                  className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none"
                >
                  <option>
                    Standard VAT (8%)
                  </option>

                  <option>
                    Food Tax (5%)
                  </option>

                  <option>
                    Zero Rate (0%)
                  </option>
                </select>

              </div>

              {/* FIXED CUSTOM INPUT */}

              <Input
                label="Low Stock Warning Threshold"
                value={posSettings.lowStock}
                onChange={(value) =>
                  setPosSettings((previous) => ({
                    ...previous,
                    lowStock: value,
                  }))
                }
                type="number"
              />

            </div>

            <div className="space-y-3 pt-2">

              {[
                {
                  label: "Allow cashier to apply discounts",
                  key: "allowDiscount",
                },
                {
                  label: "Require manager PIN for refunds",
                  key: "requireRefundPin",
                },
                {
                  label: "Allow sale of out-of-stock items",
                  key: "allowOutOfStock",
                },
                {
                  label: "Show product images in POS",
                  key: "showImages",
                },
                {
                  label: "Enable barcode scanner input",
                  key: "barcodeScanner",
                },
                {
                  label: "Auto-lock after 5 minutes of inactivity",
                  key: "autoLock",
                },
              ].map((opt) => (

                <div
                  key={opt.key}
                  className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0"
                >

                  <span className="text-[13px] text-[#374151]">
                    {opt.label}
                  </span>

                  <Toggle
                    checked={
                      posSettings[
                        opt.key as keyof typeof posSettings
                      ] as boolean
                    }
                    onChange={() =>
                      setPosSettings((previous) => ({
                        ...previous,
                        [opt.key]:
                          !previous[
                            opt.key as keyof typeof posSettings
                          ],
                      }))
                    }
                  />

                </div>

              ))}

            </div>

          </div>

        </Card>
      )}

      {/* ======================================================
          NOTIFICATIONS
      ======================================================= */}

      {tab === "notifications" && (
        <Card className="p-5">

          <h3 className="text-[13px] font-semibold text-[#0F172A] mb-4">
            Notification Preferences
          </h3>

          <div className="space-y-3">

            {[
              {
                label: "Low stock alerts",
                desc: "Notify when products reach minimum stock level",
                key: "lowStock",
              },
              {
                label: "Out of stock alerts",
                desc: "Immediate alert when a product runs out",
                key: "outOfStock",
              },
              {
                label: "Daily sales summary",
                desc: "Receive daily report via email",
                key: "dailySales",
              },
              {
                label: "New purchase orders",
                desc: "Alert when a PO is created or updated",
                key: "purchaseOrders",
              },
              {
                label: "Refund notifications",
                desc: "Alert manager when refund is processed",
                key: "refunds",
              },
              {
                label: "Large transaction alerts",
                desc: "Alert for transactions above ₱50,000",
                key: "largeTransactions",
              },
            ].map((n) => (

              <div
                key={n.key}
                className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0"
              >

                <div>

                  <p className="text-[13px] font-medium text-[#0F172A]">
                    {n.label}
                  </p>

                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    {n.desc}
                  </p>

                </div>

                <Toggle
                  checked={
                    notificationSettings[
                      n.key as keyof typeof notificationSettings
                    ]
                  }
                  onChange={() =>
                    setNotificationSettings((previous) => ({
                      ...previous,
                      [n.key]:
                        !previous[
                          n.key as keyof typeof notificationSettings
                        ],
                    }))
                  }
                />

              </div>

            ))}

          </div>

        </Card>
      )}

      {/* ======================================================
          SECURITY
      ======================================================= */}

      {tab === "security" && (
        <div className="space-y-4">

          <Card className="p-5">

            <h3 className="text-[13px] font-semibold text-[#0F172A] mb-4">
              Security Settings
            </h3>

            <div className="space-y-3">

              {[
                {
                  label:
                    "Require manager approval for discounts > 20%",
                  key: "managerDiscount",
                },
                {
                  label: "Require manager PIN for refunds",
                  key: "refundPin",
                },
                {
                  label: "Auto-lock POS after inactivity",
                  key: "autoLock",
                },
                {
                  label: "Log all login attempts",
                  key: "loginAttempts",
                },
                {
                  label:
                    "Two-factor authentication (admin)",
                  key: "twoFactor",
                },
              ].map((s) => (

                <div
                  key={s.key}
                  className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0"
                >

                  <span className="text-[13px] text-[#374151]">
                    {s.label}
                  </span>

                  <Toggle
                    checked={
                      securitySettings[
                        s.key as keyof typeof securitySettings
                      ]
                    }
                    onChange={() =>
                      setSecuritySettings((previous) => ({
                        ...previous,
                        [s.key]:
                          !previous[
                            s.key as keyof typeof securitySettings
                          ],
                      }))
                    }
                  />

                </div>

              ))}

            </div>

          </Card>

          {/* CHANGE PASSWORD */}

          <Card className="p-5">

            <h3 className="text-[13px] font-semibold text-[#0F172A] mb-3">
              Change Admin Password
            </h3>

            <div className="grid grid-cols-2 gap-4">

              <Input
                label="Current Password"
                value=""
                onChange={() => {}}
                type="password"
                placeholder="••••••••"
              />

              <div />

              <Input
                label="New Password"
                value=""
                onChange={() => {}}
                type="password"
                placeholder="••••••••"
              />

              <Input
                label="Confirm Password"
                value=""
                onChange={() => {}}
                type="password"
                placeholder="••••••••"
              />

            </div>

            <div className="mt-4">

              <Button
                variant="primary"
                size="sm"
              >
                Update Password
              </Button>

            </div>

          </Card>

        </div>
      )}

      {/* ======================================================
          SAVE BUTTON
      ======================================================= */}

      {tab !== "stores" && (
        <div className="flex gap-3 pt-2">

          <Button
            variant="primary"
            onClick={save}
          >
            {saved
              ? "✓ Saved!"
              : "Save Changes"}
          </Button>

          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            Reset to Defaults
          </Button>

        </div>
      )}

      {/* ======================================================
          ADD / EDIT STORE MODAL
      ======================================================= */}

      {showStoreModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* BACKDROP */}

          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() =>
              !savingStore &&
              setShowStoreModal(false)
            }
          />

          {/* MODAL */}

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden">

            {/* HEADER */}

            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">

              <div>

                <h3 className="text-[15px] font-bold text-[#0F172A]">
                  {editingStore
                    ? "Edit Store"
                    : "Add New Store"}
                </h3>

                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {editingStore
                    ? "Update store and branch information."
                    : "Create a new store or branch."}
                </p>

              </div>

              <button
                type="button"
                disabled={savingStore}
                onClick={() =>
                  setShowStoreModal(false)
                }
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569]"
              >

                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line
                    x1="18"
                    y1="6"
                    x2="6"
                    y2="18"
                  />

                  <line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                  />
                </svg>

              </button>

            </div>

            {/* BODY */}

            <div className="p-6 max-h-[70vh] overflow-y-auto">

              {storeError && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[12px] text-red-600">
                  {storeError}
                </div>
              )}

              {storeSuccess && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-600">
                  {storeSuccess}
                </div>
              )}

              <div className="space-y-5">

                {/* STORE INFORMATION */}

                <div>

                  <h4 className="text-[12px] font-semibold text-[#0F172A] mb-3">
                    Store Information
                  </h4>

                  <div className="grid grid-cols-2 gap-4">

                    {/* FIXED */}

                    <Input
                      label="Business / Store Name"
                      value={storeForm.store_name}
                      onChange={(value) =>
                        updateStoreField(
                          "store_name",
                          value
                        )
                      }
                    />

                    {/* FIXED */}

                    <Input
                      label="Branch Name"
                      value={storeForm.branch_name}
                      onChange={(value) =>
                        updateStoreField(
                          "branch_name",
                          value
                        )
                      }
                    />

                    {/* FIXED */}

                    <Input
                      label="Email"
                      type="email"
                      value={storeForm.email}
                      onChange={(value) =>
                        updateStoreField(
                          "email",
                          value
                        )
                      }
                    />

                    {/* FIXED */}

                    <Input
                      label="Phone"
                      value={storeForm.phone}
                      onChange={(value) =>
                        updateStoreField(
                          "phone",
                          value
                        )
                      }
                    />

                    {/* FIXED */}

                    <div className="col-span-2">

                      <Input
                        label="Address"
                        value={storeForm.address}
                        onChange={(value) =>
                          updateStoreField(
                            "address",
                            value
                          )
                        }
                      />

                    </div>

                    {/* FIXED */}

                    <Input
                      label="City"
                      value={storeForm.city}
                      onChange={(value) =>
                        updateStoreField(
                          "city",
                          value
                        )
                      }
                    />

                    {/* FIXED */}

                    <Input
                      label="Province"
                      value={storeForm.province}
                      onChange={(value) =>
                        updateStoreField(
                          "province",
                          value
                        )
                      }
                    />

                    {/* FIXED */}

                    <Input
                      label="ZIP / Postal Code"
                      value={storeForm.postal_code}
                      onChange={(value) =>
                        updateStoreField(
                          "postal_code",
                          value
                        )
                      }
                    />

                    {/* FIXED */}

                    <Input
                      label="Country"
                      value={storeForm.country}
                      onChange={(value) =>
                        updateStoreField(
                          "country",
                          value
                        )
                      }
                    />

                    {/* NATIVE SELECT */}

                    <div>

                      <label className="text-[12px] font-medium text-[#374151] block mb-1.5">
                        Currency
                      </label>

                      <select
                        value={storeForm.currency}
                        onChange={(e) =>
                          updateStoreField(
                            "currency",
                            e.target.value
                          )
                        }
                        className="w-full h-10 px-3 text-[13px] rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                      >

                        <option value="PHP">
                          PHP (₱)
                        </option>

                        <option value="USD">
                          USD ($)
                        </option>

                        <option value="EUR">
                          EUR (€)
                        </option>

                        <option value="GBP">
                          GBP (£)
                        </option>

                      </select>

                    </div>

                  </div>

                </div>

                {/* BUSINESS DETAILS */}

                <div>

                  <h4 className="text-[12px] font-semibold text-[#0F172A] mb-3">
                    Business Details
                  </h4>

                  <div className="grid grid-cols-2 gap-4">

                    {/* FIXED */}

                    <Input
                      label="Business Registration No."
                      value={
                        storeForm.business_registration_no
                      }
                      onChange={(value) =>
                        updateStoreField(
                          "business_registration_no",
                          value
                        )
                      }
                    />

                    {/* FIXED */}

                    <Input
                      label="VAT / Tax Registration No."
                      value={
                        storeForm.tax_registration_no
                      }
                      onChange={(value) =>
                        updateStoreField(
                          "tax_registration_no",
                          value
                        )
                      }
                    />

                  </div>

                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">

              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setShowStoreModal(false)
                }
                disabled={savingStore}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={saveStore}
                disabled={savingStore}
              >
                {savingStore
                  ? "Saving..."
                  : editingStore
                  ? "Update Store"
                  : "Create Store"}
              </Button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}