import type { BakeryDatabase } from '../types/bakery';

const STORAGE_KEY = 'UT_BAKERY_DB_V1';
const CLEARED_FLAG_KEY = 'UT_BAKERY_CLEARED_V1';
const PENDING_SYNC_KEY = 'UT_BAKERY_PENDING_SYNC_V1';
const DRIVE_FILE_NAME = 'UTBakery_data.json';

const todayStr = new Date().toISOString().slice(0, 10);

export const EMPTY_BAKERY_DB: BakeryDatabase = {
  ingredients: [],
  products: [],
  orders: [],
  transactions: [],
  customers: [],
  suppliers: [],
  staff: [],
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
      note: 'Bổ sung bơ lạt & bột mì',
    },
  ],
  customers: [
    {
      id: 'cus-1',
      name: 'Nguyễn Minh Anh',
      phone: '0905 112 233',
      preferences: 'Thích bánh ít ngọt',
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
      note: 'Giao trước 9h sáng',
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

export function normalizeDatabase(
  parsed: Partial<BakeryDatabase>,
  fallbackConfig: BakeryDatabase['config']
): BakeryDatabase {
  return {
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    products: Array.isArray(parsed.products) ? parsed.products : [],
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    customers: Array.isArray(parsed.customers) ? parsed.customers : [],
    suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
    staff: Array.isArray(parsed.staff) ? parsed.staff : [],
    config: {
      ...fallbackConfig,
      ...(parsed.config || {}),
    },
  };
}

export function loadLocalDatabase(): BakeryDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (localStorage.getItem(CLEARED_FLAG_KEY) === '1') {
        return { ...EMPTY_BAKERY_DB };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BAKERY_DB));
      return INITIAL_BAKERY_DB;
    }
    const parsed = JSON.parse(raw) as Partial<BakeryDatabase>;
    return normalizeDatabase(parsed, INITIAL_BAKERY_DB.config);
  } catch {
    return INITIAL_BAKERY_DB;
  }
}

export function saveLocalDatabase(db: BakeryDatabase): void {
  const isEmptyAll =
    db.orders.length === 0 &&
    db.customers.length === 0 &&
    db.transactions.length === 0 &&
    db.products.length === 0 &&
    db.ingredients.length === 0 &&
    db.suppliers.length === 0 &&
    db.staff.length === 0;

  if (isEmptyAll) {
    localStorage.setItem(CLEARED_FLAG_KEY, '1');
  } else {
    localStorage.removeItem(CLEARED_FLAG_KEY);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  if (db.config.googleDriveSyncEnabled) {
    localStorage.setItem(PENDING_SYNC_KEY, new Date().toISOString());
  }
}

export function clearAllDatabaseData(currentConfig: BakeryDatabase['config']): BakeryDatabase {
  const cleared: BakeryDatabase = {
    ...EMPTY_BAKERY_DB,
    config: {
      ...currentConfig,
      lastSyncedAt: undefined,
    },
  };
  localStorage.setItem(CLEARED_FLAG_KEY, '1');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleared));
  return cleared;
}

export function hasPendingDriveSync(): boolean {
  return Boolean(localStorage.getItem(PENDING_SYNC_KEY));
}

export async function signInWithGoogleGmail(
  clientId: string
): Promise<{ ok: boolean; email?: string; accessToken?: string; message?: string }> {
  const cleanId = clientId.trim();
  if (!cleanId) {
    return { ok: false, message: 'Vui lòng nhập Google OAuth Client ID trước khi đăng nhập Gmail.' };
  }

  const gsi = (window as unknown as {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (resp: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }).google;

  if (!gsi?.accounts?.oauth2) {
    return {
      ok: false,
      message: 'Chưa tải được Google Identity Services. Kiểm tra kết nối mạng.',
    };
  }

  return new Promise((resolve) => {
    const tokenClient = gsi.accounts!.oauth2!.initTokenClient({
      client_id: cleanId,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
      callback: async (resp) => {
        if (resp.error || !resp.access_token) {
          resolve({
            ok: false,
            message: resp.error_description || resp.error || 'Đăng nhập Gmail bị hủy.',
          });
          return;
        }
        let email = '';
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          });
          if (userRes.ok) {
            const info = (await userRes.json()) as { email?: string };
            email = info.email || '';
          }
        } catch {
          email = '';
        }
        resolve({ ok: true, email, accessToken: resp.access_token });
      },
    });
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
}

async function findDriveDataFileId(accessToken: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) throw new Error('Không thể truy vấn Google Drive.');
  const data = (await res.json()) as { files?: { id: string; modifiedTime?: string }[] };
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

export async function pullDatabaseFromGoogleDrive(
  accessToken: string,
  currentConfig: BakeryDatabase['config']
): Promise<{ ok: boolean; db?: BakeryDatabase; message?: string }> {
  try {
    const fileId = await findDriveDataFileId(accessToken);
    if (!fileId) {
      return { ok: true, message: 'Chưa có file dữ liệu trên Gmail này, sẽ tạo khi đồng bộ.' };
    }
    const contentRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!contentRes.ok) {
      return { ok: false, message: 'Không tải được nội dung file từ Google Drive.' };
    }
    const text = await contentRes.text();
    const parsed = JSON.parse(text) as Partial<BakeryDatabase>;
    const merged = normalizeDatabase(parsed, currentConfig);
    return { ok: true, db: merged };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Lỗi tải dữ liệu Google Drive.',
    };
  }
}

export async function syncToGoogleDrive(
  db: BakeryDatabase,
  accessToken?: string
): Promise<{ ok: boolean; syncedAt?: string; pulledDb?: BakeryDatabase; message?: string }> {
  if (!navigator.onLine) {
    return { ok: false, message: 'Đang ngoại tuyến.' };
  }
  if (!db.config.googleDriveSyncEnabled) {
    return { ok: true, syncedAt: db.config.lastSyncedAt };
  }

  if (accessToken) {
    try {
      const existingId = await findDriveDataFileId(accessToken);
      const payload = JSON.stringify(db, null, 2);

      if (existingId) {
        const upRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: payload,
          }
        );
        if (!upRes.ok) {
          return { ok: false, message: 'Cập nhật file lên Google Drive thất bại.' };
        }
      } else {
        const metadata = {
          name: DRIVE_FILE_NAME,
          mimeType: 'application/json',
        };
        const boundary = 'ut_bakery_boundary_' + Date.now();
        const body =
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
            metadata
          )}\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${payload}\r\n--${boundary}--`;

        const createRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
          }
        );
        if (!createRes.ok) {
          return { ok: false, message: 'Tạo file mới trên Google Drive thất bại.' };
        }
      }

      localStorage.removeItem(PENDING_SYNC_KEY);
      return { ok: true, syncedAt: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Lỗi đồng bộ Google Drive.',
      };
    }
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

export function importDatabaseFromCsv(
  csvText: string,
  currentDb: BakeryDatabase
): BakeryDatabase {
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
      const remaining =
        Number((moneyParts[2] || '').replace('Con:', '')) ||
        Math.max(0, total - deposit);
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
