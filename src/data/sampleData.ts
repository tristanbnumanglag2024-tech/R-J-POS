export const STORE_NAME = "Meridian Retail Co.";
export const STORE_BRANCH = "Downtown Branch";

export const categories = [
  { id: 1, name: "Electronics", products: 47, sales: 128450, status: "active", color: "#4F46E5" },
  { id: 2, name: "Clothing", products: 134, sales: 87320, status: "active", color: "#0EA5E9" },
  { id: 3, name: "Beauty & Personal Care", products: 89, sales: 62180, status: "active", color: "#EC4899" },
  { id: 4, name: "Food & Snacks", products: 212, sales: 54900, status: "active", color: "#F59E0B" },
  { id: 5, name: "Home & Kitchen", products: 76, sales: 43200, status: "active", color: "#10B981" },
  { id: 6, name: "Sports & Outdoors", products: 53, sales: 38750, status: "active", color: "#8B5CF6" },
  { id: 7, name: "Toys & Games", products: 41, sales: 29600, status: "inactive", color: "#6366F1" },
  { id: 8, name: "Office Supplies", products: 67, sales: 21400, status: "active", color: "#64748B" },
];

export const products = [
  { id: 1, image: null, name: "Samsung 65\" 4K Smart TV", sku: "ELEC-TV-001", barcode: "8801643129432", category: "Electronics", price: 1299.99, cost: 820.00, stock: 8, status: "active" },
  { id: 2, image: null, name: "AirPods Pro (2nd Gen)", sku: "ELEC-APL-002", barcode: "0194253715672", category: "Electronics", price: 249.99, cost: 160.00, stock: 24, status: "active" },
  { id: 3, image: null, name: "Men's Slim Fit Chinos", sku: "CLTH-MN-001", barcode: "7501234567890", category: "Clothing", price: 59.99, cost: 22.50, stock: 3, status: "active" },
  { id: 4, image: null, name: "Women's Running Jacket", sku: "CLTH-WN-003", barcode: "7501234567907", category: "Clothing", price: 84.99, cost: 34.00, stock: 0, status: "active" },
  { id: 5, image: null, name: "Neutrogena Hydro Boost Serum", sku: "BEAU-SK-002", barcode: "0070501061090", category: "Beauty & Personal Care", price: 32.99, cost: 14.00, stock: 56, status: "active" },
  { id: 6, image: null, name: "Dyson V15 Detect Vacuum", sku: "HOME-VC-001", barcode: "5025155009765", category: "Home & Kitchen", price: 749.99, cost: 480.00, stock: 5, status: "active" },
  { id: 7, image: null, name: "Nike Air Max 270", sku: "SPRT-NK-001", barcode: "0195244274063", category: "Sports & Outdoors", price: 139.99, cost: 72.00, stock: 18, status: "active" },
  { id: 8, image: null, name: "Lay's Classic Chips 200g", sku: "FOOD-LP-001", barcode: "0028400047685", category: "Food & Snacks", price: 3.49, cost: 1.20, stock: 220, status: "active" },
  { id: 9, image: null, name: "Canon EOS Rebel SL3", sku: "ELEC-CAM-003", barcode: "0013803304497", category: "Electronics", price: 849.99, cost: 590.00, stock: 2, status: "active" },
  { id: 10, image: null, name: "Lego Technic 4×4 Jeep", sku: "TOYS-LG-001", barcode: "5702016913231", category: "Toys & Games", price: 229.99, cost: 120.00, stock: 11, status: "inactive" },
  { id: 11, image: null, name: "Moleskine Classic Notebook A5", sku: "OFFC-ML-001", barcode: "8058341715604", category: "Office Supplies", price: 24.99, cost: 9.50, stock: 87, status: "active" },
  { id: 12, image: null, name: "Women's Linen Blazer", sku: "CLTH-WN-007", barcode: "7501234567914", category: "Clothing", price: 119.99, cost: 48.00, stock: 7, status: "active" },
];

export const transactions = [
  { id: "RCP-20240829-0041", date: "2024-08-29", time: "14:32", cashier: "Maria Santos", customer: "James Whitfield", items: 4, subtotal: 186.45, discount: 10.00, tax: 14.12, total: 190.57, payment: "Credit Card", status: "completed" },
  { id: "RCP-20240829-0040", date: "2024-08-29", time: "14:18", cashier: "Carlos Rivera", customer: "Walk-in", items: 2, subtotal: 42.98, discount: 0, tax: 3.44, total: 46.42, payment: "Cash", status: "completed" },
  { id: "RCP-20240829-0039", date: "2024-08-29", time: "13:55", cashier: "Maria Santos", customer: "Aisha Patel", items: 7, subtotal: 329.93, discount: 30.00, tax: 24.00, total: 323.93, payment: "Debit Card", status: "completed" },
  { id: "RCP-20240829-0038", date: "2024-08-29", time: "13:40", cashier: "Diego Morales", customer: "Robert Chen", items: 1, subtotal: 249.99, discount: 0, tax: 20.00, total: 269.99, payment: "Credit Card", status: "refunded" },
  { id: "RCP-20240829-0037", date: "2024-08-29", time: "13:22", cashier: "Carlos Rivera", customer: "Walk-in", items: 3, subtotal: 67.47, discount: 5.00, tax: 5.00, total: 67.47, payment: "GCash", status: "completed" },
  { id: "RCP-20240829-0036", date: "2024-08-29", time: "12:58", cashier: "Maria Santos", customer: "Priya Nair", items: 5, subtotal: 148.95, discount: 15.00, tax: 11.12, total: 145.07, payment: "Credit Card", status: "completed" },
  { id: "RCP-20240829-0035", date: "2024-08-29", time: "12:33", cashier: "Diego Morales", customer: "Walk-in", items: 2, subtotal: 28.48, discount: 0, tax: 2.28, total: 30.76, payment: "Cash", status: "completed" },
  { id: "RCP-20240829-0034", date: "2024-08-29", time: "12:10", cashier: "Maria Santos", customer: "Kevin O'Brien", items: 6, subtotal: 512.94, discount: 50.00, tax: 37.04, total: 499.98, payment: "Debit Card", status: "completed" },
  { id: "RCP-20240829-0033", date: "2024-08-29", time: "11:47", cashier: "Carlos Rivera", customer: "Walk-in", items: 1, subtotal: 3.49, discount: 0, tax: 0.28, total: 3.77, payment: "Cash", status: "completed" },
  { id: "RCP-20240829-0032", date: "2024-08-29", time: "11:22", cashier: "Diego Morales", customer: "Emma Liu", items: 3, subtotal: 174.97, discount: 20.00, tax: 12.40, total: 167.37, payment: "Credit Card", status: "completed" },
];

