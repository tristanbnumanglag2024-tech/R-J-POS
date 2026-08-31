import { useState } from "react";
import { Card, Badge, Button, SearchBar, Select, Table, Tr, Td, Pagination } from "../components/ui";
import { transactions } from "../data/sampleData";
import { STORE_NAME, STORE_BRANCH } from "../data/sampleData";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusBadge = (s: string) => {
  if (s === "completed") return <Badge variant="success">Completed</Badge>;
  if (s === "refunded") return <Badge variant="danger">Refunded</Badge>;
  return <Badge variant="neutral">{s}</Badge>;
};

const FAKE_ITEMS = [
  { name: "Samsung 65\" 4K Smart TV", qty: 1, price: 1299.99, discount: 0, tax: 104.00 },
  { name: "HDMI Cable 2.0 3m", qty: 2, price: 12.99, discount: 0, tax: 2.08 },
  { name: "TV Wall Mount Kit", qty: 1, price: 39.99, discount: 5.00, tax: 2.80 },
  { name: "Extended Warranty 3yr", qty: 1, price: 89.99, discount: 0, tax: 7.20 },
];

export default function Receipts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<typeof transactions[0] | null>(transactions[0]);
  const PER_PAGE = 8;

  const filtered = transactions.filter((t) => {
    const matchSearch = !search || t.id.includes(search) || t.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || t.status === statusFilter;
    const matchPay = !payFilter || t.payment === payFilter;
    return matchSearch && matchStatus && matchPay;
  });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="p-6 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">Receipts</h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">Search and manage all receipts</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Receipt # or customer name..." />
          <Select value={statusFilter} onChange={setStatusFilter} placeholder="All Status" options={[
            { value: "completed", label: "Completed" },
            { value: "refunded", label: "Refunded" },
          ]} />
          <Select value={payFilter} onChange={setPayFilter} placeholder="All Payments" options={[
            { value: "Cash", label: "Cash" },
            { value: "Credit Card", label: "Credit Card" },
            { value: "Debit Card", label: "Debit Card" },
            { value: "GCash", label: "GCash" },
          ]} />
          {(search || statusFilter || payFilter) && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); setPayFilter(""); }} className="text-[12px] text-[#64748B] underline">Clear</button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Receipt list */}
        <div className="xl:col-span-2">
          <Card>
            <Table headers={["Receipt", "Date", "Total", "Status", ""]}>
              {paged.map((t) => (
                <Tr key={t.id} onClick={() => setSelected(t)}>
                  <Td>
                    <div>
                      <p className={`text-[12px] font-mono font-medium ${selected?.id === t.id ? "text-[#4F46E5]" : "text-[#0F172A]"}`}>{t.id}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">{t.cashier}</p>
                    </div>
                  </Td>
                  <Td><span className="text-[11px] text-[#64748B]">{t.date} {t.time}</span></Td>
                  <Td><span className="text-[12px] font-semibold text-[#0F172A]">{fmt(t.total)}</span></Td>
                  <Td>{statusBadge(t.status)}</Td>
                  <Td>
                    {selected?.id === t.id && (
                      <div className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                    )}
                  </Td>
                </Tr>
              ))}
            </Table>
            <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
          </Card>
        </div>

        {/* Receipt detail */}
        <div className="xl:col-span-3">
          {selected ? (
            <Card className="overflow-hidden">
              {/* Actions bar */}
              <div className="px-5 py-3 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
                <span className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider">Receipt Preview</span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>}>Print</Button>
                  <Button variant="secondary" size="sm" icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}>Email</Button>
                  {selected.status === "completed" && <Button variant="danger" size="sm">Refund</Button>}
                </div>
              </div>

              {/* Receipt body */}
              <div className="p-6">
                {/* Store header */}
                <div className="text-center mb-6 pb-4 border-b border-dashed border-[#E2E8F0]">
                  <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center mx-auto mb-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/></svg>
                  </div>
                  <h3 className="text-[15px] font-bold text-[#0F172A]">{STORE_NAME}</h3>
                  <p className="text-[12px] text-[#64748B]">{STORE_BRANCH}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">123 Commerce Street, Downtown • Tel: +1 555-0192</p>
                </div>

                {/* Receipt meta */}
                <div className="grid grid-cols-2 gap-3 mb-5 text-[12px]">
                  <div className="space-y-1.5">
                    <div className="flex gap-2"><span className="text-[#94A3B8] w-24">Receipt #</span><span className="font-mono font-semibold text-[#0F172A]">{selected.id}</span></div>
                    <div className="flex gap-2"><span className="text-[#94A3B8] w-24">Date</span><span>{selected.date}</span></div>
                    <div className="flex gap-2"><span className="text-[#94A3B8] w-24">Time</span><span>{selected.time}</span></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-2"><span className="text-[#94A3B8] w-20">Cashier</span><span>{selected.cashier}</span></div>
                    <div className="flex gap-2"><span className="text-[#94A3B8] w-20">Customer</span><span>{selected.customer}</span></div>
                    <div className="flex gap-2"><span className="text-[#94A3B8] w-20">Status</span>{statusBadge(selected.status)}</div>
                  </div>
                </div>

                {/* Line items */}
                <div className="border border-[#F1F5F9] rounded-xl overflow-hidden mb-4">
                  <table className="w-full text-left">
                    <thead className="bg-[#F8FAFC]">
                      <tr>
                        {["Product", "Qty", "Unit Price", "Discount", "Tax", "Total"].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {FAKE_ITEMS.slice(0, selected.items).map((item, i) => (
                        <tr key={i} className="border-t border-[#F1F5F9]">
                          <td className="px-3 py-2.5 text-[12px] text-[#0F172A] font-medium">{item.name}</td>
                          <td className="px-3 py-2.5 text-[12px] text-[#64748B]">{item.qty}</td>
                          <td className="px-3 py-2.5 text-[12px]">{fmt(item.price)}</td>
                          <td className="px-3 py-2.5 text-[12px] text-emerald-600">{item.discount > 0 ? `-${fmt(item.discount)}` : "—"}</td>
                          <td className="px-3 py-2.5 text-[12px] text-[#94A3B8]">{fmt(item.tax)}</td>
                          <td className="px-3 py-2.5 text-[12px] font-semibold text-[#0F172A]">{fmt(item.price * item.qty - item.discount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-[#64748B]">Subtotal</span><span>{fmt(selected.subtotal)}</span></div>
                  {selected.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmt(selected.discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-[#64748B]">Tax (8%)</span><span>{fmt(selected.tax)}</span></div>
                  <div className="flex justify-between font-bold text-[15px] pt-2 border-t-2 border-[#0F172A]">
                    <span>TOTAL</span><span className="text-[#4F46E5]">{fmt(selected.total)}</span>
                  </div>
                  <div className="flex justify-between text-[12px] pt-1">
                    <span className="text-[#64748B]">Payment ({selected.payment})</span>
                    <span className="font-semibold">{fmt(selected.total + 2.03)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#64748B]">Change</span>
                    <span className="font-semibold text-emerald-600">{fmt(2.03)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 pt-4 border-t border-dashed border-[#E2E8F0]">
                  <p className="text-[11px] text-[#94A3B8]">Thank you for shopping at {STORE_NAME}!</p>
                  <p className="text-[10px] text-[#CBD5E1] mt-1">Returns accepted within 30 days with receipt. VAT Reg No: 123-456-789-000</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-64">
              <p className="text-[13px] text-[#94A3B8]">Select a receipt to preview</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
