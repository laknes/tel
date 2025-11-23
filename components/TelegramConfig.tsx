
import React, { useState, useEffect } from 'react';
import { TelegramConfig, TelegramLog, BotInfo, VerifiedUser } from '../types';
import { StorageService } from '../services/storage';
import { getBotInfo, getChannelInfo, sendContactRequest, checkUpdatesForContacts } from '../services/telegram';

export const TelegramConfigPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'status' | 'logs' | 'verification'>('config');
  const [config, setConfig] = useState<TelegramConfig>({ 
    botToken: '', 
    chatId: '',
    supportId: '',
    buttonText: '🛒 ثبت سفارش',
    contactMessage: '📞 راه های ارتباطی:\n\n🆔 پشتیبانی: @admin\n📱 تلفن: 09120000000',
    paymentApiKey: ''
  });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [channelName, setChannelName] = useState<string>('');
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Verification State
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [targetChatId, setTargetChatId] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
        const saved = await StorageService.getTelegramConfig();
        if (saved) setConfig({
            ...saved,
            buttonText: saved.buttonText || '🛒 ثبت سفارش',
            contactMessage: saved.contactMessage || '📞 راه های ارتباطی:\n\n🆔 پشتیبانی: @admin\n📱 تلفن: 09120000000',
            paymentApiKey: saved.paymentApiKey || ''
        });
        setLogs(StorageService.getTelegramLogs());
        setVerifiedUsers(await StorageService.getVerifiedUsers());
    };
    loadData();
  }, []);

  const handleSave = (e: React.FormEvent) => {
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

  // --- Verification Logic ---
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'config' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
        >
          🔧 تنظیمات اصلی
        </button>
        <button 
          onClick={() => { setActiveTab('status'); checkConnection(); }}
          className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'status' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
        >
          📡 وضعیت اتصال
        </button>
        <button 
          onClick={() => setActiveTab('verification')}
          className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'verification' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
        >
          👥 تایید شماره
        </button>
        <button 
          onClick={() => { setActiveTab('logs'); setLogs(StorageService.getTelegramLogs()); }}
          className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'logs' ? 'bg-gray-50 dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
        >
          📜 تاریخچه
        </button>
      </div>

      <div className="p-6">
        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <form onSubmit={handleSave} className="space-y-6 max-w-2xl mx-auto">
            <p className="text-sm text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800/50">
               🤖 برای اتصال، توکن ربات را از BotFather گرفته و ربات را در کانال خود ادمین کنید.
            </p>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">توکن ربات (Bot Token)</label>
                <input
                  type="text"
                  value={config.botToken}
                  onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                  placeholder="123456:ABC..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-left font-mono text-sm"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">شناسه کانال (Chat ID)</label>
                <input
                  type="text"
                  value={config.chatId}
                  onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
                  placeholder="@channel_name"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-left font-mono text-sm"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-md font-bold mb-4 text-gray-800 dark:text-white">تنظیمات دکمه‌ها و پیام‌ها</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                در صورتی که مقادیر زیر را پر کنید، زیر پست‌های ارسالی یک دکمه شیشه‌ای جهت خرید یا ارتباط نمایش داده می‌شود.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">متن دکمه</label>
                   <input 
                     type="text" 
                     value={config.buttonText} 
                     onChange={(e) => setConfig({ ...config, buttonText: e.target.value })} 
                     placeholder="مثال: 🛒 ثبت سفارش"
                     className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" 
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">آیدی پشتیبانی (لینک دکمه)</label>
                   <input 
                     type="text" 
                     value={config.supportId || ''} 
                     onChange={(e) => setConfig({ ...config, supportId: e.target.value })} 
                     placeholder="مثال: admin_user (بدون @)" 
                     className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-left font-mono" 
                     dir="ltr" 
                   />
                </div>
              </div>

              <div className="mb-6">
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key درگاه پرداخت (اختیاری)</label>
                   <input 
                     type="text" 
                     value={config.paymentApiKey || ''} 
                     onChange={(e) => setConfig({ ...config, paymentApiKey: e.target.value })} 
                     placeholder="مثال: زرین پال یا ..." 
                     className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-left font-mono" 
                     dir="ltr" 
                   />
              </div>

              <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">پیام دکمه "ارتباط با ما"</label>
                   <textarea 
                     rows={4}
                     value={config.contactMessage || ''} 
                     onChange={(e) => setConfig({ ...config, contactMessage: e.target.value })} 
                     placeholder="متنی که وقتی کاربر روی دکمه 'ارتباط با ما' کلیک می‌کند نمایش داده می‌شود..."
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
            {isLoading ? (
              <div className="animate-spin text-4xl">⏳</div>
            ) : (
              <>
                <div className={`p-6 rounded-2xl border ${botInfo ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                  <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">وضعیت ربات</h3>
                  {botInfo ? (
                    <div className="text-green-700 dark:text-green-400">
                      <p>✅ متصل شد</p>
                      <p className="text-sm mt-1">نام: {botInfo.first_name}</p>
                      <p className="text-sm font-mono">@{botInfo.username}</p>
                    </div>
                  ) : (
                     <p className="text-red-600 dark:text-red-400">❌ عدم ارتباط (توکن را بررسی کنید)</p>
                  )}
                </div>

                <div className={`p-6 rounded-2xl border ${channelName && !channelName.includes('خطا') ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}>
                  <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">وضعیت کانال</h3>
                  {channelName ? (
                    <p className="text-blue-700 dark:text-blue-400 font-medium">{channelName}</p>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">بررسی نشده یا یافت نشد</p>
                  )}
                </div>

                <button onClick={checkConnection} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                  بررسی مجدد
                </button>
              </>
            )}
          </div>
        )}

        {/* PHONE VERIFICATION TAB */}
        {activeTab === 'verification' && (
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">📱 سیستم تایید شماره</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400 leading-relaxed">
                        در اینجا می‌توانید برای کاربران تلگرام دکمه "ارسال شماره تلفن" بفرستید. پس از اینکه کاربر روی دکمه زد، با زدن دکمه "بررسی تاییدها"، شماره او در سیستم ثبت می‌شود.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Request Section */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl">
                        <h4 className="font-bold text-gray-800 dark:text-white mb-4">۱. ارسال درخواست</h4>
                        <div className="space-y-4">
                            <input 
                                type="text" 
                                placeholder="شناسه عددی کاربر (User ID)" 
                                value={targetChatId}
                                onChange={(e) => setTargetChatId(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                             <p className="text-xs text-gray-400">
                                نکته: User ID را از پیام‌های فوروارد شده یا ربات‌هایی مثل @userinfobot پیدا کنید.
                             </p>
                            <button 
                                onClick={handleSendRequest}
                                disabled={!targetChatId || verifyLoading}
                                className="w-full py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                            >
                                {verifyLoading ? 'در حال ارسال...' : 'ارسال دکمه تایید'}
                            </button>
                        </div>
                    </div>

                    {/* Check Section */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl">
                         <h4 className="font-bold text-gray-800 dark:text-white mb-4">۲. دریافت شماره‌ها</h4>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                             ربات را چک کنید تا ببینید آیا کاربری شماره فرستاده است یا خیر.
                         </p>
                         <button 
                            onClick={handleCheckUpdates}
                            disabled={verifyLoading}
                            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                         >
                             {verifyLoading ? 'در حال بررسی...' : '🔄 بررسی تاییدهای جدید'}
                         </button>
                    </div>
                </div>

                {verifyMsg && (
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 animate-pulse">
                        {verifyMsg}
                    </div>
                )}

                {/* Verified Users List */}
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span>✅</span> کاربران تایید شده ({verifiedUsers.length})
                    </h4>
                    <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 overflow-hidden max-h-64 overflow-y-auto">
                        {verifiedUsers.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">هنوز کاربری تایید نشده است.</div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-600">
                                {verifiedUsers.map((user, idx) => (
                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white">{user.firstName} {user.lastName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: {user.userId} {user.username ? `| @${user.username}` : ''}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-bold text-brand-600 dark:text-brand-400 dir-ltr">{user.phoneNumber}</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(user.verifiedAt).toLocaleDateString('fa-IR')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {logs.length === 0 ? (
              <p className="text-center text-gray-400 py-8">هنوز هیچ ارسالی انجام نشده است.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`p-4 rounded-xl border-l-4 ${log.status === 'SUCCESS' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-red-500 bg-red-50 dark:bg-red-900/10'} mb-2`}>
                   <div className="flex justify-between">
                     <span className="font-bold text-gray-800 dark:text-white">{log.productName}</span>
                     <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.sentAt).toLocaleString('fa-IR')}</span>
                   </div>
                   <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
                     {log.status === 'SUCCESS' ? '✅ ارسال موفق' : `❌ خطا: ${log.details}`}
                   </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
