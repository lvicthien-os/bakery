export type OrderStatus = 'pending' | 'baking' | 'ready' | 'delivered' | 'cancelled';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type MainTab = 'dashboard' | 'orders' | 'catalog' | 'finance' | 'settings';

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  stockQuantity: number;
  minStockAlert: number;
  expiryDate?: string;
  supplierName?: string;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  recipe: RecipeItem[];
  prepTimeMinutes: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  note?: string;
}

export interface BakeryOrder {
  id: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryDate: string;
  deliveryTime: string;
  items: OrderItem[];
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  isPaidFull: boolean;
  status: OrderStatus;
  assignedStaff?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  referenceCode?: string;
  note: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  preferences?: string;
  totalSpent: number;
  orderCount: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  debtAmount: number;
  note?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  shift: string;
  attendanceToday: boolean;
  activeTask?: string;
}

export interface BakeryStoreConfig {
  shopName: string;
  phone: string;
  address: string;
  googleDriveSyncEnabled: boolean;
  googleDriveWebAppUrl: string;
  lowStockAlertEnabled: boolean;
  deliveryReminderMinutes: number;
  lastSyncedAt?: string;
}

export interface BakeryDatabase {
  ingredients: Ingredient[];
  products: Product[];
  orders: BakeryOrder[];
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  staff: StaffMember[];
  config: BakeryStoreConfig;
}
