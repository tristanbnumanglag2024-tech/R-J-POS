import logo from "/logo2.png";

type Page =
  | "dashboard"
  | "sales"
  | "receipts"
  | "products"
  | "categories"
  | "inventory"
  | "customers"
  | "employees"
  | "discounts"
  | "taxes"
  | "payment-methods"
  | "suppliers"
  | "purchase-orders"
  | "stock-adjustments"
  | "cash-management"
  | "reports"
  | "settings"
  | "add-product"
  | "store-transfers";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

interface AdminUser {
  id?: number;
  username?: string;
  email?: string;
  full_name?: string;
  role?: string;
}

interface Store {
  id?: number;
  store_name?: string;
  branch_name?: string;
  logo?: string | null;
  status?: string;
}

const navGroups = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: GridIcon },
    ],
  },
  {
    label: "Transactions",
    items: [
      { id: "sales", label: "Sales", icon: ReceiptIcon },
      { id: "receipts", label: "Receipts", icon: DocumentIcon },
      { id: "cash-management", label: "Cash Management", icon: CashIcon },
    ],
  },
  {
    label: "Catalog",
    items: [
      { id: "products", label: "Products", icon: BoxIcon },
      { id: "categories", label: "Categories", icon: TagIcon },
      { id: "inventory", label: "Inventory", icon: WarehouseIcon },
      { id: "stock-adjustments", label: "Stock Adjustments", icon: AdjustIcon },
      { id: "store-transfers", label: "Store Transfers", icon: TransferIcon },
    ],
  },
  {
    label: "People",
    items: [
      { id: "customers", label: "Customers", icon: UsersIcon },
      { id: "employees", label: "Employees", icon: BadgeIcon },
      { id: "suppliers", label: "Suppliers", icon: TruckIcon },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "discounts", label: "Discounts", icon: PercentIcon },
      { id: "taxes", label: "Taxes", icon: TaxIcon },
      { id: "payment-methods", label: "Payment Methods", icon: CardIcon },
      { id: "purchase-orders", label: "Purchase Orders", icon: ClipboardIcon },
    ],
  },
  {
    label: "Analytics",
    items: [
      { id: "reports", label: "Reports", icon: ChartIcon },
    ],
  },
  {
    label: "System",
    items: [
      { id: "settings", label: "Settings", icon: GearIcon },
    ],
  },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  onLogout,
}: SidebarProps) {

  // ============================================================
  // GET ADMIN
  // ============================================================

  const getAdmin = (): AdminUser | null => {
    try {
      const savedAdmin = localStorage.getItem("admin");

      if (!savedAdmin) {
        return null;
      }

      const parsed = JSON.parse(savedAdmin);

      return parsed && typeof parsed === "object"
        ? parsed
        : null;
    } catch (error) {
      console.error("Unable to read admin session:", error);
      return null;
    }
  };

  // ============================================================
  // GET SELECTED STORE
  // ============================================================

  const getSelectedStore = (): Store | null => {
    try {
      const savedStore = localStorage.getItem("selected_store");

      if (savedStore) {
        const parsed = JSON.parse(savedStore);

        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Unable to read selected store:", error);
    }

    return null;
  };

  const admin = getAdmin();
  const selectedStore = getSelectedStore();

  // ============================================================
  // DISPLAY VALUES
  // ============================================================

  const adminName =
    admin?.full_name ||
    admin?.username ||
    "Administrator";

  const adminEmail =
    admin?.email ||
    "No email available";

  const adminRole =
    admin?.role ||
    "Administrator";

  const storeName =
    selectedStore?.store_name ||
    "No Store Selected";

  const branchName =
    selectedStore?.branch_name ||
    "No Branch";

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmed) {
      return;
    }

    onLogout();
  };

  return (
    <aside className="w-[220px] shrink-0 bg-[#0F172A] flex flex-col h-full overflow-hidden">

      {/* ====================================================== */}
      {/* LOGO */}
      {/* ====================================================== */}

      <div className="px-5 py-5 border-b border-white/10">

        <div className="flex items-center gap-2.5">

          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">

            <img
              src={logo}
              alt="Rhea POS"
              className="w-full h-full object-contain p-1"
            />

          </div>

          <div className="min-w-0">

            <p className="text-white text-[13px] font-semibold leading-tight truncate">
              Rhea POS
            </p>

            <p className="text-white/40 text-[10px] leading-tight truncate">
              Back Office
            </p>

          </div>

        </div>

      </div>

      {/* ====================================================== */}
      {/* NAVIGATION */}
      {/* ====================================================== */}

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">

        {navGroups.map((group) => (

          <div key={group.label}>

            <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-2 mb-1">
              {group.label}
            </p>

            {group.items.map((item) => {

              const Icon = item.icon;
              const active = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onNavigate(item.id as Page)
                  }
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group ${
                    active
                      ? "bg-[#4F46E5] text-white"
                      : "text-white/55 hover:text-white hover:bg-white/8"
                  }`}
                >

                  <Icon
                    size={15}
                    active={active}
                  />

                  <span className="text-[13px] font-medium">
                    {item.label}
                  </span>

                </button>
              );
            })}

          </div>

        ))}

      </nav>

      {/* ====================================================== */}
      {/* BOTTOM USER / STORE */}
      {/* ====================================================== */}

      <div className="border-t border-white/10 p-3 space-y-1">

        {/* STORE */}

      
        {/* ADMIN PROFILE */}

        <div className="px-2.5 py-2 rounded-lg hover:bg-white/5 transition-all">

          <div className="flex items-center gap-2.5">

            <div className="w-8 h-8 rounded-full bg-[#4F46E5] flex items-center justify-center shrink-0">

              <span className="text-white text-[11px] font-bold uppercase">
                {getInitials(adminName)}
              </span>

            </div>

            <div className="min-w-0">

              <p className="text-white text-[12px] font-semibold truncate">
                {adminName}
              </p>

              <p className="text-white/40 text-[10px] truncate">
                {adminEmail}
              </p>

              <p className="text-white/25 text-[9px] capitalize truncate mt-0.5">
                {adminRole}
              </p>

            </div>

          </div>

        </div>

        {/* PROFILE BUTTON */}

       
        {/* LOGOUT */}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all text-left"
        >

          <LogoutIcon
            size={15}
            active={false}
          />

          <span className="text-[13px]">
            Logout
          </span>

        </button>

      </div>

    </aside>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "A";
  }

  if (words.length === 1) {
    return words[0].substring(0, 2);
  }

  return (
    words[0].charAt(0) +
    words[words.length - 1].charAt(0)
  );
}

// ============================================================
// ICON COMPONENTS
// ============================================================

function Ico({
  size,
  d,
}: {
  size: number;
  d: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

function GridIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ReceiptIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <Ico
      size={size}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    />
  );
}

function DocumentIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <Ico
      size={size}
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  );
}

function BoxIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <Ico
      size={size}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  );
}

function TagIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <Ico
      size={size}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
    />
  );
}

function WarehouseIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}

function UsersIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <Ico
      size={size}
      d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
    />
  );
}

function BadgeIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <Ico
      size={size}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-2.296.07-2.572-1.065z"
    />
  );
}

function TruckIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function PercentIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <Ico
      size={size}
      d="M19 5L5 19M9 6.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM20.5 17.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  );
}

function TaxIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 14l6-6" />
      <path d="M5 20l14-14M17 20H5a2 2 0 01-2-2V5" />
    </svg>
  );
}

function CardIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function ClipboardIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <Ico
      size={size}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  );
}

function AdjustIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function CashIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function ChartIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function GearIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
function TransferIcon({ size }: { size: number; active: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
}

function ProfileIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LogoutIcon({
  size,
}: {
  size: number;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}