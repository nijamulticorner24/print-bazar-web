'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui';

const FEATURED_PRODUCTS = [
  {
    id: 'feat-01',
    name: 'Visiting Cards',
    desc: 'Matte, Gloss, Velvet Soft-Touch & Gold Foil',
    price: '₹199',
    unit: '/ 100 units',
    href: '/products/premium-visiting-cards',
    image: '/images/home/prod-cards.jpg',
    fallback: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=500&auto=format&fit=crop&q=80',
    tag: 'BESTSELLER',
  },
  {
    id: 'feat-02',
    name: 'Roll-Up Standees',
    desc: 'Heavy Aluminum Base + Star Flex / Non-Tear',
    price: '₹1,250',
    unit: '/ unit',
    href: '/products/roll-up-luxury-standee',
    image: '/images/home/prod-banners.jpg',
    fallback: 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=500&auto=format&fit=crop&q=80',
    tag: 'POPULAR',
  },
  {
    id: 'feat-03',
    name: 'Flyers & Leaflets',
    desc: 'High-impact 130-300 GSM commercial offset',
    price: '₹450',
    unit: '/ 500 units',
    href: '/products',
    image: '/images/home/prod-flyers.jpg',
    fallback: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'feat-04',
    name: 'Rigid Mithai & Gift Boxes',
    desc: '1200 GSM Kappa board with velvet inserts',
    price: '₹2,800',
    unit: '/ 50 units',
    href: '/products',
    image: '/images/home/prod-boxes.jpg',
    fallback: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=80',
    tag: 'PACKAGING',
  },
  {
    id: 'feat-05',
    name: 'Die-Cut Stickers',
    desc: 'Waterproof Vinyl, Chrome & Metallic finishes',
    price: '₹299',
    unit: '/ 100 units',
    href: '/products',
    image: '/images/home/prod-stickers.jpg',
    fallback: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'feat-06',
    name: 'Corporate Apparel',
    desc: '100% Cotton Bio-Washed Screen & DTF prints',
    price: '₹349',
    unit: '/ piece',
    href: '/products',
    image: '/images/home/prod-tshirts.jpg',
    fallback: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
  },
];

export function FeaturedProducts() {
  return (
    <section className="bg-white py-12 lg:py-16 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 mb-2">
              <Sparkles className="h-3 w-3 text-[#E3A008]" />
              <span>SHOP-FLOOR FAVORITES</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
              Commercial Print Collections
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              High-volume commercial products with instant parametric quotes and automated prepress validation.
            </p>
          </div>

          <Link
            href="/products"
            className="group flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-amber-800 transition-colors self-start sm:self-auto"
          >
            <span>Explore Complete Catalogue</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 6 Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {FEATURED_PRODUCTS.map((prod) => (
            <Link
              key={prod.id}
              href={prod.href}
              className="group rounded-xl border border-slate-200/90 bg-white hover:border-slate-900 hover:shadow-card transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Image Container */}
                <div className="h-36 w-full bg-slate-50 relative flex items-center justify-center p-3 border-b border-slate-100 overflow-hidden">
                  {prod.tag && (
                    <span className="absolute top-2 left-2 bg-[#FFED00] text-slate-950 text-[9px] font-mono font-black px-1.5 py-0.5 rounded border border-[#E3A008]/40 shadow-xs z-10">
                      {prod.tag}
                    </span>
                  )}
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="max-h-28 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = prod.fallback;
                    }}
                  />
                </div>

                {/* Info */}
                <div className="p-3.5">
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-slate-950 transition-colors leading-snug">
                    {prod.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                    {prod.desc}
                  </p>
                </div>
              </div>

              {/* Bottom Price & Button */}
              <div className="p-3.5 pt-0 flex items-center justify-between border-t border-slate-50 mt-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono block">From</span>
                  <span className="text-xs font-black text-slate-900 font-display">
                    {prod.price}{' '}
                    <span className="text-[10px] text-slate-400 font-normal font-sans">
                      {prod.unit}
                    </span>
                  </span>
                </div>

                <div className="h-7 w-7 rounded-[6px] bg-[#FFED00] group-hover:bg-[#F2E100] flex items-center justify-center text-slate-950 transition-colors shadow-xs border border-[#E3A008]/40">
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
