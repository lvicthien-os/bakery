import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CakeSlice,
  Wallet,
  Settings,
  Plus,
  Download,
  RefreshCw,
  AlertTriangle,
  Search,
  Clock,
  CheckCircle2,
  Users,
  Truck,
  Sparkles,
  Calendar as CalendarIcon,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  List,
  CalendarDays,
  FileText,
} from 'lucide-react';
import type {
  BakeryDatabase,
  BakeryOrder,
  Customer,
  Ingredient,
  MainTab,
  OrderStatus,
  Product,
  SyncStatus,
} from './types/bakery';
import {
  clearAllDatabaseData,
  exportDatabaseToCsv,
  hasPendingDriveSync,
  importDatabaseFromCsv,
  loadLocalDatabase,
  saveLocalDatabase,
  syncToGoogleDrive,
} from './services/storageService';
import { formatSolarWithLunar, solarToLunar } from './utils/lunarCalendar';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ làm',
  baking: 'Đang làm',
  ready: 'Sẵn sàng giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: 'bg-amber-100/90 text-amber-800 border-amber-200',
  baking: 'bg-sky-100/90 text-sky-800 border-sky-200',
  ready: 'bg-emerald-100/90 text-emerald-800 border-emerald-200',
  delivered: 'bg-slate-200/80 text-slate-700 border-slate-300',
  cancelled: 'bg-rose-100/90 text-rose-700 border-rose-200',
};

const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

