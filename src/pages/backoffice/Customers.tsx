import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Card,
  Badge,
  Button,
  SearchBar,
  Select,
  Table,
  Tr,
  Td,
  Pagination,
  Modal,
  Input,
} from "../../components/ui";

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API_BASE =
  "https://sakuracareapi.site/rhea-pos-api/customers";

const LIST_API =
  `${API_BASE}/list.php`;

const CREATE_API =
  `${API_BASE}/create.php`;

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type Customer = {
  id: number;

  store_id: number;

  name: string;
  email: string;
  phone: string;
  city: string;

  points: number;
  totalSpend: number;
  visits: number;

  status: string;
  joined: string;

  created_at?: string;
  updated_at?: string;
};

type ListResponse = {
  success: boolean;
  message?: string;
  customers?: Customer[];
};

type CreateResponse = {
  success: boolean;
  message?: string;
  customer?: Customer;
};

/*
|--------------------------------------------------------------------------
| AVATAR
|--------------------------------------------------------------------------
*/

function Avatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const colors = [
    "bg-indigo-100 text-indigo-600",
    "bg-sky-100 text-sky-600",
    "bg-pink-100 text-pink-600",
    "bg-amber-100 text-amber-600",
    "bg-emerald-100 text-emerald-600",
    "bg-violet-100 text-violet-600",
  ];

  const safeName =
    name?.trim() || "Customer";

  const idx =
    safeName.charCodeAt(0) %
    colors.length;

  const sz =
    size === "md"
      ? "w-10 h-10 text-[13px]"
      : "w-8 h-8 text-[11px]";

  const initials =
    safeName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div
      className={`
        ${sz}
        rounded-full
        flex
        items-center
        justify-center
        font-semibold
        shrink-0
        ${colors[idx]}
      `}
    >
      {initials}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| FORMATTERS
|--------------------------------------------------------------------------
*/

