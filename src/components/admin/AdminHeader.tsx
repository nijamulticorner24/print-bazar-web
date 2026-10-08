'use client';

import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from './Breadcrumbs';
import { UserMenu } from './UserMenu';
import {
  RiMenu2Line,
  RiNotification3Line,
  RiPulseLine,
  RiPrinterLine,
} from 'react-icons/ri';

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Toggle Navigation Sidebar"
        >
          <RiMenu2Line className="h-5 w-5" />
        </button>

        <div className="hidden lg:flex items-center gap-2 border-r border-slate-200 pr-3 mr-1">
          <div className="h-6 w-6 rounded bg-[#FFED00] border border-[#E3A008]/40 flex items-center justify-center font-black text-[10px] text-slate-950">
            <RiPrinterLine className="h-3.5 w-3.5" />
          </div>
          <span className="font-mono text-xs font-black tracking-tight text-slate-900">
            PLANT OS
          </span>
        </div>

        {/* Contextual Breadcrumbs */}
        <div className="overflow-hidden">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right: Operational Status, Notifications & Authenticated User */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Plant Status Indicator */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px]">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-700">PRESS ONLINE</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">SHIFT A</span>
        </div>

        {/* System Notifications */}
        <button
          type="button"
          aria-label="Factory Alerts and System Notifications"
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          title="Factory Alerts (0)"
        >
          <RiNotification3Line className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FFED00] ring-2 ring-white border border-[#E3A008]" />
        </button>

        {/* Dynamic Authenticated User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
