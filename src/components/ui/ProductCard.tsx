'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';

export interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  pricePrefix?: string;
  priceUnit?: string;
  href: string;
  image: string;
  fallbackImage?: string;
  tag?: string;
  sku?: string;
  categoryName?: string;
  productionDays?: number | string;
  actionText?: string;
  className?: string;
}

export function ProductCard({
  id,
  name,
  description,
  price,
  pricePrefix = 'FROM',
  priceUnit,
  href,
  image,
  fallbackImage = 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80',
  tag,
  sku,
  categoryName,
  productionDays,
  actionText = 'Configure',
  className = '',
}: ProductCardProps) {
  // Format price string if number
  const displayPrice =
    typeof price === 'number'
      ? `₹${price.toLocaleString('en-IN')}`
      : price.startsWith('₹')
      ? price
      : `₹${price}`;

  return (
    <Link
      href={href}
      className={`group relative bg-white rounded-2xl border border-[#E5E7EB] hover:border-black/50 hover:shadow-lg hover:shadow-black/5 transition-all duration-200 overflow-hidden flex flex-col justify-between h-full touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFED00] focus-visible:ring-offset-2 ${className}`}
    >
      <div>
        {/* 1. Product Image Canvas (150-185px proportional container adapting to card width) */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/11] bg-[#F7F7F5] overflow-hidden border-b border-[#E5E7EB]">
          {/* Category / Highlight Badge (Top-Left) */}
          {tag && (
            <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
              <span className="inline-flex items-center bg-[#FFED00] text-[#000000] text-[10px] sm:text-[11px] font-bold font-sans uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[5px] border border-black/10 shadow-xs">
                {tag}
              </span>
            </div>
          )}

          {/* SKU / Internal Code (Top-Right) */}
          {sku && (
            <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
              <span className="bg-white/90 backdrop-blur-xs text-[#64748B] text-[9.5px] font-mono font-medium px-1.5 py-0.5 rounded-[4px] border border-[#E5E7EB] shadow-2xs truncate max-w-[110px]">
                {sku}
              </span>
            </div>
          )}

          {/* Product Image Asset */}
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transform-none"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
          />
        </div>

        {/* 2. Compact Product Details */}
        <div className="p-3.5 sm:p-4 pb-2.5 sm:pb-3">
          {categoryName && (
            <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#854D0E] block mb-0.5 truncate">
              {categoryName}
            </span>
          )}

          <h3 className="text-[15px] sm:text-[16px] font-bold text-[#111111] group-hover:text-black transition-colors leading-snug line-clamp-1 font-sans tracking-tight">
            {name}
          </h3>

          {description && (
            <p className="text-[12px] sm:text-[13px] text-[#64748B] line-clamp-2 leading-[1.35] mt-1 font-sans">
              {description}
            </p>
          )}

          {/* Production SLA Badge */}
          {productionDays ? (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-mono font-medium text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-[5px] border border-[#A7F3D0] w-fit">
              <Clock className="h-3 w-3 text-[#065F46] stroke-[2.2] flex-shrink-0" />
              <span>{productionDays}d Production SLA</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* 3. Pricing & Action Footer (Common Baseline Alignment) */}
      <div className="p-3.5 sm:p-4 pt-0 mt-auto">
        <div className="pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between gap-2 min-h-[44px]">
          <div className="min-w-0">
            <span className="text-[9.5px] font-mono font-bold text-[#64748B] uppercase tracking-wider block leading-none">
              {pricePrefix}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
              <span className="text-[18px] sm:text-[20px] font-bold text-[#111111] font-sans tabular-nums leading-none tracking-tight">
                {displayPrice}
              </span>
              {priceUnit && (
                <span className="text-[11px] sm:text-[12px] text-[#64748B] font-normal leading-none truncate">
                  {priceUnit}
                </span>
              )}
            </div>
          </div>

          {/* Yellow Configure Action Button */}
          <div className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:px-3.5 sm:py-2 rounded-[8px] bg-[#FFED00] text-[#000000] text-[12px] sm:text-[13px] font-bold tracking-tight border border-black/10 shadow-2xs group-hover:bg-[#F5E200] active:scale-95 transition-all duration-150 flex-shrink-0 min-h-[40px] sm:min-h-[42px]">
            <span>{actionText}</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.4] transition-transform duration-150 group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}
