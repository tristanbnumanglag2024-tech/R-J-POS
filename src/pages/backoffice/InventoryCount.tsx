import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Modal,
  Pagination,
  Table,
  Tr,
  Td,
} from "../../components/ui";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

type Store = {
  id: number;
  store_name: string;
  branch_name?: string | null;
  status?: string | null;
};

type Product = {
  id: number;
  name: string;
  sku: string | null;
  stock: number;
  cost: number;
};

type CountStatus = "draft" | "in_progress" | "completed";

type InventoryCount = {
  id: number;
  count_no: string;
  store_id: number;
  store_name?: string | null;
  branch_name?: string | null;
  type: "partial" | "full";
  status: CountStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  completed_at?: string | null;
  item_count?: number;
  total_difference?: number;
  total_cost_difference?: number;
};

type CountItem = {
  product_id: number;
  name: string;
  sku: string | null;
  expected_stock: number;
  counted_stock: string;
  cost: number;
};

type InventoryCountProps = {
  activeStoreId?: number | null;
};

function fmtQty(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function money(value: number) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusBadge(status: CountStatus) {
  if (status === "completed") return <Badge variant="success">Completed</Badge>;
  if (status === "in_progress") return <Badge variant="info">In Progress</Badge>;
  return <Badge variant="neutral">Draft</Badge>;
}

export default function InventoryCount({
  activeStoreId = null,
}: InventoryCountProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(
    activeStoreId
  );

  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [countItems, setCountItems] = useState<CountItem[]>([]);

  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"all" | CountStatus>("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [selectedCount, setSelectedCount] = useState<InventoryCount | null>(null);
  const [countId, setCountId] = useState<number | null>(null);

  const [countType, setCountType] = useState<"partial" | "full">("partial");
  const [notes, setNotes] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStores = async () => {
    try {
      setLoadingStores(true);
      const response = await fetch(`${API_BASE}/stores/list.php`, {
        headers: { Accept: "application/json" },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load stores.");
      }

      const rows: Store[] = (Array.isArray(data.stores) ? data.stores : [])
        .filter(
          (s: any) =>
            !s.status || String(s.status).toLowerCase() === "active"
        )
        .map((s: any) => ({
          id: Number(s.id),
          store_name: String(s.store_name ?? s.name ?? "Store"),
          branch_name: s.branch_name ?? null,
          status: s.status ?? "active",
        }))
        .filter((s: Store) => s.id > 0);

      setStores(rows);
      setSelectedStoreId((current) => {
        if (current && rows.some((s) => s.id === current)) return current;

        const saved = Number(localStorage.getItem("selected_store_id"));
        if (saved && rows.some((s) => s.id === saved)) return saved;

        return rows[0]?.id ?? null;
      });
    } catch (e) {
      setStores([]);
      setError(e instanceof Error ? e.message : "Unable to load stores.");
    } finally {
      setLoadingStores(false);
    }
  };

  const loadCounts = async (storeId = selectedStoreId) => {
    if (!storeId) {
      setCounts([]);
      return;
    }

    try {
      setLoadingCounts(true);
      const params = new URLSearchParams({ store_id: String(storeId) });

      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(
        `${API_BASE}/inventory/counts.php?${params.toString()}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load inventory counts.");
      }

      setCounts(
        Array.isArray(data.counts)
          ? data.counts
          : Array.isArray(data.items)
            ? data.items
            : []
      );
    } catch (e) {
      setCounts([]);
      setError(
        e instanceof Error ? e.message : "Unable to load inventory counts."
      );
    } finally {
      setLoadingCounts(false);
    }
  };

  const loadProducts = async (storeId = selectedStoreId) => {
    if (!storeId) {
      setProducts([]);
      return;
    }

    try {
      setLoadingProducts(true);
      const response = await fetch(
        `${API_BASE}/inventory/inventory.php?store_id=${encodeURIComponent(
          String(storeId)
        )}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load branch inventory.");
      }

      const rows = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.inventory)
          ? data.inventory
          : Array.isArray(data.products)
            ? data.products
            : [];

      setProducts(
        rows
          .map((item: any) => ({
            id: Number(item.product_id ?? item.id ?? 0),
            name: String(item.name ?? item.product_name ?? "").trim(),
            sku: item.sku ?? item.product_sku ?? null,
            stock: Number(item.stock ?? item.quantity ?? 0),
            cost: Number(item.cost ?? item.average_cost ?? 0),
          }))
          .filter((p: Product) => p.id > 0 && p.name)
      );
    } catch (e) {
      setProducts([]);
      setError(
        e instanceof Error ? e.message : "Unable to load branch inventory."
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    setPage(1);
    setError("");
    setSuccess("");

    if (!selectedStoreId) {
      setCounts([]);
      setProducts([]);
      return;
    }

    localStorage.setItem("selected_store_id", String(selectedStoreId));

    Promise.all([
      loadCounts(selectedStoreId),
      loadProducts(selectedStoreId),
    ]).catch(console.error);
  }, [selectedStoreId, statusFilter]);

  const selectedStore = stores.find(
    (store) => Number(store.id) === Number(selectedStoreId)
  );

  const filteredProducts = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return products;

    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.sku ?? "").toLowerCase().includes(q)
    );
  }, [products, itemSearch]);

  const totalDifference = useMemo(
    () =>
      countItems.reduce(
        (sum, item) =>
          sum +
          ((Number(item.counted_stock) || 0) - Number(item.expected_stock)),
        0
      ),
    [countItems]
  );

  const totalCostDifference = useMemo(
    () =>
      countItems.reduce(
        (sum, item) =>
          sum +
          ((Number(item.counted_stock) || 0) -
            Number(item.expected_stock)) *
            Number(item.cost || 0),
        0
      ),
    [countItems]
  );

  const openCreate = () => {
    setError("");
    setSuccess("");
    setCountType("partial");
    setNotes("");
    setItemSearch("");
    setCountItems([]);
    setCountId(null);
    setShowCreateModal(true);
  };

  const addProduct = (product: Product) => {
    setCountItems((current) =>
      current.some((item) => item.product_id === product.id)
        ? current
        : [
            ...current,
            {
              product_id: product.id,
              name: product.name,
              sku: product.sku,
              expected_stock: product.stock,
              counted_stock: "",
              cost: product.cost,
            },
          ]
    );
  };

  const removeItem = (productId: number) => {
    setCountItems((current) =>
      current.filter((item) => item.product_id !== productId)
    );
  };

  const updateCountedStock = (productId: number, value: string) => {
    setCountItems((current) =>
      current.map((item) =>
        item.product_id === productId
          ? { ...item, counted_stock: value }
          : item
      )
    );
  };

  const saveNewCount = async (saveAndCount = false) => {
    if (!selectedStoreId) {
      setError("Please select a branch first.");
      return;
    }

    if (countType === "partial" && countItems.length === 0) {
      setError("Add at least one product to a partial count.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE}/inventory/count-create.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          store_id: selectedStoreId,
          type: countType,
          notes: notes.trim() || null,
          items:
            countType === "partial"
              ? countItems.map((item) => ({ product_id: item.product_id }))
              : [],
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create inventory count.");
      }

      const newId = Number(data.count?.id ?? data.id ?? 0);

      setShowCreateModal(false);
      await loadCounts(selectedStoreId);

      if (saveAndCount && newId > 0) {
        await openCount(newId);
      } else {
        setSuccess(data.message || "Inventory count created successfully.");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to create inventory count."
      );
    } finally {
      setSaving(false);
    }
  };

  const openCount = async (id: number) => {
    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/inventory/count.php?id=${encodeURIComponent(String(id))}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load inventory count.");
      }

      const count = data.count ?? data.data ?? null;
      const items = Array.isArray(data.items) ? data.items : [];

      setSelectedCount(count);
      setCountId(Number(count?.id ?? id));
      setCountItems(
        items.map((item: any) => ({
          product_id: Number(item.product_id),
          name: String(item.name ?? item.product_name ?? ""),
          sku: item.sku ?? null,
          expected_stock: Number(item.expected_stock ?? item.expected ?? 0),
          counted_stock:
            item.counted_stock === null || item.counted_stock === undefined
              ? ""
              : String(item.counted_stock),
          cost: Number(item.cost ?? item.average_cost ?? 0),
        }))
      );
      setShowCountModal(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load inventory count."
      );
    } finally {
      setSaving(false);
    }
  };

  const saveCount = async (complete = false) => {
    if (!countId) return;

    const incomplete = countItems.some(
      (item) =>
        item.counted_stock === "" ||
        !Number.isFinite(Number(item.counted_stock)) ||
        Number(item.counted_stock) < 0
    );

    if (incomplete) {
      setError("Enter a counted quantity for every item before saving.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE}/inventory/count-save.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          count_id: countId,
          complete,
          items: countItems.map((item) => ({
            product_id: item.product_id,
            counted_stock: Number(item.counted_stock),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save inventory count.");
      }

      setShowCountModal(false);
      setSelectedCount(null);
      await loadCounts(selectedStoreId);

      setSuccess(
        data.message ||
          (complete
            ? "Inventory count completed successfully."
            : "Inventory count saved successfully.")
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save inventory count."
      );
    } finally {
      setSaving(false);
    }
  };

  const pagedCounts = counts.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  const countsToday = counts.filter((c) => {
    const d = new Date(c.created_at);
    const now = new Date();
    return (
      !Number.isNaN(d.getTime()) &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }).length;

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[#0F172A]">
            Inventory Counts
          </h1>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Count physical stock and reconcile differences by branch.
          </p>
        </div>

        <Button variant="primary" onClick={openCreate}>
          + New Inventory Count
        </Button>
      </div>

      {(error || success) && (
        <div
          className={`rounded-lg border px-3 py-2 text-[12px] ${
            error
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {error || success}
        </div>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-[#475569] block mb-1">
              Branch
            </label>
            <select
              value={selectedStoreId ? String(selectedStoreId) : ""}
              disabled={loadingStores}
              onChange={(e) =>
                setSelectedStoreId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[13px] focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="">
                {loadingStores ? "Loading branches..." : "Select branch"}
              </option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.branch_name || store.store_name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-48">
            <label className="text-[11px] font-medium text-[#475569] block mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | CountStatus)
              }
              className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[13px] focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {selectedStore && (
          <p className="text-[10px] text-[#94A3B8] mt-2">
            Inventory counts affect{" "}
            <span className="font-medium text-[#64748B]">
              {selectedStore.branch_name || selectedStore.store_name}
            </span>{" "}
            only.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="px-5 py-4">
          <p className="text-[11px] text-[#64748B] mb-1">Counts Today</p>
          <p className="text-[18px] font-bold text-[#4F46E5]">{countsToday}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-[11px] text-[#64748B] mb-1">Total Counts</p>
          <p className="text-[18px] font-bold text-[#0F172A]">{counts.length}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-[11px] text-[#64748B] mb-1">Completed</p>
          <p className="text-[18px] font-bold text-emerald-600">
            {counts.filter((c) => c.status === "completed").length}
          </p>
        </Card>
      </div>

      <Card>
        <Table
          headers={[
            "Count #",
            "Date Created",
            "Date Completed",
            "Branch",
            "Type",
            "Status",
            "Items",
            "Difference",
            "",
          ]}
        >
          {loadingCounts ? (
            <Tr>
              <Td>
                <div className="py-10 text-center">
                  <div className="w-6 h-6 mx-auto border-2 border-[#E2E8F0] border-t-[#4F46E5] rounded-full animate-spin" />
                  <p className="text-[11px] text-[#94A3B8] mt-2">
                    Loading inventory counts...
                  </p>
                </div>
              </Td>
            </Tr>
          ) : pagedCounts.length === 0 ? (
            <Tr>
              <Td>
                <div className="py-10 text-center">
                  <p className="text-[13px] font-medium text-[#475569]">
                    No inventory counts yet
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Create a count to reconcile physical stock.
                  </p>
                </div>
              </Td>
            </Tr>
          ) : (
            pagedCounts.map((count) => (
              <Tr key={count.id}>
                <Td>
                  <span className="font-semibold text-[#0F172A]">
                    {count.count_no}
                  </span>
                </Td>
                <Td>
                  <span className="text-[11px] text-[#64748B]">
                    {count.created_at}
                  </span>
                </Td>
                <Td>
                  <span className="text-[11px] text-[#64748B]">
                    {count.completed_at || "—"}
                  </span>
                </Td>
                <Td>
                  <span className="text-[11px] text-[#475569]">
                    {count.branch_name ||
                      count.store_name ||
                      `Store #${count.store_id}`}
                  </span>
                </Td>
                <Td>
                  <Badge variant="neutral">
                    {count.type === "full" ? "Full" : "Partial"}
                  </Badge>
                </Td>
                <Td>{statusBadge(count.status)}</Td>
                <Td>{fmtQty(Number(count.item_count ?? 0))}</Td>
                <Td>
                  <span
                    className={
                      Number(count.total_difference ?? 0) < 0
                        ? "text-red-600 font-semibold"
                        : Number(count.total_difference ?? 0) > 0
                          ? "text-emerald-600 font-semibold"
                          : "text-[#64748B]"
                    }
                  >
                    {fmtQty(Number(count.total_difference ?? 0))}
                  </span>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => openCount(count.id)}
                    className="text-[12px] text-[#4F46E5] font-medium hover:text-[#3730A3]"
                  >
                    {count.status === "completed" ? "Details" : "Count"}
                  </button>
                </Td>
              </Tr>
            ))
          )}
        </Table>

        <Pagination
          page={page}
          total={counts.length}
          perPage={PER_PAGE}
          onChange={setPage}
        />
      </Card>

      {showCreateModal && (
        <Modal
          title="New Inventory Count"
          onClose={() => {
            if (!saving) setShowCreateModal(false);
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-medium text-[#374151] block mb-1">
                Branch
              </label>
              <div className="w-full h-9 px-3 flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] text-[#475569]">
                {selectedStore?.branch_name ||
                  selectedStore?.store_name ||
                  "Select branch"}
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#374151] block mb-2">
                Type
              </label>
              <div className="flex gap-3">
                {(["partial", "full"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCountType(type)}
                    className={`flex-1 h-10 rounded-lg border text-[12px] font-medium ${
                      countType === type
                        ? "bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5]"
                        : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {type === "partial" ? "Partial" : "Full"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#374151] block mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                disabled={saving}
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes..."
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E2E8F0] resize-none focus:outline-none focus:border-[#4F46E5]"
              />
              <div className="text-right text-[10px] text-[#94A3B8] mt-1">
                {notes.length} / 500
              </div>
            </div>

            {countType === "partial" ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-[#0F172A]">
                    Items
                  </p>
                  <span className="text-[10px] text-[#94A3B8]">
                    {countItems.length} selected
                  </span>
                </div>

                <input
                  value={itemSearch}
                  disabled={saving || loadingProducts}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search product or SKU..."
                  className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
                />

                <div className="mt-2 max-h-44 overflow-y-auto border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0]">
                  {filteredProducts.length === 0 ? (
                    <p className="p-4 text-[11px] text-[#94A3B8] text-center">
                      {loadingProducts ? "Loading products..." : "No products found."}
                    </p>
                  ) : (
                    filteredProducts.map((product) => {
                      const selected = countItems.some(
                        (item) => item.product_id === product.id
                      );

                      return (
                        <button
                          key={product.id}
                          type="button"
                          disabled={selected || saving}
                          onClick={() => addProduct(product)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#F8FAFC] disabled:opacity-50"
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-[#0F172A] truncate">
                              {product.name}
                            </p>
                            <p className="text-[10px] text-[#94A3B8]">
                              {product.sku || "No SKU"} · Stock {fmtQty(product.stock)}
                            </p>
                          </div>
                          <span className="text-[11px] text-[#4F46E5]">
                            {selected ? "Added" : "Add"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {countItems.length > 0 && (
                  <div className="mt-3 border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0]">
                    {countItems.map((item) => (
                      <div
                        key={item.product_id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#0F172A] truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-[#94A3B8]">
                            Expected {fmtQty(item.expected_stock)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => removeItem(item.product_id)}
                          className="text-[11px] text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <p className="text-[12px] font-medium text-[#0F172A]">Full Count</p>
                <p className="text-[11px] text-[#64748B] mt-1">
                  All active products in the selected branch will be included.
                </p>
              </div>
            )}

            {(error || success) && (
              <div
                role={error ? "alert" : "status"}
                className={`max-h-28 overflow-y-auto rounded-lg border px-3 py-2 text-[12px] leading-5 ${
                  error
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                <div className="font-semibold">
                  {error ? "Unable to continue" : "Success"}
                </div>
                <div className="mt-0.5 break-words">
                  {error || success}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="primary"
                onClick={() => saveNewCount(false)}
                disabled={saving || !selectedStoreId}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="primary"
                onClick={() => saveNewCount(true)}
                disabled={saving || !selectedStoreId}
              >
                {saving ? "Saving..." : "Save & Count"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showCountModal && (
        <Modal
          title={
            selectedCount?.status === "completed"
              ? `Inventory Count ${selectedCount.count_no || ""}`
              : `Count Stock ${selectedCount?.count_no || ""}`
          }
          onClose={() => {
            if (!saving) setShowCountModal(false);
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <p className="text-[10px] text-[#94A3B8]">Expected</p>
                <p className="text-[18px] font-bold text-[#0F172A]">
                  {fmtQty(
                    countItems.reduce(
                      (sum, item) => sum + Number(item.expected_stock || 0),
                      0
                    )
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <p className="text-[10px] text-[#94A3B8]">Difference</p>
                <p
                  className={`text-[18px] font-bold ${
                    totalDifference < 0
                      ? "text-red-600"
                      : totalDifference > 0
                        ? "text-emerald-600"
                        : "text-[#0F172A]"
                  }`}
                >
                  {fmtQty(totalDifference)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
              <table className="w-full min-w-[680px] text-left">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    {["Item", "Expected", "Counted", "Difference", "Cost Difference"].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-3 py-2 text-[10px] text-[#64748B]"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {countItems.map((item) => {
                    const counted = Number(item.counted_stock);
                    const hasCount = item.counted_stock !== "";
                    const difference = hasCount
                      ? counted - Number(item.expected_stock)
                      : 0;
                    const costDifference = difference * Number(item.cost || 0);

                    return (
                      <tr
                        key={item.product_id}
                        className="border-b border-[#E2E8F0] last:border-b-0"
                      >
                        <td className="px-3 py-3">
                          <p className="text-[12px] font-medium text-[#0F172A]">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-[#94A3B8]">
                            {item.sku || "No SKU"}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-[12px] text-[#475569]">
                          {fmtQty(item.expected_stock)}
                        </td>
                        <td className="px-3 py-3">
                          {selectedCount?.status === "completed" ? (
                            <span className="text-[12px] font-semibold text-[#0F172A]">
                              {fmtQty(counted)}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.counted_stock}
                              disabled={saving}
                              onChange={(e) =>
                                updateCountedStock(
                                  item.product_id,
                                  e.target.value
                                )
                              }
                              className="w-24 h-8 px-2 text-[12px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
                            />
                          )}
                        </td>
                        <td
                          className={`px-3 py-3 text-[12px] font-semibold ${
                            difference < 0
                              ? "text-red-600"
                              : difference > 0
                                ? "text-emerald-600"
                                : "text-[#64748B]"
                          }`}
                        >
                          {hasCount ? fmtQty(difference) : "—"}
                        </td>
                        <td className="px-3 py-3 text-[12px]">
                          {hasCount ? money(costDifference) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div>
                <p className="text-[10px] text-[#94A3B8]">Total Cost Difference</p>
                <p className="text-[15px] font-bold text-[#0F172A]">
                  {money(totalCostDifference)}
                </p>
              </div>
              {selectedCount && statusBadge(selectedCount.status)}
            </div>

            {(error || success) && (
              <div
                role={error ? "alert" : "status"}
                className={`max-h-28 overflow-y-auto rounded-lg border px-3 py-2 text-[12px] leading-5 ${
                  error
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                <div className="font-semibold">
                  {error ? "Unable to continue" : "Success"}
                </div>
                <div className="mt-0.5 break-words">
                  {error || success}
                </div>
              </div>
            )}

            {selectedCount?.status !== "completed" && (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => saveCount(false)}
                  disabled={saving || countItems.length === 0}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => saveCount(true)}
                  disabled={saving || countItems.length === 0}
                >
                  {saving ? "Completing..." : "Complete"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowCountModal(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
