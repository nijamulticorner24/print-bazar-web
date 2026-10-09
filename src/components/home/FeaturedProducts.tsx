'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/ui';

const FEATURED_PRODUCTS = [
  {
    id: 'feat-01',
    name: 'Visiting Cards',
    desc: 'Matte, Gloss, Velvet Soft-Touch & Gold Foil direct-to-press finishes.',
    price: '₹199',
    unit: '/ 100 units',
    href: '/products/premium-visiting-cards',
    image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80',
    fallback: '/images/home/prod-cards.jpg',
    tag: 'BESTSELLER',
    productionDays: 2,
  },
  {
    id: 'feat-02',
    name: 'Roll-Up Standees',
    desc: 'Heavy anodized aluminium base with Star Flex & non-tear vinyl substrates.',
    price: '₹1,250',
    unit: '/ unit',
    href: '/products/roll-up-luxury-standee',
    image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80',
    fallback: '/images/home/prod-banners.jpg',
    tag: 'POPULAR',
    productionDays: 1,
  },
  {
    id: 'feat-03',
    name: 'Flyers & Leaflets',
    desc: 'High-impact 130–300 GSM commercial offset marketing collateral.',
    price: '₹450',
    unit: '/ 500 units',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop&q=80',
    fallback: '/images/home/prod-flyers.jpg',
    productionDays: 3,
  },
  {
    id: 'feat-04',
    name: 'Rigid Mithai & Gift Boxes',
    desc: '1200 GSM Kappa board with precision wrapped velvet & foil inserts.',
    price: '₹2,800',
    unit: '/ 50 units',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80',
    fallback: '/images/home/prod-boxes.jpg',
    tag: 'PACKAGING',
    productionDays: 5,
  },
  {
    id: 'feat-05',
    name: 'Die-Cut Stickers',
    desc: 'Waterproof Vinyl, chrome metallic & multi-substrate precision kiss-cuts.',
    price: '₹299',
    unit: '/ 100 units',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80',
    fallback: '/images/home/prod-stickers.jpg',
    productionDays: 2,
  },
  {
    id: 'feat-06',
    name: 'Corporate Apparel',
    desc: '100% Cotton 220 GSM bio-washed screen & high-definition DTF prints.',
    price: '₹349',
    unit: '/ piece',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
    fallback: '/images/home/prod-tshirts.jpg',
    productionDays: 3,
  },
];

export function FeaturedProducts() {
  return (
    <section className="bg-white py-8 sm:py-10 lg:py-12 border-b border-[#E5E7EB] w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div>
            {/* Yellow Accent Pill */}
            <div className="inline-flex items-center gap-2 font-mono text-[11px] sm:text-xs font-bold text-black uppercase tracking-wider bg-[#FFED00] px-2.5 py-1 rounded-[6px] border border-black/10 shadow-2xs mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-black" />
              <span>SHOP-FLOOR FAVORITES</span>
            </div>

            <h2 className="text-[24px] sm:text-[30px] lg:text-[36px] font-bold text-black tracking-tight font-sans leading-[1.15]">
              Commercial Print Collections
            </h2>

            <p className="text-[14px] sm:text-[15px] text-[#64748B] mt-1.5 max-w-2xl leading-relaxed font-sans">
              High-volume commercial products with instant parametric quotes, preflight verification, and direct press dispatch.
            </p>
          </div>

          <Link
            href="/products"
            className="group inline-flex items-center gap-2 text-[14px] sm:text-[15px] font-bold text-black hover:text-black/80 transition-colors self-start sm:self-end pb-1 border-b-2 border-[#FFED00] hover:border-black flex-shrink-0"
          >
            <span>Explore Complete Catalogue</span>
            <ArrowRight className="h-4 w-4 stroke-[2.2] transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Products Grid — Responsive 1-2 on Mobile, 2 on Tablet, 3 on Med Desktop, 4 on Standard Desktop, 5 on Wide Screens */}
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
          {FEATURED_PRODUCTS.map((prod) => (
            <ProductCard
              key={prod.id}
              id={prod.id}
              name={prod.name}
              description={prod.desc}
              price={prod.price}
              priceUnit={prod.unit}
              href={prod.href}
              image={prod.image}
              fallbackImage={prod.fallback}
              tag={prod.tag}
              productionDays={prod.productionDays}
              actionText="Configure"
            />
          ))}
        </div>
      </div>
    </section>
  );
}


