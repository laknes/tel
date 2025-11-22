
import { Product, Category, TelegramConfig, Order, ActivityLog, User, TelegramLog, VerifiedUser } from '../types';

const KEYS = {
  PRODUCTS: 'shop_products',
  CATEGORIES: 'shop_categories',
  TELEGRAM: 'shop_telegram_config',
  TELEGRAM_LOGS: 'shop_telegram_logs',
  VERIFIED_USERS: 'shop_verified_users',
  ORDERS: 'shop_orders',
  LOGS: 'shop_logs',
  INIT_FLAG: 'shop_initialized_v3', // Increment version to force re-seed if needed
  THEME: 'shop_theme',
  WELCOME_PREFIX: 'shop_welcome_seen_'
};

// --- Seed Data (Initial Database State) ---
const seedCategories: Category[] = [
  { id: '1', name: 'الکترونیک' },
  { id: '2', name: 'پوشاک' },
  { id: '3', name: 'خانه و آشپزخانه' },
  { id: '4', name: 'لوازم جانبی موبایل' },
];

const seedProducts: Product[] = [
  {
    id: '101',
    productCode: 'SONY-H1',
    name: 'هدفون بی سیم سونی',
    price: 3500000,
    category: '1',
    description: 'صدای با کیفیت بالا و نویز کنسلینگ فعال. مناسب برای ورزش و موسیقی.',
    imageUrl: '',
    createdAt: Date.now() - 10000000
  },
  {
    id: '102',
    productCode: 'MI-W1',
    name: 'ساعت هوشمند شیائومی',
    price: 1200000,
    category: '1',
    description: 'صفحه نمایش AMOLED و باتری ۲۰ روزه.',
    imageUrl: '',
    createdAt: Date.now() - 5000000
  }
];

const seedOrders: Order[] = [
  {
    id: 'ORD-1001',
    customerName: 'علی محمدی',
    customerPhone: '09121111111',
    totalAmount: 4700000,
    status: 'COMPLETED',
    createdAt: Date.now() - 86400000, // 1 day ago
    items: [
      { productId: '101', productName: 'هدفون بی سیم سونی', priceAtTime: 3500000, quantity: 1 },
      { productId: '102', productName: 'ساعت هوشمند شیائومی', priceAtTime: 1200000, quantity: 1 }
    ]
  },
  {
    id: 'ORD-1002',
    customerName: 'سارا رضایی',
    customerPhone: '09352222222',
    totalAmount: 3500000,
    status: 'PENDING',
    createdAt: Date.now() - 3600000, // 1 hour ago
    items: [
      { productId: '101', productName: 'هدفون بی سیم سونی', priceAtTime: 3500000, quantity: 1 }
    ]
  }
];

