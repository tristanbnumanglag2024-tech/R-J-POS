import { ReactNode } from "react";

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "primary" | "info";
export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  const styles: Record<BadgeVariant, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-600 border-red-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    primary: "bg-indigo-50 text-indigo-700 border-indigo-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  variant = "primary",
  children,
  onClick,
  type = "button",
  size = "md",
  disabled = false,
  icon,
}: {
  variant?: BtnVariant;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "h-7 px-3 text-[12px]", md: "h-8 px-3.5 text-[13px]", lg: "h-9 px-4 text-[13px]" };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-[#4F46E5] text-white hover:bg-[#4338CA] focus:ring-[#4F46E5]/40 shadow-sm",
    secondary: "bg-white text-[#374151] border border-[#E2E8F0] hover:bg-[#F8FAFC] focus:ring-[#4F46E5]/30 shadow-sm",
    ghost: "bg-transparent text-[#64748B] hover:bg-[#F1F5F9] focus:ring-[#4F46E5]/20",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 focus:ring-red-400/30",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  required,
}: {
  label?: string;
  value?: string | number;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[12px] font-medium text-[#374151]">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <div className="relative">
        {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-9 ${icon ? "pl-8" : "pl-3"} pr-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 transition-all`}
        />
      </div>
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label?: string;
  value?: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[12px] font-medium text-[#374151]">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-9 px-3 pr-8 text-[13px] rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 transition-all appearance-none cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#E2E8F0] shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
  trend,
  icon,
  accent = "#4F46E5",
  iconBg = "#EEF2FF",
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; up: boolean };
  icon: ReactNode;
  accent?: string;
  iconBg?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-[#64748B] mb-1">{label}</p>
          <p className="text-[22px] font-bold text-[#0F172A] leading-tight">{value}</p>
          {sub && <p className="text-[11px] text-[#94A3B8] mt-1">{sub}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-[11px] font-medium ${trend.up ? "text-emerald-600" : "text-red-500"}`}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                {trend.up ? <path d="M5 2L9 7H1L5 2z"/> : <path d="M5 8L1 3H9L5 8z"/>}
              </svg>
              {trend.value} vs yesterday
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: accent }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function Table({ headers, children, empty }: { headers: string[]; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#E2E8F0]">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
      {empty && (
        <div className="py-12 text-center text-[13px] text-[#94A3B8]">{empty}</div>
      )}
    </div>
  );
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr
      className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = "", mono }: { children: ReactNode; className?: string; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 text-[13px] text-[#374151] whitespace-nowrap ${mono ? "font-mono text-[12px]" : ""} ${className}`}>
      {children}
    </td>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = "max-w-lg" }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
          <h3 className="text-[15px] font-semibold text-[#0F172A]">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center transition-colors text-[#94A3B8] hover:text-[#475569]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l12 12M13 1L1 13"/></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, total, perPage, onChange }: { page: number; total: number; perPage: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / perPage);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#F1F5F9]">
      <span className="text-[12px] text-[#64748B]">Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className="w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-40 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2L4 6L8 10"/></svg>
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => onChange(p)} className={`w-7 h-7 rounded-lg text-[12px] font-medium transition-colors ${p === page ? "bg-[#4F46E5] text-white" : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"}`}>{p}</button>
        ))}
        <button onClick={() => onChange(Math.min(pages, page + 1))} disabled={page === pages} className="w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-40 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 2L8 6L4 10"/></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[14px] font-semibold text-[#0F172A]">{title}</h2>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m13-3l-3 3-3-3"/></svg>
      </div>
      <p className="text-[13px] text-[#64748B]">{message}</p>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-[#4F46E5]" : "bg-[#CBD5E1]"}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
      {label && <span className="text-[13px] text-[#374151]">{label}</span>}
    </label>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${active === t ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#374151]"}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-60 pl-8 pr-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 transition-all"
      />
    </div>
  );
}
