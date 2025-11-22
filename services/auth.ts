
import { User } from '../types';

const KEYS = {
  USERS: 'shop_users',
  CURRENT_USER: 'shop_current_user',
  PENDING_CODES: 'shop_verification_codes' // Store valid codes temporarily
};

// Default Admin User
const DEFAULT_ADMIN: User = {
  username: 'admin',
  password: '123',
  fullName: 'مدیر سیستم',
  role: 'ADMIN',
  isVerified: true
};

interface VerificationEntry {
  code: string;
  expiresAt: number;
}

export const AuthService = {
  // --- Verification Helpers ---
  generateCode: (username: string): string => {
    // Generate a random 5-digit code
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    
    const codes = AuthService.getPendingCodes();
    codes[username] = {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000 // Expires in 5 minutes
    };
    
    localStorage.setItem(KEYS.PENDING_CODES, JSON.stringify(codes));
    return code;
  },

  getPendingCodes: (): Record<string, VerificationEntry> => {
    const data = localStorage.getItem(KEYS.PENDING_CODES);
    return data ? JSON.parse(data) : {};
  },

  verifyUser: (username: string, inputCode: string): { success: boolean; message: string } => {
    const codes = AuthService.getPendingCodes();
    const entry = codes[username];

    if (!entry) {
      return { success: false, message: 'کد تاییدی برای این کاربر یافت نشد.' };
    }

    if (Date.now() > entry.expiresAt) {
      return { success: false, message: 'کد تایید منقضی شده است. لطفاً مجدداً تلاش کنید.' };
    }

    if (entry.code !== inputCode) {
      return { success: false, message: 'کد وارد شده اشتباه است.' };
    }

    // Code is valid, update user status
    const users = AuthService.getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
      users[userIndex].isVerified = true;
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      
      // Clean up code
      delete codes[username];
      localStorage.setItem(KEYS.PENDING_CODES, JSON.stringify(codes));
      
      return { success: true, message: 'حساب کاربری با موفقیت فعال شد.' };
    }
    
    return { success: false, message: 'کاربر یافت نشد.' };
  },

  // --- Standard Auth ---

  register: (user: User): { success: boolean; message: string; code?: string } => {
    const users = AuthService.getUsers();
    if (users.find(u => u.username === user.username)) {
      return { success: false, message: 'این نام کاربری قبلاً ثبت شده است.' };
    }
    
    // Create user but set unverified
    const newUser = { ...user, isVerified: false };
    users.push(newUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    // Generate verification code
    const code = AuthService.generateCode(user.username);

    return { success: true, message: 'ثبت نام اولیه انجام شد.', code };
  },

  login: (username: string, password: string): { success: boolean; message: string; user?: User; requireVerification?: boolean; code?: string } => {
    const users = AuthService.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      // Check if user specifically requires verification (isVerified === false)
      // We use explicit false check to handle legacy users (undefined) as verified
      if (user.isVerified === false) {
         // Generate a new code for simulation purposes since the old one might be lost/expired
         const code = AuthService.generateCode(username);
         
         return { 
           success: false, 
           message: 'حساب کاربری شما فعال نشده است.', 
           requireVerification: true,
           code // Return code so UI can simulate SMS reception
         };
      }

      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
      return { success: true, message: 'خوش آمدید!', user };
    }
    return { success: false, message: 'نام کاربری یا رمز عبور اشتباه است.' };
  },

  logout: (): void => {
    localStorage.removeItem(KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    if (!data) {
      // Initialize with default admin if no users exist
      const initialUsers = [DEFAULT_ADMIN];
      localStorage.setItem(KEYS.USERS, JSON.stringify(initialUsers));
      return initialUsers;
    }
    
    const users = JSON.parse(data);
    // If the array is empty (e.g. manually cleared), add admin back
    if (users.length === 0) {
        users.push(DEFAULT_ADMIN);
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
    return users;
  }
};