function fmt(value: number) {
  return "₱" +
    Number(value || 0).toLocaleString(
      "en-PH",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function Customers({
  activeStoreId,
}: {
  activeStoreId: number | null;
}) {
  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [detail, setDetail] =
    useState<Customer | null>(null);

  const [showAdd, setShowAdd] =
    useState(false);

  const [addError, setAddError] =
    useState("");

  const [addForm, setAddForm] =
    useState({
      name: "",
      email: "",
      phone: "",
      city: "",
    });

  const PER_PAGE = 7;

  /*
  |--------------------------------------------------------------------------
  | LOAD CUSTOMERS
  |--------------------------------------------------------------------------
  */

  const loadCustomers =
    useCallback(async () => {

      if (!activeStoreId) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      try {

        setLoading(true);
        setError("");

        const response =
          await fetch(
            `${LIST_API}?store_id=${encodeURIComponent(
              activeStoreId
            )}`,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        const data: ListResponse =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to load customers."
          );
        }

        setCustomers(
          Array.isArray(
            data.customers
          )
            ? data.customers
            : []
        );

      } catch (err) {

        console.error(
          "Customers load error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load customers."
        );

        setCustomers([]);

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

    setPage(1);
    setSearch("");
    setStatusFilter("");
    setDetail(null);

    loadCustomers();

  }, [
    activeStoreId,
    loadCustomers,
  ]);

  /*
  |--------------------------------------------------------------------------
  | FILTER CUSTOMERS
  |--------------------------------------------------------------------------
  */

  const filtered =
    useMemo(() => {

      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return customers.filter(
        (customer) => {

          const matchesSearch =
            !normalizedSearch ||
            customer.name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            customer.email
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            customer.phone
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            customer.city
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesStatus =
            !statusFilter ||
            customer.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );

    }, [
      customers,
      search,
      statusFilter,
    ]);

  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  const paged =
    useMemo(() => {

      const start =
        (page - 1) *
        PER_PAGE;

      return filtered.slice(
        start,
        start + PER_PAGE
      );

    }, [
      filtered,
      page,
    ]);

  /*
  |--------------------------------------------------------------------------
  | SUMMARY
  |--------------------------------------------------------------------------
  */

  const totalCustomers =
    customers.length;

  const activeCustomers =
    customers.filter(
      (customer) =>
        customer.status ===
        "active"
    ).length;

  const totalPoints =
    customers.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.points || 0
        ),
      0
    );

  const totalRevenue =
    customers.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.totalSpend || 0
        ),
      0
    );

  /*
  |--------------------------------------------------------------------------
  | SEARCH / FILTER PAGE RESET
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | ADD CUSTOMER
  |--------------------------------------------------------------------------
  */

  const addCustomer =
    async () => {

      if (!activeStoreId) {
        setAddError(
          "Please select a store first."
        );
        return;
      }

      const name =
        addForm.name.trim();

      const email =
        addForm.email.trim();

      const phone =
        addForm.phone.trim();

      const city =
        addForm.city.trim();

      if (!name) {
        setAddError(
          "Customer name is required."
        );
        return;
      }

      try {

        setSaving(true);
        setAddError("");

        const response =
          await fetch(
            CREATE_API,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body: JSON.stringify({
                store_id:
                  activeStoreId,

                name,

                email,

                phone,

                city,
              }),
            }
          );

        const data: CreateResponse =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to create customer."
          );
        }

        /*
        |--------------------------------------------------------------------------
        | ADD SERVER CUSTOMER TO LIST
        |--------------------------------------------------------------------------
        */

        if (data.customer) {

          setCustomers(
            (current) => [
              data.customer!,
              ...current,
            ]
          );

          setDetail(
            data.customer
          );
        } else {

          /*
          |--------------------------------------------------------------------------
          | FALLBACK
          |--------------------------------------------------------------------------
          */

          await loadCustomers();
        }

        /*
        |--------------------------------------------------------------------------
        | RESET FORM
        |--------------------------------------------------------------------------
        */

        setAddForm({
          name: "",
          email: "",
          phone: "",
          city: "",
        });

        setShowAdd(false);
        setPage(1);

      } catch (err) {

        console.error(
          "Create customer error:",
          err
        );

        setAddError(
          err instanceof Error
            ? err.message
            : "Failed to create customer."
        );

      } finally {

        setSaving(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | NO STORE
  |--------------------------------------------------------------------------
  */

  if (!activeStoreId) {

    return (
      <div className="p-6 max-w-[1300px]">

        <Card className="p-10">

          <div className="text-center">

            <div className="text-3xl mb-3">
              🏪
            </div>

            <p className="text-[14px] font-semibold text-[#0F172A]">
              No store selected
            </p>

            <p className="text-[12px] text-[#64748B] mt-1">
              Select a store to view its customers.
            </p>

          </div>

        </Card>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {

    return (
      <div className="p-6 max-w-[1300px]">

        <div className="flex items-center gap-3">

          <div className="w-5 h-5 border-2 border-[#E2E8F0] border-t-[#4F46E5] rounded-full animate-spin" />

          <span className="text-[13px] text-[#64748B]">
            Loading customers...
          </span>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="p-6 space-y-5 max-w-[1300px]">

      {/* ================================================================
          HEADER
      ================================================================= */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Customers
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">

            {totalCustomers.toLocaleString()}{" "}
            registered customer
            {totalCustomers !== 1
              ? "s"
              : ""}

          </p>

        </div>

        <div className="flex gap-2">

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {

              const rows =
                customers.map(
                  (customer) => [
                    customer.name,
                    customer.email,
                    customer.phone,
                    customer.city,
                    customer.points,
                    customer.totalSpend,
                    customer.visits,
                    customer.status,
                    customer.joined,
                  ]
                );

              const csv = [
                [
                  "Name",
                  "Email",
                  "Phone",
                  "City",
                  "Points",
                  "Total Spend",
                  "Visits",
                  "Status",
                  "Joined",
                ],
                ...rows,
              ]
                .map((row) =>
                  row
                    .map(
                      (value) =>
                        `"${String(
                          value ?? ""
                        ).replace(
                          /"/g,
                          '""'
                        )}"`
                    )
                    .join(",")
                )
                .join("\n");

              const blob =
                new Blob(
                  [csv],
                  {
                    type:
                      "text/csv;charset=utf-8;",
                  }
                );

              const url =
                URL.createObjectURL(
                  blob
                );

              const link =
                document.createElement(
                  "a"
                );

              link.href = url;
              link.download =
                `customers-store-${activeStoreId}.csv`;

              document.body.appendChild(
                link
              );

              link.click();

              document.body.removeChild(
                link
              );

              URL.revokeObjectURL(
                url
              );
            }}
          >
            Export
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {

              setAddError("");

              setAddForm({
                name: "",
                email: "",
                phone: "",
                city: "",
              });

              setShowAdd(true);
            }}
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
            Add Customer
          </Button>

        </div>

      </div>

      {/* ================================================================
          ERROR
      ================================================================= */}

      {error && (

        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">

          <p className="text-[12px] font-semibold text-red-800">
            Unable to load customers
          </p>

          <p className="text-[11px] text-red-700 mt-0.5">
            {error}
          </p>

          <button
            type="button"
            onClick={loadCustomers}
            className="text-[11px] font-medium text-red-700 hover:underline mt-2"
          >
            Try again
          </button>

        </div>

      )}

      {/* ================================================================
          SUMMARY
      ================================================================= */}

      <div className="grid grid-cols-4 gap-3">

        <Card className="px-5 py-4">

          <p className="text-[11px] text-[#64748B] mb-1">
            Total Customers
          </p>

          <p className="text-[20px] font-bold text-[#4F46E5]">
            {totalCustomers.toLocaleString()}
          </p>

        </Card>

        <Card className="px-5 py-4">

          <p className="text-[11px] text-[#64748B] mb-1">
            Active
          </p>

          <p className="text-[20px] font-bold text-[#10B981]">
            {activeCustomers.toLocaleString()}
          </p>

        </Card>

        <Card className="px-5 py-4">

          <p className="text-[11px] text-[#64748B] mb-1">
            Total Loyalty Points
          </p>

          <p className="text-[20px] font-bold text-[#F59E0B]">
            {totalPoints.toLocaleString()}
          </p>

        </Card>

        <Card className="px-5 py-4">

          <p className="text-[11px] text-[#64748B] mb-1">
            Total Revenue
          </p>

          <p className="text-[20px] font-bold text-[#0EA5E9]">
            {fmt(totalRevenue)}
          </p>

        </Card>

      </div>

      {/* ================================================================
          FILTERS
      ================================================================= */}

      <Card className="p-4">

        <div className="flex flex-wrap gap-3 items-center">

          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Name, email, phone..."
          />

          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
            options={[
              {
                value: "active",
                label: "Active",
              },
              {
                value: "inactive",
                label: "Inactive",
              },
            ]}
          />

          <button
            type="button"
            onClick={loadCustomers}
            className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC]"
          >
            Refresh
          </button>

          <span className="text-[12px] text-[#94A3B8] ml-auto">

            {filtered.length}{" "}
            result
            {filtered.length !== 1
              ? "s"
              : ""}

          </span>

        </div>

      </Card>

      {/* ================================================================
          CUSTOMER TABLE
      ================================================================= */}

      <Card>

        {paged.length === 0 ? (

          <div className="p-10 text-center">

            <div className="text-3xl mb-3">
              👤
            </div>

            <p className="text-[14px] font-semibold text-[#0F172A]">
              No customers found
            </p>

            <p className="text-[12px] text-[#64748B] mt-1">
              {search ||
              statusFilter
                ? "Try changing your search or filter."
                : "Add your first customer to this store."}
            </p>

          </div>

        ) : (

          <Table
            headers={[
              "Customer",
              "Email",
              "Phone",
              "City",
              "Points",
              "Total Spend",
              "Visits",
              "Status",
              "Joined",
              "",
            ]}
          >

            {paged.map(
              (customer) => (

                <Tr
                  key={customer.id}
                  onClick={() =>
                    setDetail(
                      customer
                    )
                  }
                >

                  <Td>

                    <div className="flex items-center gap-2.5">

                      <Avatar
                        name={
                          customer.name
                        }
                      />

                      <span className="text-[13px] font-medium text-[#0F172A]">

                        {customer.name}

                      </span>

                    </div>

                  </Td>

                  <Td>

                    <span className="text-[#64748B]">

                      {customer.email ||
                        "—"}

                    </span>

                  </Td>

                  <Td mono>

                    {customer.phone ||
                      "—"}

                  </Td>

                  <Td>

                    <span className="text-[#64748B]">

                      {customer.city ||
                        "—"}

                    </span>

                  </Td>

                  <Td>

                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-600">

                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>

                      {Number(
                        customer.points ||
                          0
                      ).toLocaleString()}

                    </span>

                  </Td>

                  <Td>

                    <span className="font-semibold text-[#0F172A]">

                      {fmt(
                        Number(
                          customer.totalSpend ||
                            0
                        )
                      )}

                    </span>

                  </Td>

                  <Td>

                    <span className="bg-[#F1F5F9] text-[#475569] text-[11px] font-medium px-2 py-0.5 rounded-md">

                      {Number(
                        customer.visits ||
                          0
                      ).toLocaleString()}

                    </span>

                  </Td>

                  <Td>

                    <Badge
                      variant={
                        customer.status ===
                        "active"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {customer.status ===
                      "active"
                        ? "Active"
                        : "Inactive"}
                    </Badge>

                  </Td>

                  <Td>

                    <span className="text-[11px] text-[#94A3B8]">

                      {formatDate(
                        customer.joined
                      )}

                    </span>

                  </Td>

                  <Td>

                    <button
                      type="button"
                      onClick={(
                        event
                      ) => {

                        event.stopPropagation();

                        setDetail(
                          customer
                        );
                      }}
                      className="text-[12px] text-[#4F46E5] font-medium hover:text-[#4338CA]"
                    >
                      View →
                    </button>

                  </Td>

                </Tr>

              )
            )}

          </Table>
        )}

        {filtered.length > 0 && (

          <Pagination
            page={page}
            total={
              filtered.length
            }
            perPage={PER_PAGE}
            onChange={setPage}
          />

        )}

      </Card>

      {/* ================================================================
          CUSTOMER DETAIL
      ================================================================= */}

      {detail && (

        <Modal
          title="Customer Profile"
          onClose={() =>
            setDetail(null)
          }
          width="max-w-2xl"
        >

          <div className="space-y-5">

            <div className="flex items-center gap-4">

              <Avatar
                name={
                  detail.name
                }
                size="md"
              />

              <div className="flex-1">

                <h3 className="text-[16px] font-bold text-[#0F172A]">

                  {detail.name}

                </h3>

                <p className="text-[12px] text-[#64748B]">

                  {detail.email ||
                    "No email"}{" "}
                  ·{" "}
                  {detail.phone ||
                    "No phone"}

                </p>

                <p className="text-[11px] text-[#94A3B8] mt-0.5">

                  Customer since{" "}
                  {formatDate(
                    detail.joined
                  )}{" "}
                  ·{" "}
                  {detail.city ||
                    "No city"}

                </p>

              </div>

              <Badge
                variant={
                  detail.status ===
                  "active"
                    ? "success"
                    : "neutral"
                }
              >
                {detail.status ===
                "active"
                  ? "Active"
                  : "Inactive"}
              </Badge>

            </div>

            {/* ==========================================================
                STATS
            ========================================================== */}

            <div className="grid grid-cols-3 gap-3">

              <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">

                <p className="text-[11px] text-[#64748B] mb-1">
                  Total Spend
                </p>

                <p className="text-[16px] font-bold text-[#4F46E5]">

                  {fmt(
                    Number(
                      detail.totalSpend ||
                        0
                    )
                  )}

                </p>

              </div>

              <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">

                <p className="text-[11px] text-[#64748B] mb-1">
                  Loyalty Points
                </p>

                <p className="text-[16px] font-bold text-[#F59E0B]">

                  {Number(
                    detail.points ||
                      0
                  ).toLocaleString()}{" "}
                  pts

                </p>

              </div>

              <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">

                <p className="text-[11px] text-[#64748B] mb-1">
                  Total Visits
                </p>

                <p className="text-[16px] font-bold text-[#10B981]">

                  {Number(
                    detail.visits ||
                      0
                  ).toLocaleString()}{" "}
                  visits

                </p>

              </div>

            </div>

            {/* ==========================================================
                CUSTOMER INFORMATION
            ========================================================== */}

            <div>

              <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">

                Customer Information

              </p>

              <div className="grid grid-cols-2 gap-3">

                <div className="bg-[#F8FAFC] rounded-lg p-3">

                  <p className="text-[10px] text-[#94A3B8]">
                    Customer ID
                  </p>

                  <p className="text-[12px] font-mono text-[#475569] mt-1">

                    #{detail.id}

                  </p>

                </div>

                <div className="bg-[#F8FAFC] rounded-lg p-3">

                  <p className="text-[10px] text-[#94A3B8]">
                    Store ID
                  </p>

                  <p className="text-[12px] font-mono text-[#475569] mt-1">

                    #{detail.store_id}

                  </p>

                </div>

                <div className="bg-[#F8FAFC] rounded-lg p-3">

                  <p className="text-[10px] text-[#94A3B8]">
                    Email
                  </p>

                  <p className="text-[12px] text-[#475569] mt-1 break-all">

                    {detail.email ||
                      "—"}

                  </p>

                </div>

                <div className="bg-[#F8FAFC] rounded-lg p-3">

                  <p className="text-[10px] text-[#94A3B8]">
                    Phone
                  </p>

                  <p className="text-[12px] text-[#475569] mt-1">

                    {detail.phone ||
                      "—"}

                  </p>

                </div>

              </div>

            </div>

            {/* ==========================================================
                ACTIONS
            ========================================================== */}

            <div className="flex gap-3 pt-1">

              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  setDetail(null)
                }
              >
                Close
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setDetail(null)
                }
              >
                View History
              </Button>

            </div>

          </div>

        </Modal>
      )}

      {/* ================================================================
          ADD CUSTOMER
      ================================================================= */}

      {showAdd && (

        <Modal
          title="Add New Customer"
          onClose={() => {

            if (!saving) {
              setShowAdd(false);
              setAddError("");
            }

          }}
        >

          <div className="space-y-4">

            {addError && (

              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">

                <p className="text-[11px] text-red-700">
                  {addError}
                </p>

              </div>

            )}

            <Input
              label="Full Name"
              value={
                addForm.name
              }
              onChange={(value) =>
                setAddForm(
                  (current) => ({
                    ...current,
                    name: value,
                  })
                )
              }
              placeholder="e.g. Juan Dela Cruz"
              required
            />

            <Input
              label="Email"
              value={
                addForm.email
              }
              onChange={(value) =>
                setAddForm(
                  (current) => ({
                    ...current,
                    email: value,
                  })
                )
              }
              placeholder="customer@email.com"
              type="email"
            />

            <Input
              label="Phone"
              value={
                addForm.phone
              }
              onChange={(value) =>
                setAddForm(
                  (current) => ({
                    ...current,
                    phone: value,
                  })
                )
              }
              placeholder="09XXXXXXXXX"
            />

            <Input
              label="City"
              value={
                addForm.city
              }
              onChange={(value) =>
                setAddForm(
                  (current) => ({
                    ...current,
                    city: value,
                  })
                )
              }
              placeholder="e.g. Laoag City"
            />

            <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2">

              <p className="text-[10px] text-[#94A3B8]">
                Store
              </p>

              <p className="text-[12px] font-medium text-[#475569] mt-0.5">

                Store #{activeStoreId}

              </p>

              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                This customer will be registered under the currently selected store.
              </p>

            </div>

            <div className="flex gap-3 pt-1">

              <Button
                variant="primary"
                onClick={addCustomer}
                disabled={saving}
              >

                {saving
                  ? "Saving..."
                  : "Save Customer"}

              </Button>

              <Button
                variant="secondary"
                onClick={() => {

                  if (saving) {
                    return;
                  }

                  setShowAdd(false);
                  setAddError("");

                }}
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