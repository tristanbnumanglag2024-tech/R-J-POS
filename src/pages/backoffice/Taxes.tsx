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
  Toggle,
} from "../../components/ui";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

type Tax = {
  id: number;
  store_id: number;
  name: string;
  code: string;
  rate: number;
  applies: string;
  inclusive: boolean;
  is_active: boolean;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

type TaxForm = {
  name: string;
  code: string;
  rate: string;
  applies: string;
  inclusive: boolean;
  status: boolean;
};

type TaxesProps = {
  activeStoreId: number | null;
};

const emptyForm: TaxForm = {
  name: "",
  code: "",
  rate: "",
  applies: "",
  inclusive: false,
  status: true,
};

export default function Taxes({
  activeStoreId,
}: TaxesProps) {

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [list, setList] =
    useState<Tax[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showAdd, setShowAdd] =
    useState(false);

  const [editingTax, setEditingTax] =
    useState<Tax | null>(null);

  const [form, setForm] =
    useState<TaxForm>(emptyForm);

  /*
  |--------------------------------------------------------------------------
  | DEFAULT SETTINGS
  |--------------------------------------------------------------------------
  */

  const [defaultTaxId, setDefaultTaxId] =
    useState<number | null>(null);

  const [defaultInclusive, setDefaultInclusive] =
    useState(false);

  const [taxRegistrationNumber, setTaxRegistrationNumber] =
    useState("");

  const [savingSettings, setSavingSettings] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const updateForm = (
    key: keyof TaxForm,
    value: string | boolean
  ) => {

    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetForm = () => {

    setForm({
      ...emptyForm,
    });

    setEditingTax(null);
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD TAXES
  |--------------------------------------------------------------------------
  */

  const loadTaxes =
    useCallback(async () => {

      if (!activeStoreId) {

        setList([]);
        setLoading(false);

        return;
      }

      try {

        setLoading(true);
        setError("");

        const params =
          new URLSearchParams();

        params.set(
          "store_id",
          String(activeStoreId)
        );

        const response =
          await fetch(
            `${API_BASE}/taxes/list.php?${params.toString()}`,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
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
              "Failed to load taxes."
          );
        }

        setList(
          Array.isArray(
            data.taxes
          )
            ? data.taxes
            : []
        );

      } catch (err) {

        console.error(
          "Load taxes error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load taxes."
        );

        setList([]);

      } finally {

        setLoading(false);
      }

    }, [activeStoreId]);

  /*
  |--------------------------------------------------------------------------
  | LOAD TAX SETTINGS
  |--------------------------------------------------------------------------
  */

  const loadSettings =
    useCallback(async () => {

      if (!activeStoreId) {
        return;
      }

      try {

        const params =
          new URLSearchParams();

        params.set(
          "store_id",
          String(activeStoreId)
        );

        const response =
          await fetch(
            `${API_BASE}/taxes/settings.php?${params.toString()}`,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
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
              "Failed to load tax settings."
          );
        }

        /*
        |--------------------------------------------------------------------------
        | DEFAULT TAX
        |--------------------------------------------------------------------------
        */

        setDefaultTaxId(
          data.settings?.default_tax_id
            ? Number(
                data.settings.default_tax_id
              )
            : null
        );

        /*
        |--------------------------------------------------------------------------
        | PRICE DISPLAY
        |--------------------------------------------------------------------------
        */

        setDefaultInclusive(
          Boolean(
            data.settings?.prices_tax_inclusive
          )
        );

        /*
        |--------------------------------------------------------------------------
        | REGISTRATION NUMBER
        |--------------------------------------------------------------------------
        */

        setTaxRegistrationNumber(
          data.settings?.tax_registration_number ||
            ""
        );

      } catch (err) {

        console.error(
          "Load tax settings error:",
          err
        );
      }

    }, [activeStoreId]);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    loadTaxes();
    loadSettings();

  }, [
    loadTaxes,
    loadSettings,
  ]);

  /*
  |--------------------------------------------------------------------------
  | CLEAR MESSAGES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    if (!success) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setSuccess("");
      }, 3000);

    return () =>
      window.clearTimeout(timer);

  }, [success]);

  /*
  |--------------------------------------------------------------------------
  | OPEN ADD
  |--------------------------------------------------------------------------
  */

  const openAdd =
    () => {

      resetForm();

      setShowAdd(true);
    };

  /*
  |--------------------------------------------------------------------------
  | OPEN EDIT
  |--------------------------------------------------------------------------
  */

  const openEdit =
    (tax: Tax) => {

      setEditingTax(tax);

      setForm({

        name:
          tax.name || "",

        code:
          tax.code || "",

        rate:
          String(tax.rate ?? 0),

        applies:
          tax.applies || "",

        inclusive:
          Boolean(tax.inclusive),

        status:
          Boolean(tax.is_active),
      });

      setShowAdd(true);
    };

  /*
  |--------------------------------------------------------------------------
  | SAVE TAX
  |--------------------------------------------------------------------------
  */

  const saveTax =
    async () => {

      if (!activeStoreId) {

        setError(
          "Please select a store first."
        );

        return;
      }

      if (
        !form.name.trim()
      ) {

        setError(
          "Tax name is required."
        );

        return;
      }

      if (
        !form.code.trim()
      ) {

        setError(
          "Tax code is required."
        );

        return;
      }

      const rate =
        Number(form.rate);

      if (
        Number.isNaN(rate) ||
        rate < 0
      ) {

        setError(
          "Tax rate must be 0 or greater."
        );

        return;
      }

      if (rate > 100) {

        setError(
          "Tax rate cannot exceed 100%."
        );

        return;
      }

      try {

        setSaving(true);
        setError("");

        const payload = {

          store_id:
            activeStoreId,

          name:
            form.name.trim(),

          code:
            form.code.trim(),

          rate,

          applies:
            form.applies.trim(),

          inclusive:
            form.inclusive,

          is_active:
            form.status,
        };

        const endpoint =
          editingTax
            ? `${API_BASE}/taxes/update.php`
            : `${API_BASE}/taxes/create.php`;

        if (editingTax) {

          Object.assign(
            payload,
            {
              id:
                editingTax.id,
            }
          );
        }

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

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
              "Failed to save tax."
          );
        }

        setSuccess(
          data.message ||
            "Tax saved successfully."
        );

        setShowAdd(false);

        resetForm();

        await loadTaxes();

        await loadSettings();

      } catch (err) {

        console.error(
          "Save tax error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to save tax."
        );

      } finally {

        setSaving(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | DELETE TAX
  |--------------------------------------------------------------------------
  */

  const deleteTax =
    async (tax: Tax) => {

      if (!activeStoreId) {
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | PREVENT DELETING DEFAULT TAX
      |--------------------------------------------------------------------------
      */

      if (
        defaultTaxId === tax.id
      ) {

        setError(
          "You cannot delete the default tax. Select another default tax first."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Delete "${tax.name}"? This cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {

        setError("");

        const response =
          await fetch(
            `${API_BASE}/taxes/delete.php`,
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
                    tax.id,

                  store_id:
                    activeStoreId,
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
              "Failed to delete tax."
          );
        }

        setSuccess(
          data.message ||
            "Tax deleted successfully."
        );

        await loadTaxes();

        await loadSettings();

      } catch (err) {

        console.error(
          "Delete tax error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to delete tax."
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SAVE DEFAULT TAX SETTINGS
  |--------------------------------------------------------------------------
  */

  const saveSettings =
    async () => {

      if (!activeStoreId) {

        setError(
          "Please select a store first."
        );

        return;
      }

      try {

        setSavingSettings(true);
        setError("");

        const response =
          await fetch(
            `${API_BASE}/taxes/settings.php`,
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

                  default_tax_id:
                    defaultTaxId,

                  prices_tax_inclusive:
                    defaultInclusive,

                  tax_registration_number:
                    taxRegistrationNumber.trim(),
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
              "Failed to save tax settings."
          );
        }

        setSuccess(
          data.message ||
            "Tax settings saved successfully."
        );

        await loadSettings();

      } catch (err) {

        console.error(
          "Save tax settings error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to save tax settings."
        );

      } finally {

        setSavingSettings(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | STATUS BADGE
  |--------------------------------------------------------------------------
  */

  const statusBadge =
    (status: string) => {

      if (
        status === "active"
      ) {

        return (
          <Badge variant="success">
            active
          </Badge>
        );
      }

      return (
        <Badge variant="neutral">
          inactive
        </Badge>
      );
    };

  /*
  |--------------------------------------------------------------------------
  | DEFAULT TAX
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  | If no default tax exists, the POS default is 0%.
  |
  */

  const defaultTax =
    list.find(
      (tax) =>
        tax.id ===
        defaultTaxId
    );

  const defaultRate =
    defaultTax
      ? defaultTax.rate
      : 0;

  const defaultTaxName =
    defaultTax
      ? defaultTax.name
      : "No tax / 0%";

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="p-6 space-y-5 max-w-[1000px]">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Taxes
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            Tax rates and configuration
          </p>

        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openAdd}
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
          Add Tax Rate
        </Button>

      </div>

      {/* ERROR */}

      {error && (

        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">

          <p className="text-[12px] text-red-700">
            {error}
          </p>

        </div>

      )}

      {/* SUCCESS */}

      {success && (

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">

          <p className="text-[12px] text-emerald-700">
            {success}
          </p>

        </div>

      )}

      {/* WARNING */}

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D97706"
          strokeWidth="2"
          className="shrink-0 mt-0.5"
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

        <p className="text-[12px] text-amber-800">
          Changes to tax rates affect all future transactions. Existing receipts will not be modified. Consult your accountant before making changes.
        </p>

      </div>

      {/* TAX TABLE */}

      <Card>

        <Table
          headers={[
            "Tax Name",
            "Code",
            "Rate",
            "Applies To",
            "Price Inclusive",
            "Status",
            "",
          ]}
        >

          {loading ? (

            <Tr>

              <Td>

                <span className="text-[12px] text-[#94A3B8]">
                  Loading taxes...
                </span>

              </Td>

            </Tr>

          ) : list.length === 0 ? (

            <Tr>

              <Td>

                <div className="py-8">

                  <p className="text-[12px] font-medium text-[#64748B]">
                    No tax rates found
                  </p>

                  <p className="text-[10px] text-[#94A3B8] mt-1">
                    Add a tax rate for this store.
                  </p>

                </div>

              </Td>

            </Tr>

          ) : (

            list.map((t) => (

              <Tr key={t.id}>

                <Td>

                  <span className="font-medium text-[#0F172A]">
                    {t.name}
                  </span>

                </Td>

                <Td mono>
                  {t.code}
                </Td>

                <Td>

                  <span
                    className={`text-[14px] font-bold ${
                      t.rate === 0
                        ? "text-[#94A3B8]"
                        : "text-[#0F172A]"
                    }`}
                  >
                    {t.rate}%
                  </span>

                </Td>

                <Td>

                  <span className="text-[#64748B]">
                    {t.applies || "All Products"}
                  </span>

                </Td>

                <Td>

                  <Badge
                    variant={
                      t.inclusive
                        ? "success"
                        : "neutral"
                    }
                  >
                    {t.inclusive
                      ? "Inclusive"
                      : "Exclusive"}
                  </Badge>

                </Td>

                <Td>

                  {statusBadge(
                    t.status
                  )}

                </Td>

                <Td>

                  <div className="flex gap-1">

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        openEdit(t)
                      }
                    >
                      Edit
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        deleteTax(t)
                      }
                    >
                      Delete
                    </Button>

                  </div>

                </Td>

              </Tr>

            ))

          )}

        </Table>

      </Card>

      {/* DEFAULT TAX */}

      <Card className="p-5">

        <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">
          Default Tax Settings
        </h3>

        <div className="space-y-4">

          {/* DEFAULT RATE */}

          <div className="flex items-center justify-between py-3 border-b border-[#F1F5F9]">

            <div>

              <p className="text-[13px] font-medium text-[#0F172A]">
                Default Tax Rate
              </p>

              <p className="text-[11px] text-[#64748B]">
                Applied when no specific tax is configured for a product
              </p>

            </div>

            <div className="flex items-center gap-2">

              <span className="text-[14px] font-bold text-[#4F46E5]">
                {defaultRate}%
              </span>

              <span className="text-[11px] text-[#64748B]">
                ({defaultTaxName})
              </span>

            </div>

          </div>

          {/* DEFAULT TAX SELECT */}

          <div className="flex items-center justify-between py-3 border-b border-[#F1F5F9]">

            <div>

              <p className="text-[13px] font-medium text-[#0F172A]">
                Default Tax
              </p>

              <p className="text-[11px] text-[#64748B]">
                Tax used when a product does not specify a tax
              </p>

            </div>

            <select
              value={
                defaultTaxId === null
                  ? ""
                  : String(
                      defaultTaxId
                    )
              }
              onChange={(e) => {

                const value =
                  e.target.value;

                setDefaultTaxId(
                  value
                    ? Number(value)
                    : null
                );

              }}
              className="h-8 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
            >

              <option value="">
                0% — No Tax
              </option>

              {list
                .filter(
                  (tax) =>
                    tax.is_active
                )
                .map((tax) => (

                  <option
                    key={tax.id}
                    value={tax.id}
                  >
                    {tax.rate}% — {tax.name}
                  </option>

                ))}

            </select>

          </div>

          {/* POS PRICE DISPLAY */}

          <div className="flex items-center justify-between py-3 border-b border-[#F1F5F9]">

            <div>

              <p className="text-[13px] font-medium text-[#0F172A]">
                Prices shown in POS
              </p>

              <p className="text-[11px] text-[#64748B]">
                How prices are displayed at checkout
              </p>

            </div>

            <select
              value={
                defaultInclusive
                  ? "inclusive"
                  : "exclusive"
              }
              onChange={(e) =>
                setDefaultInclusive(
                  e.target.value ===
                    "inclusive"
                )
              }
              className="h-8 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
            >

              <option value="exclusive">
                Tax exclusive (+ tax at checkout)
              </option>

              <option value="inclusive">
                Tax inclusive (tax included in price)
              </option>

            </select>

          </div>

          {/* REGISTRATION NUMBER */}

          <div className="flex items-center justify-between py-3">

            <div>

              <p className="text-[13px] font-medium text-[#0F172A]">
                Tax Registration Number
              </p>

              <p className="text-[11px] text-[#64748B]">
                Printed on customer receipts
              </p>

            </div>

            <input
              value={
                taxRegistrationNumber
              }
              onChange={(e) =>
                setTaxRegistrationNumber(
                  e.target.value
                )
              }
              placeholder="Optional"
              className="h-8 px-3 text-[12px] w-48 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5] font-mono"
            />

          </div>

          {/* SAVE SETTINGS */}

          <div className="flex justify-end">

            <Button
              variant="primary"
              size="sm"
              onClick={
                saveSettings
              }
              disabled={
                savingSettings
              }
            >
              {savingSettings
                ? "Saving..."
                : "Save Settings"}
            </Button>

          </div>

        </div>

      </Card>

      {/* ADD / EDIT MODAL */}

      {showAdd && (

        <Modal
          title={
            editingTax
              ? "Edit Tax Rate"
              : "Add Tax Rate"
          }
          onClose={() => {

            if (!saving) {

              setShowAdd(false);
              resetForm();

            }

          }}
        >

          <div className="space-y-4">

            <Input
              label="Tax Name"
              value={
                form.name
              }
              onChange={(v) =>
                updateForm(
                  "name",
                  v
                )
              }
              placeholder="e.g. Standard VAT"
              required
            />

            <Input
              label="Tax Code"
              value={
                form.code
              }
              onChange={(v) =>
                updateForm(
                  "code",
                  v
                )
              }
              placeholder="e.g. VAT-STD"
              required
            />

            <Input
              label="Rate (%)"
              value={
                form.rate
              }
              onChange={(v) =>
                updateForm(
                  "rate",
                  v
                )
              }
              placeholder="0"
              type="number"
              required
            />

            <Input
              label="Applies To"
              value={
                form.applies
              }
              onChange={(v) =>
                updateForm(
                  "applies",
                  v
                )
              }
              placeholder="e.g. All Products"
            />

            <Toggle
              checked={
                form.inclusive
              }
              onChange={(v) =>
                updateForm(
                  "inclusive",
                  v
                )
              }
              label="Price inclusive (tax included in displayed price)"
            />

            <Toggle
              checked={
                form.status
              }
              onChange={(v) =>
                updateForm(
                  "status",
                  v
                )
              }
              label="Active"
            />

            <div className="flex gap-3 pt-1">

              <Button
                variant="primary"
                onClick={
                  saveTax
                }
                disabled={
                  saving
                }
              >
                {saving
                  ? "Saving..."
                  : editingTax
                  ? "Update Tax Rate"
                  : "Save Tax Rate"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => {

                  if (!saving) {

                    setShowAdd(
                      false
                    );

                    resetForm();

                  }

                }}
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