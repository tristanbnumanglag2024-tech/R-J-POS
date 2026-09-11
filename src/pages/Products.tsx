
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Card,
  Badge,
  Button,
  SearchBar,
  Select,
  Table,
  Tr,
  Td,
  Pagination,
} from "../components/ui";

interface ProductsProps {
  onAddProduct: () => void;
  // Kept optional for parent compatibility. Products no longer uses it
  // for store selection; this page is always centralized across all stores.
  activeStoreId?: number | null;
}

type AverageCostMap = Record<string, number>;

interface Store {
  id: number;
  store_name: string;
  branch_name?: string;
  status?: string;
}
interface Category {
  id: number;
  store_id?: number;
  name: string;
  description?: string;
  status: string;
}

interface ProductVariant {
  id?: number;
  store_id?: number;
  product_id?: number;
  option_name: string;
  option_value: string;
}

interface Supplier {
  id: number;
  name: string;
  store_id?: number;
  status?: string;
}

interface Product {
  id: number;
  store_id: number;
  category_id: number | null;
  supplier_id: number | null;

  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;

  price: number;
  cost: number;

  track_inventory: number | boolean;
  stock: number;
  low_stock_threshold: number;

  product_image: string | null;
  barcode_image: string | null;

  status: "active" | "inactive" | string;

  created_at: string;
  updated_at: string;

  category_name?: string;
  supplier_name?: string;

  variants?: ProductVariant[];
}

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

const PER_PAGE = 8;

