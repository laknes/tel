
import React, { useState, useEffect, useRef } from 'react';
import { AppView, Product, Category, Order, OrderStatus, TelegramConfig } from './types';
import { Sidebar } from './components/Sidebar';
import { ProductList } from './components/ProductList';
import { ProductForm } from './components/ProductForm';
import { CategoryManager } from './components/CategoryManager';
import { Settings } from './components/Settings';
import { DashboardStats } from './components/DashboardStats';
import { WelcomeModal } from './components/WelcomeModal';
import { OrderList } from './components/OrderList';
import { Auth } from './components/Auth';
import { StorageService } from './services/storage';
import { AuthService } from './services/auth';
import { sendProductToTelegram, processSearchQueries } from './services/telegram';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showWelcome, setShowWelcome] = useState(false);
  
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      setIsAuthenticated(true);
      loadData();
      checkWelcomeMessage(user.username);
    }
    const savedTheme = StorageService.getTheme();
    setTheme(savedTheme);

    return () => stopGlobalPolling();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      startGlobalPolling();
    } else {
      stopGlobalPolling();
    }
  }, [isAuthenticated]);

  const startGlobalPolling = () => {
      if (pollIntervalRef.current) return;
      
      pollIntervalRef.current = window.setInterval(async () => {
          const currentConfig = await StorageService.getTelegramConfig();
          if (currentConfig && currentConfig.botToken) {
              const currentProducts = await StorageService.getProducts();
              const currentCategories = await StorageService.getCategories();
              await processSearchQueries(currentConfig.botToken, currentProducts, currentCategories);
          }
      }, 5000); // Slower polling for server
  };

  const stopGlobalPolling = () => {
      if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
      }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    StorageService.saveTheme(theme);
  }, [theme]);

  const loadData = async () => {
    setProducts(await StorageService.getProducts());
    setCategories(await StorageService.getCategories());
    setOrders(await StorageService.getOrders());
    setConfig(await StorageService.getTelegramConfig());
  };

  const checkWelcomeMessage = (username: string) => {
    if (!StorageService.hasSeenWelcome(username)) {
      setShowWelcome(true);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    loadData();
    const user = AuthService.getCurrentUser();
    if (user) {
      checkWelcomeMessage(user.username);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleCloseWelcome = () => {
    const user = AuthService.getCurrentUser();
    if (user) {
      StorageService.setWelcomeSeen(user.username);
    }
    setShowWelcome(false);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveProduct = async (product: Product) => {
    await StorageService.saveProduct(product);
    setProducts(await StorageService.getProducts());
    setIsFormOpen(false);
    setEditingProduct(undefined);
    showNotification('محصول با موفقیت ذخیره شد.', 'success');
  };

  const handleDeleteProduct = async (id: string) => {
    const productToDelete = products.find(p => p.id === id);
    if (window.confirm(`آیا از حذف محصول "${productToDelete?.name}" اطمینان دارید؟`)) {
      await StorageService.deleteProduct(id);
      setProducts(await StorageService.getProducts());
      showNotification('محصول حذف شد.', 'success');
      if (editingProduct?.id === id) {
        setIsFormOpen(false);
        setEditingProduct(undefined);
      }
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
    setCurrentView(AppView.PRODUCTS);
  };

  const handleAddCategory = async (name: string) => {
    const newCat: Category = { id: Date.now().toString(), name };
    await StorageService.saveCategory(newCat);
    setCategories(await StorageService.getCategories());
    showNotification('دسته بندی اضافه شد.', 'success');
  };

  const handleDeleteCategory = async (id: string) => {
    await StorageService.deleteCategory(id);
    setCategories(await StorageService.getCategories());
    showNotification('دسته بندی حذف شد.', 'success');
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        const updatedOrder = { ...order, status: newStatus };
        await StorageService.saveOrder(updatedOrder);
        setOrders(await StorageService.getOrders());
        showNotification('وضعیت سفارش بروزرسانی شد.', 'success');
    }
  };

  const handleSendToTelegram = async (product: Product) => {
    const currentConfig = await StorageService.getTelegramConfig();
    if (!currentConfig) {
      showNotification('تنظیمات تلگرام یافت نشد.', 'error');
      setCurrentView(AppView.TELEGRAM);
      return;
    }
    showNotification('در حال ارسال به تلگرام...', 'success');
    const categoryName = categories.find(c => c.id === product.category)?.name || 'عمومی';
    const result = await sendProductToTelegram(product, categoryName, currentConfig);
    showNotification(result.message, result.success ? 'success' : 'error');
  };

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {showWelcome && (
        <WelcomeModal 
          userName={AuthService.getCurrentUser()?.fullName || 'کاربر'} 
          message={config?.welcomeMessage}
          onClose={handleCloseWelcome} 
        />
      )}
      <Sidebar 
        currentView={currentView} 
        onChangeView={(view) => {
          setCurrentView(view);
          setIsFormOpen(false);
          setEditingProduct(undefined);
          if (view === AppView.TELEGRAM) loadData(); 
        }} 
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-3">
             <h2 className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">
               {currentView === AppView.DASHBOARD && 'داشبورد'}
               {currentView === AppView.ORDERS && 'مدیریت سفارشات'}
               {currentView === AppView.PRODUCTS && 'محصولات'}
               {currentView === AppView.CATEGORIES && 'دسته بندی ها'}
               {currentView === AppView.TELEGRAM && 'تنظیمات سیستم'}
             </h2>
             <span className="text-sm bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full hidden md:inline-block transition-colors">
               کاربر: {AuthService.getCurrentUser()?.fullName}
             </span>
             <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200 animate-pulse">
                ● ربات فعال
             </span>
           </div>
           {currentView === AppView.PRODUCTS && !isFormOpen && (
             <button onClick={() => setIsFormOpen(true)} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-xl shadow-lg shadow-brand-500/30 transition-all flex items-center gap-2">
               <span>+</span> محصول جدید
             </button>
           )}
        </div>

        {notification && (
          <div className={`fixed top-6 left-6 px-6 py-3 rounded-lg shadow-lg z-50 text-white font-medium animate-bounce ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {notification.msg}
          </div>
        )}

        {currentView === AppView.DASHBOARD && (
          <>
            <DashboardStats products={products} categories={categories} />
            <div className="mt-8">
               <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-200">آخرین محصولات اضافه شده</h3>
               <ProductList products={products.slice(-5).reverse()} categories={categories} onEdit={handleEditProduct} onDelete={handleDeleteProduct} onSendToTelegram={handleSendToTelegram} hideFilters={true} />
            </div>
          </>
        )}

        {currentView === AppView.ORDERS && <OrderList orders={orders} onUpdateStatus={handleUpdateOrderStatus} />}

        {currentView === AppView.PRODUCTS && (
          isFormOpen ? (
            <ProductForm categories={categories} onSave={handleSaveProduct} onCancel={() => { setIsFormOpen(false); setEditingProduct(undefined); }} editingProduct={editingProduct} />
          ) : (
            <ProductList products={products} categories={categories} onEdit={handleEditProduct} onDelete={handleDeleteProduct} onSendToTelegram={handleSendToTelegram} />
          )
        )}

        {currentView === AppView.CATEGORIES && <CategoryManager categories={categories} onAdd={handleAddCategory} onDelete={handleDeleteCategory} />}

        {currentView === AppView.TELEGRAM && <Settings />}
      </main>
    </div>
  );
}
export default App;
