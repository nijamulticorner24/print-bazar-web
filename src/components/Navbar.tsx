'use client';

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';

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
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

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
    <div className="w-full max-w-full bg-white border-b border-[#E5E5E5] sticky top-0 z-50">
      {/* 1. TOP UTILITY BAR (Desktop / Tablet only) */}
      <div className="hidden sm:block bg-black text-[#F5F5F5] px-4 sm:px-8 py-1.5 text-[11px] font-sans border-b border-[#262626]">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
          {/* Left: Press Status */}
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 font-semibold tracking-wider text-[#FFED00] font-mono text-[10px]">
              <span className="h-2 w-2 rounded-full bg-[#FFED00]" />
              PRESS PLANT ONLINE
            </span>
            <span className="text-[#525252]">|</span>
            <span className="text-[#D4D4D4] font-normal hidden sm:inline">
              ISO 12647-2 Certified Commercial Offset & Digital Printing
            </span>
          </div>

          {/* Right: Quick Links */}
          <div className="flex items-center gap-4 text-[#D4D4D4] text-[11px]">
            <Link
              href="/tracking/PB-2026-0001"
              className="hover:text-[#FFED00] transition-colors flex items-center gap-1 font-normal"
            >
              <Truck className="h-3.5 w-3.5 text-[#FFED00]" />
              <span>Live Order Tracking</span>
            </Link>
            <span className="text-[#525252]">|</span>
            <a
              href="tel:+912289402100"
              className="hover:text-[#FFED00] transition-colors flex items-center gap-1 font-normal"
            >
              <PhoneCall className="h-3 w-3 text-[#FFED00]" />
              <span>B2B Desk: +91 (022) 8940-2100</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN STOREFRONT HEADER */}
      <header className="px-3 sm:px-8 py-2.5 sm:py-3.5 bg-white border-b border-[#E5E5E5] w-full relative z-30">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-[8px] bg-[#FFED00] flex items-center justify-center text-black font-bold shadow-xs border border-neutral-300 transition-transform group-hover:scale-105 flex-shrink-0">
              <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-[15px] sm:text-[18px] md:text-[20px] font-semibold tracking-tight text-black font-sans truncate">
                  PRINT BAZZAR
                </span>
                <span className="bg-black text-[#FFED00] text-[9px] sm:text-[10px] font-mono font-bold px-1 sm:px-1.5 py-0.5 rounded flex-shrink-0">
                  2.0
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] uppercase font-semibold text-[#737373] tracking-wider font-mono truncate hidden xs:block">
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
              className="w-full h-9 pl-9 pr-20 text-[13px] font-normal bg-[#F5F5F5] text-black border border-[#E5E5E5] rounded-[8px] focus:outline-none focus:border-black focus:bg-white transition-all placeholder:text-[#737373]"
            />
            <Search className="h-4 w-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[12px] font-medium bg-[#FFED00] text-black rounded-[6px] border border-neutral-300 hover:bg-[#F2E100] transition-colors"
            >
              Search
            </button>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2 px-3 py-1.5 text-black hover:text-black rounded-[8px] hover:bg-[#F5F5F5] transition-colors border border-[#E5E5E5] shadow-xs"
              title="Shopping Cart"
            >
              <div className="relative">
                <ShoppingBag className="h-4 w-4 text-black" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#FFED00] text-black font-bold text-[9px] flex items-center justify-center border border-black">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-[13px] font-medium">Cart</span>
            </Link>

            {/* User Profile or Login */}
            {isAuthenticated && user ? (
              <div ref={userDropdownRef} className="relative z-50">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-[#E5E5E5] hover:border-black text-[13px] font-medium text-black bg-white transition cursor-pointer shadow-xs"
                >
                  <div className="h-5 w-5 rounded-full bg-[#FFED00] text-black font-bold text-[10px] flex items-center justify-center border border-neutral-300">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {user.fullName.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-[#737373]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E5E5E5] rounded-[8px] shadow-2xl py-2 text-xs text-black z-[9999] animate-in fade-in-50 zoom-in-95 duration-150 divide-y divide-[#E5E5E5]">
                    <div className="px-4 py-2 bg-[#F8F8F8]">
                      <p className="font-semibold text-black truncate">{user.fullName}</p>
                      <p className="text-[11px] text-[#737373] font-mono truncate">{user.email}</p>
                      <span className="inline-block mt-1 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#FEFCE8] text-[#854D0E] border border-yellow-200">
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-[#F5F5F5] font-normal text-black"
                      >
                        <User className="h-3.5 w-3.5 text-[#737373]" />
                        <span>Customer Portal</span>
                      </Link>

                      <Link
                        href="/account/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-[#F5F5F5] font-normal text-black"
                      >
                        <Layers className="h-3.5 w-3.5 text-[#737373]" />
                        <span>Order History</span>
                      </Link>

                      {user.role !== 'CUSTOMER' && (
                        <Link
                          href={getRoleDestination(user.role)}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-4 py-2 hover:bg-[#FEFCE8] font-semibold text-black border-t border-[#E5E5E5] my-1"
                        >
                          <span>Staff ERP Console</span>
                          <ArrowRight className="h-3.5 w-3.5 text-black" />
                        </Link>
                      )}
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#FEF2F2] text-[#B91C1C] font-semibold text-left transition-colors cursor-pointer"
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
                <Button variant="secondary" size="sm">
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
              className="p-2 md:hidden text-black hover:bg-[#F5F5F5] rounded-[6px]"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 3. CATEGORY NAVIGATION STRIP */}
      <nav className="hidden md:block bg-white border-b border-[#E5E5E5] px-4 sm:px-8 py-2 relative z-10">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-[13px] font-medium">
            {CATEGORIES.map((cat) => {
              const isActive =
                cat.href === pathname || (cat.href !== '/' && pathname.startsWith(cat.href));
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-black text-white font-medium'
                      : 'text-[#525252] hover:text-black hover:bg-[#F5F5F5]'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-[13px] text-[#525252] flex-shrink-0 font-medium">
            <Link href="/products" className="hover:text-black flex items-center gap-1 font-semibold text-black">
              <Sparkles className="h-3.5 w-3.5 text-[#854D0E]" />
              <span>Full Catalogue ➔</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* 4. MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E5E5E5] p-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full h-9 pl-9 pr-4 text-[13px] bg-[#F5F5F5] border border-[#E5E5E5] rounded-[8px] text-black"
            />
            <Search className="h-4 w-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-[#737373] uppercase tracking-wider px-2">
              Browse Categories
            </p>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-[13px] font-medium text-black hover:bg-[#F5F5F5] rounded-[6px]"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between">
            <Link
              href="/tracking/PB-2026-0001"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[13px] font-medium text-black flex items-center gap-1.5"
            >
              <Truck className="h-4 w-4 text-[#737373]" />
              <span>Track Order</span>
            </Link>
            <Link
              href="/products/premium-visiting-cards"
              onClick={() => setMobileMenuOpen(false)}
              className="bg-[#FFED00] text-black font-semibold text-[13px] px-3 py-1.5 rounded-[6px] border border-neutral-300"
            >
              Order Now ➔
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

