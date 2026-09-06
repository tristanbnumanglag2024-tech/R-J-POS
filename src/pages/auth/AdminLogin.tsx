import { useState } from "react";

interface AdminUser {
  id: number | string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  full_name?: string | null;
  role?: string | null;
  status?: string | null;
}

interface AdminLoginProps {
  onLogin: (user: AdminUser) => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    const login = email.trim();
    const passwordValue = password;

    if (!login || !passwordValue) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "https://sakuracareapi.site/rhea-pos-api/admin/login.php",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            login,
            password: passwordValue,
          }),
        }
      );

      const text = await response.text();
      let data: {
        success?: boolean;
        message?: string;
        user?: AdminUser;
      };

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          text.trim().startsWith("<")
            ? "The server returned HTML instead of JSON. Please check the PHP API."
            : `Invalid server response: ${text.substring(0, 250)}`
        );
      }

      if (!response.ok || !data.success || !data.user) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      if (String(data.user.role ?? "").toLowerCase() !== "admin") {
        setError("This account does not have administrator access.");
        return;
      }

      if (String(data.user.status ?? "active").toLowerCase() !== "active") {
        setError("Your administrator account is inactive.");
        return;
      }

      // Keep the authenticated admin record locally only for UI restore.
      // The backend PHP session remains the authentication source of truth.
      localStorage.setItem("admin", JSON.stringify(data.user));
      localStorage.setItem("admin_remember", remember ? "true" : "false");

      setLoading(false);
      onLogin(data.user);
    } catch (error) {
      console.error("Admin login error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#4F46E5]/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#6366F1]/10 blur-3xl" />

      <div className="relative w-full max-w-[430px]">
        {/* Login Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-9 pb-7 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-5">
              <div className="w-[76px] h-[76px] rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center overflow-hidden">
                <img
                  src="/logo2.png"
                  alt="Motivapor POS"
                  className="w-full h-full object-contain p-2"
                />
              </div>
            </div>

            <h1 className="text-[25px] font-bold tracking-tight text-[#0F172A]">
              Welcome back
            </h1>

            <p className="text-[13px] text-[#64748B] mt-2">
              Sign in to your admin back office
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="px-8 pb-8"
          >
            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-red-500 mt-0.5 shrink-0"
                >
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>

                <p className="text-[12px] text-red-600 font-medium">
                  {error}
                </p>
              </div>
            )}

            {/* Email */}
            <div className="mb-5">
              <label className="block text-[12px] font-semibold text-[#334155] mb-2">
                Email Address
              </label>

              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                    />
                    <polyline points="3,7 12,13 21,7" />
                  </svg>
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  className="w-full h-12 rounded-xl border border-[#CBD5E1] bg-white pl-11 pr-4 text-[13px] text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-[#334155] mb-2">
                Password
              </label>

              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2"
                    />
                    <path d="M8 10V7a4 4 0 018 0v3" />
                  </svg>
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full h-12 rounded-xl border border-[#CBD5E1] bg-white pl-11 pr-12 text-[13px] text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.9 4.2A10.7 10.7 0 0112 4c5 0 9 4 10 8-0.4 1.5-1.3 2.8-2.4 3.9" />
                      <path d="M6.1 6.1C4.5 7.3 3.3 9 2 12c1 4 5 8 10 8 1.3 0 2.5-.3 3.6-.8" />
                    </svg>
                  ) : (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) =>
                    setRemember(e.target.checked)
                  }
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#4F46E5] focus:ring-[#4F46E5]"
                />

                <span className="text-[12px] text-[#64748B]">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA]"
              >
                Forgot password?
              </button>
            </div>

            {/* Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#818CF8] text-white text-[13px] font-bold transition-all shadow-lg shadow-[#4F46E5]/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line
                      x1="5"
                      y1="12"
                      x2="19"
                      y2="12"
                    />
                    <polyline points="12,5 19,12 12,19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-[#F1F5F9] px-8 py-4 text-center bg-[#FAFAFA]">
            <p className="text-[10px] text-[#94A3B8]">
              Authorized administrators only
            </p>
          </div>
        </div>

        {/* Brand */}
        <p className="text-center text-[10px] text-[#94A3B8] mt-5">
         R&J POS · Back Office
        </p>
      </div>
    </div>
  );
}