import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Card,
  Badge,
  Button,
  Table,
  Tr,
  Td,
  Pagination,
  Modal,
  SearchBar,
} from "../../components/ui";

// ============================================================
// API
// ============================================================

const API_BASE = "http://sakuracareapi.site/rhea-pos-api";

// ============================================================
// TYPES
// ============================================================

type Supplier = {
  id: number;
  store_id: number;
  name: string;
  company_name?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: string;
};

type Product = {
  id: number;
  store_id: number;
  category_id?: number | null;
  supplier_id?: number | null;

  name: string;
  sku?: string | null;
  barcode?: string | null;

  price: number;
  cost?: number | null;

  stock?: number;
  track_inventory?: number;
  status?: string;

  category?: string | null;
  supplier?: string | null;

  variants?: ProductVariant[];
};

type ProductVariant = {
  id: number;
  product_id: number;
  store_id: number;
  name: string;
  value: string;
};

type PurchaseOrderItem = {
  id?: number;

  product_id: number;

  product_name?: string;
  sku?: string | null;

  quantity: number;
  unit_cost: number;
  total: number;

  received_quantity?: number;
};

type PurchaseOrder = {
  id: number;
  item_count?: number;
  store_id: number;
  supplier_id: number;

  po_number: string;

  order_date: string;
  expected_date?: string | null;

  notes?: string | null;

  subtotal: number;
  total: number;

  paid: number;
  balance: number;

  status:
    | "pending"
    | "in_transit"
    | "partial"
    | "received"
    | "cancelled"
    | string;

  created_at?: string;
  updated_at?: string;

  supplier?: string | null;

  items?: PurchaseOrderItem[];
};

// ============================================================
// CREATE FORM TYPES
// ============================================================

type POFormItem = {
  product_id: number | null;

  quantity: number;

  unit_cost: number;
};

type POForm = {
  supplier_id: number | null;

  expected_date: string;

  notes: string;

  items: POFormItem[];
};

// ============================================================
// RECEIVE TYPES
// ============================================================

type ReceiveItemForm = {
  id?: number;

  product_id: number;

  product_name?: string;

  sku?: string | null;

  ordered_quantity: number;

  previously_received: number;

  receive_now: number;

  unit_cost: number;

  total: number;
};

// ============================================================
// PROPS
// ============================================================

interface PurchaseOrdersProps {
  activeStoreId: number | null;
}

// ============================================================
// HELPERS
// ============================================================