function toIsoDate(year: number, monthZeroBased: number, day: number): string {
  return `${year}-${String(monthZeroBased + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseVietnameseOrIsoDate(raw: string, fallbackIso: string): string {
  const clean = raw.trim();
  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  return fallbackIso;
}

function parseMoneyNumber(raw?: string): number {
  if (!raw) return 0;
  const digits = raw.replace(/[^\d]/g, '');
  return Number(digits) || 0;
}

export function App() {
  const [db, setDb] = useState<BakeryDatabase>(() => loadLocalDatabase());
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [orderSubView, setOrderSubView] = useState<'schedule' | 'orders' | 'production'>('schedule');
  const [calendarMode, setCalendarMode] = useState<'list' | 'week' | 'month'>('month');
  const [partnerSubView, setPartnerSubView] = useState<'finance' | 'customers' | 'suppliers' | 'staff'>('finance');
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    !navigator.onLine ? 'offline' : hasPendingDriveSync() ? 'syncing' : 'synced'
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Modal Thêm nhanh
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState<'order' | 'product' | 'customer' | 'transaction'>('order');

  // Form Đơn hàng (Tạo & Sửa)
  const [editingOrder, setEditingOrder] = useState<BakeryOrder | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(() => db.products[0]?.id || '');
  const [quantity, setQuantity] = useState<string | number>('');
  const [deposit, setDeposit] = useState<string | number>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(todayIso);
  const [deliveryTime, setDeliveryTime] = useState('15:00');
  const [orderNote, setOrderNote] = useState('');

  // Thêm hàng loạt đơn bánh (giống LIT Schedule)
  const [bulkText, setBulkText] = useState('');

  // Form Dịch vụ / Sản phẩm bánh (Tạo & Sửa)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Bánh Kem');
  const [prodPrice, setProdPrice] = useState<string | number>('');
  const [prodPrepMins, setProdPrepMins] = useState<string | number>('');
  const [prodRecipe, setProdRecipe] = useState<{ ingredientId: string; quantity: number }[]>([]);

  // Form Khách hàng (Tạo & Sửa)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [cusFormName, setCusFormName] = useState('');
  const [cusFormPhone, setCusFormPhone] = useState('');
  const [cusFormPref, setCusFormPref] = useState('');

  // Form Nguyên liệu kho (Tạo & Sửa)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [newIngName, setNewIngName] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('g');
  const [newIngStock, setNewIngStock] = useState<string | number>('');
  const [newIngCost, setNewIngCost] = useState<string | number>('');
  const [newIngMin, setNewIngMin] = useState<string | number>('');

  // Form Thu / Chi (Tạo & Sửa)
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txCategory, setTxCategory] = useState('Bán lẻ tại tiệm');
  const [txAmount, setTxAmount] = useState<string | number>('');
  const [txNote, setTxNote] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const notify = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  useEffect(() => {
    saveLocalDatabase(db);
  }, [db]);

  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('syncing');
      syncToGoogleDrive(db).then((res) => {
        if (res.ok) {
          setSyncStatus('synced');
          if (res.syncedAt) {
            setDb((prev) => ({
              ...prev,
              config: { ...prev.config, lastSyncedAt: res.syncedAt },
            }));
          }
        } else {
          setSyncStatus('error');
        }
      });
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [db]);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      notify('Đang ngoại tuyến - dữ liệu đã lưu cục bộ');
      return;
    }
    setSyncStatus('syncing');
    const res = await syncToGoogleDrive(db);
    if (res.ok) {
      setSyncStatus('synced');
      setDb((prev) => ({
        ...prev,
        config: { ...prev.config, lastSyncedAt: res.syncedAt || new Date().toISOString() },
      }));
      notify('Đã đồng bộ dữ liệu');
    } else {
      setSyncStatus('error');
      notify('Đồng bộ gặp sự cố, vẫn an toàn trên máy');
    }
  };

  const handleExportCsv = () => {
    const csv = exportDatabaseToCsv(db);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UT_BAKERY_${todayIso}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Đã xuất file CSV');
  };

  const handleImportCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = importDatabaseFromCsv(text, db);
      saveLocalDatabase(imported);
      setDb(imported);
      notify('Đã nhập dữ liệu từ CSV');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi đọc file CSV');
    } finally {
      e.target.value = '';
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UTBakery_data_${todayIso}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Đã tải file JSON');
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Partial<BakeryDatabase>;
      const nextDb: BakeryDatabase = {
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
        products: Array.isArray(parsed.products) ? parsed.products : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
        staff: Array.isArray(parsed.staff) ? parsed.staff : [],
        config: {
          ...db.config,
          ...(parsed.config || {}),
        },
      };
      saveLocalDatabase(nextDb);
      setDb(nextDb);
      notify('Đã nhập dữ liệu từ JSON');
    } catch {
      notify('File JSON không hợp lệ');
    } finally {
      e.target.value = '';
    }
  };

  const handleResetAllToZero = () => {
    if (!window.confirm('Xóa toàn bộ dữ liệu đơn hàng, khách hàng, sản phẩm, kho và thu/chi về 0?')) {
      return;
    }
    const cleared = clearAllDatabaseData(db.config);
    setDb(cleared);
    notify('Đã xóa toàn bộ dữ liệu về 0');
  };

  const ingredientMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    db.ingredients.forEach((i) => map.set(i.id, i));
    return map;
  }, [db.ingredients]);

  const getProductCost = (productId: string): number => {
    const prod = db.products.find((p) => p.id === productId);
    if (!prod) return 0;
    return prod.recipe.reduce((sum, item) => {
      const ing = ingredientMap.get(item.ingredientId);
      return sum + (ing ? ing.costPerUnit * item.quantity : 0);
    }, 0);
  };

  const stats = useMemo(() => {
    const activeOrders = db.orders.filter((o) => o.status !== 'cancelled');
    const totalExpectedRevenue = activeOrders.reduce((s, o) => s + o.totalAmount, 0);
    const totalPaidOrders = activeOrders.reduce(
      (s, o) => s + (o.isPaidFull ? o.totalAmount : o.depositAmount),
      0
    );
    const totalRemainingDebt = activeOrders.reduce((s, o) => s + o.remainingAmount, 0);

    const totalIncomeTx = db.transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const totalExpenseTx = db.transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const totalCashIn = totalPaidOrders + totalIncomeTx;
    const netExpectedProfit = totalExpectedRevenue - totalExpenseTx;
    const netActualProfit = totalCashIn - totalExpenseTx;

    const lowStockItems = db.ingredients.filter((i) => i.stockQuantity <= i.minStockAlert);
    const now = new Date();
    const urgentOrders = activeOrders.filter((o) => {
      if (o.status === 'delivered') return false;
      const target = new Date(`${o.deliveryDate}T${o.deliveryTime || '23:59'}`);
      const diffMins = (target.getTime() - now.getTime()) / 60000;
      return diffMins <= (db.config.deliveryReminderMinutes || 90);
    });

    return {
      totalExpectedRevenue,
      totalCashIn,
      totalRemainingDebt,
      totalExpenseTx,
      netExpectedProfit,
      netActualProfit,
      lowStockItems,
      urgentOrders,
    };
  }, [db]);

  // Phân tích các dòng nhập hàng loạt (text nhiều dòng)
  const parsedBulkOrders = useMemo(() => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    return lines
      .map((line, idx) => {
        const parts = line.split(/\s*-\s*/);
        if (parts.length < 3) return null;
        const dishName = parts[0]?.trim() || 'Bánh đặt';
        const cusName = parts[1]?.trim() || 'Khách lẻ';
        const dateIso = parseVietnameseOrIsoDate(parts[2] || '', todayIso);
        const timeRaw = parts[3]?.trim() || '12:00';
        const timeMatch = timeRaw.match(/(\d{1,2}:\d{2})/);
        const timeVal = timeMatch ? timeMatch[1].padStart(5, '0') : '12:00';
        const totalVal = parseMoneyNumber(parts[4]);
        const depositVal = parseMoneyNumber(parts[5]);
        const noteVal = parts.slice(6).join(' - ').trim();

        return {
          index: idx,
          dishName,
          cusName,
          dateIso,
          timeVal,
          totalVal,
          depositVal,
          noteVal,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [bulkText, todayIso]);

  const handleImportBulkOrders = () => {
    if (parsedBulkOrders.length === 0) return;

    setDb((prev) => {
      const nextOrders = [...prev.orders];
      const nextCustomers = [...prev.customers];
      const nextTransactions = [...prev.transactions];

      parsedBulkOrders.forEach((b, i) => {
        const code = `UTB-${b.dateIso.slice(5, 10).replace('-', '')}-B${String(
          prev.orders.length + i + 1
        ).padStart(2, '0')}`;
        const safeDeposit = Math.min(b.depositVal, b.totalVal);
        const remaining = Math.max(0, b.totalVal - safeDeposit);

        const orderObj: BakeryOrder = {
          id: `ord-bulk-${Date.now()}-${i}`,
          orderCode: code,
          customerId: `cus-${b.cusName}`,
          customerName: b.cusName,
          customerPhone: '',
          deliveryDate: b.dateIso,
          deliveryTime: b.timeVal,
          items: [
            {
              productId: prev.products[0]?.id || 'prod-custom',
              productName: b.dishName,
              quantity: 1,
              unitPrice: b.totalVal,
              note: b.noteVal || undefined,
            },
          ],
          totalAmount: b.totalVal,
          depositAmount: safeDeposit,
          remainingAmount: remaining,
          isPaidFull: b.totalVal > 0 && remaining === 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        nextOrders.unshift(orderObj);

        const cusIdx = nextCustomers.findIndex(
          (c) => c.name.toLowerCase() === b.cusName.toLowerCase()
        );
        if (cusIdx >= 0) {
          nextCustomers[cusIdx] = {
            ...nextCustomers[cusIdx],
            totalSpent: nextCustomers[cusIdx].totalSpent + b.totalVal,
            orderCount: nextCustomers[cusIdx].orderCount + 1,
          };
        } else {
          nextCustomers.unshift({
            id: `cus-bulk-${Date.now()}-${i}`,
            name: b.cusName,
            phone: '',
            preferences: b.noteVal || undefined,
            totalSpent: b.totalVal,
            orderCount: 1,
          });
        }

        if (safeDeposit > 0) {
          nextTransactions.unshift({
            id: `tx-bulk-${Date.now()}-${i}`,
            date: todayIso,
            type: 'income',
            category: 'Tiền cọc đơn hàng',
            amount: safeDeposit,
            referenceCode: code,
            note: `Cọc đơn ${code} - ${b.cusName}`,
          });
        }
      });

      const nextDb: BakeryDatabase = {
        ...prev,
        orders: nextOrders,
        customers: nextCustomers,
        transactions: nextTransactions,
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });

    const count = parsedBulkOrders.length;
    setBulkText('');
    notify(`Đã thêm thành công ${count} đơn bánh và cập nhật đồng bộ`);
  };

  const calendarDays = useMemo(() => {
    const { year, month } = calendarCursor;
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: {
      iso: string;
      day: number;
      inMonth: boolean;
      lunarText: string;
      isSpecialLunar: boolean;
      orderCount: number;
    }[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({
        iso: '',
        day: 0,
        inMonth: false,
        lunarText: '',
        isSpecialLunar: false,
        orderCount: 0,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIsoDate(year, month, d);
      const lunar = solarToLunar(d, month + 1, year);
      const count = db.orders.filter(
        (o) => o.deliveryDate === iso && o.status !== 'cancelled'
      ).length;
      cells.push({
        iso,
        day: d,
        inMonth: true,
        lunarText: lunar.shortText,
        isSpecialLunar: lunar.isSpecialDay,
        orderCount: count,
      });
    }

    return cells;
  }, [calendarCursor, db.orders]);

  const sortedOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...db.orders]
      .filter((o) => {
        if (!q) return true;
        return (
          o.orderCode.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q) ||
          o.items.some((it) => it.productName.toLowerCase().includes(q))
        );
      })
      .sort((a, b) =>
        `${a.deliveryDate} ${a.deliveryTime}`.localeCompare(`${b.deliveryDate} ${b.deliveryTime}`)
      );
  }, [db.orders, searchQuery]);

  const ordersOnSelectedDate = useMemo(
    () => sortedOrders.filter((o) => o.deliveryDate === selectedDate),
    [sortedOrders, selectedDate]
  );

  const upcomingOrders = useMemo(
    () =>
      sortedOrders.filter(
        (o) => o.deliveryDate >= todayIso && o.status !== 'cancelled'
      ),
    [sortedOrders, todayIso]
  );

  const openQuickAdd = (
    mode: 'order' | 'product' | 'customer' | 'transaction',
    presetDate?: string
  ) => {
    setQuickAddMode(mode);
    if (mode === 'order') {
      setEditingOrder(null);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedProductId(db.products[0]?.id || '');
      setQuantity('');
      setDeposit('');
      setDeliveryDate(presetDate || selectedDate || todayIso);
      setDeliveryTime('15:00');
      setOrderNote('');
    } else if (mode === 'product') {
      setEditingProduct(null);
      setProdName('');
      setProdCategory('Bánh Kem');
      setProdPrice('');
      setProdPrepMins('');
      setProdRecipe([]);
    } else if (mode === 'customer') {
      setEditingCustomer(null);
      setCusFormName('');
      setCusFormPhone('');
      setCusFormPref('');
    } else {
      setEditingTxId(null);
      setTxType('income');
      setTxCategory('Bán lẻ tại tiệm');
      setTxAmount('');
      setTxNote('');
    }
    setQuickAddOpen(true);
  };

  const openEditOrder = (ord: BakeryOrder) => {
    setEditingOrder(ord);
    setCustomerName(ord.customerName);
    setCustomerPhone(ord.customerPhone);
    setSelectedProductId(ord.items[0]?.productId || db.products[0]?.id || '');
    setQuantity(ord.items[0]?.quantity || 1);
    setDeposit(ord.depositAmount);
    setDeliveryDate(ord.deliveryDate);
    setDeliveryTime(ord.deliveryTime);
    setOrderNote(ord.items[0]?.note || '');
    setQuickAddMode('order');
    setQuickAddOpen(true);
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const product = db.products.find((p) => p.id === selectedProductId) || db.products[0];
    const finalProductName = product ? product.name : 'Bánh theo yêu cầu';
    const finalUnitPrice = product ? product.sellingPrice : 0;
    if (!customerName.trim()) return;

    const safeQty = Math.max(1, Number(quantity) || 1);
    const total = finalUnitPrice * safeQty;
    const safeDeposit = Math.max(0, Math.min(Number(deposit) || 0, total));
    const remaining = total - safeDeposit;

    if (editingOrder) {
      setDb((prev) => {
        const nextDb: BakeryDatabase = {
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === editingOrder.id
              ? {
                  ...o,
                  customerName: customerName.trim(),
                  customerPhone: customerPhone.trim(),
                  deliveryDate,
                  deliveryTime,
                  items: [
                    {
                      productId: product?.id || o.items[0]?.productId || 'prod-custom',
                      productName: finalProductName,
                      quantity: safeQty,
                      unitPrice: finalUnitPrice,
                      note: orderNote.trim() || undefined,
                    },
                  ],
                  totalAmount: total,
                  depositAmount: safeDeposit,
                  remainingAmount: remaining,
                  isPaidFull: remaining === 0,
                }
              : o
          ),
        };
        saveLocalDatabase(nextDb);
        return nextDb;
      });
      setEditingOrder(null);
      setQuickAddOpen(false);
      notify(`Đã cập nhật đơn ${editingOrder.orderCode}`);
      return;
    }

    const code = `UTB-${deliveryDate.slice(5, 10).replace('-', '')}-${String(
      db.orders.length + 1
    ).padStart(2, '0')}`;

    const newOrder: BakeryOrder = {
      id: `ord-${Date.now()}`,
      orderCode: code,
      customerId: `cus-${customerPhone || customerName}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryDate,
      deliveryTime,
      items: [
        {
          productId: product?.id || 'prod-custom',
          productName: finalProductName,
          quantity: safeQty,
          unitPrice: finalUnitPrice,
          note: orderNote.trim() || undefined,
        },
      ],
      totalAmount: total,
      depositAmount: safeDeposit,
      remainingAmount: remaining,
      isPaidFull: remaining === 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setDb((prev) => {
      const nextTransactions = [...prev.transactions];
      if (safeDeposit > 0) {
        nextTransactions.unshift({
          id: `tx-${Date.now()}`,
          date: todayIso,
          type: 'income',
          category: remaining === 0 ? 'Thanh toán đơn bánh' : 'Tiền cọc đơn hàng',
          amount: safeDeposit,
          referenceCode: code,
          note: `${remaining === 0 ? 'Thanh toán' : 'Cọc'} đơn ${code} - ${newOrder.customerName}`,
        });
      }

      const existingCusIndex = prev.customers.findIndex(
        (c) =>
          c.name.toLowerCase() === newOrder.customerName.toLowerCase() ||
          (newOrder.customerPhone && c.phone === newOrder.customerPhone)
      );

      const nextCustomers = [...prev.customers];
      if (existingCusIndex >= 0) {
        nextCustomers[existingCusIndex] = {
          ...nextCustomers[existingCusIndex],
          phone: newOrder.customerPhone || nextCustomers[existingCusIndex].phone,
          totalSpent: nextCustomers[existingCusIndex].totalSpent + total,
          orderCount: nextCustomers[existingCusIndex].orderCount + 1,
        };
      } else {
        nextCustomers.unshift({
          id: `cus-${Date.now()}`,
          name: newOrder.customerName,
          phone: newOrder.customerPhone,
          preferences: orderNote.trim() || undefined,
          totalSpent: total,
          orderCount: 1,
        });
      }

      const nextDb: BakeryDatabase = {
        ...prev,
        orders: [newOrder, ...prev.orders],
        transactions: nextTransactions,
        customers: nextCustomers,
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });

    setSelectedDate(deliveryDate);
    setQuickAddOpen(false);
    notify(`Đã tạo đơn ${code} & lên lịch`);
  };

  const handleDeleteOrder = (ord: BakeryOrder) => {
    if (!window.confirm(`Xóa đơn hàng ${ord.orderCode} của khách ${ord.customerName}?`)) return;
    setDb((prev) => {
      const nextDb: BakeryDatabase = {
        ...prev,
        orders: prev.orders.filter((o) => o.id !== ord.id),
        transactions: prev.transactions.filter((t) => t.referenceCode !== ord.orderCode),
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    notify(`Đã xóa đơn ${ord.orderCode}`);
  };

  const handleOrderStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    setDb((prev) => {
      const target = prev.orders.find((o) => o.id === orderId);
      if (!target) return prev;

      let nextIngredients = prev.ingredients;
      if (nextStatus === 'ready' && target.status !== 'ready' && target.status !== 'delivered') {
        nextIngredients = prev.ingredients.map((ing) => {
          let deduct = 0;
          target.items.forEach((item) => {
            const prod = prev.products.find((p) => p.id === item.productId);
            const rec = prod?.recipe.find((r) => r.ingredientId === ing.id);
            if (rec) deduct += rec.quantity * item.quantity;
          });
          return deduct > 0
            ? { ...ing, stockQuantity: Math.max(0, Number((ing.stockQuantity - deduct).toFixed(2))) }
            : ing;
        });
      }

      const nextOrders = prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        const paidFull = nextStatus === 'delivered' ? true : o.isPaidFull;
        return {
          ...o,
          status: nextStatus,
          isPaidFull: paidFull,
          remainingAmount: paidFull ? 0 : o.remainingAmount,
        };
      });

      const nextTx = [...prev.transactions];
      if (nextStatus === 'delivered' && target.remainingAmount > 0) {
        nextTx.unshift({
          id: `tx-pay-${Date.now()}`,
          date: todayIso,
          type: 'income',
          category: 'Thanh toán đơn bánh',
          amount: target.remainingAmount,
          referenceCode: target.orderCode,
          note: `Tất toán đơn ${target.orderCode} - ${target.customerName}`,
        });
      }

      const nextDb: BakeryDatabase = {
        ...prev,
        orders: nextOrders,
        ingredients: nextIngredients,
        transactions: nextTx,
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    notify(`Cập nhật: ${STATUS_LABEL[nextStatus]}`);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdCategory(prod.category);
    setProdPrice(prod.sellingPrice);
    setProdPrepMins(prod.prepTimeMinutes);
    setProdRecipe([...prod.recipe]);
    setQuickAddMode('product');
    setQuickAddOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;
    const cleanRecipe = prodRecipe.filter((r) => r.ingredientId && r.quantity > 0);

    if (editingProduct) {
      setDb((prev) => {
        const nextDb: BakeryDatabase = {
          ...prev,
          products: prev.products.map((p) =>
            p.id === editingProduct.id
              ? {
                  ...p,
                  name: prodName.trim(),
                  category: prodCategory.trim() || 'Bánh',
                  sellingPrice: Number(prodPrice) || 0,
                  prepTimeMinutes: Number(prodPrepMins) || 60,
                  recipe: cleanRecipe,
                }
              : p
          ),
        };
        saveLocalDatabase(nextDb);
        return nextDb;
      });
      setEditingProduct(null);
      setQuickAddOpen(false);
      notify('Đã cập nhật dịch vụ / loại bánh');
      return;
    }

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: prodName.trim(),
      category: prodCategory.trim() || 'Bánh',
      sellingPrice: Number(prodPrice) || 0,
      prepTimeMinutes: Number(prodPrepMins) || 60,
      recipe: cleanRecipe,
    };
    setDb((prev) => {
      const nextDb: BakeryDatabase = {
        ...prev,
        products: [newProd, ...prev.products],
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    setSelectedProductId(newProd.id);
    setQuickAddOpen(false);
    notify('Đã thêm dịch vụ / loại bánh mới');
  };

  const handleDeleteProduct = (prod: Product) => {
    if (!window.confirm(`Xóa dịch vụ/bánh "${prod.name}"?`)) return;
    setDb((prev) => {
      const nextDb: BakeryDatabase = {
        ...prev,
        products: prev.products.filter((p) => p.id !== prod.id),
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    notify(`Đã xóa ${prod.name}`);
  };

  const openEditCustomer = (cus: Customer) => {
    setEditingCustomer(cus);
    setCusFormName(cus.name);
    setCusFormPhone(cus.phone);
    setCusFormPref(cus.preferences || '');
    setQuickAddMode('customer');
    setQuickAddOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cusFormName.trim()) return;

    if (editingCustomer) {
      setDb((prev) => {
        const nextDb: BakeryDatabase = {
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === editingCustomer.id
              ? {
                  ...c,
                  name: cusFormName.trim(),
                  phone: cusFormPhone.trim(),
                  preferences: cusFormPref.trim() || undefined,
                }
              : c
          ),
          orders: prev.orders.map((o) =>
            o.customerId === editingCustomer.id ||
            o.customerName.toLowerCase() === editingCustomer.name.toLowerCase()
              ? {
                  ...o,
                  customerName: cusFormName.trim(),
                  customerPhone: cusFormPhone.trim(),
                }
              : o
          ),
        };
        saveLocalDatabase(nextDb);
        return nextDb;
      });
      setEditingCustomer(null);
      setQuickAddOpen(false);
      notify('Đã cập nhật thông tin khách hàng');
      return;
    }

    setDb((prev) => {
      const nextDb: BakeryDatabase = {
        ...prev,
        customers: [
          {
            id: `cus-${Date.now()}`,
            name: cusFormName.trim(),
            phone: cusFormPhone.trim(),
            preferences: cusFormPref.trim() || undefined,
            totalSpent: 0,
            orderCount: 0,
          },
          ...prev.customers,
        ],
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    setQuickAddOpen(false);
    notify('Đã thêm khách hàng mới');
  };

  const handleDeleteCustomer = (cus: Customer) => {
    if (!window.confirm(`Xóa khách hàng "${cus.name}" và các đơn/giao dịch liên quan?`)) return;
    const relatedOrderCodes = new Set(
      db.orders
        .filter(
          (o) =>
            o.customerId === cus.id ||
            o.customerName.toLowerCase() === cus.name.toLowerCase() ||
            (cus.phone && o.customerPhone === cus.phone)
        )
        .map((o) => o.orderCode)
    );
    setDb((prev) => {
      const nextDb: BakeryDatabase = {
        ...prev,
        customers: prev.customers.filter((c) => c.id !== cus.id),
        orders: prev.orders.filter(
          (o) =>
            o.customerId !== cus.id &&
            o.customerName.toLowerCase() !== cus.name.toLowerCase() &&
            !(cus.phone && o.customerPhone === cus.phone)
        ),
        transactions: prev.transactions.filter(
          (t) => !t.referenceCode || !relatedOrderCodes.has(t.referenceCode)
        ),
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    notify(`Đã xóa khách ${cus.name} & đồng bộ dữ liệu`);
  };

  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName.trim()) return;

    if (editingIngredient) {
      setDb((prev) => {
        const nextDb: BakeryDatabase = {
          ...prev,
          ingredients: prev.ingredients.map((i) =>
            i.id === editingIngredient.id
              ? {
                  ...i,
                  name: newIngName.trim(),
                  unit: newIngUnit.trim() || 'g',
                  stockQuantity: Number(newIngStock) || 0,
                  costPerUnit: Number(newIngCost) || 0,
                  minStockAlert: Number(newIngMin) || 0,
                }
              : i
          ),
        };
        saveLocalDatabase(nextDb);
        return nextDb;
      });
      setEditingIngredient(null);
      setNewIngName('');
      notify('Đã cập nhật nguyên liệu');
      return;
    }

    setDb((prev) => {
      const nextDb: BakeryDatabase = {
        ...prev,
        ingredients: [
          {
            id: `ing-${Date.now()}`,
            name: newIngName.trim(),
            unit: newIngUnit.trim() || 'g',
            stockQuantity: Number(newIngStock) || 0,
            costPerUnit: Number(newIngCost) || 0,
            minStockAlert: Number(newIngMin) || 0,
          },
          ...prev.ingredients,
        ],
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    setNewIngName('');
    notify('Đã thêm nguyên liệu');
  };

  const startEditIngredient = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setNewIngName(ing.name);
    setNewIngUnit(ing.unit);
    setNewIngStock(ing.stockQuantity);
    setNewIngCost(ing.costPerUnit);
    setNewIngMin(ing.minStockAlert);
  };

  const handleDeleteIngredient = (ing: Ingredient) => {
    if (!window.confirm(`Xóa nguyên liệu "${ing.name}"?`)) return;
    setDb((prev) => {
      const nextDb: BakeryDatabase = {
        ...prev,
        ingredients: prev.ingredients.filter((i) => i.id !== ing.id),
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    notify(`Đã xóa ${ing.name}`);
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number(txAmount) || Number(txAmount) <= 0) return;
    setDb((prev) => {
      const nextTx = editingTxId
        ? prev.transactions.map((t) =>
            t.id === editingTxId
              ? {
                  ...t,
                  type: txType,
                  category: txCategory.trim() || (txType === 'income' ? 'Thu khác' : 'Chi khác'),
                  amount: Number(txAmount),
                  note: txNote.trim(),
                }
              : t
          )
        : [
            {
              id: `tx-${Date.now()}`,
              date: todayIso,
              type: txType,
              category: txCategory.trim() || (txType === 'income' ? 'Thu khác' : 'Chi khác'),
              amount: Number(txAmount),
              note: txNote.trim(),
            },
            ...prev.transactions,
          ];
      const nextDb: BakeryDatabase = { ...prev, transactions: nextTx };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    setEditingTxId(null);
    setTxAmount('');
    setTxNote('');
    setQuickAddOpen(false);
    notify('Đã cập nhật sổ giao dịch');
  };

  const handleDeleteTransaction = (txId: string) => {
    if (!window.confirm('Xóa phiếu giao dịch này?')) return;
    setDb((prev) => {
      const nextDb: BakeryDatabase = {
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== txId),
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    notify('Đã xóa phiếu giao dịch');
  };

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return db.transactions.filter((t) => {
      if (txFilter !== 'all' && t.type !== txFilter) return false;
      if (!q) return true;
      return (
        t.category.toLowerCase().includes(q) ||
        (t.note || '').toLowerCase().includes(q) ||
        (t.referenceCode || '').toLowerCase().includes(q)
      );
    });
  }, [db.transactions, txFilter, searchQuery]);

  const selectedDateInfo = useMemo(() => formatSolarWithLunar(selectedDate), [selectedDate]);

  const dotColorClass =
    syncStatus === 'synced'
      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.75)]'
      : syncStatus === 'syncing'
      ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.75)]'
      : syncStatus === 'offline'
      ? 'bg-slate-400'
      : 'bg-rose-500';

  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'orders', label: 'Lịch & Đơn', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'catalog', label: 'Bánh & Kho', icon: <CakeSlice className="w-4 h-4" /> },
    { id: 'finance', label: 'Tài chính', icon: <Wallet className="w-4 h-4" /> },
    { id: 'settings', label: 'Cài đặt', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header Liquid Glass sáng chuẩn LIT Schedule */}
      <header className="sticky top-0 z-30 liquid-glass border-b border-white/80">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="gold-badge px-3 py-1 rounded-full text-xs sm:text-sm tracking-wide shrink-0">
              {db.config.shopName}
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColorClass}`}
              title={syncStatus}
            />
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1 rounded-2xl border border-white/70">
            {tabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleManualSync}
              title="Đồng bộ"
              className="w-9 h-9 rounded-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center transition shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => openQuickAdd('order')}
              title="Thêm nhanh"
              className="w-9 h-9 rounded-full gold-badge flex items-center justify-center hover:brightness-105 transition"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportCsv}
              title="Xuất CSV"
              className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition shadow-sm"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {toastMsg && (
        <div className="fixed top-16 right-4 z-50 liquid-glass px-4 py-2.5 rounded-2xl text-xs font-medium text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 space-y-4">
        {(stats.urgentOrders.length > 0 || stats.lowStockItems.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.urgentOrders.length > 0 && (
              <div className="liquid-glass rounded-2xl p-3 flex items-center justify-between border-amber-300/80 bg-amber-50/70">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-amber-950">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>{stats.urgentOrders.length}</strong> đơn gần tới giờ giao hoặc quá hạn
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('orders');
                    setOrderSubView('schedule');
                  }}
                  className="text-xs font-semibold text-amber-800 underline shrink-0"
                >
                  Xem lịch
                </button>
              </div>
            )}

            {stats.lowStockItems.length > 0 && (
              <div className="liquid-glass rounded-2xl p-3 flex items-center justify-between border-rose-300/80 bg-rose-50/70">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>{stats.lowStockItems.length}</strong> nguyên liệu chạm ngưỡng cảnh báo kho
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="text-xs font-semibold text-rose-800 underline shrink-0"
                >
                  Kiểm kho
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: TỔNG QUAN + TẠO ĐƠN + NHẬP HÀNG LOẠT (GIỐNG ẢNH 1) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="liquid-glass rounded-2xl p-4">
                <div className="text-xs text-slate-500">Tổng doanh thu dự kiến</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {formatVnd(stats.totalExpectedRevenue)}
                </div>
              </div>
              <div className="liquid-glass rounded-2xl p-4">
                <div className="text-xs text-slate-500">Đã thanh toán / Thu vào</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  {formatVnd(stats.totalCashIn)}
                </div>
              </div>
              <div className="liquid-glass rounded-2xl p-4">
                <div className="text-xs text-slate-500">Công nợ còn lại</div>
                <div className="text-xl font-bold text-rose-600 mt-1">
                  {formatVnd(stats.totalRemainingDebt)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="liquid-glass rounded-2xl p-4">
                <div className="text-xs text-slate-500">Chi phí (Nguyên liệu & Vận hành)</div>
                <div className="text-xl font-bold text-rose-600 mt-1">
                  {formatVnd(stats.totalExpenseTx)}
                </div>
              </div>
              <div className="liquid-glass rounded-2xl p-4">
                <div className="text-xs text-slate-500">Lợi nhuận ròng dự kiến</div>
                <div className="text-xl font-bold text-sky-700 mt-1">
                  {formatVnd(stats.netExpectedProfit)}
                </div>
              </div>
              <div className="liquid-glass rounded-2xl p-4">
                <div className="text-xs text-slate-500">Lợi nhuận thực tế</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  {formatVnd(stats.netActualProfit)}
                </div>
              </div>
            </div>

            {/* Khối Tạo đơn bánh nhanh */}
            <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-sky-600" />
                <span>Tạo đơn bánh mới</span>
              </h2>
              <form onSubmit={handleSaveOrder} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                  >
                    {db.products.length === 0 ? (
                      <option value="">Bánh đặt theo yêu cầu</option>
                    ) : (
                      db.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatVnd(p.sellingPrice)})
                        </option>
                      ))
                    )}
                  </select>

                  <input
                    required
                    list="dash-cus-list"
                    value={customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerName(val);
                      const found = db.customers.find(
                        (c) => c.name.toLowerCase() === val.toLowerCase()
                      );
                      if (found?.phone) setCustomerPhone(found.phone);
                    }}
                    placeholder="Tên khách hàng *"
                    className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                  />
                  <datalist id="dash-cus-list">
                    {db.customers.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>

                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Số điện thoại"
                    className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)} placeholder="Số lượng (VD: 1)"
                      className="px-3 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)} placeholder="Tiền cọc (VNĐ)"
                      className="px-3 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                    />
                  </div>

                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                  />

                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                  />
                </div>

                <input
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Ghi chú (ít ngọt, viết chữ lên bánh, địa chỉ giao...)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                />

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold shadow-sm"
                >
                  Lưu đơn bánh
                </button>
              </form>
            </div>

            {/* Khối Thêm hàng loạt đơn bánh (nhập text nhiều dòng + xem trước) */}
            <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
              <div className="space-y-0.5">
                <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>Thêm hàng loạt đơn bánh</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Mỗi dòng theo thứ tự:{' '}
                  <strong>
                    Loại bánh - Tên khách - Ngày (dd/mm/yyyy) - Giờ giao - Tổng tiền - Đặt cọc - Ghi chú
                  </strong>
                </p>
              </div>

              <textarea
                rows={4}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={
                  'Nhập danh sách đơn bánh (mỗi dòng một đơn)...\nVí dụ: Bánh Kem Dâu 18cm - Nguyễn Hậu - 25/11/2026 - 16:00 - 380,000 - 150,000 - Ít ngọt'
                }
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-slate-200 text-xs sm:text-sm font-mono focus:outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-600">
                  Nhận diện sẵn sàng thêm: <strong>{parsedBulkOrders.length}</strong> đơn bánh
                </span>
                <button
                  type="button"
                  disabled={parsedBulkOrders.length === 0}
                  onClick={handleImportBulkOrders}
                  className="px-4 py-2 rounded-xl bg-sky-600 disabled:bg-slate-300 text-slate-900 text-xs sm:text-sm font-semibold"
                >
                  Thêm {parsedBulkOrders.length} đơn vào hệ thống
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-white/70 border border-white space-y-1.5">
                <div className="text-xs font-semibold text-slate-800">
                  Xem trước đơn sẽ được tạo ({parsedBulkOrders.length})
                </div>
                {parsedBulkOrders.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    Chưa có dòng hợp lệ nào để xem trước.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {parsedBulkOrders.map((item) => (
                      <div key={item.index} className="text-xs text-slate-700">
                        • <strong>{item.dishName}</strong> — {item.cusName} ({item.dateIso}{' '}
                        {item.timeVal}) — {formatVnd(item.totalVal)} (Cọc:{' '}
                        {formatVnd(item.depositVal)})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LỊCH ÂM/DƯƠNG (DANH SÁCH / TUẦN / THÁNG) & ĐƠN HÀNG (GIỐNG ẢNH 2) */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo loại bánh, khách hàng, SĐT..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white/85 border border-white text-xs sm:text-sm focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-white/80 p-1 rounded-2xl border border-white">
                <button
                  onClick={() => {
                    setOrderSubView('schedule');
                    setCalendarMode('list');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 ${
                    orderSubView === 'schedule' && calendarMode === 'list'
                      ? 'gold-badge'
                      : 'text-slate-600'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Danh sách</span>
                </button>
                <button
                  onClick={() => {
                    setOrderSubView('schedule');
                    setCalendarMode('week');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 ${
                    orderSubView === 'schedule' && calendarMode === 'week'
                      ? 'gold-badge'
                      : 'text-slate-600'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Tuần</span>
                </button>
                <button
                  onClick={() => {
                    setOrderSubView('schedule');
                    setCalendarMode('month');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 ${
                    orderSubView === 'schedule' && calendarMode === 'month'
                      ? 'gold-badge'
                      : 'text-slate-600'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Tháng</span>
                </button>
              </div>
            </div>

            {orderSubView === 'schedule' && (
              <div className="space-y-4">
                <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                      Tháng {calendarCursor.month + 1} / {calendarCursor.year}
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          setCalendarCursor((prev) =>
                            prev.month === 0
                              ? { year: prev.year - 1, month: 11 }
                              : { year: prev.year, month: prev.month - 1 }
                          )
                        }
                        className="p-2 rounded-xl bg-white/85 hover:bg-white border border-slate-200 text-slate-700"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const now = new Date();
                          setCalendarCursor({ year: now.getFullYear(), month: now.getMonth() });
                          setSelectedDate(todayIso);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
                      >
                        Hôm nay
                      </button>
                      <button
                        onClick={() =>
                          setCalendarCursor((prev) =>
                            prev.month === 11
                              ? { year: prev.year + 1, month: 0 }
                              : { year: prev.year, month: prev.month + 1 }
                          )
                        }
                        className="p-2 rounded-xl bg-white/85 hover:bg-white border border-slate-200 text-slate-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {calendarMode !== 'list' && (
                    <>
                      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500">
                        {WEEKDAYS_VI.map((w) => (
                          <div key={w} className="py-1">
                            {w}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1.5">
                        {calendarDays.map((cell, idx) => {
                          if (!cell.inMonth) {
                            return <div key={`empty-${idx}`} className="h-14 sm:h-16" />;
                          }
                          const isSelected = cell.iso === selectedDate;
                          const isToday = cell.iso === todayIso;
                          return (
                            <button
                              key={cell.iso}
                              onClick={() => setSelectedDate(cell.iso)}
                              className={`h-14 sm:h-16 rounded-2xl p-2 flex flex-col justify-between border text-left transition ${
                                isSelected
                                  ? 'bg-white border-sky-500 ring-2 ring-sky-500/30 shadow-sm'
                                  : isToday
                                  ? 'bg-amber-50/90 border-amber-300'
                                  : 'bg-white/75 hover:bg-white border-white'
                              }`}
                            >
                              <div className="flex items-baseline justify-between gap-1 w-full">
                                <div className="flex items-baseline gap-1 min-w-0">
                                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                                    {cell.day}
                                  </span>
                                  <span
                                    className={`text-[10px] truncate ${
                                      cell.isSpecialLunar
                                        ? 'text-rose-600 font-bold'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {cell.lunarText}
                                  </span>
                                </div>
                                {cell.orderCount > 0 && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-600 text-white leading-none shrink-0">
                                    {cell.orderCount}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Đơn của ngày đang chọn */}
                <div className="liquid-glass rounded-3xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-xs sm:text-sm text-slate-900">
                      Đơn giao ngày {selectedDate} ({selectedDateInfo.lunar.fullText}) (
                      {ordersOnSelectedDate.length})
                    </div>
                    <button
                      onClick={() => openQuickAdd('order', selectedDate)}
                      className="text-xs font-semibold text-sky-700 hover:underline"
                    >
                      + Tạo đơn vào ngày này
                    </button>
                  </div>

                  {ordersOnSelectedDate.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-white/65 border border-white text-center text-xs text-slate-500">
                      Không có đơn giao nào trong ngày {selectedDate}.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ordersOnSelectedDate.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-3 rounded-2xl bg-white/85 border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-lg">
                                {ord.deliveryTime}
                              </span>
                              <span className="font-semibold text-sm text-slate-900">
                                {ord.customerName}
                              </span>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[ord.status]}`}
                              >
                                {STATUS_LABEL[ord.status]}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              {ord.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                              {ord.items[0]?.note ? ` • ${ord.items[0].note}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-bold text-slate-900 mr-1">
                              {formatVnd(ord.totalAmount)}
                            </span>
                            <select
                              value={ord.status}
                              onChange={(e) =>
                                handleOrderStatusChange(ord.id, e.target.value as OrderStatus)
                              }
                              className="px-2 py-1 rounded-xl bg-slate-100 text-xs font-medium"
                            >
                              <option value="pending">Chờ làm</option>
                              <option value="baking">Đang làm</option>
                              <option value="ready">Sẵn sàng giao</option>
                              <option value="delivered">Đã giao</option>
                              <option value="cancelled">Đã hủy</option>
                            </select>
                            <button
                              onClick={() => openEditOrder(ord)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(ord)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Đơn hôm nay và sắp tới */}
                <div className="liquid-glass rounded-3xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-bold text-slate-900">
                      Đơn hôm nay và sắp tới ({upcomingOrders.length})
                    </span>
                    <span>Tên • Ngày • Giờ • Ghi chú</span>
                  </div>
                  {upcomingOrders.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-white/65 border border-white text-center text-xs text-slate-500">
                      Không có đơn bánh nào từ hôm nay trở đi.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {upcomingOrders.map((ord) => {
                        const dl = formatSolarWithLunar(ord.deliveryDate);
                        return (
                          <div
                            key={ord.id}
                            className="p-3 rounded-2xl bg-white/80 border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="text-xs sm:text-sm text-slate-800">
                              <strong>{ord.customerName}</strong> • {dl.solarLabel} (
                              {dl.lunar.shortText} ÂL) • {ord.deliveryTime} •{' '}
                              {ord.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                              {ord.items[0]?.note ? ` • ${ord.items[0].note}` : ''}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-bold text-slate-900 mr-1">
                                {formatVnd(ord.totalAmount)}
                              </span>
                              <button
                                onClick={() => openEditOrder(ord)}
                                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(ord)}
                                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DỊCH VỤ, CÔNG THỨC BÁNH & KHO NGUYÊN LIỆU */}
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Dịch vụ, Loại bánh & Công thức</h2>
                <button
                  onClick={() => openQuickAdd('product')}
                  className="gold-badge px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dịch vụ/bánh</span>
                </button>
              </div>
              <div className="space-y-2.5">
                {db.products.map((prod) => {
                  const cost = getProductCost(prod.id);
                  return (
                    <div
                      key={prod.id}
                      className="p-3.5 rounded-2xl bg-white/75 border border-white space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-slate-900">{prod.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-bold text-amber-700">
                            {formatVnd(prod.sellingPrice)}
                          </span>
                          <button
                            onClick={() => openEditProduct(prod)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600">
                        Nhóm: {prod.category} • Thời gian: ~{prod.prepTimeMinutes} phút • Giá vốn tự
                        động: <strong>{formatVnd(cost)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Kho nguyên liệu & Cảnh báo tồn</h2>
                {editingIngredient && (
                  <button
                    onClick={() => {
                      setEditingIngredient(null);
                      setNewIngName('');
                    }}
                    className="text-xs text-slate-500 underline"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveIngredient} className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <input
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  placeholder="Tên nguyên liệu"
                  className="col-span-2 px-3 py-2 rounded-xl bg-white/85 border border-white text-xs sm:text-sm"
                />
                <input
                  value={newIngUnit}
                  onChange={(e) => setNewIngUnit(e.target.value)}
                  placeholder="Đơn vị (g, ml, cái)"
                  className="px-2.5 py-2 rounded-xl bg-white/85 border border-white text-xs sm:text-sm"
                />
                <input
                  type="number"
                  value={newIngStock}
                  onChange={(e) => setNewIngStock(e.target.value)} placeholder="Tồn kho (VD: 1000)"
                  className="px-2.5 py-2 rounded-xl bg-white/85 border border-white text-xs sm:text-sm"
                />
                <input
                  type="number"
                  step="any"
                  value={newIngCost}
                  onChange={(e) => setNewIngCost(e.target.value)} placeholder="Giá vốn / đv (đ)"
                  className="px-2.5 py-2 rounded-xl bg-white/85 border border-white text-xs sm:text-sm"
                />
                <button
                  type="submit"
                  className="gold-badge rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  {editingIngredient ? 'Cập nhật' : 'Thêm kho'}
                </button>
              </form>

              <div className="space-y-2.5">
                {db.ingredients.map((ing) => {
                  const isLow = ing.stockQuantity <= ing.minStockAlert;
                  return (
                    <div
                      key={ing.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 ${
                        isLow ? 'bg-rose-50/80 border-rose-200' : 'bg-white/75 border-white'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                          <span>{ing.name}</span>
                          {isLow && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                              Sắp hết
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          Giá vốn: {formatVnd(ing.costPerUnit)}/{ing.unit} • Báo hết:{' '}
                          {ing.minStockAlert} {ing.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-sm text-slate-900 mr-1">
                          {ing.stockQuantity} {ing.unit}
                        </span>
                        <button
                          onClick={() => startEditIngredient(ing)}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteIngredient(ing)}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-rose-50 text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TÀI CHÍNH & KHÁCH HÀNG (GIỐNG ẢNH 3 & ẢNH 4) */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1 bg-white/75 p-1 rounded-2xl border border-white">
                <button
                  onClick={() => setPartnerSubView('finance')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                    partnerSubView === 'finance' ? 'gold-badge' : 'text-slate-600'
                  }`}
                >
                  Thu Chi
                </button>
                <button
                  onClick={() => setPartnerSubView('customers')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                    partnerSubView === 'customers' ? 'gold-badge' : 'text-slate-600'
                  }`}
                >
                  Khách hàng ({db.customers.length})
                </button>
                <button
                  onClick={() => setPartnerSubView('suppliers')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                    partnerSubView === 'suppliers' ? 'gold-badge' : 'text-slate-600'
                  }`}
                >
                  Nhà cung cấp
                </button>
                <button
                  onClick={() => setPartnerSubView('staff')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                    partnerSubView === 'staff' ? 'gold-badge' : 'text-slate-600'
                  }`}
                >
                  Nhân viên
                </button>
              </div>

              {partnerSubView === 'customers' && (
                <button
                  onClick={() => openQuickAdd('customer')}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm khách hàng</span>
                </button>
              )}
            </div>

            {partnerSubView === 'finance' && (
              <div className="space-y-4">
                {/* Khung Thêm khoản thu */}
                <form
                  onSubmit={(e) => {
                    setTxType('income');
                    handleAddTransaction(e);
                  }}
                  className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3"
                >
                  <h2 className="font-bold text-slate-900 text-sm">
                    + Thêm khoản thu (Bán lẻ tại tiệm, cọc bánh, thu khác...)
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      value={txType === 'income' ? txCategory : ''}
                      onChange={(e) => {
                        setTxType('income');
                        setTxCategory(e.target.value);
                      }}
                      placeholder="Tên khoản thu * (VD: Bán bánh kem tại tiệm)"
                      className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={txType === 'income' ? txAmount : ''} onChange={(e) => { setTxType('income'); setTxAmount(e.target.value); }}
                      placeholder="Số tiền thu (VNĐ) *"
                      className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                    />
                    <input
                      value={txType === 'income' ? txNote : ''}
                      onChange={(e) => {
                        setTxType('income');
                        setTxNote(e.target.value);
                      }}
                      placeholder="Ghi chú khoản thu"
                      className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    onClick={() => setTxType('income')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold"
                  >
                    Lưu khoản thu
                  </button>
                </form>

                {/* Khung Thêm khoản chi */}
                <form
                  onSubmit={(e) => {
                    setTxType('expense');
                    handleAddTransaction(e);
                  }}
                  className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3"
                >
                  <h2 className="font-bold text-slate-900 text-sm">
                    + Thêm khoản chi nguyên liệu, công làm hoặc chi phí khác
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      value={txType === 'expense' ? txCategory : ''}
                      onChange={(e) => {
                        setTxType('expense');
                        setTxCategory(e.target.value);
                      }}
                      placeholder="Tên khoản chi * (VD: Bơ lạt, Hộp bánh, Gas/Điện)"
                      className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={txType === 'expense' ? txAmount : ''} onChange={(e) => { setTxType('expense'); setTxAmount(e.target.value); }}
                      placeholder="Số tiền chi (VNĐ) *"
                      className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                    />
                    <input
                      value={txType === 'expense' ? txNote : ''}
                      onChange={(e) => {
                        setTxType('expense');
                        setTxNote(e.target.value);
                      }}
                      placeholder="Ghi chú khoản chi"
                      className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    onClick={() => setTxType('expense')}
                    className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-semibold"
                  >
                    Lưu khoản chi
                  </button>
                </form>

                {/* Danh sách Thu / Chi có bộ lọc & sửa/xóa */}
                <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold text-slate-900 text-sm">
                      Danh sách khoản thu & chi ({filteredTransactions.length})
                    </h2>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTxFilter('all')}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          txFilter === 'all' ? 'gold-badge' : 'bg-white/80 text-slate-600'
                        }`}
                      >
                        Tất cả
                      </button>
                      <button
                        onClick={() => setTxFilter('income')}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          txFilter === 'income'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white/80 text-slate-600'
                        }`}
                      >
                        Thu
                      </button>
                      <button
                        onClick={() => setTxFilter('expense')}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          txFilter === 'expense'
                            ? 'bg-rose-600 text-slate-900'
                            : 'bg-white/80 text-slate-600'
                        }`}
                      >
                        Chi
                      </button>
                    </div>
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-white/65 border border-white text-center text-xs text-slate-500">
                      Chưa có khoản thu hoặc chi nào phù hợp.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3 rounded-2xl bg-white/80 border border-white flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {tx.category}{' '}
                              {tx.referenceCode && (
                                <span className="text-xs font-normal text-slate-500">
                                  ({tx.referenceCode})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {tx.date} {tx.note ? `• ${tx.note}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div
                              className={`text-sm font-bold ${
                                tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {tx.type === 'income' ? '+' : '-'}
                              {formatVnd(tx.amount)}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTxId(tx.id);
                                setTxType(tx.type);
                                setTxCategory(tx.category);
                                setTxAmount(tx.amount);
                                setTxNote(tx.note || '');
                                setQuickAddMode('transaction');
                                setQuickAddOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {partnerSubView === 'customers' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm khách hàng theo tên hoặc SĐT..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white/85 border border-white text-xs sm:text-sm focus:outline-none"
                  />
                </div>

                {db.customers.length === 0 ? (
                  <div className="liquid-glass rounded-3xl p-6 text-center text-xs sm:text-sm text-slate-500">
                    Chưa có dữ liệu khách hàng nào.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {db.customers
                      .filter((c) => {
                        const q = searchQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          c.name.toLowerCase().includes(q) ||
                          (c.phone || '').toLowerCase().includes(q)
                        );
                      })
                      .map((c) => (
                        <div
                          key={c.id}
                          className="liquid-glass rounded-3xl p-4 flex items-start justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900">{c.name}</span>
                              <span className="text-xs font-bold text-amber-800">
                                {formatVnd(c.totalSpent)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600">
                              SĐT: {c.phone || 'Chưa cập nhật'} • {c.orderCount} đơn
                            </div>
                            {c.preferences && (
                              <div className="text-xs text-slate-500">Ghi chú: {c.preferences}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditCustomer(c)}
                              className="p-2 rounded-xl bg-white/85 hover:bg-white text-slate-700"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(c)}
                              className="p-2 rounded-xl bg-white/85 hover:bg-rose-50 text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {partnerSubView === 'suppliers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {db.suppliers.map((s) => (
                  <div key={s.id} className="liquid-glass rounded-3xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-slate-500" />
                        {s.name}
                      </span>
                      <span className="text-xs font-bold text-rose-600">
                        Nợ: {formatVnd(s.debtAmount)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">SĐT: {s.phone}</div>
                  </div>
                ))}
              </div>
            )}

            {partnerSubView === 'staff' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {db.staff.map((st) => (
                  <div key={st.id} className="liquid-glass rounded-3xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-500" />
                        {st.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {st.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Ca: {st.shift} • SĐT: {st.phone}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CÀI ĐẶT (GIỐNG ẢNH 5) */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                Cài đặt lưu trữ Google Drive & Dữ liệu
              </h2>
              <p className="text-xs text-slate-500">
                Dữ liệu lưu tự động cục bộ và đồng bộ khi có mạng. Bạn có thể tải/nhập JSON,
                xuất/nhập CSV hoặc xóa toàn bộ dữ liệu về 0.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={db.config.googleDriveWebAppUrl}
                  onChange={(e) =>
                    setDb((prev) => ({
                      ...prev,
                      config: { ...prev.config, googleDriveWebAppUrl: e.target.value },
                    }))
                  }
                  placeholder="Google Drive / Apps Script URL hoặc Client ID"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white/90 border border-slate-200 text-sm"
                />
                <button
                  onClick={handleManualSync}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đồng bộ ngay</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleExportJson}
                  className="px-3.5 py-2 rounded-xl bg-white/90 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file JSON</span>
                </button>

                <button
                  onClick={() => jsonInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-white/90 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Nhập file JSON</span>
                </button>
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJsonFile}
                  className="hidden"
                />

                <button
                  onClick={handleExportCsv}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất CSV</span>
                </button>

                <button
                  onClick={handleResetAllToZero}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa toàn bộ dữ liệu (về 0)</span>
                </button>
              </div>
            </div>

            <div className="liquid-glass rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900 text-sm">Nhập CSV</div>
                <div className="text-xs text-slate-500">
                  Khôi phục hoặc nạp dữ liệu từ file CSV (.csv) đã xuất từ UT BAKERY.
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0"
              >
                Chọn file CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportCsvFile}
                className="hidden"
              />
            </div>

            <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full gold-badge text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>LIT STUDIO — Giới thiệu ứng dụng</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                UT BAKERY — Giải pháp quản lý tiệm bánh toàn diện
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Phát triển bởi LIT STUDIO phục vụ vận hành liên tục online/offline, lịch Âm/Dương,
                quản lý đơn hàng, khách hàng, nguyên liệu, công thức và tài chính trên đa thiết bị.
              </p>
              <div className="pt-2 border-t border-slate-200/70 text-xs text-slate-700">
                Bản quyền thuộc <strong>LIT STUDIO</strong> | Hỗ trợ:{' '}
                <strong>0935 187 404 (Đặng Thiện)</strong>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Thêm nhanh & Chỉnh sửa */}
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="liquid-glass bg-white/95 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setEditingOrder(null);
                    setQuickAddMode('order');
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                    quickAddMode === 'order' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {editingOrder ? 'Sửa đơn' : '+ Đơn bánh'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setQuickAddMode('product');
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                    quickAddMode === 'product'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  {editingProduct ? 'Sửa bánh' : '+ Dịch vụ/Bánh'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCustomer(null);
                    setQuickAddMode('customer');
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                    quickAddMode === 'customer'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  {editingCustomer ? 'Sửa khách' : '+ Khách hàng'}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickAddMode('transaction')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                    quickAddMode === 'transaction'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  {editingTxId ? 'Sửa phiếu' : '+ Thu/Chi'}
                </button>
              </div>

              <button
                onClick={() => setQuickAddOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickAddMode === 'order' && (
              <form onSubmit={handleSaveOrder} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-500">Khách hàng *</label>
                    <input
                      required
                      list="modal-cus-list"
                      value={customerName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomerName(val);
                        const found = db.customers.find(
                          (c) => c.name.toLowerCase() === val.toLowerCase()
                        );
                        if (found?.phone) setCustomerPhone(found.phone);
                      }}
                      placeholder="Tên khách hàng"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                    <datalist id="modal-cus-list">
                      {db.customers.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Số điện thoại</label>
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="09xx..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500">Dịch vụ / Loại bánh</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                  >
                    {db.products.length === 0 ? (
                      <option value="">Bánh đặt theo yêu cầu</option>
                    ) : (
                      db.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatVnd(p.sellingPrice)}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-500">Số lượng</label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)} placeholder="Số lượng (VD: 1)"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Tiền cọc (VNĐ)</label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)} placeholder="Tiền cọc (VNĐ)"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-500">
                      Ngày giao ({formatSolarWithLunar(deliveryDate).lunar.fullText})
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Giờ giao</label>
                    <input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500">Ghi chú</label>
                  <input
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Ít ngọt, ghi chữ lên bánh..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full gold-badge rounded-2xl py-2.5 text-sm font-semibold"
                >
                  {editingOrder ? 'Lưu thay đổi đơn' : 'Xác nhận tạo đơn & Lên lịch'}
                </button>
              </form>
            )}

            {quickAddMode === 'product' && (
              <form onSubmit={handleSaveProduct} className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-500">Tên dịch vụ / loại bánh *</label>
                  <input
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="VD: Bánh Kem Tiramisu 20cm"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500">Nhóm</label>
                    <input
                      value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} placeholder="VD: Bánh Kem"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Giá bán (đ)</label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)} placeholder="VD: 250000"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Phút làm</label>
                    <input
                      type="number"
                      min={5}
                      value={prodPrepMins}
                      onChange={(e) => setProdPrepMins(e.target.value)} placeholder="VD: 60"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full gold-badge rounded-2xl py-2.5 text-sm font-semibold"
                >
                  {editingProduct ? 'Lưu cập nhật dịch vụ/bánh' : 'Thêm dịch vụ/bánh'}
                </button>
              </form>
            )}

            {quickAddMode === 'customer' && (
              <form onSubmit={handleSaveCustomer} className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-500">Tên khách hàng *</label>
                  <input
                    required
                    value={cusFormName}
                    onChange={(e) => setCusFormName(e.target.value)}
                    placeholder="Họ và tên khách hàng"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Số điện thoại</label>
                  <input
                    value={cusFormPhone}
                    onChange={(e) => setCusFormPhone(e.target.value)}
                    placeholder="09xx..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Sở thích / Ghi chú</label>
                  <input
                    value={cusFormPref}
                    onChange={(e) => setCusFormPref(e.target.value)}
                    placeholder="Ít đường, giao chiều..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full gold-badge rounded-2xl py-2.5 text-sm font-semibold"
                >
                  {editingCustomer ? 'Lưu thông tin khách' : 'Thêm khách hàng'}
                </button>
              </form>
            )}

            {quickAddMode === 'transaction' && (
              <form onSubmit={handleAddTransaction} className="space-y-3">
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as 'income' | 'expense')}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                >
                  <option value="income">Khoản Thu (+)</option>
                  <option value="expense">Khoản Chi (-)</option>
                </select>
                <input
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  placeholder="Hạng mục"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="Số tiền (VNĐ)"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                />
                <input
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder="Ghi chú"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                />
                <button
                  type="submit"
                  className="w-full gold-badge rounded-2xl py-2.5 text-sm font-semibold"
                >
                  {editingTxId ? 'Lưu chỉnh sửa phiếu' : 'Lưu phiếu Thu / Chi'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Thanh điều hướng dưới cho điện thoại */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 liquid-glass border-t border-white/80 px-2 py-1.5 flex items-center justify-around">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[11px] font-medium ${
                active ? 'text-amber-700 font-bold' : 'text-slate-600'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;



