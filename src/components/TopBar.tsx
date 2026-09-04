import { useEffect, useState } from "react";


// ============================================================
// STORE TYPE
// ============================================================

export interface Store {
  id: number;
  store_name: string;
  branch_name: string;

  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;

  country?: string | null;
  currency?: string | null;

  business_registration_no?: string | null;
  tax_registration_no?: string | null;

  logo?: string | null;

  status?: string | null;

  is_default?: number | string;

  created_at?: string;
  updated_at?: string;
}


// ============================================================
// PROPS
// ============================================================

interface TopBarProps {
  title: string;
  subtitle?: string;

  selectedStore: Store | null;

  /*
   * Kept in the props so your existing parent component
   * does NOT need to be changed.
   *
   * TopBar does NOT use this value anymore.
   */
  stores?: Store[];

  onStoreChange: (store: Store) => void;
}


// ============================================================
// API BASE
// ============================================================
//
// IMPORTANT:
// Use the SAME API_BASE you already use in your project.
//
// Example:
//
// const API_BASE = "http://localhost/your-api";
//
// If you already have API_BASE imported from another file,
// replace this constant with your existing import.
//

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";


// ============================================================
// TOPBAR
// ============================================================

export default function TopBar({
  title,
  subtitle,
  selectedStore,
  onStoreChange,
}: TopBarProps) {

  const [search, setSearch] = useState("");

  const [showNotif, setShowNotif] =
    useState(false);

  const [showStores, setShowStores] =
    useState(false);

  const [stores, setStores] =
    useState<Store[]>([]);

  const [loadingStores, setLoadingStores] =
    useState(false);

  const [storeError, setStoreError] =
    useState("");


// ============================================================
// LOAD TOPBAR STORES
// ============================================================

  const loadTopbarStores = async () => {

    try {

      setLoadingStores(true);
      setStoreError("");

      const response = await fetch(
        `${API_BASE}/stores/topbar.php`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          "Failed to load active stores."
        );

      }

      const activeStores: Store[] =
        Array.isArray(data.stores)
          ? data.stores
          : [];

      setStores(activeStores);


      // ========================================================
      // AUTOMATIC DEFAULT STORE
      // ========================================================

      if (activeStores.length === 0) {

        /*
         * No active stores.
         *
         * Do not select anything.
         */

        return;
      }


      // ========================================================
      // CHECK CURRENT SELECTED STORE
      // ========================================================

      const selectedStillActive =
        selectedStore &&
        activeStores.some(
          (store) =>
            Number(store.id) ===
            Number(selectedStore.id)
        );


      if (selectedStillActive) {

        /*
         * Current store is still active.
         *
         * Keep it.
         */

        return;
      }


      // ========================================================
      // FIND ACTIVE DEFAULT
      // ========================================================

      const defaultStore =
        activeStores.find(
          (store) =>
            Number(store.is_default) === 1
        );


      // ========================================================
      // SELECT DEFAULT OR FIRST ACTIVE
      // ========================================================

      const storeToSelect =
        defaultStore ||
        activeStores[0];


      onStoreChange(storeToSelect);

    } catch (error) {

      console.error(
        "TopBar store API error:",
        error
      );

      setStoreError(
        error instanceof Error
          ? error.message
          : "Unable to load active stores."
      );

    } finally {

      setLoadingStores(false);

    }
  };


// ============================================================
// LOAD WHEN TOPBAR OPENS
// ============================================================

  useEffect(() => {

    loadTopbarStores();

  }, []);


// ============================================================
// RELOAD WHEN DROPDOWN OPENS
// ============================================================

  useEffect(() => {

    if (showStores) {
      loadTopbarStores();
    }

  }, [showStores]);


// ============================================================
// STORE SELECT
// ============================================================

  const handleStoreSelect = (
    store: Store
  ) => {

    onStoreChange(store);

    setShowStores(false);
  };


// ============================================================
// CLOSE DROPDOWNS
// ============================================================

  useEffect(() => {

    const handleClickOutside = (
      event: MouseEvent
    ) => {

      const target =
        event.target as HTMLElement;


      if (
        !target.closest(
          "[data-store-selector]"
        )
      ) {

        setShowStores(false);

      }


      if (
        !target.closest(
          "[data-notification]"
        )
      ) {

        setShowNotif(false);

      }

    };


    document.addEventListener(
      "mousedown",
      handleClickOutside
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };

  }, []);


