'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { checkRouteAuthorization } from './navigation';
import {
  RiLockLine,
  RiShieldCrossLine,
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiLogoutBoxRLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, getRoleDestination } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Authentication validation
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-900">
        <div className="h-10 w-10 border-3 border-slate-900 border-t-[#FFED00] rounded-full animate-spin mb-4" />
        <span className="font-mono text-xs text-slate-600 tracking-widest uppercase font-bold">
          VERIFYING FACTORY CREDENTIALS & RBAC PERMISSIONS...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // 1. HARD RULE: CUSTOMERS MUST NEVER ACCESS /admin/*
  if (user?.role === 'CUSTOMER') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-200 shadow-sm">
          <RiLockLine className="h-8 w-8" />
        </div>
        <div className="inline-block px-2.5 py-1 rounded bg-red-100 text-red-800 font-mono text-[10px] font-bold tracking-wider uppercase mb-2">
          Access Denied: 403 Forbidden
        </div>
        <h1 className="text-2xl font-black text-slate-900 font-display">Customer Account Detected</h1>
        <p className="text-xs text-slate-600 max-w-md mt-2 leading-relaxed">
          Your account is registered as a customer. The internal ERP control center is strictly reserved for factory staff and authorized plant personnel.
        </p>
        <div className="flex items-center gap-3 mt-6">
          <Link href="/account">
            <Button variant="primary" size="md">
              Go to Customer Portal
            </Button>
          </Link>
          <Button variant="outline" size="md" onClick={() => logout()}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // 2. CHECK ROUTE-LEVEL AUTHORIZATION FOR CURRENT INTERNAL USER
  const { isAuthorized, requiredPermissions } = checkRouteAuthorization(
    pathname,
    user?.permissions || []
  );

  const roleDestination = getRoleDestination(user?.role);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] flex">
      {/* Role-Aware Fixed Left Sidebar */}
      <AdminSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Right Main Body: Sticky Header + Independently Scrollable Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Dedicated Admin Header */}
        <AdminHeader onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        {/* Main Operational Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] custom-scrollbar">
          {isAuthorized ? (
            children
          ) : (
            /* Unauthorized Direct URL Access Guard */
            <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl border border-red-200 p-8 shadow-card text-center">
              <div className="h-14 w-14 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-200">
                <RiShieldCrossLine className="h-7 w-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded bg-red-100 text-red-800 font-mono text-[10px] font-bold tracking-wider uppercase mb-2">
                403 Forbidden / Route Restricted
              </div>
              <h2 className="text-xl font-black text-slate-900 font-display">
                Unauthorized Operational Workspace
              </h2>
              <p className="text-xs text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
                Your current role (<strong>{user?.role?.replace(/_/g, ' ')}</strong>) does not have
                the required operational permission to view or execute actions on this station.
              </p>

              {requiredPermissions.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg max-w-md mx-auto text-left">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">
                    Required Station Permissions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredPermissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-0.5 bg-red-50 text-red-700 font-mono text-[10px] rounded border border-red-200"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 mt-6">
                <Link href={roleDestination}>
                  <Button variant="primary" size="md">
                    <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                    <span>Return to Your Assigned Station</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
