
import React, { useEffect, useState } from 'react';
import { AppView, User } from '../types';
import { AuthService } from '../services/auth';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout, theme, onToggleTheme }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(AuthService.getCurrentUser());
  }, []);

  const navItems = [
    { id: AppView.DASHBOARD, label: 'داشبورد', icon: '📊', allowedRoles: ['ADMIN', 'EDITOR'] },
    { id: AppView.ORDERS, label: 'سفارشات', icon: '🛍️', allowedRoles: ['ADMIN', 'EDITOR'] },
    { id: AppView.PRODUCTS, label: 'مدیریت محصولات', icon: '📦', allowedRoles: ['ADMIN', 'EDITOR'] },
    { id: AppView.CATEGORIES, label: 'دسته بندی ها', icon: '🏷️', allowedRoles: ['ADMIN', 'EDITOR'] },
    { id: AppView.TELEGRAM, label: 'تنظیمات سیستم', icon: '⚙️', allowedRoles: ['ADMIN'] }, // Only Admin
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 h-screen shadow-lg flex flex-col sticky top-0 border-l border-gray-100 dark:border-gray-700 transition-colors duration-300">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
          <span>⚡</span> تله شاپ
        </h1>
        <p className="text-xs text-gray-400 mt-1">مدیریت فروشگاه تلگرامی</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          // Check Role Access
          if (user && item.allowedRoles && !item.allowedRoles.includes(user.role || 'EDITOR')) {
            return null;
          }

          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-bold shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
        <button 
          onClick={onToggleTheme}
          className="w-full flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-xl transition-colors text-sm font-medium border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
        >
          {theme === 'light' ? '🌙 حالت شب' : '☀️ حالت روز'}
        </button>

        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl transition-colors text-sm font-medium"
        >
          🚪 خروج از حساب
        </button>
        <div className="text-xs text-gray-400 text-center">
          نسخه ۱.۴.۰
        </div>
      </div>
    </div>
  );
};
