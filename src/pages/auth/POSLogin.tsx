import { useState } from "react";
import { employees } from "../../data/sampleData";
import { STORE_NAME, STORE_BRANCH } from "../../data/sampleData";

interface POSLoginProps {
  onLogin: (cashier: string) => void;
  onSwitchToAdmin: () => void;
}

export default function POSLogin({ onLogin, onSwitchToAdmin }: POSLoginProps) {
  const [selectedEmp, setSelectedEmp] = useState(employees[0]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const CORRECT_PIN = "1234";

  const pressKey = (k: string) => {
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    setError("");
    if (next.length === 4) checkPin(next);
  };

  const checkPin = (p: string) => {
    setLoading(true);
    setTimeout(() => {
      if (p === CORRECT_PIN || p === selectedEmp.pin?.replace(/\*/g, "") || true) {
        if (p !== CORRECT_PIN && attempts < 2) {
          setAttempts((a) => a + 1);
          setError(`Incorrect PIN. ${2 - attempts} attempt${2 - attempts === 1 ? "" : "s"} remaining.`);
          setPin("");
          setLoading(false);
          return;
        }
        // Accept "1234" always for demo
        if (p === CORRECT_PIN) {
          setSuccess(true);
          setLoading(false);
          setTimeout(() => onLogin(selectedEmp.name), 900);
          return;
        }
        setAttempts((a) => a + 1);
        setError(`Incorrect PIN. ${2 - attempts} attempt${2 - attempts === 1 ? "" : "s"} remaining.`);
        setPin("");
        setLoading(false);
      }
    }, 400);
  };

  const backspace = () => { setPin((p) => p.slice(0, -1)); setError(""); };
  const clear = () => { setPin(""); setError(""); };

  const locked = attempts >= 3;

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#4F46E5] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#4F46E5]/40">
            <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <h1 className="text-[20px] font-bold text-white">{STORE_NAME}</h1>
          <p className="text-[13px] text-white/50 mt-1">{STORE_BRANCH} · Register 1</p>
        </div>

        {/* Main card */}
        <div className="bg-white/8 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          {/* Employee selector */}
          <div className="mb-5">
            <p className="text-[11px] text-white/40 uppercase tracking-widest font-semibold mb-2">Select Cashier</p>
            <div className="flex gap-2 flex-wrap">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => { setSelectedEmp(emp); setPin(""); setError(""); setAttempts(0); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all ${
                    selectedEmp.id === emp.id
                      ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                      : "bg-white/8 border-white/15 text-white/60 hover:bg-white/12 hover:text-white"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold">
                    {emp.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </div>
                  {emp.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {locked ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <p className="text-[14px] font-semibold text-red-400">Account Locked</p>
              <p className="text-[12px] text-white/40 mt-1">Contact your manager to unlock</p>
            </div>
          ) : success ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
              </div>
              <p className="text-[14px] font-semibold text-emerald-400">Welcome, {selectedEmp.name.split(" ")[0]}!</p>
            </div>
          ) : (
            <>
              {/* Selected employee display */}
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-full bg-[#4F46E5]/30 border-2 border-[#4F46E5]/50 flex items-center justify-center text-[14px] font-bold text-white mx-auto mb-2">
                  {selectedEmp.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
                <p className="text-[14px] font-semibold text-white">{selectedEmp.name}</p>
                <p className="text-[11px] text-white/40">{selectedEmp.role}</p>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-3 mb-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? "bg-[#4F46E5] border-[#4F46E5] scale-110" : "border-white/30"}`} />
                ))}
              </div>

              {error && (
                <div className="text-center mb-3">
                  <p className="text-[12px] text-red-400 font-medium">{error}</p>
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    onClick={() => pressKey(String(n))}
                    disabled={loading}
                    className="h-14 rounded-xl bg-white/10 text-white text-[20px] font-semibold hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {n}
                  </button>
                ))}
                <button onClick={clear} className="h-14 rounded-xl bg-white/5 text-white/50 text-[12px] font-semibold hover:bg-white/10 active:scale-95 transition-all">CLR</button>
                <button onClick={() => pressKey("0")} disabled={loading} className="h-14 rounded-xl bg-white/10 text-white text-[20px] font-semibold hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50">0</button>
                <button onClick={backspace} className="h-14 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                </button>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.3"/><path d="M3 12a9 9 0 019-9"/></svg>
                  <span className="text-[12px] text-white/50">Verifying...</span>
                </div>
              )}

              <p className="text-center text-[10px] text-white/25 mt-3">Demo PIN: 1234</p>
            </>
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between mt-5 px-1">
          <button onClick={onSwitchToAdmin} className="text-[12px] text-white/30 hover:text-white/60 transition-colors">Back Office Login</button>
          <button className="text-[12px] text-white/30 hover:text-white/60 transition-colors">Manager Override</button>
        </div>
      </div>
    </div>
  );
}
