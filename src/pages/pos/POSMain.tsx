import { useState, useEffect } from "react";
import { products, categories } from "../../data/sampleData";
import { STORE_NAME, STORE_BRANCH } from "../../data/sampleData";

type CartItem = { id: number; name: string; sku: string; price: number; qty: number; discount: number; category: string };

interface POSMainProps {
  cashier: string;
  onPay: (cart: CartItem[], customer: string | null, subtotal: number, discount: number, tax: number, total: number) => void;
  onLock: () => void;
  onLogout: () => void;
}

// ── Numeric keypad for quick quantity entry
function Numpad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[1,2,3,4,5,6,7,8,9].map((n) => (
        <button key={n} onClick={() => onKey(String(n))} className="h-11 rounded-xl bg-[#F1F5F9] text-[#0F172A] text-[18px] font-semibold hover:bg-[#E2E8F0] active:scale-95 transition-all">{n}</button>
      ))}
      <button onClick={() => onKey("CLR")} className="h-11 rounded-xl bg-[#F1F5F9] text-[#64748B] text-[12px] font-semibold hover:bg-[#E2E8F0] active:scale-95 transition-all">CLR</button>
      <button onClick={() => onKey("0")} className="h-11 rounded-xl bg-[#F1F5F9] text-[#0F172A] text-[18px] font-semibold hover:bg-[#E2E8F0] active:scale-95 transition-all">0</button>
      <button onClick={() => onKey("DEL")} className="h-11 rounded-xl bg-[#F1F5F9] text-[#64748B] flex items-center justify-center hover:bg-[#E2E8F0] active:scale-95 transition-all">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
      </button>
    </div>
  );
}

