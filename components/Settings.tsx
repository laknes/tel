import React, { useState, useEffect } from 'react';
import { TelegramConfig, TelegramLog, BotInfo, VerifiedUser, ShippingMethod } from '../types';
import { StorageService } from '../services/storage';
import { getBotInfo, getChannelInfo, sendContactRequest, checkUpdatesForContacts } from '../services/telegram';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'status' | 'verification' | 'shipping' | 'logs' | 'database'>('config');
  const [config, setConfig] = useState<TelegramConfig>({ botToken: '', chatId: '', supportId: '', buttonText: '🛒 ثبت سفارش', contactMessage: '', welcomeMessage: '', paymentApiKey: '' });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [channelName, setChannelName] = useState<string>('');
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  
  // Shipping State
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [newShipping, setNewShipping] = useState<ShippingMethod>({ id: '', name: '', cost: 0, estimatedDays: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
      const saved = await StorageService.getTelegramConfig();
      if (saved) setConfig({ ...saved });
      setLogs(StorageService.getTelegramLogs());
      setVerifiedUsers(await StorageService.getVerifiedUsers());
      
      // Load Shipping
      const res = await fetch('/api/store/shipping-methods');
      if(res.ok) setShippingMethods(await res.json());
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await StorageService.saveTelegramConfig(config);
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 3000);
  };

  const checkConnection = async () => {
    setIsLoading(true);
    if (config.botToken) {
      const info = await getBotInfo(config.botToken);
      setBotInfo(info);
    }
    setIsLoading(false);
  };

  const handleAddShipping = async () => {
      if(!newShipping.name) return;
      const updated = [...shippingMethods, { ...newShipping, id: Date.now().toString() }];
      setShippingMethods(updated);
      await fetch('/api/store/shipping-methods', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(updated)
      });
      setNewShipping({ id: '', name: '', cost: 0, estimatedDays: '' });
  };

  const handleDeleteShipping = async (id: string) => {
      const updated = shippingMethods.filter(s => s.id !== id);
      setShippingMethods(updated);
      await fetch('/api/store/shipping-methods', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(updated)
      });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
        <button onClick={() => setActiveTab('config')} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'config' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>🔧 تنظیمات ربات</button>
        <button onClick={() => setActiveTab('shipping')} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'shipping' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>🚚 روش‌های ارسال</button>
        <button onClick={() => setActiveTab('status')} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'status' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>📡 وضعیت</button>
      </div>

      <div className="p-6">
        {activeTab === 'config' && (
          <form onSubmit={handleSaveConfig} className="space-y-6 max-w-2xl mx-auto">
            {/* Existing Config Fields */}
            <div className="grid grid-cols-1 gap-6">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">توکن ربات</label><input type="text" value={config.botToken} onChange={(e) => setConfig({ ...config, botToken: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none text-left font-mono" dir="ltr" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">شناسه کانال</label><input type="text" value={config.chatId} onChange={(e) => setConfig({ ...config, chatId: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none text-left font-mono" dir="ltr" /></div>
            </div>
            <button type="submit" className="px-8 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">ذخیره</button>
          </form>
        )}

        {activeTab === 'shipping' && (
            <div className="max-w-3xl mx-auto">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-6 border border-gray-200 dark:border-gray-600">
                    <h4 className="font-bold mb-4 text-gray-800 dark:text-white">افزودن روش ارسال جدید</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input placeholder="نام (مثلاً پست پیشتاز)" value={newShipping.name} onChange={e => setNewShipping({...newShipping, name: e.target.value})} className="p-2 rounded border dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                        <input type="number" placeholder="هزینه (تومان)" value={newShipping.cost || ''} onChange={e => setNewShipping({...newShipping, cost: Number(e.target.value)})} className="p-2 rounded border dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                        <input placeholder="زمان تحویل (مثلاً 2 روز)" value={newShipping.estimatedDays} onChange={e => setNewShipping({...newShipping, estimatedDays: e.target.value})} className="p-2 rounded border dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                    </div>
                    <button onClick={handleAddShipping} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full md:w-auto">افزودن</button>
                </div>

                <div className="space-y-3">
                    {shippingMethods.map(method => (
                        <div key={method.id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl shadow-sm">
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white">{method.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{method.estimatedDays} | هزینه: {method.cost.toLocaleString()} تومان</p>
                            </div>
                            <button onClick={() => handleDeleteShipping(method.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded">حذف</button>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {activeTab === 'status' && (
          <div className="text-center py-8">
             {isLoading ? '...' : <p className="mb-4">{botInfo ? `✅ متصل به @${botInfo.username}` : '❌ عدم اتصال ربات'}</p>}
             <button onClick={checkConnection} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">بررسی مجدد</button>
          </div>
        )}
      </div>
    </div>
  );
};