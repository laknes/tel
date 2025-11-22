import React from 'react';
import { Product, Category } from '../types';

interface DashboardStatsProps {
  products: Product[];
  categories: Category[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ products, categories }) => {
  const totalValue = products.reduce((sum, p) => sum + Number(p.price), 0);
  
  const stats = [
    { label: 'تعداد محصولات', value: products.length, color: 'bg-blue-500' },
    { label: 'تعداد دسته بندی ها', value: categories.length, color: 'bg-purple-500' },
    { label: 'ارزش کل موجودی', value: `${totalValue.toLocaleString()} تومان`, color: 'bg-emerald-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors duration-300">
          <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-white text-xl shadow-lg shadow-gray-200 dark:shadow-none`}>
             #
          </div>
          <div>
             <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{stat.label}</p>
             <p className="text-xl font-bold text-gray-800 dark:text-white">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};