'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  RiNodeTree,
  RiFolderLine,
  RiFolderSharedLine,
  RiSearch2Line,
  RiSparklingFill,
  RiArrowRightSLine,
} from 'react-icons/ri';
import { api, ProductCategoryItem } from '@/lib/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PARENTS' | 'SUBCATEGORIES'>('ALL');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategoryItem | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await api.adminListCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Filter top-level parent categories (where parentId is null/empty)
  const parentCategories = useMemo(() => {
    return categories.filter((c) => !c.parentId);
  }, [categories]);

  const subCategoriesList = useMemo(() => {
    return categories.filter((c) => Boolean(c.parentId));
  }, [categories]);

  const openCreateModal = (preselectedParentId?: string) => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setImage('');
    setParentId(preselectedParentId || '');
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
    setParentId(cat.parentId || '');
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
          parentId: parentId ? parentId : null,
          sortOrder: Number(sortOrder),
          isActive,
        });
      } else {
        await api.adminCreateCategory({
          name,
          slug,
          description,
          image,
          parentId: parentId ? parentId : null,
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

  // Structured Hierarchy Tree: Parent Categories with their Children
  const hierarchyTree = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // Build tree
    const rootParents = categories.filter((c) => !c.parentId);
    const childrenMap = new Map<string, ProductCategoryItem[]>();
    
    for (const c of categories) {
      if (c.parentId) {
        const existing = childrenMap.get(c.parentId) || [];
        existing.push(c);
        childrenMap.set(c.parentId, existing);
      }
    }

    const tree = rootParents.map((parent) => ({
      ...parent,
      subcategories: (childrenMap.get(parent.id) || []).sort((a, b) => a.sortOrder - b.sortOrder),
    }));

    // Filter tree if search or tab filter active
    if (activeFilter === 'PARENTS') {
      return tree.filter((p) => {
        if (!query) return true;
        return (
          p.name.toLowerCase().includes(query) ||
          p.slug.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
        );
      });
    }

    if (activeFilter === 'SUBCATEGORIES') {
      return tree
        .map((p) => ({
          ...p,
          subcategories: p.subcategories.filter((s) => {
            if (!query) return true;
            return (
              s.name.toLowerCase().includes(query) ||
              s.slug.toLowerCase().includes(query) ||
              (s.description && s.description.toLowerCase().includes(query))
            );
          }),
        }))
        .filter((p) => p.subcategories.length > 0);
    }

    // ALL with optional search
    if (query) {
      return tree
        .map((p) => {
          const parentMatches =
            p.name.toLowerCase().includes(query) ||
            p.slug.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query));
          
          const matchingSubs = p.subcategories.filter(
            (s) =>
              s.name.toLowerCase().includes(query) ||
              s.slug.toLowerCase().includes(query) ||
              (s.description && s.description.toLowerCase().includes(query)),
          );

          if (parentMatches) {
            return p;
          }
          if (matchingSubs.length > 0) {
            return { ...p, subcategories: matchingSubs };
          }
          return null;
        })
        .filter(Boolean) as typeof tree;
    }

    return tree;
  }, [categories, searchQuery, activeFilter]);

  const totalProductsAcrossCatalogue = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c._count?.products || 0), 0);
  }, [categories]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
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
              Categories & Subcategories
            </h1>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Organize commercial print taxonomies. When customers view a category with subcategories, subcategories are shown first; standalone categories display products directly.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-bold text-[13px] px-4 py-2.5 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <RiAddLine className="h-4 w-4" />
            <span>Add Category / Subcategory</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase font-mono block">
            Parent Categories
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {parentCategories.length}
          </div>
          <span className="text-[10px] text-slate-400">Primary storefront departments</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-700 uppercase font-mono block">
            Subcategories
          </span>
          <div className="text-2xl font-black text-indigo-950 font-mono mt-1">
            {subCategoriesList.length}
          </div>
          <span className="text-[10px] text-indigo-600">Nested granular print types</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase font-mono block">
            Total Products Mapped
          </span>
          <div className="text-2xl font-black text-emerald-900 font-mono mt-1">
            {totalProductsAcrossCatalogue}
          </div>
          <span className="text-[10px] text-emerald-600">Active catalogue items</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase font-mono block">
            Taxonomy Structure
          </span>
          <div className="text-sm font-bold text-slate-900 mt-2 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>2-Tier Active Hierarchy</span>
          </div>
          <span className="text-[10px] text-slate-400">Auto-routes to subcategories or products</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white font-black shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Taxonomies ({categories.length})
          </button>
          <button
            onClick={() => setActiveFilter('PARENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === 'PARENTS'
                ? 'bg-slate-900 text-white font-black shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Parent Categories Only ({parentCategories.length})
          </button>
          <button
            onClick={() => setActiveFilter('SUBCATEGORIES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === 'SUBCATEGORIES'
                ? 'bg-indigo-600 text-white font-black shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Subcategories Only ({subCategoriesList.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <RiSearch2Line className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name, slug..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Categories Hierarchy Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center">
            <RiLoader4Line className="h-8 w-8 text-[#FFED00] animate-spin mb-2" />
            <span className="text-xs font-mono text-slate-500">Loading Taxonomy Hierarchy...</span>
          </div>
        ) : hierarchyTree.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <RiFoldersLine className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-[13px] font-semibold text-slate-700">No categories matching your filter.</p>
            <p className="text-xs text-slate-400">Create your first parent category or subcategory to get started.</p>
            <button
              onClick={() => openCreateModal()}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FFED00] text-slate-950 text-xs font-bold border border-[#E3A008]/40"
            >
              <RiAddLine className="h-4 w-4" />
              <span>Create New Category</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                  <th className="py-3 px-4">Category Name & Hierarchy</th>
                  <th className="py-3 px-4">Slug Route</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Subcategories</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Storefront Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hierarchyTree.map((parent) => (
                  <React.Fragment key={parent.id}>
                    {/* Parent Category Row */}
                    <tr className="bg-slate-50/40 hover:bg-slate-100/60 transition-colors font-medium">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-12 rounded-lg bg-amber-50 border border-amber-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {parent.image ? (
                              <img src={parent.image} alt={parent.name} className="h-full w-full object-cover" />
                            ) : (
                              <RiFoldersLine className="h-5 w-5 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 leading-tight text-[13.5px]">
                                {parent.name}
                              </span>
                              {parent.subcategories.length > 0 && (
                                <span className="bg-amber-100 text-amber-900 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                                  {parent.subcategories.length} subs
                                </span>
                              )}
                            </div>
                            {parent.description && (
                              <span className="text-[12px] text-slate-500 line-clamp-1 mt-0.5 max-w-md">
                                {parent.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <code className="text-xs font-mono font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                          /{parent.slug}
                        </code>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded text-[11px] font-mono">
                          <RiFolderLine className="h-3 w-3" />
                          <span>Parent Category</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                        {parent.subcategories.length > 0 ? (
                          <span>{parent.subcategories.length} subcategories</span>
                        ) : (
                          <span className="text-slate-400 font-normal">None (Direct Products)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {parent._count?.products || 0} products
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            parent.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                          }`}
                        >
                          {parent.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openCreateModal(parent.id)}
                            className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                            title={`Add Subcategory under ${parent.name}`}
                          >
                            <RiAddLine className="h-3.5 w-3.5" />
                            <span>+ Subcategory</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(parent)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Edit Category"
                          >
                            <RiEditLine className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(parent.id, parent.name)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Category"
                          >
                            <RiDeleteBin7Line className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Subcategories (Children Rows Indented) */}
                    {parent.subcategories.map((sub) => (
                      <tr key={sub.id} className="bg-white hover:bg-indigo-50/30 transition-colors">
                        <td className="py-2.5 px-4 pl-12">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center text-slate-300">
                              <span className="font-mono text-sm">↳</span>
                            </div>
                            <div className="h-8 w-10 rounded bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {sub.image ? (
                                <img src={sub.image} alt={sub.name} className="h-full w-full object-cover" />
                              ) : (
                                <RiFolderSharedLine className="h-4 w-4 text-indigo-400" />
                              )}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block leading-tight text-[13px]">
                                {sub.name}
                              </span>
                              {sub.description && (
                                <span className="text-[11px] text-slate-400 line-clamp-1">
                                  {sub.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-4">
                          <code className="text-xs font-mono text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">
                            /{sub.slug}
                          </code>
                        </td>

                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold px-2 py-0.5 rounded text-[10px] font-mono">
                            <span>↳ Sub of {parent.name}</span>
                          </span>
                        </td>

                        <td className="py-2.5 px-4 font-mono text-xs text-slate-400">
                          —
                        </td>

                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                          {sub._count?.products || 0} products
                        </td>

                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              sub.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                            }`}
                          >
                            {sub.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(sub)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit Subcategory"
                            >
                              <RiEditLine className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(sub.id, sub.name)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Subcategory"
                            >
                              <RiDeleteBin7Line className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CATEGORY / SUBCATEGORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <RiNodeTree className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                  {editingCategory
                    ? `Edit Category: ${editingCategory.name}`
                    : parentId
                    ? 'Add Subcategory'
                    : 'Create Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700">
                  {formError}
                </div>
              )}

              {/* Hierarchy: Parent Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Parent Category (Optional)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                >
                  <option value="">None (Top-Level Parent Category)</option>
                  {parentCategories
                    .filter((p) => !editingCategory || p.id !== editingCategory.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        ↳ Subcategory under: {p.name}
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Select a parent to make this a Subcategory. Leave as None to create a Top-Level Category.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Rigid Boxes, Visiting Cards, Vinyl Banners..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Image Banner URL
                </label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Manufacturing scope, substrate types, and finishing options..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded accent-slate-900 cursor-pointer"
                    />
                    <span>Active on Storefront</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-black text-xs border border-[#E3A008]/40 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