// ── Customer modal
function CustomerModal({ onSelect, onClose }: { onSelect: (name: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const CUSTOMERS = [
    { name: "James Whitfield", phone: "+1 555-0142", email: "james.w@email.com", points: 1240 },
    { name: "Aisha Patel", phone: "+1 555-0187", email: "aisha.patel@email.com", points: 680 },
    { name: "Robert Chen", phone: "+1 555-0231", email: "r.chen@email.com", points: 3200 },
    { name: "Emma Liu", phone: "+1 555-0419", email: "emma.liu@email.com", points: 920 },
  ].filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#0F172A]">Select Customer</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8]">✕</button>
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone, email..." className="w-full h-9 pl-9 pr-3 text-[13px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]" />
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {CUSTOMERS.map((c) => (
              <button key={c.name} onClick={() => onSelect(c.name)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors text-left">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                  {c.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#0F172A]">{c.name}</p>
                  <p className="text-[11px] text-[#94A3B8]">{c.phone}</p>
                </div>
                <span className="text-[11px] font-semibold text-amber-600">⭐ {c.points}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={() => onSelect("Walk-in Customer")} className="flex-1 h-9 rounded-xl bg-[#F1F5F9] text-[#64748B] text-[13px] font-medium hover:bg-[#E2E8F0]">Continue as Guest</button>
          <button className="flex-1 h-9 rounded-xl bg-[#EEF2FF] text-[#4F46E5] text-[13px] font-medium hover:bg-[#E0E7FF]">+ New Customer</button>
        </div>
      </div>
    </div>
  );
}

// ── Discount modal
function DiscountModal({ subtotal, onApply, onClose }: { subtotal: number; onApply: (disc: number) => void; onClose: () => void }) {
  const [type, setType] = useState<"pct" | "fixed">("pct");
  const [val, setVal] = useState("");
  const [reason, setReason] = useState("");
  const computed = type === "pct" ? subtotal * (Number(val) / 100) : Math.min(Number(val), subtotal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-sm">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#0F172A]">Apply Discount</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8]">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[{ v: "pct", l: "Percentage (%)" }, { v: "fixed", l: "Fixed Amount ($)" }].map((t) => (
              <button key={t.v} onClick={() => setType(t.v as any)} className={`h-10 rounded-xl border text-[12px] font-medium transition-all ${type === t.v ? "bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5]" : "border-[#E2E8F0] text-[#64748B]"}`}>{t.l}</button>
            ))}
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#374151] block mb-1">{type === "pct" ? "Percentage" : "Amount"}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[14px] font-medium">{type === "pct" ? "%" : "$"}</span>
              <input type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0" className="w-full h-11 pl-8 pr-3 text-[16px] font-bold rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]" />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#374151] block mb-1">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]">
              <option value="">Select reason</option>
              <option>Loyalty reward</option>
              <option>Staff discount</option>
              <option>Damaged item</option>
              <option>Manager override</option>
              <option>Promotion</option>
            </select>
          </div>
          {val && (
            <div className="bg-[#F8FAFC] rounded-xl p-3 flex items-center justify-between text-[13px]">
              <span className="text-[#64748B]">Discount amount:</span>
              <span className="font-bold text-emerald-600 text-[16px]">-${computed.toFixed(2)}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { onApply(computed); onClose(); }} className="flex-1 h-10 rounded-xl bg-[#4F46E5] text-white text-[13px] font-semibold hover:bg-[#4338CA]">Apply Discount</button>
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-[#64748B] text-[13px] font-medium hover:bg-[#F8FAFC]">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hold orders modal
function HoldModal({ held, onResume, onClose }: { held: any[]; onResume: (idx: number) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-md">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#0F172A]">Held Orders ({held.length})</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8]">✕</button>
        </div>
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {held.length === 0 ? (
            <p className="text-center text-[13px] text-[#94A3B8] py-8">No held orders</p>
          ) : held.map((h, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0] hover:border-[#4F46E5] transition-colors">
              <div>
                <p className="text-[13px] font-semibold text-[#0F172A]">Hold #{i + 1} · {h.customer || "Walk-in"}</p>
                <p className="text-[11px] text-[#94A3B8]">{h.items.length} items · ${h.total.toFixed(2)} · {h.time}</p>
              </div>
              <button onClick={() => onResume(i)} className="h-8 px-3 rounded-lg bg-[#4F46E5] text-white text-[12px] font-semibold hover:bg-[#4338CA]">Resume</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── POS Menu
function POSMenu({ onAction, onClose }: { onAction: (a: string) => void; onClose: () => void }) {
  const items = [
    { id: "new", icon: "🛒", label: "New Sale" },
    { id: "held", icon: "⏸️", label: "Held Orders" },
    { id: "receipts", icon: "🧾", label: "Receipts" },
    { id: "refund", icon: "↩️", label: "Refund" },
    { id: "cash", icon: "💰", label: "Cash Management" },
    { id: "customers", icon: "👥", label: "Customers" },
    { id: "lock", icon: "🔒", label: "Lock Screen" },
    { id: "backoffice", icon: "⚙️", label: "Back Office" },
    { id: "logout", icon: "🚪", label: "Logout" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-sm">
        <div className="px-5 py-4 border-b border-[#F1F5F9]">
          <h3 className="text-[15px] font-semibold text-[#0F172A]">POS Menu</h3>
        </div>
        <div className="p-3 grid grid-cols-3 gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => { onAction(item.id); onClose(); }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors ${item.id === "logout" ? "text-red-500 hover:bg-red-50" : ""}`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[11px] font-medium text-[#374151]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Electronics: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Clothing: "bg-sky-100 text-sky-700 border-sky-200",
  "Beauty & Personal Care": "bg-pink-100 text-pink-700 border-pink-200",
  "Food & Snacks": "bg-amber-100 text-amber-700 border-amber-200",
  "Home & Kitchen": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Sports & Outdoors": "bg-violet-100 text-violet-700 border-violet-200",
  "Toys & Games": "bg-orange-100 text-orange-700 border-orange-200",
  "Office Supplies": "bg-slate-100 text-slate-700 border-slate-200",
};

export default function POSMain({ cashier, onPay, onLock, onLogout }: POSMainProps) {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<string | null>(null);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [txnNum] = useState("TXN-" + Math.floor(Math.random() * 9000 + 1000));
  const [time, setTime] = useState(new Date());
  const [showCustomer, setShowCustomer] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [added, setAdded] = useState<number | null>(null);

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const catList = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
    const matchCat = activeCat === "All" || p.category === activeCat;
    return matchSearch && matchCat;
  });

  const addToCart = (p: typeof products[0]) => {
    if (p.stock === 0) return;
    setAdded(p.id);
    setTimeout(() => setAdded(null), 600);
    setCart((c) => {
      const existing = c.find((item) => item.id === p.id);
      if (existing) return c.map((item) => item.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      return [...c, { id: p.id, name: p.name, sku: p.sku, price: p.price, qty: 1, discount: 0, category: p.category }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((c) => c.map((i) => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };

  const removeItem = (id: number) => setCart((c) => c.filter((i) => i.id !== id));
  const clearCart = () => { setCart([]); setCustomer(null); setOrderDiscount(0); };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty - i.discount, 0);
  const TAX_RATE = 0.08;
  const tax = (subtotal - orderDiscount) * TAX_RATE;
  const total = subtotal - orderDiscount + tax;

  const holdOrder = () => {
    if (cart.length === 0) return;
    setHeldOrders([...heldOrders, { items: cart, customer, total, time: new Date().toLocaleTimeString() }]);
    clearCart();
  };

  const resumeHeld = (idx: number) => {
    const held = heldOrders[idx];
    setCart(held.items);
    setCustomer(held.customer);
    setHeldOrders(heldOrders.filter((_, i) => i !== idx));
    setShowHeld(false);
  };

  const handleMenuAction = (action: string) => {
    if (action === "lock") onLock();
    if (action === "logout") onLogout();
    if (action === "held") setShowHeld(true);
    if (action === "new") clearCart();
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* POS Header */}
      <header className="h-13 bg-[#0F172A] flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4F46E5] flex items-center justify-center shrink-0">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/></svg>
          </div>
          <div>
            <p className="text-white text-[12px] font-semibold leading-tight">{STORE_NAME}</p>
            <p className="text-white/40 text-[9px] leading-tight">{STORE_BRANCH} · Register 1</p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Cashier */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#4F46E5]/40 flex items-center justify-center text-[9px] font-bold text-white">
            {cashier.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
          <span className="text-white/70 text-[12px]">{cashier}</span>
        </div>

        <div className="text-white/50 text-[12px] hidden md:block">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>

        <button onClick={() => setShowCustomer(true)} className={`flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium transition-all ${customer ? "bg-[#4F46E5] text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {customer || "Guest"}
        </button>

        <button onClick={() => setShowHeld(true)} className="relative flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 text-[11px] font-medium transition-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Hold
          {heldOrders.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-[#0F172A] text-[9px] font-bold rounded-full flex items-center justify-center">{heldOrders.length}</span>}
        </button>

        <button onClick={onLock} className="h-7 px-3 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 text-[11px] font-medium transition-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </button>

        <button onClick={() => setShowMenu(true)} className="h-7 w-7 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 flex items-center justify-center transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── LEFT: Product catalog */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Search + categories */}
          <div className="bg-white border-b border-[#E2E8F0] px-4 py-3 space-y-2.5 shrink-0">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, or barcode..."
                className="w-full h-10 pl-10 pr-4 text-[13px] rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:bg-white transition-all"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
              {catList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`shrink-0 h-8 px-3.5 rounded-lg text-[12px] font-medium transition-all ${activeCat === cat ? "bg-[#4F46E5] text-white shadow-sm" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-[13px] text-[#94A3B8]">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map((p) => {
                  const inCart = cart.find((c) => c.id === p.id);
                  const oos = p.stock === 0;
                  const low = !oos && p.stock <= 5;
                  const colorClass = CATEGORY_COLORS[p.category] || "bg-slate-100 text-slate-700 border-slate-200";
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={oos}
                      className={`relative flex flex-col p-3 rounded-2xl border-2 text-left transition-all active:scale-95 group ${
                        oos ? "border-[#E2E8F0] bg-[#F8FAFC] opacity-50 cursor-not-allowed"
                        : inCart ? "border-[#4F46E5] bg-[#EEF2FF]/50 shadow-md shadow-[#4F46E5]/10"
                        : added === p.id ? "border-emerald-400 bg-emerald-50"
                        : "border-[#E2E8F0] bg-white hover:border-[#4F46E5]/50 hover:shadow-md"
                      }`}
                    >
                      {/* Category color avatar */}
                      <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-[22px] font-bold mb-2.5 border ${colorClass}`}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>

                      <p className="text-[12px] font-semibold text-[#0F172A] leading-tight mb-1 line-clamp-2">{p.name}</p>
                      <p className="text-[10px] font-mono text-[#94A3B8] mb-2">{p.sku}</p>

                      <div className="flex items-end justify-between mt-auto">
                        <span className="text-[14px] font-bold text-[#4F46E5]">${p.price.toFixed(2)}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${oos ? "bg-red-100 text-red-600" : low ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                          {oos ? "OUT" : low ? `LOW ${p.stock}` : `${p.stock}`}
                        </span>
                      </div>

                      {inCart && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-[#4F46E5] rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                          {inCart.qty}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart panel */}
        <div className="w-80 shrink-0 bg-white border-l border-[#E2E8F0] flex flex-col">
          {/* Cart header */}
          <div className="px-4 py-3 border-b border-[#F1F5F9] shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#0F172A]">{txnNum}</p>
                <p className="text-[11px] text-[#94A3B8]">{customer || "Walk-in Customer"}</p>
              </div>
              <button onClick={clearCart} className="h-7 px-2.5 rounded-lg bg-red-50 text-red-500 text-[11px] font-medium hover:bg-red-100 transition-colors">Clear</button>
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                </div>
                <p className="text-[12px] text-[#94A3B8]">Cart is empty</p>
                <p className="text-[11px] text-[#CBD5E1] mt-0.5">Tap a product to add it</p>
              </div>
            ) : cart.map((item) => (
              <div key={item.id} className="bg-[#F8FAFC] rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 ${CATEGORY_COLORS[item.category] || "bg-slate-100 text-slate-700"}`}>
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#0F172A] leading-tight truncate">{item.name}</p>
                    <p className="text-[11px] text-[#94A3B8]">${item.price.toFixed(2)} each</p>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-[#CBD5E1] hover:text-red-400 transition-colors shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l10 10M11 1L1 11"/></svg>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => item.qty > 1 ? updateQty(item.id, -1) : removeItem(item.id)} className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-[#F1F5F9] transition-colors text-[14px] font-bold">−</button>
                    <span className="w-8 text-center text-[13px] font-bold text-[#0F172A]">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-[#F1F5F9] transition-colors text-[14px] font-bold">+</button>
                  </div>
                  <span className="text-[13px] font-bold text-[#0F172A]">${(item.price * item.qty).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cart totals */}
          <div className="border-t border-[#E2E8F0] px-4 py-3 shrink-0">
            <div className="space-y-1.5 text-[12px] mb-3">
              <div className="flex justify-between"><span className="text-[#64748B]">Subtotal</span><span className="font-medium">${subtotal.toFixed(2)}</span></div>
              {orderDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-${orderDiscount.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span className="text-[#64748B]">Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-[15px] font-bold text-[#0F172A] pt-1.5 border-t border-[#F1F5F9]">
                <span>TOTAL</span><span className="text-[#4F46E5]">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Cart actions */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <button onClick={() => setShowCustomer(true)} className="h-9 rounded-xl bg-[#F1F5F9] text-[#475569] text-[11px] font-medium hover:bg-[#E2E8F0] transition-colors flex flex-col items-center justify-center gap-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Customer
              </button>
              <button onClick={() => cart.length > 0 && setShowDiscount(true)} disabled={cart.length === 0} className="h-9 rounded-xl bg-[#F1F5F9] text-[#475569] text-[11px] font-medium hover:bg-[#E2E8F0] transition-colors flex flex-col items-center justify-center gap-0.5 disabled:opacity-40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 5L5 19M9 6.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM20.5 17.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
                Discount
              </button>
              <button onClick={holdOrder} disabled={cart.length === 0} className="h-9 rounded-xl bg-[#F1F5F9] text-[#475569] text-[11px] font-medium hover:bg-[#E2E8F0] transition-colors flex flex-col items-center justify-center gap-0.5 disabled:opacity-40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>
                Hold
              </button>
            </div>

            <button
              onClick={() => cart.length > 0 && onPay(cart, customer, subtotal, orderDiscount, tax, total)}
              disabled={cart.length === 0}
              className="w-full h-12 rounded-xl bg-[#4F46E5] text-white text-[15px] font-bold hover:bg-[#4338CA] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#4F46E5]/25 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              PAY ${total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCustomer && <CustomerModal onSelect={(c) => { setCustomer(c); setShowCustomer(false); }} onClose={() => setShowCustomer(false)} />}
      {showDiscount && <DiscountModal subtotal={subtotal} onApply={(d) => setOrderDiscount(d)} onClose={() => setShowDiscount(false)} />}
      {showHeld && <HoldModal held={heldOrders} onResume={resumeHeld} onClose={() => setShowHeld(false)} />}
      {showMenu && <POSMenu onAction={handleMenuAction} onClose={() => setShowMenu(false)} />}
    </div>
  );
}
