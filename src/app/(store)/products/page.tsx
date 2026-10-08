'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import { api, DynamicProduct, ProductCategoryItem, resolveImageUrl } from '@/lib/api';
import { Button, Badge, Skeleton, EmptyState } from '@/components/ui';

export default function ProductsPage() {
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
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
        setCategories(catsRes);
        setProducts(prodsRes);
      } catch (err) {
        console.error('Failed to load catalogue:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalogue();
  }, []);

  const filteredProducts = products.filter((prod) => {
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* 1. White-First Clean Header Banner */}
      <div className="bg-white border-b border-slate-200 py-12 px-4 sm:px-8 blueprint-grid">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-950 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider mb-3 border border-amber-200">
            <RiPrinterLine className="h-4 w-4 text-[#E3A008]" />
            <span>Industrial Print Catalogue</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 font-display">
            Manufacturing Substrates & Finishing.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-3xl mt-2.5 leading-relaxed">
            Every product is produced on factory-calibrated Heidelberg offset, HP Indigo digital, and Roland roll-fed machinery.
            Configure dimensions, GSM, materials, and finishing options to receive instant server-backed pricing.
          </p>

          {/* Quick Search Bar */}
          <div className="mt-6 max-w-2xl relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, GSM, substrate, or finish..."
              className="w-full h-12 pl-11 pr-11 text-xs font-medium bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400 font-sans shadow-xs transition-all"
            />
            <RiSearch2Line className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Catalogue Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b border-slate-200 no-scrollbar">
          <RiFilter3Line className="h-4 w-4 text-slate-400 mr-1 flex-shrink-0" />
          <button
            onClick={() => setSelectedCatId('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCatId === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs font-black'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
            }`}
          >
            All Products ({products.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCatId === cat.id
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="pt-2 flex justify-between items-center">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty Search / No Results */}
        {!isLoading && filteredProducts.length === 0 && (
          <EmptyState
            icon={RiPrinterLine}
            title="No Products Found in this Category"
            description={
              searchQuery
                ? `No print products matched your query "${searchQuery}". Try searching for business cards, standees, flyers, or rigid boxes.`
                : 'There are no active products in this category at the moment.'
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

        {/* Products Grid */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const primaryImage =
                product.images?.find((img) => img.isPrimary) || product.images?.[0];
              const imageUrl = resolveImageUrl(primaryImage?.url);

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-xl border border-slate-200/90 hover:border-slate-900 hover:shadow-elevated transition-all duration-200 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Media Thumbnail Canvas */}
                    <div className="relative h-48 w-full bg-slate-50 flex items-center justify-center p-4 border-b border-slate-100 overflow-hidden">
                      {product.isFeatured && (
                        <span className="absolute top-3 left-3 bg-[#FFED00] text-slate-950 text-[10px] font-mono font-black px-2 py-0.5 rounded border border-[#E3A008]/40 shadow-xs z-10">
                          FEATURED
                        </span>
                      )}

                      <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-slate-600 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200 shadow-xs z-10">
                        {product.sku}
                      </span>

                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="max-h-36 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                    </div>

                    {/* Metadata & Description */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#E3A008]">
                        <RiSparklingFill className="h-3 w-3 flex-shrink-0" />
                        <span>{product.category?.name || 'COMMERCIAL PRINT'}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors line-clamp-1 font-display">
                        {product.name}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {product.description || 'Configurable industrial print specifications.'}
                      </p>

                      {/* Technical Badges */}
                      <div className="pt-1 flex flex-wrap gap-1">
                        {product.artworkRequirement && product.artworkRequirement !== 'DISABLED' && (
                          <span className="inline-flex items-center text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            Artwork: {product.artworkRequirement}
                          </span>
                        )}
                        {product.productionDays && (
                          <span className="inline-flex items-center text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {product.productionDays}d SLA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price & Action Footer */}
                  <div className="p-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block font-bold">
                        STARTING AT
                      </span>
                      <span className="text-base font-black text-slate-900 font-display">
                        {formatCurrency(Number(product.basePrice) || 0)}
                        <span className="text-[10px] font-sans font-normal text-slate-500 ml-1">
                          / {product.minQuantity || 1} units
                        </span>
                      </span>
                    </div>

                    <Link href={`/products/${product.slug}`}>
                      <Button variant="primary" size="sm" className="shadow-xs">
                        <span>Configure</span>
                        <RiArrowRightLine className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
