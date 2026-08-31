import { useEffect, useMemo, useState } from "react";
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

// ============================================================
// API CONFIG
// ============================================================

const API_BASE = "http://localhost/rhea-pos-api";

// ============================================================
// TYPES
// ============================================================

type Store = {
  id: number;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  status?: string;
};

type Employee = {
  id: number;
  username?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  role_label?: string;
  status: string;
  stores: Store[];
  store_ids?: number[];
  pin?: string;
  lastLogin?: string | null;
  sales?: number;
};

type EmployeeForm = {
  name: string;
  email: string;
  phone: string;
  role: string;
  pin: string;
  confirmPin: string;
  status: string;
  storeIds: number[];
};

// ============================================================
// ROLES
// ============================================================

const ROLES = [
  {
    value: "store-manager",
    label: "Store Manager",
  },
  {
    value: "senior-cashier",
    label: "Senior Cashier",
  },
  {
    value: "cashier",
    label: "Cashier",
  },
  {
    value: "inventory-clerk",
    label: "Inventory Clerk",
  },
];

// ============================================================
// PERMISSIONS
// ============================================================

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "store-manager": [
    "Dashboard",
    "Sales",
    "Products",
    "Inventory",
    "Employees",
    "Reports",
    "Settings",
    "Discounts",
    "Refunds",
    "Cash Management",
  ],

  "senior-cashier": [
    "POS",
    "Sales",
    "Receipts",
    "Customers",
    "Cash Management",
    "Refunds",
  ],

  cashier: [
    "POS",
    "Receipts",
    "Customers",
  ],

  "inventory-clerk": [
    "Products",
    "Inventory",
    "Purchase Orders",
  ],
};

// ============================================================
// HELPERS
// ============================================================

function fmt(n: number) {
  return "$" + Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
  });
}

function getRoleLabel(role: string) {
  const found = ROLES.find((r) => r.value === role);

  if (found) {
    return found.label;
  }

  // Handle existing database values
  const normalized = role.toLowerCase();

  if (normalized === "store manager") return "Store Manager";
  if (normalized === "senior cashier") return "Senior Cashier";
  if (normalized === "cashier") return "Cashier";
  if (normalized === "inventory clerk") return "Inventory Clerk";

  return role;
}

