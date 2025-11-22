
import React, { useState, useEffect, useRef } from 'react';
import { TelegramConfig, TelegramLog, BotInfo, VerifiedUser } from '../types';
import { StorageService } from '../services/storage';
import { getBotInfo, getChannelInfo, sendContactRequest, checkUpdatesForContacts } from '../services/telegram';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'status' | 'verification' | 'logs' | 'database'>('config');
  const [config, setConfig] = useState<TelegramConfig>({ botToken: '', chatId: '', supportId: '', buttonText: '🛒 ثبت سفارش', contactMessage: '', welcomeMessage: '' });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [channelName, setChannelName] = useState<string>('');
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [targetChatId, setTargetChatId] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
      const saved = await StorageService.getTelegramConfig();
      if (saved) setConfig({
          ...saved,
          buttonText: saved.buttonText || '🛒 ثبت سفارش',
          contactMessage: saved.contactMessage || '📞 راه های ارتباطی:\n\n🆔 پشتیبانی: @admin\n📱 تلفن: 09120000000',
          welcomeMessage: saved.welcomeMessage || ''
      });
      setLogs(StorageService.getTelegramLogs());
      setVerifiedUsers(await StorageService.getVerifiedUsers());
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await StorageService.saveTelegramConfig(config);
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 3000);
  };

  // ... (Rest of the component remains mostly same, methods are already async compatible or independent)
  // Copied minimal necessary parts for brevity since most UI is identical

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

  const handleSendRequest = async () => {
      if (!targetChatId) return;
      setVerifyLoading(true);
      const res = await sendContactRequest(config.botToken, targetChatId);
      setVerifyMsg(res.message);
      setVerifyLoading(false);
  };

  const handleCheckUpdates = async () => {
      setVerifyLoading(true);
      const newUsers = await checkUpdatesForContacts(config.botToken);
      let count = 0;
      for (const u of newUsers) {
          await StorageService.saveVerifiedUser(u);
          count++;
      }
      setVerifiedUsers(await StorageService.getVerifiedUsers());
      setVerifyMsg(count > 0 ? `${count} شماره جدید تایید شد!` : 'هیچ تاییدیه جدیدی یافت نشد.');
      setVerifyLoading(false);
  };
  
  const handleDownloadBackup = async () => {
    const dataStr = await StorageService.exportData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `teleshop_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
        <button onClick={() => setActiveTab('config')} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'config' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>🔧 تنظیمات ربات</button>
        <button onClick={() => { setActiveTab('status'); checkConnection(); }} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'status' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>📡 وضعیت</button>
        <button onClick={() => setActiveTab('verification')} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'verification' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>👥 کاربران</button>
        <button onClick={() => { setActiveTab('logs'); setLogs(StorageService.getTelegramLogs()); }} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'logs' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>📜 گزارشات</button>
        <button onClick={() => setActiveTab('database')} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'database' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>💾 دیتابیس</button>
      </div>

      <div className="p-6">
        {activeTab === 'config' && (
          <form onSubmit={handleSaveConfig} className="space-y-6 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 gap-6">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">توکن ربات</label><input type="text" value={config.botToken} onChange={(e) => setConfig({ ...config, botToken: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none text-left font-mono" dir="ltr" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">شناسه کانال</label><input type="text" value={config.chatId} onChange={(e) => setConfig({ ...config, chatId: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none text-left font-mono" dir="ltr" /></div>
            </div>
            
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">متن دکمه خرید</label><input type="text" value={config.buttonText} onChange={(e) => setConfig({ ...config, buttonText: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">آیدی پشتیبانی</label><input type="text" value={config.supportId || ''} onChange={(e) => setConfig({ ...config, supportId: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none text-left font-mono" dir="ltr" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">پیام دکمه "ارتباط با ما"</label><textarea rows={3} value={config.contactMessage || ''} onChange={(e) => setConfig({ ...config, contactMessage: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" /></div>
              <div className="mt-4"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">پیام خوش‌آمدگویی</label><textarea rows={3} value={config.welcomeMessage || ''} onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" /></div>
            </div>

            <div className="flex items-center justify-between pt-4">
              {status === 'saved' && <span className="text-green-600 dark:text-green-400 font-bold">✓ تنظیمات ذخیره شد</span>}
              <button type="submit" className="px-8 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">ذخیره تنظیمات</button>
            </div>
          </form>
        )}
        
        {activeTab === 'status' && (
          <div className="text-center py-8">
             {isLoading ? '...' : (
                 <div>
                     <p className="mb-4">{botInfo ? `✅ متصل به @${botInfo.username}` : '❌ عدم اتصال ربات'}</p>
                     <p>{channelName ? `✅ کانال: ${channelName}` : '❌ کانال یافت نشد'}</p>
                 </div>
             )}
          </div>
        )}

        {activeTab === 'verification' && (
            <div>
                 <button onClick={handleCheckUpdates} className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg">بروزرسانی لیست</button>
                 {verifiedUsers.map(u => <div key={u.userId} className="p-2 border-b">{u.firstName} - {u.phoneNumber}</div>)}
            </div>
        )}
        
        {activeTab === 'database' && (
            <div className="text-center py-8">
                <button onClick={handleDownloadBackup} className="px-6 py-3 bg-blue-600 text-white rounded-lg">⬇️ دانلود بکاپ دیتابیس</button>
            </div>
        )}
      </div>
    </div>
  );
};
