'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle,
  Eye,
  RefreshCw,
  Send,
  UploadCloud,
  FileCode,
  ShieldAlert,
  Paintbrush,
  Sparkles,
  UserCheck,
  Clock,
  ArrowRight,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Download,
  MessageSquare,
  Phone,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { api, resolveImageUrl } from '@/lib/api';

interface DesignQueueItem {
  id: string;
  orderId?: string;
  orderNumber: string;
  currentStatus: string;
  customer?: {
    fullName: string;
    email: string;
    phone?: string;
    companyName?: string;
  };
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    artworkUrl?: string | null;
    artworkFile?: any;
    referenceImageUrl?: string | null;
    referenceImage?: any;
    artworkSource?: string;
    specifications?: any;
    approvedArtworkVersion?: any;
    designNotes?: string | null;
  }>;
  artworkUrl?: string | null;
  referenceImageUrl?: string;
  assignedDesignerId?: string | null;
  customerNotes?: string | null;
  slaDueDate?: string;
  createdAt: string;
}

interface PreflightJob {
  orderId: string;
  customer: string;
  product: string;
  fileName: string;
  fileSize: string;
  dpi: number;
  colorSpace: string;
  bleedStatus: 'PASS' | 'WARNING' | 'FAIL';
  fontStatus: 'OUTLINED' | 'MISSING_GLYPHS';
  inkCoverage: number;
  stage: 'NEEDS_PREFLIGHT' | 'PROOF_DISPATCHED' | 'DEFECT_FLAGGED';
}

const PREFLIGHT_JOBS: PreflightJob[] = [
  {
    orderId: 'PB-2026-0001',
    customer: 'Acme Logistics Corp',
    product: 'Premium Visiting Cards (400 GSM Velvet)',
    fileName: 'Acme_VisitingCard_Final_v3.pdf',
    fileSize: '14.2 MB',
    dpi: 300,
    colorSpace: 'CMYK (FOGRA39)',
    bleedStatus: 'PASS',
    fontStatus: 'OUTLINED',
    inkCoverage: 280,
    stage: 'PROOF_DISPATCHED',
  },
  {
    orderId: 'PB-2026-0004',
    customer: 'Kaveri Herbals Ltd',
    product: 'Rigid Packaging Boxes with Spot Foil',
    fileName: 'Kaveri_Box_Dieline_Spread.ai',
    fileSize: '42.8 MB',
    dpi: 240,
    colorSpace: 'RGB (Profile Mismatch)',
    bleedStatus: 'FAIL',
    fontStatus: 'MISSING_GLYPHS',
    inkCoverage: 345,
    stage: 'DEFECT_FLAGGED',
  },
  {
    orderId: 'PB-2026-0005',
    customer: 'Zenith Tech Systems',
    product: 'Roll-Up Luxury Standee (2.5x6ft)',
    fileName: 'Zenith_Standee_PrintReady.pdf',
    fileSize: '88.1 MB',
    dpi: 150,
    colorSpace: 'CMYK (SWOP v2)',
    bleedStatus: 'PASS',
    fontStatus: 'OUTLINED',
    inkCoverage: 290,
    stage: 'NEEDS_PREFLIGHT',
  },
];

// Exclude all financial, cost, fee, tax, and internal metadata keys/labels
function isExcluded(keyOrLabel: string): boolean {
  const l = keyOrLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
  const blockedTerms = [
    'price',
    'cost',
    'fee',
    'tax',
    'gst',
    'subtotal',
    'total',
    'grandtotal',
    'discount',
    'shipping',
    'advance',
    'balance',
    'payment',
    'currency',
    'baseprice',
    'optionscost',
    'artworkprice',
    'designservicefee',
    'designserviceprice',
    'pricemodifier',
    'pricemodifiertype',
    'workflowroute',
    'artworksource',
    'artworkurl',
    'artworkstoragekey',
    'referenceimageurl',
    'referenceimage',
    'selecteddesignservice',
    'designnotes',
    'customernotes',
    'internalnotes',
    'raw',
    'options',
    'selectedoptionssummary',
    'fieldvalues',
  ];

  return blockedTerms.some((term) => l.includes(term));
}

