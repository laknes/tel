import React, { useState } from 'react';
import { Category } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onAdd, onDelete }) => {
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.trim()) {
      onAdd(newCategory.trim());
      setNewCategory('');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl mx-auto transition-colors">
      <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
        🏷️ مدیریت دسته بندی ها
      </h2>

      <form onSubmit={handleAdd} className="flex gap-3 mb-8">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="نام دسته بندی جدید..."
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!newCategory.trim()}
          className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          افزودن
        </button>
      </form>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <span className="font-medium text-gray-700 dark:text-gray-200">{cat.name}</span>
            <button
              onClick={() => onDelete(cat.id)}
              className="text-red-500 hover:text-red-700 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow text-sm transition-colors"
            >
              حذف
            </button>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-center text-gray-400 py-4">هیچ دسته بندی وجود ندارد.</p>
        )}
      </div>
    </div>
  );
};