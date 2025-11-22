
import React, { useState } from 'react';
import { AuthService } from '../services/auth';

interface AuthProps {
  onLogin: () => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'VERIFY';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'LOGIN') {
      const result = await AuthService.login(username, password);
      if (result.success) {
        onLogin();
      } else if (result.requireVerification) {
        if (result.code) setSimulatedCode(result.code);
        setMode('VERIFY');
        setError('لطفاً ابتدا حساب خود را تایید کنید.');
      } else {
        setError(result.message);
      }
    } else if (mode === 'REGISTER') {
      const result = await AuthService.register({ username, password, fullName });
      setError(result.message); // Assuming register is disabled/restricted in this server version
    } else if (mode === 'VERIFY') {
       const result = AuthService.verifyUser(username, verificationCode);
       if (result.success) {
           setSuccess(result.message);
           setSimulatedCode(null);
           setTimeout(async () => {
               const loginRes = await AuthService.login(username, password);
               if (loginRes.success) onLogin();
               else setMode('LOGIN');
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
          <p className="text-gray-500 dark:text-gray-400">سیستم مدیریت فروشگاه تلگرام (سرور)</p>
        </div>

        {mode === 'VERIFY' && simulatedCode && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-xl animate-pulse">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-bold mb-1 text-center">
                    📩 پیامک شبیه سازی شده
                </p>
                <p className="text-center text-gray-700 dark:text-gray-200 text-sm">
                    کد تایید شما: <span className="font-mono font-black text-lg tracking-widest mx-2">{simulatedCode}</span>
                </p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'REGISTER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام و نام خانوادگی</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" required />
            </div>
          )}
          
          {mode !== 'VERIFY' && (
            <>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام کاربری</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" dir="ltr" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رمز عبور</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" dir="ltr" required />
                </div>
            </>
          )}

          {mode === 'VERIFY' && (
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">کد تایید</label>
                <input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none text-center text-2xl tracking-widest font-mono" maxLength={5} required autoFocus />
            </div>
          )}

          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center">{error}</div>}
          
          <button type="submit" className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all mt-2">
            {mode === 'LOGIN' && 'ورود به پنل'}
            {mode === 'REGISTER' && 'ثبت نام'}
            {mode === 'VERIFY' && 'تایید نهایی'}
          </button>
        </form>
      </div>
    </div>
  );
};
