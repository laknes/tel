import React, { useState, useEffect } from 'react';
import { Product, ShippingMethod, User } from '../types';

interface StoreCheckoutProps {
  cartUserId: string;
}

// Cart item extended with Product details
interface CartItem extends Product {
    quantity: number;
}

export const StoreCheckout: React.FC<StoreCheckoutProps> = ({ cartUserId }) => {
  const [step, setStep] = useState<'LOGIN' | 'ADDRESS' | 'SHIPPING' | 'INVOICE' | 'PAYMENT'>('LOGIN');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
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

  // Fetch Cart items for this Telegram User
  useEffect(() => {
    setLoading(true);
    fetch(`/api/store/cart/${cartUserId}`)
        .then(res => res.json())
        .then(items => {
            setCartItems(items);
            setLoading(false);
        })
        .catch(() => setLoading(false));
        
    fetch(`/api/store/shipping-methods`).then(res => res.json()).then(setShippingMethods);
  }, [cartUserId]);

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
    if (cartItems.length === 0 || !user || !selectedShipping) return;
    setLoading(true);
    
    const method = shippingMethods.find(m => m.id === selectedShipping);
    const shippingCost = method ? Number(method.cost) : 0;
    const itemsTotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const totalAmount = itemsTotal + shippingCost;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `ORD-${Date.now().toString().slice(-6)}`,
          customerId: cartUserId, // Use Telegram ID as link key to clear cart
          customerName: user.fullName, 
          customerPhone: user.phoneNumber || user.username,
          address, 
          shippingMethod: method?.name, 
          shippingCost, 
          totalAmount, 
          status: 'PENDING', 
          createdAt: Date.now(),
          items: cartItems.map(item => ({ 
              productId: item.id, 
              productName: item.name, 
              quantity: item.quantity, 
              priceAtTime: item.price 
          }))
        })
      });
      const data = await res.json();
      if (data.success) setStep('PAYMENT');
    } catch (e) { setError('خطا در ثبت'); }
    setLoading(false);
  };

  if (loading && cartItems.length === 0) return <div className="p-10 text-center">در حال بارگذاری سبد خرید...</div>;
  if (cartItems.length === 0) return <div className="p-10 text-center">سبد خرید خالی است.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-brand-600 p-4 text-white text-center">
            <h1 className="font-bold">سبد خرید</h1>
            <p className="text-xs">{cartItems.length} محصول</p>
        </div>
        
        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm text-center">{error}</div>}

          {step === 'LOGIN' && (
            <form onSubmit={handleAuth} className="space-y-4">
                {/* Show Mini Cart Summary */}
                <div className="bg-gray-50 p-3 rounded-xl mb-4 max-h-32 overflow-y-auto">
                    {cartItems.map(item => (
                        <div key={item.id} className="flex justify-between text-xs mb-1">
                            <span>{item.name} ({item.quantity})</span>
                            <span>{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                </div>

              <h2 className="text-center font-bold">{authMode === 'LOGIN' ? 'ورود به حساب' : 'ثبت نام'}</h2>
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
                {cartItems.map(item => (
                    <div key={item.id} className="flex justify-between"><span>{item.name} x{item.quantity}</span><span>{(item.price * item.quantity).toLocaleString()}</span></div>
                ))}
                <div className="border-t my-2"></div>
                <div className="flex justify-between text-gray-600"><span>هزینه ارسال</span><span>{shippingMethods.find(m => m.id === selectedShipping)?.cost.toLocaleString()} ت</span></div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>مجموع قابل پرداخت</span>
                    <span>
                        {(
                            cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0) + 
                            (shippingMethods.find(m => m.id === selectedShipping)?.cost || 0)
                        ).toLocaleString()} ت
                    </span>
                </div>
              </div>
              <button onClick={handleSubmitOrder} disabled={loading} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg">{loading ? '...' : 'پرداخت آنلاین'}</button>
              <button onClick={() => setStep('SHIPPING')} className="w-full py-2 text-gray-500">بازگشت</button>
            </div>
          )}

          {step === 'PAYMENT' && (
            <div className="text-center py-10">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="font-bold text-green-600">سفارش شما ثبت شد!</h2>
              <p className="text-gray-500 mt-2">کد پیگیری: ORD-{Date.now().toString().slice(-6)}</p>
              <p className="text-sm text-gray-400 mt-4">در حال انتقال به درگاه بانکی...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};