
import { User } from '../types';

const KEYS = {
  CURRENT_USER: 'shop_current_user',
  PENDING_CODES: 'shop_verification_codes'
};

export const AuthService = {
  // ... (Code gen logic remains local for demo/sms simulation)
  generateCode: (username: string): string => {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const codes = JSON.parse(localStorage.getItem(KEYS.PENDING_CODES) || '{}');
    codes[username] = {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000
    };
    localStorage.setItem(KEYS.PENDING_CODES, JSON.stringify(codes));
    return code;
  },

  verifyUser: (username: string, inputCode: string): { success: boolean; message: string } => {
    const codes = JSON.parse(localStorage.getItem(KEYS.PENDING_CODES) || '{}');
    const entry = codes[username];

    if (!entry) return { success: false, message: 'کد یافت نشد.' };
    if (Date.now() > entry.expiresAt) return { success: false, message: 'کد منقضی شده.' };
    if (entry.code !== inputCode) return { success: false, message: 'کد اشتباه است.' };
    
    // In real app, send verify request to server here
    delete codes[username];
    localStorage.setItem(KEYS.PENDING_CODES, JSON.stringify(codes));
    return { success: true, message: 'تایید شد.' };
  },

  login: async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User; requireVerification?: boolean; code?: string }> => {
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (data.success) {
            if (data.user.isVerified === 0 || data.user.isVerified === false) { // Handle MySQL boolean (0/1)
                const code = AuthService.generateCode(username);
                return { success: false, message: 'حساب فعال نیست', requireVerification: true, code };
            }
            localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(data.user));
            return { success: true, message: 'خوش آمدید', user: data.user };
        }
        return { success: false, message: data.message };
    } catch (e) {
        return { success: false, message: 'خطای شبکه' };
    }
  },

  register: async (user: User): Promise<{ success: boolean; message: string; code?: string }> => {
    // Registration logic would go to /api/users endpoint
    return { success: false, message: 'ثبت نام بسته است. (از ادمین بخواهید شما را اضافه کند)' };
  },

  logout: (): void => {
    localStorage.removeItem(KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }
};