function fmt(value: number | null | undefined) {
  return (
    "₱" +
    Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: string) {
  switch (status) {
    case "received":
      return (
        <Badge variant="success">
          Received
        </Badge>
      );

    case "in_transit":
      return (
        <Badge variant="info">
          In Transit
        </Badge>
      );

    case "partial":
      return (
        <Badge variant="warning">
          Partial
        </Badge>
      );

    case "pending":
      return (
        <Badge variant="neutral">
          Pending
        </Badge>
      );

    case "cancelled":
      return (
        <Badge variant="danger">
          Cancelled
        </Badge>
      );

    default:
      return (
        <Badge variant="neutral">
          {status}
        </Badge>
      );
  }
}

function getProductCost(
  product: Product | undefined
) {
  if (!product) return 0;

  return Number(
    product.cost ??
      product.price ??
      0
  );
}

function emptyPOItem(): POFormItem {
  return {
    product_id: null,
    quantity: 1,
    unit_cost: 0,
  };
}

// ============================================================
// COMPONENT
// ============================================================

export default function PurchaseOrders({
  activeStoreId,
}: PurchaseOrdersProps) {
  // ==========================================================
  // DATA
  // ==========================================================

  const [orders, setOrders] =
    useState<PurchaseOrder[]>([]);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  // ==========================================================
  // LOADING
  // ==========================================================

  const [loadingOrders, setLoadingOrders] =
    useState(false);

  const [loadingSuppliers, setLoadingSuppliers] =
    useState(false);

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  // ==========================================================
  // FILTERS
  // ==========================================================

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [page, setPage] =
    useState(1);

  const PER_PAGE = 10;

  // ==========================================================
  // MODALS
  // ==========================================================

  const [detail, setDetail] =
    useState<PurchaseOrder | null>(null);

  const [showCreate, setShowCreate] =
    useState(false);

  // ==========================================================
  // PAYMENT MODAL
  // ==========================================================

  const [showPayment, setShowPayment] =
    useState(false);

  const [paymentOrder, setPaymentOrder] =
    useState<PurchaseOrder | null>(null);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentType, setPaymentType] =
    useState<"partial" | "full">(
      "partial"
    );

  const [processingPayment, setProcessingPayment] =
    useState(false);

  // ==========================================================
  // RECEIVE MODAL
  // ==========================================================

  const [showReceive, setShowReceive] =
    useState(false);

  const [receiveOrder, setReceiveOrder] =
    useState<PurchaseOrder | null>(null);

  const [receiveItems, setReceiveItems] =
    useState<ReceiveItemForm[]>([]);

  const [processingReceive, setProcessingReceive] =
    useState(false);

  // ==========================================================
  // FORM
  // ==========================================================

  const [form, setForm] =
    useState<POForm>({
      supplier_id: null,
      expected_date: "",
      notes: "",
      items: [emptyPOItem()],
    });

  // ==========================================================
  // UI STATES
  // ==========================================================

  const [loadingDetail, setLoadingDetail] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [receiving, setReceiving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ==========================================================
  // LOAD PURCHASE ORDERS
  // ==========================================================

  const loadOrders = async (
    storeId: number
  ) => {
    try {
      setLoadingOrders(true);
      setError("");

      const url =
        `${API_BASE}/purchase_orders/list.php?store_id=${encodeURIComponent(
          storeId
        )}`;

      console.log(
        "Loading Purchase Orders:",
        url
      );

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const text =
        await response.text();

      console.log(
        "Purchase Orders RAW response:",
        text
      );

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Purchase Orders API did not return valid JSON:\n${text.substring(
            0,
            500
          )}`
        );
      }

      console.log(
        "Purchase Orders API response:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            `Failed to load purchase orders. Server returned ${response.status}.`
        );
      }

      const rows =
        Array.isArray(data.orders)
          ? data.orders
          : Array.isArray(
              data.purchase_orders
            )
          ? data.purchase_orders
          : [];

      const normalized: PurchaseOrder[] =
        rows.map((order: any) => {
          const total = Number(
            order.total ??
              order.grand_total ??
              order.total_amount ??
              order.subtotal ??
              0
          );

          const paid = Number(
            order.paid ??
              order.amount_paid ??
              0
          );

          return {
            ...order,

            id: Number(order.id),

            store_id: Number(
              order.store_id ?? storeId
            ),

            supplier_id: Number(
              order.supplier_id ?? 0
            ),

            po_number:
              order.po_number ??
              order.po_no ??
              order.number ??
              `PO-${order.id}`,

            order_date:
              order.order_date ??
              order.created_at ??
              "",

            expected_date:
              order.expected_date ??
              null,

            supplier:
              order.supplier ??
              order.supplier_name ??
              order.company_name ??
              "Unknown Supplier",

            subtotal: Number(
              order.subtotal ?? 0
            ),

            total,

            paid,

            balance: Number(
              order.balance ??
                total - paid
            ),

            status:
              order.status ??
              "pending",

            notes:
              order.notes ??
              null,

            items:
              Array.isArray(
                order.items
              )
                ? order.items.map(
                    (item: any) => ({
                      ...item,

                      id:
                        item.id !==
                          undefined &&
                        item.id !== null
                          ? Number(
                              item.id
                            )
                          : undefined,

                      product_id:
                        Number(
                          item.product_id ??
                            0
                        ),

                      product_name:
                        item.product_name ??
                        item.name ??
                        "Product",

                      sku:
                        item.sku ??
                        null,

                      quantity:
                        Number(
                          item.quantity ??
                            0
                        ),

                      received_quantity:
                        Number(
                          item.received_quantity ??
                            0
                        ),

                      unit_cost:
                        Number(
                          item.unit_cost ??
                            item.cost ??
                            0
                        ),

                      total:
                        Number(
                          item.total ??
                            item.line_total ??
                            Number(
                              item.quantity ??
                                0
                            ) *
                              Number(
                                item.unit_cost ??
                                  item.cost ??
                                  0
                              )
                        ),
                    })
                  )
                : [],
          };
        });

      setOrders(normalized);
    } catch (err) {
      console.error(
        "Load purchase orders error:",
        err
      );

      setOrders([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load purchase orders."
      );
    } finally {
      setLoadingOrders(false);
    }
  };

  // ==========================================================
  // LOAD SUPPLIERS
  // ==========================================================

  const loadSuppliers = async (
    storeId: number
  ) => {
    try {
      setLoadingSuppliers(true);

      const response =
        await fetch(
          `${API_BASE}/suppliers/list.php?store_id=${storeId}`,
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
            "Failed to load suppliers."
        );
      }

      const rows =
        Array.isArray(
          data.suppliers
        )
          ? data.suppliers
          : [];

      const normalized: Supplier[] =
        rows
          .filter(
            (supplier: any) =>
              Number(
                supplier.store_id
              ) ===
              Number(storeId)
          )
          .filter(
            (supplier: any) =>
              !supplier.status ||
              supplier.status ===
                "active"
          )
          .map(
            (supplier: any) => ({
              ...supplier,

              id: Number(
                supplier.id
              ),

              store_id: Number(
                supplier.store_id
              ),

              name:
                supplier.name ||
                supplier.company_name ||
                "",
            })
          );

      setSuppliers(normalized);
    } catch (err) {
      console.error(
        "Load suppliers error:",
        err
      );

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

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  const loadProducts = async (
    storeId: number
  ) => {
    try {
      setLoadingProducts(true);

      const response =
        await fetch(
          `${API_BASE}/products/list.php?store_id=${storeId}`,
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
            "Failed to load products."
        );
      }

      const rows =
        Array.isArray(
          data.products
        )
          ? data.products
          : [];

      const normalized: Product[] =
        rows
          .filter(
            (product: any) =>
              Number(
                product.store_id
              ) ===
              Number(storeId)
          )
          .filter(
            (product: any) =>
              !product.status ||
              product.status ===
                "active"
          )
          .map(
            (product: any) => ({
              ...product,

              id: Number(
                product.id
              ),

              store_id: Number(
                product.store_id
              ),

              category_id:
                product.category_id !==
                  null &&
                product.category_id !==
                  undefined
                  ? Number(
                      product.category_id
                    )
                  : null,

              supplier_id:
                product.supplier_id !==
                  null &&
                product.supplier_id !==
                  undefined
                  ? Number(
                      product.supplier_id
                    )
                  : null,

              price: Number(
                product.price || 0
              ),

              cost:
                product.cost !==
                    null &&
                product.cost !==
                    undefined
                  ? Number(
                      product.cost
                    )
                  : null,

              stock: Number(
                product.stock || 0
              ),
            })
          );

      setProducts(normalized);
    } catch (err) {
      console.error(
        "Load products error:",
        err
      );

      setProducts([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load products."
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  // ==========================================================
  // STORE CHANGE
  // ==========================================================

  useEffect(() => {
    setOrders([]);
    setSuppliers([]);
    setProducts([]);

    setSearch("");
    setStatusFilter("");
    setPage(1);

    setDetail(null);

    setError("");
    setSuccess("");

    if (!activeStoreId) {
      return;
    }

    loadOrders(activeStoreId);
    loadSuppliers(activeStoreId);
    loadProducts(activeStoreId);
  }, [activeStoreId]);

  // ==========================================================
  // FILTERED ORDERS
  // ==========================================================

  const filteredOrders =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const matchSearch =
            !searchValue ||
            order.po_number
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            String(
              order.supplier ||
                ""
            )
              .toLowerCase()
              .includes(
                searchValue
              );

          const matchStatus =
            !statusFilter ||
            order.status ===
              statusFilter;

          return (
            matchSearch &&
            matchStatus
          );
        }
      );
    }, [
      orders,
      search,
      statusFilter,
    ]);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const pagedOrders =
    useMemo(() => {
      const start =
        (page - 1) *
        PER_PAGE;

      return filteredOrders.slice(
        start,
        start + PER_PAGE
      );
    }, [
      filteredOrders,
      page,
    ]);

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const totalOrdered =
    useMemo(
      () =>
        orders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.total || 0
            ),
          0
        ),
      [orders]
    );

  const totalPaid =
    useMemo(
      () =>
        orders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.paid || 0
            ),
          0
        ),
      [orders]
    );

  const outstanding =
    Math.max(
      0,
      totalOrdered -
        totalPaid
    );

  const pendingDelivery =
    orders.filter(
      (order) =>
        order.status ===
          "pending" ||
        order.status ===
          "in_transit" ||
        order.status ===
          "partial"
    ).length;

  // ==========================================================
  // CREATE FORM TOTAL
  // ==========================================================

  const formTotal =
    useMemo(() => {
      return form.items.reduce(
        (sum, item) => {
          return (
            sum +
            Number(
              item.quantity || 0
            ) *
              Number(
                item.unit_cost || 0
              )
          );
        },
        0
      );
    }, [form.items]);

  // ==========================================================
  // OPEN CREATE
  // ==========================================================

  const openCreate = () => {
    setForm({
      supplier_id: null,
      expected_date: "",
      notes: "",
      items: [emptyPOItem()],
    });

    setError("");
    setSuccess("");

    setShowCreate(true);
  };

  // ==========================================================
  // CLOSE CREATE
  // ==========================================================

  const closeCreate = () => {
    if (saving) {
      return;
    }

    setShowCreate(false);

    setForm({
      supplier_id: null,
      expected_date: "",
      notes: "",
      items: [emptyPOItem()],
    });
  };

  // ==========================================================
  // UPDATE FORM ITEM
  // ==========================================================

  const updateItem = (
    index: number,
    field: keyof POFormItem,
    value: number | null
  ) => {
    setForm(
      (previous) => {
        const items = [
          ...previous.items,
        ];

        const current = {
          ...items[index],
          [field]: value,
        };

        if (
          field ===
            "product_id" &&
          value !== null
        ) {
          const product =
            products.find(
              (p) =>
                p.id ===
                Number(value)
            );

          if (product) {
            current.unit_cost =
              getProductCost(
                product
              );
          }
        }

        if (
          field ===
          "quantity"
        ) {
          current.quantity =
            Math.max(
              1,
              Number(
                value || 1
              )
            );
        }

        if (
          field ===
          "unit_cost"
        ) {
          current.unit_cost =
            Math.max(
              0,
              Number(
                value || 0
              )
            );
        }

        items[index] =
          current;

        return {
          ...previous,
          items,
        };
      }
    );
  };

  // ==========================================================
  // ADD ITEM
  // ==========================================================

  const addItem = () => {
    setForm(
      (previous) => ({
        ...previous,

        items: [
          ...previous.items,
          emptyPOItem(),
        ],
      })
    );
  };

  // ==========================================================
  // REMOVE ITEM
  // ==========================================================

  const removeItem = (
    index: number
  ) => {
    setForm(
      (previous) => {
        if (
          previous.items.length <=
          1
        ) {
          return previous;
        }

        return {
          ...previous,

          items:
            previous.items.filter(
              (_, itemIndex) =>
                itemIndex !==
                index
            ),
        };
      }
    );
  };

  // ==========================================================
  // CREATE PURCHASE ORDER
  // ==========================================================

  const createPurchaseOrder =
    async () => {
      if (!activeStoreId) {
        setError(
          "Please select a store first."
        );

        return;
      }

      setError("");
      setSuccess("");

      if (
        !form.supplier_id
      ) {
        setError(
          "Please select a supplier."
        );

        return;
      }

      if (
        form.items.length ===
        0
      ) {
        setError(
          "Add at least one product."
        );

        return;
      }

      for (
        let index = 0;
        index <
        form.items.length;
        index++
      ) {
        const item =
          form.items[index];

        if (
          !item.product_id
        ) {
          setError(
            `Please select a product for item ${
              index + 1
            }.`
          );

          return;
        }

        if (
          Number(
            item.quantity
          ) <= 0
        ) {
          setError(
            `Quantity must be greater than zero for item ${
              index + 1
            }.`
          );

          return;
        }

        if (
          Number(
            item.unit_cost
          ) < 0
        ) {
          setError(
            `Unit cost cannot be negative for item ${
              index + 1
            }.`
          );

          return;
        }
      }

      const productIds =
        form.items
          .map(
            (item) =>
              item.product_id
          )
          .filter(
            (
              id
            ): id is number =>
              id !== null
          );

      const uniqueProductIds =
        new Set(
          productIds
        );

      if (
        uniqueProductIds.size !==
        productIds.length
      ) {
        setError(
          "The same product cannot be added more than once. Increase its quantity instead."
        );

        return;
      }

      const payload = {
        store_id:
          activeStoreId,

        supplier_id:
          form.supplier_id,

        expected_date:
          form.expected_date ||
          null,

        notes:
          form.notes.trim() ||
          null,

        items:
          form.items.map(
            (item) => ({
              product_id:
                item.product_id,

              quantity:
                Number(
                  item.quantity
                ),

              unit_cost:
                Number(
                  item.unit_cost
                ),
            })
          ),
      };

      try {
        setSaving(true);

        const response =
          await fetch(
            `${API_BASE}/purchase_orders/create.php`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload
                ),
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
              "Failed to create purchase order."
          );
        }

        setSuccess(
          data.message ||
            "Purchase order created successfully."
        );

        setShowCreate(false);

        setForm({
          supplier_id: null,
          expected_date: "",
          notes: "",
          items: [
            emptyPOItem(),
          ],
        });

        await loadOrders(
          activeStoreId
        );
      } catch (err) {
        console.error(
          "Create purchase order error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to create purchase order."
        );
      } finally {
        setSaving(false);
      }
    };

  // ==========================================================
  // LOAD PO DETAIL
  // ==========================================================

  const openDetail = async (
    order: PurchaseOrder
  ) => {
    setDetail(order);
    setLoadingDetail(true);
    setError("");

    try {
      const response =
        await fetch(
          `${API_BASE}/purchase_orders/view.php?purchase_order_id=${order.id}&store_id=${order.store_id}`,
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
            "Failed to load purchase order."
        );
      }

      const serverOrder =
        data.order ||
        data.purchase_order;

      if (serverOrder) {
        const total =
          Number(
            serverOrder.total ||
              serverOrder.grand_total ||
              0
          );

        const paid =
          Number(
            serverOrder.paid ??
              serverOrder.amount_paid ??
              0
          );

        setDetail({
          ...serverOrder,

          id: Number(
            serverOrder.id
          ),

          store_id: Number(
            serverOrder.store_id
          ),

          supplier_id: Number(
            serverOrder.supplier_id
          ),

          subtotal: Number(
            serverOrder.subtotal ||
              0
          ),

          total,

          paid,

          balance: Math.max(
            0,
            Number(
              serverOrder.balance ??
                total - paid
            )
          ),

          items:
            Array.isArray(
              serverOrder.items
            )
              ? serverOrder.items.map(
                  (item: any) => ({
                    ...item,

                    id:
                      item.id !==
                        undefined &&
                      item.id !== null
                        ? Number(
                            item.id
                          )
                        : undefined,

                    product_id:
                      Number(
                        item.product_id ??
                          0
                      ),

                    product_name:
                      item.product_name ??
                      item.name ??
                      "Product",

                    quantity:
                      Number(
                        item.quantity ??
                          0
                      ),

                    received_quantity:
                      Number(
                        item.received_quantity ??
                          0
                      ),

                    unit_cost:
                      Number(
                        item.unit_cost ??
                          item.cost ??
                          0
                      ),

                    total:
                      Number(
                        item.total ??
                          item.line_total ??
                          0
                      ),
                  })
                )
              : [],
        });
      }
    } catch (err) {
      console.error(
        "Load PO detail error:",
        err
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  // ==========================================================
  // OPEN PAYMENT
  // ==========================================================

  const openPayment = (
    order: PurchaseOrder
  ) => {
    const balance = Math.max(
      0,
      Number(
        order.balance ??
          Number(order.total || 0) -
            Number(order.paid || 0)
      )
    );

    if (balance <= 0) {
      setError(
        "This purchase order is already fully paid."
      );

      return;
    }

    setPaymentOrder(order);
    setPaymentType("partial");
    setPaymentAmount("");
    setError("");
    setSuccess("");
    setShowPayment(true);
  };

  // ==========================================================
  // CLOSE PAYMENT
  // ==========================================================

  const closePayment = () => {
    if (processingPayment) {
      return;
    }

    setShowPayment(false);
    setPaymentOrder(null);
    setPaymentAmount("");
  };

  // ==========================================================
  // FULL PAYMENT
  // ==========================================================

  const selectFullPayment = () => {
    if (!paymentOrder) {
      return;
    }

    const balance =
      Math.max(
        0,
        Number(
          paymentOrder.balance ||
            0
        )
      );

    setPaymentType("full");
    setPaymentAmount(
      balance.toFixed(2)
    );
  };

  // ==========================================================
  // PARTIAL PAYMENT
  // ==========================================================

  const selectPartialPayment = () => {
    setPaymentType("partial");
    setPaymentAmount("");
  };

  // ==========================================================
  // PROCESS PAYMENT
  // ==========================================================

  const processPayment =
    async () => {
      if (!activeStoreId) {
        setError(
          "Please select a store first."
        );

        return;
      }

      if (!paymentOrder) {
        return;
      }

      const balance =
        Math.max(
          0,
          Number(
            paymentOrder.balance ||
              0
          )
        );

      const amount =
        Number(
          paymentAmount
        );

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        setError(
          "Please enter a valid payment amount."
        );

        return;
      }

      if (
        amount >
        balance + 0.001
      ) {
        setError(
          `Payment cannot exceed the remaining balance of ${fmt(
            balance
          )}.`
        );

        return;
      }

      if (
        paymentType ===
          "full" &&
        Math.abs(
          amount - balance
        ) > 0.01
      ) {
        setError(
          `Full payment must be exactly ${fmt(
            balance
          )}.`
        );

        return;
      }

      try {
        setProcessingPayment(
          true
        );

        setError("");
        setSuccess("");

        const response =
          await fetch(
            `${API_BASE}/purchase_orders/payment.php`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  purchase_order_id:
                    paymentOrder.id,

                  id:
                    paymentOrder.id,

                  store_id:
                    activeStoreId,

                  amount: Number(
                    amount.toFixed(
                      2
                    )
                  ),

                  payment_type:
                    paymentType,
                }),
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
              "Failed to process payment."
          );
        }

        setSuccess(
          data.message ||
            `${
              paymentType ===
              "full"
                ? "Full"
                : "Partial"
            } payment recorded successfully.`
        );

        setShowPayment(false);
        setPaymentOrder(null);
        setPaymentAmount("");

        await loadOrders(
          activeStoreId
        );

        if (
          detail &&
          detail.id ===
            paymentOrder.id
        ) {
          await openDetail(
            paymentOrder
          );
        }
      } catch (err) {
        console.error(
          "Payment error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to process payment."
        );
      } finally {
        setProcessingPayment(
          false
        );
      }
    };

  // ==========================================================
  // PREPARE RECEIVE ITEMS
  // ==========================================================

  const prepareReceiveItems = (
    order: PurchaseOrder
  ) => {
    const items =
      Array.isArray(
        order.items
      )
        ? order.items
        : [];

    const normalized: ReceiveItemForm[] =
      items.map(
        (item) => {
          const ordered =
            Number(
              item.quantity || 0
            );

          const previouslyReceived =
            Math.min(
              ordered,
              Math.max(
                0,
                Number(
                  item.received_quantity ||
                    0
                )
              )
            );

          const remaining =
            Math.max(
              0,
              ordered -
                previouslyReceived
            );

          return {
            id: item.id,

            product_id:
              Number(
                item.product_id
              ),

            product_name:
              item.product_name ||
              "Product",

            sku:
              item.sku ||
              null,

            ordered_quantity:
              ordered,

            previously_received:
              previouslyReceived,

            receive_now: 0,

            unit_cost:
              Number(
                item.unit_cost ||
                  0
              ),

            total:
              Number(
                item.total ||
                  ordered *
                    Number(
                      item.unit_cost ||
                        0
                    )
              ),
          };
        }
      );

    setReceiveItems(
      normalized
    );
  };

  // ==========================================================
  // OPEN RECEIVE MODAL
  // ==========================================================

  const openReceive = async (
    order: PurchaseOrder
  ) => {
    if (
      order.status ===
      "received"
    ) {
      setError(
        "This purchase order has already been fully received."
      );

      return;
    }

    setError("");
    setSuccess("");

    let currentOrder =
      order;

    // --------------------------------------------------------
    // Try loading latest detail
    // --------------------------------------------------------

    try {
      const response =
        await fetch(
          `${API_BASE}/purchase_orders/view.php?purchase_order_id=${order.id}&store_id=${order.store_id}`,
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
        response.ok &&
        data.success
      ) {
        const serverOrder =
          data.order ||
          data.purchase_order;

        if (serverOrder) {
          const total =
            Number(
              serverOrder.total ||
                serverOrder.grand_total ||
                0
            );

          const paid =
            Number(
              serverOrder.paid ??
                serverOrder.amount_paid ??
                0
            );

          currentOrder = {
            ...serverOrder,

            id: Number(
              serverOrder.id
            ),

            store_id: Number(
              serverOrder.store_id
            ),

            supplier_id: Number(
              serverOrder.supplier_id
            ),

            total,

            paid,

            balance: Math.max(
              0,
              Number(
                serverOrder.balance ??
                  total - paid
              )
            ),

            items:
              Array.isArray(
                serverOrder.items
              )
                ? serverOrder.items.map(
                    (item: any) => ({
                      ...item,

                      id:
                        item.id !==
                          undefined &&
                        item.id !== null
                          ? Number(
                              item.id
                            )
                          : undefined,

                      product_id:
                        Number(
                          item.product_id ??
                            0
                        ),

                      quantity:
                        Number(
                          item.quantity ??
                            0
                        ),

                      received_quantity:
                        Number(
                          item.received_quantity ??
                            0
                        ),

                      unit_cost:
                        Number(
                          item.unit_cost ??
                            0
                        ),

                      total:
                        Number(
                          item.total ??
                            0
                        ),
                    })
                  )
                : [],
          };
        }
      }
    } catch (err) {
      console.warn(
        "Could not refresh PO before receiving:",
        err
      );
    }

    if (
      !currentOrder.items ||
      currentOrder.items.length ===
        0
    ) {
      setError(
        "No purchase order items were found."
      );

      return;
    }

    prepareReceiveItems(
      currentOrder
    );

    setReceiveOrder(
      currentOrder
    );

    setShowReceive(true);
  };

  // ==========================================================
  // CLOSE RECEIVE
  // ==========================================================

  const closeReceive = () => {
    if (
      processingReceive ||
      receiving
    ) {
      return;
    }

    setShowReceive(false);
    setReceiveOrder(null);
    setReceiveItems([]);
  };

  // ==========================================================
  // UPDATE RECEIVE QUANTITY
  // ==========================================================

  const updateReceiveQuantity = (
    index: number,
    value: number
  ) => {
    setReceiveItems(
      (previous) => {
        const items = [
          ...previous,
        ];

        const item = {
          ...items[index],
        };

        const remaining =
          Math.max(
            0,
            item.ordered_quantity -
              item.previously_received
          );

        item.receive_now =
          Math.min(
            remaining,
            Math.max(
              0,
              Number(
                value || 0
              )
            )
          );

        items[index] =
          item;

        return items;
      }
    );
  };

  // ==========================================================
  // RECEIVE ALL
  // ==========================================================

  const receiveAll = () => {
    setReceiveItems(
      (previous) =>
        previous.map(
          (item) => ({
            ...item,

            receive_now:
              Math.max(
                0,
                item.ordered_quantity -
                  item.previously_received
              ),
          })
        )
    );
  };

  // ==========================================================
  // CLEAR RECEIVE
  // ==========================================================

  const clearReceive = () => {
    setReceiveItems(
      (previous) =>
        previous.map(
          (item) => ({
            ...item,

            receive_now: 0,
          })
        )
    );
  };

  // ==========================================================
  // RECEIVE TOTALS
  // ==========================================================

  const receiveSummary =
    useMemo(() => {
      let receiveNow = 0;
      let remaining = 0;
      let fullyReceived =
        true;

      receiveItems.forEach(
        (item) => {
          const itemRemaining =
            Math.max(
              0,
              item.ordered_quantity -
                item.previously_received
            );

          receiveNow +=
            Number(
              item.receive_now ||
                0
            );

          remaining +=
            itemRemaining;

          if (
            item.receive_now <
            itemRemaining
          ) {
            fullyReceived =
              false;
          }
        }
      );

      return {
        receiveNow,
        remaining,
        fullyReceived,
      };
    }, [
      receiveItems,
    ]);

  // ==========================================================
  // PROCESS RECEIVE
  // ==========================================================

  const processReceive =
    async () => {
      if (!activeStoreId) {
        setError(
          "Please select a store first."
        );

        return;
      }

      if (!receiveOrder) {
        return;
      }

      if (
        receiveItems.length ===
        0
      ) {
        setError(
          "No items available to receive."
        );

        return;
      }

      // ------------------------------------------------------
      // VALIDATE QUANTITIES
      // ------------------------------------------------------

      for (
        let index = 0;
        index <
        receiveItems.length;
        index++
      ) {
        const item =
          receiveItems[index];

        const remaining =
          Math.max(
            0,
            item.ordered_quantity -
              item.previously_received
          );

        const receiveNow =
          Number(
            item.receive_now
          );

        if (
          receiveNow <
          0
        ) {
          setError(
            `Invalid receiving quantity for ${
              item.product_name
            }.`
          );

          return;
        }

        if (
          receiveNow >
          remaining
        ) {
          setError(
            `You cannot receive more than the remaining quantity for ${
              item.product_name
            }.`
          );

          return;
        }
      }

      if (
        receiveSummary.receiveNow <=
        0
      ) {
        setError(
          "Enter at least one quantity to receive."
        );

        return;
      }

      const isFullReceive =
        receiveSummary.fullyReceived;

      const confirmed =
        window.confirm(
          isFullReceive
            ? `Receive all remaining items for ${receiveOrder.po_number}? Inventory will be updated.`
            : `Receive the entered quantities for ${receiveOrder.po_number}? Inventory will be updated.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setProcessingReceive(
          true
        );

        setReceiving(true);
        setError("");
        setSuccess("");

        const payload = {
          id: receiveOrder.id,

          purchase_order_id:
            receiveOrder.id,

          store_id:
            activeStoreId,

          receive_type:
            isFullReceive
              ? "full"
              : "partial",

          items:
            receiveItems
              .filter(
                (item) =>
                  Number(
                    item.receive_now
                  ) > 0
              )
             .map(
  (item) => ({
    item_id: item.id,

    received_quantity:
      Number(
        item.receive_now
      ),
  })
),
        };

        console.log(
          "Receive Purchase Order payload:",
          payload
        );

        const response =
          await fetch(
            `${API_BASE}/purchase_orders/receive.php`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        const text =
          await response.text();

        let data: any;

        try {
          data =
            JSON.parse(text);
        } catch {
          throw new Error(
            `Receive API did not return valid JSON:\n${text.substring(
              0,
              500
            )}`
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to receive purchase order."
          );
        }

        setSuccess(
          data.message ||
            (isFullReceive
              ? "Purchase order fully received successfully."
              : "Purchase order partially received successfully.")
        );

        setShowReceive(false);
        setReceiveOrder(null);
        setReceiveItems([]);

        await loadOrders(
          activeStoreId
        );

        if (
          detail &&
          detail.id ===
            receiveOrder.id
        ) {
          setDetail(null);
        }
      } catch (err) {
        console.error(
          "Receive PO error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to receive purchase order."
        );
      } finally {
        setProcessingReceive(
          false
        );

        setReceiving(false);
      }
    };

  // ==========================================================
  // LEGACY FULL RECEIVE
  // ==========================================================

  const receivePurchaseOrder =
    async (
      order: PurchaseOrder
    ) => {
      await openReceive(order);
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Purchase Orders
          </h2>

          <p className="text-[12px] text-[#64748B] mt-0.5">
            Manage incoming stock orders from suppliers
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          disabled={!activeStoreId}
          onClick={openCreate}
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
          Create PO
        </Button>
      </div>

      {/* ======================================================
          ERROR
      ======================================================= */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 whitespace-pre-line">
          {error}
        </div>
      )}

      {/* ======================================================
          SUCCESS
      ======================================================= */}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">
          {success}
        </div>
      )}

      {/* ======================================================
          NO STORE
      ======================================================= */}

      {!activeStoreId && (
        <Card className="p-8">
          <div className="text-center">
            <p className="text-[13px] font-semibold text-[#0F172A]">
              No store selected
            </p>

            <p className="text-[12px] text-[#64748B] mt-1">
              Select a store before managing purchase orders.
            </p>
          </div>
        </Card>
      )}

      {/* ======================================================
          STATISTICS
      ======================================================= */}

      {activeStoreId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          <Card className="px-5 py-4">
            <p className="text-[11px] text-[#64748B] mb-1">
              Total Ordered
            </p>

            <p className="text-[18px] font-bold text-[#4F46E5]">
              {fmt(totalOrdered)}
            </p>
          </Card>

          <Card className="px-5 py-4">
            <p className="text-[11px] text-[#64748B] mb-1">
              Total Paid
            </p>

            <p className="text-[18px] font-bold text-emerald-600">
              {fmt(totalPaid)}
            </p>
          </Card>

          <Card className="px-5 py-4">
            <p className="text-[11px] text-[#64748B] mb-1">
              Outstanding
            </p>

            <p className="text-[18px] font-bold text-amber-600">
              {fmt(outstanding)}
            </p>
          </Card>

          <Card className="px-5 py-4">
            <p className="text-[11px] text-[#64748B] mb-1">
              Pending Delivery
            </p>

            <p className="text-[18px] font-bold text-sky-600">
              {pendingDelivery}{" "}
              {pendingDelivery === 1
                ? "order"
                : "orders"}
            </p>
          </Card>

        </div>
      )}

      {/* ======================================================
          FILTERS
      ======================================================= */}

      {activeStoreId && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">

            <SearchBar
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search PO number or supplier..."
            />

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value
                );

                setPage(1);
              }}
              className="h-9 px-3 text-[12px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="">
                All Status
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="in_transit">
                In Transit
              </option>

              <option value="partial">
                Partial
              </option>

              <option value="received">
                Received
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>

            {(search ||
              statusFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setPage(1);
                }}
                className="text-[12px] text-[#64748B] hover:text-[#374151] underline"
              >
                Clear filters
              </button>
            )}

            <span className="text-[12px] text-[#94A3B8] ml-auto">
              {filteredOrders.length}{" "}
              results
            </span>
          </div>
        </Card>
      )}

      {/* ======================================================
          TABLE
      ======================================================= */}

      {activeStoreId && (
        <Card>
          {loadingOrders ? (
            <div className="py-12 text-center text-[12px] text-[#94A3B8]">
              Loading purchase orders...
            </div>
          ) : pagedOrders.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[13px] font-semibold text-[#475569]">
                No purchase orders found
              </p>

              <p className="text-[12px] text-[#94A3B8] mt-1">
                Create a purchase order to start receiving stock.
              </p>
            </div>
          ) : (
            <>
              <Table
                headers={[
                  "PO Number",
                  "Supplier",
                  "Date",
                  "Expected",
                  "Items",
                  "Total",
                  "Paid",
                  "Balance",
                  "Status",
                  "Actions",
                ]}
              >
                {pagedOrders.map(
                  (order) => (
                    <Tr
                      key={order.id}
                      onClick={() =>
                        openDetail(order)
                      }
                    >
                      <Td mono>
                        <span className="text-[#4F46E5] font-medium">
                          {order.po_number}
                        </span>
                      </Td>

                      <Td>
                        <span className="font-medium text-[#0F172A]">
                          {order.supplier ||
                            "Unknown Supplier"}
                        </span>
                      </Td>

                      <Td>
                        <span className="text-[#64748B] text-[12px]">
                          {formatDate(
                            order.order_date
                          )}
                        </span>
                      </Td>

                      <Td>
                        <span className="text-[#64748B] text-[12px]">
                          {formatDate(
                            order.expected_date
                          )}
                        </span>
                      </Td>

                      <Td>
  <span className="bg-[#F1F5F9] text-[#475569] text-[11px] font-medium px-2 py-0.5 rounded-md">
    {Number(
      order.item_count ??
      order.items?.length ??
      0
    )}
  </span>
</Td>

                      <Td>
                        <span className="font-semibold text-[#0F172A]">
                          {fmt(order.total)}
                        </span>
                      </Td>

                      <Td>
                        <span className="text-emerald-600 font-medium">
                          {fmt(order.paid)}
                        </span>
                      </Td>

                      <Td>
                        {Number(
                          order.balance || 0
                        ) > 0 ? (
                          <span className="text-amber-600 font-semibold">
                            {fmt(
                              order.balance
                            )}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">
                            —
                          </span>
                        )}
                      </Td>

                      <Td>
                        {statusBadge(
                          order.status
                        )}
                      </Td>

                      <Td>
                        <div
                          className="flex items-center gap-1 flex-wrap"
                          onClick={(
                            event
                          ) =>
                            event.stopPropagation()
                          }
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openDetail(
                                order
                              )
                            }
                          >
                            View
                          </Button>

                          {Number(
                            order.balance || 0
                          ) > 0 &&
                            order.status !==
                              "cancelled" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  openPayment(
                                    order
                                  )
                                }
                              >
                                Pay
                              </Button>
                            )}

                          {order.status !==
                            "received" &&
                            order.status !==
                              "cancelled" && (
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={
                                  receiving
                                }
                                onClick={() =>
                                  receivePurchaseOrder(
                                    order
                                  )
                                }
                              >
                                Receive
                              </Button>
                            )}
                        </div>
                      </Td>
                    </Tr>
                  )
                )}
              </Table>

              <Pagination
                page={page}
                total={
                  filteredOrders.length
                }
                perPage={
                  PER_PAGE
                }
                onChange={
                  setPage
                }
              />
            </>
          )}
        </Card>
      )}

      {/* ======================================================
          PO DETAIL
      ======================================================= */}

      {detail && (
        <Modal
          title={`Purchase Order ${detail.po_number}`}
          onClose={() =>
            setDetail(null)
          }
          width="max-w-3xl"
        >
          <div className="space-y-5">

            {/* HEADER INFO */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">

              <div className="space-y-2">

                <div className="flex justify-between gap-4">
                  <span className="text-[#64748B]">
                    Supplier
                  </span>

                  <span className="font-medium text-right">
                    {detail.supplier ||
                      "Unknown Supplier"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-[#64748B]">
                    PO Number
                  </span>

                  <span className="font-medium">
                    {detail.po_number}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-[#64748B]">
                    Order Date
                  </span>

                  <span>
                    {formatDate(
                      detail.order_date
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-[#64748B]">
                    Expected Date
                  </span>

                  <span>
                    {formatDate(
                      detail.expected_date
                    )}
                  </span>
                </div>

              </div>

              <div className="space-y-2">

                <div className="flex justify-between gap-4">
                  <span className="text-[#64748B]">
                    Status
                  </span>

                  {statusBadge(
                    detail.status
                  )}
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-[#64748B]">
                    Items
                  </span>

                  <span>
                    {detail.items?.length ||
                      0}{" "}
                    lines
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-[#64748B]">
                    Total
                  </span>

                  <span className="font-bold text-[#4F46E5]">
                    {fmt(
                      detail.total
                    )}
                  </span>
                </div>

              </div>
            </div>

            {/* ==================================================
                PAYMENT SUMMARY
            =================================================== */}

            <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">

              <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#0F172A]">
                      Payment Summary
                    </p>

                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Track payments made against this purchase order.
                    </p>
                  </div>

                  {Number(
                    detail.balance || 0
                  ) > 0 &&
                    detail.status !==
                      "cancelled" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          openPayment(
                            detail
                          )
                        }
                      >
                        Make Payment
                      </Button>
                    )}
                </div>
              </div>

              <div className="p-4 space-y-2 text-[13px]">

                <div className="flex justify-between">
                  <span className="text-[#64748B]">
                    Purchase Order Total
                  </span>

                  <span className="font-semibold">
                    {fmt(
                      detail.total
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#64748B]">
                    Amount Paid
                  </span>

                  <span className="text-emerald-600 font-semibold">
                    {fmt(
                      detail.paid
                    )}
                  </span>
                </div>

                <div className="flex justify-between pt-2 border-t border-[#E2E8F0]">
                  <span className="text-[#64748B]">
                    Balance Due
                  </span>

                  <span
                    className={
                      Number(
                        detail.balance ||
                          0
                      ) > 0
                        ? "text-amber-600 font-bold"
                        : "text-emerald-600 font-bold"
                    }
                  >
                    {Number(
                      detail.balance ||
                        0
                    ) > 0
                      ? fmt(
                          detail.balance
                        )
                      : "FULLY PAID"}
                  </span>
                </div>

              </div>
            </div>

            {/* ==================================================
                ITEMS
            =================================================== */}

            <div>

              <div className="flex items-center justify-between mb-3">

                <div>
                  <h3 className="text-[13px] font-semibold text-[#0F172A]">
                    Order Items
                  </h3>

                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    Ordered and received quantities.
                  </p>
                </div>

              </div>

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full text-[12px]">

                    <thead className="bg-[#F8FAFC]">

                      <tr>

                        <th className="text-left px-3 py-2 font-medium text-[#64748B]">
                          Product
                        </th>

                        <th className="text-right px-3 py-2 font-medium text-[#64748B]">
                          Ordered
                        </th>

                        <th className="text-right px-3 py-2 font-medium text-[#64748B]">
                          Received
                        </th>

                        <th className="text-right px-3 py-2 font-medium text-[#64748B]">
                          Remaining
                        </th>

                        <th className="text-right px-3 py-2 font-medium text-[#64748B]">
                          Unit Cost
                        </th>

                        <th className="text-right px-3 py-2 font-medium text-[#64748B]">
                          Total
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {loadingDetail ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-6 text-center text-[#94A3B8]"
                          >
                            Loading items...
                          </td>
                        </tr>
                      ) : detail.items &&
                        detail.items.length >
                          0 ? (
                        detail.items.map(
                          (
                            item,
                            index
                          ) => {

                            const ordered =
                              Number(
                                item.quantity ||
                                  0
                              );

                            const received =
                              Math.min(
                                ordered,
                                Math.max(
                                  0,
                                  Number(
                                    item.received_quantity ||
                                      0
                                  )
                                )
                              );

                            const remaining =
                              Math.max(
                                0,
                                ordered -
                                  received
                              );

                            return (
                              <tr
                                key={
                                  item.id ??
                                  `${item.product_id}-${index}`
                                }
                                className="border-t border-[#F1F5F9]"
                              >

                                <td className="px-3 py-2">

                                  <p className="font-medium text-[#0F172A]">
                                    {item.product_name ||
                                      "Product"}
                                  </p>

                                  {item.sku && (
                                    <p className="text-[11px] text-[#94A3B8]">
                                      {
                                        item.sku
                                      }
                                    </p>
                                  )}

                                </td>

                                <td className="px-3 py-2 text-right">
                                  {ordered}
                                </td>

                                <td className="px-3 py-2 text-right">

                                  <span
                                    className={
                                      received >=
                                      ordered
                                        ? "text-emerald-600 font-semibold"
                                        : received >
                                          0
                                        ? "text-amber-600 font-semibold"
                                        : "text-[#64748B]"
                                    }
                                  >
                                    {received}
                                  </span>

                                </td>

                                <td className="px-3 py-2 text-right">

                                  {remaining >
                                  0 ? (
                                    <span className="text-amber-600 font-semibold">
                                      {
                                        remaining
                                      }
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 font-semibold">
                                      Complete
                                    </span>
                                  )}

                                </td>

                                <td className="px-3 py-2 text-right">
                                  {fmt(
                                    item.unit_cost
                                  )}
                                </td>

                                <td className="px-3 py-2 text-right font-semibold">
                                  {fmt(
                                    item.total
                                  )}
                                </td>

                              </tr>
                            );
                          }
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-6 text-center text-[#94A3B8]"
                          >
                            No items found.
                          </td>
                        </tr>
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

            {/* ==================================================
                NOTES
            =================================================== */}

            {detail.notes && (
              <div>

                <p className="text-[12px] font-semibold text-[#374151] mb-1">
                  Notes
                </p>

                <div className="bg-[#F8FAFC] rounded-lg px-3 py-2 text-[12px] text-[#64748B]">
                  {detail.notes}
                </div>

              </div>
            )}

            {/* ==================================================
                ACTIONS
            =================================================== */}

            <div className="flex flex-wrap gap-2">

              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  window.print()
                }
              >
                Print PO
              </Button>

              {detail.status !==
                "received" &&
                detail.status !==
                  "cancelled" && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={
                      receiving
                    }
                    onClick={() =>
                      receivePurchaseOrder(
                        detail
                      )
                    }
                  >
                    {receiving
                      ? "Receiving..."
                      : "Receive Stock"}
                  </Button>
                )}

              {Number(
                detail.balance || 0
              ) > 0 &&
                detail.status !==
                  "cancelled" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      openPayment(
                        detail
                      )
                    }
                  >
                    Make Payment
                  </Button>
                )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setDetail(null)
                }
              >
                Close
              </Button>

            </div>

          </div>
        </Modal>
      )}

      {/* ======================================================
          PAYMENT MODAL
      ======================================================= */}

      {showPayment &&
        paymentOrder && (
          <Modal
            title={`Payment — ${paymentOrder.po_number}`}
            onClose={
              closePayment
            }
            width="max-w-md"
          >
            <div className="space-y-5">

              {/* PAYMENT SUMMARY */}

              <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2 text-[13px]">

                <div className="flex justify-between">
                  <span className="text-[#64748B]">
                    PO Total
                  </span>

                  <span className="font-semibold">
                    {fmt(
                      paymentOrder.total
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#64748B]">
                    Already Paid
                  </span>

                  <span className="text-emerald-600 font-semibold">
                    {fmt(
                      paymentOrder.paid
                    )}
                  </span>
                </div>

                <div className="flex justify-between pt-2 border-t border-[#E2E8F0]">
                  <span className="text-[#64748B]">
                    Remaining Balance
                  </span>

                  <span className="text-amber-600 font-bold">
                    {fmt(
                      paymentOrder.balance
                    )}
                  </span>
                </div>

              </div>

              {/* PAYMENT TYPE */}

              <div>

                <label className="text-[12px] font-medium text-[#374151] block mb-2">
                  Payment Type
                </label>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={
                      selectPartialPayment
                    }
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      paymentType ===
                      "partial"
                        ? "border-[#4F46E5] bg-[#EEF2FF]"
                        : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <p className="text-[12px] font-semibold text-[#0F172A]">
                      Partial Payment
                    </p>

                    <p className="text-[10px] text-[#64748B] mt-1">
                      Pay only part of the balance.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={
                      selectFullPayment
                    }
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      paymentType ===
                      "full"
                        ? "border-[#10B981] bg-[#ECFDF5]"
                        : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <p className="text-[12px] font-semibold text-[#0F172A]">
                      Full Payment
                    </p>

                    <p className="text-[10px] text-[#64748B] mt-1">
                      Pay the complete remaining balance.
                    </p>
                  </button>

                </div>

              </div>

              {/* AMOUNT */}

              <div>

                <label className="text-[12px] font-medium text-[#374151] block mb-1">
                  Payment Amount
                </label>

                <div className="relative">

                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-[13px]">
                    ₱
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    max={Number(
                      paymentOrder.balance ||
                        0
                    )}
                    step="0.01"
                    value={
                      paymentAmount
                    }
                    onChange={(
                      event
                    ) => {
                      setPaymentAmount(
                        event.target
                          .value
                      );

                      setError("");
                    }}
                    placeholder="0.00"
                    className="w-full h-10 pl-8 pr-3 text-[14px] font-semibold rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
                    disabled={
                      processingPayment
                    }
                  />

                </div>

                <p className="text-[10px] text-[#94A3B8] mt-1">
                  Maximum payment:{" "}
                  {fmt(
                    paymentOrder.balance
                  )}
                </p>

              </div>

              {/* AFTER PAYMENT */}

              {Number(
                paymentAmount || 0
              ) > 0 && (
                <div className="rounded-lg border border-[#E2E8F0] px-3 py-3 text-[12px]">

                  <div className="flex justify-between">
                    <span className="text-[#64748B]">
                      Payment
                    </span>

                    <span className="font-semibold">
                      {fmt(
                        Number(
                          paymentAmount
                        )
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between mt-1">
                    <span className="text-[#64748B]">
                      Remaining After Payment
                    </span>

                    <span className="font-bold text-amber-600">
                      {fmt(
                        Math.max(
                          0,
                          Number(
                            paymentOrder.balance ||
                              0
                          ) -
                            Number(
                              paymentAmount ||
                                0
                            )
                        )
                      )}
                    </span>
                  </div>

                </div>
              )}

              {/* BUTTONS */}

              <div className="flex justify-end gap-2 pt-2">

                <Button
                  variant="secondary"
                  disabled={
                    processingPayment
                  }
                  onClick={
                    closePayment
                  }
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  disabled={
                    processingPayment ||
                    !paymentAmount ||
                    Number(
                      paymentAmount
                    ) <= 0
                  }
                  onClick={
                    processPayment
                  }
                >
                  {processingPayment
                    ? "Processing..."
                    : paymentType ===
                      "full"
                    ? "Pay Full Balance"
                    : "Record Partial Payment"}
                </Button>

              </div>

            </div>
          </Modal>
        )}

      {/* ======================================================
          PARTIAL / FULL RECEIVE MODAL
      ======================================================= */}

      {showReceive &&
        receiveOrder && (
          <Modal
            title={`Receive Stock — ${receiveOrder.po_number}`}
            onClose={
              closeReceive
            }
            width="max-w-4xl"
          >
            <div className="space-y-5">

              {/* HEADER */}

              <div className="flex flex-wrap items-start justify-between gap-3">

                <div>
                  <p className="text-[13px] font-semibold text-[#0F172A]">
                    Receive Purchase Order
                  </p>

                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Enter the quantity physically received for each item.
                  </p>
                </div>

                <div className="flex gap-2">

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      processingReceive
                    }
                    onClick={
                      clearReceive
                    }
                  >
                    Clear
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      processingReceive
                    }
                    onClick={
                      receiveAll
                    }
                  >
                    Receive All
                  </Button>

                </div>

              </div>

              {/* ITEMS */}

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full text-[12px]">

                    <thead className="bg-[#F8FAFC]">

                      <tr>

                        <th className="text-left px-3 py-3 font-medium text-[#64748B]">
                          Product
                        </th>

                        <th className="text-right px-3 py-3 font-medium text-[#64748B]">
                          Ordered
                        </th>

                        <th className="text-right px-3 py-3 font-medium text-[#64748B]">
                          Previously Received
                        </th>

                        <th className="text-right px-3 py-3 font-medium text-[#64748B]">
                          Remaining
                        </th>

                        <th className="text-right px-3 py-3 font-semibold text-[#4F46E5]">
                          Receive Now
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {receiveItems.map(
                        (
                          item,
                          index
                        ) => {

                          const remaining =
                            Math.max(
                              0,
                              item.ordered_quantity -
                                item.previously_received
                            );

                          const complete =
                            remaining ===
                            0;

                          return (
                            <tr
                              key={
                                item.id ??
                                `${item.product_id}-${index}`
                              }
                              className="border-t border-[#F1F5F9]"
                            >

                              <td className="px-3 py-3">

                                <p className="font-medium text-[#0F172A]">
                                  {
                                    item.product_name
                                  }
                                </p>

                                {item.sku && (
                                  <p className="text-[10px] text-[#94A3B8]">
                                    {
                                      item.sku
                                    }
                                  </p>
                                )}

                              </td>

                              <td className="px-3 py-3 text-right">
                                {
                                  item.ordered_quantity
                                }
                              </td>

                              <td className="px-3 py-3 text-right">

                                <span className="text-[#64748B]">
                                  {
                                    item.previously_received
                                  }
                                </span>

                              </td>

                              <td className="px-3 py-3 text-right">

                                {complete ? (
                                  <span className="text-emerald-600 font-semibold">
                                    Complete
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-semibold">
                                    {
                                      remaining
                                    }
                                  </span>
                                )}

                              </td>

                              <td className="px-3 py-3">

                                <div className="flex justify-end">

                                  <input
                                    type="number"
                                    min="0"
                                    max={
                                      remaining
                                    }
                                    step="1"
                                    value={
                                      complete
                                        ? 0
                                        : item.receive_now
                                    }
                                    disabled={
                                      complete ||
                                      processingReceive
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateReceiveQuantity(
                                        index,
                                        Number(
                                          event
                                            .target
                                            .value
                                        )
                                      )
                                    }
                                    className="w-28 h-9 px-3 text-right text-[12px] font-semibold rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                                  />

                                </div>

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* RECEIVE SUMMARY */}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">

                  <p className="text-[10px] text-[#64748B]">
                    Receiving Now
                  </p>

                  <p className="text-[18px] font-bold text-[#4F46E5] mt-1">
                    {receiveSummary.receiveNow}
                  </p>

                </div>

                <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">

                  <p className="text-[10px] text-[#64748B]">
                    Remaining After This
                  </p>

                  <p className="text-[18px] font-bold text-amber-600 mt-1">
                    {Math.max(
                      0,
                      receiveSummary.remaining -
                        receiveSummary.receiveNow
                    )}
                  </p>

                </div>

                <div
                  className={`rounded-xl border p-4 ${
                    receiveSummary.fullyReceived
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >

                  <p className="text-[10px] text-[#64748B]">
                    Result
                  </p>

                  <p
                    className={`text-[15px] font-bold mt-1 ${
                      receiveSummary.fullyReceived
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {receiveSummary.fullyReceived
                      ? "FULLY RECEIVED"
                      : "PARTIAL RECEIPT"}
                  </p>

                </div>

              </div>

              {/* INFORMATION */}

              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-[11px] text-sky-700">

                <p className="font-semibold mb-1">
                  Inventory Update
                </p>

                <p>
                  Only the quantities entered under
                  <strong> Receive Now </strong>
                  will be added to inventory.
                  Receiving the remaining quantities later
                  will update inventory again.
                </p>

              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-2 pt-2">

                <Button
                  variant="secondary"
                  disabled={
                    processingReceive
                  }
                  onClick={
                    closeReceive
                  }
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  disabled={
                    processingReceive ||
                    receiveSummary.receiveNow <=
                      0
                  }
                  onClick={
                    processReceive
                  }
                >
                  {processingReceive
                    ? "Receiving..."
                    : receiveSummary.fullyReceived
                    ? "Confirm Full Receive"
                    : "Confirm Partial Receive"}
                </Button>

              </div>

            </div>
          </Modal>
        )}

      {/* ======================================================
          CREATE PURCHASE ORDER
      ======================================================= */}

      {showCreate && (
        <Modal
          title="Create Purchase Order"
          onClose={
            closeCreate
          }
          width="max-w-3xl"
        >
          <div className="space-y-5">

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {error}
              </div>
            )}

            {/* SUPPLIER / DATE */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              <div>

                <label className="text-[12px] font-medium text-[#374151] block mb-1">
                  Supplier
                </label>

                <select
                  value={
                    form.supplier_id ??
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,

                        supplier_id:
                          event
                            .target
                            .value
                            ? Number(
                                event
                                  .target
                                  .value
                              )
                            : null,
                      })
                    )
                  }
                  disabled={
                    loadingSuppliers
                  }
                  className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="">
                    {loadingSuppliers
                      ? "Loading suppliers..."
                      : suppliers.length ===
                        0
                      ? "No suppliers available"
                      : "Select Supplier"}
                  </option>

                  {suppliers.map(
                    (
                      supplier
                    ) => (
                      <option
                        key={
                          supplier.id
                        }
                        value={
                          supplier.id
                        }
                      >
                        {
                          supplier.name
                        }
                      </option>
                    )
                  )}
                </select>

              </div>

              <div>

                <label className="text-[12px] font-medium text-[#374151] block mb-1">
                  Expected Date
                </label>

                <input
                  type="date"
                  value={
                    form.expected_date
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,

                        expected_date:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
                />

              </div>

            </div>

            {/* ITEMS */}

            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">

              <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">

                <div>

                  <p className="text-[12px] font-semibold text-[#374151]">
                    Order Items
                  </p>

                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    Select products and enter the purchase quantity.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    addItem
                  }
                  className="text-[12px] text-[#4F46E5] font-semibold hover:text-[#4338CA]"
                >
                  + Add Item
                </button>

              </div>

              <div className="p-4 space-y-3">

                {form.items.map(
                  (
                    item,
                    index
                  ) => {

                    const selectedProduct =
                      products.find(
                        (
                          product
                        ) =>
                          product.id ===
                          item.product_id
                      );

                    const lineTotal =
                      Number(
                        item.quantity ||
                          0
                      ) *
                      Number(
                        item.unit_cost ||
                          0
                      );

                    return (
                      <div
                        key={
                          index
                        }
                        className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_100px_130px_120px_32px] gap-2 items-end"
                      >

                        {/* PRODUCT */}

                        <div>

                          <label className="text-[11px] font-medium text-[#64748B] block mb-1">
                            Product
                          </label>

                          <select
                            value={
                              item.product_id ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                index,
                                "product_id",
                                event
                                  .target
                                  .value
                                  ? Number(
                                      event
                                        .target
                                        .value
                                    )
                                  : null
                              )
                            }
                            disabled={
                              loadingProducts
                            }
                            className="w-full h-9 px-2 text-[12px] rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
                          >
                            <option value="">
                              {loadingProducts
                                ? "Loading products..."
                                : products.length ===
                                  0
                                ? "No products available"
                                : "Select product"}
                            </option>

                            {products.map(
                              (
                                product
                              ) => (
                                <option
                                  key={
                                    product.id
                                  }
                                  value={
                                    product.id
                                  }
                                >
                                  {
                                    product.name
                                  }
                                  {product.sku
                                    ? ` — ${product.sku}`
                                    : ""}
                                </option>
                              )
                            )}
                          </select>

                        </div>

                        {/* QUANTITY */}

                        <div>

                          <label className="text-[11px] font-medium text-[#64748B] block mb-1">
                            Quantity
                          </label>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              item.quantity
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                index,
                                "quantity",
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              )
                            }
                            className="w-full h-9 px-2 text-[12px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
                          />

                        </div>

                        {/* UNIT COST */}

                        <div>

                          <label className="text-[11px] font-medium text-[#64748B] block mb-1">
                            Unit Cost
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.unit_cost
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                index,
                                "unit_cost",
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              )
                            }
                            className="w-full h-9 px-2 text-[12px] rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
                          />

                        </div>

                        {/* TOTAL */}

                        <div>

                          <label className="text-[11px] font-medium text-[#64748B] block mb-1">
                            Total
                          </label>

                          <div className="h-9 flex items-center justify-end px-2 rounded-lg bg-[#F8FAFC] text-[12px] font-semibold text-[#0F172A]">
                            {fmt(
                              lineTotal
                            )}
                          </div>

                        </div>

                        {/* REMOVE */}

                        <button
                          type="button"
                          disabled={
                            form.items.length <=
                            1
                          }
                          onClick={() =>
                            removeItem(
                              index
                            )
                          }
                          className="w-8 h-9 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Remove item"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>

                        {selectedProduct && (
                          <div className="md:col-span-5 text-[10px] text-[#94A3B8] -mt-1">
                            Current stock:{" "}
                            {Number(
                              selectedProduct.stock ||
                                0
                            ).toLocaleString()}
                          </div>
                        )}

                      </div>
                    );
                  }
                )}

                {/* TOTAL */}

                <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">

                  <span className="text-[12px] font-medium text-[#64748B]">
                    Purchase Order Total
                  </span>

                  <span className="text-[17px] font-bold text-[#4F46E5]">
                    {fmt(
                      formTotal
                    )}
                  </span>

                </div>

              </div>
            </div>

            {/* NOTES */}

            <div>

              <label className="text-[12px] font-medium text-[#374151] block mb-1">
                Notes
              </label>

              <textarea
                rows={3}
                value={
                  form.notes
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      previous
                    ) => ({
                      ...previous,

                      notes:
                        event
                          .target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E2E8F0] resize-none focus:outline-none focus:border-[#4F46E5]"
                placeholder="Optional notes for this purchase order..."
              />

            </div>

            {/* BUTTONS */}

            <div className="flex justify-end gap-2 pt-2">

              <Button
                variant="secondary"
                disabled={
                  saving
                }
                onClick={
                  closeCreate
                }
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                disabled={
                  saving ||
                  !activeStoreId ||
                  form.items.length ===
                    0
                }
                onClick={
                  createPurchaseOrder
                }
              >
                {saving
                  ? "Creating..."
                  : "Create Purchase Order"}
              </Button>

            </div>

          </div>
        </Modal>
      )}

    </div>
  );
}