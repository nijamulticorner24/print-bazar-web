'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  RiUser3Line,
  RiShieldCheckLine,
  RiBuilding2Line,
  RiLogoutBoxRLine,
  RiArrowDownSLine,
  RiKey2Line,
  RiCheckDoubleLine,
} from 'react-icons/ri';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'PB';

  const formattedRole = user.role.replace(/_/g, ' ');

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
        aria-expanded={isOpen}
        aria-haspopup="true"
        id="admin-user-menu-button"
      >
        <div className="h-8 w-8 rounded-lg bg-[#FFED00] text-slate-950 font-black text-xs flex items-center justify-center flex-shrink-0 border border-[#E3A008]/40 shadow-xs">
          {initials}
        </div>
        <div className="text-left hidden sm:block pr-1">
          <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
            {user.fullName}
          </div>
          <div className="text-[10px] font-mono text-slate-500 leading-tight truncate max-w-[130px] uppercase font-bold">
            {formattedRole}
          </div>
        </div>
        <RiArrowDownSLine className="h-4 w-4 text-slate-400 hidden sm:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="admin-user-menu-button"
          className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-elevated z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header Identity */}
          <div className="p-3.5 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#FFED00] text-slate-950 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-[#E3A008]/40 shadow-xs">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-slate-900 truncate">{user.fullName}</div>
                <div className="text-[11px] text-slate-500 font-mono truncate">{user.email}</div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#FFED00] text-slate-950 border border-[#E3A008]/30">
                    {formattedRole}
                  </span>
                  {user.department && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-200 text-slate-700">
                      {user.department.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Plant & Shift Session Info */}
          <div className="p-3 text-[11px] font-mono text-slate-600 bg-white space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">PLANT NODE:</span>
              <span className="font-bold text-slate-900">MUMBAI-PRESS-01</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">ACTIVE SHIFT:</span>
              <span className="font-bold text-emerald-700">SHIFT A (08:00 - 16:30)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">RBAC PERMISSIONS:</span>
              <span className="font-bold text-slate-900">{user.permissions.length} Active Grants</span>
            </div>
          </div>

          {/* Sign Out Action */}
          <div className="p-1.5 bg-slate-50/50">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left"
            >
              <RiLogoutBoxRLine className="h-4 w-4" />
              <span>Sign Out of Press Console</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