function parseSpecifications(specs: any) {
  if (!specs || typeof specs !== 'object') return [];

  const list: Array<{ label: string; value: string }> = [];
  const seenLabels = new Set<string>();

  const add = (label: string, value: any) => {
    if (value === null || value === undefined || typeof value === 'object') return;
    if (isExcluded(label)) return;

    const cleanLabel = label
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();

    const normalizedLabel = cleanLabel.toLowerCase();
    if (seenLabels.has(normalizedLabel)) return;
    seenLabels.add(normalizedLabel);

    const formattedLabel = cleanLabel
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    list.push({
      label: formattedLabel,
      value: String(value).trim(),
    });
  };

  // 1. Array of options
  if (Array.isArray(specs.options)) {
    for (const opt of specs.options) {
      const label = opt.optionName || opt.fieldLabel || opt.optionCode || 'Option';
      const val = opt.valueName || opt.optionLabel || opt.value || opt.valueCode;
      if (label && val) add(label, val);
    }
  }

  // 2. Selected options summary
  if (Array.isArray(specs.selectedOptionsSummary)) {
    for (const opt of specs.selectedOptionsSummary) {
      const label = opt.fieldLabel || opt.optionName || 'Option';
      const val = opt.value || opt.valueName || opt.optionLabel;
      if (label && val) add(label, val);
    }
  }

  // 3. Known direct design properties
  if (specs.paperGsm) add('Paper Stock', specs.paperGsm);
  if (specs.finish) add('Finishing & Coating', specs.finish);
  if (specs.dimensions) add('Trim Dimensions', specs.dimensions);
  if (specs.printMode) add('Print Mode', specs.printMode);
  if (specs.sides) add('Printing Sides', specs.sides);

  // 4. Any custom fields from fieldValues or direct properties (non-financial only)
  const entries =
    typeof specs.fieldValues === 'object' && specs.fieldValues !== null
      ? { ...specs, ...specs.fieldValues }
      : specs;

  for (const [key, val] of Object.entries(entries)) {
    if (isExcluded(key)) continue;
    if (typeof val === 'string' || typeof val === 'number') {
      if (val !== '' && val !== null && val !== undefined) {
        add(key, val);
      }
    }
  }

  return list;
}

