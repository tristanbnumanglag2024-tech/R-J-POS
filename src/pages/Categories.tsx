import { useEffect, useRef, useState } from "react";
import {
  Card,
  Badge,
  Button,
  Table,
  Tr,
  Td,
  Modal,
  Input,
  Toggle,
} from "../components/ui";

const API_BASE = "http://localhost/rhea-pos-api";

type Category = {
  id: number;
  store_id: number;
  name: string;
  description: string | null;
  image: string | null;
  status: "active" | "inactive";
  products: number;
  sales: number;
};

interface CategoriesProps {
  activeStoreId: number | null;
}

function fmt(n: number) {
  return "₱" + n.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: "💻",
  Clothing: "👗",
  "Beauty & Personal Care": "💄",
  "Food & Snacks": "🍿",
  "Home & Kitchen": "🏠",
  "Sports & Outdoors": "⚽",
  "Toys & Games": "🎮",
  "Office Supplies": "📎",
  Beverages: "🥤",
  Grocery: "🛒",
};

function getDefaultIcon(name: string) {
  return CATEGORY_ICONS[name] || "📦";
}

function getImageUrl(image: string | null) {
  if (!image) return null;

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `http://localhost${image}`;
}

export default function Categories({
  activeStoreId,
}: CategoriesProps) {

  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    status: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Load categories
  |--------------------------------------------------------------------------
  */

  const loadCategories = async () => {

    if (!activeStoreId) {
      setCats([]);
      return;
    }

    try {

      setLoading(true);

      const response = await fetch(
        `${API_BASE}/categories/list.php?store_id=${activeStoreId}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load categories."
        );
      }

      setCats(data.categories || []);

    } catch (error) {

      console.error("Load categories error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to load categories."
      );

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [activeStoreId]);

  /*
  |--------------------------------------------------------------------------
  | Open Add
  |--------------------------------------------------------------------------
  */

  const openAdd = () => {

    setEditCat(null);

    setForm({
      name: "",
      description: "",
      status: true,
    });

    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowModal(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Open Edit
  |--------------------------------------------------------------------------
  */

  const openEdit = (category: Category) => {

    setEditCat(category);

    setForm({
      name: category.name,
      description: category.description || "",
      status: category.status === "active",
    });

    setImageFile(null);
    setRemoveImage(false);

    setImagePreview(
      getImageUrl(category.image)
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowModal(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Image selection
  |--------------------------------------------------------------------------
  */

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file = e.target.files?.[0];

    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowed.includes(file.type)) {

      alert(
        "Please select a JPG, PNG, WEBP, or GIF image."
      );

      e.target.value = "";

      return;
    }

    if (file.size > 5 * 1024 * 1024) {

      alert("Image must not exceed 5MB.");

      e.target.value = "";

      return;
    }

    setImageFile(file);
    setRemoveImage(false);

    const reader = new FileReader();

    reader.onload = () => {
      setImagePreview(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  /*
  |--------------------------------------------------------------------------
  | Remove selected image
  |--------------------------------------------------------------------------
  */

  const handleRemoveImage = () => {

    setImageFile(null);
    setImagePreview(null);

    if (editCat?.image) {
      setRemoveImage(true);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Save
  |--------------------------------------------------------------------------
  */

  const handleSave = async () => {

    if (!activeStoreId) {

      alert("Please select a store first.");

      return;
    }

    if (!form.name.trim()) {

      alert("Category name is required.");

      return;
    }

    try {

      setSaving(true);

      const formData = new FormData();

      formData.append(
        "store_id",
        String(activeStoreId)
      );

      formData.append(
        "name",
        form.name.trim()
      );

      formData.append(
        "description",
        form.description.trim()
      );

      formData.append(
        "status",
        form.status ? "active" : "inactive"
      );

      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (editCat) {

        formData.append(
          "id",
          String(editCat.id)
        );

        formData.append(
          "remove_image",
          removeImage ? "1" : "0"
        );

      }

      const endpoint = editCat
        ? `${API_BASE}/categories/update.php`
        : `${API_BASE}/categories/create.php`;

      const response = await fetch(
        endpoint,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {

        throw new Error(
          data.message || "Unable to save category."
        );
      }

      setShowModal(false);

      await loadCategories();

    } catch (error) {

      console.error("Save category error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save category."
      );

    } finally {

      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Toggle
  |--------------------------------------------------------------------------
  */

  const toggle = async (category: Category) => {

    if (!activeStoreId) return;

    try {

      const formData = new FormData();

      formData.append("id", String(category.id));
      formData.append(
        "store_id",
        String(activeStoreId)
      );
      formData.append("name", category.name);
      formData.append(
        "description",
        category.description || ""
      );
      formData.append(
        "status",
        category.status === "active"
          ? "inactive"
          : "active"
      );

      const response = await fetch(
        `${API_BASE}/categories/update.php`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update status."
        );
      }

      await loadCategories();

    } catch (error) {

      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to update category."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  const del = async (category: Category) => {

    if (!activeStoreId) return;

    const confirmed = window.confirm(
      `Delete category "${category.name}"?`
    );

    if (!confirmed) return;

    try {

      const response = await fetch(
        `${API_BASE}/categories/delete.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: category.id,
            store_id: activeStoreId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {

        throw new Error(
          data.message || "Unable to delete category."
        );
      }

      await loadCategories();

    } catch (error) {

      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to delete category."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | No store
  |--------------------------------------------------------------------------
  */

  if (!activeStoreId) {

    return (
      <div className="p-6">
        <Card className="p-10">
          <div className="text-center">

            <div className="w-12 h-12 mx-auto rounded-xl bg-[#EEF2FF] flex items-center justify-center text-2xl mb-3">
              🏪
            </div>

            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Select a Store
            </h3>

            <p className="text-[12px] text-[#64748B] mt-1">
              Please select a store before managing categories.
            </p>

          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Categories
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            {cats.length} categories configured
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openAdd}
          icon={
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          Add Category
        </Button>

      </div>

      {/* Loading */}

      {loading ? (

        <Card className="p-10">
          <div className="text-center text-[13px] text-[#64748B]">
            Loading categories...
          </div>
        </Card>

      ) : cats.length === 0 ? (

        <Card className="p-10">

          <div className="text-center">

            <div className="w-12 h-12 mx-auto rounded-xl bg-[#F1F5F9] flex items-center justify-center text-2xl mb-3">
              📦
            </div>

            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              No categories yet
            </h3>

            <p className="text-[12px] text-[#94A3B8] mt-1">
              Add your first category for this store.
            </p>

            <div className="mt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={openAdd}
              >
                Add Category
              </Button>
            </div>

          </div>

        </Card>

      ) : (

        <>
          {/* Cards */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            {cats.map((c) => {

              const imageUrl = getImageUrl(c.image);

              return (
                <Card
                  key={c.id}
                  className="p-4 hover:shadow-md transition-shadow"
                >

                  <div className="flex items-start justify-between mb-3">

                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                      style={{
                        background: "#EEF2FF",
                      }}
                    >

                      {imageUrl ? (

                        <img
                          src={imageUrl}
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />

                      ) : (

                        <span className="text-xl">
                          {getDefaultIcon(c.name)}
                        </span>

                      )}

                    </div>

                    <Badge
                      variant={
                        c.status === "active"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {c.status === "active"
                        ? "Active"
                        : "Inactive"}
                    </Badge>

                  </div>

                  <h3 className="text-[13px] font-semibold text-[#0F172A] mb-1">
                    {c.name}
                  </h3>

                  <p className="text-[11px] text-[#94A3B8] mb-3">
                    {c.products} products
                  </p>

                  <div className="flex items-center justify-between text-[11px]">

                    <span className="text-[#64748B]">
                      Sales
                    </span>

                    <span className="font-semibold text-[#0F172A]">
                      {fmt(c.sales)}
                    </span>

                  </div>

                </Card>
              );
            })}

            {/* Add card */}

            <button
              onClick={openAdd}
              className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#4F46E5] hover:bg-[#EEF2FF]/20 transition-all group min-h-[120px]"
            >

              <div className="w-8 h-8 rounded-full bg-[#F1F5F9] group-hover:bg-[#EEF2FF] flex items-center justify-center transition-colors">

                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>

              </div>

              <span className="text-[12px] text-[#94A3B8] group-hover:text-[#4F46E5]">
                New Category
              </span>

            </button>

          </div>

          {/* Table */}

          <Card>

            <div className="px-5 py-4 border-b border-[#F1F5F9]">

              <h3 className="text-[14px] font-semibold text-[#0F172A]">
                All Categories
              </h3>

            </div>

            <Table
              headers={[
                "Category",
                "Products",
                "Sales",
                "Status",
                "Actions",
              ]}
            >

              {cats.map((c) => {

                const imageUrl = getImageUrl(c.image);

                return (
                  <Tr key={c.id}>

                    <Td>

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center overflow-hidden">

                          {imageUrl ? (

                            <img
                              src={imageUrl}
                              alt={c.name}
                              className="w-full h-full object-cover"
                            />

                          ) : (

                            <span className="text-base">
                              {getDefaultIcon(c.name)}
                            </span>

                          )}

                        </div>

                        <div>

                          <span className="text-[13px] font-medium text-[#0F172A]">
                            {c.name}
                          </span>

                          {c.description && (
                            <p className="text-[10px] text-[#94A3B8] max-w-[250px] truncate">
                              {c.description}
                            </p>
                          )}

                        </div>

                      </div>

                    </Td>

                    <Td>

                      <span className="bg-[#F1F5F9] text-[#475569] text-[11px] font-medium px-2 py-0.5 rounded-md">
                        {c.products}
                      </span>

                    </Td>

                    <Td>

                      <span className="font-semibold text-[#0F172A]">
                        {fmt(c.sales)}
                      </span>

                    </Td>

                    <Td>

                      <Badge
                        variant={
                          c.status === "active"
                            ? "success"
                            : "neutral"
                        }
                      >
                        {c.status === "active"
                          ? "Active"
                          : "Inactive"}
                      </Badge>

                    </Td>

                    <Td>

                      <div className="flex items-center gap-1">

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(c)}
                        >
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggle(c)}
                        >
                          {c.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => del(c)}
                        >
                          Delete
                        </Button>

                      </div>

                    </Td>

                  </Tr>
                );
              })}

            </Table>

          </Card>
        </>
      )}

      {/* Modal */}

      {showModal && (

        <Modal
          title={
            editCat
              ? "Edit Category"
              : "Add Category"
          }
          onClose={() => {
            if (!saving) {
              setShowModal(false);
            }
          }}
        >

          <div className="space-y-4">

            <Input
              label="Category Name"
              value={form.name}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  name: v,
                }))
              }
              placeholder="e.g. Electronics"
              required
            />

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-1">
                Description
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional category description"
                rows={3}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5] resize-none"
              />

            </div>

            {/* Image */}

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-1">
                Category Image
              </label>

              <div
                className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-4 hover:border-[#4F46E5] transition-colors cursor-pointer"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >

                {imagePreview ? (

                  <div className="flex items-center gap-4">

                    <img
                      src={imagePreview}
                      alt="Category preview"
                      className="w-16 h-16 rounded-xl object-cover border border-[#E2E8F0]"
                    />

                    <div className="flex-1">

                      <p className="text-[12px] font-medium text-[#0F172A]">
                        Category image selected
                      </p>

                      <p className="text-[10px] text-[#94A3B8] mt-1">
                        Click to replace image
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      className="text-[11px] text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>

                  </div>

                ) : (

                  <div className="flex flex-col items-center gap-2">

                    <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-xl">
                      📦
                    </div>

                    <span className="text-[12px] text-[#64748B]">
                      Upload category image
                    </span>

                    <span className="text-[10px] text-[#94A3B8]">
                      Optional — JPG, PNG, WEBP or GIF
                    </span>

                    <span className="text-[10px] text-[#94A3B8]">
                      If no image is uploaded, a default icon will be used.
                    </span>

                  </div>

                )}

              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                className="hidden"
              />

            </div>

            {/* Default icon preview */}

            {!imagePreview && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3">

                <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-xl">
                  {getDefaultIcon(form.name)}
                </div>

                <div>

                  <p className="text-[12px] font-medium text-[#0F172A]">
                    Default category icon
                  </p>

                  <p className="text-[10px] text-[#94A3B8]">
                    This icon will be used when no image is uploaded.
                  </p>

                </div>

              </div>
            )}

            <Toggle
              checked={form.status}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  status: v,
                }))
              }
              label="Active"
            />

            <div className="flex gap-3 pt-2">

              <Button
                variant="primary"
                onClick={handleSave}
              >
                {saving
                  ? "Saving..."
                  : editCat
                    ? "Save Changes"
                    : "Add Category"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>

            </div>

          </div>

        </Modal>
      )}

    </div>
  );
}