export const salesChartData = {
  today: [
    { hour: "8am", sales: 320 }, { hour: "9am", sales: 680 }, { hour: "10am", sales: 1240 },
    { hour: "11am", sales: 890 }, { hour: "12pm", sales: 1560 }, { hour: "1pm", sales: 1120 },
    { hour: "2pm", sales: 1890 }, { hour: "3pm", sales: 740 }, { hour: "4pm", sales: 0 },
  ],
  weekly: [
    { day: "Mon", sales: 4820 }, { day: "Tue", sales: 6340 }, { day: "Wed", sales: 5190 },
    { day: "Thu", sales: 7280 }, { day: "Fri", sales: 9640 }, { day: "Sat", sales: 12450 },
    { day: "Sun", sales: 8170 },
  ],
  monthly: [
    { week: "W1", sales: 38200 }, { week: "W2", sales: 42100 }, { week: "W3", sales: 39800 }, { week: "W4", sales: 47300 },
  ],
  byCategory: [
    { name: "Electronics", value: 128450 },
    { name: "Clothing", value: 87320 },
    { name: "Beauty", value: 62180 },
    { name: "Food", value: 54900 },
    { name: "Home", value: 43200 },
    { name: "Sports", value: 38750 },
  ],
  topProducts: [
    { name: "Samsung 65\" 4K TV", units: 14, revenue: 18199 },
    { name: "AirPods Pro 2nd Gen", units: 38, revenue: 9500 },
    { name: "Dyson V15 Vacuum", units: 11, revenue: 8250 },
    { name: "Nike Air Max 270", units: 56, revenue: 7840 },
    { name: "Canon EOS Rebel SL3", units: 9, revenue: 7650 },
  ],
};

export const inventoryItems = [
  { id: 1, name: "Samsung 65\" 4K Smart TV", sku: "ELEC-TV-001", category: "Electronics", stock: 8, minStock: 5, cost: 820.00, value: 6560, status: "in_stock", updated: "2024-08-29" },
  { id: 2, name: "AirPods Pro (2nd Gen)", sku: "ELEC-APL-002", category: "Electronics", stock: 24, minStock: 10, cost: 160.00, value: 3840, status: "in_stock", updated: "2024-08-28" },
  { id: 3, name: "Men's Slim Fit Chinos", sku: "CLTH-MN-001", category: "Clothing", stock: 3, minStock: 10, cost: 22.50, value: 67.50, status: "low_stock", updated: "2024-08-29" },
  { id: 4, name: "Women's Running Jacket", sku: "CLTH-WN-003", category: "Clothing", stock: 0, minStock: 8, cost: 34.00, value: 0, status: "out_of_stock", updated: "2024-08-27" },
  { id: 5, name: "Neutrogena Hydro Boost Serum", sku: "BEAU-SK-002", category: "Beauty & Personal Care", stock: 56, minStock: 20, cost: 14.00, value: 784, status: "in_stock", updated: "2024-08-29" },
  { id: 6, name: "Dyson V15 Detect Vacuum", sku: "HOME-VC-001", category: "Home & Kitchen", stock: 5, minStock: 3, cost: 480.00, value: 2400, status: "in_stock", updated: "2024-08-28" },
  { id: 7, name: "Nike Air Max 270", sku: "SPRT-NK-001", category: "Sports & Outdoors", stock: 18, minStock: 12, cost: 72.00, value: 1296, status: "in_stock", updated: "2024-08-29" },
  { id: 8, name: "Lay's Classic Chips 200g", sku: "FOOD-LP-001", category: "Food & Snacks", stock: 220, minStock: 50, cost: 1.20, value: 264, status: "in_stock", updated: "2024-08-29" },
  { id: 9, name: "Canon EOS Rebel SL3", sku: "ELEC-CAM-003", category: "Electronics", stock: 2, minStock: 3, cost: 590.00, value: 1180, status: "low_stock", updated: "2024-08-26" },
  { id: 10, name: "Women's Linen Blazer", sku: "CLTH-WN-007", category: "Clothing", stock: 7, minStock: 8, cost: 48.00, value: 336, status: "low_stock", updated: "2024-08-28" },
];

export const employees = [
  { id: 1, name: "Maria Santos", role: "Senior Cashier", pin: "1234" },
  { id: 2, name: "Carlos Rivera", role: "Cashier", pin: "5678" },
  { id: 3, name: "Diego Morales", role: "Cashier", pin: "9012" },
  { id: 4, name: "Admin User", role: "Store Manager", pin: "0000" },
];
