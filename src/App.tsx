import { useEffect, useState } from "react";

// Auth
import AdminLogin from "./pages/auth/AdminLogin";
import POSLogin from "./pages/auth/POSLogin";

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

import Customers from "./pages/backoffice/Customers";
import Employees from "./pages/backoffice/Employees";
import Discounts from "./pages/backoffice/Discounts";
import Taxes from "./pages/backoffice/Taxes";
import PaymentMethods from "./pages/backoffice/PaymentMethods";
import Suppliers from "./pages/backoffice/Suppliers";
import PurchaseOrders from "./pages/backoffice/PurchaseOrders";
import StockAdjustments from "./pages/backoffice/StockAdjustments";
import CashManagement from "./pages/backoffice/CashManagement";
import Reports from "./pages/backoffice/Reports";
import Settings from "./pages/backoffice/Settings";

// POS
import POSMain from "./pages/pos/POSMain";
import POSPayment from "./pages/pos/POSPayment";
import POSSuccess from "./pages/pos/POSSuccess";
import POSLockScreen from "./pages/pos/POSLockScreen";

// ============================================================
// TYPES
// ============================================================

type AppMode =
  | "admin-login"
  | "pos-login"
  | "back-office"
  | "pos";

type POSView =
  | "main"
  | "payment"
  | "success"
  | "locked";

type BOPage =
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
// CART
// ============================================================

type CartItem = {
  id: number;
  name: string;
  sku: string;
  price: number;
  qty: number;
  discount: number;
  category: string;
};

// ============================================================
// API
// ============================================================

const API_BASE = "http://sakuracareapi.site/rhea-pos-api";

// ============================================================
// APP
// ============================================================

export default function App() {

  // ==========================================================
  // APP MODE
  // ==========================================================

const [mode, setMode] = useState<AppMode>(() => {
  try {
    const savedAdmin = localStorage.getItem("admin");

    if (savedAdmin) {
      return "back-office";
    }

    return "admin-login";
  } catch (error) {
    console.error(
      "Unable to restore admin session:",
      error
    );

    return "admin-login";
  }
});

  const [cashier, setCashier] =
    useState("Admin User");

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
  // POS
  // ==========================================================

  const [posView, setPOSView] =
    useState<POSView>("main");

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [customer, setCustomer] =
    useState<string | null>(null);

  const [payMethod, setPayMethod] =
    useState("cash");

  const [amountPaid, setAmountPaid] =
    useState(0);

  const [changeGiven, setChangeGiven] =
    useState(0);

  const [subtotal, setSubtotal] =
    useState(0);

  const [discount, setDiscount] =
    useState(0);

  const [tax, setTax] =
    useState(0);

  const [total, setTotal] =
    useState(0);

  const [receiptNo] =
    useState(
      "RCP-" +
      new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "") +
      "-" +
      String(
        Math.floor(
          Math.random() * 90 + 10
        )
      ).padStart(4, "0")
    );

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
  // POS PAYMENT
  // ==========================================================

  const handlePOSPay = (
    cartItems: CartItem[],
    cust: string | null,
    sub: number,
    disc: number,
    tx: number,
    tot: number
  ) => {

    setCart(cartItems);
    setCustomer(cust);
    setSubtotal(sub);
    setDiscount(disc);
    setTax(tx);
    setTotal(tot);

    setPOSView("payment");
  };

  // ==========================================================
  // PAYMENT COMPLETE
  // ==========================================================

  const handlePayComplete = (
    method: string,
    paid: number,
    chg: number
  ) => {

    setPayMethod(method);
    setAmountPaid(paid);
    setChangeGiven(chg);

    setPOSView("success");
  };

  // ==========================================================
  // NEW SALE
  // ==========================================================

  const handleNewSale = () => {

    setCart([]);
    setCustomer(null);
    setSubtotal(0);
    setDiscount(0);
    setTax(0);
    setTotal(0);
    setAmountPaid(0);
    setChangeGiven(0);

    setPOSView("main");
  };

  // ==========================================================
  // ADMIN LOGIN
  // ==========================================================

  if (mode === "admin-login") {

    return (
      <AdminLogin
        onLogin={() =>
          setMode("back-office")
        }

        onSwitchToPOS={() =>
          setMode("pos-login")
        }
      />
    );
  }

  // ==========================================================
  // POS LOGIN
  // ==========================================================

  if (mode === "pos-login") {

    return (
      <POSLogin
        onLogin={(name) => {

          setCashier(name);

          setMode("pos");

          setPOSView("main");
        }}

        onSwitchToAdmin={() =>
          setMode("admin-login")
        }
      />
    );
  }

  // ==========================================================
  // POS
  // ==========================================================

  if (mode === "pos") {

    // LOCK SCREEN

    if (posView === "locked") {

      return (
        <POSLockScreen
          cashier={cashier}
          onUnlock={() =>
            setPOSView("main")
          }
        />
      );
    }

    // PAYMENT

    if (posView === "payment") {

      return (
        <POSPayment
          total={total}
          subtotal={subtotal}
          discount={discount}
          tax={tax}
          customer={customer}

          onComplete={(
            method,
            paid,
            chg
          ) =>
            handlePayComplete(
              method,
              paid,
              chg
            )
          }

          onBack={() =>
            setPOSView("main")
          }

          onCancel={() =>
            setPOSView("main")
          }
        />
      );
    }

    // SUCCESS

    if (posView === "success") {

      return (
        <POSSuccess
          receiptNo={receiptNo}
          total={total}
          method={payMethod}
          amountPaid={amountPaid}
          change={changeGiven}
          customer={customer}
          cashier={cashier}

          cartItems={cart.map(
            (item) => ({
              name: item.name,
              qty: item.qty,
              price: item.price,
            })
          )}

          subtotal={subtotal}
          discount={discount}
          tax={tax}

          onNewSale={
            handleNewSale
          }
        />
      );
    }

    // MAIN POS

    return (
      <POSMain
        cashier={cashier}

        onPay={handlePOSPay}

        onLock={() =>
          setPOSView("locked")
        }

        onLogout={() =>
          setMode("pos-login")
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
  return (
    <Categories
      activeStoreId={selectedStore?.id ?? null}
    />
  );

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
        return <Receipts />;

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
        return <Settings />;

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
  onLogout={() => {
  const confirmed = window.confirm(
    "Are you sure you want to logout?"
  );

  if (!confirmed) return;

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