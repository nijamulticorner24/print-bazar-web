'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  Truck,
  User,
  ChevronDown,
  ArrowRight,
  Printer,
  LogOut,
  PhoneCall,
  Sparkles,
  Menu,
  X,
  Layers,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button, Badge } from '@/components/ui';

const CATEGORIES = [
  { name: 'All Products', href: '/products', id: 'ALL' },
  { name: 'Visiting Cards', href: '/products/premium-visiting-cards', id: 'CARDS' },
  { name: 'Roll-Up Standees', href: '/products/roll-up-luxury-standee', id: 'STAND' },
  { name: 'Custom Rigid Boxes', href: '/products', id: 'BOXES' },
  { name: 'Marketing Flyers', href: '/products', id: 'FLYERS' },
  { name: 'Corporate Apparel', href: '/products', id: 'APPAREL' },
  { name: 'Labels & Stickers', href: '/products', id: 'LABELS' },
  { name: 'Letterheads & Stationery', href: '/products', id: 'OFFICE' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, getRoleDestination } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState<number>(0);

  // Sync cart count from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const stored = localStorage.getItem('pb2_cart');
        if (stored) {
          const items = JSON.parse(stored);
          setCartCount(Array.isArray(items) ? items.length : 0);
        } else {
          setCartCount(0);
        }
      } catch {
        setCartCount(0);
      }
    };
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cart-updated', updateCartCount);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cart-updated', updateCartCount);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
  };

  return (
    <div className="w-full bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* 1. TOP UTILITY BAR (Light neutral & dark accent) */}
      <div className="bg-slate-900 text-slate-200 px-4 sm:px-8 py-1.5 text-[11px] font-sans border-b border-slate-800">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
          {/* Left: Press Status */}
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 font-bold tracking-wider text-[#FFED00] font-mono text-[10px]">
              <span className="h-2 w-2 rounded-full bg-[#FFED00] animate-pulse" />
              PRESS PLANT ONLINE
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-medium hidden sm:inline">
              ISO 12647-2 Certified Commercial Offset & Digital Printing
            </span>
          </div>

          {/* Right: Quick Links */}
          <div className="flex items-center gap-4 text-slate-300 text-[11px]">
            <Link
              href="/tracking/PB-2026-0001"
              className="hover:text-[#FFED00] transition-colors flex items-center gap-1 font-medium"
            >
              <Truck className="h-3.5 w-3.5 text-[#FFED00]" />
              <span>Live Order Tracking</span>
            </Link>
            <span className="text-slate-600">|</span>
            <a
              href="tel:+912289402100"
              className="hover:text-[#FFED00] transition-colors flex items-center gap-1 font-medium"
            >
              <PhoneCall className="h-3 w-3 text-[#FFED00]" />
              <span>B2B Desk: +91 (022) 8940-2100</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN STOREFRONT HEADER */}
      <header className="px-4 sm:px-8 py-3.5 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 lg:gap-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="h-10 w-10 rounded-[8px] bg-[#FFED00] flex items-center justify-center text-slate-950 font-black shadow-sm border border-[#E3A008]/40 transition-transform group-hover:scale-105">
              <Printer className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 font-display">
                  PRINT BAZZAR
                </span>
                <span className="bg-slate-900 text-[#FFED00] text-[10px] font-mono font-black px-1.5 py-0.5 rounded">
                  2.0
                </span>
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                Customer-to-Production OS
              </p>
            </div>
          </Link>

          {/* Search Bar (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-lg relative items-center"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by SKU, GSM, substrate, or finish..."
              className="w-full h-10 pl-10 pr-24 text-xs font-medium bg-slate-50 border border-slate-200 rounded-[8px] focus:outline-none focus:border-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold bg-[#FFED00] text-slate-950 rounded-[5px] border border-[#E3A008]/30 hover:bg-[#F2E100] transition-colors"
            >
              Search
            </button>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2 px-3 py-2 text-slate-800 hover:text-slate-950 rounded-[8px] hover:bg-slate-50 transition-colors border border-slate-200/80 shadow-xs"
              title="Shopping Cart"
            >
              <div className="relative">
                <ShoppingBag className="h-4 w-4 text-slate-700" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#FFED00] text-slate-950 font-black text-[9px] flex items-center justify-center border border-slate-900">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-bold">Cart</span>
            </Link>

            {/* User Profile or Login */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] border border-slate-200 hover:border-slate-400 text-xs font-bold text-slate-900 bg-white transition cursor-pointer shadow-xs"
                >
                  <div className="h-5 w-5 rounded-full bg-[#FFED00] text-slate-950 font-black text-[10px] flex items-center justify-center border border-slate-900/20">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {user.fullName.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-elevated py-2 text-xs text-slate-900 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                      <p className="font-bold text-slate-900 truncate">{user.fullName}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{user.email}</p>
                      <span className="inline-block mt-1 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 font-medium text-slate-700"
                      >
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>Customer Portal</span>
                      </Link>

                      <Link
                        href="/account/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 font-medium text-slate-700"
                      >
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        <span>Order History</span>
                      </Link>

                      {user.role !== 'CUSTOMER' && (
                        <Link
                          href={getRoleDestination(user.role)}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-4 py-2 hover:bg-amber-50/60 font-bold text-amber-900 border-t border-slate-100 my-1"
                        >
                          <span>Staff ERP Console</span>
                          <ArrowRight className="h-3.5 w-3.5 text-amber-700" />
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 font-bold text-left transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Instant Configure Primary CTA */}
            <Link href="/products/premium-visiting-cards" className="hidden sm:inline-flex">
              <Button variant="primary" size="sm">
                <span>Start Print Job</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 3. CATEGORY NAVIGATION STRIP (Light & Responsive) */}
      <nav className="hidden md:block bg-white border-b border-slate-100 px-4 sm:px-8 py-2">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-xs font-semibold">
            {CATEGORIES.map((cat) => {
              const isActive =
                cat.href === pathname || (cat.href !== '/' && pathname.startsWith(cat.href));
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 flex-shrink-0 font-medium">
            <Link href="/products" className="hover:text-slate-900 flex items-center gap-1 font-bold text-slate-800">
              <Sparkles className="h-3 w-3 text-[#E3A008]" />
              <span>Full Catalogue ➔</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* 4. MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full h-10 pl-10 pr-4 text-xs bg-slate-50 border border-slate-200 rounded-[8px]"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider px-2">
              Browse Categories
            </p>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 rounded-lg"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/tracking/PB-2026-0001"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
            >
              <Truck className="h-4 w-4 text-slate-500" />
              <span>Track Order</span>
            </Link>
            <Link
              href="/products/premium-visiting-cards"
              onClick={() => setMobileMenuOpen(false)}
              className="bg-[#FFED00] text-slate-950 font-black text-xs px-3 py-2 rounded-lg border border-[#E3A008]/40"
            >
              Order Now ➔
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
