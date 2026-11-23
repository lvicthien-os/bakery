import type { BakeryDatabase } from '../types/bakery';

const STORAGE_KEY = 'UT_BAKERY_DB_V1';
const PENDING_SYNC_KEY = 'UT_BAKERY_PENDING_SYNC_V1';

const todayStr = new Date().toISOString().slice(0, 10);

export const INITIAL_BAKERY_DB: BakeryDatabase = {
  ingredients: [
    {
      id: 'ing-1',
      name: 'Bột mì số 13',
      unit: 'g',
      costPerUnit: 0.025,
      stockQuantity: 8500,
      minStockAlert: 2000,
      expiryDate: '2027-04-15',
      supplierName: 'Đại lý Bột Miền Trung',
    },
    {
      id: 'ing-2',
      name: 'Bơ lạt Anchor',
      unit: 'g',
      costPerUnit: 0.22,
      stockQuantity: 900,
      minStockAlert: 1000,
      expiryDate: '2026-12-10',
      supplierName: 'Nguyên Liệu Bánh Đà Nẵng',
    },
    {
      id: 'ing-3',
      name: 'Kem tươi Whipping',
      unit: 'ml',
      costPerUnit: 0.14,
      stockQuantity: 2400,
      minStockAlert: 800,
      expiryDate: '2026-11-28',
      supplierName: 'Nguyên Liệu Bánh Đà Nẵng',
    },
  ],
  products: [
    {
      id: 'prod-1',
      name: 'Bánh Kem Dâu Tươi 18cm',
      category: 'Bánh Kem',
      sellingPrice: 380000,
      prepTimeMinutes: 90,
      recipe: [
        { ingredientId: 'ing-1', quantity: 250 },
        { ingredientId: 'ing-2', quantity: 120 },
        { ingredientId: 'ing-3', quantity: 400 },
      ],
    },
    {
      id: 'prod-2',
      name: 'Croissant Bơ Pháp (Set 6)',
      category: 'Bánh Ngọt',
      sellingPrice: 165000,
      prepTimeMinutes: 120,
      recipe: [
        { ingredientId: 'ing-1', quantity: 450 },
        { ingredientId: 'ing-2', quantity: 250 },
      ],
    },
  ],
  orders: [
    {
      id: 'ord-1',
      orderCode: 'UTB-2311-01',
      customerId: 'cus-1',
      customerName: 'Nguyễn Minh Anh',
      customerPhone: '0905 112 233',
      deliveryDate: todayStr,
      deliveryTime: '16:30',
      items: [
        {
          productId: 'prod-1',
          productName: 'Bánh Kem Dâu Tươi 18cm',
          quantity: 1,
          unitPrice: 380000,
          note: 'Ít ngọt, ghi chữ "Happy Birthday"',
        },
      ],
      totalAmount: 380000,
      depositAmount: 150000,
      remainingAmount: 230000,
      isPaidFull: false,
      status: 'baking',
      assignedStaff: 'Trần Gia Bảo',
      createdAt: `${todayStr}T08:30:00`,
    },
  ],
  transactions: [
    {
      id: 'tx-1',
      date: todayStr,
      type: 'income',
      category: 'Tiền cọc đơn hàng',
      amount: 150000,
      referenceCode: 'UTB-2311-01',
      note: 'Cọc đơn bánh kem sinh nhật Minh Anh',
    },
    {
      id: 'tx-2',
      date: todayStr,
      type: 'expense',
      category: 'Nhập nguyên liệu',
      amount: 420000,
      referenceCode: 'NK-2311-01',
      note: 'Bổ sung kem tươi & bơ lạt',
    },
  ],
  customers: [
    {
      id: 'cus-1',
      name: 'Nguyễn Minh Anh',
      phone: '0905 112 233',
      preferences: 'Thích bánh ít ngọt, kem sữa tươi, ưu tiên giao chiều',
      totalSpent: 380000,
      orderCount: 1,
    },
  ],
  suppliers: [
    {
      id: 'sup-1',
      name: 'Nguyên Liệu Bánh Đà Nẵng',
      phone: '0914 889 776',
      debtAmount: 250000,
      note: 'Giao hàng trước 9h sáng',
    },
  ],
  staff: [
    {
      id: 'stf-1',
      name: 'Trần Gia Bảo',
      role: 'Bếp bánh chính',
      phone: '0932 445 566',
      shift: 'Ca sáng (07:00 - 15:00)',
      attendanceToday: true,
      activeTask: 'Làm cốt & trang trí UTB-2311-01',
    },
    {
      id: 'stf-2',
      name: 'Lê Thu Thảo',
      role: 'Thu ngân & CSKH',
      phone: '0978 221 334',
      shift: 'Ca chiều (13:00 - 21:00)',
      attendanceToday: true,
      activeTask: 'Xác nhận đơn & đối soát cọc',
    },
  ],
  config: {
    shopName: 'UT BAKERY',
    phone: '0935 187 404',
    address: 'Đà Nẵng',
    googleDriveSyncEnabled: true,
    googleDriveWebAppUrl: '',
    lowStockAlertEnabled: true,
    deliveryReminderMinutes: 90,
  },
};

