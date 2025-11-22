
import { Product, Category, TelegramConfig, Order, ActivityLog, User, TelegramLog, VerifiedUser } from '../types';

const API_URL = '/api';

// Helper for fallback in case server is down or during migration
const getLocal = (key: string) => {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : null;
}

export const StorageService = {
  // --- Products ---
  getProducts: async (): Promise<Product[]> => {
    try {
      const res = await fetch(`${API_URL}/products`);
      if (res.ok) return await res.json();
      return [];
    } catch (e) { return []; }
  },
  saveProduct: async (product: Product): Promise<void> => {
    await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(product)
    });
  },
  deleteProduct: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
  },

  // --- Categories ---
  getCategories: async (): Promise<Category[]> => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      if (res.ok) return await res.json();
      return [];
    } catch (e) { return []; }
  },
  saveCategory: async (category: Category): Promise<void> => {
    await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(category)
    });
  },
  deleteCategory: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
  },

  // --- Orders ---
  getOrders: async (): Promise<Order[]> => {
    try {
      const res = await fetch(`${API_URL}/orders`);
      if (res.ok) return await res.json();
      return [];
    } catch (e) { return []; }
  },
  saveOrder: async (order: Order): Promise<void> => {
    await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(order)
    });
  },
  
  // --- Logs (Keep Local for simplicity or implement API) ---
  getLogs: (): ActivityLog[] => {
    return getLocal('shop_logs') || [];
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
    logs.unshift(newLog);
    if (logs.length > 100) logs.pop();
    localStorage.setItem('shop_logs', JSON.stringify(logs));
  },

  // --- Telegram Config ---
  getTelegramConfig: async (): Promise<TelegramConfig | null> => {
    try {
      const res = await fetch(`${API_URL}/config/telegram`);
      if (res.ok) return await res.json();
      return null;
    } catch (e) { return null; }
  },
  saveTelegramConfig: async (config: TelegramConfig): Promise<void> => {
    await fetch(`${API_URL}/config/telegram`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(config)
    });
  },

  // --- Telegram Logs (Keep Local) ---
  getTelegramLogs: (): TelegramLog[] => {
    return getLocal('shop_telegram_logs') || [];
  },
  saveTelegramLog: (log: TelegramLog): void => {
    const logs = StorageService.getTelegramLogs();
    logs.unshift(log);
    if (logs.length > 50) logs.pop();
    localStorage.setItem('shop_telegram_logs', JSON.stringify(logs));
  },

  // --- Verified Users ---
  getVerifiedUsers: async (): Promise<VerifiedUser[]> => {
    try {
      const res = await fetch(`${API_URL}/verified-users`);
      if (res.ok) return await res.json();
      return [];
    } catch (e) { return []; }
  },
  saveVerifiedUser: async (user: VerifiedUser): Promise<void> => {
    await fetch(`${API_URL}/verified-users`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(user)
    });
  },

  // --- Theme (Local) ---
  getTheme: (): 'light' | 'dark' => {
    return (localStorage.getItem('shop_theme') as 'light' | 'dark') || 'light';
  },
  saveTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem('shop_theme', theme);
  },

  // --- Welcome (Local) ---
  hasSeenWelcome: (username: string): boolean => {
    return !!localStorage.getItem('shop_welcome_seen_' + username);
  },
  setWelcomeSeen: (username: string): void => {
    localStorage.setItem('shop_welcome_seen_' + username, 'true');
  },

  // --- Backup (Export only) ---
  exportData: async (): Promise<string> => {
    const products = await StorageService.getProducts();
    const categories = await StorageService.getCategories();
    const telegram = await StorageService.getTelegramConfig();
    const orders = await StorageService.getOrders();
    const verifiedUsers = await StorageService.getVerifiedUsers();
    
    const data = { products, categories, telegram, orders, verifiedUsers };
    return JSON.stringify(data, null, 2);
  },
  
  importData: (jsonString: string): boolean => {
    // NOT IMPLEMENTED FOR SERVER YET - Requires batch inserts
    return false; 
  },

  factoryReset: (): void => {
    // Dangerous on server
    alert('Factory reset not available in server mode for safety.');
  }
};
