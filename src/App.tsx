import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CakeSlice,
  Wallet,
  Settings,
  Plus,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  Search,
  Phone,
  Clock,
  CheckCircle2,
  Users,
  Truck,
  Sparkles,
} from 'lucide-react';
import type { BakeryDatabase, BakeryOrder, MainTab, OrderStatus, SyncStatus } from './types/bakery';
import {
  exportDatabaseToCsv,
  hasPendingDriveSync,
  importDatabaseFromCsv,
  loadLocalDatabase,
  saveLocalDatabase,
  syncToGoogleDrive,
} from './services/storageService';

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

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

export function App() {
  const [db, setDb] = useState<BakeryDatabase>(() => loadLocalDatabase());
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [orderSubView, setOrderSubView] = useState<'orders' | 'schedule' | 'production'>('orders');
  const [partnerSubView, setPartnerSubView] = useState<'finance' | 'customers' | 'suppliers' | 'staff'>('finance');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    !navigator.onLine ? 'offline' : hasPendingDriveSync() ? 'syncing' : 'synced'
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form tạo đơn nhanh
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(() => db.products[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [deposit, setDeposit] = useState(0);
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deliveryTime, setDeliveryTime] = useState('15:00');
  const [orderNote, setOrderNote] = useState('');

  // Form thêm nguyên liệu / sản phẩm / thu chi nhanh
  const [newIngName, setNewIngName] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('g');
  const [newIngStock, setNewIngStock] = useState(1000);
  const [newIngCost] = useState(0.1);
  const [newIngMin] = useState(300);

  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txCategory, setTxCategory] = useState('Bán lẻ tại tiệm');
  const [txAmount, setTxAmount] = useState(0);
  const [txNote, setTxNote] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const notify = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2800);
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
    link.download = `UT_BAKERY_${new Date().toISOString().slice(0, 10)}.csv`;
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
      setDb(imported);
      notify('Đã nhập dữ liệu từ CSV');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi đọc file CSV');
    } finally {
      e.target.value = '';
    }
  };

  const ingredientMap = useMemo(() => {
    const map = new Map<string, (typeof db.ingredients)[number]>();
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
    const totalIncome = db.transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = db.transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const totalOrdersValue = db.orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + o.totalAmount, 0);
    const totalRemainingDebt = db.orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + o.remainingAmount, 0);

    const lowStockItems = db.ingredients.filter(
      (i) => i.stockQuantity <= i.minStockAlert
    );

    const now = new Date();
    const urgentOrders = db.orders.filter((o) => {
      if (o.status === 'delivered' || o.status === 'cancelled') return false;
      const target = new Date(`${o.deliveryDate}T${o.deliveryTime || '23:59'}`);
      const diffMins = (target.getTime() - now.getTime()) / 60000;
      return diffMins <= (db.config.deliveryReminderMinutes || 90);
    });

    return {
      totalIncome,
      totalExpense,
      netProfit,
      totalOrdersValue,
      totalRemainingDebt,
      lowStockItems,
      urgentOrders,
    };
  }, [db]);

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

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const product = db.products.find((p) => p.id === selectedProductId) || db.products[0];
    if (!customerName.trim() || !product) return;

    const total = product.sellingPrice * Math.max(1, quantity);
    const safeDeposit = Math.max(0, Math.min(deposit, total));
    const remaining = total - safeDeposit;
    const code = `UTB-${new Date().toISOString().slice(5, 10).replace('-', '')}-${String(
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
          productId: product.id,
          productName: product.name,
          quantity: Math.max(1, quantity),
          unitPrice: product.sellingPrice,
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

    const nextTransactions = [...db.transactions];
    if (safeDeposit > 0) {
      nextTransactions.unshift({
        id: `tx-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        type: 'income',
        category: remaining === 0 ? 'Thanh toán đơn bánh' : 'Tiền cọc đơn hàng',
        amount: safeDeposit,
        referenceCode: code,
        note: `${remaining === 0 ? 'Thanh toán' : 'Cọc'} đơn ${code} - ${newOrder.customerName}`,
      });
    }

    const existingCusIndex = db.customers.findIndex(
      (c) =>
        c.name.toLowerCase() === newOrder.customerName.toLowerCase() ||
        (newOrder.customerPhone && c.phone === newOrder.customerPhone)
    );

    const nextCustomers = [...db.customers];
    if (existingCusIndex >= 0) {
      nextCustomers[existingCusIndex] = {
        ...nextCustomers[existingCusIndex],
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

    setDb((prev) => ({
      ...prev,
      orders: [newOrder, ...prev.orders],
      transactions: nextTransactions,
      customers: nextCustomers,
    }));

    setCustomerName('');
    setCustomerPhone('');
    setQuantity(1);
    setDeposit(0);
    setOrderNote('');
    notify(`Đã tạo đơn ${code} & lên lịch`);
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
          date: new Date().toISOString().slice(0, 10),
          type: 'income',
          category: 'Thanh toán đơn bánh',
          amount: target.remainingAmount,
          referenceCode: target.orderCode,
          note: `Tất toán đơn ${target.orderCode} - ${target.customerName}`,
        });
      }

      return {
        ...prev,
        orders: nextOrders,
        ingredients: nextIngredients,
        transactions: nextTx,
      };
    });
    notify(`Cập nhật: ${STATUS_LABEL[nextStatus]}`);
  };

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName.trim()) return;
    setDb((prev) => ({
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
    }));
    setNewIngName('');
    notify('Đã thêm nguyên liệu');
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || txAmount <= 0) return;
    setDb((prev) => ({
      ...prev,
      transactions: [
        {
          id: `tx-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          type: txType,
          category: txCategory.trim() || (txType === 'income' ? 'Thu khác' : 'Chi khác'),
          amount: Number(txAmount),
          note: txNote.trim(),
        },
        ...prev.transactions,
      ],
    }));
    setTxAmount(0);
    setTxNote('');
    notify(txType === 'income' ? 'Đã ghi nhận khoản thu' : 'Đã ghi nhận khoản chi');
  };

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
    { id: 'orders', label: 'Đơn & Lịch', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'catalog', label: 'Bánh & Kho', icon: <CakeSlice className="w-4 h-4" /> },
    { id: 'finance', label: 'Tài chính', icon: <Wallet className="w-4 h-4" /> },
    { id: 'settings', label: 'Cài đặt', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Thanh đầu trang Liquid Glass gọn gàng */}
      <header className="sticky top-0 z-30 liquid-glass border-b border-white/80">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="gold-badge px-3 py-1 rounded-full text-xs sm:text-sm tracking-wide shrink-0">
              {db.config.shopName}
            </span>
          </div>

          {/* Nav desktop */}
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

          {/* Cụm thao tác nhanh bằng icon + chấm trạng thái đồng bộ */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleManualSync}
              title={syncStatus}
              aria-label="Sync status"
              className="w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-white flex items-center justify-center transition"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${dotColorClass}`} />
            </button>

            <button
              onClick={() => {
                setActiveTab('orders');
                setOrderSubView('orders');
              }}
              title="Tạo đơn mới"
              className="w-9 h-9 rounded-full gold-badge flex items-center justify-center hover:brightness-105 transition"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportCsv}
              title="Xuất CSV"
              className="w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-white text-slate-700 flex items-center justify-center transition"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              title="Cài đặt"
              className="w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-white text-slate-700 flex items-center justify-center transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Thông báo ngắn gọn */}
      {toastMsg && (
        <div className="fixed top-16 right-4 z-40 liquid-glass px-4 py-2.5 rounded-2xl text-xs font-medium text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Nội dung chính */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 space-y-4">
        {/* Cảnh báo nhanh đơn sắp giao & nguyên liệu sắp hết */}
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

        {/* TAB 1: TỔNG QUAN & BÁO CÁO */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="liquid-glass rounded-2xl p-4">
                <div className="text-xs text-slate-500">Tổng thu</div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  {formatVnd(stats.totalIncome)}
                </div>
              </div>
              <div className="liquid-glass rounded-2xl p-4">
                <div className="text-xs text-slate-500">Tổng chi</div>
                <div className="text-lg sm:text-xl font-bold text-rose-600 mt-1">
                  {formatVnd(stats.totalExpense)}
                </div>
              </div>
              <div className="liquid-glass rounded-2xl p-4">
                <div className="text-xs text-slate-500">Lợi nhuận ròng</div>
                <div className="text-lg sm:text-xl font-bold text-emerald-700 mt-1">
                  {formatVnd(stats.netProfit)}
                </div>
              </div>
              <div className="liquid-glass rounded-2xl p-4">
                <div className="text-xs text-slate-500">Công nợ khách còn lại</div>
                <div className="text-lg sm:text-xl font-bold text-amber-700 mt-1">
                  {formatVnd(stats.totalRemainingDebt)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 text-sm sm:text-base">
                    Lịch giao & sản xuất gần nhất
                  </h2>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-medium text-amber-700 hover:underline"
                  >
                    Tất cả đơn ({db.orders.length})
                  </button>
                </div>

                <div className="space-y-2.5">
                  {sortedOrders.slice(0, 5).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 rounded-2xl bg-white/65 border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg">
                            {ord.deliveryDate} • {ord.deliveryTime}
                          </span>
                          <span className="font-semibold text-sm text-slate-900">
                            {ord.customerName}
                          </span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[ord.status]}`}>
                            {STATUS_LABEL[ord.status]}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {ord.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                          {ord.items[0]?.note ? ` — "${ord.items[0].note}"` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-slate-900">
                          {formatVnd(ord.totalAmount)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Còn: {formatVnd(ord.remainingAmount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
                <h2 className="font-semibold text-slate-900 text-sm sm:text-base">
                  Hiệu quả sản phẩm & Công thức
                </h2>
                <div className="space-y-2.5">
                  {db.products.map((prod) => {
                    const cost = getProductCost(prod.id);
                    const margin = prod.sellingPrice - cost;
                    return (
                      <div
                        key={prod.id}
                        className="p-3 rounded-2xl bg-white/65 border border-white space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-900">
                          <span>{prod.name}</span>
                          <span>{formatVnd(prod.sellingPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>Giá vốn: {formatVnd(cost)}</span>
                          <span className="text-emerald-700 font-medium">
                            Lãi gộp: {formatVnd(margin)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ĐƠN HÀNG + LỊCH + SẢN XUẤT */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-white/70 p-1 rounded-2xl border border-white">
                <button
                  onClick={() => setOrderSubView('orders')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                    orderSubView === 'orders' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  Đơn hàng
                </button>
                <button
                  onClick={() => setOrderSubView('schedule')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                    orderSubView === 'schedule' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  Lịch đặt & giao
                </button>
                <button
                  onClick={() => setOrderSubView('production')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                    orderSubView === 'production' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  Sản xuất
                </button>
              </div>

              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã đơn, khách, SĐT..."
                  className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white/80 border border-white text-xs sm:text-sm focus:outline-none"
                />
              </div>
            </div>

            {orderSubView === 'orders' && (
              <form
                onSubmit={handleCreateOrder}
                className="liquid-glass rounded-3xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              >
                <input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Tên khách hàng *"
                  className="px-3.5 py-2.5 rounded-2xl bg-white/85 border border-white text-sm"
                />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Số điện thoại"
                  className="px-3.5 py-2.5 rounded-2xl bg-white/85 border border-white text-sm"
                />
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/85 border border-white text-sm"
                >
                  {db.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatVnd(p.sellingPrice)})
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    placeholder="SL"
                    className="px-3 py-2.5 rounded-2xl bg-white/85 border border-white text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={deposit}
                    onChange={(e) => setDeposit(Number(e.target.value))}
                    placeholder="Tiền cọc"
                    className="px-3 py-2.5 rounded-2xl bg-white/85 border border-white text-sm"
                  />
                </div>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/85 border border-white text-sm"
                />
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/85 border border-white text-sm"
                />
                <input
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Yêu cầu làm bánh (ít ngọt, chữ...)"
                  className="px-3.5 py-2.5 rounded-2xl bg-white/85 border border-white text-sm"
                />
                <button
                  type="submit"
                  className="gold-badge rounded-2xl px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo đơn</span>
                </button>
              </form>
            )}

            <div className="space-y-3">
              {sortedOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="liquid-glass rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900">
                        {ord.orderCode}
                      </span>
                      <span className="font-semibold text-sm text-slate-900">
                        {ord.customerName}
                      </span>
                      {ord.customerPhone && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {ord.customerPhone}
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[ord.status]}`}>
                        {STATUS_LABEL[ord.status]}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700">
                      {ord.items.map((it) => `${it.productName} × ${it.quantity}`).join(', ')}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                      <span>
                        Giao: <strong>{ord.deliveryDate}</strong> lúc <strong>{ord.deliveryTime}</strong>
                      </span>
                      <span>Cọc: {formatVnd(ord.depositAmount)}</span>
                      <span>Còn lại: <strong>{formatVnd(ord.remainingAmount)}</strong></span>
                      {ord.items[0]?.note && <span>Ghi chú: {ord.items[0].note}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {formatVnd(ord.totalAmount)}
                      </div>
                    </div>
                    <select
                      value={ord.status}
                      onChange={(e) => handleOrderStatusChange(ord.id, e.target.value as OrderStatus)}
                      className="px-3 py-2 rounded-xl bg-white/90 border border-slate-200 text-xs font-medium"
                    >
                      <option value="pending">Chờ làm</option>
                      <option value="baking">Đang làm</option>
                      <option value="ready">Sẵn sàng giao</option>
                      <option value="delivered">Đã giao</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SẢN PHẨM, CÔNG THỨC & KHO NGUYÊN LIỆU */}
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
              <h2 className="font-semibold text-slate-900">Sản phẩm & Công thức (Tự tính giá vốn)</h2>
              <div className="space-y-2.5">
                {db.products.map((prod) => {
                  const cost = getProductCost(prod.id);
                  return (
                    <div
                      key={prod.id}
                      className="p-3.5 rounded-2xl bg-white/75 border border-white space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-900">{prod.name}</span>
                        <span className="text-sm font-bold text-amber-700">
                          {formatVnd(prod.sellingPrice)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        Danh mục: {prod.category} • Thời gian làm: ~{prod.prepTimeMinutes} phút • Giá vốn tự động:{' '}
                        <strong>{formatVnd(cost)}</strong>
                      </div>
                      <div className="text-xs text-slate-500">
                        Định lượng:{' '}
                        {prod.recipe
                          .map((r) => {
                            const ing = ingredientMap.get(r.ingredientId);
                            return ing ? `${ing.name} (${r.quantity}${ing.unit})` : null;
                          })
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
              <h2 className="font-semibold text-slate-900">Kho nguyên liệu & Cảnh báo tồn</h2>
              <form onSubmit={handleAddIngredient} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <input
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  placeholder="Tên nguyên liệu"
                  className="col-span-2 px-3 py-2 rounded-xl bg-white/85 border border-white text-xs sm:text-sm"
                />
                <input
                  value={newIngUnit}
                  onChange={(e) => setNewIngUnit(e.target.value)}
                  placeholder="Đơn vị"
                  className="px-3 py-2 rounded-xl bg-white/85 border border-white text-xs sm:text-sm"
                />
                <input
                  type="number"
                  value={newIngStock}
                  onChange={(e) => setNewIngStock(Number(e.target.value))}
                  placeholder="Tồn"
                  className="px-3 py-2 rounded-xl bg-white/85 border border-white text-xs sm:text-sm"
                />
                <button
                  type="submit"
                  className="gold-badge rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  Thêm kho
                </button>
              </form>

              <div className="space-y-2.5">
                {db.ingredients.map((ing) => {
                  const isLow = ing.stockQuantity <= ing.minStockAlert;
                  return (
                    <div
                      key={ing.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 ${
                        isLow
                          ? 'bg-rose-50/80 border-rose-200'
                          : 'bg-white/75 border-white'
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
                          Giá vốn: {formatVnd(ing.costPerUnit)}/{ing.unit} • Ngưỡng báo: {ing.minStockAlert}{' '}
                          {ing.unit}
                          {ing.expiryDate ? ` • HSD: ${ing.expiryDate}` : ''}
                        </div>
                      </div>
                      <div className="text-right font-bold text-sm text-slate-900 shrink-0">
                        {ing.stockQuantity} {ing.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TÀI CHÍNH, KHÁCH HÀNG, NHÀ CUNG CẤP & NHÂN VIÊN */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1 bg-white/70 p-1 rounded-2xl border border-white w-fit">
              <button
                onClick={() => setPartnerSubView('finance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                  partnerSubView === 'finance' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Thu Chi
              </button>
              <button
                onClick={() => setPartnerSubView('customers')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                  partnerSubView === 'customers' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Khách hàng
              </button>
              <button
                onClick={() => setPartnerSubView('suppliers')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                  partnerSubView === 'suppliers' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Nhà cung cấp
              </button>
              <button
                onClick={() => setPartnerSubView('staff')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                  partnerSubView === 'staff' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Nhân viên
              </button>
            </div>

            {partnerSubView === 'finance' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <form
                  onSubmit={handleAddTransaction}
                  className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3 h-fit"
                >
                  <h2 className="font-semibold text-slate-900 text-sm">Ghi sổ Thu / Chi</h2>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as 'income' | 'expense')}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/85 border border-white text-sm"
                  >
                    <option value="income">Khoản Thu (+)</option>
                    <option value="expense">Khoản Chi (-)</option>
                  </select>
                  <input
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    placeholder="Hạng mục (Bán lẻ, Nhập bột, Điện nước...)"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/85 border border-white text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={txAmount}
                    onChange={(e) => setTxAmount(Number(e.target.value))}
                    placeholder="Số tiền (VNĐ)"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/85 border border-white text-sm"
                  />
                  <input
                    value={txNote}
                    onChange={(e) => setTxNote(e.target.value)}
                    placeholder="Ghi chú"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/85 border border-white text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full gold-badge rounded-xl py-2.5 text-sm font-semibold"
                  >
                    Lưu phiếu
                  </button>
                </form>

                <div className="lg:col-span-2 liquid-glass rounded-3xl p-4 sm:p-5 space-y-2.5">
                  <h2 className="font-semibold text-slate-900 text-sm">Sổ giao dịch</h2>
                  {db.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-white/75 border border-white flex items-center justify-between gap-2"
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
                      <div
                        className={`text-sm font-bold shrink-0 ${
                          tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatVnd(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {partnerSubView === 'customers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {db.customers.map((c) => (
                  <div key={c.id} className="liquid-glass rounded-3xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900">{c.name}</span>
                      <span className="text-xs font-bold text-amber-800">{formatVnd(c.totalSpent)}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      SĐT: {c.phone || 'Chưa cập nhật'} • {c.orderCount} đơn
                    </div>
                    {c.preferences && (
                      <div className="text-xs text-slate-500">Sở thích: {c.preferences}</div>
                    )}
                  </div>
                ))}
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
                    {s.note && <div className="text-xs text-slate-500">{s.note}</div>}
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
                    {st.activeTask && (
                      <div className="text-xs text-slate-500">Công việc: {st.activeTask}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CÀI ĐẶT (ĐỒNG BỘ DRIVE, NHẬP/XUẤT CSV & GIỚI THIỆU LIT STUDIO) */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-4">
              <h2 className="font-semibold text-slate-900">Tiệm & Đồng bộ dữ liệu</h2>

              <div className="space-y-2.5">
                <label className="block text-xs text-slate-500">Tên tiệm</label>
                <input
                  value={db.config.shopName}
                  onChange={(e) =>
                    setDb((prev) => ({
                      ...prev,
                      config: { ...prev.config, shopName: e.target.value },
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-white/85 border border-white text-sm"
                />

                <label className="block text-xs text-slate-500">
                  Google Drive Apps Script Web App URL (tùy chọn)
                </label>
                <input
                  value={db.config.googleDriveWebAppUrl}
                  onChange={(e) =>
                    setDb((prev) => ({
                      ...prev,
                      config: { ...prev.config, googleDriveWebAppUrl: e.target.value },
                    }))
                  }
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/85 border border-white text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleManualSync}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đồng bộ ngay</span>
                </button>

                <button
                  onClick={handleExportCsv}
                  className="px-4 py-2 rounded-xl bg-white/90 border border-slate-200 text-slate-800 text-xs font-medium flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất CSV</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl gold-badge text-xs font-semibold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Nhập CSV</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleImportCsvFile}
                  className="hidden"
                />
              </div>
            </div>

            <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full gold-badge text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Giới thiệu ứng dụng</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  UT BAKERY — Bakery Manager
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Ứng dụng quản lý tiệm bánh chạy ổn định cả trực tuyến lẫn ngoại tuyến, lưu cục bộ
                  tự động, hỗ trợ đồng bộ Google Drive và sao lưu/khôi phục CSV trên máy tính và
                  điện thoại.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/75 border border-white text-xs sm:text-sm text-slate-800 space-y-1">
                <div className="font-bold text-slate-900">LIT STUDIO</div>
                <div>Tác giả / Hỗ trợ: Đặng Thiện</div>
                <div>Hotline / Zalo: 0935 187 404</div>
              </div>
            </div>
          </div>
        )}
      </main>

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

