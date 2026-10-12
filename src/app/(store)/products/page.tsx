'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  RiPrinterLine,
  RiArrowRightLine,
  RiSearch2Line,
  RiFilter3Line,
  RiLoader4Line,
  RiImage2Line,
  RiCheckDoubleLine,
  RiSparklingFill,
  RiShieldCheckLine,
  RiFoldersLine,
  RiFolderSharedLine,
  RiArrowLeftLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import { api, DynamicProduct, ProductCategoryItem, resolveImageUrl } from '@/lib/api';
import { Button, Badge, Skeleton, EmptyState, ProductCard } from '@/components/ui';

function ProductsCatalogueContent() {
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get('categoryId') || searchParams.get('category') || 'ALL';

  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>(initialCategoryParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCatalogue() {
      setIsLoading(true);
      try {
        const [catsRes, prodsRes] = await Promise.all([
          api.getCategories().catch(() => []),
          api.getProducts().catch(() => []),
        ]);
        setCategories(Array.isArray(catsRes) ? catsRes : []);
        setProducts(Array.isArray(prodsRes) ? prodsRes : []);

        // Sync with param if matched by slug or id
        if (initialCategoryParam !== 'ALL') {
          const matched = catsRes.find(
            (c: ProductCategoryItem) => c.id === initialCategoryParam || c.slug === initialCategoryParam,
          );
          if (matched) {
            setSelectedCatId(matched.id);
          }
        }
      } catch (err) {
        console.error('Failed to load catalogue:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalogue();
  }, [initialCategoryParam]);

  // Find currently active category
  const activeCategory = useMemo(() => {
    if (selectedCatId === 'ALL') return null;
    return categories.find((c) => c.id === selectedCatId) || null;
  }, [categories, selectedCatId]);

  // Filtered Products Logic (Direct flat category matching)
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory =
        selectedCatId === 'ALL' || prod.categoryId === selectedCatId;

      const matchesSearch =
        !searchQuery.trim() ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.description && prod.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.tags && prod.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCatId, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-24 w-full max-w-full overflow-x-hidden">
      {/* 1. White-First Clean Header Banner */}
      <div className="bg-white border-b border-[#E5E5E5] py-6 sm:py-8 px-4 sm:px-8 blueprint-grid">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-xs text-[#737373] font-medium mb-3">
            <button
              onClick={() => setSelectedCatId('ALL')}
              className="hover:text-black transition-colors cursor-pointer"
            >
              All Products
            </button>
            {activeCategory && (
              <>
                <RiArrowRightSLine className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-bold text-black">{activeCategory.name}</span>
              </>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 bg-[#FEFCE8] text-[#854D0E] px-2.5 py-1 rounded-[6px] text-[11px] font-mono font-semibold uppercase tracking-wider mb-2 border border-yellow-200">
            <RiPrinterLine className="h-3.5 w-3.5 text-[#854D0E]" />
            <span>Industrial Print Catalogue</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black font-sans leading-tight">
            {activeCategory ? activeCategory.name : 'Manufacturing Substrates & Finishing.'}
          </h1>

          <p className="text-[13px] sm:text-[14px] text-[#525252] max-w-3xl mt-1.5 leading-relaxed">
            {activeCategory?.description ||
              'Every product is produced on factory-calibrated Heidelberg offset, HP Indigo digital, and Roland roll-fed machinery. Configure dimensions, GSM, materials, and finishing options to receive instant server-backed pricing.'}
          </p>

          {/* Quick Search Bar */}
          <div className="mt-4 max-w-2xl relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, GSM, substrate, or finish..."
              className="w-full h-10 sm:h-11 pl-10 pr-16 text-[13px] font-normal bg-[#F5F5F5] text-black border border-[#E5E5E5] rounded-[8px] focus:outline-none focus:border-black focus:bg-white placeholder:text-[#737373] font-sans shadow-xs transition-all"
            />
            <RiSearch2Line className="h-4 w-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#737373] hover:text-black p-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Catalogue Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
          <RiFilter3Line className="h-4 w-4 text-slate-400 mr-1 flex-shrink-0" />
          <button
            onClick={() => setSelectedCatId('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCatId === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs font-black'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
            }`}
          >
            All Products ({products.length})
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCatId === cat.id;
            const catProductCount = products.filter((p) => p.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs font-black ring-2 ring-slate-900/10'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
                }`}
              >
                <span>{cat.name}</span>
                {catProductCount > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-[#FFED00]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {catProductCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 4. Section Title & Result Count */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-mono">
              {activeCategory
                ? `${activeCategory.name} Print Collections`
                : 'All Commercial Print Products'}
            </h2>
            <span className="text-xs text-slate-500">
              Showing {filteredProducts.length} configurable products
            </span>
          </div>
        </div>

        {/* 5. Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-[14px] border border-[#E5E5E5] p-4 space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-[10px]" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="pt-2 flex justify-between items-center">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-24 rounded-[8px]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 6. Empty Search / No Results */}
        {!isLoading && filteredProducts.length === 0 && (
          <EmptyState
            icon={RiPrinterLine}
            title={
              activeCategory
                ? `No products found in ${activeCategory.name}`
                : 'No Products Found'
            }
            description={
              searchQuery
                ? `No print products matched your query "${searchQuery}". Try searching for business cards, standees, flyers, or rigid boxes.`
                : 'There are no active products in this category at the moment. Check back soon or select another category.'
            }
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedCatId('ALL');
                  setSearchQuery('');
                }}
              >
                Reset Filters & View All
              </Button>
            }
          />
        )}

        {/* 7. Products Grid — Responsive 1, 2, 3, 4 columns */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filteredProducts.map((product) => {
              const primaryImage =
                product.images?.find((img) => img.isPrimary) || product.images?.[0];
              const imageUrl = resolveImageUrl(primaryImage?.url);

              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  description={product.description || 'Configurable industrial print specifications.'}
                  price={Number(product.basePrice) || 0}
                  pricePrefix="FROM"
                  priceUnit={product.minQuantity ? `/ ${product.minQuantity} units` : undefined}
                  href={`/products/${product.slug}`}
                  image={imageUrl}
                  tag={product.isFeatured ? 'FEATURED' : undefined}
                  sku={product.sku}
                  categoryName={product.category?.name}
                  productionDays={product.productionDays}
                  actionText="Configure"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
          <RiLoader4Line className="h-8 w-8 text-[#FFED00] animate-spin" />
        </div>
      }
    >
      <ProductsCatalogueContent />
    </Suspense>
  );
}
