import { useEffect, useState } from "react";
import { API_BASE } from "./config/api";
// Auth
import AdminLogin from "./pages/auth/AdminLogin";

// Back Office layout
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

// Back Office pages
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import AddProduct from "./pages/AddProduct";
import Categories from "./pages/Categories";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Receipts from "./pages/Receipts";
import StoreTransfers from "./pages/backoffice/StoreTransfers";
import Customers from "./pages/backoffice/Customers";
import Employees from "./pages/backoffice/Employees";
import Discounts from "./pages/backoffice/Discounts";
import Taxes from "./pages/backoffice/Taxes";
import PaymentMethods from "./pages/backoffice/PaymentMethods";
import Suppliers from "./pages/backoffice/Suppliers";
import PurchaseOrders from "./pages/backoffice/PurchaseOrders";
import StockAdjustments from "./pages/backoffice/StockAdjustments";
import InventoryCount from "./pages/backoffice/InventoryCount";
import DeliveryReport from "./pages/backoffice/DeliveryReport";
import CashManagement from "./pages/backoffice/CashManagement";
import Reports from "./pages/backoffice/Reports";
import Settings from "./pages/backoffice/Settings";


// ============================================================
// TYPES
// ============================================================

type AppMode =
  | "admin-login"
  | "back-office";

type BOPage =
  | "dashboard"
  | "sales"
  | "receipts"
  | "store-transfers"
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
  | "inventory-counts"
  | "delivery-report"
  | "cash-management"
  | "reports"
  | "settings"
  | "add-product";

// ============================================================
// STORE TYPE
// ============================================================

export interface Store {
  id: number;
  store_name: string;
  branch_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  currency?: string;
  business_registration_no?: string;
  tax_registration_no?: string;
  logo?: string | null;
  status?: string;
  is_default?: number;
}

// ============================================================
// PAGE META
// ============================================================

const PAGE_META: Record<
  BOPage,
  { title: string; subtitle?: string }
> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Overview of your store performance",
  },

  sales: {
    title: "Sales",
    subtitle: "All transactions",
  },

  receipts: {
    title: "Receipts",
    subtitle: "Search and manage receipts",
  },

  "store-transfers": {
    title: "Store Transfers",
    subtitle: "Transfer stock between stores",
  },

  products: {
    title: "Products",
    subtitle: "Manage your product catalog",
  },

  categories: {
    title: "Categories",
    subtitle: "Organize products by category",
  },

  inventory: {
    title: "Inventory",
    subtitle: "Stock levels and management",
  },

  customers: {
    title: "Customers",
    subtitle: "Customer database",
  },

  employees: {
    title: "Employees",
    subtitle: "Staff and access management",
  },

  discounts: {
    title: "Discounts",
    subtitle: "Promotions and discount rules",
  },

  taxes: {
    title: "Taxes",
    subtitle: "Tax rates and configuration",
  },

  "payment-methods": {
    title: "Payment Methods",
    subtitle: "Configure accepted payments",
  },

  suppliers: {
    title: "Suppliers",
    subtitle: "Vendor and supplier management",
  },

  "purchase-orders": {
    title: "Purchase Orders",
    subtitle: "Incoming stock orders",
  },

  "stock-adjustments": {
    title: "Stock Adjustments",
    subtitle: "Manual inventory corrections",
  },

  "inventory-counts": {
    title: "Inventory Counts",
    subtitle: "Physical stock counting and reconciliation",
  },

  "delivery-report": {
    title: "Delivery Report",
    subtitle: "Record and track incoming deliveries",
  },

  "cash-management": {
    title: "Cash Management",
    subtitle: "Till and float management",
  },

  reports: {
    title: "Reports",
    subtitle: "Business analytics and exports",
  },

  settings: {
    title: "Settings",
    subtitle: "Store configuration",
  },

  "add-product": {
    title: "Add Product",
    subtitle: "Create a new product",
  },
};

// ============================================================
// API
// ============================================================



// ============================================================
// AUTHENTICATED ADMIN USER ID
// ============================================================
// Settings is centralized by user_id, so always read the
// currently logged-in admin ID from the same admin session
// already used by this App.
function getAuthenticatedAdminUserId(): number | null {
  try {
    const savedAdmin = localStorage.getItem("admin");

    if (!savedAdmin) {
      return null;
    }

    const parsed = JSON.parse(savedAdmin);
    const id = Number(parsed?.id);

    return Number.isInteger(id) && id > 0 ? id : null;
  } catch (error) {
    console.error("Unable to read authenticated admin ID:", error);
    return null;
  }
}

