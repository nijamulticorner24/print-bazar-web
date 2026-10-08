'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiAddLine,
  RiSearch2Line,
  RiFilter3Line,
  RiFileCopyLine,
  RiEditLine,
  RiEyeLine,
  RiCheckboxCircleLine,
  RiArchiveLine,
  RiDeleteBin7Line,
  RiLoader4Line,
  RiImage2Line,
  RiListSettingsLine,
  RiFlashlightLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiSparklingFill,
  RiPrinterLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import { api, DynamicProduct, ProductCategoryItem } from '@/lib/api';
import { Button, Badge, StatusBadge, Input, Modal, Skeleton } from '@/components/ui';

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New Product Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSlug, setNewProdSlug] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCatId, setNewProdCatId] = useState('');
  const [newProdBasePrice, setNewProdBasePrice] = useState<number>(100);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodsRes, catsRes] = await Promise.all([
        api.adminListProducts({ limit: 100 }),
        api.adminListCategories(),
      ]);
      setProducts(prodsRes.data || []);
      setCategories(catsRes || []);
      if (catsRes && catsRes.length > 0 && !newProdCatId) {
        setNewProdCatId(catsRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load admin products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNameChange = (name: string) => {
    setNewProdName(name);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setNewProdSlug(slug);
    const sku = `PRD-${name.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    setNewProdSku(sku);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdSlug || !newProdSku || !newProdCatId) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await api.adminCreateProduct({
        name: newProdName,
        slug: newProdSlug,
        sku: newProdSku,
        categoryId: newProdCatId,
        basePrice: Number(newProdBasePrice),
        minQuantity: 100,
        productionDays: 2,
        status: 'DRAFT',
      });
      setIsCreateModalOpen(false);
      router.push(`/admin/products/${created.id}`);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create product.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.adminDuplicateProduct(id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate product.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePublish = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.adminPublishProduct(id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to publish product.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchive = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.adminArchiveProduct(id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to archive product.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Title & Creation Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5 bg-white p-5 rounded-xl border shadow-xs">
        <div>
          <span className="text-[11px] font-mono uppercase font-semibold text-slate-400 block mb-1">
            DYNAMIC CATALOGUE ENGINE
          </span>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2]">
            Dynamic Products & Custom Fields
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Admin-controlled configuration rules, live matrix pricing, artwork gates, and preview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" onClick={() => setIsCreateModalOpen(true)}>
            <RiAddLine className="h-4 w-4 mr-1.5" />
            <span>Create New Product</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <RiSearch2Line className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, slug..."
            className="w-full h-9 pl-9 pr-3 text-[13px] font-normal bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 text-[13px] font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-3 text-[13px] font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            Loading Dynamic Products...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No products match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[12px] font-mono font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Base Rate</th>
                  <th className="py-3 px-4">Dynamic Fields</th>
                  <th className="py-3 px-4">Artwork Gate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 p-1">
                          <img
                            src={p.images?.[0]?.url || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=100&auto=format&fit=crop&q=80'}
                            alt=""
                            className="max-h-8 max-w-8 object-contain"
                          />
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 text-[13px] block">
                            {p.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 block">
                            SKU: {p.sku} • /{p.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="font-medium text-[13px]">{p.category?.name || 'Uncategorized'}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-slate-900 text-[13px] tabular-nums block">
                        {formatCurrency(Number(p.basePrice) || 0)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Min: {p.minQuantity || 1} units
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {p.fields?.length || 0} fields
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          p.artworkRequirement === 'REQUIRED'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : p.artworkRequirement === 'DISABLED'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {p.artworkRequirement || 'OPTIONAL'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/products/${p.id}`}>
                          <Button variant="primary" size="xs">
                            <RiEditLine className="h-3.5 w-3.5 mr-1" />
                            <span>Builder</span>
                          </Button>
                        </Link>

                        <button
                          onClick={() => handleDuplicate(p.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                          title="Duplicate Product"
                        >
                          <RiFileCopyLine className="h-4 w-4" />
                        </button>

                        {p.status === 'DRAFT' ? (
                          <button
                            onClick={() => handlePublish(p.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50"
                            title="Publish Product"
                          >
                            <RiCheckboxCircleLine className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                            title="Archive Product"
                          >
                            <RiArchiveLine className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Product */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Dynamic Product"
        subtitle="Initialize schema and configure parametric options in the Product Builder."
        maxWidth="md"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700">
              {createError}
            </div>
          )}

          <Input
            label="Product Name"
            required
            value={newProdName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Luxury Hardcover Notebooks"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU Code"
              required
              value={newProdSku}
              onChange={(e) => setNewProdSku(e.target.value)}
            />
            <Input
              label="URL Slug"
              required
              value={newProdSlug}
              onChange={(e) => setNewProdSlug(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Category <span className="text-amber-600">*</span>
              </label>
              <select
                value={newProdCatId}
                onChange={(e) => setNewProdCatId(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Starting Base Price (₹)"
              type="number"
              required
              value={newProdBasePrice}
              onChange={(e) => setNewProdBasePrice(Number(e.target.value))}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full shadow-brand mt-2"
            disabled={isCreating}
            isLoading={isCreating}
          >
            <span>Create & Launch Field Builder</span>
            <RiAddLine className="h-4 w-4 ml-1.5" />
          </Button>
        </form>
      </Modal>
    </div>
  );
}
