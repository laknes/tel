
import React, { useState, useRef } from 'react';
import { Product, Category } from '../types';
import { generateProductDescription } from '../services/gemini';

interface ProductFormProps {
  categories: Category[];
  onSave: (product: Product) => void;
  onCancel: () => void;
  editingProduct?: Product;
}

export const ProductForm: React.FC<ProductFormProps> = ({ categories, onSave, onCancel, editingProduct }) => {
  const [name, setName] = useState(editingProduct?.name || '');
  const [productCode, setProductCode] = useState(editingProduct?.productCode || '');
  const [price, setPrice] = useState<number | string>(editingProduct?.price || '');
  const [category, setCategory] = useState(editingProduct?.category || (categories[0]?.id || ''));
  const [description, setDescription] = useState(editingProduct?.description || '');
  const [imageUrl, setImageUrl] = useState(editingProduct?.imageUrl || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('لطفا یک فایل تصویر انتخاب کنید.');
      return;
    }
    // Simple size check (e.g., 2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم تصویر باید کمتر از ۲ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateDescription = async () => {
    if (!name || !category) {
      alert("لطفاً نام محصول و دسته بندی را وارد کنید.");
      return;
    }
    setIsGenerating(true);
    const catName = categories.find(c => c.id === category)?.name || 'عمومی';
    const desc = await generateProductDescription(name, catName, Number(price));
    setDescription(desc);
    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category || !productCode) {
        alert("لطفاً تمام فیلدهای ضروری (نام، کد، قیمت، دسته) را پر کنید.");
        return;
    }

    const newProduct: Product = {
      id: editingProduct?.id || Date.now().toString(),
      productCode,
      name,
      price: Number(price),
      category,
      description,
      imageUrl,
      createdAt: editingProduct?.createdAt || Date.now()
    };

    onSave(newProduct);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
      <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
        {editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Area */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-200 group ${
              isDragging 
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
                : imageUrl 
                  ? 'border-brand-500' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-brand-400'
            }`}
          >
            {imageUrl ? (
              <>
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={removeImage}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="حذف تصویر"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                <span className="text-4xl mb-1">+</span>
                <span className="text-[10px]">تصویر</span>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">تصویر محصول</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              برای بارگذاری کلیک کنید یا تصویر را بکشید و رها کنید.
              <br/>
              <span className="text-xs text-gray-400">(حداکثر 2 مگابایت)</span>
            </p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>

        {/* Code and Name */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">کد محصول</label>
            <input
              type="text"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all font-mono text-left dir-ltr"
              placeholder="ABC-101"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نام محصول</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              placeholder="مثال: هدفون بی سیم"
              required
            />
          </div>
        </div>
        
        {/* Price and Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">قیمت (تومان)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              placeholder="مثال: 150000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">دسته بندی</label>
            <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
            >
                <option value="" disabled>انتخاب کنید</option>
                {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">توضیحات</label>
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={isGenerating}
              className="text-xs flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium disabled:opacity-50"
            >
              {isGenerating ? (
                <>✨ در حال نوشتن...</>
              ) : (
                <>✨ تولید با هوش مصنوعی</>
              )}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none"
            placeholder="توضیحات محصول را بنویسید..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all"
          >
            {editingProduct ? 'ذخیره تغییرات' : 'افزودن محصول'}
          </button>
        </div>
      </form>
    </div>
  );
};
