import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Pagination, Table, Tr, Td } from "@/components/ui";

type DeliveryStatus = "pending" | "received" | "partial" | "cancelled";

type DeliveryRecord = {
  id: string;
  delivery_no: string;
  delivery_date: string;
  supplier_id: number;
  supplier: string;
  po_no: string;
  invoice_no: string;
  items: number;
  received_by: string;
  status: DeliveryStatus;
  notes: string;
};

type PurchaseOrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
  total: number;
};

type PurchaseOrderSummary = {
  id: number;
  po_number: string;
  store_id: number;
  supplier_id: number;
  supplier: string;
  items: PurchaseOrderItem[];
};

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

const emptyForm = {
  delivery_date: new Date().toISOString().slice(0, 10),
  supplier_id: "", supplier_name: "", po_no: "", invoice_no: "", items: "0",
  received_by: "", status: "received" as DeliveryStatus, notes: "",
};

function makeDeliveryNo() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `DEL-${date}-${Math.floor(Math.random() * 900 + 100)}`;
}

function statusBadge(status: DeliveryStatus) {
  if (status === "received") return <Badge variant="success">Received</Badge>;
  if (status === "partial") return <Badge variant="info">Partial</Badge>;
  if (status === "cancelled") return <Badge variant="neutral">Cancelled</Badge>;
  return <Badge variant="neutral">Pending</Badge>;
}

