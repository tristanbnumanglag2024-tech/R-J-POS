import { useEffect, useState } from "react";

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
  status?: string;
  is_default?: number;
}

interface TopBarProps {
  title: string;
  subtitle?: string;

  selectedStore: Store | null;
  stores: Store[];
  onStoreChange: (store: Store) => void;
}

export default function TopBar({
  title,
  subtitle,
  selectedStore,
  stores,
  onStoreChange,
}: TopBarProps) {
  const [search, setSearch] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [showStores, setShowStores] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | STORE SELECTOR
  |--------------------------------------------------------------------------
  */

  const handleStoreSelect = (store: Store) => {
    onStoreChange(store);
    setShowStores(false);
  };

  /*
  |--------------------------------------------------------------------------
  | CLOSE STORE DROPDOWN WHEN CLICKING OUTSIDE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest("[data-store-selector]")) {
        setShowStores(false);
      }

      if (!target.closest("[data-notification]")) {
        setShowNotif(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center px-6 gap-4 shrink-0 z-10">

      {/* ============================================================
          TITLE
      ============================================================ */}

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

      {/* ============================================================
          STORE SELECTOR
      ============================================================ */}

      <div
        className="relative hidden lg:block"
        data-store-selector
      >
        <button
          type="button"
          onClick={() => setShowStores((v) => !v)}
          className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1] hover:bg-white transition-colors"
        >

          {/* Store Icon */}

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

          {/* Selected Store */}

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
                Select Store
              </p>
            )}
          </div>

          {/* Arrow */}

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

        {/* ============================================================
            STORE DROPDOWN
        ============================================================ */}

        {showStores && (
          <div className="absolute right-0 top-11 w-72 bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-[100] overflow-hidden">

            <div className="px-4 py-3 border-b border-[#F1F5F9]">

              <p className="text-[12px] font-semibold text-[#0F172A]">
                Select Store
              </p>

              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                Choose the store you want to manage
              </p>

            </div>

            <div className="p-2 max-h-80 overflow-y-auto">

              {stores.length === 0 ? (
                <div className="px-3 py-6 text-center">

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
                    No stores available
                  </p>

                  <p className="text-[10px] text-[#94A3B8] mt-1">
                    This user has not been assigned to a store.
                  </p>

                </div>
              ) : (
                stores.map((store) => {

                  const isSelected =
                    selectedStore?.id === store.id;

                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => handleStoreSelect(store)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        isSelected
                          ? "bg-[#EEF2FF]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >

                      {/* Store Icon */}

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

                      {/* Store Information */}

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

                      {/* Selected Check */}

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

            {stores.length > 0 && (
              <div className="px-4 py-2.5 border-t border-[#F1F5F9] bg-[#FAFAFA]">
                <p className="text-[9px] text-[#94A3B8]">
                  {stores.length} store
                  {stores.length !== 1 ? "s" : ""} available
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ============================================================
          DATE
      ============================================================ */}

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

        {new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}

      </div>

      {/* ============================================================
          SEARCH
      ============================================================ */}

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
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="h-8 w-44 pl-8 pr-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20 transition-all"
        />

      </div>

      {/* ============================================================
          NOTIFICATIONS
      ============================================================ */}

      <div
        className="relative"
        data-notification
      >

        <button
          onClick={() => setShowNotif(!showNotif)}
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
                title: "Low stock alert",
                body: "Low stock item",
                time: "2m ago",
                color: "#F59E0B",
              },
              {
                title: "Out of stock",
                body: "Product is out of stock",
                time: "18m ago",
                color: "#EF4444",
              },
              {
                title: "New purchase order",
                body: "New purchase order received",
                time: "1h ago",
                color: "#4F46E5",
              },
            ].map((n, i) => (
              <div
                key={i}
                className="px-4 py-3 hover:bg-[#F8FAFC] cursor-pointer border-b border-[#F1F5F9] last:border-0"
              >

                <div className="flex gap-3">

                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: n.color }}
                  />

                  <div>

                    <p className="text-[12px] font-medium text-[#0F172A]">
                      {n.title}
                    </p>

                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      {n.body}
                    </p>

                    <p className="text-[10px] text-[#94A3B8] mt-1">
                      {n.time}
                    </p>

                  </div>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>

      {/* ============================================================
          USER
      ============================================================ */}

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