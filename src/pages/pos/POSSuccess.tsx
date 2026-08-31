import { useEffect, useState } from "react";
import { STORE_NAME, STORE_BRANCH } from "../../data/sampleData";

interface POSSuccessProps {
  receiptNo: string;
  total: number;
  method: string;
  amountPaid: number;
  change: number;
  customer: string | null;
  cashier: string;
  cartItems: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  onNewSale: () => void;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", credit: "Credit Card", debit: "Debit Card", ewallet: "E-Wallet", bank: "Bank Transfer", other: "Other",
};

export default function POSSuccess({ receiptNo, total, method, amountPaid, change, customer, cashier, cartItems, subtotal, discount, tax, onNewSale }: POSSuccessProps) {
  const [view, setView] = useState<"success" | "receipt">("success");
  const now = new Date();

  useEffect(() => {
    const t = setTimeout(() => {}, 0);
    return () => clearTimeout(t);
  }, []);

  if (view === "receipt") {
    return (
      <div className="flex h-full bg-[#F8FAFC] items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-sm overflow-y-auto max-h-[90vh]">
          {/* Receipt header */}
          <div className="text-center px-6 pt-8 pb-4 border-b border-dashed border-[#E2E8F0]">
            <div className="w-12 h-12 rounded-2xl bg-[#4F46E5] flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/></svg>
            </div>
            <h3 className="text-[15px] font-bold text-[#0F172A]">{STORE_NAME}</h3>
            <p className="text-[11px] text-[#64748B]">{STORE_BRANCH}</p>
            <p className="text-[10px] text-[#94A3B8] mt-1">123 Commerce Street · +1 555-0192</p>
          </div>

          <div className="px-6 py-4 border-b border-dashed border-[#E2E8F0] text-[12px] space-y-1.5">
            <div className="flex gap-2"><span className="text-[#94A3B8] w-24">Receipt #</span><span className="font-mono font-semibold text-[#0F172A]">{receiptNo}</span></div>
            <div className="flex gap-2"><span className="text-[#94A3B8] w-24">Date</span><span>{now.toLocaleDateString()}</span></div>
            <div className="flex gap-2"><span className="text-[#94A3B8] w-24">Time</span><span>{now.toLocaleTimeString()}</span></div>
            <div className="flex gap-2"><span className="text-[#94A3B8] w-24">Cashier</span><span>{cashier}</span></div>
            <div className="flex gap-2"><span className="text-[#94A3B8] w-24">Customer</span><span>{customer || "Walk-in"}</span></div>
          </div>

          <div className="px-6 py-4 border-b border-dashed border-[#E2E8F0] space-y-2">
            {cartItems.map((item, i) => (
              <div key={i} className="flex items-start justify-between text-[12px]">
                <div>
                  <p className="font-medium text-[#0F172A]">{item.name}</p>
                  <p className="text-[#94A3B8]">x{item.qty} × ${item.price.toFixed(2)}</p>
                </div>
                <span className="font-semibold">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-[#64748B]">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-[#64748B]">Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-[15px] pt-2 border-t-2 border-[#0F172A]">
              <span>TOTAL</span><span className="text-[#4F46E5]">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] pt-1">
              <span className="text-[#64748B]">Payment ({METHOD_LABELS[method] || method})</span>
              <span className="font-semibold">${amountPaid.toFixed(2)}</span>
            </div>
            {change > 0 && <div className="flex justify-between text-[11px]"><span className="text-[#64748B]">Change</span><span className="font-semibold text-emerald-600">${change.toFixed(2)}</span></div>}
          </div>

          <div className="text-center px-6 py-5 border-t border-dashed border-[#E2E8F0]">
            <p className="text-[11px] text-[#94A3B8]">Thank you for shopping at {STORE_NAME}!</p>
            <p className="text-[10px] text-[#CBD5E1] mt-1">Returns within 30 days · VAT Reg: 123-456-789</p>
          </div>

          <div className="px-6 pb-6 flex flex-col gap-2">
            <button className="w-full h-10 rounded-xl bg-[#4F46E5] text-white text-[13px] font-semibold hover:bg-[#4338CA]">Print Receipt</button>
            <button className="w-full h-10 rounded-xl border border-[#E2E8F0] text-[#64748B] text-[13px] font-medium hover:bg-[#F8FAFC]">Email Receipt</button>
            <button onClick={onNewSale} className="w-full h-10 rounded-xl bg-[#F1F5F9] text-[#374151] text-[13px] font-medium hover:bg-[#E2E8F0]">New Sale</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#F8FAFC] items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        {/* Success animation */}
        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30" />
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
        </div>

        <h1 className="text-[28px] font-black text-[#0F172A] mb-2">Payment Successful!</h1>
        <p className="text-[14px] text-[#64748B] mb-6">Transaction completed successfully</p>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-6 text-left space-y-3">
          <div className="text-center pb-4 border-b border-[#F1F5F9]">
            <p className="text-[12px] text-[#94A3B8] font-mono">{receiptNo}</p>
            <p className="text-[38px] font-black text-[#4F46E5] mt-1">${total.toFixed(2)}</p>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mt-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
              {METHOD_LABELS[method] || method}
            </span>
          </div>
          <div className="text-[13px] space-y-2">
            {method === "cash" && (
              <>
                <div className="flex justify-between"><span className="text-[#64748B]">Amount Paid</span><span className="font-medium">${amountPaid.toFixed(2)}</span></div>
                {change > 0 && <div className="flex justify-between text-emerald-600 font-bold text-[15px]"><span>Change</span><span>${change.toFixed(2)}</span></div>}
              </>
            )}
            <div className="flex justify-between"><span className="text-[#64748B]">Customer</span><span className="font-medium">{customer || "Walk-in"}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">Cashier</span><span className="font-medium">{cashier}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">Time</span><span className="font-medium">{now.toLocaleTimeString()}</span></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setView("receipt")} className="flex-1 h-12 rounded-xl border border-[#E2E8F0] bg-white text-[#374151] text-[14px] font-semibold hover:bg-[#F8FAFC] transition-colors flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            View Receipt
          </button>
          <button onClick={onNewSale} className="flex-1 h-12 rounded-xl bg-[#4F46E5] text-white text-[14px] font-bold hover:bg-[#4338CA] transition-all shadow-lg shadow-[#4F46E5]/25 flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