export default function DeliveryReport() {
  const [records,setRecords]=useState<DeliveryRecord[]>([]);
  const [suppliers,setSuppliers]=useState<{id:number;name:string}[]>([]);
  const [showForm,setShowForm]=useState(false); const [form,setForm]=useState(emptyForm);
  const [search,setSearch]=useState(""); const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(false); const [saving,setSaving]=useState(false);
  const [checkingPO,setCheckingPO]=useState(false); const [error,setError]=useState(""); const [poMessage,setPoMessage]=useState("");
  const [poItems,setPoItems]=useState<PurchaseOrderItem[]>([]);
  const [poLoading,setPoLoading]=useState(false);
  const [detail,setDetail]=useState<DeliveryRecord|null>(null);
  const [detailItems,setDetailItems]=useState<PurchaseOrderItem[]>([]);
  const [detailLoading,setDetailLoading]=useState(false);
  const PER_PAGE=10;
  const storeId=()=>{const n=Number(localStorage.getItem("selected_store_id"));return Number.isInteger(n)&&n>0?n:null};
  const loadSuppliers=async()=>{try{const r=await fetch(`${API_BASE}/suppliers/list.php`,{headers:{Accept:"application/json"}});const d=await r.json();if(!r.ok||!d.success)throw Error(d.message||"Unable to load suppliers.");const rows=Array.isArray(d.suppliers)?d.suppliers:Array.isArray(d.data)?d.data:Array.isArray(d.rows)?d.rows:[];setSuppliers(rows.map((x:any)=>({id:Number(x.id),name:String(x.name??x.supplier_name??x.company_name??"").trim()})).filter((x:any)=>x.id>0&&x.name));}catch(e){setError(e instanceof Error?e.message:"Unable to load suppliers.")}};
  const loadRecords=async()=>{setLoading(true);try{const sid=storeId();const q=sid?`?store_id=${sid}`:"";const r=await fetch(`${API_BASE}/delivery-records/list.php${q}`,{headers:{Accept:"application/json"}});const d=await r.json();if(!r.ok||!d.success)throw Error(d.message||"Unable to load delivery records.");const rows=Array.isArray(d.records)?d.records:Array.isArray(d.data)?d.data:[];setRecords(rows.map((x:any)=>({id:String(x.id),delivery_no:String(x.delivery_no??""),delivery_date:String(x.delivery_date??""),supplier_id:Number(x.supplier_id??0),supplier:String(x.supplier_name??x.supplier??""),po_no:String(x.po_number??x.po_no??""),invoice_no:String(x.invoice_no??""),items:Number(x.item_count??x.items??0),received_by:String(x.received_by??""),status:String(x.status??"received") as DeliveryStatus,notes:String(x.notes??"")})));}catch(e){setError(e instanceof Error?e.message:"Unable to load delivery records.")}finally{setLoading(false)}};
  useEffect(()=>{void Promise.all([loadSuppliers(),loadRecords()])},[]);
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return records;return records.filter(r=>[r.delivery_no,r.supplier,r.po_no,r.invoice_no,r.received_by,r.status].join(" " ).toLowerCase().includes(q))},[records,search]);
  const paged=filtered.slice((page-1)*PER_PAGE,page*PER_PAGE);
  const loadPurchaseOrderByNumber=async(po:string,supplierId:string|number,targetStoreId?:number|null)=>{
    const normalizedPo=po.trim();
    const sid=targetStoreId ?? storeId();
    if(!normalizedPo || !sid || Number(supplierId)<=0) return null;

    const params=new URLSearchParams({
      po_number: normalizedPo,
      supplier_id: String(supplierId),
      store_id: String(sid),
    });

    const r=await fetch(
      `${API_BASE}/purchase_orders/details.php?${params.toString()}`,
      {headers:{Accept:"application/json"}}
    );

    const text=await r.text();
    let d:any;
    try{
      d=JSON.parse(text);
    }catch{
      throw Error(`Purchase order details API returned invalid JSON: ${text.substring(0,300)}`);
    }

    if(!r.ok || !d.success){
      throw Error(d.message || "Unable to load purchase order details.");
    }

    const order=d.purchase_order;
    if(!order) throw Error("Purchase order details were not returned by the server.");

    const items=Array.isArray(order.items) ? order.items.map((item:any)=>({
      id:Number(item.id??0),
      product_id:Number(item.product_id??0),
      product_name:String(item.product_name??item.name??"Product"),
      sku:String(item.sku??""),
      quantity:Number(item.quantity??0),
      received_quantity:Number(item.received_quantity??0),
      unit_cost:Number(item.unit_cost??item.cost??0),
      total:Number(item.total??item.line_total??0),
    })) : [];

    return {
      id:Number(order.id),
      po_number:String(order.po_number??normalizedPo),
      store_id:Number(order.store_id??sid),
      supplier_id:Number(order.supplier_id??supplierId),
      supplier:String(order.supplier_name??order.supplier??""),
      items,
    } as PurchaseOrderSummary;
  };

  const validatePO=async(po:string,sid:string)=>{
    setPoMessage("");
    setPoItems([]);
    setForm(previous=>({...previous,items:"0"}));
    if(!po.trim()||!sid) return;

    setCheckingPO(true);
    setPoLoading(true);
    try{
      const p=new URLSearchParams({po_number:po.trim(),supplier_id:sid});
      const s=storeId();
      if(s)p.set("store_id",String(s));
      const r=await fetch(`${API_BASE}/delivery-records/validate-po.php?${p}`,{headers:{Accept:"application/json"}});
      const d=await r.json();
      if(!r.ok||!d.success){
        setPoMessage(d.message||"This PO number is not valid for the selected supplier.");
        return;
      }

      const poRecord=await loadPurchaseOrderByNumber(po,sid,s);
      if(!poRecord){
        setPoMessage(d.message||"PO is valid, but the purchase order details could not be loaded.");
        return;
      }

      setPoItems(poRecord.items);
      setForm(previous=>({...previous,items:String(poRecord.items.length)}));
      setPoMessage(d.message||`PO ${poRecord.po_number} is valid and has not been recorded. ${poRecord.items.length} item line${poRecord.items.length===1?"":"s"} loaded.`);
    }catch(e){
      setPoMessage(e instanceof Error?e.message:"Unable to validate PO number.");
      setPoItems([]);
      setForm(previous=>({...previous,items:"0"}));
    }finally{
      setCheckingPO(false);
      setPoLoading(false);
    }
  };

  const saveRecord=async()=>{setError("");const sid=storeId();const supplierId=Number(form.supplier_id);if(!sid){setError("No store is selected. Please select a store before recording a delivery.");return}if(!supplierId||!form.delivery_date||!form.received_by.trim()){setError("Please complete Delivery Date, Supplier, and Received By.");return}if(form.po_no.trim()&&!poMessage.toLowerCase().includes("valid and has not been recorded")){setError("Please enter a valid PO number for the selected supplier. The PO must exist and must not already be recorded.");return}if(form.po_no.trim()&&poItems.length===0){setError("The selected purchase order has no item lines to record.");return}setSaving(true);try{const r=await fetch(`${API_BASE}/delivery-records/create.php`,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({store_id:sid,delivery_date:form.delivery_date,supplier_id:supplierId,po_number:form.po_no.trim()||null,invoice_no:form.invoice_no.trim()||null,item_count:form.po_no.trim()?poItems.length:Math.max(0,Number(form.items)||0),received_by:form.received_by.trim(),status:form.status,notes:form.notes.trim()||null})});const d=await r.json();if(!r.ok||!d.success){setError(d.message||"Unable to save delivery record.");return}setForm({...emptyForm,delivery_date:new Date().toISOString().slice(0,10)});setPoMessage("");setPoItems([]);await loadRecords();setShowForm(false);setPage(1)}catch(e){setError(e instanceof Error?e.message:"Unable to save delivery record.")}finally{setSaving(false)}};
  const openDetail=async(record:DeliveryRecord)=>{
    setDetail(record);
    setDetailItems([]);
    setDetailLoading(true);
    try{
      if(record.po_no.trim()){
        const po=await loadPurchaseOrderByNumber(record.po_no,String(record.supplier_id),storeId());
        if(po) setDetailItems(po.items);
      }
    }catch(e){
      console.warn("Unable to load delivery PO details:",e);
    }finally{
      setDetailLoading(false);
    }
  };

  const deleteRecord=async(id:string)=>{if(!confirm("Delete this delivery record?"))return;setError("");try{const r=await fetch(`${API_BASE}/delivery-records/delete.php`,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({id:Number(id)})});const d=await r.json();if(!r.ok||!d.success)throw Error(d.message||"Unable to delete delivery record.");await loadRecords()}catch(e){setError(e instanceof Error?e.message:"Unable to delete delivery record.")}};
  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[#0F172A]">Delivery Report</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Record incoming deliveries and receiving details.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          + Record Delivery
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search delivery, supplier, PO, invoice..."
            className="flex-1 h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
          />
          <div className="px-3 h-9 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center text-[12px] text-[#64748B]">
            {filtered.length} record{filtered.length === 1 ? "" : "s"}
          </div>
        </div>
      </Card>

      <Card>
        <Table headers={["Delivery #", "Date", "Supplier", "PO #", "Invoice #", "Items", "Received By", "Status", ""]}>
          {paged.length === 0 ? (
            <Tr>
              <Td>
                <div className="py-10 text-center">
                  <p className="text-[13px] font-medium text-[#475569]">No delivery records yet</p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Record a delivery when stock arrives from a supplier.
                  </p>
                </div>
              </Td>
            </Tr>
          ) : (
            paged.map((record) => (
              <Tr key={record.id}>
                <Td><span className="font-semibold text-[#0F172A]">{record.delivery_no}</span></Td>
                <Td>{record.delivery_date}</Td>
                <Td>{record.supplier}</Td>
                <Td>{record.po_no || "—"}</Td>
                <Td>{record.invoice_no || "—"}</Td>
                <Td>{record.items}</Td>
                <Td>{record.received_by}</Td>
                <Td>{statusBadge(record.status)}</Td>
                <Td>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <button type="button" onClick={() => void openDetail(record)}
                      className="text-[11px] font-medium text-[#4F46E5] hover:text-[#3730A3]">
                      Details
                    </button>
                    <button type="button" onClick={() => deleteRecord(record.id)}
                      className="text-[11px] text-red-500 hover:text-red-700">
                      Delete
                    </button>
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </Table>
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </Card>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-[15px] font-semibold text-[#0F172A]">Delivery Details</h2>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">View recorded delivery and purchase order items.</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="text-[#94A3B8] text-xl">×</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <DetailField label="Delivery #" value={detail.delivery_no}/>
                <DetailField label="Delivery Date" value={detail.delivery_date}/>
                <DetailField label="Supplier" value={detail.supplier || "—"}/>
                <DetailField label="Status" value={detail.status}/>
                <DetailField label="PO #" value={detail.po_no || "—"}/>
                <DetailField label="Invoice #" value={detail.invoice_no || "—"}/>
                <DetailField label="Received By" value={detail.received_by || "—"}/>
                <DetailField label="Number of Items" value={String(detail.items)}/>
              </div>

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <p className="text-[12px] font-semibold text-[#374151]">Items</p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">Items are loaded from the linked purchase order.</p>
                </div>
                {detailLoading ? (
                  <div className="p-6 text-center text-[12px] text-[#64748B]">Loading items...</div>
                ) : detailItems.length===0 ? (
                  <div className="p-6 text-center text-[12px] text-[#94A3B8]">No purchase order item details found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-white">
                        <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                          <th className="px-4 py-2 text-left font-medium w-12">#</th>
                          <th className="px-4 py-2 text-left font-medium">Product</th>
                          <th className="px-4 py-2 text-left font-medium">SKU</th>
                          <th className="px-4 py-2 text-right font-medium">Ordered</th>
                          <th className="px-4 py-2 text-right font-medium">Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailItems.map((item,index)=>(
                          <tr key={item.id || `${item.product_id}-${index}`} className="border-b border-[#F1F5F9] last:border-0">
                            <td className="px-4 py-2.5 text-[#94A3B8]">{index+1}</td>
                            <td className="px-4 py-2.5 font-medium text-[#0F172A]">{item.product_name}</td>
                            <td className="px-4 py-2.5 text-[#64748B]">{item.sku || "—"}</td>
                            <td className="px-4 py-2.5 text-right text-[#0F172A]">{item.quantity}</td>
                            <td className="px-4 py-2.5 text-right text-[#0F172A]">{item.received_quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {detail.notes && (
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-[10px] font-medium text-[#64748B] mb-1">Notes</p>
                  <p className="text-[12px] text-[#334155] whitespace-pre-wrap">{detail.notes}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-[#E2E8F0] flex justify-end shrink-0">
              <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-[#0F172A]">Record Delivery</h2>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">
                  Record only — this does not change inventory.
                </p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="text-[#94A3B8] text-xl">×</button>
            </div>

            {error && <div className="px-5 pt-4"><div role="alert" className="max-h-28 overflow-y-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700"><div className="font-semibold">Unable to save delivery</div><div className="mt-0.5 break-words">{error}</div></div></div>}

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Delivery Date">
                  <input type="date" value={form.delivery_date}
                    onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className="input" />
                </Field>
                <Field label="Number of Items">
                  <input type="number" min="0" value={form.items}
                    readOnly={!!form.po_no.trim()}
                    onChange={(e) => {
                      if (!form.po_no.trim()) setForm({ ...form, items: e.target.value });
                    }}
                    className={`input ${form.po_no.trim() ? "bg-[#F8FAFC] text-[#64748B]" : ""}`}
                  />
                  {form.po_no.trim() && (
                    <div className="mt-1 text-[10px] text-[#64748B]">Automatically counted from purchase order items.</div>
                  )}
                </Field>
                <Field label="Supplier *">
                  <select value={form.supplier_id} onChange={(e)=>{const id=e.target.value;const s=suppliers.find(x=>String(x.id)===id);setForm({...form,supplier_id:id,supplier_name:s?.name??""});setPoMessage("");if(form.po_no.trim()&&id)void validatePO(form.po_no,id)}} className="input">
                    <option value="">{suppliers.length?"Select supplier":"Loading suppliers..."}</option>
                    {suppliers.map(s=><option key={s.id} value={String(s.id)}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Received By *">
                  <input value={form.received_by} placeholder="Name of receiver"
                    onChange={(e) => setForm({ ...form, received_by: e.target.value })} className="input" />
                </Field>
                <Field label="PO Number">
                  <input value={form.po_no} placeholder="Purchase order number" onChange={(e)=>{setForm({...form,po_no:e.target.value});setPoMessage("")}} onBlur={()=>void validatePO(form.po_no,form.supplier_id)} className="input" />
                  {checkingPO&&<div className="mt-1 text-[10px] text-[#64748B]">Checking PO number...</div>}
                  {poMessage&&<div className={`mt-1 text-[10px] ${poMessage.toLowerCase().includes("valid and has not been recorded")?"text-emerald-600":"text-red-600"}`}>{poMessage}</div>}
                </Field>
                <Field label="Invoice Number">
                  <input value={form.invoice_no} placeholder="Supplier invoice number"
                    onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} className="input" />
                </Field>
              </div>

              {form.po_no.trim() && (
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-[#374151]">Purchase Order Items</p>
                      <span className="text-[10px] text-[#64748B]">{poLoading ? "Loading..." : `${poItems.length} line${poItems.length===1?"":"s"}`}</span>
                    </div>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">Items are automatically loaded from purchase_orders and purchase_order_items.</p>
                  </div>
                  {poItems.length===0 ? (
                    <div className="px-4 py-5 text-center text-[11px] text-[#94A3B8]">{poLoading ? "Loading purchase order items..." : "No purchase order items loaded."}</div>
                  ) : (
                    <div className="max-h-44 overflow-y-auto">
                      {poItems.map((item,index)=>(
                        <div key={item.id || `${item.product_id}-${index}`} className="grid grid-cols-[28px_1fr_auto] gap-2 px-4 py-2.5 border-b border-[#F1F5F9] last:border-0">
                          <span className="text-[10px] text-[#94A3B8] pt-0.5">{index+1}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-[#0F172A] truncate">{item.product_name}</p>
                            <p className="text-[10px] text-[#94A3B8]">{item.sku || "No SKU"}</p>
                          </div>
                          <div className="text-right text-[11px] text-[#334155]"><div>Qty {item.quantity}</div><div className="text-[10px] text-[#94A3B8]">Received {item.received_quantity}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Field label="Status">
                <select value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as DeliveryStatus })} className="input">
                  <option value="received">Received</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>

              <Field label="Notes">
                <textarea value={form.notes} rows={3}
                  placeholder="Damaged items, shortages, remarks, etc."
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input resize-none py-2" />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button variant="primary"
                  onClick={saveRecord}
                  disabled={saving||checkingPO||!form.supplier_id||!form.received_by.trim()||(form.po_no.trim()!==""&&!!poMessage&&!poMessage.toLowerCase().includes("valid and has not been recorded"))}>
                  {saving?"Saving...":"Save Delivery"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.input{width:100%;height:36px;padding:0 12px;font-size:13px;border:1px solid #E2E8F0;border-radius:8px;outline:none}.input:focus{border-color:#4F46E5}`}</style>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
      <p className="text-[9px] font-medium text-[#94A3B8] uppercase tracking-wide">{label}</p>
      <p className="text-[11px] font-medium text-[#0F172A] mt-0.5 truncate">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-[#475569] block mb-1">{label}</span>
      {children}
    </label>
  );
}
