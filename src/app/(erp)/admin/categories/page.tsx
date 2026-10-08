'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RiAddLine,
  RiFoldersLine,
  RiEditLine,
  RiDeleteBin7Line,
  RiLoader4Line,
  RiImage2Line,
  RiCloseLine,
  RiCheckboxCircleLine,
  RiArrowLeftLine,
} from 'react-icons/ri';
import { api, ProductCategoryItem } from '@/lib/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategoryItem | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await api.adminListCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setImage('');
    setSortOrder(categories.length + 1);
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: ProductCategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImage(cat.image || '');
    setSortOrder(cat.sortOrder);
    setIsActive(cat.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, ''),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      setFormError('Category Name and Slug are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingCategory) {
        await api.adminUpdateCategory(editingCategory.id, {
          name,
          slug,
          description,
          image,
          sortOrder: Number(sortOrder),
          isActive,
        });
      } else {
        await api.adminCreateCategory({
          name,
          slug,
          description,
          image,
          sortOrder: Number(sortOrder),
          isActive,
        });
      }
      setIsModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      setFormError(err?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category '${name}'?`)) return;
    try {
      await api.adminDeleteCategory(id);
      await loadCategories();
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 transition mr-1"
              title="Back to Products"
            >
              <RiArrowLeftLine className="h-4 w-4" />
            </Link>
            <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2]">
              Categories & Taxonomies
            </h1>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Admin-controlled categories with custom descriptions, media banners, and storefront sorting.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-semibold text-[13px] px-4 py-2.5 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95"
        >
          <RiAddLine className="h-4 w-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center">
            <RiLoader4Line className="h-8 w-8 text-[#FFED00] animate-spin mb-2" />
            <span className="text-xs font-mono text-slate-500">Loading Categories...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[13px] font-medium text-slate-600">No categories found. Create your first category above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[12px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                  <th className="py-3 px-4">Category Details</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Sort Order</th>
                  <th className="py-3 px-4">Total Products</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {cat.image ? (
                            <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                          ) : (
                            <RiFoldersLine className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight text-[13px]">{cat.name}</span>
                          {cat.description && (
                            <span className="text-[12px] text-slate-500 line-clamp-1 mt-0.5">
                              {cat.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <code className="text-xs font-mono text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                        /{cat.slug}
                      </code>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-800">
                      {cat.sortOrder}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-800">
                      {cat._count?.products || 0} items
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }`}
                      >
                        {cat.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition"
                          title="Edit Category"
                        >
                          <RiEditLine className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete Category"
                        >
                          <RiDeleteBin7Line className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="text-xs font-black text-zinc-900 uppercase">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded text-zinc-400">
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Rigid Boxes & Packaging"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Slug *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Image Banner URL</label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Category scope and manufacturing types..."
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded accent-zinc-900"
                    />
                    <span>Active on Store</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border text-xs font-bold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#FCDD55] text-zinc-950 font-black text-xs border border-zinc-900"
                >
                  {isSubmitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