function normalizeRole(role: string) {
  const normalized = role.toLowerCase().trim();

  if (normalized === "store manager") return "store-manager";
  if (normalized === "senior cashier") return "senior-cashier";
  if (normalized === "cashier") return "cashier";
  if (normalized === "inventory clerk") return "inventory-clerk";

  return role;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Never";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleString();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ============================================================
// AVATAR
// ============================================================

function Avatar({ name }: { name: string }) {
  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-pink-100 text-pink-700",
  ];

  const idx = name.charCodeAt(0) % colors.length;

  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${colors[idx]}`}
    >
      {getInitials(name)}
    </div>
  );
}

// ============================================================
// DEFAULT FORM
// ============================================================

const EMPTY_FORM: EmployeeForm = {
  name: "",
  email: "",
  phone: "",
  role: "",
  pin: "",
  confirmPin: "",
  status: "active",
  storeIds: [],
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Employees() {
  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  // ----------------------------------------------------------
  // UI STATE
  // ----------------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);

  const [detail, setDetail] = useState<Employee | null>(null);

  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ----------------------------------------------------------
  // LOAD STORES
  // ----------------------------------------------------------

  const loadStores = async () => {
    try {
      const response = await fetch(`${API_BASE}/stores/list.php`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load stores.");
      }

      setStores(data.stores || []);
    } catch (err) {
      console.error("Load stores error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load stores."
      );
    }
  };

  // ----------------------------------------------------------
  // LOAD EMPLOYEES
  // ----------------------------------------------------------

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/employees/list.php`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load employees.");
      }

      const loadedEmployees: Employee[] = (data.employees || []).map(
        (employee: Employee) => ({
          ...employee,
          role: normalizeRole(employee.role),
          stores: employee.stores || [],
          store_ids:
            employee.store_ids ||
            (employee.stores || []).map((store) => store.id),
        })
      );

      setEmployees(loadedEmployees);
    } catch (err) {
      console.error("Load employees error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load employees."
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------
  // INITIAL LOAD
  // ----------------------------------------------------------

  useEffect(() => {
    loadStores();
    loadEmployees();
  }, []);

  // ----------------------------------------------------------
  // FORM SETTER
  // ----------------------------------------------------------

  const setFormValue = <K extends keyof EmployeeForm>(
    key: K,
    value: EmployeeForm[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  // ----------------------------------------------------------
  // STORE SELECTION
  // ----------------------------------------------------------

  const toggleStore = (storeId: number) => {
    setForm((current) => {
      const exists = current.storeIds.includes(storeId);

      return {
        ...current,
        storeIds: exists
          ? current.storeIds.filter((id) => id !== storeId)
          : [...current.storeIds, storeId],
      };
    });
  };

  // ----------------------------------------------------------
  // OPEN ADD EMPLOYEE
  // ----------------------------------------------------------

  const openAddEmployee = () => {
    setError("");
    setSuccess("");

    setForm({
      ...EMPTY_FORM,
      storeIds: stores.length === 1 ? [stores[0].id] : [],
    });

    setShowAdd(true);
  };

  // ----------------------------------------------------------
  // OPEN EDIT EMPLOYEE
  // ----------------------------------------------------------

  const openEditEmployee = (employee: Employee) => {
    setError("");
    setSuccess("");

    setForm({
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      role: normalizeRole(employee.role || ""),
      pin: "",
      confirmPin: "",
      status: employee.status || "active",
      storeIds:
        employee.store_ids ||
        employee.stores?.map((store) => store.id) ||
        [],
    });

    setDetail(employee);
  };

  // ----------------------------------------------------------
  // ADD EMPLOYEE
  // ----------------------------------------------------------

  const handleAddEmployee = async () => {
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please enter the employee name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter the employee email.");
      return;
    }

    if (!form.role) {
      setError("Please select an employee role.");
      return;
    }

    if (form.storeIds.length === 0) {
      setError("Please assign at least one store.");
      return;
    }

    if (!form.pin) {
      setError("Please enter a 4-digit PIN.");
      return;
    }

    if (!/^\d{4}$/.test(form.pin)) {
      setError("PIN must contain exactly 4 digits.");
      return;
    }

    if (form.pin !== form.confirmPin) {
      setError("PIN confirmation does not match.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_BASE}/employees/create.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
  name: form.name.trim(),
  email: form.email.trim(),
  phone: form.phone.trim(),
  role: form.role,
  pin: form.pin,
  confirmPin: form.confirmPin,
  status: form.status,
  store_ids: form.storeIds,
}),
        
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to create employee."
        );
      }

      setSuccess("Employee added successfully.");

      setShowAdd(false);

      setForm(EMPTY_FORM);

      await loadEmployees();
    } catch (err) {
      console.error("Create employee error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create employee."
      );
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // UPDATE EMPLOYEE
  // ----------------------------------------------------------

  const handleUpdateEmployee = async () => {
    if (!detail) return;

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please enter the employee name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter the employee email.");
      return;
    }

    if (!form.role) {
      setError("Please select an employee role.");
      return;
    }

    if (form.storeIds.length === 0) {
      setError("Please assign at least one store.");
      return;
    }

    if (form.pin && !/^\d{4}$/.test(form.pin)) {
      setError("PIN must contain exactly 4 digits.");
      return;
    }

    if (form.pin && form.pin !== form.confirmPin) {
      setError("PIN confirmation does not match.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_BASE}/employees/update.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            id: detail.id,
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            role: form.role,
            status: form.status,
            store_ids: form.storeIds,
            ...(form.pin
              ? {
                  pin: form.pin,
                }
              : {}),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update employee."
        );
      }

      setSuccess("Employee updated successfully.");

      setDetail(null);

      setForm(EMPTY_FORM);

      await loadEmployees();
    } catch (err) {
      console.error("Update employee error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update employee."
      );
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // DELETE EMPLOYEE
  // ----------------------------------------------------------

  const handleRemoveEmployee = async (employee: Employee) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${employee.name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE}/employees/delete.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            id: employee.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to remove employee."
        );
      }

      setSuccess("Employee removed successfully.");

      await loadEmployees();
    } catch (err) {
      console.error("Delete employee error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove employee."
      );
    }
  };

  // ----------------------------------------------------------
  // ROLE COLORS
  // ----------------------------------------------------------

  const roleColors: Record<string, string> = {
    "Store Manager": "primary",
    "Senior Cashier": "info",
    Cashier: "neutral",
    "Inventory Clerk": "warning",
  };

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------

  const summary = useMemo(() => {
    return {
      total: employees.length,

      active: employees.filter(
        (e) => e.status === "active"
      ).length,

      cashiers: employees.filter((e) => {
        const role = getRoleLabel(e.role);
        return role.includes("Cashier");
      }).length,

      managers: employees.filter((e) => {
        const role = getRoleLabel(e.role);
        return role.includes("Manager");
      }).length,
    };
  }, [employees]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Employees
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            {employees.length} staff members ·{" "}
            {stores.length} stores
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openAddEmployee}
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
          Add Employee
        </Button>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-center gap-2">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>

            <span className="text-[12px] text-red-600">
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* ======================================================
          SUCCESS
      ====================================================== */}

      {success && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <span className="text-[12px] text-emerald-700">
            {success}
          </span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="text-emerald-500 hover:text-emerald-700"
          >
            ×
          </button>
        </div>
      )}

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Total Staff",
            value: summary.total,
            color: "#4F46E5",
          },
          {
            label: "Active",
            value: summary.active,
            color: "#10B981",
          },
          {
            label: "Cashiers",
            value: summary.cashiers,
            color: "#0EA5E9",
          },
          {
            label: "Managers",
            value: summary.managers,
            color: "#8B5CF6",
          },
        ].map((s) => (
          <Card key={s.label} className="px-5 py-4">
            <p className="text-[11px] text-[#64748B] mb-1">
              {s.label}
            </p>

            <p
              className="text-[20px] font-bold"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* ======================================================
          EMPLOYEE TABLE
      ====================================================== */}

      <Card>
        {loading ? (
          <div className="py-16 text-center">
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
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  opacity="0.3"
                />
                <path d="M3 12a9 9 0 019-9" />
              </svg>

              Loading employees...
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#F1F5F9] flex items-center justify-center mb-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748B"
                strokeWidth="1.7"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>

            <p className="text-[13px] font-semibold text-[#0F172A]">
              No employees yet
            </p>

            <p className="text-[11px] text-[#94A3B8] mt-1">
              Add your first employee.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table
              headers={[
                "Employee",
                "Role",
                "Email",
                "Phone",
                "Stores",
                "Sales",
                "Last Login",
                "Status",
                "",
              ]}
            >
              {employees.map((employee) => {
                const roleLabel = getRoleLabel(
                  employee.role
                );

                return (
                  <Tr
                    key={employee.id}
                    onClick={() =>
                      setDetail(employee)
                    }
                  >
                    {/* EMPLOYEE */}
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={employee.name} />

                        <div>
                          <span className="text-[13px] font-medium text-[#0F172A]">
                            {employee.name}
                          </span>

                          {employee.username && (
                            <p className="text-[10px] text-[#94A3B8]">
                              @{employee.username}
                            </p>
                          )}
                        </div>
                      </div>
                    </Td>

                    {/* ROLE */}
                    <Td>
                      <Badge
                        variant={
                          (roleColors[roleLabel] as any) ||
                          "neutral"
                        }
                      >
                        {roleLabel}
                      </Badge>
                    </Td>

                    {/* EMAIL */}
                    <Td>
                      <span className="text-[#64748B]">
                        {employee.email || "—"}
                      </span>
                    </Td>

                    {/* PHONE */}
                    <Td mono>
                      {employee.phone || "—"}
                    </Td>

                    {/* STORES */}
                    <Td>
                      <div className="flex gap-1 flex-wrap max-w-[220px]">
                        {employee.stores &&
                        employee.stores.length > 0 ? (
                          employee.stores.map(
                            (store) => (
                              <span
                                key={store.id}
                                className="text-[10px] bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] px-1.5 py-0.5 rounded-md"
                              >
                                {store.name}
                              </span>
                            )
                          )
                        ) : (
                          <span className="text-[10px] text-red-500">
                            No store
                          </span>
                        )}
                      </div>
                    </Td>

                    {/* SALES */}
                    <Td>
                      <span className="font-medium text-[#0F172A]">
                        {employee.sales &&
                        employee.sales > 0
                          ? fmt(employee.sales)
                          : "—"}
                      </span>
                    </Td>

                    {/* LAST LOGIN */}
                    <Td>
                      <span className="text-[11px] text-[#94A3B8]">
                        {formatDate(
                          employee.lastLogin
                        )}
                      </span>
                    </Td>

                    {/* STATUS */}
                    <Td>
                      <Badge
                        variant={
                          employee.status ===
                          "active"
                            ? "success"
                            : "neutral"
                        }
                      >
                        {employee.status}
                      </Badge>
                    </Td>

                    {/* ACTIONS */}
                    <Td>
                      <div
                        className="flex gap-1"
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openEditEmployee(
                              employee
                            )
                          }
                        >
                          Edit
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            handleRemoveEmployee(
                              employee
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Table>
          </div>
        )}
      </Card>

      {/* ======================================================
          ADD EMPLOYEE MODAL
      ====================================================== */}

      {showAdd && (
        <Modal
          title="Add Employee"
          onClose={() => {
            if (!saving) {
              setShowAdd(false);
            }
          }}
          width="max-w-xl"
        >
          <div className="space-y-4">

            <Input
              label="Full Name"
              value={form.name}
              onChange={(value) =>
                setFormValue("name", value)
              }
              placeholder="e.g. Ana Reyes"
              required
            />

            <Input
              label="Email"
              value={form.email}
              onChange={(value) =>
                setFormValue("email", value)
              }
              placeholder="employee@meridian.com"
              type="email"
              required
            />

            <Input
              label="Phone"
              value={form.phone}
              onChange={(value) =>
                setFormValue("phone", value)
              }
              placeholder="+1 555-0000"
            />

            <Select
              label="Role"
              value={form.role}
              onChange={(value) =>
                setFormValue("role", value)
              }
              placeholder="Select role"
              options={ROLES}
            />

            {/* STORE ASSIGNMENT */}
            <div>
              <p className="text-[12px] font-medium text-[#374151] mb-2">
                Assign Stores
                <span className="text-red-500 ml-1">
                  *
                </span>
              </p>

              {stores.length === 0 ? (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-3">
                  <p className="text-[11px] text-amber-700">
                    No stores available. Create a
                    store first before adding an
                    employee.
                  </p>
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                  {stores.map((store) => {
                    const checked =
                      form.storeIds.includes(
                        store.id
                      );

                    return (
                      <label
                        key={store.id}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                          checked
                            ? "bg-[#EEF2FF] border border-[#C7D2FE]"
                            : "bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              checked
                                ? "bg-[#4F46E5] border-[#4F46E5]"
                                : "border-[#CBD5E1]"
                            }`}
                            onClick={() =>
                              toggleStore(
                                store.id
                              )
                            }
                          >
                            {checked && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 10 10"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                              >
                                <polyline points="2,5 4,7 8,3" />
                              </svg>
                            )}
                          </div>

                          <div>
                            <p className="text-[12px] font-medium text-[#0F172A]">
                              {store.name}
                            </p>

                            {store.address && (
                              <p className="text-[10px] text-[#94A3B8]">
                                {store.address}
                              </p>
                            )}
                          </div>
                        </div>

                        {store.status && (
                          <span className="text-[10px] text-[#64748B]">
                            {store.status}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              <p className="text-[10px] text-[#94A3B8] mt-1.5">
                Select all stores where this employee
                is allowed to work.
              </p>
            </div>

            {/* PIN */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="PIN (4 digits)"
                value={form.pin}
                onChange={(value) =>
                  setFormValue(
                    "pin",
                    value.replace(/\D/g, "").slice(0, 4)
                  )
                }
                placeholder="••••"
                type="password"
              />

              <Input
                label="Confirm PIN"
                value={form.confirmPin}
                onChange={(value) =>
                  setFormValue(
                    "confirmPin",
                    value
                      .replace(/\D/g, "")
                      .slice(0, 4)
                  )
                }
                placeholder="••••"
                type="password"
              />
            </div>

            {/* STATUS */}
            <div className="flex items-center justify-between border border-[#E2E8F0] rounded-xl px-4 py-3">
              <div>
                <p className="text-[12px] font-medium text-[#0F172A]">
                  Employee Active
                </p>

                <p className="text-[10px] text-[#94A3B8]">
                  Allow this employee to login.
                </p>
              </div>

              <Toggle
                checked={form.status === "active"}
                onChange={(checked) =>
                  setFormValue(
                    "status",
                    checked
                      ? "active"
                      : "inactive"
                  )
                }
              />
            </div>

            {/* BUTTONS */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleAddEmployee}
                disabled={saving}
              >
                {saving
                  ? "Creating..."
                  : "Add Employee"}
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  setShowAdd(false)
                }
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================
          EMPLOYEE DETAIL / EDIT
      ====================================================== */}

      {detail && (
        <Modal
          title="Employee Details"
          onClose={() => {
            if (!saving) {
              setDetail(null);
            }
          }}
          width="max-w-2xl"
        >
          <div className="space-y-5">

            {/* HEADER */}
            <div className="flex items-center gap-4 pb-4 border-b border-[#F1F5F9]">
              <Avatar name={form.name} />

              <div className="flex-1">
                <h3 className="text-[15px] font-bold text-[#0F172A]">
                  {form.name || detail.name}
                </h3>

                <p className="text-[12px] text-[#64748B]">
                  {form.email ||
                    detail.email}
                </p>
              </div>

              <Badge
                variant={
                  (roleColors[
                    getRoleLabel(form.role)
                  ] as any) ||
                  "neutral"
                }
              >
                {getRoleLabel(form.role)}
              </Badge>
            </div>

            {/* BASIC INFORMATION */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(value) =>
                  setFormValue(
                    "name",
                    value
                  )
                }
              />

              <Input
                label="Email"
                value={form.email}
                onChange={(value) =>
                  setFormValue(
                    "email",
                    value
                  )
                }
                type="email"
              />

              <Input
                label="Phone"
                value={form.phone}
                onChange={(value) =>
                  setFormValue(
                    "phone",
                    value
                  )
                }
              />

              <Select
                label="Role"
                value={form.role}
                onChange={(value) =>
                  setFormValue(
                    "role",
                    value
                  )
                }
                options={ROLES}
              />
            </div>

            {/* STORE ASSIGNMENT */}
            <div>
              <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                Store Access
              </p>

              <div className="border border-[#E2E8F0] rounded-xl p-3 space-y-2 max-h-52 overflow-y-auto">
                {stores.map((store) => {
                  const checked =
                    form.storeIds.includes(
                      store.id
                    );

                  return (
                    <label
                      key={store.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                        checked
                          ? "bg-[#EEF2FF] border border-[#C7D2FE]"
                          : "bg-[#F8FAFC] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleStore(
                              store.id
                            )
                          }
                          className="sr-only"
                        />

                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            checked
                              ? "bg-[#4F46E5] border-[#4F46E5]"
                              : "border-[#CBD5E1]"
                          }`}
                        >
                          {checked && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                            >
                              <polyline points="2,5 4,7 8,3" />
                            </svg>
                          )}
                        </div>

                        <div>
                          <p className="text-[12px] font-medium text-[#0F172A]">
                            {store.name}
                          </p>

                          {store.address && (
                            <p className="text-[10px] text-[#94A3B8]">
                              {store.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <p className="text-[10px] text-[#94A3B8] mt-1.5">
                This employee will only be able
                to access the selected stores.
              </p>
            </div>

            {/* PERMISSIONS */}
            <div>
              <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                Permissions
              </p>

              <div className="flex flex-wrap gap-2">
                {(
                  ROLE_PERMISSIONS[
                    normalizeRole(
                      form.role
                    )
                  ] || []
                ).map((permission) => (
                  <span
                    key={permission}
                    className="text-[11px] bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] px-2 py-0.5 rounded-md"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>

            {/* STATUS */}
            <div className="flex items-center justify-between border border-[#E2E8F0] rounded-xl px-4 py-3">
              <div>
                <p className="text-[12px] font-medium text-[#0F172A]">
                  Employee Active
                </p>

                <p className="text-[10px] text-[#94A3B8]">
                  Inactive employees cannot
                  login.
                </p>
              </div>

              <Toggle
                checked={
                  form.status === "active"
                }
                onChange={(checked) =>
                  setFormValue(
                    "status",
                    checked
                      ? "active"
                      : "inactive"
                  )
                }
              />
            </div>

            {/* RESET PIN */}
            <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-4">
              <p className="text-[12px] font-semibold text-[#C2410C] mb-2">
                Change PIN
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="New PIN"
                  value={form.pin}
                  onChange={(value) =>
                    setFormValue(
                      "pin",
                      value
                        .replace(/\D/g, "")
                        .slice(0, 4)
                    )
                  }
                  placeholder="••••"
                  type="password"
                />

                <Input
                  label="Confirm PIN"
                  value={form.confirmPin}
                  onChange={(value) =>
                    setFormValue(
                      "confirmPin",
                      value
                        .replace(/\D/g, "")
                        .slice(0, 4)
                    )
                  }
                  placeholder="••••"
                  type="password"
                />
              </div>

              <p className="text-[10px] text-[#9A3412] mt-2">
                Leave blank if you do not want to
                change the current PIN.
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="primary"
                onClick={
                  handleUpdateEmployee
                }
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  setDetail(null)
                }
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