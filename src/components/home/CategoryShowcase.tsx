'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const CATEGORY_ITEMS = [
  {
    name: 'Visiting Cards',
    spec: '350 - 450 GSM',
    href: '/products/premium-visiting-cards',
    image: '/images/home/cat-cards.jpg',
    fallback: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Roll-Up Standees',
    spec: 'Matte / Gloss Vinyl',
    href: '/products/roll-up-luxury-standee',
    image: '/images/home/cat-signs.jpg',
    fallback: 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Rigid Boxes',
    spec: 'Custom Kappa Board',
    href: '/products',
    image: '/images/home/cat-boxes.jpg',
    fallback: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Flyers & Brochures',
    spec: 'Art Paper 130-170 GSM',
    href: '/products',
    image: '/images/home/cat-labels.jpg',
    fallback: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Corporate Apparel',
    spec: '220 GSM Cotton Bio-Wash',
    href: '/products',
    image: '/images/home/cat-apparel.jpg',
    fallback: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Letterheads',
    spec: 'Executive Bond 100 GSM',
    href: '/products',
    image: '/images/home/cat-stationery.jpg',
    fallback: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Corporate Gifts',
    spec: 'Custom Laser / Screen',
    href: '/products',
    image: '/images/home/cat-gifts.jpg',
    fallback: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&auto=format&fit=crop&q=80',
  },
];

export function CategoryShowcase() {
  return (
    <section className="bg-white border-b border-slate-200 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
              PRINT PRODUCT CATEGORIES
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold text-slate-900 hover:text-amber-800 transition-colors flex items-center gap-1"
          >
            <span>View All Categories</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-[#E3A008]" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {CATEGORY_ITEMS.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="group relative flex flex-col items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-900 hover:shadow-card transition-all"
            >
              {/* Image Container */}
              <div className="h-16 w-full flex items-center justify-center mb-2.5 overflow-hidden rounded-lg bg-slate-50 border border-slate-100 p-1">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-h-12 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = item.fallback;
                  }}
                />
              </div>

              {/* Title & Spec */}
              <div className="text-center w-full">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-slate-950 transition-colors leading-snug truncate">
                  {item.name}
                </h3>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                  {item.spec}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
