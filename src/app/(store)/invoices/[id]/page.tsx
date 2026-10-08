'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { Printer, Download, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button, Badge } from '@/components/ui';

export default function InvoicePrintablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id || 'PB-2026-0001';

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6">
      {/* Print / Navigation Action Bar */}
      <div className="mx-auto max-w-4xl mb-6 flex items-center justify-between print:hidden">
        <Link href="/account" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Account</span>
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            <span>Print Tax Invoice (A4)</span>
          </Button>
        </div>
      </div>

      {/* Formal Master Tax Invoice Sheet (A4 Proportion) */}
      <div className="mx-auto max-w-4xl bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 shadow-card print:border-none print:shadow-none print:p-0 text-slate-900">
        {/* Header: Company & Invoice Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight font-display">PRINT BAZZAR</span>
              <span className="bg-[#FFED00] text-slate-950 text-[10px] font-mono font-black px-1.5 py-0.5 rounded border border-[#E3A008]/40">
                2.0
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-0.5">
              Print Bazzar Manufacturing Pvt. Ltd.
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
              Industrial Area Phase 2, Press Complex<br />
              Plot 42-C, Lower Parel, Mumbai, MH — 400013<br />
              <strong>GSTIN: 27AABCP8920K1ZM</strong> • PAN: AABCP8920K<br />
              State: Maharashtra (Code: 27)
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xl font-black text-slate-900 block tracking-tight font-display">
              TAX INVOICE
            </span>
            <span className="text-[10px] font-mono text-slate-500 block">
              ORIGINAL FOR RECIPIENT
            </span>

            <div className="mt-3 space-y-1 text-xs font-mono">
              <p>
                <span className="text-slate-500">Invoice No:</span>{' '}
                <strong className="text-slate-900">INV-2026-0891</strong>
              </p>
              <p>
                <span className="text-slate-500">Invoice Date:</span>{' '}
                <strong>29-Sep-2026</strong>
              </p>
              <p>
                <span className="text-slate-500">Order Ref:</span>{' '}
                <strong className="text-slate-900">#{invoiceId}</strong>
              </p>
              <p>
                <span className="text-slate-500">Place of Supply:</span>{' '}
                <strong>Maharashtra (27)</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Billed To / Shipped To Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
          <div>
            <span className="font-mono uppercase font-bold text-slate-400 block text-[10px]">
              BILLED TO (BUYER)
            </span>
            <h3 className="font-bold text-sm text-slate-900 mt-1">Acme Logistics Corp</h3>
            <p className="text-slate-600 mt-1 leading-relaxed">
              BKC Industrial Hub, Tower 4, Level 9<br />
              Bandra-Kurla Complex, Bandra East<br />
              Mumbai, Maharashtra — 400051<br />
              <strong>GSTIN: 27AABCA9911D1ZX</strong> • Contact: +91 98765 43210
            </p>
          </div>

          <div>
            <span className="font-mono uppercase font-bold text-slate-400 block text-[10px]">
              SHIPPED TO (DELIVERY SITE)
            </span>
            <h3 className="font-bold text-sm text-slate-900 mt-1">Acme Central Fulfillment Hub</h3>
            <p className="text-slate-600 mt-1 leading-relaxed">
              Gate 3, Warehouse Cluster B<br />
              Bhiwandi Logistics Park, Thane<br />
              Maharashtra — 421302
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6 border-b border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-mono font-bold text-slate-500 uppercase">
                <th className="text-left pb-2">Item Description & Specifications</th>
                <th className="text-center pb-2">HSN / SAC</th>
                <th className="text-right pb-2">Qty</th>
                <th className="text-right pb-2">Rate</th>
                <th className="text-right pb-2">Taxable Amt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              <tr>
                <td className="py-3 pr-4">
                  <span className="font-bold text-slate-900 block">Premium Visiting Cards</span>
                  <span className="text-[11px] text-slate-500">
                    400 GSM Velvet Artboard • Matte Thermal Lamination • Spot UV Double Sided
                  </span>
                </td>
                <td className="py-3 text-center font-mono text-slate-600">4911</td>
                <td className="py-3 text-right font-mono font-bold">500 pcs</td>
                <td className="py-3 text-right font-mono">₹2.50</td>
                <td className="py-3 text-right font-mono font-bold">₹1,250.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tax Summary Calculation */}
        <div className="py-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-6 text-xs">
          <div className="space-y-1 max-w-sm text-[11px] text-slate-500">
            <p className="font-bold text-slate-700">Payment Status: PAID ONLINE</p>
            <p>Razorpay Gateway Ref: pay_NZ9981240182</p>
            <p>E-Way Bill: Not required (&lt; ₹50,000 threshold)</p>
          </div>

          <div className="w-full sm:w-64 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-mono font-bold text-slate-900">₹1,250.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CGST (9.0%):</span>
              <span className="font-mono font-bold text-slate-900">₹112.50</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>SGST (9.0%):</span>
              <span className="font-mono font-bold text-slate-900">₹112.50</span>
            </div>
            <div className="pt-2 border-t border-slate-900 flex justify-between font-black text-sm text-slate-900 font-display">
              <span>Total Invoice Value:</span>
              <span>₹1,475.00</span>
            </div>
          </div>
        </div>

        {/* Authorized Signature Footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-end justify-between gap-6 text-xs">
          <div className="text-[10px] text-slate-400 font-mono">
            This is a system-generated Master Tax Invoice. Strictly TypeScript Verified.
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-slate-300 w-48 mb-1" />
            <span className="font-bold text-slate-900 block">For PRINT BAZZAR MFG PVT LTD</span>
            <span className="text-[10px] text-slate-500">Authorized Signatory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
