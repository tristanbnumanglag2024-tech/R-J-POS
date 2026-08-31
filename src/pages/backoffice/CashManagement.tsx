import { useState } from "react";
import { Card, Badge, Button, Table, Tr, Td } from "../../components/ui";
import UnderConstructionNotice from "../../components/UnderConstructionNotice";

const sessions = [
  { id: "CS-2024-0041", date: "2024-08-29", cashier: "Maria Santos", opened: "08:00", closed: "16:00", openingCash: 500, cashSales: 3240, cashIn: 0, cashOut: 200, expectedCash: 3540, actualCash: 3540, diff: 0, status: "closed" },
  { id: "CS-2024-0040", date: "2024-08-29", cashier: "Carlos Rivera", opened: "08:00", closed: null, openingCash: 500, cashSales: 1820, cashIn: 200, cashOut: 0, expectedCash: 2520, actualCash: null, diff: null, status: "open" },
  { id: "CS-2024-0039", date: "2024-08-28", cashier: "Diego Morales", opened: "14:00", closed: "22:00", openingCash: 300, cashSales: 2140, cashIn: 100, cashOut: 500, expectedCash: 2040, actualCash: 2030, diff: -10, status: "closed" },
  { id: "CS-2024-0038", date: "2024-08-28", cashier: "Maria Santos", opened: "08:00", closed: "14:00", openingCash: 500, cashSales: 1870, cashIn: 0, cashOut: 300, expectedCash: 2070, actualCash: 2085, diff: 15, status: "closed" },
];

function fmt(n: number) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 }); }

