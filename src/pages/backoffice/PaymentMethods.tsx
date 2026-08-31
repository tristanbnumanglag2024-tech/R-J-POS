import { useCallback, useEffect, useState } from "react";
import { Card, Badge, Toggle } from "../../components/ui";

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API_BASE =
  "https://sakuracareapi.site/rhea-pos-api/payment_methods";

const LIST_API =
  `${API_BASE}/list.php`;

const UPDATE_API =
  `${API_BASE}/update.php`;

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type PaymentMethod = {
  id: number;
  store_id?: number;

  name: string;
  code: string;

  icon: string | null;
  description: string | null;

  enabled: boolean;

  fee: number;
  processing_fee: number;

  feeType: string;
  fee_type: string;

  is_available: boolean;
  is_coming_soon: boolean;

  sort_order: number;

  created_at?: string;
  updated_at?: string;
};

type ListResponse = {
  success: boolean;
  message?: string;
  payment_methods?: PaymentMethod[];
};

type UpdateResponse = {
  success: boolean;
  message?: string;

  payment_method?: {
    id: number;
    store_id?: number;
    name: string;
    code: string;
    enabled: boolean;
  };
};

/*
|--------------------------------------------------------------------------
| PROPS
|--------------------------------------------------------------------------
*/

type PaymentMethodsProps = {
  activeStoreId: number | null;
};

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function PaymentMethods({
  activeStoreId,
}: PaymentMethodsProps) {

  const [methods, setMethods] =
    useState<PaymentMethod[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [savingId, setSavingId] =
    useState<number | null>(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD PAYMENT METHODS
  |--------------------------------------------------------------------------
  */

  const loadPaymentMethods =
    useCallback(async () => {

      /*
      |--------------------------------------------------------------------------
      | NO STORE SELECTED
      |--------------------------------------------------------------------------
      */

      if (!activeStoreId || activeStoreId <= 0) {

        setMethods([]);
        setLoading(false);
        setError(
          "Please select a store first."
        );

        return;
      }

      try {

        setLoading(true);
        setError("");

        /*
        |--------------------------------------------------------------------------
        | SEND STORE ID
        |--------------------------------------------------------------------------
        */

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
            "Failed to load payment methods."
          );
        }

        setMethods(
          Array.isArray(
            data.payment_methods
          )
            ? data.payment_methods
            : []
        );

      } catch (err) {

        console.error(
          "Payment methods load error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load payment methods."
        );

        setMethods([]);

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

    loadPaymentMethods();

  }, [loadPaymentMethods]);

  /*
  |--------------------------------------------------------------------------
  | TOGGLE PAYMENT METHOD
  |--------------------------------------------------------------------------
  */

  const togglePaymentMethod =
    async (
      method: PaymentMethod
    ) => {

      /*
      |--------------------------------------------------------------------------
      | STORE REQUIRED
      |--------------------------------------------------------------------------
      */

      if (
        !activeStoreId ||
        activeStoreId <= 0
      ) {

        setError(
          "Please select a store first."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | COMING SOON
      |--------------------------------------------------------------------------
      |
      | Credit Card / Debit Card are
      | currently under construction.
      |
      */

      if (
        method.is_coming_soon
      ) {

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | UNAVAILABLE
      |--------------------------------------------------------------------------
      */

      if (
        !method.is_available
      ) {

        return;
      }

      const newEnabled =
        !method.enabled;

      /*
      |--------------------------------------------------------------------------
      | SAVE ID
      |--------------------------------------------------------------------------
      */

      setSavingId(method.id);
      setError("");

      /*
      |--------------------------------------------------------------------------
      | OPTIMISTIC UPDATE
      |--------------------------------------------------------------------------
      */

      setMethods(
        (current) =>
          current.map(
            (item) =>
              item.id === method.id
                ? {
                    ...item,

                    enabled:
                      newEnabled,
                  }
                : item
          )
      );

      try {

        /*
        |--------------------------------------------------------------------------
        | UPDATE API
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        | store_id is now sent.
        |
        */

        const response =
          await fetch(
            UPDATE_API,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body: JSON.stringify({

                id:
                  method.id,

                store_id:
                  activeStoreId,

                enabled:
                  newEnabled,

              }),
            }
          );

        const data: UpdateResponse =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
            "Failed to update payment method."
          );
        }

        /*
        |--------------------------------------------------------------------------
        | USE SERVER RESPONSE
        |--------------------------------------------------------------------------
        */

        if (
          data.payment_method
        ) {

          setMethods(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  data.payment_method?.id
                    ? {
                        ...item,

                        enabled:
                          Boolean(
                            data
                              .payment_method
                              .enabled
                          ),
                      }
                    : item
              )
          );
        }

      } catch (err) {

        console.error(
          "Payment method update error:",
          err
        );

        /*
        |--------------------------------------------------------------------------
        | ROLLBACK
        |--------------------------------------------------------------------------
        */

        setMethods(
          (current) =>
            current.map(
              (item) =>
                item.id === method.id
                  ? {
                      ...item,

                      enabled:
                        method.enabled,
                    }
                  : item
            )
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to update payment method."
        );

      } finally {

        setSavingId(null);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | STATUS
  |--------------------------------------------------------------------------
  */

  const getStatus =
    (
      method: PaymentMethod
    ) => {

      if (
        method.is_coming_soon
      ) {

        return (
          <Badge variant="info">
            Coming Soon
          </Badge>
        );
      }

      if (
        !method.is_available
      ) {

        return (
          <Badge variant="neutral">
            Unavailable
          </Badge>
        );
      }

      if (
        method.enabled
      ) {

        return (
          <Badge variant="success">
            Enabled
          </Badge>
        );
      }

      return (
        <Badge variant="neutral">
          Disabled
        </Badge>
      );
    };

  /*
  |--------------------------------------------------------------------------
  | NO STORE
  |--------------------------------------------------------------------------
  */

  if (
    !activeStoreId ||
    activeStoreId <= 0
  ) {

    return (
      <div className="p-6 max-w-[900px]">

        <Card className="p-8">

          <div className="text-center">

            <div className="text-3xl mb-3">
              🏪
            </div>

            <p className="text-[14px] font-semibold text-[#0F172A]">
              No Store Selected
            </p>

            <p className="text-[12px] text-[#64748B] mt-1">
              Please select a store to configure
              its payment methods.
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
      <div className="p-6 max-w-[900px]">

        <div className="flex items-center gap-3">

          <div
            className="
              w-5
              h-5
              border-2
              border-[#E2E8F0]
              border-t-[#4F46E5]
              rounded-full
              animate-spin
            "
          />

          <span className="text-[13px] text-[#64748B]">
            Loading payment methods...
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
    <div className="p-6 space-y-5 max-w-[900px]">

      {/* ================================================================
          HEADER
      ================================================================= */}

      <div>

        <div className="flex items-center gap-2">

          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Payment Methods
          </h2>

          <Badge variant="neutral">
            Store #{activeStoreId}
          </Badge>

        </div>

        <p className="text-[12px] text-[#64748B] mt-0.5">
          Configure which payment methods are accepted
          at checkout for this store.
        </p>

      </div>

      {/* ================================================================
          STORE NOTICE
      ================================================================= */}

      <Card className="p-4">

        <div className="flex items-start gap-3">

          <div
            className="
              w-9
              h-9
              rounded-lg
              bg-[#EEF2FF]
              flex
              items-center
              justify-center
              shrink-0
            "
          >

            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2"
            >

              <path
                d="M3 21h18"
              />

              <path
                d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"
              />

              <path
                d="M9 7h1"
              />

              <path
                d="M14 7h1"
              />

              <path
                d="M9 11h1"
              />

              <path
                d="M14 11h1"
              />

            </svg>

          </div>

          <div>

            <p className="text-[13px] font-semibold text-[#0F172A]">
              Store Payment Settings
            </p>

            <p className="text-[11px] text-[#64748B] mt-0.5">
              These payment method settings are saved
              specifically for Store #{activeStoreId}.
              Changing stores loads that store's settings.
            </p>

          </div>

        </div>

      </Card>

      {/* ================================================================
          ERROR
      ================================================================= */}

      {error && (

        <div
          className="
            bg-red-50
            border
            border-red-200
            rounded-xl
            px-4
            py-3
            flex
            items-start
            gap-3
          "
        >

          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            className="shrink-0 mt-0.5"
          >

            <circle
              cx="12"
              cy="12"
              r="10"
            />

            <line
              x1="15"
              y1="9"
              x2="9"
              y2="15"
            />

            <line
              x1="9"
              y1="9"
              x2="15"
              y2="15"
            />

          </svg>

          <div>

            <p className="text-[12px] font-semibold text-red-800">
              Payment Method Error
            </p>

            <p className="text-[11px] text-red-700 mt-0.5">
              {error}
            </p>

          </div>

        </div>

      )}

      {/* ================================================================
          PAYMENT METHODS
      ================================================================= */}

      {methods.length === 0 ? (

        <Card className="p-8">

          <div className="text-center">

            <div className="text-3xl mb-2">
              💳
            </div>

            <p className="text-[14px] font-semibold text-[#0F172A]">
              No payment methods found
            </p>

            <p className="text-[12px] text-[#64748B] mt-1">
              No payment methods have been configured
              for this store.
            </p>

          </div>

        </Card>

      ) : (

        <div className="grid grid-cols-2 gap-4">

          {methods.map(
            (method) => {

              const isSaving =
                savingId === method.id;

              const isComingSoon =
                method.is_coming_soon;

              const isUnavailable =
                !method.is_available;

              const locked =
                isComingSoon ||
                isUnavailable;

              return (

                <Card
                  key={method.id}
                  className={`
                    p-5
                    transition-all
                    ${
                      method.enabled
                        ? ""
                        : "opacity-60"
                    }
                    ${
                      locked
                        ? "opacity-70"
                        : ""
                    }
                  `}
                >

                  {/* ==================================================
                      TOP
                  ================================================== */}

                  <div className="flex items-start justify-between mb-3">

                    <div className="flex items-center gap-3">

                      {/* ICON */}

                      <div
                        className={`
                          w-10
                          h-10
                          rounded-xl
                          flex
                          items-center
                          justify-center
                          text-xl
                          ${
                            method.enabled &&
                            !locked
                              ? "bg-[#EEF2FF]"
                              : "bg-[#F1F5F9]"
                          }
                        `}
                      >

                        {method.icon || "💳"}

                      </div>

                      {/* NAME */}

                      <div>

                        <p className="text-[13px] font-semibold text-[#0F172A]">
                          {method.name}
                        </p>

                        <div className="mt-1">
                          {getStatus(method)}
                        </div>

                      </div>

                    </div>

                    {/* ==================================================
                        TOGGLE
                    ================================================== */}

                    <div
                      className={`
                        relative
                        ${
                          locked
                            ? "cursor-not-allowed opacity-50 pointer-events-none"
                            : ""
                        }
                      `}
                    >

                      <Toggle
                        checked={
                          method.enabled
                        }
                        onChange={() =>
                          togglePaymentMethod(
                            method
                          )
                        }
                      />

                      {isSaving && (

                        <div
                          className="
                            absolute
                            inset-0
                            flex
                            items-center
                            justify-center
                            bg-white/70
                            rounded-full
                          "
                        >

                          <div
                            className="
                              w-4
                              h-4
                              border-2
                              border-[#E2E8F0]
                              border-t-[#4F46E5]
                              rounded-full
                              animate-spin
                            "
                          />

                        </div>

                      )}

                    </div>

                  </div>

                  {/* ==================================================
                      DESCRIPTION
                  ================================================== */}

                  <p className="text-[12px] text-[#64748B] mb-3">

                    {method.description ||
                      "Payment method available at checkout."}

                  </p>

                  {/* ==================================================
                      COMING SOON
                  ================================================== */}

                  {isComingSoon && (

                    <div
                      className="
                        rounded-lg
                        bg-sky-50
                        border
                        border-sky-100
                        px-3
                        py-2
                      "
                    >

                      <div className="flex items-center gap-2">

                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#0284C7"
                          strokeWidth="2"
                        >

                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                          />

                          <polyline
                            points="12 6 12 12 16 14"
                          />

                        </svg>

                        <span className="text-[11px] font-medium text-sky-700">
                          Coming Soon
                        </span>

                      </div>

                      <p className="text-[10px] text-sky-600 mt-1">
                        This payment method is currently
                        under construction.
                      </p>

                    </div>

                  )}

                  {/* ==================================================
                      UNAVAILABLE
                  ================================================== */}

                  {!isComingSoon &&
                    isUnavailable && (

                    <div
                      className="
                        rounded-lg
                        bg-slate-50
                        border
                        border-slate-200
                        px-3
                        py-2
                      "
                    >

                      <span className="text-[11px] text-slate-600">
                        This payment method is currently unavailable.
                      </span>

                    </div>

                  )}

                  {/* ==================================================
                      PROCESSING FEE
                  ================================================== */}

                  {!isComingSoon &&
                    !isUnavailable &&
                    method.fee > 0 && (

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        text-[11px]
                        mt-3
                      "
                    >

                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94A3B8"
                        strokeWidth="2"
                      >

                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                        />

                        <line
                          x1="12"
                          y1="8"
                          x2="12"
                          y2="12"
                        />

                        <circle
                          cx="12"
                          cy="16"
                          r="1"
                          fill="#94A3B8"
                        />

                      </svg>

                      <span className="text-[#94A3B8]">

                        Processing fee:

                        <strong className="text-[#64748B] ml-1">

                          {method.fee}

                          {method.feeType ===
                          "percentage"
                            ? "%"
                            : " flat"}

                        </strong>

                      </span>

                    </div>

                  )}

                  {/* ==================================================
                      CODE
                  ================================================== */}

                  <div
                    className="
                      mt-3
                      pt-3
                      border-t
                      border-[#F1F5F9]
                    "
                  >

                    <span className="text-[10px] text-[#94A3B8]">
                      Payment Code
                    </span>

                    <span
                      className="
                        ml-2
                        font-mono
                        text-[10px]
                        text-[#64748B]
                      "
                    >
                      {method.code}
                    </span>

                  </div>

                </Card>

              );
            }
          )}

        </div>

      )}

      {/* ================================================================
          CARD TERMINAL
      ================================================================= */}

      <Card className="p-5">

        <div className="flex items-start gap-4">

          <div
            className="
              w-11
              h-11
              rounded-xl
              bg-[#F1F5F9]
              flex
              items-center
              justify-center
              text-xl
              shrink-0
            "
          >
            💳
          </div>

          <div className="flex-1">

            <div className="flex items-center gap-2">

              <h3 className="text-[14px] font-semibold text-[#0F172A]">
                Card Terminal Integration
              </h3>

              <Badge variant="info">
                Coming Soon
              </Badge>

            </div>

            <p className="text-[12px] text-[#64748B] mt-1">
              Credit Card and Debit Card terminal
              integration is currently under construction.
            </p>

            <div
              className="
                mt-3
                rounded-lg
                bg-slate-50
                border
                border-slate-200
                px-3
                py-2
              "
            >

              <p className="text-[11px] text-slate-600">
                Card terminals are not currently supported.
                Terminal configuration will become available
                when the integration is completed.
              </p>

            </div>

          </div>

        </div>

      </Card>

      {/* ================================================================
          FOOTER
      ================================================================= */}

      <div className="flex items-center justify-between">

        <p className="text-[11px] text-[#94A3B8]">

          {methods.filter(
            (method) =>
              method.enabled &&
              !method.is_coming_soon
          ).length}{" "}

          payment method
          {methods.filter(
            (method) =>
              method.enabled &&
              !method.is_coming_soon
          ).length !== 1
            ? "s"
            : ""}{" "}

          currently enabled

        </p>

        <button
          type="button"
          onClick={loadPaymentMethods}
          className="
            text-[11px]
            font-medium
            text-[#4F46E5]
            hover:underline
          "
        >
          Refresh
        </button>

      </div>

    </div>
  );
}