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

  /*
   * Kept for compatibility with the existing parent component.
   * Store selection is no longer displayed or loaded here.
   */
  selectedStore: Store | null;
  onStoreChange: (store: Store) => void;
}

// ============================================================
// TOPBAR
// ============================================================

export default function TopBar({
  title,
  subtitle,
  selectedStore: _selectedStore,
  onStoreChange: _onStoreChange,
}: TopBarProps) {

  const [showNotif, setShowNotif] = useState(false);

  // ============================================================
  // CLOSE NOTIFICATION
  // ============================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest("[data-notification]")) {
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
          NOTIFICATIONS
      ====================================================== */}

      <div
        className="relative"
        data-notification
      >
        <button
          type="button"
          onClick={() =>
            setShowNotif(!showNotif)
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
                        {notification.title}
                      </p>

                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        {notification.body}
                      </p>

                      <p className="text-[10px] text-[#94A3B8] mt-1">
                        {notification.time}
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