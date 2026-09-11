import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../config/api";
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



type Category = {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  status: "active" | "inactive";
  products: number;
  sales: number;
};

function fmt(n: number) {
  return "₱" + Number(n || 0).toLocaleString("en-PH", {
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

  return `${API_BASE}${image}`;
}

export default function Categories() {
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
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/categories/list.php`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load centralized categories."
        );
      }

      setCats(Array.isArray(data.categories) ? data.categories : []);
    } catch (err) {
      console.error("Load categories error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load categories."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetImageInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
    setError("");
    resetImageInput();
    setShowModal(true);
  };

  const openEdit = (category: Category) => {
    setEditCat(category);
    setForm({
      name: category.name,
      description: category.description || "",
      status: category.status === "active",
    });
    setImageFile(null);
    setRemoveImage(false);
    setImagePreview(getImageUrl(category.image));
    setError("");
    resetImageInput();
    setShowModal(true);
  };

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
      setError("Please select a JPG, PNG, WEBP, or GIF image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must not exceed 5MB.");
      e.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);
    setRemoveImage(false);

    const reader = new FileReader();

    reader.onload = () => {
      setImagePreview(String(reader.result || ""));
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);

    if (editCat?.image) {
      setRemoveImage(true);
    }

    resetImageInput();
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("status", form.status ? "active" : "inactive");

      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (editCat) {
        formData.append("id", String(editCat.id));
        formData.append(
          "remove_image",
          removeImage ? "1" : "0"
        );
      }

      const endpoint = editCat
        ? `${API_BASE}/categories/update.php`
        : `${API_BASE}/categories/create.php`;

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to save category."
        );
      }

      setShowModal(false);
      await loadCategories();
    } catch (err) {
      console.error("Save category error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save category."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (category: Category) => {
    try {
      setSaving(true);
      setError("");

      const formData = new FormData();

      formData.append("id", String(category.id));
      formData.append(
        "name",
        category.name
      );
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
          data.message || "Unable to update category status."
        );
      }

      await loadCategories();
    } catch (err) {
      console.error("Toggle category error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update category."
      );
    } finally {
      setSaving(false);
    }
  };

  const del = async (category: Category) => {
    const confirmed = window.confirm(
      `Delete category "${category.name}"?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/categories/delete.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: category.id,
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
    } catch (err) {
      console.error("Delete category error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete category."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Categories
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            {cats.length} centralized categories
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

      {error && (
        <Card className="px-4 py-3 border border-red-200 bg-red-50">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[12px] text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </Card>
      )}

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
              Add your first centralized category.
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cats.map((c) => {
              const imageUrl = getImageUrl(c.image);

              return (
                <Card
                  key={c.id}
                  className="p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-[#EEF2FF]">
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

            <button
              type="button"
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
                          disabled={saving}
                        >
                          {c.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => del(c)}
                          disabled={saving}
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
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-600">
                {error}
              </div>
            )}

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
                disabled={saving}
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
                disabled={saving}
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
