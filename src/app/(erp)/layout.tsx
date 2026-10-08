'use client';

import React from 'react';
import { AdminShell } from '@/components/admin/AdminShell';

export default function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="erp-root font-sans text-[14px] leading-[1.45] text-slate-900 bg-[#F8FAFC]">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