export function loadLocalDatabase(): BakeryDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BAKERY_DB));
      return INITIAL_BAKERY_DB;
    }
    const parsed = JSON.parse(raw) as Partial<BakeryDatabase>;
    return {
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : INITIAL_BAKERY_DB.ingredients,
      products: Array.isArray(parsed.products) ? parsed.products : INITIAL_BAKERY_DB.products,
      orders: Array.isArray(parsed.orders) ? parsed.orders : INITIAL_BAKERY_DB.orders,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : INITIAL_BAKERY_DB.transactions,
      customers: Array.isArray(parsed.customers) ? parsed.customers : INITIAL_BAKERY_DB.customers,
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : INITIAL_BAKERY_DB.suppliers,
      staff: Array.isArray(parsed.staff) ? parsed.staff : INITIAL_BAKERY_DB.staff,
      config: {
        ...INITIAL_BAKERY_DB.config,
        ...(parsed.config || {}),
      },
    };
  } catch {
    return INITIAL_BAKERY_DB;
  }
}

export function saveLocalDatabase(db: BakeryDatabase): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  if (db.config.googleDriveSyncEnabled) {
    localStorage.setItem(PENDING_SYNC_KEY, new Date().toISOString());
  }
}

export function clearAllDatabaseData(currentConfig: BakeryDatabase['config']): BakeryDatabase {
  const cleared: BakeryDatabase = {
    ingredients: [],
    products: [],
    orders: [],
    transactions: [],
    customers: [],
    suppliers: [],
    staff: [],
    config: {
      ...currentConfig,
      lastSyncedAt: undefined,
    },
  };
  localStorage.setItem('UT_BAKERY_CLEARED_V1', '1');
  localStorage.setItem('UT_BAKERY_DB_V1', JSON.stringify(cleared));
  return cleared;
}

export function hasPendingDriveSync(): boolean {
  return Boolean(localStorage.getItem(PENDING_SYNC_KEY));
}

