import React from 'react';
import { Order, OrderStatus } from '../types';
import { StorageService } from '../services/storage';
import { sendTextMessage } from '../services/telegram';

interface OrderListProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
}

export const OrderList: React.FC<OrderListProps> = ({ orders, onUpdateStatus }) => {
  
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'PROCESSING': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'COMPLETED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'در انتظار';
      case 'PROCESSING': return 'در حال پردازش';
      case 'COMPLETED': return 'تکمیل شده';
      case 'CANCELLED': return 'لغو شده';
      default: return status;
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, order: Order) => {
    const newStatus = e.target.value as OrderStatus;
    
    // 1. Update local storage and UI
    const updatedOrder = { ...order, status: newStatus };
    StorageService.saveOrder(updatedOrder);
    onUpdateStatus(order.id, newStatus);

    // 2. Send Notification to Telegram
    const config = await StorageService.getTelegramConfig();
    const verifiedUsers = await StorageService.getVerifiedUsers();
    
    const targetUser = verifiedUsers.find(u => 
        u.phoneNumber === order.customerPhone || 
        u.phoneNumber.replace('+98', '0') === order.customerPhone
    );

    if (config?.botToken && targetUser) {
        const statusLabel = getStatusLabel(newStatus);
        const message = `سلام ${order.customerName} عزیز،\nوضعیت سفارش شما (کد: ${order.id}) به *${statusLabel}* تغییر کرد.`;
        await sendTextMessage(config.botToken, targetUser.userId, message);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="text-6xl mb-4 opacity-20">🛍️</div>
        <p className="text-gray-400 text-lg font-medium">هنوز سفارشی ثبت نشده است.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors hover:shadow-md relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-2 h-full ${getStatusColor(order.status).split(' ')[0]}`}></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 pr-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">#{order.id}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  {order.customerName}
                </h3>
                <div className="flex flex-col gap-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-2">📱 {order.customerPhone || '---'}</span>
                  <span className="flex items-center gap-2">📍 {order.customerAddress || 'آدرس ثبت نشده'}</span>
                  <span className="flex items-center gap-2">📅 {new Date(order.createdAt).toLocaleString('fa-IR')}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto pl-2">
                <div className="text-2xl font-black text-brand-600 dark:text-brand-400">
                  {order.totalAmount.toLocaleString()} <span className="text-xs font-normal text-gray-500">تومان</span>
                </div>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(e, order)}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-brand-500 w-full md:w-48"
                >
                  <option value="PENDING">⏳ در انتظار</option>
                  <option value="PROCESSING">⚙️ در حال پردازش</option>
                  <option value="COMPLETED">✅ تکمیل شده</option>
                  <option value="CANCELLED">❌ لغو شده</option>
                </select>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">اقلام سفارش</h4>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-500">
                            {item.quantity}
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{item.productName}</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 font-mono">
                      {(item.priceAtTime * item.quantity).toLocaleString()} تومان
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};