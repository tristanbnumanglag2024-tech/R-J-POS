import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Badge,
  Button,
  SearchBar,
  Table,
  Tr,
  Td,
  Modal,
  Input,
  Toggle,
} from "../../components/ui";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

interface ActiveStore {
  id: number;
  store_name?: string;
  branch_name?: string;
}

interface Supplier {
  id: number;
  store_id: number;

  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  city: string;

  products: number;
  orders: number;
  outstanding: number;
  lastOrder: string | null;

  status: "active" | "inactive";

  created_at?: string;
  updated_at?: string;
}

interface SuppliersProps {
  activeStore?: ActiveStore | null;
}

interface SupplierForm {
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: boolean;
}

function fmt(n: number) {
  return "$" + Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
  });
}

export default function Suppliers({ activeStore }: SuppliersProps) {
  const [list, setList] = useState<Supplier[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);

  const [detail, setDetail] = useState<Supplier | null>(null);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState<SupplierForm>({
    name: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    status: true,
  });

  /*
  |--------------------------------------------------------------------------
  | LOAD SUPPLIERS
  |--------------------------------------------------------------------------
  */

  const loadSuppliers = async () => {
    if (!activeStore?.id) {
      setList([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/suppliers/list.php?store_id=${activeStore.id}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load suppliers."
        );
      }

      setList(Array.isArray(data.suppliers) ? data.suppliers : []);

    } catch (err) {

      console.error("Load suppliers error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load suppliers."
      );

      setList([]);

    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD WHEN STORE CHANGES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadSuppliers();
  }, [activeStore?.id]);

  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filtered = useMemo(() => {

    const q = search.trim().toLowerCase();

    if (!q) {
      return list;
    }

    return list.filter((s) =>
      [
        s.name,
        s.contact,
        s.email,
        s.phone,
        s.city,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );

  }, [list, search]);

  /*
  |--------------------------------------------------------------------------
  | OPEN ADD
  |--------------------------------------------------------------------------
  */

  const openAdd = () => {

    setForm({
      name: "",
      contact: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      status: true,
    });

    setError("");

    setShowAdd(true);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN EDIT
  |--------------------------------------------------------------------------
  */

  const openEdit = (supplier: Supplier) => {

    setDetail(supplier);

    setForm({
      name: supplier.name,
      contact: supplier.contact || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      status: supplier.status === "active",
    });

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE
  |--------------------------------------------------------------------------
  */

  const handleCreate = async () => {

    if (!activeStore?.id) {
      setError("Please select a store first.");
      return;
    }

    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    try {

      setSaving(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/suppliers/create.php`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            store_id: activeStore.id,

            name: form.name.trim(),
            contact: form.contact.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),

            status: form.status ? "active" : "inactive",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to create supplier."
        );
      }

      setShowAdd(false);

      await loadSuppliers();

    } catch (err) {

      console.error("Create supplier error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create supplier."
      );

    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UPDATE
  |--------------------------------------------------------------------------
  */

  const handleUpdate = async () => {

    if (!activeStore?.id || !detail) {
      return;
    }

    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    try {

      setSaving(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/suppliers/update.php`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: detail.id,

            store_id: activeStore.id,

            name: form.name.trim(),
            contact: form.contact.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),

            status: form.status ? "active" : "inactive",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update supplier."
        );
      }

      setDetail(null);

      await loadSuppliers();

    } catch (err) {

      console.error("Update supplier error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update supplier."
      );

    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DEACTIVATE
  |--------------------------------------------------------------------------
  */

  const handleDelete = async (supplier: Supplier) => {

    if (!activeStore?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Deactivate "${supplier.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {

      setSaving(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/suppliers/delete.php`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: supplier.id,
            store_id: activeStore.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to deactivate supplier."
        );
      }

      await loadSuppliers();

    } catch (err) {

      console.error("Delete supplier error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to deactivate supplier."
      );

    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | SUMMARY
  |--------------------------------------------------------------------------
  */

  const totalSuppliers = list.length;

  const activeSuppliers = list.filter(
    (s) => s.status === "active"
  ).length;

  const totalOrders = list.reduce(
    (sum, s) => sum + Number(s.orders || 0),
    0
  );

  const outstanding = list.reduce(
    (sum, s) => sum + Number(s.outstanding || 0),
    0
  );

  /*
  |--------------------------------------------------------------------------
  | NO STORE
  |--------------------------------------------------------------------------
  */

  if (!activeStore?.id) {

    return (
      <div className="p-6">

        <Card className="p-10 text-center">

          <div className="mx-auto w-12 h-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center mb-3">
            <span className="text-xl">🏪</span>
          </div>

          <h3 className="text-[14px] font-semibold text-[#0F172A]">
            No Store Selected
          </h3>

          <p className="text-[12px] text-[#64748B] mt-1">
            Please select a store from the store selector above.
          </p>

        </Card>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Suppliers
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">

            {list.length} vendors

            {" • "}

            {activeStore.branch_name ||
              activeStore.store_name ||
              `Store #${activeStore.id}`}

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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          Add Supplier
        </Button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-600">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div className="grid grid-cols-4 gap-3">

        {[
          {
            label: "Total Suppliers",
            value: totalSuppliers,
            color: "#4F46E5",
          },
          {
            label: "Total Orders",
            value: totalOrders,
            color: "#0EA5E9",
          },
          {
            label: "Outstanding Balance",
            value: fmt(outstanding),
            color: "#F59E0B",
          },
          {
            label: "Active",
            value: activeSuppliers,
            color: "#10B981",
          },
        ].map((s) => (

          <Card
            key={s.label}
            className="px-5 py-4"
          >

            <p className="text-[11px] text-[#64748B] mb-1">
              {s.label}
            </p>

            <p
              className="text-[18px] font-bold"
              style={{ color: s.color }}
            >
              {s.value}
            </p>

          </Card>

        ))}

      </div>

      {/* SEARCH */}

      <Card className="p-4">

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers..."
        />

      </Card>

      {/* TABLE */}

      <Card>

        {loading ? (

          <div className="py-16 text-center">

            <p className="text-[13px] text-[#64748B]">
              Loading suppliers...
            </p>

          </div>

        ) : filtered.length === 0 ? (

          <div className="py-16 text-center">

            <div className="mx-auto w-12 h-12 rounded-xl bg-[#F1F5F9] flex items-center justify-center mb-3">
              <span className="text-xl">🏢</span>
            </div>

            <p className="text-[13px] font-medium text-[#0F172A]">
              {search
                ? "No suppliers found"
                : "No suppliers yet"}
            </p>

            <p className="text-[11px] text-[#94A3B8] mt-1">
              {search
                ? "Try another search."
                : "Add your first supplier for this store."}
            </p>

          </div>

        ) : (

          <Table
            headers={[
              "Supplier",
              "Contact",
              "Location",
              "Products",
              "Orders",
              "Outstanding",
              "Last Order",
              "Status",
              "",
            ]}
          >

            {filtered.map((s) => (

              <Tr
                key={s.id}
                onClick={() => openEdit(s)}
              >

                <Td>

                  <div>

                    <p className="text-[13px] font-semibold text-[#0F172A]">
                      {s.name}
                    </p>

                    <p className="text-[11px] text-[#94A3B8]">
                      {s.email || "No email"}
                    </p>

                  </div>

                </Td>

                <Td>
                  {s.contact || "—"}
                </Td>

                <Td>

                  <span className="text-[#64748B]">
                    {s.city || "—"}
                  </span>

                </Td>

                <Td>

                  <span className="bg-[#F1F5F9] text-[#475569] text-[11px] font-medium px-2 py-0.5 rounded-md">
                    {s.products}
                  </span>

                </Td>

                <Td>

                  <span className="text-[#64748B]">
                    {s.orders}
                  </span>

                </Td>

                <Td>

                  {s.outstanding > 0 ? (

                    <span className="font-semibold text-amber-600">
                      {fmt(s.outstanding)}
                    </span>

                  ) : (

                    <span className="text-emerald-600 font-medium">
                      Paid
                    </span>

                  )}

                </Td>

                <Td>

                  <span className="text-[11px] text-[#94A3B8]">
                    {s.lastOrder || "—"}
                  </span>

                </Td>

                <Td>

                  <Badge
                    variant={
                      s.status === "active"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {s.status}
                  </Badge>

                </Td>

                <Td>

                  <div className="flex gap-1">

                    <Button
  variant="ghost"
  size="sm"
  onClick={() => openEdit(s)}
>
  Edit
</Button>

                    <Button
  variant="primary"
  size="sm"
  onClick={() => {
    alert(
      `Purchase Order for ${s.name} will be implemented next.`
    );
  }}
>
  New PO
</Button>

                  </div>

                </Td>

              </Tr>

            ))}

          </Table>

        )}

      </Card>

      {/* ADD SUPPLIER */}

      {showAdd && (

        <Modal
          title="Add Supplier"
          onClose={() => {
            if (!saving) {
              setShowAdd(false);
            }
          }}
        >

          <div className="space-y-4">

            <Input
              label="Company Name"
              value={form.name}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  name: v,
                }))
              }
              placeholder="e.g. ElecTech Wholesale"
              required
            />

            <Input
              label="Contact Person"
              value={form.contact}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  contact: v,
                }))
              }
              placeholder="e.g. David Kim"
            />

            <Input
              label="Email"
              value={form.email}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  email: v,
                }))
              }
              placeholder="contact@supplier.com"
              type="email"
            />

            <Input
              label="Phone"
              value={form.phone}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  phone: v,
                }))
              }
              placeholder="+63 900 000 0000"
            />

            <Input
              label="Address"
              value={form.address}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  address: v,
                }))
              }
              placeholder="Supplier address"
            />

            <Input
              label="City"
              value={form.city}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  city: v,
                }))
              }
              placeholder="e.g. Laoag City"
            />

            <Toggle
              checked={form.status}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  status: v,
                }))
              }
              label="Active"
            />

            <div className="flex gap-3 pt-1">

              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Supplier"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowAdd(false)}
                disabled={saving}
              >
                Cancel
              </Button>

            </div>

          </div>

        </Modal>

      )}

      {/* EDIT SUPPLIER */}

      {detail && (

        <Modal
          title="Supplier Details"
          onClose={() => {
            if (!saving) {
              setDetail(null);
            }
          }}
        >

          <div className="space-y-4">

            <Input
              label="Company Name"
              value={form.name}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  name: v,
                }))
              }
              required
            />

            <Input
              label="Contact Person"
              value={form.contact}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  contact: v,
                }))
              }
            />

            <Input
              label="Email"
              value={form.email}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  email: v,
                }))
              }
              type="email"
            />

            <Input
              label="Phone"
              value={form.phone}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  phone: v,
                }))
              }
            />

            <Input
              label="Address"
              value={form.address}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  address: v,
                }))
              }
            />

            <Input
              label="City"
              value={form.city}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  city: v,
                }))
              }
            />

            <Toggle
              checked={form.status}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  status: v,
                }))
              }
              label="Active"
            />

            <div className="flex gap-3 pt-2">

              <Button
                variant="primary"
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>

              <Button
                variant="danger"
                onClick={() => handleDelete(detail)}
                disabled={saving}
              >
                Deactivate
              </Button>

              <Button
                variant="secondary"
                onClick={() => setDetail(null)}
                disabled={saving}
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