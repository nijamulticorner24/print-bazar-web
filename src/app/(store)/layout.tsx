import React from 'react';
import { Navbar } from '@/components/Navbar';
import { StorefrontMobileBottomNav } from '@/components/StorefrontMobileBottomNav';
import Link from 'next/link';
import { Printer, PhoneCall, MapPin, ShieldCheck, Award, ArrowUpRight } from 'lucide-react';

export default function CustomerStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white w-full max-w-full overflow-x-hidden">
      {/* Customer Storefront Navigation (Navbar with categories, promo ribbon, live cart) */}
      <Navbar />

      {/* Storefront Page Content (padded on mobile to accommodate bottom nav) */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden pb-16 md:pb-0">{children}</main>

      {/* Mobile-First Bottom Navigation Bar */}
      <StorefrontMobileBottomNav />

      {/* Modern Refined Print Manufacturing Footer */}
      <footer className="bg-slate-900 text-slate-200 border-t border-slate-800 pt-16 pb-24 md:pb-10 px-4 sm:px-8 w-full max-w-full overflow-hidden">
        <div className="mx-auto max-w-7xl">
          {/* Top Row: Factory Capabilities & Brand Manifesto */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            {/* Brand Col */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-[8px] bg-[#FFED00] text-slate-950 flex items-center justify-center font-black shadow-sm border border-[#E3A008]/40">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xl font-black text-white tracking-tight font-display">
                    PRINT BAZZAR
                  </span>
                  <span className="bg-slate-800 text-[#FFED00] text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ml-2">
                    2.0
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Industrial Customer-to-Production Operating System. Connecting commercial enterprises, B2B buyers, and design studios directly to Heidelberg offset and HP Indigo digital presses with zero pricing drift.
              </p>

              <div className="pt-2 text-xs font-mono text-slate-400 space-y-1.5">
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[#FFED00] flex-shrink-0" />
                  <span>Press Complex: Plot 42-C, Lower Parel, Mumbai 400013</span>
                </p>
                <p className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 text-[#FFED00] flex-shrink-0" />
                  <span>B2B Desk: +91 (022) 8940-2100 • sales@printbazzar.in</span>
                </p>
              </div>
            </div>

            {/* Col 2: Products */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#FFED00] uppercase tracking-wider">
                Production Catalogue
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link href="/products/premium-visiting-cards" className="hover:text-white transition-colors">
                    Visiting Cards (350-450 GSM)
                  </Link>
                </li>
                <li>
                  <Link href="/products/roll-up-luxury-standee" className="hover:text-white transition-colors">
                    Roll-Up Luxury Standees
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="hover:text-white transition-colors">
                    Rigid Presentation Boxes
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="hover:text-white transition-colors">
                    Marketing Flyers & Folders
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="hover:text-white transition-colors">
                    Corporate Bio-Washed Apparel
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Customer Operations */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#FFED00] uppercase tracking-wider">
                Customer Operations
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link href="/cart" className="hover:text-white transition-colors">
                    Preflight Cart & Review
                  </Link>
                </li>
                <li>
                  <Link href="/tracking/PB-2026-0001" className="hover:text-white transition-colors">
                    Master Order Tracking
                  </Link>
                </li>
                <li>
                  <Link href="/account" className="hover:text-white transition-colors">
                    Corporate B2B Account
                  </Link>
                </li>
                <li>
                  <Link href="/invoices/PB-2026-0001" className="hover:text-white transition-colors">
                    Tax Invoices (GST 18%)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Shop Floor Machinery */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#FFED00] uppercase tracking-wider">
                Plant Machinery
              </h4>
              <div className="text-[11px] font-mono text-slate-400 space-y-1.5">
                <p>• Heidelberg XL 106 6-Color</p>
                <p>• HP Indigo 12000 Digital</p>
                <p>• Roland TrueVIS VG3-640</p>
                <p>• Polar 78 High-Speed Cutter</p>
                <p>• Kurz Hot Foil Stamping Unit</p>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
            <p>
              © 2026 PRINT BAZZAR 2.0. One Order = One Master Record. Strictly TypeScript.
            </p>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-slate-400">ISO 12647-2 Color Calibrated</span>
              <span>•</span>
              <span className="text-slate-400">FSC Certified Substrates</span>
              <span>•</span>
              <Link href="/login" className="text-[#FFED00] hover:underline font-bold inline-flex items-center gap-1">
                <span>Staff ERP Console</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
