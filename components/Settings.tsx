import React, { useState, useEffect } from 'react';
import { TelegramConfig, TelegramLog, BotInfo } from '../types';
import { StorageService } from '../services/storage';
import { getBotInfo, getChannelInfo } from '../services/telegram';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'status' | 'logs'>('config');
  const [config, setConfig] = useState<TelegramConfig>({ 
    botToken: '', 
    chatId: '',
    supportId: '',
    buttonText: '🛒 ثبت سفارش',
    contactMessage: '📞 راه های ارتباطی:\n\n🆔 پشتیبانی: @admin\n📱 تلفن: 09120000000',
    welcomeMessage: 'سلام! خوش آمدید.',
    paymentApiKey: ''
  });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [channelName, setChannelName] = useState<string>('');
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        const saved = await StorageService.getTelegramConfig();
        if (saved) setConfig(saved);
        setLogs(StorageService.getTelegramLogs());
    };
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
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
    if (config.botToken && config.chatId) {
      const chan = await getChannelInfo(config.botToken, config.chatId);
      setChannelName(chan ? chan.title : 'یافت نشد / خطا');
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => setActiveTab('config')} className={`flex-1 py-4 px-6 text-sm font-bold ${activeTab === 'config' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600' : 'text-gray-500'}`}>🔧 تنظیمات اصلی</button>
        <button onClick={() => { setActiveTab('status'); checkConnection(); }} className={`flex-1 py-4 px-6 text-sm font-bold ${activeTab === 'status' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600' : 'text-gray-500'}`}>📡 وضعیت اتصال</button>
        <button onClick={() => { setActiveTab('logs'); setLogs(StorageService.getTelegramLogs()); }} className={`flex-1 py-4 px-6 text-sm font-bold ${activeTab === 'logs' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600' : 'text-gray-500'}`}>📜 تاریخچه</button>
      </div>

      <div className="p-6">
        {activeTab === 'config' && (
          <form onSubmit={handleSave} className="space-y-6 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 gap-6">
              <div><label className="block text-sm font-medium mb-2 dark:text-gray-300">توکن ربات</label><input type="text" value={config.botToken} onChange={(e) => setConfig({ ...config, botToken: e.target.value })} className="w-full px-4 py-3 rounded-lg border dark:bg-gray-700 dark:text-white" dir="ltr" /></div>
              <div><label className="block text-sm font-medium mb-2 dark:text-gray-300">شناسه کانال</label><input type="text" value={config.chatId} onChange={(e) => setConfig({ ...config, chatId: e.target.value })} className="w-full px-4 py-3 rounded-lg border dark:bg-gray-700 dark:text-white" dir="ltr" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-2 dark:text-gray-300">پیام خوش‌آمدگویی</label><textarea rows={3} value={config.welcomeMessage || ''} onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })} className="w-full px-4 py-3 rounded-lg border dark:bg-gray-700 dark:text-white" /></div>
            <button type="submit" className="px-8 py-2 bg-brand-600 text-white rounded-lg">ذخیره</button>
            {status === 'saved' && <span className="mr-4 text-green-500">ذخیره شد</span>}
          </form>
        )}

        {activeTab === 'status' && (
          <div className="text-center py-8">
             {isLoading ? '...' : <p className="mb-4 text-gray-800 dark:text-white">{botInfo ? `✅ متصل به @${botInfo.username}` : '❌ عدم اتصال'}</p>}
             <button onClick={checkConnection} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">بررسی مجدد</button>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            {logs.map((log) => <div key={log.id} className="p-4 border rounded dark:text-gray-300">{log.productName} - {log.status}</div>)}
          </div>
        )}
      </div>
    </div>
  );
};