export default function ArtworkPrepressPage() {
  const [activeTab, setActiveTab] = useState<'DESIGN_STUDIO' | 'PREFLIGHT'>('DESIGN_STUDIO');
  
  // Design Queue State
  const [designQueue, setDesignQueue] = useState<DesignQueueItem[]>([]);
  const [selectedDesignOrder, setSelectedDesignOrder] = useState<DesignQueueItem | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [designSearch, setDesignSearch] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);

  // Design Upload & Completion form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [prepressNotes, setPrepressNotes] = useState('');
  const [resolutionDpi, setResolutionDpi] = useState('300');
  const [isSubmittingDesign, setIsSubmittingDesign] = useState(false);

  // Preflight State
  const [preflightJobs, setPreflightJobs] = useState<PreflightJob[]>(PREFLIGHT_JOBS);
  const [selectedPreflightJob, setSelectedPreflightJob] = useState<PreflightJob | null>(PREFLIGHT_JOBS[0]);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchDesignQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const data = await api.getDesignQueue(designSearch);
      setDesignQueue(data || []);
      if (data && data.length > 0 && !selectedDesignOrder) {
        setSelectedDesignOrder(data[0]);
      }
    } catch (err: any) {
      console.warn('Could not load design queue:', err.message);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchDesignQueue();
  }, [designSearch]);

  const handleClaimJob = async (orderId: string) => {
    try {
      await api.claimDesignJob(orderId);
      setActionSuccess(`Successfully claimed design job for order #${orderId}`);
      fetchDesignQueue();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to claim job');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  const handleCompleteDesignJob = async () => {
    if (!selectedDesignOrder || !uploadFile) {
      setActionError('Please select a finished print-ready artwork file to upload.');
      return;
    }

    setIsSubmittingDesign(true);
    setActionError('');
    try {
      // 1. Upload artwork file
      const uploadRes = await api.uploadArtwork(uploadFile);

      // 2. Submit & complete design job
      const orderIdToComplete = selectedDesignOrder.id || (selectedDesignOrder as any).orderId;
      await api.completeDesignJob(orderIdToComplete, {
        storageKey: uploadRes.storageKey,
        originalFileName: uploadRes.originalFileName,
        mimeType: uploadRes.mimeType,
        fileSize: uploadRes.fileSize,
        prepressNotes: prepressNotes || 'Design finalized and verified by Prepress Designer.',
        resolutionDpi: Number(resolutionDpi) || 300,
      });

      setActionSuccess(`Design for Order #${selectedDesignOrder.orderNumber} successfully completed and released to Pre-Production QC!`);
      setUploadFile(null);
      setPrepressNotes('');
      setSelectedDesignOrder(null);
      fetchDesignQueue();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete design job');
    } finally {
      setIsSubmittingDesign(false);
    }
  };

  const handleGenerateProof = (orderId: string) => {
    setActionSuccess(`Digital Proof generated & dispatched to customer for ${orderId}`);
    setPreflightJobs(preflightJobs.map(j => j.orderId === orderId ? { ...j, stage: 'PROOF_DISPATCHED' } : j));
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleFlagDefect = (orderId: string) => {
    setActionSuccess(`Defect ticket dispatched to customer for ${orderId}. Requested RGB to CMYK conversion.`);
    setPreflightJobs(preflightJobs.map(j => j.orderId === orderId ? { ...j, stage: 'DEFECT_FLAGGED' } : j));
    setTimeout(() => setActionSuccess(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            <span>DESIGN & PREPRESS STUDIO</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">ROUTE A & ROUTE B MANAGEMENT</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Artwork & Design Operations Console
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Manage custom design creation (Route B) and automated preflight proofing for customer artwork (Route A).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg">
          <button
            onClick={() => setActiveTab('DESIGN_STUDIO')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition ${
              activeTab === 'DESIGN_STUDIO'
                ? 'bg-amber-300 text-slate-900 shadow-sm border border-slate-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paintbrush className="h-4 w-4" />
            <span>Design Studio Queue ({designQueue.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PREFLIGHT')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition ${
              activeTab === 'PREFLIGHT'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="h-4 w-4" />
            <span>Preflight & Prepress (Route A)</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[13px] font-medium rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-[13px] font-medium rounded-md flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* TAB 1: DESIGN STUDIO QUEUE (Route B: Design Service Orders) */}
      {activeTab === 'DESIGN_STUDIO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Design Queue List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>ROUTE B: DESIGN SERVICE QUEUE</span>
                </h2>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Orders requiring custom design preparation before Pre-Production QC.
                </p>
              </div>
              <button
                onClick={fetchDesignQueue}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
                title="Refresh Queue"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingQueue ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {designQueue.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <Paintbrush className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-[14px] font-medium text-slate-700">No Orders in Design Queue</p>
                <p className="text-[12px] text-slate-400 mt-1">All design service requests have been completed and released to QC.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
                {designQueue.map((order, idx) => {
                  const orderKey = order.id || order.orderId || `design-queue-item-${order.orderNumber || idx}`;
                  const isSelected = (selectedDesignOrder?.id || selectedDesignOrder?.orderId) === (order.id || order.orderId);
                  const item = order.items?.[0];
                  return (
                    <div
                      key={orderKey}
                      onClick={() => setSelectedDesignOrder(order)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/60 border-l-4 border-l-amber-400' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[13px] text-slate-900 tabular-nums">
                              #{order.orderNumber}
                            </span>
                            <span className="text-[13px] font-semibold text-slate-800">
                              {order.customer?.fullName || 'Customer'}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              DESIGN SERVICE
                            </span>
                          </div>
                          <p className="text-[13px] text-slate-700 font-medium mt-1">
                            {item?.productName || 'Custom Print Job'} ({item?.quantity || 1} pcs)
                          </p>
                          <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3" />
                              Created: {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                            {order.customer?.phone && (
                              <span className="flex items-center gap-1 font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <Phone className="h-3 w-3 text-emerald-600" />
                                {order.customer.phone}
                              </span>
                            )}
                            {item?.referenceImageUrl && (
                              <span className="flex items-center gap-1 text-blue-600 font-medium">
                                <ImageIcon className="h-3 w-3" />
                                Reference Image
                              </span>
                            )}
                            {(item?.designNotes || (order as any)?.customerNotes || (order as any)?.designNotes) && (
                              <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                                <MessageSquare className="h-3 w-3 text-amber-600" />
                                Customer Note
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-200 block">
                            {order.currentStatus}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 block mt-2">
                            {order.assignedDesignerId ? 'Assigned to Designer' : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Design Workspace */}
          {selectedDesignOrder ? (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-5">
              <div className="border-b border-slate-200 pb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-mono font-bold uppercase text-amber-600">
                    DESIGN STUDIO WORKBENCH
                  </span>
                  <h3 className="text-[17px] font-bold text-slate-900 mt-0.5">
                    Order #{selectedDesignOrder.orderNumber}
                  </h3>
                  
                  {/* Customer Information & Contact Details */}
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap text-[12px] text-slate-700">
                      <span className="font-bold text-slate-900">
                        {selectedDesignOrder.customer?.fullName || 'Direct Customer'}
                      </span>
                      {selectedDesignOrder.customer?.companyName && (
                        <span className="text-slate-500 font-medium">
                          • {selectedDesignOrder.customer.companyName}
                        </span>
                      )}
                      {selectedDesignOrder.customer?.email && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          ({selectedDesignOrder.customer.email})
                        </span>
                      )}
                    </div>

                    {/* Customer Phone Contact Strip */}
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-mono font-bold shadow-2xs">
                        <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{selectedDesignOrder.customer?.phone || 'No phone registered'}</span>
                      </div>

                      {selectedDesignOrder.customer?.phone && (
                        <>
                          <a
                            href={`tel:${selectedDesignOrder.customer.phone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition shadow-2xs"
                            title="Call Customer"
                          >
                            <Phone className="h-3 w-3 text-slate-600" />
                            <span>Call</span>
                          </a>
                          <a
                            href={`https://wa.me/${selectedDesignOrder.customer.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-2xs"
                            title="Open WhatsApp Chat"
                          >
                            <MessageCircle className="h-3 w-3" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleClaimJob(selectedDesignOrder.id || (selectedDesignOrder as any).orderId)}
                  className="flex items-center gap-1 text-[12px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded border border-slate-300 transition shrink-0"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Claim Job</span>
                </button>
              </div>

              {/* Product Specifications & References */}
              <div className="space-y-4">
                {(() => {
                  const firstItem = selectedDesignOrder.items?.[0];
                  const specs = firstItem?.specifications || {};
                  const parsedSpecs = parseSpecifications(specs);
                  const designNotes =
                    firstItem?.designNotes ||
                    specs?.designNotes ||
                    specs?.customerNotes ||
                    (selectedDesignOrder as any)?.customerNotes;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[12px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span>Product Specifications & Notes</span>
                        </h4>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          RUN: {firstItem?.quantity || 1} PCS
                        </span>
                      </div>

                      <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 space-y-3 shadow-2xs">
                        {/* Product & Quantity Strip */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                              PRODUCT ITEM
                            </span>
                            <strong className="text-[14px] font-bold text-slate-950 block leading-tight">
                              {firstItem?.productName || 'Custom Print Job'}
                            </strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                              ORDER RUN
                            </span>
                            <span className="font-mono font-black text-slate-900 text-[13px]">
                              {firstItem?.quantity || 1} pcs
                            </span>
                          </div>
                        </div>

                        {/* Parsed Key-Value Specifications Grid */}
                        {parsedSpecs.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {parsedSpecs.map((spec, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs space-y-0.5"
                              >
                                <span className="text-[9.5px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                                  {spec.label}
                                </span>
                                <span className="text-[12px] font-bold text-slate-900 block break-words leading-snug">
                                  {spec.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic p-2 bg-white rounded border border-slate-200">
                            Standard commercial specifications configured.
                          </div>
                        )}

                        {/* Customer Custom Design Notes / Instructions */}
                        {designNotes ? (
                          <div className="p-3.5 bg-amber-50/95 rounded-xl border border-amber-300/80 text-[12px] space-y-1.5 shadow-2xs">
                            <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px] uppercase tracking-wider">
                              <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                              <span>Customer Design Instructions & Notes:</span>
                            </div>
                            <p className="text-slate-900 text-[12px] leading-relaxed whitespace-pre-wrap font-medium bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
                              {designNotes}
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-slate-100/70 rounded-lg border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                            <span>No special design instructions provided by customer for this job.</span>
                          </div>
                        )}

                        {/* Optional Collapsible Technical Data View for Engineers */}
                        {firstItem?.specifications && (
                          <div className="pt-1 border-t border-slate-200/60">
                            <button
                              type="button"
                              onClick={() => setShowRawJson((prev) => !prev)}
                              className="text-[10px] font-mono font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition cursor-pointer"
                            >
                              <FileCode className="h-3 w-3 text-slate-400" />
                              <span>{showRawJson ? 'Hide Technical Metadata (JSON)' : 'Show Technical Metadata (JSON)'}</span>
                            </button>
                            {showRawJson && (
                              <pre className="mt-2 text-[10.5px] font-mono bg-white p-2.5 rounded-lg border border-slate-200 max-h-36 overflow-auto text-slate-700 animate-in fade-in">
                                {JSON.stringify(
                                  Object.fromEntries(
                                    Object.entries(firstItem.specifications || {}).filter(
                                      ([k]) => !isExcluded(k),
                                    ),
                                  ),
                                  null,
                                  2,
                                )}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Customer Uploaded Artwork (For Touch-up / Edits) */}
                {(() => {
                  const firstItem = selectedDesignOrder.items?.[0];
                  const rawArtworkUrl =
                    firstItem?.artworkUrl ||
                    firstItem?.specifications?.artworkUrl ||
                    firstItem?.specifications?.artworkFile?.fileUrl ||
                    (selectedDesignOrder as any)?.artworkUrl;

                  if (!rawArtworkUrl) return null;
                  const isDocOrVector =
                    rawArtworkUrl.toLowerCase().endsWith('.pdf') ||
                    rawArtworkUrl.toLowerCase().endsWith('.ai') ||
                    rawArtworkUrl.toLowerCase().endsWith('.eps') ||
                    rawArtworkUrl.toLowerCase().endsWith('.psd') ||
                    rawArtworkUrl.toLowerCase().endsWith('.cdr');

                  return (
                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                          <ImageIcon className="h-4 w-4 text-amber-600" />
                          <span>Customer Artwork (For Touch-up / Edits)</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={resolveImageUrl(rawArtworkUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open Full
                          </a>
                          <a
                            href={resolveImageUrl(rawArtworkUrl)}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="text-[11px] text-amber-900 bg-amber-200/80 hover:bg-amber-300 border border-amber-300 font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        </div>
                      </div>

                      {!isDocOrVector ? (
                        <div className="relative rounded-lg overflow-hidden border border-amber-200 bg-white">
                          <img
                            src={resolveImageUrl(rawArtworkUrl)}
                            alt="Customer Uploaded Artwork"
                            className="w-full max-h-48 object-contain bg-slate-50 p-1"
                          />
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[12px] text-slate-800 font-medium">
                            <FileCode className="h-4 w-4 text-amber-600" />
                            <span>File: {rawArtworkUrl.split('/').pop()}</span>
                          </div>
                          <span className="text-[10.5px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            VECTOR / DOC
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Customer Reference Image */}
                {selectedDesignOrder.items?.[0]?.referenceImageUrl && (
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-bold text-blue-900 flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-blue-600" />
                        Customer Reference Image
                      </span>
                      <a
                        href={resolveImageUrl(selectedDesignOrder.items[0].referenceImageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open Full
                      </a>
                    </div>
                    <img
                      src={resolveImageUrl(selectedDesignOrder.items[0].referenceImageUrl)}
                      alt="Reference"
                      className="w-full h-36 object-cover rounded border border-blue-200"
                    />
                  </div>
                )}
              </div>

              {/* Upload Final Artwork & Complete Gate */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div>
                  <h4 className="text-[12px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UploadCloud className="h-4 w-4 text-slate-700" />
                    <span>Upload Final Print-Ready Artwork</span>
                  </h4>
                  <p className="text-[12px] text-slate-500 mb-2">
                    Submit the finished high-resolution artwork (PDF / AI / TIFF).
                  </p>
                  
                  <input
                    type="file"
                    accept=".pdf,.ai,.eps,.psd,.tiff,.png,.jpg,.jpeg"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="block w-full text-[12px] text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-[12px] file:font-semibold file:bg-amber-300 file:text-slate-900 hover:file:bg-amber-400 cursor-pointer border border-slate-300 rounded-lg p-1.5 bg-slate-50"
                  />
                  {uploadFile && (
                    <p className="text-[11px] font-mono text-emerald-700 font-semibold mt-1">
                      ✓ Selected: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                      Target DPI
                    </label>
                    <input
                      type="number"
                      value={resolutionDpi}
                      onChange={(e) => setResolutionDpi(e.target.value)}
                      className="w-full text-[12px] px-3 py-1.5 rounded border border-slate-300 bg-white"
                      placeholder="300"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                      Color Mode
                    </label>
                    <input
                      type="text"
                      disabled
                      value="CMYK (FOGRA39 / SWOP)"
                      className="w-full text-[12px] px-3 py-1.5 rounded border border-slate-200 bg-slate-100 text-slate-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Prepress Notes & Instructions for QC
                  </label>
                  <textarea
                    rows={2}
                    value={prepressNotes}
                    onChange={(e) => setPrepressNotes(e.target.value)}
                    placeholder="E.g., 3mm bleed added, fonts outlined, vector dieline on separate spot layer."
                    className="w-full text-[12px] p-2.5 rounded-lg border border-slate-300 bg-white placeholder:text-slate-400"
                  />
                </div>

                <button
                  onClick={handleCompleteDesignJob}
                  disabled={isSubmittingDesign || !uploadFile}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-[13px] py-3 rounded-lg shadow-sm transition active:scale-[0.98]"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    {isSubmittingDesign ? 'Uploading & Releasing...' : 'SUBMIT DESIGN & RELEASE TO PRE-QC'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-400">
              <Layers className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-[14px] font-medium text-slate-600">Select an Order</p>
              <p className="text-[12px] text-slate-400 mt-0.5">Click an order from the queue to start or complete the design.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PREFLIGHT & PREPRESS (Route A: Customer Artwork) */}
      {activeTab === 'PREFLIGHT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Prepress Queue Table */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">
                Incoming Customer Artwork Files
              </h2>
              <span className="text-[11px] font-mono text-slate-400">PitStop Engine: ACTIVE</span>
            </div>

            <div className="divide-y divide-slate-100">
              {preflightJobs.map((job) => {
                const isSelected = selectedPreflightJob?.orderId === job.orderId;
                return (
                  <div
                    key={job.orderId}
                    onClick={() => setSelectedPreflightJob(job)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-amber-50/50 border-l-4 border-l-amber-400' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[13px] text-slate-900 tabular-nums">
                            #{job.orderId}
                          </span>
                          <span className="text-[13px] font-medium text-slate-700">{job.customer}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            job.stage === 'PROOF_DISPATCHED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : job.stage === 'DEFECT_FLAGGED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {job.stage}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 font-normal mt-1">{job.product}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          File: {job.fileName} ({job.fileSize})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          job.bleedStatus === 'PASS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          BLEED: {job.bleedStatus}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 block mt-1 tabular-nums">
                          {job.dpi} DPI • {job.colorSpace}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 5 Cols: Preflight Inspection & Actions */}
          {selectedPreflightJob && (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-[11px] font-mono font-semibold uppercase text-slate-400">
                  INSPECTION REPORT
                </span>
                <h3 className="text-[16px] font-semibold text-slate-900 mt-0.5">
                  {selectedPreflightJob.fileName}
                </h3>
                <p className="text-[12px] text-slate-500 tabular-nums font-mono">Order Ref: #{selectedPreflightJob.orderId}</p>
              </div>

              {/* Preflight Checks */}
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Output Resolution:</span>
                  <span className={`font-semibold tabular-nums ${selectedPreflightJob.dpi >= 300 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedPreflightJob.dpi} DPI {selectedPreflightJob.dpi >= 300 ? '✓ (Optimal)' : '⚠ (Under 300)'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Color Mode:</span>
                  <span className={`font-semibold ${selectedPreflightJob.colorSpace.includes('CMYK') ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedPreflightJob.colorSpace}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Bleed (3mm Required):</span>
                  <span className={`font-semibold ${selectedPreflightJob.bleedStatus === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedPreflightJob.bleedStatus === 'PASS' ? '3.0mm Detected ✓' : 'NO BLEED DETECTED ✕'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Fonts & Text Glyphs:</span>
                  <span className={`font-semibold ${selectedPreflightJob.fontStatus === 'OUTLINED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedPreflightJob.fontStatus}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Total Area Coverage (TAC):</span>
                  <span className={`font-semibold tabular-nums ${selectedPreflightJob.inkCoverage <= 320 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedPreflightJob.inkCoverage}% {selectedPreflightJob.inkCoverage <= 320 ? '(Under 320% max)' : '(INK SMUDGE RISK)'}
                  </span>
                </div>
              </div>

              {/* Operator Actions */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <button
                  onClick={() => handleGenerateProof(selectedPreflightJob.orderId)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] py-2.5 rounded-lg shadow-sm transition active:scale-[0.98]"
                >
                  <Send className="h-4 w-4" />
                  <span>GENERATE & DISPATCH DIGITAL PROOF</span>
                </button>

                <button
                  onClick={() => handleFlagDefect(selectedPreflightJob.orderId)}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-700 font-semibold text-[13px] py-2 rounded-lg border border-rose-300 transition"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Flag Preflight Defect & Request Re-Upload</span>
                </button>

                <Link
                  href={`/approvals/PROOF-${selectedPreflightJob.orderId}`}
                  target="_blank"
                  className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-900 py-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview Customer Proof Inspection Canvas ↗</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
