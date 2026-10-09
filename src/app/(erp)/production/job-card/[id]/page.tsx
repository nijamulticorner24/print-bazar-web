'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  Printer,
  Barcode,
  ArrowLeft,
  CheckSquare,
  Clock,
  AlertCircle,
  FileCheck,
  Scissors,
} from 'lucide-react';
import { Button } from '@/components/ui';

export default function ShopFloorJobCardPrintable({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id || 'JOB-2026-001';

  return (
    <div className="min-h-screen bg-[#F8F8F8] py-8 px-4 sm:px-6">
      {/* Action Bar */}
      <div className="mx-auto max-w-4xl mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/production/queue"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Production Floor Queue</span>
        </Link>

        <Button
          variant="primary"
          size="sm"
          onClick={() => window.print()}
          className="shadow-xs"
        >
          <Printer className="h-4 w-4 mr-1.5" />
          <span>Print Shop Floor Job Card (A4 Sheet)</span>
        </Button>
      </div>

      {/* Industrial Work Order Sheet */}
      <div className="mx-auto max-w-4xl bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-card print:border-none print:shadow-none print:p-0 text-black">
        {/* Giant Shop Floor Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-[#FFED00] text-black px-2 py-0.5 rounded border border-[#E5E5E5]">
                PRESS SHOP-FLOOR JOB CARD
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                STATION ID: MC-02-INDIGO
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-black font-mono tracking-tight mt-1">
              #{jobId}
            </h1>
            <p className="text-xs font-mono text-slate-500 mt-1">
              ORDER LINK: <strong>#PB-2026-0001</strong> • CLIENT: <strong>Acme Logistics Corp</strong>
            </p>
          </div>

          <div className="text-left sm:text-right font-mono">
            {/* Visual Barcode */}
            <div className="h-12 bg-zinc-900 rounded-[2px] flex items-center justify-center text-white text-[9px] tracking-[5px] font-bold px-4">
              ||| | ||||| || |||| ||||| ||| ||||
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1">
              SCAN TO START / STOP MACHINE RUN
            </span>
          </div>
        </div>

        {/* 6 Essential Factory Floor Signals */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-4 border-b-2 border-brand-dark bg-[#FAFAFA] -mx-6 sm:-mx-10 px-6 sm:px-10 text-xs font-mono">
          <div>
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">ASSIGNED MACHINE</span>
            <strong className="text-brand-dark block text-xs mt-0.5">HP Indigo 12000</strong>
          </div>
          <div>
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">TOTAL RUN RUN QTY</span>
            <strong className="text-brand-dark block text-sm mt-0.5">500 PCS (NET)</strong>
          </div>
          <div>
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">PRESS SHEETS</span>
            <strong className="text-brand-dark block text-xs mt-0.5">25 SRA3 (21-Up)</strong>
          </div>
          <div>
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">OPERATOR</span>
            <strong className="text-brand-dark block text-xs mt-0.5">Rajesh K. (Shift A)</strong>
          </div>
          <div>
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">DISPATCH SLA</span>
            <strong className="text-red-700 block text-xs mt-0.5 font-bold">Today 18:00</strong>
          </div>
          <div>
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">QC GATE STATE</span>
            <strong className="text-green-700 block text-xs mt-0.5 font-bold">RELEASED (12/12)</strong>
          </div>
        </div>

        {/* Technical Specification Table */}
        <div className="py-6 border-b-2 border-brand-dark space-y-4">
          <h2 className="text-xs font-mono font-black text-brand-dark uppercase tracking-wider">
            RAW SUBSTRATE & PRESS SETUP SPECIFICATIONS
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-zinc-50 border border-brand-border rounded space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono">Substrate:</span>
                <strong className="text-brand-dark">400 GSM European Velvet Artboard</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono">Paper Feed Size:</span>
                <strong className="font-mono text-brand-dark">320mm × 450mm (SRA3)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono">Grain Direction:</span>
                <strong className="text-brand-dark">Short Grain (SG) // Parallel to fold</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono">Inks:</span>
                <strong className="text-brand-dark">4/4 Full Color CMYK (FOGRA39)</strong>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 border border-brand-border rounded space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono">Cut Finish Size:</span>
                <strong className="font-mono text-brand-dark">89mm × 51mm (Clean Cut)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono">Bleed Allowance:</span>
                <strong className="font-mono text-brand-dark">3.0mm all 4 edges</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono">Lamination:</span>
                <strong className="text-brand-dark">Double Sided Thermal Soft-Touch Matte</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono">Special Finishing:</span>
                <strong className="text-brand-dark text-amber-700">Gold Hot Foil (Front Side Only)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Finishing & Guillotine Cutting Instructions */}
        <div className="py-6 border-b-2 border-brand-dark space-y-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-brand-dark" />
            <h3 className="text-xs font-mono font-black text-brand-dark uppercase tracking-wider">
              POST-PRESS CUTTING & OPERATOR CHECKLIST
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <label className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-brand-border rounded">
              <input type="checkbox" className="h-4 w-4" />
              <span>Step 1: Inspect 1st pull sheet against approved proof under D50 light</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-brand-border rounded">
              <input type="checkbox" className="h-4 w-4" />
              <span>Step 2: Allow 30 min ink dry time before thermal matte lamination</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-brand-border rounded">
              <input type="checkbox" className="h-4 w-4" />
              <span>Step 3: Setup Foil stamping die temperature at 115°C (Kurz Gold Foil)</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-brand-border rounded">
              <input type="checkbox" className="h-4 w-4" />
              <span>Step 4: Trim on Polar 78 Guillotine to exact 89×51mm. Zero burr edges.</span>
            </label>
          </div>
        </div>

        {/* Operator Sign-Off Box */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-mono">
          <div className="border border-brand-dark p-3 rounded">
            <span className="text-[10px] text-zinc-500 uppercase block">1. PRESS RUN SIGN-OFF</span>
            <div className="h-8 border-b border-dashed border-zinc-400 mt-2" />
            <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
              <span>Time: ______:______</span>
              <span>Sheets: ______</span>
            </div>
          </div>

          <div className="border border-brand-dark p-3 rounded">
            <span className="text-[10px] text-zinc-500 uppercase block">2. FINISHING SIGN-OFF</span>
            <div className="h-8 border-b border-dashed border-zinc-400 mt-2" />
            <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
              <span>Foil: [ ] PASS</span>
              <span>Cut: [ ] PASS</span>
            </div>
          </div>

          <div className="border border-brand-dark p-3 rounded bg-yellow-50/50">
            <span className="text-[10px] text-zinc-700 font-bold uppercase block">3. FINAL QC INSPECTOR</span>
            <div className="h-8 border-b border-dashed border-zinc-400 mt-2" />
            <div className="flex justify-between mt-1 text-[10px] text-brand-dark font-bold">
              <span>Release to Packing: [ ]</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