export default function CashManagement() {
  const [tab, setTab] = useState<"sessions" | "cashin" | "cashout">("sessions");
  const [showCashIn, setShowCashIn] = useState(false);
  const [showCashOut, setShowCashOut] = useState(false);
  const [txForm, setTxForm] = useState({ amount: "", reason: "", notes: "" });

  const currentSession = sessions.find((s) => s.status === "open");

  return (
    
    <div className="p-6 space-y-5 max-w-[1200px]">
      <UnderConstructionNotice pageName="Cash Management" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">Cash Management</h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">Till management and cash reconciliation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowCashIn(true)}>Cash In</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowCashOut(true)}>Cash Out</Button>
          <Button variant="primary" size="sm">Close Register</Button>
        </div>
      </div>

      {/* Current session */}
      {currentSession && (
        <Card className="p-5 border-[#4F46E5]/20 bg-[#EEF2FF]/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[14px] font-semibold text-[#0F172A]">Register Open — {currentSession.cashier}</span>
              <Badge variant="success">Active</Badge>
            </div>
            <span className="text-[12px] text-[#64748B]">Opened {currentSession.opened}</span>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: "Opening Float", value: fmt(currentSession.openingCash) },
              { label: "Cash Sales", value: fmt(currentSession.cashSales), color: "#10B981" },
              { label: "Cash In", value: fmt(currentSession.cashIn), color: "#4F46E5" },
              { label: "Cash Out", value: fmt(currentSession.cashOut), color: "#EF4444" },
              { label: "Expected in Drawer", value: fmt(currentSession.expectedCash), color: "#0EA5E9" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-[11px] text-[#64748B] mb-1">{s.label}</p>
                <p className="text-[16px] font-bold" style={{ color: s.color || "#0F172A" }}>{s.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Sessions Today", value: sessions.filter((s) => s.date === "2024-08-29").length, color: "#4F46E5" },
          { label: "Total Cash Sales", value: fmt(sessions.filter((s) => s.date === "2024-08-29").reduce((x, s) => x + s.cashSales, 0)), color: "#10B981" },
          { label: "Cash Discrepancies", value: sessions.filter((s) => s.diff !== null && s.diff !== 0).length, color: "#F59E0B" },
          { label: "Balanced Sessions", value: sessions.filter((s) => s.diff === 0).length, color: "#0EA5E9" },
        ].map((s) => (
          <Card key={s.label} className="px-5 py-4">
            <p className="text-[11px] text-[#64748B] mb-1">{s.label}</p>
            <p className="text-[18px] font-bold" style={{ color: s.color }}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Sessions table */}
      <Card>
        <div className="px-5 py-4 border-b border-[#F1F5F9]">
          <h3 className="text-[14px] font-semibold text-[#0F172A]">Register Sessions</h3>
        </div>
        <Table headers={["Session ID", "Date", "Cashier", "Opened", "Closed", "Opening", "Cash Sales", "Cash In", "Cash Out", "Expected", "Actual", "Diff", "Status"]}>
          {sessions.map((s) => (
            <Tr key={s.id}>
              <Td mono><span className="text-[#4F46E5]">{s.id}</span></Td>
              <Td><span className="text-[12px] text-[#64748B]">{s.date}</span></Td>
              <Td>{s.cashier}</Td>
              <Td><span className="text-[12px]">{s.opened}</span></Td>
              <Td><span className="text-[12px]">{s.closed || <span className="text-emerald-500 font-medium">Active</span>}</span></Td>
              <Td><span className="text-[#64748B]">{fmt(s.openingCash)}</span></Td>
              <Td><span className="font-medium text-emerald-600">{fmt(s.cashSales)}</span></Td>
              <Td><span className="text-[#4F46E5]">{s.cashIn > 0 ? "+" + fmt(s.cashIn) : "—"}</span></Td>
              <Td><span className="text-red-500">{s.cashOut > 0 ? "-" + fmt(s.cashOut) : "—"}</span></Td>
              <Td><span className="font-semibold">{fmt(s.expectedCash)}</span></Td>
              <Td>{s.actualCash !== null ? <span className="font-semibold">{fmt(s.actualCash)}</span> : <span className="text-[#94A3B8]">—</span>}</Td>
              <Td>
                {s.diff !== null ? (
                  <span className={`font-bold ${s.diff === 0 ? "text-emerald-500" : s.diff > 0 ? "text-blue-500" : "text-red-500"}`}>
                    {s.diff > 0 ? "+" : ""}{fmt(s.diff)}
                  </span>
                ) : <span className="text-[#94A3B8]">—</span>}
              </Td>
              <Td><Badge variant={s.status === "open" ? "success" : "neutral"}>{s.status === "open" ? "Open" : "Closed"}</Badge></Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Cash In Modal */}
      {showCashIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCashIn(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-md p-6">
            <h3 className="text-[15px] font-semibold text-[#0F172A] mb-4">Cash In</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-[#374151] block mb-1">Amount</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">$</span><input type="number" value={txForm.amount} onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="w-full h-9 pl-7 pr-3 text-[14px] font-bold rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]" /></div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#374151] block mb-1">Reason</label>
                <select className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"><option>Change fund</option><option>Float top-up</option><option>Petty cash</option><option>Other</option></select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#374151] block mb-1">Notes</label>
                <textarea rows={2} className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E2E8F0] resize-none focus:outline-none focus:border-[#4F46E5]" />
              </div>
              <div className="flex gap-3"><Button variant="primary" onClick={() => setShowCashIn(false)}>Record Cash In</Button><Button variant="secondary" onClick={() => setShowCashIn(false)}>Cancel</Button></div>
            </div>
          </div>
        </div>
      )}

      {showCashOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCashOut(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-md p-6">
            <h3 className="text-[15px] font-semibold text-[#0F172A] mb-4">Cash Out</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-[#374151] block mb-1">Amount</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">$</span><input type="number" placeholder="0.00" className="w-full h-9 pl-7 pr-3 text-[14px] font-bold rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]" /></div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#374151] block mb-1">Reason</label>
                <select className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"><option>Cash drop/deposit</option><option>Expense payment</option><option>Supplier payment</option><option>Other</option></select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#374151] block mb-1">Notes</label>
                <textarea rows={2} className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E2E8F0] resize-none focus:outline-none focus:border-[#4F46E5]" />
              </div>
              <div className="flex gap-3"><Button variant="primary" onClick={() => setShowCashOut(false)}>Record Cash Out</Button><Button variant="secondary" onClick={() => setShowCashOut(false)}>Cancel</Button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