function fmt(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);

  return "₱" + numberValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getInitials(name: string) {
  if (!name) return "PR";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function getCategoryName(
  product: Product,
  categories: Category[]
) {
  // Prefer the category name returned directly by products/list.php.
  if (product.category_name?.trim()) {
    return product.category_name.trim();
  }

  // Otherwise resolve category_id against the categories endpoint.
  if (product.category_id !== null && product.category_id !== undefined) {
    const categoryId = Number(product.category_id);
    const storeId = Number(product.store_id);

    const category = categories.find(
      (item) => Number(item.id) === categoryId
    );

    if (category?.name?.trim()) {
      return category.name.trim();
    }

    // Extra fallback in case an older categories API omits store_id.
    const categoryById = categories.find(
      (item) => Number(item.id) === categoryId
    );

    if (categoryById?.name?.trim()) {
      return categoryById.name.trim();
    }
  }

  return "—";
}

export default function Products({
  onAddProduct,
  activeStoreId,
}: ProductsProps) {
  /*
  |--------------------------------------------------------------------------
  | DATA
  |--------------------------------------------------------------------------
  */

  const [products, setProducts] = useState<Product[]>([]);

  // Display-only weighted average inventory cost.
  // Includes received purchase orders + received store transfers.
  // Never writes the calculated value into products.cost.
  const [averageCosts, setAverageCosts] =
    useState<AverageCostMap>({});

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  /*
  |--------------------------------------------------------------------------
  | ALL STORE VIEW
  |--------------------------------------------------------------------------
  */

  const [allStoreProducts, setAllStoreProducts] =
    useState<Product[]>([]);

  // Average cost per product per store for the All Stores view.
  // Includes purchase receipts and transfer-in cost via the updated API.
  const [
    allStoreAverageCosts,
    setAllStoreAverageCosts,
  ] = useState<Record<number, AverageCostMap>>({});

  const [allStores, setAllStores] =
    useState<Store[]>([]);

  const [loadingAllStores, setLoadingAllStores] =
    useState(false);

  const [showExportModal, setShowExportModal] =
    useState(false);

  const [exportLoading, setExportLoading] =
    useState(false);

  const [showImportModal, setShowImportModal] =
    useState(false);

  const [importScope, setImportScope] =
    useState<"all">("all");

  const [importFile, setImportFile] =
    useState<File | null>(null);

  const [importLoading, setImportLoading] =
    useState(false);

  const [importResult, setImportResult] =
    useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | FILTERS
  |--------------------------------------------------------------------------
  */

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // In-page branch selector. The topbar store selector is no longer used.
  // "all" is the centralized All Stores view; otherwise this is a store ID.
  const [tableScope, setTableScope] =
    useState<"all" | string>("all");

  const selectedStoreId =
    tableScope === "all" ? null : Number(tableScope);

  const [page, setPage] = useState(1);

  /*
  |--------------------------------------------------------------------------
  | MENU
  |--------------------------------------------------------------------------
  */

  const [menuId, setMenuId] =
    useState<number | null>(null);

  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [globalStatusUpdating, setGlobalStatusUpdating] =
    useState<string | null>(null);

  /*
  |--------------------------------------------------------------------------
  | UI STATES
  |--------------------------------------------------------------------------
  */

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [viewProduct, setViewProduct] =
    useState<Product | null>(null);

  const [editProduct, setEditProduct] =
    useState<Product | null>(null);

  const [editMode, setEditMode] =
    useState<"store" | "all">("store");

  // All Stores: checked stores have an active product_stores association.
  // Unchecked stores remain associated but are marked inactive.
  const [selectedEditStoreIds, setSelectedEditStoreIds] =
    useState<number[]>([]);

  const [savingEdit, setSavingEdit] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | LOAD PRODUCTS
  |--------------------------------------------------------------------------
  */

  const fetchProducts = async (
    currentStoreId: number
  ) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/products/list.php?store_id=${currentStoreId}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load products."
        );
      }

      const storeProducts = Array.isArray(
        data.products
      )
        ? data.products.filter(
            (product: Product) =>
              Number(product.store_id) ===
              Number(currentStoreId)
          )
        : [];

      setProducts(storeProducts);
    } catch (err) {
      console.error(
        "Product fetch error:",
        err
      );

      setProducts([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD DISPLAY-ONLY AVERAGE PURCHASE COST
  |--------------------------------------------------------------------------
  | Formula:
  | SUM(received_quantity * unit_cost) /
  | SUM(received_quantity)
  |
  | IMPORTANT:
  | This does NOT update products.cost in MySQL.
  */

  const fetchAverageCostsForStore = async (
    currentStoreId: number
  ): Promise<AverageCostMap> => {
    const response = await fetch(
      `${API_BASE}/inventory/purchase-average-cost.php?store_id=${encodeURIComponent(
        String(currentStoreId)
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const text = await response.text();
    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Average cost API did not return valid JSON:\n${text.substring(
          0,
          500
        )}`
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          "Failed to load average purchase costs."
      );
    }

    return data.average_costs &&
      typeof data.average_costs === "object"
      ? (data.average_costs as AverageCostMap)
      : {};
  };

  const fetchAverageCosts = async (
    currentStoreId: number
  ) => {
    try {
      const costs =
        await fetchAverageCostsForStore(
          currentStoreId
        );

      setAverageCosts(costs);
    } catch (err) {
      console.warn(
        "Average purchase/transfer cost could not be loaded. Falling back to products.cost:",
        err
      );

      setAverageCosts({});
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD CATEGORIES
  |--------------------------------------------------------------------------
  */

  const fetchCategories = async (
    currentStoreId: number
  ) => {
    try {
      setLoadingCategories(true);

      const response = await fetch(
        `${API_BASE}/categories/list.php`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load categories."
        );
      }

      const storeCategories =
        Array.isArray(data.categories)
          ? data.categories.filter(
              (category: Category) => category.status === "active"
            )
          : [];

      setCategories(storeCategories);
    } catch (err) {
      console.error(
        "Category fetch error:",
        err
      );

      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD SUPPLIERS
  |--------------------------------------------------------------------------
  */

  const fetchSuppliers = async (currentStoreId?: number) => {
    const parseSuppliers = (data: any): Supplier[] => {
      const rows = Array.isArray(data?.suppliers)
        ? data.suppliers
        : Array.isArray(data?.data?.suppliers)
        ? data.data.suppliers
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.rows)
        ? data.rows
        : [];

      return rows
        .map((supplier: any) => ({
          id: Number(supplier.id),
          name: String(
            supplier.name ??
            supplier.supplier_name ??
            supplier.company_name ??
            `Supplier #${supplier.id}`
          ).trim(),
          store_id:
            supplier.store_id !== undefined &&
            supplier.store_id !== null &&
            supplier.store_id !== ""
              ? Number(supplier.store_id)
              : undefined,
          status: supplier.status,
        }))
        .filter(
          (supplier: Supplier) =>
            Number.isInteger(supplier.id) &&
            supplier.id > 0 &&
            supplier.name !== "" &&
            String(supplier.status ?? "active").toLowerCase() !== "inactive"
        );
    };

    try {
      // Suppliers are a product-master field, so load the global supplier list first.
      // This avoids restricting the Edit Product dropdown to the currently selected branch.
      const globalResponse = await fetch(
        `${API_BASE}/suppliers/list.php`,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (globalResponse.ok) {
        const globalData = await globalResponse.json();
        if (globalData?.success) {
          const globalSuppliers = parseSuppliers(globalData);
          if (globalSuppliers.length > 0) {
            setSuppliers(globalSuppliers);
            return;
          }
        }
      }

      // Compatibility fallback for an existing branch-scoped supplier endpoint.
      if (currentStoreId && currentStoreId > 0) {
        const fallbackResponse = await fetch(
          `${API_BASE}/suppliers/list.php?store_id=${encodeURIComponent(
            String(currentStoreId)
          )}`,
          {
            headers: { Accept: "application/json" },
          }
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData?.success) {
            setSuppliers(parseSuppliers(fallbackData));
            return;
          }
        }
      }

      setSuppliers([]);
    } catch (err) {
      console.warn("Supplier fetch error:", err);
      setSuppliers([]);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD ALL STORES + ALL PRODUCTS
  |--------------------------------------------------------------------------
  | Display-only view.
  | No database rows are created or modified.
  |
  | Loads the existing product records from every store for the main table
  | All Stores scope. No product rows are created or merged here.
  */

  const openAllStores = async (): Promise<{ stores: Store[]; products: Product[] }> => {
    try {
      setLoadingAllStores(true);

      const storesResponse = await fetch(
        `${API_BASE}/stores/list.php`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const storesData =
        await storesResponse.json();

      if (
        !storesResponse.ok ||
        !storesData.success
      ) {
        throw new Error(
          storesData.message ||
            "Failed to load stores."
        );
      }

      const storeRows: Store[] =
        Array.isArray(storesData.stores)
          ? storesData.stores
              .map((store: any) => ({
                id: Number(store.id),
                store_name:
                  store.store_name ||
                  `Store #${store.id}`,
                branch_name:
                  store.branch_name ||
                  "",
                status:
                  store.status ||
                  "active",
              }))
              .filter(
                (store: Store) =>
                  Number.isInteger(store.id) &&
                  store.id > 0
              )
          : [];

      setAllStores(storeRows);

      const productResults =
        await Promise.all(
          storeRows.map(async (store) => {
            const response =
              await fetch(
                `${API_BASE}/products/list.php?store_id=${encodeURIComponent(
                  String(store.id)
                )}`,
                {
                  method: "GET",
                  headers: {
                    Accept:
                      "application/json",
                  },
                }
              );

            const data =
              await response.json();

            if (
              !response.ok ||
              !data.success
            ) {
              throw new Error(
                data.message ||
                  `Failed to load products for ${store.store_name}.`
              );
            }

            const rows =
              Array.isArray(data.products)
                ? data.products
                : [];

            return rows.filter(
              (product: Product) =>
                Number(product.store_id) ===
                Number(store.id)
            );
          })
        );

      const flattenedProducts =
        productResults.flat();

      setAllStoreProducts(
        flattenedProducts
      );

      // Load the updated average cost for EACH store.
      // The API includes purchase receipts + received transfers.
      const costEntries = await Promise.all(
        storeRows.map(async (store) => {
          try {
            const costs =
              await fetchAverageCostsForStore(
                Number(store.id)
              );

            return [
              Number(store.id),
              costs,
            ] as const;
          } catch (err) {
            console.warn(
              `Average cost could not be loaded for store ${store.id}:`,
              err
            );

            return [
              Number(store.id),
              {} as AverageCostMap,
            ] as const;
          }
        })
      );

      setAllStoreAverageCosts(
        Object.fromEntries(costEntries)
      );

      return {
        stores: storeRows,
        products: flattenedProducts,
      };
    } catch (err) {
      console.error(
        "Load all-store products error:",
        err
      );

      setAllStoreProducts([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load products across stores."
      );

      return {
        stores: [],
        products: [],
      };
    } finally {
      setLoadingAllStores(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | EXPORT HELPERS
  |--------------------------------------------------------------------------
  */

  const csvEscape = (value: unknown) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const downloadCsv = (
    filename: string,
    headers: string[],
    rows: unknown[][]
  ) => {
    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) =>
        row.map(csvEscape).join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportCurrentStore = () => {
    if (!selectedStoreId) {
      setError("Please select a branch first.");
      return;
    }

    const rows = products.map((product) => {
      const averageCost =
        averageCosts[String(product.id)] !== undefined
          ? Number(averageCosts[String(product.id)])
          : Number(product.cost || 0);

      return [
        product.name,
        product.sku || "",
        product.barcode || "",
        getCategoryName(product, categories),
        Number(product.price || 0).toFixed(2),
        averageCost.toFixed(2),
        Number(product.stock || 0),
        product.status,
        (Number(product.stock || 0) * averageCost).toFixed(2),
      ];
    });

    downloadCsv(
      `products-store-${selectedStoreId}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Product",
        "SKU",
        "Barcode",
        "Category",
        "Price",
        "Cost (Average)",
        "Stock",
        "Status",
        "Inventory Value",
      ],
      rows
    );

    setShowExportModal(false);
    setSuccess("Current store products exported successfully.");
  };

  const exportAllStores = async () => {
    if (exportLoading) return;

    try {
      setExportLoading(true);
      setError("");

      let stores = allStores;
      let storeProducts = allStoreProducts;

      if (stores.length === 0) {
        const snapshot = await openAllStores();
        stores = snapshot.stores;
        storeProducts = snapshot.products;
      }

      if (stores.length === 0) {
        throw new Error("No stores were found.");
      }

      const costMaps = await Promise.all(
        stores.map(async (store) => {
          try {
            const response = await fetch(
              `${API_BASE}/inventory/purchase-average-cost.php?store_id=${encodeURIComponent(String(store.id))}`,
              {
                headers: {
                  Accept: "application/json",
                },
              }
            );

            const data = await response.json();
            const costs =
              data?.success &&
              data?.average_costs &&
              typeof data.average_costs === "object"
                ? (data.average_costs as AverageCostMap)
                : {};

            return [store.id, costs] as const;
          } catch {
            return [store.id, {} as AverageCostMap] as const;
          }
        })
      );

      const averageCostsByStore = new Map<number, AverageCostMap>(
        costMaps
      );

      const rows = storeProducts.map((product) => {
        const store = stores.find(
          (item) =>
            Number(item.id) === Number(product.store_id)
        );

        const storeAverageCosts =
          averageCostsByStore.get(
            Number(product.store_id)
          ) || {};

        const averageCost =
          storeAverageCosts[String(product.id)] !== undefined
            ? Number(
                storeAverageCosts[String(product.id)]
              )
            : Number(product.cost || 0);

        return [
          store?.store_name || `Store #${product.store_id}`,
          store?.branch_name || "",
          product.name,
          product.sku || "",
          product.barcode || "",
          getCategoryName(product, categories),
          Number(product.price || 0).toFixed(2),
          averageCost.toFixed(2),
          Number(product.stock || 0),
          product.status,
          (Number(product.stock || 0) * averageCost).toFixed(2),
        ];
      });

      downloadCsv(
        `products-all-stores-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Store",
          "Branch",
          "Product",
          "SKU",
          "Barcode",
          "Category",
          "Price",
          "Cost (Average)",
          "Stock",
          "Status",
          "Inventory Value",
        ],
        rows
      );

      setShowExportModal(false);
      setSuccess("All store products exported successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to export products."
      );
    } finally {
      setExportLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | IMPORT CSV
  |--------------------------------------------------------------------------
  |
  | The import is product-catalog only.
  |
  | Current Store:
  |   - Imports into the selected store.
  |   - Keeps CSV stock for newly created products.
  |
  | All Stores:
  |   - Checks every active store.
  |   - Does NOT create a duplicate when the same product name already
  |     exists in that store.
  |   - Uses the original existing SKU when a product already exists in
  |     another store.
  |   - New products start at 0 stock so importing a catalog never moves
  |     physical inventory between stores.
  |
  | SKU values coming from Excel/CSV are normalized to exactly 8 digits.
  | Example: 7 -> 00000007, 123 -> 00000123.
  |--------------------------------------------------------------------------
  */

  const normalizeImportedSku = (value: unknown): string => {
    let raw = String(value ?? "")
      .trim()
      .replace(/^'/, "");

    if (!raw) {
      return "";
    }

    // Excel may give us 7 instead of 00000007.
    if (/^\d+$/.test(raw)) {
      if (raw.length > 8) {
        throw new Error(
          `SKU "${raw}" has more than 8 digits.`
        );
      }

      return raw.padStart(8, "0");
    }

    throw new Error(
      `SKU "${raw}" must contain only numbers.`
    );
  };

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (quoted) {
        if (ch === '"' && next === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          quoted = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }

    row.push(field.replace(/\r$/, ""));

    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }

    return rows;
  };

  const importProductsCsv = async () => {
    if (importLoading) return;

    if (!importFile) {
      setError("Please select a CSV file first.");
      return;
    }

    try {
      setImportLoading(true);
      setError("");
      setSuccess("");
      setImportResult(null);

      const text = await importFile.text();
      const rawRows = parseCsv(text);

      if (rawRows.length < 2) {
        throw new Error("The CSV file does not contain product rows.");
      }

      const headers = rawRows[0].map((header) =>
        header.trim().replace(/^\uFEFF/, "").toLowerCase()
      );

      const indexOf = (...names: string[]) => {
        for (const name of names) {
          const index = headers.indexOf(name.toLowerCase());
          if (index >= 0) return index;
        }
        return -1;
      };

      const nameIndex = indexOf("product", "product name", "name");
      const skuIndex = indexOf("sku");
      const barcodeIndex = indexOf("barcode");
      const categoryIndex = indexOf("category");
      const priceIndex = indexOf("price");
      const costIndex = indexOf("cost (average)", "cost", "average cost");
      const stockIndex = indexOf("stock", "on hand");
      const statusIndex = indexOf("status");

      if (nameIndex < 0) {
        throw new Error(
          "CSV must contain a Product column."
        );
      }

      const rows = rawRows
        .slice(1)
        .map((values, rowIndex) => {
          const get = (index: number) =>
            index >= 0 ? String(values[index] ?? "").trim() : "";

          const name = get(nameIndex);

          if (!name) return null;

          let sku = "";
          if (skuIndex >= 0) {
            sku = normalizeImportedSku(get(skuIndex));
          }

          const price = Number(
            get(priceIndex).replace(/,/g, "") || 0
          );

          const cost = Number(
            get(costIndex).replace(/,/g, "") || 0
          );

          const stock = Number(
            get(stockIndex).replace(/,/g, "") || 0
          );

          if (!Number.isFinite(price) || price < 0) {
            throw new Error(
              `Row ${rowIndex + 2}: invalid price for "${name}".`
            );
          }

          if (!Number.isFinite(cost) || cost < 0) {
            throw new Error(
              `Row ${rowIndex + 2}: invalid cost for "${name}".`
            );
          }

          if (!Number.isFinite(stock) || stock < 0) {
            throw new Error(
              `Row ${rowIndex + 2}: invalid stock for "${name}".`
            );
          }

          return {
            name,
            sku,
            barcode: get(barcodeIndex),
            category_name: get(categoryIndex),
            price,
            cost,
            stock,
            status: get(statusIndex) === "inactive"
              ? "inactive"
              : "active",
          };
        })
        .filter(
          (row): row is {
            name: string;
            sku: string;
            barcode: string;
            category_name: string;
            price: number;
            cost: number;
            stock: number;
            status: string;
          } => row !== null
        );

      if (rows.length === 0) {
        throw new Error("No valid product rows were found in the CSV.");
      }

      // Deduplicate the imported file itself by normalized product name.
      const uniqueRows = Array.from(
        new Map(
          rows.map((row) => [
            row.name.trim().toLowerCase(),
            row,
          ])
        ).values()
      );

      const response = await fetch(
        `${API_BASE}/products/import.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            store_id: null,
            scope: "all",
            products: uniqueRows,
          }),
        }
      );

      const responseText = await response.text();
      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Import API did not return valid JSON:\n${responseText.substring(0, 500)}`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to import products."
        );
      }

      setImportResult({
        created: Number(data.created || 0),
        skipped: Number(data.skipped || 0),
        errors: Array.isArray(data.errors)
          ? data.errors
          : [],
      });

      setSuccess(
        `Import completed: ${Number(data.created || 0)} created, ${Number(data.skipped || 0)} already existed.`
      );

      setShowImportModal(false);
      setImportFile(null);

      await refreshProducts();
    } catch (err) {
      console.error("Product import error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to import products."
      );
    } finally {
      setImportLoading(false);
    }
  };

  const closeImportModal = () => {
    if (importLoading) return;
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
  };


  /*
  |--------------------------------------------------------------------------
  | STORE CHANGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setSearch("");
    setCatFilter("");
    setStatusFilter("");
    setPage(1);
    setMenuId(null);
    setViewProduct(null);
    setEditProduct(null);
    setEditMode("store");
    setSelectedEditStoreIds([]);
    setError("");
    setSuccess("");

    // Always load every active store. The in-page selector controls the table.
    setTableScope("all");
    setAllStoreProducts([]);
    setAllStores([]);
    setAllStoreAverageCosts({});

    void openAllStores();
    void fetchCategories(0);
    void fetchSuppliers();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CENTRALIZED ALL-STORES TABLE
  |--------------------------------------------------------------------------
  |
  | One row per product name. Existing store associations are NEVER merged
  | into a new database row. We only calculate display values in memory.
  |
  | Stock:
  |   SUM(stock) across all stores.
  |
  | Average Cost:
  |   Weighted average of each store's existing average_cost using that
  |   store's stock as the weight.
  |
  |   SUM(store_average_cost * store_stock) / SUM(store_stock)
  |
  | If every store has zero stock, we fall back to the simple average of
  | available store average costs so the Cost column still displays.
  |--------------------------------------------------------------------------
  */
  const tableProducts = useMemo(() => {
    if (tableScope !== "all") {
      return allStoreProducts.filter(
        (product) => Number(product.store_id) === Number(selectedStoreId)
      );
    }

    // All Stores: one row per product name. Only stock is summed.
    // Cost is the stock-weighted average of the existing per-store average costs.
    const grouped = new Map<string, Product & { _totalStock: number; _costValue: number; _costSamples: number[] }>();

    for (const product of allStoreProducts) {
      const key = product.name.trim().toLowerCase();
      if (!key) continue;
      const stock = Math.max(0, Number(product.stock ?? 0));
      const storeCosts = allStoreAverageCosts[Number(product.store_id)] || {};
      const averageCost = storeCosts[String(product.id)] !== undefined
        ? Number(storeCosts[String(product.id)])
        : Number(product.cost || 0);
      const safeCost = Number.isFinite(averageCost) && averageCost >= 0 ? averageCost : 0;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, { ...product, stock, _totalStock: stock, _costValue: safeCost * stock, _costSamples: [safeCost] });
        continue;
      }

      existing._totalStock += stock;
      existing._costValue += safeCost * stock;
      existing._costSamples.push(safeCost);
      if (!existing.sku && product.sku) existing.sku = product.sku;
      if (!existing.barcode && product.barcode) existing.barcode = product.barcode;
      if (!existing.category_name && product.category_name) existing.category_name = product.category_name;
      if (String(product.status).toLowerCase() === "active") existing.status = "active";
    }

    return Array.from(grouped.values()).map((product) => {
      const totalStock = product._totalStock;
      const averageCost = totalStock > 0
        ? product._costValue / totalStock
        : product._costSamples.length > 0
        ? product._costSamples.reduce((sum, value) => sum + value, 0) / product._costSamples.length
        : Number(product.cost || 0);
      return { ...product, stock: totalStock, cost: Number.isFinite(averageCost) ? averageCost : 0 };
    });
  }, [tableScope, selectedStoreId, allStoreProducts, allStoreAverageCosts]);

  const getDisplayAverageCost = (product: Product) => {
    if (tableScope === "all") return Number(product.cost || 0);
    const storeCosts = allStoreAverageCosts[Number(product.store_id)] || {};
    const value = storeCosts[String(product.id)];
    return value !== undefined ? Number(value) : Number(product.cost || 0);
  };

  const filtered = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return tableProducts.filter((product) => {
      const matchSearch =
        !searchValue ||
        product.name
          .toLowerCase()
          .includes(searchValue) ||
        String(product.sku ?? "")
          .toLowerCase()
          .includes(searchValue) ||
        String(product.barcode ?? "")
          .toLowerCase()
          .includes(searchValue);

      const matchCategory =
        !catFilter ||
        String(product.category_id) ===
          String(catFilter);

      const matchStatus =
        !statusFilter ||
        product.status === statusFilter;

      return (
        matchSearch &&
        matchCategory &&
        matchStatus
      );
    });
  }, [
    tableProducts,
    search,
    catFilter,
    statusFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filtered.length / PER_PAGE
    )
  );

  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const refreshProducts = async () => {
    await openAllStores();
    await fetchCategories(0);
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  const handleDelete = async (
    product: Product
  ) => {
    setMenuId(null);

    if (!selectedStoreId) {
      setError("Please select a branch first.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${product.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE}/products/delete.php`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: product.id,
            store_id: selectedStoreId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to delete product."
        );
      }

      setSuccess(
        "Product deleted successfully."
      );

      await refreshProducts();
    } catch (err) {
      console.error(
        "Delete product error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete product."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | ENABLE / DISABLE
  |--------------------------------------------------------------------------
  */

  const handleToggleStatus = async (
  product: Product
) => {
  setMenuId(null);

  if (!activeStoreId) {
    setError("No store selected.");
    return;
  }

  const productId = Number(product.id);
  const storeId = Number(selectedStoreId);

  if (!Number.isInteger(productId) || productId <= 0) {
    setError("Invalid product ID.");
    return;
  }

  if (
    Number(product.store_id) !== storeId
  ) {
    setError(
      "This product does not belong to the selected store."
    );
    return;
  }

  const newStatus =
    product.status === "active"
      ? "inactive"
      : "active";

  try {
    setError("");
    setSuccess("");

    const response = await fetch(
      `${API_BASE}/products/update.php`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          product_id: productId,
          store_id: storeId,
          status: newStatus,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          "Failed to update product status."
      );
    }

    setSuccess(
      `Product ${
        newStatus === "active"
          ? "enabled"
          : "disabled"
      } successfully.`
    );

    await refreshProducts();

  } catch (err) {
    console.error(
      "Toggle product status error:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Failed to update product status."
    );
  }
};

  /*
  |--------------------------------------------------------------------------
  | ENABLE / DISABLE ACROSS ALL STORES
  |--------------------------------------------------------------------------
  | All-store products are grouped by normalized product name. The backend
  | updates every matching product row in the products table to the same
  | status, so the database stays synchronized across stores.
  */

  const handleToggleStatusAllStores = async (
    product: Product
  ) => {
    setMenuId(null);

    const nameKey = product.name.trim().toLowerCase();
    if (!nameKey) {
      setError("This product has no valid name.");
      return;
    }

    const newStatus =
      product.status === "active"
        ? "inactive"
        : "active";

    const actionText =
      newStatus === "inactive"
        ? "disable"
        : "enable";

    const confirmed = window.confirm(
      `${newStatus === "inactive" ? "Disable" : "Enable"} \"${product.name}\" across all stores?\n\nAll matching product records will be set to ${newStatus} in the database.`
    );

    if (!confirmed) return;

    try {
      setGlobalStatusUpdating(nameKey);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE}/products/toggle_all_status.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            product_id: Number(product.id),
            status: newStatus,
          }),
        }
      );

      const text = await response.text();
      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Global status API did not return valid JSON:\n${text.substring(0, 500)}`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            `Failed to ${actionText} the product across all stores.`
        );
      }

      setSuccess(
        data.message ||
          `Product ${actionText}d across all stores successfully.`
      );

      await openAllStores();
    } catch (err) {
      console.error(
        "Global product status error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${actionText} the product across all stores.`
      );
    } finally {
      setGlobalStatusUpdating(null);
    }
  };
  /*
  |--------------------------------------------------------------------------
  | DUPLICATE
  |--------------------------------------------------------------------------
  */

  const handleDuplicate = async (
    product: Product
  ) => {
    setMenuId(null);

    if (!selectedStoreId) {
      setError("Please select a branch first.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE}/products/duplicate.php`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: product.id,
            store_id: selectedStoreId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to duplicate product."
        );
      }

      setSuccess(
        "Product duplicated successfully."
      );

      await refreshProducts();
    } catch (err) {
      console.error(
        "Duplicate product error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to duplicate product."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | EDIT
  |--------------------------------------------------------------------------
  */

  const openEdit = async (product: Product) => {
    setMenuId(null);
    setMenuPosition(null);
    setEditMode("store");

    setEditProduct({
      ...product,
      variants: product.variants ?? [],
    });

    await fetchSuppliers(Number(product.store_id));
  };

  const openAllStoreEdit = async (product: Product) => {
    setMenuId(null);
    setMenuPosition(null);
    setEditMode("all");

    setEditProduct({
      ...product,
      variants: product.variants ?? [],
    });

    // Load the global supplier list and initialize the store checkboxes
    // from the actual product_stores associations already returned by the
    // All Stores product load.
    const activeStoreRows = allStores.filter(
      (store) => String(store.status ?? "active").toLowerCase() === "active"
    );
    const activeAssociationStoreIds = activeStoreRows
      .filter((store) => {
        const association = allStoreProducts.find(
          (row) =>
            Number(row.id) === Number(product.id) &&
            Number(row.store_id) === Number(store.id)
        );
        return association?.status === "active";
      })
      .map((store) => Number(store.id));

    setSelectedEditStoreIds(activeAssociationStoreIds);
    await fetchSuppliers();
  };

  const handleEditChange = (
    key: keyof Product,
    value: string | number
  ) => {
    setEditProduct((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
  };

  const handleSaveEdit = async () => {
  if (!editProduct) {
    setError("No product selected.");
    return;
  }

  if (editMode === "all") {
    const productId = Number(editProduct.id);
    const name = editProduct.name.trim();
    const sku = editProduct.sku?.trim() || null;
    const supplierId = editProduct.supplier_id
      ? Number(editProduct.supplier_id)
      : null;
    const categoryId = editProduct.category_id
      ? Number(editProduct.category_id)
      : null;

    if (!Number.isInteger(productId) || productId <= 0) {
      setError("Invalid product ID.");
      return;
    }
    if (!name) {
      setError("Product name is required.");
      return;
    }
    if (sku !== null && !/^\d{1,8}$/.test(sku)) {
      setError("SKU must contain 1 to 8 digits.");
      return;
    }
    if (supplierId !== null && (!Number.isInteger(supplierId) || supplierId <= 0)) {
      setError("Invalid supplier.");
      return;
    }
    if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
      setError("Invalid category.");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE}/products/update-all.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            product_id: productId,
            name,
            sku,
            supplier_id: supplierId,
            category_id: categoryId,
          }),
        }
      );

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `All-store product update API did not return valid JSON:\n${text.substring(0, 500)}`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update the product across all stores."
        );
      }

      // Synchronize the product's store availability separately from the
      // centralized product master fields. Checked = active association;
      // unchecked = inactive association. A checked store without an
      // existing association is created automatically.
      const associationResponse = await fetch(
        `${API_BASE}/products/update-store-associations.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            product_id: productId,
            store_ids: selectedEditStoreIds,
          }),
        }
      );

      const associationText = await associationResponse.text();
      let associationData: any;
      try {
        associationData = JSON.parse(associationText);
      } catch {
        throw new Error(
          `Store association API did not return valid JSON:\n${associationText.substring(0, 500)}`
        );
      }

      if (!associationResponse.ok || !associationData.success) {
        throw new Error(
          associationData.message ||
            "Product details were saved, but store availability could not be updated."
        );
      }

      setSuccess(
        associationData.message ||
          data.message ||
          "Product updated across all stores successfully."
      );
      setEditProduct(null);
      await refreshProducts();
    } catch (err) {
      console.error("All-store product update error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update the product across all stores."
      );
    } finally {
      setSavingEdit(false);
    }
    return;
  }

  if (!activeStoreId) {
    setError("No store selected.");
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | PRODUCT ID
  |--------------------------------------------------------------------------
  */

  const productId = Number(editProduct.id);
  const storeId = Number(selectedStoreId);

  if (!Number.isInteger(productId) || productId <= 0) {
    setError("Invalid product ID.");
    console.error("Invalid product ID:", editProduct.id);
    return;
  }

  if (!Number.isInteger(storeId) || storeId <= 0) {
    setError("Invalid store ID.");
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | STORE ASSOCIATION
  |--------------------------------------------------------------------------
  | The selected store is the store-specific inventory/pricing context.
  | The product master itself is centralized.
  */

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  if (!editProduct.name.trim()) {
    setError("Product name is required.");
    return;
  }

  const price = Number(editProduct.price);
  const cost = Number(editProduct.cost ?? 0);
  const lowStockThreshold = Number(
    editProduct.low_stock_threshold ?? 0
  );

  if (!Number.isFinite(price) || price < 0) {
    setError("Invalid selling price.");
    return;
  }

  if (!Number.isFinite(cost) || cost < 0) {
    setError("Invalid cost price.");
    return;
  }

  if (
    !Number.isFinite(lowStockThreshold) ||
    lowStockThreshold < 0
  ) {
    setError("Invalid low stock threshold.");
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | CATEGORY
  |--------------------------------------------------------------------------
  */

  let categoryId: number | null = null;

  if (editProduct.category_id) {
    categoryId = Number(editProduct.category_id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setError("Invalid category.");
      return;
    }

    const categoryExists = categories.some(
      (category) => Number(category.id) === categoryId
    );

    if (!categoryExists) {
      setError(
        "The selected category is invalid."
      );
      return;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SUPPLIER
  |--------------------------------------------------------------------------
  */

  let supplierId: number | null = null;

  if (editProduct.supplier_id) {
    supplierId = Number(editProduct.supplier_id);

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      setError("Invalid supplier.");
      return;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | VARIANTS
  |--------------------------------------------------------------------------
  */

  const variants = (editProduct.variants ?? [])
    .map((variant) => ({
      id: variant.id
        ? Number(variant.id)
        : undefined,

      option_name: String(
        variant.option_name ?? ""
      ).trim(),

      option_value: String(
        variant.option_value ?? ""
      ).trim(),
    }))
    .filter(
      (variant) =>
        variant.option_name &&
        variant.option_value
    );

  /*
  |--------------------------------------------------------------------------
  | DEBUG
  |--------------------------------------------------------------------------
  */

  console.log("Updating product:", {
    product_id: productId,
    store_id: storeId,
    name: editProduct.name,
    category_id: categoryId,
    supplier_id: supplierId,
    variants,
  });

  /*
  |--------------------------------------------------------------------------
  | SAVE
  |--------------------------------------------------------------------------
  */

  try {
    setSavingEdit(true);
    setError("");
    setSuccess("");

    const payload = {
      /*
       * IMPORTANT:
       * PHP expects product_id.
       */
      product_id: productId,

      /*
       * IMPORTANT:
       * Store ID is always sent with product ID.
       */
      store_id: storeId,

      name: editProduct.name.trim(),

      sku:
        editProduct.sku?.trim() || null,

      barcode:
        editProduct.barcode?.trim() || null,

      category_id: categoryId,

      supplier_id: supplierId,

      description:
        editProduct.description?.trim() || null,

      price,

      cost,

      track_inventory:
        Boolean(
          Number(editProduct.track_inventory)
        ),

      low_stock_threshold:
        lowStockThreshold,

      status:
        editProduct.status === "inactive"
          ? "inactive"
          : "active",

      variants,
    };

    const response = await fetch(
      `${API_BASE}/products/update.php`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          "Failed to update product."
      );
    }

    setSuccess(
      "Product updated successfully."
    );

    setEditProduct(null);

    await refreshProducts();

  } catch (err) {
    console.error(
      "Update product error:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Failed to update product."
    );

  } finally {
    setSavingEdit(false);
  }
};
  /*
  |--------------------------------------------------------------------------
  | CLEAR FILTERS
  |--------------------------------------------------------------------------
  */

  const clearFilters = () => {
    setSearch("");
    setCatFilter("");
    setStatusFilter("");
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="p-6 space-y-4 max-w-[1400px]">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Products
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            {tableScope === "all"
              ? `${tableProducts.length} products across ${allStores.length} stores`
              : `${tableProducts.length} products in ${
                  allStores.find((store) => Number(store.id) === Number(selectedStoreId))?.branch_name ||
                  `Store #${selectedStoreId}`
                }`}
          </p>
        </div>

        <div className="flex items-center gap-2">

          <Button
            variant="secondary"
            size="sm"
            onClick={refreshProducts}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowExportModal(true)}
            disabled={exportLoading}
          >
            Export
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setError("");
              setSuccess("");
              setImportResult(null);
              setImportFile(null);
              setImportScope("all");
              setShowImportModal(true);
            }}
            disabled={importLoading}
          >
            Import
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onAddProduct}
            icon={
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line
                  x1="12"
                  y1="5"
                  x2="12"
                  y2="19"
                />
                <line
                  x1="5"
                  y1="12"
                  x2="19"
                  y2="12"
                />
              </svg>
            }
          >
            Add Product
          </Button>

        </div>
      </div>

      {/* SUCCESS */}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">
          {success}
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {/* FILTERS */}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">

          <SearchBar
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search name, SKU, barcode..."
          />

          <Select
            value={tableScope}
            onChange={(value) => {
              setTableScope(String(value));
              setPage(1);
              setCatFilter("");
              setStatusFilter("");
              setMenuId(null);
              setMenuPosition(null);
                        }}
            options={[
              { value: "all", label: "All Stores" },
              ...allStores
                .filter((store) =>
                  String(store.status ?? "active").toLowerCase() === "active"
                )
                .map((store) => ({
                  value: String(store.id),
                  label:
                    store.branch_name?.trim() ||
                    store.store_name ||
                    `Store #${store.id}`,
                })),
            ]}
          />

          <Select
            value={catFilter}
            onChange={(value) => {
              setCatFilter(value);
              setPage(1);
            }}
            placeholder={
              loadingCategories
                ? "Loading categories..."
                : "All Categories"
            }
            options={categories.map(
              (category) => ({
                value: String(category.id),
                label: category.name,
              })
            )}
          />

          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            placeholder="All Status"
            options={[
              {
                value: "active",
                label: "Active",
              },
              {
                value: "inactive",
                label: "Inactive",
              },
            ]}
          />

          {(search ||
            catFilter ||
            statusFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] text-[#64748B] hover:text-[#374151] underline"
            >
              Clear filters
            </button>
          )}

          <span className="text-[12px] text-[#94A3B8] ml-auto">
            {filtered.length} results
          </span>

        </div>
      </Card>

      {/* TABLE */}

      <Card>

        {loadingAllStores ? (
          <div className="p-10 text-center">
            <p className="text-[13px] text-[#64748B]">
              Loading products from all stores...
            </p>
          </div>
        ) : paged.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />
                <path d="m20 20-4-4" />
              </svg>
            </div>

            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              No products found
            </h3>

            <p className="text-[12px] text-[#64748B] mt-1">
              Try changing your filters or add a new product.
            </p>
          </div>
        ) : (
          <>
            <div
              className="mx-4 w-[calc(100%-2rem)] overflow-x-auto [&_table]:w-full [&_table]:min-w-[1280px] [&_table]:table-fixed"
            >
              <Table
                headers={
                  tableScope === "all"
                    ? ["Product", "SKU", "Cost (Average)", "Stock", "Status", "Actions"]
                    : [ "Product", "SKU",  "Category", "Price", "Cost (Average)", "Stock", "Status", "Actions"]
                }
              >

              {paged.map((product) => (

                <Tr
                  key={
                    tableScope === "all"
                      ? `all-${product.name.trim().toLowerCase()}`
                      : `${product.store_id}-${product.id}`
                  }
                >
                 

                  {/* PRODUCT */}

                  <Td>
                    <div className="flex items-center gap-3">

                     

                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#0F172A] max-w-[180px] truncate">
                          {product.name}
                        </p>

                      </div>

                    </div>
                  </Td>

                  {/* SKU */}

                  <Td mono>
                    {product.sku || "—"}
                  </Td>

                  {tableScope !== "all" && (
                    <>
                  
                      <Td><span className="text-[#475569]">{getCategoryName(product, categories)}</span></Td>
                      <Td><span className="font-semibold text-[#0F172A]">{fmt(product.price)}</span></Td>
                    </>
                  )}

                  <Td>
                    <span className="text-[#64748B]">
                      {fmt(getDisplayAverageCost(product))}
                    </span>
                  </Td>

                  {/* STOCK */}

                  <Td>
                    <span
                      className={`text-[13px] font-semibold ${
                        Number(
                          product.stock
                        ) === 0
                          ? "text-red-500"
                          : Number(
                              product.stock
                            ) <=
                            Number(
                              product.low_stock_threshold
                            )
                          ? "text-amber-600"
                          : "text-[#0F172A]"
                      }`}
                    >
                      {Number(
                        product.stock
                      )}
                    </span>
                  </Td>

                  {/* STATUS */}

                  <Td>
                    {product.status === "inactive" ? (
                      <Badge variant="danger">
                        Inactive
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        Active
                      </Badge>
                    )}
                  </Td>

                  {/* ACTIONS */}

                  <Td>
                    <div>
                      <button
                        type="button"
                        onClick={(event) => {
                          const rect =
                            event.currentTarget.getBoundingClientRect();

                          const menuWidth = 176;
                          const menuHeight =
                            tableScope === "all" ? 122 : 150;
                          const gap = 4;

                          let top = rect.bottom + gap;

                          // If the menu would go below the viewport,
                          // open it upward instead.
                          if (
                            top + menuHeight >
                            window.innerHeight - 8
                          ) {
                            top =
                              rect.top -
                              menuHeight -
                              gap;
                          }

                          let left =
                            rect.right -
                            menuWidth;

                          left = Math.max(
                            8,
                            Math.min(
                              left,
                              window.innerWidth -
                                menuWidth -
                                8
                            )
                          );

                          setMenuPosition({
                            top,
                            left,
                          });

                          setMenuId(
                            menuId === product.id
                              ? null
                              : product.id
                          );
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center transition-colors"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="text-[#64748B]"
                        >
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>

                      {menuId === product.id &&
                        menuPosition &&
                        createPortal(
                          <div
                            className="fixed w-44 bg-white rounded-xl border border-[#E2E8F0] shadow-2xl z-[99999] py-1 overflow-hidden"
                            style={{
                              top: `${menuPosition.top}px`,
                              left: `${menuPosition.left}px`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setMenuId(null);
                                setMenuPosition(null);
                                setViewProduct(product);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F8FAFC]"
                            >
                              View
                            </button>

                            {tableScope === "all" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuId(null);
                                    setMenuPosition(null);
                                    openAllStoreEdit(product);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  Edit All Stores
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    globalStatusUpdating ===
                                    product.name
                                      .trim()
                                      .toLowerCase()
                                  }
                                  onClick={() => {
                                  setMenuId(null);
                                  setMenuPosition(null);
                                  handleToggleStatusAllStores(product);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F8FAFC] disabled:opacity-50"
                              >
                                {globalStatusUpdating ===
                                product.name
                                  .trim()
                                  .toLowerCase()
                                  ? "Updating..."
                                  : product.status === "active"
                                  ? "Disable All Stores"
                                  : "Enable All Stores"}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuId(null);
                                    setMenuPosition(null);
                                    openEdit(product);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuId(null);
                                    setMenuPosition(null);
                                    handleDuplicate(product);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  Duplicate
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuId(null);
                                    setMenuPosition(null);
                                    handleToggleStatus(product);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  {product.status === "active"
                                    ? "Disable"
                                    : "Enable"}
                                </button>
                              </>
                            )}
                          </div>,
                          document.body
                        )}
                    </div>
                  </Td>

                </Tr>

              ))}

              </Table>
            </div>

            <Pagination
              page={page}
              total={filtered.length}
              perPage={PER_PAGE}
              onChange={setPage}
            />
          </>
        )}

      </Card>

      {/* VIEW MODAL */}

      {viewProduct && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[650px] max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">

              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">
                  Product Details
                </h3>

                <p className="text-[11px] text-[#64748B]">
                  Product #{viewProduct.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewProduct(null)
                }
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                ×
              </button>

            </div>

            <div className="p-5 space-y-4">

              <div className="flex items-center gap-4">

                {viewProduct.product_image ? (
                  <img
                    src={
                      viewProduct.product_image
                    }
                    alt={
                      viewProduct.name
                    }
                    className="w-20 h-20 rounded-xl object-cover border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                    {getInitials(
                      viewProduct.name
                    )}
                  </div>
                )}

                <div>
                  <h4 className="text-[16px] font-bold text-[#0F172A]">
                    {viewProduct.name}
                  </h4>

                  <p className="text-[12px] text-[#64748B]">
                    {getCategoryName(viewProduct, categories)}
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <Info
                  label="SKU"
                  value={
                    viewProduct.sku ||
                    "—"
                  }
                />

                <Info
                  label="Barcode"
                  value={
                    viewProduct.barcode ||
                    "—"
                  }
                />

                <Info
                  label="Selling Price"
                  value={fmt(
                    viewProduct.price
                  )}
                />

                <Info
                  label="Cost (Average)"
                  value={fmt(
                    getDisplayAverageCost(viewProduct)
                  )}
                />

                <Info
                  label="Stock"
                  value={String(
                    viewProduct.stock
                  )}
                />

                <Info
                  label="Status"
                  value={
                    viewProduct.status
                  }
                />

              </div>

              {viewProduct.description && (
                <div>
                  <p className="text-[11px] font-semibold text-[#64748B] mb-1">
                    Description
                  </p>

                  <p className="text-[13px] text-[#374151]">
                    {
                      viewProduct.description
                    }
                  </p>
                </div>
              )}

              {viewProduct.variants &&
                viewProduct.variants
                  .length > 0 && (
                  <div>

                    <p className="text-[11px] font-semibold text-[#64748B] mb-2">
                      Variants
                    </p>

                    <div className="space-y-2">

                      {viewProduct.variants.map(
                        (variant, index) => (
                          <div
                            key={
                              variant.id ??
                              index
                            }
                            className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"
                          >
                            <span className="text-[12px] font-medium">
                              {
                                variant.option_name
                              }
                            </span>

                            <span className="text-[12px] text-slate-600">
                              {
                                variant.option_value
                              }
                            </span>
                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

            </div>

          </div>

        </div>
      )}

      {/* IMPORT MODAL */}

      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">
                  Import Products
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Import the Products CSV exported from Rhea POS or Excel.
                </p>
              </div>

              <button
                type="button"
                onClick={closeImportModal}
                disabled={importLoading}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[12px] font-medium text-[#374151] block mb-1">
                  CSV File
                </label>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={importLoading}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setImportFile(file);
                    setImportResult(null);
                  }}
                  className="w-full text-[12px] text-[#475569]"
                />

                <p className="text-[10px] text-[#94A3B8] mt-1">
                  Excel: save the sheet as CSV before importing. SKU values like 7 or 0000007 become 00000007 automatically.
                </p>
              </div>

              <div>
                <p className="text-[12px] font-medium text-[#374151] mb-2">
                  Import Scope
                </p>

                <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-4">
                  <p className="text-[13px] font-semibold text-[#4F46E5]">
                    All Stores
                  </p>
                  <p className="text-[10px] text-[#64748B] mt-1">
                    Import the centralized product catalog across all active stores.
                  </p>
                </div>
              </div>

              {importScope === "all" && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-[10px] text-emerald-700 leading-4">
                    Existing products are detected by product name. No duplicate row is created. New products in other stores start with 0 stock. Their SKU is kept from the original product whenever available.
                  </p>
                </div>
              )}

              {importResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <p className="text-[11px] font-semibold text-emerald-800">
                    Import complete
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-1">
                    Created: {importResult.created} · Already existed: {importResult.skipped}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-[10px] text-red-600 space-y-1">
                      {importResult.errors.slice(0, 5).map((message, index) => (
                        <p key={`${index}-${message}`}>
                          {message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeImportModal}
                  disabled={importLoading}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={importProductsCsv}
                  disabled={importLoading || !importFile}
                >
                  {importLoading ? "Importing..." : "Import Products"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* EXPORT MODAL */}

      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">
                  Export Products
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Export the centralized product catalog from all stores.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={exportLoading}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-3">
              <button
                type="button"
                onClick={exportAllStores}
                disabled={exportLoading}
                className="w-full text-left rounded-xl border border-[#C7D2FE] bg-[#F8FAFC] p-4 hover:bg-[#EEF2FF] transition-colors disabled:opacity-50"
              >
                <p className="text-[13px] font-semibold text-[#4F46E5]">
                  All Stores
                </p>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Export existing product records from every store, including average cost.
                </p>
              </button>

              {exportLoading && (
                <p className="text-[11px] text-center text-[#64748B]">
                  Preparing export...
                </p>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportModal(false)}
                disabled={exportLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}

      {editProduct && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">

              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">
                  {editMode === "all" ? "Edit Product — All Stores" : "Edit Product"}
                </h3>

                <p className="text-[11px] text-[#64748B]">
                  {editMode === "all"
                    ? "Changes apply to the centralized product across all stores."
                    : `Product #${editProduct.id}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditProduct(null)
                }
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500"
                disabled={savingEdit}
              >
                ×
              </button>

            </div>

            <div className="p-5 space-y-4">

              {editMode === "all" ? (
                <>
                  <EditInput
                    label="Product Name"
                    value={editProduct.name}
                    onChange={(value) =>
                      handleEditChange("name", value)
                    }
                  />

                  <EditInput
                    label="SKU"
                    value={editProduct.sku || ""}
                    onChange={(value) =>
                      handleEditChange("sku", value)
                    }
                  />

                  <Select
                    label="Supplier"
                    value={
                      editProduct.supplier_id
                        ? String(editProduct.supplier_id)
                        : ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "supplier_id",
                        value ? Number(value) : 0
                      )
                    }
                    placeholder={
                      suppliers.length > 0
                        ? "Select supplier"
                        : "No suppliers available"
                    }
                    options={suppliers.map((supplier) => ({
                      value: String(supplier.id),
                      label: supplier.name,
                    }))}
                  />

                  <Select
                    label="Category"
                    value={
                      editProduct.category_id
                        ? String(editProduct.category_id)
                        : ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "category_id",
                        value ? Number(value) : 0
                      )
                    }
                    placeholder="Select category"
                    options={categories.map((category) => ({
                      value: String(category.id),
                      label: category.name,
                    }))}
                  />

                  <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                    <div className="px-3 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-semibold text-[#374151]">
                            Store Availability
                          </p>
                          <p className="text-[10px] text-[#94A3B8] mt-0.5">
                            Check a store to make this product active there. Uncheck it to make the product inactive in that store.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const activeIds = allStores
                              .filter(
                                (store) =>
                                  String(store.status ?? "active").toLowerCase() === "active"
                              )
                              .map((store) => Number(store.id));
                            setSelectedEditStoreIds(activeIds);
                          }}
                          className="text-[10px] font-semibold text-[#4F46E5] hover:underline shrink-0"
                        >
                          Select All
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-[#E2E8F0] max-h-[220px] overflow-y-auto">
                      {allStores
                        .filter(
                          (store) =>
                            String(store.status ?? "active").toLowerCase() === "active"
                        )
                        .map((store) => {
                          const storeId = Number(store.id);
                          const checked = selectedEditStoreIds.includes(storeId);
                          const association = allStoreProducts.find(
                            (row) =>
                              Number(row.id) === Number(editProduct.id) &&
                              Number(row.store_id) === storeId
                          );
                          const hasAssociation = Boolean(association);

                          return (
                            <label
                              key={storeId}
                              className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#F8FAFC]"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    setSelectedEditStoreIds((current) =>
                                      event.target.checked
                                        ? Array.from(new Set([...current, storeId]))
                                        : current.filter((id) => id !== storeId)
                                    );
                                  }}
                                  className="h-4 w-4 rounded border-[#CBD5E1] text-[#4F46E5] focus:ring-[#4F46E5]"
                                />
                                <span className="text-[12px] font-medium text-[#374151] truncate">
                                  {store.branch_name?.trim() || store.store_name || `Store #${storeId}`}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] shrink-0 ${
                                  checked
                                    ? "text-emerald-600"
                                    : hasAssociation
                                    ? "text-amber-600"
                                    : "text-[#94A3B8]"
                                }`}
                              >
                                {checked
                                  ? hasAssociation
                                    ? "Active"
                                    : "Will be created"
                                  : hasAssociation
                                  ? "Will be inactive"
                                  : "Not added"}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <EditInput
                    label="Product Name"
                    value={editProduct.name}
                    onChange={(value) =>
                      handleEditChange("name", value)
                    }
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <EditInput
                      label="SKU"
                      value={editProduct.sku || ""}
                      onChange={(value) =>
                        handleEditChange("sku", value)
                      }
                    />

                    <EditInput
                      label="Barcode"
                      value={editProduct.barcode || ""}
                      onChange={(value) =>
                        handleEditChange("barcode", value)
                      }
                    />
                  </div>

                  <Select
                    label="Supplier"
                    value={
                      editProduct.supplier_id
                        ? String(editProduct.supplier_id)
                        : ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "supplier_id",
                        value ? Number(value) : 0
                      )
                    }
                    placeholder={
                      suppliers.length > 0
                        ? "Select supplier"
                        : "No suppliers available"
                    }
                    options={suppliers.map((supplier) => ({
                      value: String(supplier.id),
                      label: supplier.name,
                    }))}
                  />

                  <Select
                    label="Category"
                    value={
                      editProduct.category_id
                        ? String(editProduct.category_id)
                        : ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "category_id",
                        value ? Number(value) : 0
                      )
                    }
                    placeholder="Select category"
                    options={categories.map((category) => ({
                      value: String(category.id),
                      label: category.name,
                    }))}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <EditInput
                      label="Selling Price"
                      type="number"
                      value={String(editProduct.price)}
                      onChange={(value) =>
                        handleEditChange("price", Number(value))
                      }
                    />

                    <EditInput
                      label="Cost"
                      type="number"
                      value={String(editProduct.cost)}
                      onChange={(value) =>
                        handleEditChange("cost", Number(value))
                      }
                    />

                    <EditInput
                      label="Low Stock Threshold"
                      type="number"
                      value={String(editProduct.low_stock_threshold)}
                      onChange={(value) =>
                        handleEditChange(
                          "low_stock_threshold",
                          Number(value)
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#374151] block mb-1">
                      Description
                    </label>
                    <textarea
                      value={editProduct.description || ""}
                      onChange={(e) =>
                        handleEditChange("description", e.target.value)
                      }
                      rows={4}
                      className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#374151] block mb-2">
                      Status
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-[13px]">
                        <input
                          type="radio"
                          checked={editProduct.status === "active"}
                          onChange={() =>
                            handleEditChange("status", "active")
                          }
                        />
                        Active
                      </label>
                      <label className="flex items-center gap-2 text-[13px]">
                        <input
                          type="radio"
                          checked={editProduct.status === "inactive"}
                          onChange={() =>
                            handleEditChange("status", "inactive")
                          }
                        />
                        Inactive
                      </label>
                    </div>
                  </div>
                </>
              )}

            </div>

            <div className="px-5 py-4 border-t border-[#E2E8F0] flex justify-end gap-2">

              <Button
                variant="ghost"
                size="lg"
                onClick={() =>
                  setEditProduct(null)
                }
                disabled={savingEdit}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="lg"
                onClick={
                  handleSaveEdit
                }
                disabled={savingEdit}
              >
                {savingEdit
                  ? "Saving..."
                  : "Save Changes"}
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SMALL UI HELPERS
|--------------------------------------------------------------------------
*/

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] text-slate-400 uppercase">
        {label}
      </p>

      <p className="text-[13px] font-medium text-slate-700 mt-0.5">
        {value}
      </p>
    </div>
  );
}

function EditInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[12px] font-medium text-[#374151] block mb-1">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
      />
    </div>
  );
}