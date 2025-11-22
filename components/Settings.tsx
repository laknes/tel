
import React, { useState, useEffect, useRef } from 'react';
import { TelegramConfig, TelegramLog, BotInfo, VerifiedUser } from '../types';
import { StorageService } from '../services/storage';
import { getBotInfo, getChannelInfo, sendContactRequest, checkUpdatesForContacts } from '../services/telegram';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'status' | 'verification' | 'logs' | 'database'>('config');
  
  // Telegram State
  const [config, setConfig] = useState<TelegramConfig>({ 
    botToken: '', 
    chatId: '',
    supportId: '',
    buttonText: '🛒 ثبت سفارش',
    contactMessage: '📞 راه های ارتباطی:\n\n🆔 پشتیبانی: @admin\n📱 تلفن: 09120000000',
    welcomeMessage: ''
  });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [channelName, setChannelName] = useState<string>('');
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [targetChatId, setTargetChatId] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  // Database State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState('');

  useEffect(() => {
    const saved = StorageService.getTelegramConfig();
    if (saved) setConfig({
        ...saved,
        buttonText: saved.buttonText || '🛒 ثبت سفارش',
        contactMessage: saved.contactMessage || '📞 راه های ارتباطی:\n\n🆔 پشتیبانی: @admin\n📱 تلفن: 09120000000',
        welcomeMessage: saved.welcomeMessage || ''
    });
    setLogs(StorageService.getTelegramLogs());
    setVerifiedUsers(StorageService.getVerifiedUsers());
  }, []);

  // --- Telegram Handlers ---
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveTelegramConfig(config);
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
      newUsers.forEach(u => {
          StorageService.saveVerifiedUser(u);
          count++;
      });
      setVerifiedUsers(StorageService.getVerifiedUsers());
      setVerifyMsg(count > 0 ? `${count} شماره جدید تایید شد!` : 'هیچ تاییدیه جدیدی یافت نشد.');
      setVerifyLoading(false);
  };

  // --- Database Handlers ---
  const handleDownloadBackup = () => {
    const dataStr = StorageService.exportData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `teleshop_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = StorageService.importData(content);
      if (success) {
        setImportMsg('✅ اطلاعات با موفقیت بازگردانی شد. صفحه رفرش می‌شود...');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setImportMsg('❌ فایل نامعتبر است.');
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    if (window.confirm('⚠️ هشدار: تمام اطلاعات شما شامل محصولات، سفارشات و تنظیمات پاک خواهد شد.\nآیا مطمئن هستید؟')) {
      StorageService.factoryReset();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
        <button onClick={() => setActiveTab('config')} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'config' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>🔧 تنظیمات ربات</button>
        <button onClick={() => { setActiveTab('status'); checkConnection(); }} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'status' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>📡 وضعیت</button>
        <button onClick={() => setActiveTab('verification')} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'verification' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>👥 کاربران</button>
        <button onClick={() => { setActiveTab('logs'); setLogs(StorageService.getTelegramLogs()); }} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'logs' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>📜 گزارشات</button>
        <button onClick={() => setActiveTab('database')} className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'database' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>💾 دیتابیس</button>
      </div>

      <div className="p-6">
        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <form onSubmit={handleSaveConfig} className="space-y-6 max-w-2xl mx-auto">
            <p className="text-sm text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800/50">
               🤖 برای اتصال، توکن ربات را از BotFather گرفته و ربات را در کانال خود ادمین کنید.
            </p>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">توکن ربات (Bot Token)</label>
                <input type="text" value={config.botToken} onChange={(e) => setConfig({ ...config, botToken: e.target.value })} placeholder="123456:ABC..." className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-left font-mono text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">شناسه کانال (Chat ID)</label>
                <input type="text" value={config.chatId} onChange={(e) => setConfig({ ...config, chatId: e.target.value })} placeholder="@channel_name" className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-left font-mono text-sm" dir="ltr" />
              </div>
            </div>
            
            {/* Bot Buttons Config */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-md font-bold mb-4 text-gray-800 dark:text-white">تنظیمات دکمه‌ها و پیام‌ها</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">متن دکمه خرید (شیشه‌ای)</label>
                   <input 
                     type="text" 
                     value={config.buttonText} 
                     onChange={(e) => setConfig({ ...config, buttonText: e.target.value })} 
                     placeholder="مثال: 🛒 ثبت سفارش"
                     className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" 
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">آیدی پشتیبانی (لینک دکمه خرید)</label>
                   <input 
                     type="text" 
                     value={config.supportId || ''} 
                     onChange={(e) => setConfig({ ...config, supportId: e.target.value })} 
                     placeholder="مثال: admin_user" 
                     className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-left font-mono" 
                     dir="ltr" 
                   />
                </div>
              </div>

              <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">پیام دکمه "ارتباط با ما"</label>
                   <textarea 
                     rows={3}
                     value={config.contactMessage || ''} 
                     onChange={(e) => setConfig({ ...config, contactMessage: e.target.value })} 
                     placeholder="متنی که وقتی کاربر روی دکمه 'ارتباط با ما' کلیک می‌کند نمایش داده می‌شود..."
                     className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" 
                   />
              </div>
              
              <div className="mt-4">
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">پیام خوش‌آمدگویی داشبورد (ادمین)</label>
                   <textarea 
                     rows={3}
                     value={config.welcomeMessage || ''} 
                     onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })} 
                     placeholder="پیامی که ادمین‌ها در اولین ورود به پنل مشاهده می‌کنند (اگر خالی باشد پیام پیش‌فرض نمایش داده می‌شود)."
                     className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" 
                   />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              {status === 'saved' && <span className="text-green-600 dark:text-green-400 font-bold animate-pulse">✓ تنظیمات ذخیره شد</span>}
              <button type="submit" className="px-8 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-lg shadow-brand-500/30">ذخیره تنظیمات</button>
            </div>
          </form>
        )}

        {/* STATUS TAB */}
        {activeTab === 'status' && (
          <div className="space-y-6 max-w-2xl mx-auto text-center py-8">
            {isLoading ? <div className="animate-spin text-4xl">⏳</div> : (
              <>
                <div className={`p-6 rounded-2xl border ${botInfo ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                  <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">وضعیت ربات</h3>
                  {botInfo ? <div className="text-green-700 dark:text-green-400"><p>✅ متصل شد</p><p className="text-sm mt-1">نام: {botInfo.first_name}</p><p className="text-sm font-mono">@{botInfo.username}</p></div> : <p className="text-red-600 dark:text-red-400">❌ عدم ارتباط</p>}
                </div>
                <div className={`p-6 rounded-2xl border ${channelName && !channelName.includes('خطا') ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}>
                  <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">وضعیت کانال</h3>
                  {channelName ? <p className="text-blue-700 dark:text-blue-400 font-medium">{channelName}</p> : <p className="text-gray-500 dark:text-gray-400 text-sm">بررسی نشده یا یافت نشد</p>}
                </div>
                <button onClick={checkConnection} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">بررسی مجدد</button>
              </>
            )}
            <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg text-left">
                <h4 className="font-bold text-indigo-800 dark:text-indigo-300 mb-2">🤖 سیستم پاسخگوی خودکار</h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-400">
                    این سیستم اکنون به صورت <b>خودکار</b> در پس‌زمینه فعال است.
                    <br/>
                    تا زمانی که این پنل مدیریت باز باشد، ربات تلگرام به کاربران پاسخ می‌دهد.
                </p>
            </div>
          </div>
        )}

        {/* VERIFICATION TAB */}
        {activeTab === 'verification' && (
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl">
                        <h4 className="font-bold text-gray-800 dark:text-white mb-4">۱. ارسال درخواست دستی</h4>
                        <div className="space-y-4">
                            <input type="text" placeholder="User ID" value={targetChatId} onChange={(e) => setTargetChatId(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            <button onClick={handleSendRequest} disabled={!targetChatId || verifyLoading} className="w-full py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">{verifyLoading ? '...' : 'ارسال دکمه تایید'}</button>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl">
                         <h4 className="font-bold text-gray-800 dark:text-white mb-4">۲. بروزرسانی لیست</h4>
                         <p className="text-xs text-gray-500 mb-3">لیست کاربران تایید شده به صورت خودکار آپدیت می‌شود، اما می‌توانید دستی هم چک کنید.</p>
                         <button onClick={handleCheckUpdates} disabled={verifyLoading} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">{verifyLoading ? '...' : '🔄 رفرش لیست'}</button>
                    </div>
                </div>
                {verifyMsg && <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 animate-pulse">{verifyMsg}</div>}
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white mb-4">✅ کاربران تایید شده ({verifiedUsers.length})</h4>
                    <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 overflow-hidden max-h-64 overflow-y-auto">
                        {verifiedUsers.map((user, idx) => (
                            <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-0">
                                <div><p className="font-bold text-gray-800 dark:text-white">{user.firstName} {user.lastName}</p><p className="text-xs text-gray-500 dark:text-gray-400">ID: {user.userId}</p></div>
                                <div className="text-right"><p className="font-mono font-bold text-brand-600 dark:text-brand-400 dir-ltr">{user.phoneNumber}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className={`p-4 rounded-xl border-l-4 ${log.status === 'SUCCESS' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-red-500 bg-red-50 dark:bg-red-900/10'} mb-2`}>
                 <div className="flex justify-between"><span className="font-bold text-gray-800 dark:text-white">{log.productName}</span><span className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.sentAt).toLocaleString('fa-IR')}</span></div>
                 <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">{log.status === 'SUCCESS' ? '✅ ارسال موفق' : `❌ خطا: ${log.details}`}</p>
              </div>
            ))}
          </div>
        )}

        {/* DATABASE TAB */}
        {activeTab === 'database' && (
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                    <h3 className="font-bold text-purple-800 dark:text-purple-300 mb-2">💾 مدیریت داده‌ها</h3>
                    <p className="text-sm text-purple-600 dark:text-purple-400">
                        از آنجایی که دیتابیس شما روی مرورگر ذخیره می‌شود، توصیه می‌کنیم به صورت دوره‌ای نسخه پشتیبان تهیه کنید.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Backup */}
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white">دانلود نسخه پشتیبان</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ذخیره تمام اطلاعات به صورت فایل JSON</p>
                        </div>
                        <button onClick={handleDownloadBackup} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            ⬇️ دانلود
                        </button>
                    </div>

                    {/* Restore */}
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white">بازگردانی اطلاعات</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">آپلود فایل بکاپ برای بازیابی</p>
                        </div>
                        <div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                            <button onClick={handleImportClick} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                                ⬆️ آپلود
                            </button>
                        </div>
                    </div>
                    
                    {importMsg && (
                        <div className={`text-center p-3 rounded-lg text-sm font-bold ${importMsg.includes('موفق') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {importMsg}
                        </div>
                    )}

                    {/* Factory Reset */}
                    <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-100 dark:border-red-800/30 flex items-center justify-between mt-8">
                        <div>
                            <h4 className="font-bold text-red-700 dark:text-red-400">بازنشانی به حالت کارخانه</h4>
                            <p className="text-sm text-red-600 dark:text-red-500 mt-1">تمام اطلاعات پاک خواهد شد!</p>
                        </div>
                        <button onClick={handleFactoryReset} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            🗑️ حذف همه
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};