import { useEffect, useMemo, useState } from "react";
import { Card, Button, Input, Select, Toggle } from "../components/ui";

interface AddProductProps {
  onBack: () => void;
  activeStoreId: number | null;
}

interface Category {
  id: number;
  store_id: number;
  name: string;
  description?: string;
  image?: string | null;
  status: "active" | "inactive" | string;
}

interface Supplier {
  id: number;
  store_id: number;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  status: "active" | "inactive" | string;
}

interface VariantOption {
  name: string;
  values: string;
}

const API_BASE = "http://localhost/rhea-pos-api";

const INITIAL_FORM = {
  name: "",
  sku: "",
  barcode: "",
  category_id: "",
  description: "",
  price: "",
  cost: "",
  track_inventory: true,
  stock: "",
  low_stock_threshold: "10",
  supplier_id: "",
  status: "active",
};

export default function AddProduct({
  onBack,
  activeStoreId,
}: AddProductProps) {
  /*
  |--------------------------------------------------------------------------
  | STORE
  |--------------------------------------------------------------------------
  */

  // IMPORTANT:
  // Do NOT get the store from localStorage.
  // App.tsx already knows the currently selected store.
  const storeId = activeStoreId;

  /*
  |--------------------------------------------------------------------------
  | DATA
  |--------------------------------------------------------------------------
  */

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */

  const [form, setForm] = useState(INITIAL_FORM);

  /*
  |--------------------------------------------------------------------------
  | VARIANTS
  |--------------------------------------------------------------------------
  */

  const [hasVariants, setHasVariants] = useState(false);

  const [variants, setVariants] = useState<VariantOption[]>([]);

  /*
  |--------------------------------------------------------------------------
  | IMAGES
  |--------------------------------------------------------------------------
  */

  const [productImage, setProductImage] = useState<File | null>(null);
  const [barcodeImage, setBarcodeImage] = useState<File | null>(null);

  const [productImagePreview, setProductImagePreview] =
    useState<string | null>(null);

  const [barcodeImagePreview, setBarcodeImagePreview] =
    useState<string | null>(null);

  /*
  |--------------------------------------------------------------------------
  | FORM HELPER
  |--------------------------------------------------------------------------
  */

  const set =
    (key: keyof typeof form) =>
    (value: string | boolean) => {
      setForm((current) => ({
        ...current,
        [key]: value,
      }));
    };

  /*
  |--------------------------------------------------------------------------
  | LOAD CATEGORIES
  |--------------------------------------------------------------------------
  */

  const fetchCategories = async (currentStoreId: number) => {
    try {
      setLoadingCategories(true);

      const response = await fetch(
        `${API_BASE}/categories/list.php?store_id=${currentStoreId}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load categories."
        );
      }

      const storeCategories = Array.isArray(data.categories)
        ? data.categories.filter(
            (category: Category) =>
              Number(category.store_id) === currentStoreId &&
              category.status === "active"
          )
        : [];

      setCategories(storeCategories);
    } catch (err) {
      console.error("Category fetch error:", err);

      setCategories([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load categories."
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD SUPPLIERS
  |--------------------------------------------------------------------------
  */

  const fetchSuppliers = async (currentStoreId: number) => {
    try {
      setLoadingSuppliers(true);

      const response = await fetch(
        `${API_BASE}/suppliers/list.php?store_id=${currentStoreId}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load suppliers."
        );
      }

      const storeSuppliers = Array.isArray(data.suppliers)
        ? data.suppliers.filter(
            (supplier: Supplier) =>
              Number(supplier.store_id) === currentStoreId &&
              supplier.status === "active"
          )
        : [];

      setSuppliers(storeSuppliers);
    } catch (err) {
      console.error("Supplier fetch error:", err);

      setSuppliers([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load suppliers."
      );
    } finally {
      setLoadingSuppliers(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | WHEN STORE CHANGES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setError("");

    // No store selected
    if (!storeId) {
      setCategories([]);
      setSuppliers([]);

      setLoadingCategories(false);
      setLoadingSuppliers(false);

      return;
    }

    // Reset product selections when changing stores
    setForm((current) => ({
      ...current,
      category_id: "",
      supplier_id: "",
    }));

    fetchCategories(storeId);
    fetchSuppliers(storeId);
  }, [storeId]);

  /*
  |--------------------------------------------------------------------------
  | PRODUCT IMAGE
  |--------------------------------------------------------------------------
  */

  const handleProductImage = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Product image must be an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Product image must not exceed 5MB.");
      return;
    }

    setProductImage(file);

    const preview = URL.createObjectURL(file);
    setProductImagePreview(preview);

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | BARCODE IMAGE
  |--------------------------------------------------------------------------
  */

  const handleBarcodeImage = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Barcode image must be an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Barcode image must not exceed 5MB.");
      return;
    }

    setBarcodeImage(file);

    const preview = URL.createObjectURL(file);
    setBarcodeImagePreview(preview);

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | VARIANTS
  |--------------------------------------------------------------------------
  */

  const addVariant = () => {
    setVariants((current) => [
      ...current,
      {
        name: "",
        values: "",
      },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const updateVariant = (
    index: number,
    key: keyof VariantOption,
    value: string
  ) => {
    setVariants((current) => {
      const next = [...current];

      next[index] = {
        ...next[index],
        [key]: value,
      };

      return next;
    });
  };

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  const validateForm = () => {
    setError("");

    if (!storeId) {
      setError(
        "No store selected. Please select a store first."
      );
      return false;
    }

    if (!form.name.trim()) {
      setError("Product name is required.");
      return false;
    }

    if (!form.category_id) {
      setError("Please select a category.");
      return false;
    }

    /*
     * Verify category belongs to selected store.
     */

    const category = categories.find(
      (item) => item.id === Number(form.category_id)
    );

    if (!category) {
      setError(
        "The selected category is invalid."
      );
      return false;
    }

    if (Number(category.store_id) !== Number(storeId)) {
      setError(
        "The selected category does not belong to this store."
      );
      return false;
    }

    /*
     * Supplier is optional.
     */

    if (form.supplier_id) {
      const supplier = suppliers.find(
        (item) => item.id === Number(form.supplier_id)
      );

      if (!supplier) {
        setError(
          "The selected supplier is invalid."
        );
        return false;
      }

      if (Number(supplier.store_id) !== Number(storeId)) {
        setError(
          "The selected supplier does not belong to this store."
        );
        return false;
      }
    }

    /*
     * Selling price.
     */

    if (
      form.price === "" ||
      Number.isNaN(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      setError("Please enter a valid selling price.");
      return false;
    }

    /*
     * Cost price.
     */

    if (
      form.cost !== "" &&
      (
        Number.isNaN(Number(form.cost)) ||
        Number(form.cost) < 0
      )
    ) {
      setError("Cost price cannot be negative.");
      return false;
    }

    /*
     * Stock.
     */

    if (
      form.track_inventory &&
      form.stock !== "" &&
      (
        Number.isNaN(Number(form.stock)) ||
        Number(form.stock) < 0
      )
    ) {
      setError("Stock cannot be negative.");
      return false;
    }

    /*
     * Low stock threshold.
     */

    if (
      form.track_inventory &&
      form.low_stock_threshold !== "" &&
      (
        Number.isNaN(
          Number(form.low_stock_threshold)
        ) ||
        Number(form.low_stock_threshold) < 0
      )
    ) {
      setError(
        "Low stock threshold cannot be negative."
      );
      return false;
    }

    /*
     * Variants.
     */

    if (hasVariants) {
      if (variants.length === 0) {
        setError(
          "Add at least one variant option or disable variants."
        );
        return false;
      }

      for (const variant of variants) {
        if (!variant.name.trim()) {
          setError(
            "Every variant option must have a name."
          );
          return false;
        }

        if (!variant.values.trim()) {
          setError(
            `Please enter values for ${variant.name}.`
          );
          return false;
        }
      }
    }

    return true;
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE PRODUCT
  |--------------------------------------------------------------------------
  */

  const handleSave = async (
    addAnother = false
  ) => {
    if (!validateForm()) {
      return;
    }

    if (!storeId) {
      return;
    }

    try {
      setSaving(true);
      setSaved(false);
      setError("");

      /*
       * Build FormData.
       */

      const formData = new FormData();

      /*
       * STORE
       */

      formData.append(
        "store_id",
        String(storeId)
      );

      /*
       * BASIC PRODUCT DATA
       */

      formData.append(
        "name",
        form.name.trim()
      );

      if (form.sku.trim()) {
        formData.append(
          "sku",
          form.sku.trim()
        );
      }

      /*
       * BARCODE IS OPTIONAL
       */

      if (form.barcode.trim()) {
        formData.append(
          "barcode",
          form.barcode.trim()
        );
      }

      formData.append(
        "category_id",
        form.category_id
      );

      if (form.description.trim()) {
        formData.append(
          "description",
          form.description.trim()
        );
      }

      /*
       * PRICING
       */

      formData.append(
        "price",
        String(Number(form.price))
      );

      if (form.cost !== "") {
        formData.append(
          "cost",
          String(Number(form.cost))
        );
      }

      /*
       * INVENTORY
       */

      formData.append(
        "track_inventory",
        form.track_inventory ? "1" : "0"
      );

      formData.append(
        "stock",
        form.track_inventory && form.stock !== ""
          ? String(Number(form.stock))
          : "0"
      );

      formData.append(
        "low_stock_threshold",
        form.track_inventory &&
        form.low_stock_threshold !== ""
          ? String(
              Number(form.low_stock_threshold)
            )
          : "0"
      );

      /*
       * SUPPLIER IS OPTIONAL
       */

      if (form.supplier_id) {
        formData.append(
          "supplier_id",
          form.supplier_id
        );
      }

      /*
       * STATUS
       */

      formData.append(
        "status",
        form.status
      );

      /*
       * VARIANTS
       *
       * Example:
       *
       * [
       *   {
       *     name: "Size",
       *     values: ["Small", "Medium", "Large"]
       *   },
       *   {
       *     name: "Color",
       *     values: ["Red", "Blue"]
       *   }
       * ]
       */

      const cleanVariants = hasVariants
        ? variants
            .map((variant) => ({
              name: variant.name.trim(),
              values: variant.values
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            }))
            .filter(
              (variant) =>
                variant.name &&
                variant.values.length > 0
            )
        : [];

      formData.append(
        "variants",
        JSON.stringify(cleanVariants)
      );

      /*
       * PRODUCT IMAGE OPTIONAL
       */

      if (productImage) {
        formData.append(
          "product_image",
          productImage
        );
      }

      /*
       * BARCODE IMAGE OPTIONAL
       */

      if (barcodeImage) {
        formData.append(
          "barcode_image",
          barcodeImage
        );
      }

      /*
       * API
       */

      const response = await fetch(
        `${API_BASE}/products/create.php`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to create product."
        );
      }

      setSaved(true);

      /*
       * SAVE & ADD ANOTHER
       */

      if (addAnother) {
        setForm({
          ...INITIAL_FORM,
        });

        setVariants([]);
        setHasVariants(false);

        setProductImage(null);
        setBarcodeImage(null);

        setProductImagePreview(null);
        setBarcodeImagePreview(null);

        setTimeout(() => {
          setSaved(false);
        }, 2000);

        return;
      }

      /*
       * SAVE PRODUCT
       */

      setTimeout(() => {
        onBack();
      }, 700);
    } catch (err) {
      console.error(
        "Create product error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create product."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | MARGIN
  |--------------------------------------------------------------------------
  */

  const margin = useMemo(() => {
    if (
      !form.price ||
      !form.cost ||
      Number(form.price) <= 0
    ) {
      return null;
    }

    return (
      (
        (
          Number(form.price) -
          Number(form.cost)
        ) /
        Number(form.price)
      ) * 100
    ).toFixed(1);
  }, [form.price, form.cost]);

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="p-6 max-w-[1000px] space-y-5">

      {/* HEADER */}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center hover:bg-[#F8FAFC]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#475569"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Add New Product
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            Create a product for the selected store.
          </p>
        </div>
      </div>

      {/* STORE */}

      {storeId ? (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 9l2-5h14l2 5" />
              <path d="M5 9v10h14V9" />
              <path d="M3 9h18" />
            </svg>
          </div>

          <div>
            <p className="text-[10px] text-indigo-500 font-medium uppercase">
              Current Store
            </p>

            <p className="text-[13px] font-semibold text-indigo-900">
              Store #{storeId}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[12px] font-semibold text-red-700">
            No store selected
          </p>

          <p className="text-[11px] text-red-600 mt-0.5">
            Please select a store from the store selector before creating a product.
          </p>
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-600">
          {error}
        </div>
      )}

      {/* SUCCESS */}

      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-600">
          Product created successfully.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT */}

        <div className="lg:col-span-2 space-y-4">

          {/* BASIC INFORMATION */}

          <Card className="p-5">
            <h3 className="text-[13px] font-semibold text-[#0F172A] mb-4">
              Basic Information
            </h3>

            <div className="space-y-4">

              <Input
                label="Product Name"
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Samsung 65 inch 4K Smart TV"
                required
              />

              <div className="grid grid-cols-2 gap-3">

                <Input
                  label="SKU"
                  value={form.sku}
                  onChange={set("sku")}
                  placeholder="Optional"
                />

                <Input
                  label="Barcode"
                  value={form.barcode}
                  onChange={set("barcode")}
                  placeholder="Optional"
                />

              </div>

              <Select
                label="Category"
                value={form.category_id}
                onChange={set("category_id")}
                placeholder={
                  loadingCategories
                    ? "Loading categories..."
                    : categories.length === 0
                    ? "No categories for this store"
                    : "Select category"
                }
                options={categories.map(
                  (category) => ({
                    value: String(category.id),
                    label: category.name,
                  })
                )}
              />

              <div>
                <label className="text-[12px] font-medium text-[#374151] block mb-1">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    set("description")(
                      e.target.value
                    )
                  }
                  placeholder="Optional product description"
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4F46E5] resize-none"
                />
              </div>

            </div>
          </Card>

          {/* PRICING */}

          <Card className="p-5">
            <h3 className="text-[13px] font-semibold text-[#0F172A] mb-4">
              Pricing
            </h3>

            <div className="grid grid-cols-2 gap-3">

              <Input
                label="Selling Price"
                value={form.price}
                onChange={set("price")}
                placeholder="0.00"
                type="number"
                required
              />

              <Input
                label="Cost Price"
                value={form.cost}
                onChange={set("cost")}
                placeholder="0.00"
                type="number"
              />

            </div>

            {margin !== null && (
              <div className="mt-4">

                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-[#64748B]">
                    Profit Margin
                  </span>

                  <span className="text-[11px] font-semibold text-emerald-600">
                    {margin}%
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          Number(margin)
                        )
                      )}%`,
                    }}
                  />
                </div>

              </div>
            )}
          </Card>

          {/* INVENTORY */}

          <Card className="p-5">

            <div className="flex items-center justify-between mb-4">

              <div>
                <h3 className="text-[13px] font-semibold text-[#0F172A]">
                  Inventory
                </h3>

                <p className="text-[11px] text-[#64748B]">
                  Configure stock tracking.
                </p>
              </div>

              <Toggle
                checked={
                  form.track_inventory
                }
                onChange={(value) =>
                  set("track_inventory")(
                    value
                  )
                }
                label="Track inventory"
              />

            </div>

            {form.track_inventory && (
              <div className="grid grid-cols-3 gap-3">

                <Input
                  label="Current Stock"
                  value={form.stock}
                  onChange={set("stock")}
                  placeholder="0"
                  type="number"
                />

                <Input
                  label="Low Stock Alert"
                  value={
                    form.low_stock_threshold
                  }
                  onChange={set(
                    "low_stock_threshold"
                  )}
                  placeholder="10"
                  type="number"
                />

                <Select
                  label="Supplier"
                  value={
                    form.supplier_id
                  }
                  onChange={set(
                    "supplier_id"
                  )}
                  placeholder={
                    loadingSuppliers
                      ? "Loading suppliers..."
                      : suppliers.length === 0
                      ? "No suppliers for this store"
                      : "Select supplier"
                  }
                  options={suppliers.map(
                    (supplier) => ({
                      value: String(
                        supplier.id
                      ),
                      label:
                        supplier.name,
                    })
                  )}
                />

              </div>
            )}

          </Card>

          {/* VARIANTS */}

          <Card className="p-5">

            <div className="flex items-center justify-between mb-4">

              <div>
                <h3 className="text-[13px] font-semibold text-[#0F172A]">
                  Product Variants
                </h3>

                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Optional options such as Size or Color.
                </p>
              </div>

              <Toggle
                checked={hasVariants}
                onChange={(value) => {

                  setHasVariants(value);

                  if (
                    value &&
                    variants.length === 0
                  ) {
                    setVariants([
                      {
                        name: "",
                        values: "",
                      },
                    ]);
                  }

                  if (!value) {
                    setVariants([]);
                  }

                }}
                label="Has variants"
              />

            </div>

            {hasVariants && (
              <div className="space-y-3">

                {variants.map(
                  (variant, index) => (

                    <div
                      key={index}
                      className="flex items-center gap-2"
                    >

                      <input
                        value={
                          variant.name
                        }
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "name",
                            e.target.value
                          )
                        }
                        placeholder="Option name"
                        className="w-36 h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
                      />

                      <input
                        value={
                          variant.values
                        }
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "values",
                            e.target.value
                          )
                        }
                        placeholder="Values: Small, Medium, Large"
                        className="flex-1 h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeVariant(
                            index
                          )
                        }
                        className="w-9 h-9 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400"
                      >
                        ×
                      </button>

                    </div>

                  )
                )}

                <button
                  type="button"
                  onClick={addVariant}
                  className="text-[12px] text-[#4F46E5] font-medium hover:text-[#4338CA]"
                >
                  + Add Option
                </button>

              </div>
            )}

          </Card>

        </div>

        {/* RIGHT */}

        <div className="space-y-4">

          {/* PRODUCT IMAGE */}

          <Card className="p-5">

            <h3 className="text-[13px] font-semibold text-[#0F172A] mb-3">
              Product Image
            </h3>

            <label className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#4F46E5]">

              {productImagePreview ? (
                <img
                  src={
                    productImagePreview
                  }
                  alt="Product preview"
                  className="w-full h-40 object-contain rounded-lg"
                />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center">
                    📷
                  </div>

                  <p className="text-[12px] text-[#64748B]">
                    Upload product image
                  </p>

                  <p className="text-[11px] text-[#94A3B8]">
                    Optional · PNG/JPG · Max 5MB
                  </p>
                </>
              )}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) =>
                  handleProductImage(
                    e.target.files?.[0] ||
                      null
                  )
                }
              />

            </label>

          </Card>

          {/* STATUS */}

          <Card className="p-5">

            <h3 className="text-[13px] font-semibold text-[#0F172A] mb-3">
              Status
            </h3>

            <div className="space-y-2">

              {[
                "active",
                "inactive",
              ].map((status) => (

                <label
                  key={status}
                  className="flex items-center gap-2.5 cursor-pointer"
                >

                  <input
                    type="radio"
                    checked={
                      form.status ===
                      status
                    }
                    onChange={() =>
                      set("status")(
                        status
                      )
                    }
                  />

                  <span className="text-[13px] text-[#374151] capitalize">
                    {status}
                  </span>

                </label>

              ))}

            </div>

          </Card>

          {/* BARCODE */}

          <Card className="p-5">

            <h3 className="text-[13px] font-semibold text-[#0F172A] mb-3">
              Barcode
            </h3>

            <div className="space-y-3">

              <div className="bg-[#F8FAFC] rounded-lg p-4 text-center">

                {form.barcode ? (
                  <p className="text-[14px] font-mono text-[#0F172A]">
                    {form.barcode}
                  </p>
                ) : (
                  <p className="text-[12px] text-[#94A3B8]">
                    No barcode entered
                  </p>
                )}

              </div>

              <label className="w-full h-9 rounded-lg border border-[#E2E8F0] text-[12px] text-[#64748B] hover:bg-[#F8FAFC] flex items-center justify-center cursor-pointer">

                Upload Barcode Image

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    handleBarcodeImage(
                      e.target.files?.[0] ||
                        null
                    )
                  }
                />

              </label>

              {barcodeImagePreview && (
                <img
                  src={
                    barcodeImagePreview
                  }
                  alt="Barcode preview"
                  className="w-full h-24 object-contain border rounded-lg"
                />
              )}

              <p className="text-[10px] text-[#94A3B8]">
                Optional. Barcode can be entered manually or uploaded as an image.
              </p>

            </div>

          </Card>

        </div>

      </div>

      {/* ACTIONS */}

      <div className="flex items-center gap-3 pb-4">

        <Button
          variant="primary"
          size="lg"
          onClick={() =>
            handleSave(false)
          }
          disabled={
            saving ||
            !storeId
          }
        >
          {saving
            ? "Saving..."
            : saved
            ? "✓ Saved!"
            : "Save Product"}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={() =>
            handleSave(true)
          }
          disabled={
            saving ||
            !storeId
          }
        >
          Save & Add Another
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          disabled={saving}
        >
          Cancel
        </Button>

      </div>

    </div>
  );
}