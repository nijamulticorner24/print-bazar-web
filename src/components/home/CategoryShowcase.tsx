'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const CATEGORY_ITEMS = [
  {
    name: 'Visiting Cards',
    spec: '350 - 450 GSM',
    href: '/products/premium-visiting-cards',
    image: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=600&auto=format&fit=crop&q=80',
    fallback: '/images/home/cat-cards.jpg',
  },
  {
    name: 'Roll-Up Standees',
    spec: 'Matte / Gloss Vinyl',
    href: '/products/roll-up-luxury-standee',
    image: 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=600&auto=format&fit=crop&q=80',
    fallback: '/images/home/cat-signs.jpg',
  },
  {
    name: 'Rigid Boxes',
    spec: 'Custom Kappa Board',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80',
    fallback: '/images/home/cat-boxes.jpg',
  },
  {
    name: 'Flyers & Leaflets',
    spec: 'Art Paper 130-170 GSM',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    fallback: '/images/home/cat-labels.jpg',
  },
  {
    name: 'Corporate Apparel',
    spec: '220 GSM Cotton Bio-Wash',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    fallback: '/images/home/cat-apparel.jpg',
  },
  {
    name: 'Letterheads',
    spec: 'Executive Bond 100 GSM',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80',
    fallback: '/images/home/cat-stationery.jpg',
  },
  {
    name: 'Corporate Gifts',
    spec: 'Custom Laser / Screen',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
    fallback: '/images/home/cat-gifts.jpg',
  },
];

export function CategoryShowcase() {
  return (
    <section className="bg-white border-b border-[#E5E7EB] py-6 sm:py-8 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FFED00]" />
            <h2 className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
              PRINT PRODUCT CATEGORIES
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold text-black hover:text-[#854D0E] transition-colors flex items-center gap-1 group"
          >
            <span>View All Categories</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3.5">
          {CATEGORY_ITEMS.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="group relative flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-xl border border-[#E5E7EB] bg-white hover:border-black hover:shadow-md hover:shadow-black/5 transition-all duration-200 touch-manipulation overflow-hidden"
            >
              {/* Full-Cover Category Image Canvas */}
              <div className="relative w-full aspect-[4/3] mb-2.5 overflow-hidden rounded-lg bg-[#F7F7F5] border border-[#E5E7EB]/70">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-108 motion-reduce:transform-none"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = item.fallback;
                  }}
                />
              </div>

              {/* Title & Spec */}
              <div className="text-center w-full px-1 pb-1">
                <h3 className="text-[12px] sm:text-[13px] font-bold text-black group-hover:text-black transition-colors leading-snug truncate font-sans">
                  {item.name}
                </h3>
                <span className="text-[10px] text-[#64748B] font-mono block mt-0.5 truncate">
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
