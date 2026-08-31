import { useState } from "react";

type PaymentMethod = "cash" | "credit" | "debit" | "ewallet" | "bank" | "other";

interface POSPaymentProps {
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  customer: string | null;
  onComplete: (method: PaymentMethod, amountPaid: number, change: number) => void;
  onBack: () => void;
  onCancel: () => void;
}

const METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "cash", label: "Cash", icon: "💵" },
  { id: "credit", label: "Credit Card", icon: "💳" },
  { id: "debit", label: "Debit Card", icon: "🏦" },
  { id: "ewallet", label: "E-Wallet", icon: "📱" },
  { id: "bank", label: "Bank Transfer", icon: "🏛️" },
  { id: "other", label: "Other", icon: "⚙️" },
];

const QUICK_AMOUNTS = [100, 500, 1000];

export default function POSPayment({ total, subtotal, discount, tax, customer, onComplete, onBack, onCancel }: POSPaymentProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);

  const amountPaid = Number(input) || 0;
  const change = Math.max(0, amountPaid - total);
  const canPay = method !== "cash" || amountPaid >= total;

  const pressKey = (k: string) => {
    if (k === "DEL") { setInput((v) => v.slice(0, -1)); return; }
    if (k === "CLR") { setInput(""); return; }
    if (k === "." && input.includes(".")) return;
    if (input.includes(".") && input.split(".")[1]?.length >= 2) return;
    setInput((v) => v + k);
  };

  const complete = () => {
    if (!canPay) return;
    setProcessing(true);
    const paid = method === "cash" ? amountPaid : total;
    setTimeout(() => onComplete(method, paid, method === "cash" ? change : 0), 1200);
  };

  return (
    <div className="flex h-full bg-[#F8FAFC]">
      {/* Left: Summary + method */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-[#64748B] text-[13px] font-medium hover:text-[#374151] mb-8 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Cart
        </button>

        {/* Total */}
        <div className="mb-8 text-center">
          <p className="text-[13px] font-medium text-[#64748B] uppercase tracking-wider mb-2">Total Due</p>
          <p className="text-[52px] font-black text-[#0F172A] leading-none">${total.toFixed(2)}</p>
          {customer && <p className="text-[13px] text-[#94A3B8] mt-2">Customer: {customer}</p>}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6">
          <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">Order Summary</p>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between"><span className="text-[#64748B]">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-[#64748B]">Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-[15px] pt-2 border-t border-[#F1F5F9]">
              <span>Total</span><span className="text-[#4F46E5]">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div>
          <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">Select Payment Method</p>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMethod(m.id); setInput(""); }}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all ${method === m.id ? "border-[#4F46E5] bg-[#EEF2FF]" : "border-[#E2E8F0] bg-white hover:border-[#4F46E5]/40"}`}
              >
                <span className="text-2xl">{m.icon}</span>
                <span className={`text-[12px] font-semibold ${method === m.id ? "text-[#4F46E5]" : "text-[#374151]"}`}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cash specific */}
        {method === "cash" && amountPaid >= total && (
          <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] text-emerald-700 font-medium">Change Due</p>
                <p className="text-[32px] font-black text-emerald-600">${change.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-[#64748B]">Amount Received</p>
                <p className="text-[18px] font-bold text-[#0F172A]">${amountPaid.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Numpad */}
      {method === "cash" && (
        <div className="w-80 shrink-0 bg-white border-l border-[#E2E8F0] flex flex-col p-6">
          <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-4">Amount Received</p>

          {/* Display */}
          <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-4 mb-4 text-right">
            <p className="text-[11px] text-[#94A3B8] mb-1">Cash Tendered</p>
            <p className="text-[32px] font-black text-[#0F172A]">${input || "0.00"}</p>
            {amountPaid > 0 && amountPaid < total && (
              <p className="text-[12px] text-amber-500 font-medium mt-1">Need ${(total - amountPaid).toFixed(2)} more</p>
            )}
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => setInput(total.toFixed(2))} className="h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] text-[12px] font-semibold hover:bg-[#E0E7FF] transition-colors">Exact ${total.toFixed(2)}</button>
            {QUICK_AMOUNTS.map((a) => (
              a >= total &&
              <button key={a} onClick={() => setInput(String(a))} className="h-10 rounded-xl bg-[#F1F5F9] text-[#374151] text-[13px] font-semibold hover:bg-[#E2E8F0] transition-colors">${a}</button>
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <button key={n} onClick={() => pressKey(String(n))} className="h-13 rounded-xl bg-[#F1F5F9] text-[#0F172A] text-[20px] font-semibold hover:bg-[#E2E8F0] active:scale-95 transition-all">{n}</button>
            ))}
            <button onClick={() => pressKey(".")} className="h-13 rounded-xl bg-[#F1F5F9] text-[#64748B] text-[20px] font-bold hover:bg-[#E2E8F0] active:scale-95 transition-all">.</button>
            <button onClick={() => pressKey("0")} className="h-13 rounded-xl bg-[#F1F5F9] text-[#0F172A] text-[20px] font-semibold hover:bg-[#E2E8F0] active:scale-95 transition-all">0</button>
            <button onClick={() => pressKey("DEL")} className="h-13 rounded-xl bg-[#F1F5F9] text-[#64748B] flex items-center justify-center hover:bg-[#E2E8F0] active:scale-95 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
            </button>
          </div>

          <button onClick={complete} disabled={!canPay || processing} className="w-full h-14 rounded-2xl bg-[#4F46E5] text-white text-[16px] font-bold hover:bg-[#4338CA] transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#4F46E5]/25">
            {processing ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.3"/><path d="M3 12a9 9 0 019-9"/></svg>
                Processing...
              </>
            ) : <>Complete Payment</>}
          </button>
          <button onClick={onCancel} className="w-full h-10 mt-2 rounded-xl text-[#64748B] text-[13px] font-medium hover:bg-[#F1F5F9] transition-colors">Cancel</button>
        </div>
      )}

      {/* Card / e-wallet complete button */}
      {method !== "cash" && (
        <div className="w-80 shrink-0 bg-white border-l border-[#E2E8F0] flex flex-col p-6 items-center justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-4 text-4xl">
              {METHODS.find((m) => m.id === method)?.icon}
            </div>
            <p className="text-[14px] font-semibold text-[#0F172A]">{METHODS.find((m) => m.id === method)?.label}</p>
            <p className="text-[12px] text-[#64748B] mt-1">Follow terminal prompts to complete payment</p>
            <p className="text-[28px] font-black text-[#4F46E5] mt-3">${total.toFixed(2)}</p>
          </div>
          <button onClick={complete} disabled={processing} className="w-full h-14 rounded-2xl bg-[#4F46E5] text-white text-[16px] font-bold hover:bg-[#4338CA] transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-[#4F46E5]/25">
            {processing ? "Processing..." : "Confirm Payment"}
          </button>
          <button onClick={onCancel} className="w-full h-10 mt-2 rounded-xl text-[#64748B] text-[13px] font-medium hover:bg-[#F1F5F9] transition-colors">Cancel</button>
        </div>
      )}
    </div>
  );
}