export async function syncToGoogleDrive(db: BakeryDatabase): Promise<{ ok: boolean; syncedAt?: string }> {
  if (!navigator.onLine) {
    return { ok: false };
  }
  if (!db.config.googleDriveSyncEnabled) {
    return { ok: true, syncedAt: db.config.lastSyncedAt };
  }

  if (db.config.googleDriveWebAppUrl.trim()) {
    try {
      await fetch(db.config.googleDriveWebAppUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'UT_BAKERY',
          exportedAt: new Date().toISOString(),
          data: db,
        }),
      });
    } catch {
      return { ok: false };
    }
  }

  localStorage.removeItem(PENDING_SYNC_KEY);
  return { ok: true, syncedAt: new Date().toISOString() };
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportDatabaseToCsv(db: BakeryDatabase): string {
  const lines: string[] = ['section,id,col1,col2,col3,col4,col5'];

  db.orders.forEach((o) => {
    lines.push(
      [
        'order',
        o.id,
        o.orderCode,
        `${o.customerName} (${o.customerPhone})`,
        `${o.deliveryDate} ${o.deliveryTime}`,
        `Tong:${o.totalAmount}|Coc:${o.depositAmount}|Con:${o.remainingAmount}`,
        o.status,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  db.products.forEach((p) => {
    lines.push(
      [
        'product',
        p.id,
        p.name,
        p.category,
        p.sellingPrice,
        p.prepTimeMinutes,
        JSON.stringify(p.recipe),
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  db.ingredients.forEach((ing) => {
    lines.push(
      [
        'ingredient',
        ing.id,
        ing.name,
        ing.unit,
        ing.stockQuantity,
        ing.costPerUnit,
        `${ing.minStockAlert}|${ing.expiryDate || ''}|${ing.supplierName || ''}`,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  db.transactions.forEach((tx) => {
    lines.push(
      [
        'transaction',
        tx.id,
        tx.date,
        tx.type,
        tx.category,
        tx.amount,
        tx.note,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  db.customers.forEach((c) => {
    lines.push(
      [
        'customer',
        c.id,
        c.name,
        c.phone,
        c.totalSpent,
        c.orderCount,
        c.preferences || '',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  return '\uFEFF' + lines.join('\r\n');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function importDatabaseFromCsv(csvText: string, currentDb: BakeryDatabase): BakeryDatabase {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const rawLines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length <= 1) {
    throw new Error('File CSV không có dữ liệu hợp lệ.');
  }

  const nextDb: BakeryDatabase = {
    ...currentDb,
    orders: [],
    products: [],
    ingredients: [],
    transactions: [],
    customers: [],
  };

  for (let i = 1; i < rawLines.length; i++) {
    const cols = parseCsvLine(rawLines[i]);
    const [section, id, col1, col2, col3, col4, col5] = cols;
    if (!section || !id) continue;

    if (section === 'order') {
      const [dt, tm] = (col3 || `${todayStr} 12:00`).split(' ');
      const moneyParts = (col4 || '').split('|');
      const total = Number((moneyParts[0] || '').replace('Tong:', '')) || 0;
      const deposit = Number((moneyParts[1] || '').replace('Coc:', '')) || 0;
      const remaining = Number((moneyParts[2] || '').replace('Con:', '')) || Math.max(0, total - deposit);
      const nameMatch = (col2 || '').match(/^(.*?)\s*\((.*?)\)$/);

      nextDb.orders.push({
        id,
        orderCode: col1 || id,
        customerId: `cus-${id}`,
        customerName: nameMatch ? nameMatch[1].trim() : col2 || 'Khách lẻ',
        customerPhone: nameMatch ? nameMatch[2].trim() : '',
        deliveryDate: dt || todayStr,
        deliveryTime: tm || '12:00',
        items: [],
        totalAmount: total,
        depositAmount: deposit,
        remainingAmount: remaining,
        isPaidFull: remaining <= 0,
        status: (col5 as BakeryDatabase['orders'][number]['status']) || 'pending',
        createdAt: new Date().toISOString(),
      });
    } else if (section === 'product') {
      let recipe = [];
      try {
        recipe = col5 ? JSON.parse(col5) : [];
      } catch {
        recipe = [];
      }
      nextDb.products.push({
        id,
        name: col1 || 'Sản phẩm',
        category: col2 || 'Bánh',
        sellingPrice: Number(col3) || 0,
        prepTimeMinutes: Number(col4) || 60,
        recipe,
      });
    } else if (section === 'ingredient') {
      const extra = (col5 || '').split('|');
      nextDb.ingredients.push({
        id,
        name: col1 || 'Nguyên liệu',
        unit: col2 || 'g',
        stockQuantity: Number(col3) || 0,
        costPerUnit: Number(col4) || 0,
        minStockAlert: Number(extra[0]) || 0,
        expiryDate: extra[1] || undefined,
        supplierName: extra[2] || undefined,
      });
    } else if (section === 'transaction') {
      nextDb.transactions.push({
        id,
        date: col1 || todayStr,
        type: col2 === 'expense' ? 'expense' : 'income',
        category: col3 || 'Khác',
        amount: Number(col4) || 0,
        note: col5 || '',
      });
    } else if (section === 'customer') {
      nextDb.customers.push({
        id,
        name: col1 || 'Khách hàng',
        phone: col2 || '',
        totalSpent: Number(col3) || 0,
        orderCount: Number(col4) || 0,
        preferences: col5 || '',
      });
    }
  }

  return nextDb;
}

