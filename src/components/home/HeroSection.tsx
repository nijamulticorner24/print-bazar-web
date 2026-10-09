'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Truck, Award } from 'lucide-react';
import { Button } from '@/components/ui';

export function HeroSection() {
  return (
    <section className="relative bg-white border-b border-[#E5E5E5] py-10 lg:py-16 overflow-hidden blueprint-grid w-full max-w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Editorial Copy & CTAs */}
          <div className="lg:col-span-7 space-y-5">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#FEFCE8] border border-yellow-200">
              <span className="h-2 w-2 rounded-full bg-[#854D0E]" />
              <span className="text-[11px] font-mono font-semibold text-[#854D0E] uppercase tracking-wider">
                COMMERCIAL PRINTING & PACKAGING OS
              </span>
            </div>

            {/* Main Display Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-semibold text-black tracking-tight leading-[1.15] font-sans">
              Commercial Print Excellence,{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-black">Engineered</span>
                <span className="absolute inset-x-0 bottom-1 h-3 bg-[#FFED00] -z-0 opacity-90 rounded-[2px]" />
              </span>{' '}
              for Scale.
            </h1>

            {/* Value Proposition */}
            <p className="text-[15px] sm:text-[16px] text-[#525252] max-w-xl leading-relaxed font-sans">
              Direct-to-press precision for visiting cards, luxury rigid boxes, roll-up displays, and marketing collateral. 
              Dynamic live quoting, automated pre-flight checks, and ISO 12647 color calibration.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link href="/products/premium-visiting-cards" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full justify-center shadow-xs min-h-[44px]">
                  <span>START CUSTOM CONFIGURATION</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>

              <Link href="/products" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full justify-center min-h-[44px]">
                  <span>EXPLORE 2026 CATALOGUE</span>
                </Button>
              </Link>
            </div>

            {/* Trust Proof Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-[#E5E5E5]">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-[6px] bg-[#F0FDF4] border border-green-200 flex items-center justify-center text-[#166534] flex-shrink-0 mt-0.5">
                  <ShieldCheck className="h-4 w-4 stroke-[2]" />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-black block leading-tight">
                    2400 DPI Precision
                  </span>
                  <span className="text-[12px] text-[#737373] block leading-tight mt-0.5">
                    Heidelberg & HP Indigo
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-[6px] bg-[#F0F9FF] border border-sky-200 flex items-center justify-center text-[#075985] flex-shrink-0 mt-0.5">
                  <Truck className="h-4 w-4 stroke-[2]" />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-black block leading-tight">
                    Pan-India Dispatch
                  </span>
                  <span className="text-[12px] text-[#737373] block leading-tight mt-0.5">
                    Express Carrier SLAs
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-[6px] bg-[#FEFCE8] border border-yellow-200 flex items-center justify-center text-[#854D0E] flex-shrink-0 mt-0.5">
                  <Award className="h-4 w-4 stroke-[2]" />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-black block leading-tight">
                    Zero Price Drift
                  </span>
                  <span className="text-[12px] text-[#737373] block leading-tight mt-0.5">
                    Server-Verified Quotes
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Physical Product Showcase Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[8px] bg-[#F5F5F5] border border-[#E5E5E5] p-3.5 shadow-xs">
              <div className="relative rounded-[6px] overflow-hidden bg-white border border-[#E5E5E5] aspect-[4/3] flex items-center justify-center">
                <img
                  src="/images/home/hero-products.jpg"
                  alt="Print Bazzar Commercial Products"
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-[6px] border border-[#E5E5E5] text-[10px] font-mono font-semibold text-black shadow-xs flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#166534]" />
                  <span>CALIBRATED TO ISO 12647</span>
                </div>
              </div>

              {/* Floating Metric Badge */}
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-white rounded-[6px] border border-[#E5E5E5] shadow-xs">
                  <span className="text-[10px] font-mono text-[#737373] uppercase font-semibold block">
                    STARTING AT
                  </span>
                  <span className="text-[18px] font-semibold text-black">₹199</span>
                  <span className="text-[11px] text-[#166534] font-medium block">Visiting Cards (100 units)</span>
                </div>
                <div className="p-2.5 bg-white rounded-[6px] border border-[#E5E5E5] shadow-xs">
                  <span className="text-[10px] font-mono text-[#737373] uppercase font-semibold block">
                    PRODUCTION SLA
                  </span>
                  <span className="text-[18px] font-semibold text-black">24-48h</span>
                  <span className="text-[11px] text-[#525252] font-normal block">Express Shop Floor Run</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

