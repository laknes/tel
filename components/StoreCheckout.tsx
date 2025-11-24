
import React, { useState, useEffect } from 'react';
import { Product, ShippingMethod, User, Order } from '../types';

interface StoreCheckoutProps {
  productId: string;
  onBackToAdmin?: () => void; // Only for testing
}

export const StoreCheckout: React.FC<StoreCheckoutProps> = ({ productId }) => {
  const [step, setStep] = useState<'LOGIN' | 'ADDRESS' | 'SHIPPING' | 'INVOICE' | 'PAYMENT'>('LOGIN');
  const [product, setProduct] = useState<Product | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  // Login State
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [fullName, setFullName] = useState('');

  // Address State
  const [address, setAddress] = useState({
    province: '',
    city: '',
    fullAddress: '',
    plaque: '',
    unit: '',
    postalCode: ''
  });

  // Shipping State
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string>('');

  // Loading/Error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch Product Details
    fetch(`/api/products`).then(res => res.json()).then((products: Product[]) => {
      const p = products.find(i => i.id === productId);
      if (p) setProduct(p);
    });

    // Fetch Shipping Methods (Simulated)
    fetch(`/api/store/shipping-methods`).then(res => res.json()).then(setShippingMethods);
  }, [productId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const endpoint = authMode === 'LOGIN' ? '/api/store/login' : '/api/store/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: phone, password, fullName, phoneNumber: phone })
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        setStep('ADDRESS');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
    }
    setLoading(false);
  };

  const handleSubmitOrder = async () => {
    if (!product || !user || !selectedShipping) return;
    setLoading(true);

    const method = shippingMethods.find(m => m.id === selectedShipping);
    const shippingCost = method ? method.cost : 0;
    const totalAmount = product.price + shippingCost;

    const orderData = {
      customerId: user.username,
      customerName: user.fullName,
      customerPhone: user.phoneNumber,
      address: address,
      items: [{
        productId: product.id,
        productName: product.name,
        quantity: 1,
        priceAtTime: product.price
      }],
      shippingMethod: method?.name,
      shippingCost: shippingCost,
      totalAmount: totalAmount,
      status: 'PENDING',
      createdAt: Date.now()
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (data.success) {
        setStep('PAYMENT');
      }
    } catch (e) {
      setError('خطا در ثبت سفارش');
    }
    setLoading(false);
  };

  if (!product) return <div className="p-10 text-center">در حال بارگذاری محصول...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-brand-600 p-4 text-white text-center">
          <h1 className="font-bold text-lg">تکمیل خرید</h1>
          <p className="text-sm opacity-90">{product.name}</p>
        </div>

        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">{error}</div>}

          {/* STEP 1: LOGIN / REGISTER */}
          {step === 'LOGIN' && (
            <form onSubmit={handleAuth} className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
                {authMode === 'LOGIN' ? 'ورود به حساب' : 'ثبت نام'}
              </h2>
              
              {authMode === 'REGISTER' && (
                <input 
                  type="text" 
                  placeholder="نام و نام خانوادگی" 
                  className="w-full p-3 border rounded-xl"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              )}
              
              <input 
                type="tel" 
                placeholder="شماره موبایل" 
                className="w-full p-3 border rounded-xl"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="رمز عبور" 
                className="w-full p-3 border rounded-xl"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              <button disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold">
                {loading ? '...' : (authMode === 'LOGIN' ? 'ورود و ادامه' : 'ثبت نام و ادامه')}
              </button>

              <div className="text-center text-sm text-gray-500 mt-4">
                {authMode === 'LOGIN' ? 'حساب ندارید؟' : 'حساب دارید؟'}
                <button 
                  type="button" 
                  className="text-brand-600 font-bold mr-1"
                  onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                >
                  {authMode === 'LOGIN' ? 'ثبت نام کنید' : 'وارد شوید'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ADDRESS */}
          {step === 'ADDRESS' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-2">📍 آدرس تحویل</h2>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="استان" className="p-3 border rounded-xl" value={address.province} onChange={e => setAddress({...address, province: e.target.value})} />
                <input placeholder="شهر" className="p-3 border rounded-xl" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
              </div>
              <textarea placeholder="آدرس دقیق (خیابان، کوچه...)" className="w-full p-3 border rounded-xl" rows={2} value={address.fullAddress} onChange={e => setAddress({...address, fullAddress: e.target.value})} />
              <div className="grid grid-cols-3 gap-3">
                <input placeholder="پلاک" className="p-3 border rounded-xl" value={address.plaque} onChange={e => setAddress({...address, plaque: e.target.value})} />
                <input placeholder="واحد" className="p-3 border rounded-xl" value={address.unit} onChange={e => setAddress({...address, unit: e.target.value})} />
                <input placeholder="کدپستی" className="p-3 border rounded-xl" value={address.postalCode} onChange={e => setAddress({...address, postalCode: e.target.value})} />
              </div>
              <button 
                onClick={() => {
                    if(address.fullAddress && address.city && address.postalCode) setStep('SHIPPING');
                    else setError('لطفا فیلدهای ضروری را پر کنید');
                }} 
                className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold mt-4"
              >
                تایید آدرس و ادامه
              </button>
            </div>
          )}

          {/* STEP 3: SHIPPING */}
          {step === 'SHIPPING' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-2">🚚 روش ارسال</h2>
              <div className="space-y-3">
                {shippingMethods.map(method => (
                  <div 
                    key={method.id} 
                    onClick={() => setSelectedShipping(method.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer flex justify-between items-center ${selectedShipping === method.id ? 'border-brand-500 bg-brand-50' : 'border-gray-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{method.name.includes('پست') ? '📮' : method.name.includes('تیپاکس') ? '📦' : '🛵'}</div>
                      <div>
                        <p className="font-bold text-gray-800">{method.name}</p>
                        <p className="text-xs text-gray-500">{method.estimatedDays}</p>
                      </div>
                    </div>
                    <div className="text-brand-600 font-bold">
                      {method.cost === 0 ? 'پس کرایه' : `${method.cost.toLocaleString()} ت`}
                    </div>
                  </div>
                ))}
              </div>
              <button 
                disabled={!selectedShipping}
                onClick={() => setStep('INVOICE')} 
                className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold mt-4 disabled:opacity-50"
              >
                مشاهده فاکتور
              </button>
            </div>
          )}

          {/* STEP 4: INVOICE */}
          {step === 'INVOICE' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 text-center mb-4">🧾 فاکتور نهایی</h2>
              
              <div className="bg-gray-50 p-4 rounded-xl space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>محصول: {product.name}</span>
                  <span>{product.price.toLocaleString()} تومان</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>روش ارسال ({shippingMethods.find(m => m.id === selectedShipping)?.name}):</span>
                  <span>{shippingMethods.find(m => m.id === selectedShipping)?.cost.toLocaleString()} تومان</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg text-gray-900">
                  <span>مبلغ قابل پرداخت:</span>
                  <span>{(product.price + (shippingMethods.find(m => m.id === selectedShipping)?.cost || 0)).toLocaleString()} تومان</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1 px-2">
                <p>👤 مشتری: {user?.fullName} ({user?.username})</p>
                <p>📍 آدرس: {address.province}، {address.city}، {address.fullAddress}، پلاک {address.plaque}</p>
              </div>

              <button 
                onClick={handleSubmitOrder} 
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold mt-4 shadow-lg shadow-green-500/30"
              >
                {loading ? 'در حال ثبت...' : 'تایید و پرداخت آنلاین'}
              </button>
              <button onClick={() => setStep('SHIPPING')} className="w-full py-2 text-gray-500">بازگشت</button>
            </div>
          )}

          {/* STEP 5: PAYMENT (Mock) */}
          {step === 'PAYMENT' && (
            <div className="text-center py-10">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-green-600 mb-2">سفارش با موفقیت ثبت شد!</h2>
              <p className="text-gray-500 mb-6">در حال انتقال به درگاه پرداخت...</p>
              <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
