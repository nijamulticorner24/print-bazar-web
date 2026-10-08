'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getVisibleAdminNavigation } from './navigation';
import {
  RiCloseLine,
  RiLogoutBoxRLine,
  RiPulseLine,
  RiTimeLine,
  RiBuilding2Line,
  RiSearch2Line,
  RiFlashlightLine,
  RiShieldCheckFill,
  RiRadioButtonLine,
  RiArrowRightSLine,
  RiPrinterLine,
} from 'react-icons/ri';
import { Badge } from '@/components/ui';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Compute authorized sections strictly from backend permissions
  const authorizedSections = useMemo(() => {
    return getVisibleAdminNavigation(user?.permissions || []);
  }, [user?.permissions]);

  // Filter sections and items based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return authorizedSections;
    const q = searchQuery.toLowerCase();

    return authorizedSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.section.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q))
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [authorizedSections, searchQuery]);

  const allItemHrefs = useMemo(() => {
    return authorizedSections.flatMap((s) => s.items.map((i) => i.href));
  }, [authorizedSections]);

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'PB';

  const formattedRole = user?.role ? user.role.replace(/_/g, ' ') : 'OPERATOR';

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white border-r border-slate-200/90 text-slate-800 select-none">
      {/* Top Header & Navigation Section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Brand Identity Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between flex-shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="h-8 w-8 rounded-lg bg-[#FFED00] text-slate-950 flex items-center justify-center font-bold text-xs border border-[#E3A008]/40 shadow-xs flex-shrink-0 transition-transform group-hover:scale-105">
              <RiPrinterLine className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[14px] tracking-tight text-slate-900">
                  PRINT BAZZAR
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-900 text-[#FFED00]">
                  2.0 OS
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono tracking-wider text-slate-500 font-medium uppercase">
                  PLANT OPERATING SYSTEM
                </span>
              </div>
            </div>
          </Link>

          {/* Mobile Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
              aria-label="Close sidebar"
            >
              <RiCloseLine className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Quick Filter Search Bar */}
        <div className="px-3 py-2.5 border-b border-slate-100 bg-white">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search station, queue, tools..."
              className="w-full h-8 pl-8 pr-3 text-[13px] font-normal bg-slate-50 text-slate-900 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all font-sans"
            />
            <RiSearch2Line className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 custom-scrollbar">
          {filteredSections.map((section) => (
            <div key={section.id} className="space-y-1">
              <div className="px-2.5 py-1 text-[11px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
                {section.title}
              </div>

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isExact = pathname === item.href;
                  const isSubMatch =
                    !isExact &&
                    item.href !== '/admin' &&
                    item.href !== '/admin/dashboard' &&
                    pathname.startsWith(`${item.href}/`) &&
                    !allItemHrefs.some(
                      (otherHref) =>
                        otherHref !== item.href &&
                        otherHref.startsWith(item.href) &&
                        (pathname === otherHref || pathname.startsWith(`${otherHref}/`))
                    );
                  const isActive = isExact || isSubMatch;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onClose}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] transition-all relative ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                      }`}
                      title={item.description}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 flex-shrink-0 transition-colors ${
                            isActive ? 'text-[#FFED00]' : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded uppercase ${
                            isActive
                              ? 'bg-[#FFED00] text-slate-950'
                              : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom User Card & Sign Out */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-[#FFED00] text-slate-950 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-[#E3A008]/40 shadow-xs">
              {initials}
            </div>
            <div className="min-w-0">
              <span className="text-[13px] font-semibold text-slate-900 block truncate leading-tight">
                {user?.fullName || 'Plant Operator'}
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block truncate">
                {formattedRole}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Sign out of ERP Console"
          >
            <RiLogoutBoxRLine className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen flex-shrink-0 sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 h-full max-w-xs shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
