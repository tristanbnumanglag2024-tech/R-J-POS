import { useEffect, useMemo, useState } from "react";
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
  activeStoreId: number | null;
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
  store_id: number;
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

  return "$" + numberValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function stockBadge(
  stock: number,
  lowStockThreshold: number
) {
  if (stock <= 0) {
    return (
      <Badge variant="danger">
        Out of Stock
      </Badge>
    );
  }

  if (stock <= lowStockThreshold) {
    return (
      <Badge variant="warning">
        Low Stock
      </Badge>
    );
  }

  return (
    <Badge variant="success">
      In Stock
    </Badge>
  );
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
      (item) =>
        Number(item.id) === categoryId &&
        Number(item.store_id) === storeId
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

  // Display-only weighted average purchase cost.
  // This is calculated from purchase_order_items and never writes to products.cost.
  const [averageCosts, setAverageCosts] =
    useState<AverageCostMap>({});

  const [categories, setCategories] = useState<Category[]>([]);

  /*
  |--------------------------------------------------------------------------
  | ALL STORE VIEW
  |--------------------------------------------------------------------------
  */

  const [showAllStores, setShowAllStores] =
    useState(false);

  const [allStoreProducts, setAllStoreProducts] =
    useState<Product[]>([]);

  const [allStores, setAllStores] =
    useState<Store[]>([]);

  const [loadingAllStores, setLoadingAllStores] =
    useState(false);

  const [allStoresError, setAllStoresError] =
    useState("");

  const [allStoresSearch, setAllStoresSearch] =
    useState("");

  const [showExportModal, setShowExportModal] =
    useState(false);

  const [exportLoading, setExportLoading] =
    useState(false);

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

  const [page, setPage] = useState(1);

  /*
  |--------------------------------------------------------------------------
  | MENU
  |--------------------------------------------------------------------------
  */

  const [menuId, setMenuId] =
    useState<number | null>(null);

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

  const fetchAverageCosts = async (
    currentStoreId: number
  ) => {
    try {
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
          `Average cost API did not return valid JSON:\n${text.substring(0, 500)}`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load average purchase costs."
        );
      }

      const costs =
        data.average_costs &&
        typeof data.average_costs === "object"
          ? data.average_costs
          : {};

      setAverageCosts(costs as AverageCostMap);
    } catch (err) {
      console.warn(
        "Average purchase cost could not be loaded. Falling back to products.cost:",
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
        `${API_BASE}/categories/list.php?store_id=${currentStoreId}`
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
              (category: Category) =>
                Number(category.store_id) ===
                Number(currentStoreId)
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
  | LOAD ALL STORES + ALL PRODUCTS
  |--------------------------------------------------------------------------
  | Display-only view.
  | No database rows are created or modified.
  |
  | Products with the same normalized name are grouped together in the
  | modal and shown with their existing store records.
  */

  const openAllStores = async (): Promise<{ stores: Store[]; products: Product[] }> => {
    try {
      setShowAllStores(true);
      setLoadingAllStores(true);
      setAllStoresError("");
      setAllStoresSearch("");

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

      setAllStoresError(
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
    if (!activeStoreId) {
      setError("No store selected.");
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
      `products-store-${activeStoreId}-${new Date().toISOString().slice(0, 10)}.csv`,
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

  const closeAllStores = () => {
    if (loadingAllStores) {
      return;
    }

    setShowAllStores(false);
    setAllStoreProducts([]);
    setAllStoresError("");
    setAllStoresSearch("");
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
    setError("");
    setSuccess("");

    if (!activeStoreId) {
      setProducts([]);
      setAverageCosts({});
      setCategories([]);
      return;
    }

    fetchProducts(activeStoreId);
    fetchAverageCosts(activeStoreId);
    fetchCategories(activeStoreId);
  }, [activeStoreId]);

  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filtered = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return products.filter((product) => {
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
    products,
    search,
    catFilter,
    statusFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | GROUP ALL-STORE PRODUCTS BY SAME NAME
  |--------------------------------------------------------------------------
  | Existing product rows are grouped only for display.
  | Nothing is inserted or merged in the database.
  */

  const groupedAllStoreProducts =
    useMemo(() => {
      const groups = new Map<
        string,
        Product[]
      >();

      allStoreProducts.forEach((product) => {
        const key = product.name
          .trim()
          .toLowerCase();

        if (!key) {
          return;
        }

        const existing =
          groups.get(key) || [];

        existing.push(product);
        groups.set(key, existing);
      });

      const allGroups = Array.from(
        groups.entries()
      )
        .map(([key, storeProducts]) => {
          const sorted =
            [...storeProducts].sort(
              (a, b) =>
                Number(a.store_id) -
                Number(b.store_id)
            );

          const totalStock =
            sorted.reduce(
              (sum, product) =>
                sum +
                Number(product.stock || 0),
              0
            );

          const weightedStockCost =
            sorted.reduce(
              (sum, product) =>
                sum +
                Number(product.stock || 0) *
                  Number(
                    averageCosts[
                      String(product.id)
                    ] ??
                      product.cost ??
                      0
                  ),
              0
            );

          const averageCost =
            totalStock > 0
              ? weightedStockCost /
                totalStock
              : sorted.length > 0
              ? sorted.reduce(
                  (sum, product) =>
                    sum +
                    Number(
                      averageCosts[
                        String(product.id)
                      ] ??
                        product.cost ??
                        0
                    ),
                  0
                ) / sorted.length
              : 0;

          return {
            key,
            name:
              sorted[0]?.name ||
              "Unnamed Product",
            sku:
              sorted[0]?.sku ||
              "—",
            totalStock,
            averageCost,
            stores: sorted,
          };
        })
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      const searchValue =
        allStoresSearch
          .trim()
          .toLowerCase();

      if (!searchValue) {
        return allGroups;
      }

      return allGroups.filter((group) => {
        const matchesGroup =
          group.name
            .toLowerCase()
            .includes(searchValue) ||
          group.sku
            .toLowerCase()
            .includes(searchValue);

        if (matchesGroup) {
          return true;
        }

        return group.stores.some((product) =>
          String(product.sku ?? "")
            .toLowerCase()
            .includes(searchValue) ||
          String(product.barcode ?? "")
            .toLowerCase()
            .includes(searchValue)
        );
      });
    }, [
      allStoreProducts,
      averageCosts,
      allStoresSearch,
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
    if (!activeStoreId) return;

    await Promise.all([
      fetchProducts(activeStoreId),
      fetchAverageCosts(activeStoreId),
    ]);
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

    if (!activeStoreId) {
      setError("No store selected.");
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
            store_id: activeStoreId,
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
  const storeId = Number(activeStoreId);

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
  | DUPLICATE
  |--------------------------------------------------------------------------
  */

  const handleDuplicate = async (
    product: Product
  ) => {
    setMenuId(null);

    if (!activeStoreId) {
      setError("No store selected.");
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
            store_id: activeStoreId,
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

  const openEdit = (product: Product) => {
    setMenuId(null);

    setEditProduct({
      ...product,
      variants: product.variants ?? [],
    });
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
  const storeId = Number(activeStoreId);

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
  | STORE PROTECTION
  |--------------------------------------------------------------------------
  */

  if (Number(editProduct.store_id) !== storeId) {
    setError(
      "This product does not belong to the selected store."
    );

    console.error("Store mismatch:", {
      productId,
      productStoreId: editProduct.store_id,
      selectedStoreId: storeId,
    });

    return;
  }

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
  const stock = Number(editProduct.stock ?? 0);
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

  if (!Number.isFinite(stock) || stock < 0) {
    setError("Invalid stock.");
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
      (category) =>
        Number(category.id) === categoryId &&
        Number(category.store_id) === storeId
    );

    if (!categoryExists) {
      setError(
        "The selected category does not belong to this store."
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

      stock,

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
  | NO STORE
  |--------------------------------------------------------------------------
  */

  if (!activeStoreId) {
    return (
      <div className="p-6 max-w-[1400px]">
        <Card className="p-8">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M3 9l2-5h14l2 5" />
                <path d="M5 9v10h14V9" />
                <path d="M3 9h18" />
              </svg>
            </div>

            <h3 className="text-[15px] font-semibold text-[#0F172A]">
              No Store Selected
            </h3>

            <p className="text-[12px] text-[#64748B] mt-1">
              Select a store before managing products.
            </p>
          </div>
        </Card>
      </div>
    );
  }

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
            {products.length} products in this store
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
            onClick={openAllStores}
            disabled={loadingAllStores}
          >
            {loadingAllStores
              ? "Loading Stores..."
              : "View All Stores"}
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

        {loading ? (
          <div className="p-10 text-center">
            <p className="text-[13px] text-[#64748B]">
              Loading products...
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
            <Table
              headers={[
                "Product",
                "SKU",
                "Barcode",
                "Category",
                "Price",
                "Cost (Average)",
                "Stock",
                "Status",
                "Actions",
              ]}
            >

              {paged.map((product) => (

                <Tr key={product.id}>

                  {/* PRODUCT */}

                  <Td>
                    <div className="flex items-center gap-3">

                      {product.product_image ? (
                        <img
                          src={product.product_image}
                          alt={product.name}
                          className="w-9 h-9 rounded-lg object-cover border border-[#E2E8F0]"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                          {getInitials(
                            product.name
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#0F172A] max-w-[180px] truncate">
                          {product.name}
                        </p>

                        {product.variants &&
                          product.variants.length >
                            0 && (
                            <p className="text-[10px] text-[#94A3B8]">
                              {product.variants.length} variant option
                              {product.variants.length !==
                              1
                                ? "s"
                                : ""}
                            </p>
                          )}
                      </div>

                    </div>
                  </Td>

                  {/* SKU */}

                  <Td mono>
                    {product.sku || "—"}
                  </Td>

                  {/* BARCODE */}

                  <Td mono>
                    {product.barcode || "—"}
                  </Td>

                  {/* CATEGORY */}

                  <Td>
                    <span className="text-[#475569]">
                      {getCategoryName(product, categories)}
                    </span>
                  </Td>

                  {/* PRICE */}

                  <Td>
                    <span className="font-semibold text-[#0F172A]">
                      {fmt(product.price)}
                    </span>
                  </Td>

                  {/* COST (WEIGHTED AVERAGE) */}

                  <Td>
                    <span className="text-[#64748B]">
                      {fmt(
                        averageCosts[String(product.id)] !==
                          undefined
                          ? averageCosts[String(product.id)]
                          : product.cost
                      )}
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
                    {stockBadge(
                      Number(
                        product.stock
                      ),
                      Number(
                        product.low_stock_threshold
                      )
                    )}
                  </Td>

                  {/* ACTIONS */}

                  <Td>

                    <div className="relative">

                      <button
                        type="button"
                        onClick={() =>
                          setMenuId(
                            menuId ===
                              product.id
                              ? null
                              : product.id
                          )
                        }
                        className="w-7 h-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center transition-colors"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="text-[#64748B]"
                        >
                          <circle
                            cx="12"
                            cy="5"
                            r="1.5"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="1.5"
                          />
                          <circle
                            cx="12"
                            cy="19"
                            r="1.5"
                          />
                        </svg>
                      </button>

                      {menuId ===
                        product.id && (

                        <div className="absolute right-0 top-8 w-44 bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-20 py-1 overflow-hidden">

                          <button
                            type="button"
                            onClick={() => {
                              setMenuId(
                                null
                              );
                              setViewProduct(
                                product
                              );
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F8FAFC]"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                product
                              )
                            }
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F8FAFC]"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDuplicate(
                                product
                              )
                            }
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F8FAFC]"
                          >
                            Duplicate
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleStatus(
                                product
                              )
                            }
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F8FAFC]"
                          >
                            {product.status ===
                            "active"
                              ? "Disable"
                              : "Enable"}
                          </button>

                          <div className="border-t border-[#F1F5F9] mt-1 pt-1">

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  product
                                )
                              }
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50"
                            >
                              Delete
                            </button>

                          </div>

                        </div>

                      )}

                    </div>

                  </Td>

                </Tr>

              ))}

            </Table>

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
                    averageCosts[String(viewProduct.id)] !==
                      undefined
                      ? averageCosts[String(viewProduct.id)]
                      : viewProduct.cost
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
                  Choose which stores to include in the CSV export.
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
                onClick={exportCurrentStore}
                disabled={exportLoading}
                className="w-full text-left rounded-xl border border-[#E2E8F0] p-4 hover:border-[#C7D2FE] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
              >
                <p className="text-[13px] font-semibold text-[#0F172A]">
                  Current Store Only
                </p>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Export products from the currently selected store.
                </p>
              </button>

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

      {/* ALL STORES MODAL */}

      {showAllStores && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1000px] max-h-[90vh] overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">
                  Products Across All Stores
                </h3>

                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Existing product records grouped by the same product name. No new data is created.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAllStores}
                disabled={loadingAllStores}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-76px)]">

              <div className="mb-4">
                <SearchBar
                  value={allStoresSearch}
                  onChange={setAllStoresSearch}
                  placeholder="Search product name, SKU or barcode..."
                />
              </div>

              {allStoresError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                  {allStoresError}
                </div>
              )}

              {loadingAllStores ? (
                <div className="py-16 text-center">
                  <div className="w-7 h-7 mx-auto border-2 border-[#E2E8F0] border-t-[#4F46E5] rounded-full animate-spin" />
                  <p className="text-[12px] text-[#64748B] mt-3">
                    Loading products from all stores...
                  </p>
                </div>
              ) : groupedAllStoreProducts.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-[#E2E8F0] rounded-xl">
                  <p className="text-[13px] font-medium text-[#475569]">
                    No products found across stores
                  </p>
                </div>
              ) : (
                <div className="space-y-3">

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-semibold text-[#0F172A]">
                        {groupedAllStoreProducts.length} unique product names
                      </p>

                      <p className="text-[10px] text-[#94A3B8]">
                        {allStores.length} stores checked
                      </p>
                    </div>
                  </div>

                  {groupedAllStoreProducts.map(
                    (group) => (
                      <div
                        key={group.key}
                        className="border border-[#E2E8F0] rounded-xl overflow-hidden"
                      >

                        <div className="bg-[#F8FAFC] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-semibold text-[#0F172A]">
                              {group.name}
                            </p>

                            <p className="text-[10px] text-[#64748B] mt-0.5 font-mono">
                              SKU: {group.sku}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="text-[9px] uppercase tracking-wide text-[#94A3B8]">
                                Stores
                              </p>
                              <p className="text-[12px] font-semibold text-[#0F172A]">
                                {group.stores.length}
                              </p>
                            </div>

                            <div>
                              <p className="text-[9px] uppercase tracking-wide text-[#94A3B8]">
                                Total Stock
                              </p>
                              <p className="text-[12px] font-semibold text-[#0F172A]">
                                {group.totalStock.toLocaleString()}
                              </p>
                            </div>

                            <div>
                              <p className="text-[9px] uppercase tracking-wide text-[#94A3B8]">
                                Avg. Cost
                              </p>
                              <p className="text-[12px] font-semibold text-[#4F46E5]">
                                {fmt(group.averageCost)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-t border-[#E2E8F0] border-b bg-white">
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                                  Store
                                </th>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                                  SKU
                                </th>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                                  Category
                                </th>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-wide text-[#94A3B8] text-right">
                                  Stock
                                </th>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-wide text-[#94A3B8] text-right">
                                  Cost (Average)
                                </th>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                                  Status
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {group.stores.map(
                                (product) => {
                                  const store =
                                    allStores.find(
                                      (item) =>
                                        Number(item.id) ===
                                        Number(product.store_id)
                                    );

                                  const displayCost =
                                    Number(
                                      averageCosts[
                                        String(product.id)
                                      ]
                                    );

                                  const cost =
                                    Number.isFinite(
                                      displayCost
                                    )
                                      ? displayCost
                                      : Number(
                                          product.cost || 0
                                        );

                                  return (
                                    <tr
                                      key={`${product.store_id}-${product.id}`}
                                      className="border-b last:border-b-0 border-[#F1F5F9]"
                                    >
                                      <td className="px-4 py-3">
                                        <div>
                                          <p className="text-[12px] font-medium text-[#0F172A]">
                                            {store?.store_name ||
                                              `Store #${product.store_id}`}
                                          </p>

                                          {store?.branch_name && (
                                            <p className="text-[10px] text-[#94A3B8]">
                                              {store.branch_name}
                                            </p>
                                          )}
                                        </div>
                                      </td>

                                      <td className="px-4 py-3 text-[11px] font-mono text-[#64748B]">
                                        {product.sku || "—"}
                                      </td>

                                      <td className="px-4 py-3 text-[11px] text-[#64748B]">
                                        {product.category_name ||
                                          "—"}
                                      </td>

                                      <td className="px-4 py-3 text-[11px] font-semibold text-[#0F172A] text-right">
                                        {Number(
                                          product.stock || 0
                                        ).toLocaleString()}
                                      </td>

                                      <td className="px-4 py-3 text-[11px] text-[#64748B] text-right">
                                        {fmt(cost)}
                                      </td>

                                      <td className="px-4 py-3">
                                        {product.status ===
                                        "inactive" ? (
                                          <Badge variant="danger">
                                            Inactive
                                          </Badge>
                                        ) : (
                                          <Badge variant="success">
                                            Active
                                          </Badge>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                }
                              )}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

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
                  Edit Product
                </h3>

                <p className="text-[11px] text-[#64748B]">
                  Product #{editProduct.id}
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

              <EditInput
                label="Product Name"
                value={
                  editProduct.name
                }
                onChange={(value) =>
                  handleEditChange(
                    "name",
                    value
                  )
                }
              />

              <div className="grid grid-cols-2 gap-3">

                <EditInput
                  label="SKU"
                  value={
                    editProduct.sku ||
                    ""
                  }
                  onChange={(value) =>
                    handleEditChange(
                      "sku",
                      value
                    )
                  }
                />

                <EditInput
                  label="Barcode"
                  value={
                    editProduct.barcode ||
                    ""
                  }
                  onChange={(value) =>
                    handleEditChange(
                      "barcode",
                      value
                    )
                  }
                />

              </div>

              <Select
                label="Category"
                value={
                  editProduct.category_id
                    ? String(
                        editProduct.category_id
                      )
                    : ""
                }
                onChange={(value) =>
                  handleEditChange(
                    "category_id",
                    Number(value)
                  )
                }
                placeholder="Select category"
                options={categories.map(
                  (category) => ({
                    value: String(
                      category.id
                    ),
                    label:
                      category.name,
                  })
                )}
              />

              <div className="grid grid-cols-2 gap-3">

                <EditInput
                  label="Selling Price"
                  type="number"
                  value={String(
                    editProduct.price
                  )}
                  onChange={(value) =>
                    handleEditChange(
                      "price",
                      Number(value)
                    )
                  }
                />

                <EditInput
                  label="Cost"
                  type="number"
                  value={String(
                    editProduct.cost
                  )}
                  onChange={(value) =>
                    handleEditChange(
                      "cost",
                      Number(value)
                    )
                  }
                />

                <EditInput
                  label="Stock"
                  type="number"
                  value={String(
                    editProduct.stock
                  )}
                  onChange={(value) =>
                    handleEditChange(
                      "stock",
                      Number(value)
                    )
                  }
                />

                <EditInput
                  label="Low Stock Threshold"
                  type="number"
                  value={String(
                    editProduct.low_stock_threshold
                  )}
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
                  value={
                    editProduct.description ||
                    ""
                  }
                  onChange={(e) =>
                    handleEditChange(
                      "description",
                      e.target.value
                    )
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
                      checked={
                        editProduct.status ===
                        "active"
                      }
                      onChange={() =>
                        handleEditChange(
                          "status",
                          "active"
                        )
                      }
                    />
                    Active
                  </label>

                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="radio"
                      checked={
                        editProduct.status ===
                        "inactive"
                      }
                      onChange={() =>
                        handleEditChange(
                          "status",
                          "inactive"
                        )
                      }
                    />
                    Inactive
                  </label>

                </div>

              </div>

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