// ============================================================
// RENDER
// ============================================================

  return (

    <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center px-6 gap-4 shrink-0 z-10">


      {/* ======================================================
          TITLE
      ====================================================== */}

      <div className="flex-1 min-w-0">

        <h1 className="text-[15px] font-semibold text-[#0F172A] leading-tight">
          {title}
        </h1>

        {subtitle && (

          <p className="text-[11px] text-[#64748B]">
            {subtitle}
          </p>

        )}

      </div>


      {/* ======================================================
          STORE SELECTOR
      ====================================================== */}

      <div
        className="relative hidden lg:block"
        data-store-selector
      >

        <button
          type="button"
          onClick={() =>
            setShowStores(
              (value) => !value
            )
          }
          className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1] hover:bg-white transition-colors"
        >


          {/* STORE ICON */}

          <div className="w-5 h-5 rounded-md bg-[#4F46E5] flex items-center justify-center shrink-0">

            <svg
              width="10"
              height="10"
              viewBox="0 0 8 8"
              fill="white"
            >

              <rect
                x="0.5"
                y="0.5"
                width="3"
                height="3"
                rx="0.5"
              />

              <rect
                x="4.5"
                y="0.5"
                width="3"
                height="3"
                rx="0.5"
              />

              <rect
                x="0.5"
                y="4.5"
                width="3"
                height="3"
                rx="0.5"
              />

              <rect
                x="4.5"
                y="4.5"
                width="3"
                height="3"
                rx="0.5"
              />

            </svg>

          </div>


          {/* SELECTED STORE */}

          <div className="text-left min-w-[120px]">

            {selectedStore ? (

              <>

                <p className="text-[11px] font-semibold text-[#0F172A] leading-tight">

                  {selectedStore.branch_name}

                </p>

                <p className="text-[9px] text-[#94A3B8] leading-tight">

                  {selectedStore.store_name}

                </p>

              </>

            ) : (

              <p className="text-[11px] text-[#64748B]">

                {loadingStores
                  ? "Loading..."
                  : "Select Store"}

              </p>

            )}

          </div>


          {/* ARROW */}

          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="#64748B"
            strokeWidth="1.5"
          >

            <path d="M3 4.5L6 7.5L9 4.5" />

          </svg>

        </button>


        {/* ====================================================
            DROPDOWN
        ==================================================== */}

        {showStores && (

          <div className="absolute right-0 top-11 w-72 bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-[100] overflow-hidden">


            {/* HEADER */}

            <div className="px-4 py-3 border-b border-[#F1F5F9]">

              <p className="text-[12px] font-semibold text-[#0F172A]">

                Select Store

              </p>

              <p className="text-[10px] text-[#94A3B8] mt-0.5">

                Active stores only

              </p>

            </div>


            {/* LIST */}

            <div className="p-2 max-h-80 overflow-y-auto">


              {loadingStores ? (

                <div className="px-3 py-8 text-center">

                  <div className="w-6 h-6 mx-auto mb-2 border-2 border-[#E2E8F0] border-t-[#4F46E5] rounded-full animate-spin" />

                  <p className="text-[11px] text-[#64748B]">

                    Loading stores...

                  </p>

                </div>

              ) : storeError ? (

                <div className="px-3 py-6 text-center">

                  <p className="text-[11px] font-medium text-red-500">

                    Unable to load stores

                  </p>

                  <p className="text-[10px] text-[#94A3B8] mt-1">

                    {storeError}

                  </p>

                  <button
                    type="button"
                    onClick={loadTopbarStores}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-[#4F46E5] text-white text-[10px] font-medium"
                  >

                    Retry

                  </button>

                </div>

              ) : stores.length === 0 ? (

                <div className="px-3 py-8 text-center">

                  <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-[#F1F5F9] flex items-center justify-center">

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="1.8"
                    >

                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                      />

                    </svg>

                  </div>

                  <p className="text-[11px] font-medium text-[#475569]">

                    No active stores

                  </p>

                  <p className="text-[10px] text-[#94A3B8] mt-1">

                    Activate a store in Settings.

                  </p>

                </div>

              ) : (

                stores.map((store) => {

                  const isSelected =
                    Number(
                      selectedStore?.id
                    ) ===
                    Number(store.id);


                  return (

                    <button
                      key={store.id}
                      type="button"
                      onClick={() =>
                        handleStoreSelect(
                          store
                        )
                      }
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        isSelected
                          ? "bg-[#EEF2FF]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >


                      {/* STORE ICON */}

                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-[#4F46E5] text-white"
                            : "bg-[#F1F5F9] text-[#64748B]"
                        }`}
                      >

                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >

                          <path d="M3 21h18" />

                          <path d="M5 21V8l7-4 7 4v13" />

                          <path d="M9 21v-5h6v5" />

                          <path d="M9 9h.01" />

                          <path d="M15 9h.01" />

                        </svg>

                      </div>


                      {/* STORE INFORMATION */}

                      <div className="flex-1 min-w-0">

                        <p className="text-[12px] font-semibold text-[#0F172A] truncate">

                          {store.branch_name}

                        </p>

                        <p className="text-[10px] text-[#64748B] truncate">

                          {store.store_name}

                        </p>

                        {store.city && (

                          <p className="text-[9px] text-[#94A3B8] mt-0.5">

                            {store.city}

                          </p>

                        )}

                      </div>


                      {/* DEFAULT */}

                      {Number(
                        store.is_default
                      ) === 1 && (

                        <span className="text-[8px] font-semibold text-[#4F46E5] bg-[#EEF2FF] px-1.5 py-0.5 rounded">

                          DEFAULT

                        </span>

                      )}


                      {/* SELECTED CHECK */}

                      {isSelected && (

                        <div className="w-5 h-5 rounded-full bg-[#4F46E5] flex items-center justify-center shrink-0">

                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                          >

                            <path d="M5 12l4 4L19 6" />

                          </svg>

                        </div>

                      )}

                    </button>

                  );

                })

              )}

            </div>


            {/* COUNT */}

            {stores.length > 0 && (

              <div className="px-4 py-2.5 border-t border-[#F1F5F9] bg-[#FAFAFA]">

                <p className="text-[9px] text-[#94A3B8]">

                  {stores.length} active store
                  {stores.length !== 1
                    ? "s"
                    : ""}

                  {" "}available

                </p>

              </div>

            )}

          </div>

        )}

      </div>


      {/* ======================================================
          DATE
      ====================================================== */}

      <div className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[12px] text-[#64748B]">

        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >

          <rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
          />

          <line
            x1="16"
            y1="2"
            x2="16"
            y2="6"
          />

          <line
            x1="8"
            y1="2"
            x2="8"
            y2="6"
          />

          <line
            x1="3"
            y1="10"
            x2="21"
            y2="10"
          />

        </svg>

        {new Date().toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric",
          }
        )}

      </div>


      {/* ======================================================
          SEARCH
      ====================================================== */}

      <div className="relative hidden sm:block">

        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >

          <circle
            cx="11"
            cy="11"
            r="8"
          />

          <path d="m21 21-4.35-4.35" />

        </svg>

        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search..."
          className="h-8 w-44 pl-8 pr-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20 transition-all"
        />

      </div>


      {/* ======================================================
          NOTIFICATIONS
      ====================================================== */}

      <div
        className="relative"
        data-notification
      >

        <button
          type="button"
          onClick={() =>
            setShowNotif(
              !showNotif
            )
          }
          className="relative w-8 h-8 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center hover:bg-[#F1F5F9] transition-colors"
        >

          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#475569"
            strokeWidth="1.8"
          >

            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />

          </svg>

          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center">

            3

          </span>

        </button>


        {showNotif && (

          <div className="absolute right-0 top-10 w-72 bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-50 overflow-hidden">

            <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">

              <span className="text-[13px] font-semibold text-[#0F172A]">

                Notifications

              </span>

              <span className="text-[11px] text-[#4F46E5] cursor-pointer">

                Mark all read

              </span>

            </div>


            {[
              {
                title:
                  "Low stock alert",
                body:
                  "Low stock item",
                time:
                  "2m ago",
                color:
                  "#F59E0B",
              },

              {
                title:
                  "Out of stock",
                body:
                  "Product is out of stock",
                time:
                  "18m ago",
                color:
                  "#EF4444",
              },

              {
                title:
                  "New purchase order",
                body:
                  "New purchase order received",
                time:
                  "1h ago",
                color:
                  "#4F46E5",
              },

            ].map(
              (notification, index) => (

                <div
                  key={index}
                  className="px-4 py-3 hover:bg-[#F8FAFC] cursor-pointer border-b border-[#F1F5F9] last:border-0"
                >

                  <div className="flex gap-3">

                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{
                        background:
                          notification.color,
                      }}
                    />

                    <div>

                      <p className="text-[12px] font-medium text-[#0F172A]">

                        {
                          notification.title
                        }

                      </p>

                      <p className="text-[11px] text-[#64748B] mt-0.5">

                        {
                          notification.body
                        }

                      </p>

                      <p className="text-[10px] text-[#94A3B8] mt-1">

                        {
                          notification.time
                        }

                      </p>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>


      {/* ======================================================
          USER
      ====================================================== */}

      <div className="flex items-center gap-2 cursor-pointer">

        <div className="w-8 h-8 rounded-full bg-[#4F46E5] flex items-center justify-center text-white text-[12px] font-semibold">

          AU

        </div>

        <div className="hidden md:block">

          <p className="text-[12px] font-medium text-[#0F172A] leading-tight">

            Admin User

          </p>

          <p className="text-[10px] text-[#64748B] leading-tight">

            Store Manager

          </p>

        </div>

      </div>

    </header>
  );
}