// ============================================================
// APP
// ============================================================

export default function App() {

  // ==========================================================
  // APP MODE
  // ==========================================================

const [mode, setMode] = useState<AppMode>("admin-login");
  const [checkingSession, setCheckingSession] = useState(true);

  // ==========================================================
  // VERIFY PHP SESSION
  // ==========================================================
  // The PHP session is the source of truth. localStorage only
  // stores the user information for UI/configuration purposes.
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/session.php`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        const data = await response.json();

        if (!mounted) return;

        if (response.ok && data?.authenticated === true) {
          if (data.user) {
            localStorage.setItem("admin", JSON.stringify(data.user));
          }

          setMode("back-office");
        } else {
          localStorage.removeItem("admin");
          setMode("admin-login");
        }
      } catch (error) {
        console.error("Unable to verify PHP session:", error);

        if (!mounted) return;

        localStorage.removeItem("admin");
        setMode("admin-login");
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================
  // STORE MANAGEMENT
  // ==========================================================

  const [stores, setStores] =
    useState<Store[]>([]);

  const [selectedStore, setSelectedStore] =
    useState<Store | null>(null);

  const [loadingStores, setLoadingStores] =
    useState(true);

  const [storeError, setStoreError] =
    useState("");

  // ==========================================================
  // LOAD STORES
  // ==========================================================

  useEffect(() => {

    const loadStores = async () => {

      try {

        setLoadingStores(true);
        setStoreError("");

        const response = await fetch(
          `${API_BASE}/stores/list.php`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        const data = await response.json();

        console.log(
          "STORE API RESPONSE:",
          data
        );

        if (!data.success) {

          throw new Error(
            data.message ||
            "Unable to load stores."
          );
        }

        const fetchedStores: Store[] =
          Array.isArray(data.stores)
            ? data.stores.map((store: any) => ({
                ...store,
                id: Number(store.id),
              }))
            : [];

        setStores(fetchedStores);

        // ====================================================
        // RESTORE PREVIOUS STORE
        // ====================================================

        const savedStoreId =
          localStorage.getItem(
            "selected_store_id"
          );

        let storeToSelect: Store | null = null;

        if (savedStoreId) {

          storeToSelect =
            fetchedStores.find(
              (store) =>
                Number(store.id) ===
                Number(savedStoreId)
            ) || null;
        }

        // ====================================================
        // IF NO SAVED STORE, USE DEFAULT STORE
        // ====================================================

        if (!storeToSelect) {

          storeToSelect =
            fetchedStores.find(
              (store) =>
                Number(store.is_default) === 1
            ) || null;
        }

        // ====================================================
        // OTHERWISE USE FIRST STORE
        // ====================================================

        if (
          !storeToSelect &&
          fetchedStores.length > 0
        ) {
          storeToSelect =
            fetchedStores[0];
        }

        // ====================================================
        // SET SELECTED STORE
        // ====================================================

        if (storeToSelect) {

          setSelectedStore(
            storeToSelect
          );

          localStorage.setItem(
            "selected_store_id",
            String(storeToSelect.id)
          );
        }

      } catch (error) {

        console.error(
          "Load stores error:",
          error
        );

        setStoreError(
          error instanceof Error
            ? error.message
            : "Unable to load stores."
        );

      } finally {

        setLoadingStores(false);
      }
    };

    loadStores();

  }, []);

  // ==========================================================
  // STORE CHANGE
  // ==========================================================

  const handleStoreChange =
    (store: Store) => {

      console.log(
        "STORE CHANGED:",
        store
      );

      setSelectedStore(store);

      localStorage.setItem(
        "selected_store_id",
        String(store.id)
      );

      /*
       * IMPORTANT
       *
       * Every store-dependent page can now use
       * selectedStore.id when calling PHP.
       *
       * Example:
       *
       * ?store_id=1
       */
    };

  // ==========================================================
  // BACK OFFICE
  // ==========================================================

  const [boPage, setBOPage] =
    useState<BOPage>("dashboard");

  const [prevBOPage, setPrevBOPage] =
    useState<BOPage>("products");

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const navigateBO = (
    page: BOPage
  ) => {

    if (page !== "add-product") {
      setPrevBOPage(page);
    }

    setBOPage(page);
  };

  // ==========================================================
  // ADMIN LOGIN
  // ==========================================================

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-sm text-slate-500">
          Checking session...
        </div>
      </div>
    );
  }

  if (mode === "admin-login") {

    return (
      <AdminLogin
        onLogin={() =>
          setMode("back-office")
        }
      />
    );
  }

  // ==========================================================
  // BACK OFFICE PAGE META
  // ==========================================================

  const meta =
    PAGE_META[boPage];

  // ==========================================================
  // RENDER BACK OFFICE PAGE
  // ==========================================================

  const renderBOPage = () => {

    switch (boPage) {

      case "dashboard":
        return (
         <Dashboard
  activeStoreId={selectedStore?.id ?? null}
  currency={selectedStore?.currency ?? "PHP"}
  onNavigate={(page) =>
    navigateBO(page as BOPage)
  }
/>
        );

   case "products":
  return (
    <Products
      onAddProduct={() =>
        navigateBO("add-product")
      }
      activeStoreId={selectedStore?.id ?? null}
    />
  );

case "add-product":
  return (
    <AddProduct
      activeStoreId={selectedStore?.id ?? null}
      onBack={() =>
        navigateBO(
          prevBOPage === "add-product"
            ? "products"
            : prevBOPage
        )
      }
    />
  );

     case "categories":
        return <Categories />;

      case "inventory":
  return (
    <Inventory
      activeStoreId={
        selectedStore?.id ?? null
      }
    />
  );

     case "sales":
  return (
    <Sales
      activeStoreId={selectedStore?.id ?? null}
    />
  );

      case "receipts":
        return (
          <Receipts
            activeStoreId={selectedStore?.id ?? null}
          />
        );

      case "store-transfers":
        return (
          <StoreTransfers
            activeStoreId={selectedStore?.id ?? null}
          />
        );

      case "customers":
  return (
    <Customers
      activeStoreId={
        selectedStore?.id ?? null
      }
    />
  );

      case "employees":
        return <Employees />;

      case "discounts":
  return (
    <Discounts
      activeStoreId={
        selectedStore?.id ?? null
      }
    />
  );

     case "taxes":
  return (
    <Taxes
      activeStoreId={
        selectedStore?.id ?? null
      }
    />
  );
      case "payment-methods":
  return (
    <PaymentMethods
      activeStoreId={selectedStore?.id ?? null}
    />
  );
 case "suppliers":
  return (
    <Suppliers
      activeStore={selectedStore}
    />
  );

     case "purchase-orders":
  return (
    <PurchaseOrders
      activeStoreId={
        selectedStore?.id ?? null
      }
    />
  );

     case "stock-adjustments":
  return (
    <StockAdjustments
      activeStoreId={
        selectedStore?.id ?? null
      }
    />
  );

      case "inventory-counts":
        return (
          <InventoryCount
            activeStoreId={selectedStore?.id ?? null}
          />
        );

      case "delivery-report":
        return <DeliveryReport />;

      case "cash-management":
        return (
          <CashManagement />
        );

     case "reports":
  return (
    <Reports
      activeStoreId={
        selectedStore?.id ?? null
      }
    />
  );

      case "settings":
        return (
          <Settings
            userId={getAuthenticatedAdminUserId()}
          />
        );

      default:
        return null;
    }
  };

  // ==========================================================
  // BACK OFFICE
  // ==========================================================

  return (
    <div className="flex h-full bg-[#F8FAFC]">

      {/* SIDEBAR */}

     
     <Sidebar
  currentPage={boPage}
  onNavigate={navigateBO}
  onLogout={async () => {
  const confirmed = window.confirm(
    "Are you sure you want to logout?"
  );

  if (!confirmed) return;

  try {
    await fetch(`${API_BASE}/logout.php`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    console.error("Logout error:", error);
  }

  localStorage.removeItem("admin");
  setMode("admin-login");
}}
/>

      {/* CONTENT */}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* TOP BAR */}

        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}

          stores={stores}

          selectedStore={
            selectedStore
          }

          onStoreChange={
            handleStoreChange
          }
        />

        {/* OPTIONAL STORE LOADING ERROR */}

        {storeError && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-[11px] text-red-600">
            Unable to load stores:{" "}
            {storeError}
          </div>
        )}

        {/* MAIN CONTENT */}

        <main className="flex-1 overflow-y-auto">

          {renderBOPage()}

        </main>

      </div>

    </div>
  );
}