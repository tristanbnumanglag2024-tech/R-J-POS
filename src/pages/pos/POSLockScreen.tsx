import { useState } from "react";

const API_BASE = "http://sakuracareapi.site/rhea-pos-api";

interface Cashier {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  full_name: string;
  role: string;
  status: string;
}

interface POSLockScreenProps {
  storeName: string;
  storeBranch: string | null;
  onUnlock: (cashier: Cashier) => void;
}

export default function POSLockScreen({
  storeName,
  storeBranch,
  onUnlock,
}: POSLockScreenProps) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<"email" | "pin">("email");

  const now = new Date();

  // ============================================================
  // EMAIL
  // ============================================================

  const continueToPIN = () => {
    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setStep("pin");
  };

  // ============================================================
  // PIN KEYPAD
  // ============================================================

  const pressKey = (key: string) => {
    if (loading) return;

    if (pin.length >= 4) return;

    const nextPin = pin + key;

    setPin(nextPin);
    setError("");

    if (nextPin.length === 4) {
      login(nextPin);
    }
  };

  // ============================================================
  // LOGIN
  // ============================================================

  const login = async (enteredPin: string) => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/users/pos-login.php`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            email: email.trim(),
            pin: enteredPin,
          }),
        }
      );

      const data = await response.json();

      console.log("POS LOGIN RESPONSE:", data);

      if (!response.ok || !data.success) {
        setPin("");

        setError(
          data.message ||
            "Invalid email or PIN."
        );

        return;
      }

      // ========================================================
      // CASHIER FROM DATABASE
      // ========================================================

      const loggedInCashier: Cashier = {
        id: Number(data.user.id),
        username: data.user.username,
        email: data.user.email,
        phone: data.user.phone ?? null,
        full_name: data.user.full_name,
        role: data.user.role,
        status: data.user.status,
      };

      // ========================================================
      // SAVE POS CASHIER SESSION
      // ========================================================

      localStorage.setItem(
        "pos_cashier",
        JSON.stringify(loggedInCashier)
      );

      // ========================================================
      // UNLOCK POS
      // ========================================================

      onUnlock(loggedInCashier);

    } catch (err) {
      console.error("POS login error:", err);

      setPin("");

      setError(
        "Unable to connect to the POS server."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // BACKSPACE
  // ============================================================

  const backspace = () => {
    if (loading) return;

    setPin((current) =>
      current.slice(0, -1)
    );

    setError("");
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const clear = () => {
    if (loading) return;

    setPin("");
    setError("");
  };

  // ============================================================
  // CHANGE EMAIL
  // ============================================================

  const changeEmail = () => {
    if (loading) return;

    setPin("");
    setError("");
    setStep("email");
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="flex h-full bg-[#0F172A] items-center justify-center p-4 relative overflow-hidden">

      {/* Background */}

      <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

      <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-[#0EA5E9]/10 blur-3xl" />

      {/* Main */}

      <div className="w-full max-w-sm text-center relative z-10">

        {/* Time */}

        <p className="text-[52px] font-black text-white mb-1">
          {now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <p className="text-[14px] text-white/40 mb-8">
          {now.toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>

        {/* Card */}

        <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl border border-white/10 p-6">

          {/* Lock Icon */}

          <div className="flex flex-col items-center mb-6">

            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">

              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.8"
              >
                <rect
                  x="3"
                  y="11"
                  width="18"
                  height="11"
                  rx="2"
                />

                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>

            </div>

            <p className="text-[15px] font-semibold text-white">
              POS Register
            </p>

            <p className="text-[11px] text-white/40 mt-1">
              {storeName}
              {storeBranch
                ? ` · ${storeBranch}`
                : ""}
            </p>

            <p className="text-[11px] text-white/30 mt-1">
              Register Locked
            </p>

          </div>

          {/* ==================================================
              EMAIL STEP
          ================================================== */}

          {step === "email" && (
            <div className="space-y-4">

              <div className="text-left">

                <label className="block text-[11px] font-medium text-white/60 mb-2">
                  Cashier Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      continueToPIN();
                    }
                  }}
                  placeholder="cashier@example.com"
                  autoComplete="email"
                  autoFocus
                  className="w-full h-11 rounded-xl bg-white/10 border border-white/10 px-3 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-[#4F46E5] focus:bg-white/[0.12]"
                />

              </div>

              {error && (
                <p className="text-[11px] text-red-400 font-medium text-left">
                  {error}
                </p>
              )}

              <button
                onClick={continueToPIN}
                className="w-full h-11 rounded-xl bg-[#4F46E5] text-white text-[13px] font-semibold hover:bg-[#4338CA] active:scale-[0.98] transition-all"
              >
                Continue
              </button>

              <p className="text-[10px] text-white/20">
                Enter your registered cashier email
              </p>

            </div>
          )}

          {/* ==================================================
              PIN STEP
          ================================================== */}

          {step === "pin" && (
            <div>

              {/* Logged email */}

              <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 mb-5">

                <div className="text-left min-w-0">

                  <p className="text-[9px] uppercase tracking-wider text-white/30">
                    Cashier
                  </p>

                  <p className="text-[12px] text-white/70 truncate">
                    {email}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={changeEmail}
                  className="text-[10px] text-[#818CF8] hover:text-[#A5B4FC]"
                >
                  Change
                </button>

              </div>

              {/* PIN dots */}

              <div className="flex justify-center gap-3 mb-4">

                {[0, 1, 2, 3].map((i) => (

                  <div
                    key={i}
                    className={`
                      w-4 h-4 rounded-full border-2
                      transition-all
                      ${
                        i < pin.length
                          ? "bg-[#4F46E5] border-[#4F46E5] scale-110"
                          : "border-white/30"
                      }
                    `}
                  />

                ))}

              </div>

              {/* Error */}

              {error && (
                <p className="text-[11px] text-red-400 font-medium mb-3">
                  {error}
                </p>
              )}

              {/* Loading */}

              {loading && (
                <p className="text-[11px] text-white/40 mb-3">
                  Verifying cashier...
                </p>
              )}

              {!loading && !error && (
                <p className="text-[10px] text-white/20 mb-4">
                  Enter your 4-digit cashier PIN
                </p>
              )}

              {/* Keypad */}

              <div className="grid grid-cols-3 gap-2">

                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
                  (number) => (

                    <button
                      key={number}
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        pressKey(String(number))
                      }
                      className="h-12 rounded-xl bg-white/10 text-white text-[18px] font-semibold hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40"
                    >
                      {number}
                    </button>

                  )
                )}

                {/* Clear */}

                <button
                  type="button"
                  disabled={loading}
                  onClick={clear}
                  className="h-12 rounded-xl bg-white/5 text-white/40 text-[11px] font-semibold hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40"
                >
                  CLR
                </button>

                {/* Zero */}

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => pressKey("0")}
                  className="h-12 rounded-xl bg-white/10 text-white text-[18px] font-semibold hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40"
                >
                  0
                </button>

                {/* Backspace */}

                <button
                  type="button"
                  disabled={loading}
                  onClick={backspace}
                  className="h-12 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                    <line
                      x1="18"
                      y1="9"
                      x2="12"
                      y2="15"
                    />
                    <line
                      x1="12"
                      y1="9"
                      x2="18"
                      y2="15"
                    />
                  </svg>
                </button>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}