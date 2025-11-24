import React, { useState, useEffect } from 'react';
import { Product, ShippingMethod, User, Order } from '../types';

interface StoreCheckoutProps {
  productId: string;
}

export const StoreCheckout: React.FC<StoreCheckoutProps> = ({ productId }) => {
  const [step, setStep] = useState<'LOGIN' | 'ADDRESS' | 'SHIPPING' | 'INVOICE' | 'PAYMENT'>('LOGIN');
  const [product, setProduct] = useState<Product | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [fullName, setFullName] = useState('');

  const [address, setAddress] = useState({ province: '', city: '', fullAddress: '', plaque: '', unit: '', postalCode: '' });
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/products`).then(res => res.json()).then((products: Product[]) => {
      const p = products.find(i => i.id === productId);
      if (p) setProduct(p);
    });
    fetch(`/api/store/shipping-methods`).then(res => res.json()).then(setShippingMethods);
  }, [productId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const endpoint = authMode === 'LOGIN' ? '/api/store/login' : '/api/store/register';
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: phone, password, fullName, phoneNumber: phone }) });
      const data = await res.json();
      if (data.success) { setUser(data.user); setStep('ADDRESS'); } else setError(data.message);
    } catch (err) { setError('خطا در ارتباط'); }
    setLoading(false);
  };

  const handleSubmitOrder = async () => {
    if (!product || !user || !selectedShipping) return;
    setLoading(true);
    const method = shippingMethods.find(m => m.id === selectedShipping);
    const shippingCost = method ? Number(method.cost) : 0;
    const totalAmount = Number(product.price) + shippingCost;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.username, customerName: user.fullName, customerPhone: user.phoneNumber || user.username,
          address, shippingMethod: method?.name, shippingCost, totalAmount, status: 'PENDING', createdAt: Date.now(),
          items: [{ productId: product.id, productName: product.name, quantity: 1, priceAtTime: product.price }]
        })
      });
      const data = await res.json();
      if (data.success) setStep('PAYMENT');
    } catch (e) { setError('خطا در ثبت'); }
    setLoading(false);
  };

  if (!product) return <div className="p-10 text-center">در حال بارگذاری...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-brand-600 p-4 text-white text-center"><h1 className="font-bold">تکمیل خرید</h1><p className="text-xs">{product.name}</p></div>
        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm text-center">{error}</div>}

          {step === 'LOGIN' && (
            <form onSubmit={handleAuth} className="space-y-4">
              <h2 className="text-center font-bold">{authMode === 'LOGIN' ? 'ورود' : 'ثبت نام'}</h2>
              {authMode === 'REGISTER' && <input placeholder="نام کامل" className="w-full p-3 border rounded-xl" value={fullName} onChange={e => setFullName(e.target.value)} required />}
              <input placeholder="شماره موبایل" className="w-full p-3 border rounded-xl" value={phone} onChange={e => setPhone(e.target.value)} required />
              <input type="password" placeholder="رمز عبور" className="w-full p-3 border rounded-xl" value={password} onChange={e => setPassword(e.target.value)} required />
              <button disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold">{loading ? '...' : 'ادامه'}</button>
              <div className="text-center text-sm text-gray-500 cursor-pointer" onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}>{authMode === 'LOGIN' ? 'ثبت نام کنید' : 'وارد شوید'}</div>
            </form>
          )}

          {step === 'ADDRESS' && (
            <div className="space-y-3">
              <h2 className="font-bold">📍 آدرس تحویل</h2>
              <div className="grid grid-cols-2 gap-2"><input placeholder="استان" className="p-3 border rounded-xl" value={address.province} onChange={e => setAddress({...address, province: e.target.value})} /><input placeholder="شهر" className="p-3 border rounded-xl" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} /></div>
              <textarea placeholder="آدرس دقیق" className="w-full p-3 border rounded-xl" rows={2} value={address.fullAddress} onChange={e => setAddress({...address, fullAddress: e.target.value})} />
              <div className="grid grid-cols-3 gap-2"><input placeholder="پلاک" className="p-3 border rounded-xl" value={address.plaque} onChange={e => setAddress({...address, plaque: e.target.value})} /><input placeholder="واحد" className="p-3 border rounded-xl" value={address.unit} onChange={e => setAddress({...address, unit: e.target.value})} /><input placeholder="کدپستی" className="p-3 border rounded-xl" value={address.postalCode} onChange={e => setAddress({...address, postalCode: e.target.value})} /></div>
              <button onClick={() => { if(address.fullAddress && address.city) setStep('SHIPPING'); else setError('آدرس کامل نیست'); }} className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold mt-2">تایید و ادامه</button>
            </div>
          )}

          {step === 'SHIPPING' && (
            <div className="space-y-3">
              <h2 className="font-bold">🚚 روش ارسال</h2>
              {shippingMethods.map(m => (
                <div key={m.id} onClick={() => setSelectedShipping(m.id)} className={`p-4 rounded-xl border-2 cursor-pointer flex justify-between items-center ${selectedShipping === m.id ? 'border-brand-500 bg-brand-50' : 'border-gray-100'}`}>
                  <div><p className="font-bold">{m.name}</p><p className="text-xs text-gray-500">{m.estimatedDays}</p></div>
                  <div className="text-brand-600 font-bold">{Number(m.cost) === 0 ? 'پس کرایه' : `${Number(m.cost).toLocaleString()} ت`}</div>
                </div>
              ))}
              <button disabled={!selectedShipping} onClick={() => setStep('INVOICE')} className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold mt-4 disabled:opacity-50">مشاهده فاکتور</button>
            </div>
          )}

          {step === 'INVOICE' && (
            <div className="space-y-4">
              <h2 className="text-center font-bold">🧾 فاکتور نهایی</h2>
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between"><span>محصول</span><span>{Number(product.price).toLocaleString()} ت</span></div>
                <div className="flex justify-between text-gray-600"><span>هزینه ارسال</span><span>{shippingMethods.find(m => m.id === selectedShipping)?.cost.toLocaleString()} ت</span></div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>مجموع</span><span>{(Number(product.price) + (shippingMethods.find(m => m.id === selectedShipping)?.cost || 0)).toLocaleString()} ت</span></div>
              </div>
              <button onClick={handleSubmitOrder} disabled={loading} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg">{loading ? '...' : 'پرداخت آنلاین'}</button>
              <button onClick={() => setStep('SHIPPING')} className="w-full py-2 text-gray-500">بازگشت</button>
            </div>
          )}

          {step === 'PAYMENT' && (
            <div className="text-center py-10">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="font-bold text-green-600">ثبت شد!</h2>
              <p className="text-gray-500">در حال انتقال به درگاه...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};