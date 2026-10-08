'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Truck, Cog, Sparkles, CheckCircle2, Award } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

export function HeroSection() {
  return (
    <section className="relative bg-white border-b border-slate-200/90 py-12 lg:py-20 overflow-hidden blueprint-grid">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Editorial Copy & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80">
              <span className="h-2 w-2 rounded-full bg-[#E3A008]" />
              <span className="text-[11px] font-mono font-bold text-amber-950 uppercase tracking-wider">
                COMMERCIAL PRINTING & PACKAGING OS
              </span>
            </div>

            {/* Main Display Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black text-slate-900 tracking-tight leading-[1.08] font-display">
              Commercial Print Excellence,{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-slate-950">Engineered</span>
                <span className="absolute inset-x-0 bottom-1.5 h-3.5 bg-[#FFED00] -z-0 opacity-90 rounded-xs" />
              </span>{' '}
              for Scale.
            </h1>

            {/* Value Proposition */}
            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Direct-to-press precision for visiting cards, luxury rigid boxes, roll-up displays, and marketing collateral. 
              Dynamic live quoting, automated pre-flight checks, and ISO 12647 color calibration.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link href="/products/premium-visiting-cards">
                <Button variant="primary" size="lg" className="shadow-brand">
                  <span>START CUSTOM CONFIGURATION</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>

              <Link href="/products">
                <Button variant="outline" size="lg">
                  <span>EXPLORE 2026 CATALOGUE</span>
                </Button>
              </Link>
            </div>

            {/* Trust Proof Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0 mt-0.5">
                  <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    2400 DPI Precision
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Heidelberg & HP Indigo
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 flex-shrink-0 mt-0.5">
                  <Truck className="h-4 w-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    Pan-India Dispatch
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Express Carrier SLAs
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0 mt-0.5">
                  <Award className="h-4 w-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    Zero Price Drift
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Server-Verified Quotes
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Physical Product Showcase Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl bg-slate-50 border border-slate-200/90 p-4 shadow-elevated">
              <div className="relative rounded-xl overflow-hidden bg-white border border-slate-200 aspect-[4/3] flex items-center justify-center">
                <img
                  src="/images/home/hero-products.jpg"
                  alt="Print Bazzar Commercial Products"
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    // Fallback to high quality print media image if local asset is unavailable
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 text-[10px] font-mono font-bold text-slate-900 shadow-xs flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>CALIBRATED TO ISO 12647</span>
                </div>
              </div>

              {/* Floating Metric Badge */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                    STARTING AT
                  </span>
                  <span className="text-lg font-black text-slate-900 font-display">₹199</span>
                  <span className="text-[10px] text-emerald-600 font-bold block">Visiting Cards (100 units)</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                    PRODUCTION SLA
                  </span>
                  <span className="text-lg font-black text-slate-900 font-display">24-48h</span>
                  <span className="text-[10px] text-slate-500 font-bold block">Express Shop Floor Run</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
