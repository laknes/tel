
import React, { useState } from 'react';
import { Product, Category } from '../types';

interface ProductListProps {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onSendToTelegram: (product: Product) => void;
  hideFilters?: boolean;
}

export const ProductList: React.FC<ProductListProps> = ({ 
  products, 
  categories, 
  onEdit, 
  onDelete, 
  onSendToTelegram,
  hideFilters = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'price' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getCategoryName = (catId: string) => categories.find(c => c.id === catId)?.name || 'نامشخص';

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // Filter Logic
  const filteredProducts = products.filter(product => {
    const matchCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchMin = minPrice === '' || product.price >= Number(minPrice);
    const matchMax = maxPrice === '' || product.price <= Number(maxPrice);
    const matchSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (product.productCode && product.productCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchMin && matchMax && matchSearch;
  });

  // Sorting Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
        case 'name':
            comparison = a.name.localeCompare(b.name, 'fa');
            break;
        case 'price':
            comparison = a.price - b.price;
            break;
        case 'createdAt':
            comparison = a.createdAt - b.createdAt;
            break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="text-6xl mb-4 opacity-20">📦</div>
        <p className="text-gray-400 text-lg font-medium">هنوز محصولی اضافه نشده است.</p>
        <p className="text-gray-300 dark:text-gray-500 text-sm mt-2">از دکمه "محصول جدید" برای شروع استفاده کنید.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter & Sort Bar */}
      {!hideFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-end gap-4 transition-colors">
          
          {/* Search Input */}
          <div className="w-full md:w-auto md:flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">جستجو</label>
            <div className="relative">
                <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="نام یا کد محصول..."
                className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-colors"
                />
                <span className="absolute top-2.5 right-3 text-gray-400 transform -translate-y-0">🔍</span>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4 w-full md:w-auto">
            <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">فیلتر دسته بندی</label>
                <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-colors"
                >
                <option value="all">همه دسته ها</option>
                {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                </select>
            </div>

            <div className="w-24">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">حداقل</label>
                <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                />
            </div>

            <div className="w-24">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">حداکثر</label>
                <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                />
            </div>
          </div>

          {/* Sorting Controls */}
          <div className="flex gap-2 w-full md:w-auto">
             <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">مرتب سازی</label>
                <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as 'name' | 'price' | 'createdAt')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-colors"
                >
                <option value="createdAt">📅 تاریخ ثبت</option>
                <option value="price">💰 قیمت</option>
                <option value="name">📝 نام محصول</option>
                </select>
            </div>
            <div className="w-12">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">&nbsp;</label>
                <button 
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="w-full h-[38px] flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    title={sortOrder === 'asc' ? 'صعودی' : 'نزولی'}
                >
                    {sortOrder === 'asc' ? '⬆️' : '⬇️'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedProducts.map((product) => {
          const isExpanded = expandedIds.has(product.id);
          
          return (
            <div 
              key={product.id} 
              onClick={() => toggleExpand(product.id)}
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer group ${isExpanded ? 'ring-2 ring-brand-500/20' : ''}`}
            >
              <div className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">📦</div>
                )}
                <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm">
                  {getCategoryName(product.category)}
                </div>
                <div className="absolute bottom-3 left-3 flex gap-2">
                    {product.productCode && (
                    <div className="bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
                        {product.productCode}
                    </div>
                    )}
                    {product.itemsPerPackage && product.itemsPerPackage > 1 && (
                        <div className="bg-brand-600/90 text-white px-2 py-1 rounded text-xs font-bold">
                            {product.itemsPerPackage} تایی
                        </div>
                    )}
                </div>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white line-clamp-1" title={product.name}>
                    {product.name}
                  </h3>
                </div>
                
                <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mb-4">
                  {product.price.toLocaleString()} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">تومان</span>
                </div>

                {/* Expandable Content */}
                <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                        {product.description || 'توضیحی وارد نشده است.'}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 text-left">
                        ثبت شده در: {new Date(product.createdAt).toLocaleDateString('fa-IR')}
                    </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="ویرایش"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="حذف"
                  >
                    🗑️
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSendToTelegram(product); }}
                    className="flex-1 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 text-brand-600 dark:text-brand-300 text-sm font-bold py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">✈️</span>
                    ارسال
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {sortedProducts.length === 0 && (
        <div className="text-center py-10 text-gray-400">
            هیچ محصولی با این مشخصات یافت نشد.
        </div>
      )}
    </div>
  );
};
