
import React from 'react';

interface WelcomeModalProps {
  userName: string;
  message?: string;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ userName, message, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
        {/* Header with Pattern */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10">
            <div className="text-5xl mb-2">👋</div>
            <h2 className="text-2xl font-black text-white">سلام {userName}!</h2>
            <p className="text-brand-100 mt-1">به پنل مدیریت تله‌شاپ خوش آمدید</p>
          </div>
        </div>

        <div className="p-6">
          {message ? (
             <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed text-sm">
               {message}
             </div>
          ) : (
             <>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed text-center">
                    شما اکنون می‌توانید فروشگاه خود را با امکانات زیر مدیریت کنید:
                </p>

                <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
                        📦
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-white text-sm">مدیریت محصولات</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">محصولات خود را به راحتی اضافه و ویرایش کنید.</p>
                    </div>
                    </div>
                    <div className="flex items-start gap-3">
                    <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2 rounded-lg">
                        ✨
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-white text-sm">هوش مصنوعی Gemini</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">توضیحات جذاب و فروشنده برای محصولات بنویسید.</p>
                    </div>
                    </div>
                    <div className="flex items-start gap-3">
                    <div className="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 p-2 rounded-lg">
                        ✈️
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-white text-sm">اتصال به تلگرام</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ارسال مستقیم پست‌ها به کانال با دکمه‌های شیشه‌ای.</p>
                    </div>
                    </div>
                </div>
             </>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-500/30 transition-all transform hover:scale-[1.02]"
          >
            شروع کار 🚀
          </button>
        </div>
      </div>
    </div>
  );
};