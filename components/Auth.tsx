
import React, { useState } from 'react';
import { AuthService } from '../services/auth';

interface AuthProps {
  onLogin: () => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'VERIFY';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  // UI State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // --- LOGIN ---
    if (mode === 'LOGIN') {
      const result = AuthService.login(username, password);
      if (result.success) {
        onLogin();
      } else if (result.requireVerification) {
        // User exists but needs verification
        if (result.code) {
           setSimulatedCode(result.code);
        }
        setMode('VERIFY');
        setError('لطفاً ابتدا حساب خود را تایید کنید.');
      } else {
        setError(result.message);
      }
    } 
    
    // --- REGISTER ---
    else if (mode === 'REGISTER') {
      if (!username || !password || !fullName) {
        setError('لطفاً تمام فیلدها را پر کنید.');
        return;
      }
      const result = AuthService.register({ username, password, fullName });
      if (result.success) {
        setSuccess(result.message);
        // Set the simulated code to display to the user
        setSimulatedCode(result.code || null);
        setTimeout(() => {
          setMode('VERIFY');
          setSuccess('');
        }, 1000);
      } else {
        setError(result.message);
      }
    } 
    
    // --- VERIFY ---
    else if (mode === 'VERIFY') {
       const result = AuthService.verifyUser(username, verificationCode);
       if (result.success) {
           setSuccess(result.message);
           setSimulatedCode(null);
           setTimeout(() => {
               // Auto login after verification
               const loginRes = AuthService.login(username, password);
               if (loginRes.success) {
                   onLogin();
               } else {
                   setMode('LOGIN');
               }
           }, 1500);
       } else {
           setError(result.message);
       }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-brand-600 dark:text-brand-500 mb-2">⚡ تله شاپ</h1>
          <p className="text-gray-500 dark:text-gray-400">سیستم مدیریت فروشگاه تلگرام</p>
        </div>

        {/* Simulation Toast for Demo Purposes */}
        {mode === 'VERIFY' && simulatedCode && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-xl animate-pulse">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-bold mb-1 text-center">
                    📩 پیامک شبیه سازی شده (سرور نداریم)
                </p>
                <p className="text-center text-gray-700 dark:text-gray-200 text-sm">
                    کد تایید شما: <span className="font-mono font-black text-lg tracking-widest mx-2">{simulatedCode}</span>
                </p>
            </div>
        )}

        {mode !== 'VERIFY' && (
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-6">
            <button
                onClick={() => { setMode('LOGIN'); setError(''); setSimulatedCode(null); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'LOGIN' ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
                ورود
            </button>
            <button
                onClick={() => { setMode('REGISTER'); setError(''); setSimulatedCode(null); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'REGISTER' ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
                ثبت نام
            </button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'REGISTER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام و نام خانوادگی</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-colors"
                required
              />
            </div>
          )}
          
          {/* Hide username/password in verify mode to simplify UI, assume session context from registration */}
          {mode !== 'VERIFY' && (
            <>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام کاربری</label>
                    <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-colors"
                    dir="ltr"
                    required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رمز عبور</label>
                    <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-colors"
                    dir="ltr"
                    required
                    />
                </div>
            </>
          )}

          {mode === 'VERIFY' && (
            <div className="animate-fade-in">
                <div className="text-center mb-4">
                    <h3 className="font-bold text-gray-800 dark:text-white">تایید حساب کاربری</h3>
                    <p className="text-xs text-gray-500 mt-1">کد تایید به شماره/ایمیل {username} ارسال شد.</p>
                </div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">کد تایید</label>
                <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-colors text-center text-2xl tracking-widest font-mono"
                placeholder="-----"
                maxLength={5}
                required
                autoFocus
                />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm text-center">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all mt-2"
          >
            {mode === 'LOGIN' && 'ورود به پنل'}
            {mode === 'REGISTER' && 'ثبت نام و دریافت کد'}
            {mode === 'VERIFY' && 'تایید نهایی'}
          </button>
          
          {mode === 'VERIFY' && (
              <button 
                type="button"
                onClick={() => setMode('REGISTER')}
                className="w-full text-xs text-gray-400 hover:text-gray-600 mt-2"
              >
                  بازگشت / تغییر اطلاعات
              </button>
          )}
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400">
          نسخه ۱.۳.۰ | طراحی شده با ❤️
        </div>
      </div>
    </div>
  );
};