export const StorageService = {
  // --- Initialization ---
  initialize: () => {
    const isInit = localStorage.getItem(KEYS.INIT_FLAG);
    if (!isInit) {
      // Only seed if not initialized before
      if (!localStorage.getItem(KEYS.CATEGORIES)) {
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(seedCategories));
      }
      if (!localStorage.getItem(KEYS.PRODUCTS)) {
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(seedProducts));
      }
      if (!localStorage.getItem(KEYS.ORDERS)) {
        localStorage.setItem(KEYS.ORDERS, JSON.stringify(seedOrders));
      }
      localStorage.setItem(KEYS.INIT_FLAG, 'true');
    }
  },

  // --- Products ---
  getProducts: (): Product[] => {
    try {
      StorageService.initialize();
      const data = localStorage.getItem(KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },
  saveProduct: (product: Product): void => {
    const products = StorageService.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },
  deleteProduct: (id: string): void => {
    const products = StorageService.getProducts().filter((p) => p.id !== id);
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  // --- Categories ---
  getCategories: (): Category[] => {
    try {
      StorageService.initialize();
      const data = localStorage.getItem(KEYS.CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },
  saveCategory: (category: Category): void => {
    const categories = StorageService.getCategories();
    categories.push(category);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  },
  deleteCategory: (id: string): void => {
    const categories = StorageService.getCategories().filter(c => c.id !== id);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  },

  // --- Orders ---
  getOrders: (): Order[] => {
    try {
      StorageService.initialize();
      const data = localStorage.getItem(KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },
  saveOrder: (order: Order): void => {
    const orders = StorageService.getOrders();
    const index = orders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      orders[index] = order;
    } else {
      orders.push(order);
    }
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  },
  
  // --- Logs ---
  getLogs: (): ActivityLog[] => {
    const data = localStorage.getItem(KEYS.LOGS);
    return data ? JSON.parse(data) : [];
  },
  logActivity: (user: User, action: string, details?: string): void => {
    const logs = StorageService.getLogs();
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      userId: user.username,
      userName: user.fullName,
      action,
      details,
      timestamp: Date.now()
    };
    // Keep only last 100 logs
    logs.unshift(newLog);
    if (logs.length > 100) logs.pop();
    localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  },

  // --- Telegram Config ---
  getTelegramConfig: (): TelegramConfig | null => {
    try {
      const data = localStorage.getItem(KEYS.TELEGRAM);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  },
  saveTelegramConfig: (config: TelegramConfig): void => {
    localStorage.setItem(KEYS.TELEGRAM, JSON.stringify(config));
  },

  // --- Telegram Logs ---
  getTelegramLogs: (): TelegramLog[] => {
    try {
      const data = localStorage.getItem(KEYS.TELEGRAM_LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },
  saveTelegramLog: (log: TelegramLog): void => {
    const logs = StorageService.getTelegramLogs();
    logs.unshift(log);
    if (logs.length > 50) logs.pop();
    localStorage.setItem(KEYS.TELEGRAM_LOGS, JSON.stringify(logs));
  },

  // --- Verified Users (Phone Numbers) ---
  getVerifiedUsers: (): VerifiedUser[] => {
    try {
      const data = localStorage.getItem(KEYS.VERIFIED_USERS);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },
  saveVerifiedUser: (user: VerifiedUser): void => {
    const users = StorageService.getVerifiedUsers();
    // Prevent duplicates
    if (!users.find(u => u.userId === user.userId)) {
        users.unshift(user);
        localStorage.setItem(KEYS.VERIFIED_USERS, JSON.stringify(users));
    }
  },

  // --- Theme ---
  getTheme: (): 'light' | 'dark' => {
    return (localStorage.getItem(KEYS.THEME) as 'light' | 'dark') || 'light';
  },
  saveTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem(KEYS.THEME, theme);
  },

  // --- Welcome Message ---
  hasSeenWelcome: (username: string): boolean => {
    return !!localStorage.getItem(KEYS.WELCOME_PREFIX + username);
  },
  setWelcomeSeen: (username: string): void => {
    localStorage.setItem(KEYS.WELCOME_PREFIX + username, 'true');
  },

  // --- Backup / Restore ---
  exportData: (): string => {
    const data = {
      products: StorageService.getProducts(),
      categories: StorageService.getCategories(),
      telegram: StorageService.getTelegramConfig(),
      orders: StorageService.getOrders(),
      logs: StorageService.getLogs(),
      verifiedUsers: StorageService.getVerifiedUsers()
    };
    return JSON.stringify(data, null, 2);
  },
  
  importData: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.products) localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(data.products));
      if (data.categories) localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data.categories));
      if (data.telegram) localStorage.setItem(KEYS.TELEGRAM, JSON.stringify(data.telegram));
      if (data.orders) localStorage.setItem(KEYS.ORDERS, JSON.stringify(data.orders));
      if (data.logs) localStorage.setItem(KEYS.LOGS, JSON.stringify(data.logs));
      if (data.verifiedUsers) localStorage.setItem(KEYS.VERIFIED_USERS, JSON.stringify(data.verifiedUsers));
      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  },

  factoryReset: (): void => {
    localStorage.clear();
    window.location.reload();
  }
};
