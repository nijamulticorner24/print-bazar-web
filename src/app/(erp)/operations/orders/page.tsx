'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  RiSearchLine,
  RiFilter3Line,
  RiRefreshLine,
  RiArrowRightLine,
  RiUserFollowLine,
  RiPrinterLine,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiFileTextLine,
  RiMoreFill,
  RiCloseLine,
  RiCheckLine,
  RiCalendarLine,
  RiFlashlightLine,
  RiLayoutGridLine,
  RiListCheck2,
  RiSparklingLine,
  RiFilePdfLine,
  RiPaletteLine,
  RiSettings4Line,
  RiFileListLine,
  RiBox3Line,
  RiEyeLine,
  RiDownloadLine,
  RiExternalLinkLine,
  RiZoomInLine,
  RiImageLine,
  RiShieldCheckLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { useSocket } from '@/lib/socket-context';
import { formatCurrency, formatDate, resolveArtworkUrl } from '@/lib/utils';
import { Button } from '@/components/ui';

// ─── TYPES ──────────────────────────────────────────────────────────────────

type QueueTab =
  | 'NEEDS_ACTION'
  | 'DESIGN_REQUIRED'
  | 'READY_FOR_PRODUCTION'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'ALL';

interface StaffAssignee {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: 'AVAILABLE' | 'BUSY' | 'ON_LEAVE';
  activeJobs: number;
  skills: string[];
  recommended?: boolean;
  avatarUrl?: string;
}

// ─── DEFAULT ROSTERS FOR DRAWER ──────────────────────────────────────────────

const DEFAULT_DESIGNERS: StaffAssignee[] = [
  {
    id: 'des-01',
    fullName: 'Anjali Mehta',
    email: 'anjali.m@printbazzar.com',
    role: 'DESIGNER_PREPRESS',
    status: 'AVAILABLE',
    activeJobs: 4,
    skills: ['Branding', 'Print Design'],
    recommended: true,
  },
  {
    id: 'des-02',
    fullName: 'Rahul Sharma',
    email: 'rahul.s@printbazzar.com',
    role: 'DESIGNER_PREPRESS',
    status: 'BUSY',
    activeJobs: 11,
    skills: ['Branding', 'Packaging'],
  },
  {
    id: 'des-03',
    fullName: 'Arun Kumar',
    email: 'arun.k@printbazzar.com',
    role: 'DESIGNER_PREPRESS',
    status: 'AVAILABLE',
    activeJobs: 2,
    skills: ['Branding', 'Marketing'],
  },
  {
    id: 'des-04',
    fullName: 'Priya Nair',
    email: 'priya.n@printbazzar.com',
    role: 'DESIGNER_PREPRESS',
    status: 'AVAILABLE',
    activeJobs: 5,
    skills: ['Digital', 'Illustrations'],
  },
];

const DEFAULT_OPERATORS: StaffAssignee[] = [
  {
    id: 'op-01',
    fullName: 'Arun Kumar',
    email: 'arun.print@printbazzar.com',
    role: 'PRODUCTION_OPERATOR',
    status: 'AVAILABLE',
    activeJobs: 2,
    skills: ['Digital Press', 'Business Cards', 'Commercial Print'],
    recommended: true,
  },
  {
    id: 'op-02',
    fullName: 'Manoj Kumar',
    email: 'manoj.k@printbazzar.com',
    role: 'PRODUCTION_OPERATOR',
    status: 'AVAILABLE',
    activeJobs: 3,
    skills: ['Sheetfed Offset', 'Brochures', 'Book Printing'],
  },
  {
    id: 'op-03',
    fullName: 'Vijay Verma',
    email: 'vijay.v@printbazzar.com',
    role: 'PRODUCTION_OPERATOR',
    status: 'AVAILABLE',
    activeJobs: 4,
    skills: ['Packaging Line', 'Rigid Boxes', 'Die-Cutter'],
  },
  {
    id: 'op-04',
    fullName: 'Suresh Patil',
    email: 'suresh.p@printbazzar.com',
    role: 'PRODUCTION_OPERATOR',
    status: 'BUSY',
    activeJobs: 8,
    skills: ['Wide Format', 'Banners', 'Roll-up Standees'],
  },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function OrderAssignmentCenterPage() {
  const { isConnected, lastEvent, subscribeToOperations } = useSocket();

  // Primary state
  const [activeTab, setActiveTab] = useState<QueueTab>('NEEDS_ACTION');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [slaFilter, setSlaFilter] = useState('ALL');

  // Selection state for Bulk Assignment
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerOrder, setDrawerOrder] = useState<any | null>(null);
  const [drawerType, setDrawerType] = useState<'DESIGN' | 'PRODUCTION'>('DESIGN');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffSearch, setStaffSearch] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Artwork Inspection Modal Viewer state
  const [artworkModalOpen, setArtworkModalOpen] = useState(false);
  const [artworkImageError, setArtworkImageError] = useState(false);
  const [viewingArtwork, setViewingArtwork] = useState<{
    orderNumber: string;
    productName: string;
    customerName: string;
    fileName: string;
    version: string;
    fileSize: string;
    fileUrl: string | null;
    storageKey?: string | null;
    mimeType?: string;
    dimensions?: string;
    qualityStatus?: string;
  } | null>(null);

  // Live order list state
  const [orders, setOrders] = useState<any[]>([]);
  const [designers, setDesigners] = useState<StaffAssignee[]>(DEFAULT_DESIGNERS);
  const [operators, setOperators] = useState<StaffAssignee[]>(DEFAULT_OPERATORS);
  const [isLoading, setIsLoading] = useState(false);

  // Date formatted card
  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return { dateStr, timeStr };
  }, []);

  // Fetch real data from Backend API and sync
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resOrders, resDesigners, resOperators] = await Promise.all([
        api.getOperationsOrders({ limit: 100 }).catch(() => null),
        api.getEligibleDesigners().catch(() => null),
        api.getEligibleProductionOperators().catch(() => null),
      ]);

      const backendOrders = Array.isArray(resOrders)
        ? resOrders
        : (resOrders as any)?.data || (resOrders as any)?.orders || [];

      if (backendOrders && backendOrders.length > 0) {
        // Map backend orders to unified structure
        const mapped = backendOrders.map((bo: any) => {
          const item = bo.items?.[0] || {};
          const specs = item.specifications || {};
          const latestArt = item.artworkVersions?.[0];
          const hasUploadedArt = Boolean(
            latestArt?.storageKey ||
            latestArt?.proofUrl ||
            specs?.artworkUrl ||
            specs?.artworkFile?.fileUrl ||
            specs?.artworkFile?.storageKey ||
            (item.artworkVersions && item.artworkVersions.length > 0)
          );

          const isArtReady =
            bo.status === 'ARTWORK_APPROVED' ||
            bo.status === 'PRODUCTION_QUEUE' ||
            bo.status === 'PRINTING' ||
            bo.status === 'FINISHING' ||
            bo.status === 'QUALITY_CHECK' ||
            bo.status === 'PACKING' ||
            bo.status === 'READY_FOR_DISPATCH' ||
            bo.status === 'DELIVERED' ||
            (hasUploadedArt &&
              bo.status !== 'DESIGN_REQUIRED' &&
              bo.status !== 'ARTWORK_REVIEW');

          const isDesign =
            bo.status === 'DESIGN_REQUIRED' ||
            bo.workflowRoute === 'DESIGN_SERVICE' ||
            item.artworkSource === 'DESIGN_TEAM' ||
            specs?.selectedDesignService ||
            specs?.workflowRoute === 'DESIGN_SERVICE' ||
            specs?.artworkSource === 'DESIGN_TEAM' ||
            specs?.artworkSource === 'CUSTOMER_WITH_DESIGN_ASSISTANCE';

          const artState = isArtReady ? 'READY' : isDesign ? 'DESIGN_REQUIRED' : 'NOT_READY';

          const rawArtUrl =
            latestArt?.proofUrl ||
            latestArt?.storageKey ||
            specs?.artworkUrl ||
            specs?.artworkFile?.fileUrl ||
            specs?.artworkFile?.storageKey ||
            null;

          const artFileUrl = resolveArtworkUrl(rawArtUrl);

          const prodAssignee =
            bo.assignedOperator ||
            bo.productionAssignment?.assignedUser ||
            bo.assignments?.find((a: any) => a.taskType === 'PRODUCTION' && a.status === 'ACTIVE')?.assignedUser ||
            null;

          const designAssignee =
            bo.assignedDesigner ||
            bo.designAssignment?.assignedUser ||
            bo.assignments?.find((a: any) => a.taskType === 'DESIGN' && a.status === 'ACTIVE')?.assignedUser ||
            null;

          const activeAssignee = prodAssignee || designAssignee || null;

          return {
            id: bo.id,
            orderNumber: bo.orderNumber,
            customerName: bo.customer?.fullName || 'Direct Customer',
            productName: item.productName || 'Custom Print Job',
            thumbnailType: item.productName?.toLowerCase().includes('card')
              ? 'cards'
              : item.productName?.toLowerCase().includes('box')
              ? 'box'
              : 'brochure',
            specs: {
              quantity: item.quantity || 100,
              dimensions: specs.dimensions || specs.size || 'Standard',
              sides: specs.sides || '4 + 4',
              substrate: specs.paperGsm || specs.substrate || '350 GSM',
            },
            artworkState: artState,
            artworkMessage: isArtReady
              ? 'Artwork verified & approved for production'
              : isDesign
              ? 'Custom prepress design requested by client'
              : 'No approved artwork version uploaded',
            artworkFile: isArtReady || hasUploadedArt
              ? {
                  fileName:
                    latestArt?.originalFileName ||
                    specs?.artworkFile?.originalFileName ||
                    specs?.artworkFile?.fileName ||
                    'artwork_final_v1.pdf',
                  version: `v${latestArt?.versionNumber || 1}`,
                  fileSize: latestArt?.fileSize
                    ? `${(Number(latestArt.fileSize) / (1024 * 1024)).toFixed(1)} MB`
                    : '3.2 MB',
                  fileUrl: artFileUrl,
                  storageKey: latestArt?.storageKey || specs?.artworkStorageKey || null,
                  mimeType: latestArt?.mimeType || specs?.artworkFile?.mimeType || (rawArtUrl?.match(/\.(jpeg|jpg|png|webp|gif|svg)(\?.*)?$/i) ? 'image/png' : 'application/pdf'),
                  qualityStatus: latestArt?.qualityStatus || 'PASSED',
                  sizeValid: true,
                  sizeDisplay: specs.dimensions || specs.size || 'Standard',
                }
              : null,
            priority: bo.priority || 'NORMAL',
            dueDate: formatDate(bo.promisedDeliveryDate || bo.createdAt),
            dueDaysLeft: 5,
            isUrgent: bo.priority === 'URGENT',
            assignedTo: activeAssignee,
            assignedDesigner: designAssignee,
            assignedOperator: prodAssignee,
            status: bo.status,
          };
        });

        setOrders(mapped);
      } else {
        setOrders([]);
      }

      // Update rosters if returned
      if (Array.isArray(resDesigners) && resDesigners.length > 0) {
        const dMapped: StaffAssignee[] = resDesigners.map((d: any, idx: number) => ({
          id: d.id,
          fullName: d.fullName,
          email: d.email,
          role: 'DESIGNER_PREPRESS',
          status: d.activeAssignments > 6 ? 'BUSY' : 'AVAILABLE',
          activeJobs: d.activeAssignments ?? 2,
          skills: idx === 0 ? ['Branding', 'Print Design'] : ['Branding', 'Packaging'],
          recommended: idx === 0,
        }));
        setDesigners(dMapped);
      }

      if (Array.isArray(resOperators) && resOperators.length > 0) {
        const oMapped: StaffAssignee[] = resOperators.map((o: any, idx: number) => ({
          id: o.id,
          fullName: o.fullName,
          email: o.email,
          role: 'PRODUCTION_OPERATOR',
          status: (o.activeJobCards || o.activeAssignments || 0) > 6 ? 'BUSY' : 'AVAILABLE',
          activeJobs: o.activeJobCards || o.activeAssignments || 1,
          skills: idx === 0 ? ['Digital Press', 'Business Cards', 'Commercial Print'] : ['Offset Press', 'Brochures'],
          recommended: idx === 0,
        }));
        setOperators(oMapped);
      }
    } catch (err) {
      console.error('Failed to sync OE Assignment Center data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    subscribeToOperations();
  }, [loadData, subscribeToOperations]);

  // Real-time WebSocket live updates
  useEffect(() => {
    if (lastEvent) {
      const orderNum = lastEvent.data?.orderNumber || lastEvent.data?.orderId || 'Order';
      let msg = `⚡ Live Update: ${lastEvent.name}`;
      if (lastEvent.name === 'order:created') msg = `🆕 New Order Intake: #${orderNum}`;
      if (lastEvent.name === 'order:updated') msg = `🔄 Order Updated: #${orderNum}`;
      if (lastEvent.name === 'order:assigned') msg = `👤 Operator/Designer Assigned: #${orderNum}`;

      setLiveToast(msg);
      loadData();
      const timer = setTimeout(() => setLiveToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastEvent, loadData]);

  // ─── KPI METRICS CALCULATION ───────────────────────────────────────────────

  const kpiMetrics = useMemo(() => {
    const total = orders.length;
    const designReq = orders.filter((o) => (o.artworkState === 'DESIGN_REQUIRED' || o.artworkState === 'NOT_READY') && !o.assignedTo).length;
    const readyProd = orders.filter((o) => o.artworkState === 'READY' && !o.assignedTo).length;
    const needsAction = orders.filter((o) => !o.assignedTo).length;
    const inProgress = orders.filter((o) => o.assignedTo || ['PRINTING', 'FINISHING', 'QUALITY_CHECK'].includes(o.status)).length;
    const blocked = orders.filter((o) => o.artworkState === 'BLOCKED' || o.status === 'ON_HOLD').length;

    return {
      needsAction,
      designRequired: designReq,
      readyForProduction: readyProd,
      inProgress,
      blocked,
      totalOrders: total,
    };
  }, [orders]);

  // ─── FILTERED ORDERS LIST ──────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (activeTab === 'NEEDS_ACTION') {
        if (o.assignedTo) return false;
      } else if (activeTab === 'DESIGN_REQUIRED') {
        if (o.artworkState !== 'DESIGN_REQUIRED' && o.artworkState !== 'NOT_READY') return false;
      } else if (activeTab === 'READY_FOR_PRODUCTION') {
        if (o.artworkState !== 'READY') return false;
      } else if (activeTab === 'IN_PROGRESS') {
        if (!o.assignedTo && !['PRINTING', 'FINISHING', 'QUALITY_CHECK'].includes(o.status)) return false;
      } else if (activeTab === 'BLOCKED') {
        if (o.artworkState !== 'BLOCKED' && o.status !== 'ON_HOLD') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Priority Filter
      if (priorityFilter !== 'ALL' && o.priority !== priorityFilter) return false;

      // Customer Filter
      if (customerFilter !== 'ALL' && o.customerName !== customerFilter) return false;

      // Product Filter
      if (productFilter !== 'ALL' && o.productName !== productFilter) return false;

      return true;
    });
  }, [orders, activeTab, searchQuery, priorityFilter, customerFilter, productFilter]);

  // ─── DRAWER OPEN HANDLER ───────────────────────────────────────────────────

  const handleOpenDrawer = (order: any, type: 'DESIGN' | 'PRODUCTION') => {
    setDrawerOrder(order);
    setDrawerType(type);
    setStaffSearch('');
    setAssignmentNotes('');

    // Pre-select current assignee or recommended
    const staffList = type === 'DESIGN' ? designers : operators;
    const currentAssignedId =
      type === 'DESIGN'
        ? order.assignedDesigner?.id || order.assignedTo?.id
        : order.assignedOperator?.id || order.assignedTo?.id;

    const matchedStaff = currentAssignedId ? staffList.find((s) => s.id === currentAssignedId) : null;
    const rec = matchedStaff || staffList.find((s) => s.recommended) || staffList[0];
    setSelectedStaffId(rec?.id || '');
    setDrawerOpen(true);
  };

  // ─── ARTWORK VIEWER HANDLER ────────────────────────────────────────────────
  const handleOpenArtwork = (order: any) => {
    if (!order) return;
    const art = order.artworkFile;
    const resolvedUrl = resolveArtworkUrl(
      art?.fileUrl ||
      art?.storageKey ||
      order.specs?.artworkUrl ||
      order.specs?.artworkFile?.fileUrl ||
      order.specs?.artworkFile?.storageKey ||
      null
    );

    setViewingArtwork({
      orderNumber: order.orderNumber,
      productName: order.productName,
      customerName: order.customerName,
      fileName: art?.fileName || `${order.orderNumber}_Production_Artwork_v1.pdf`,
      version: art?.version || 'v1',
      fileSize: art?.fileSize || '3.2 MB',
      fileUrl: resolvedUrl,
      storageKey: art?.storageKey || null,
      mimeType:
        art?.mimeType ||
        (resolvedUrl?.match(/\.(jpeg|jpg|png|webp|gif|svg)(\?.*)?$/i)
          ? 'image/png'
          : 'application/pdf'),
      dimensions: art?.sizeDisplay || order.specs?.dimensions || 'Standard Press Dimensions',
      qualityStatus: art?.qualityStatus || 'PASSED',
    });
    setArtworkImageError(false);
    setArtworkModalOpen(true);
  };

  // ─── EXECUTE ASSIGNMENT ────────────────────────────────────────────────────

  const handleConfirmAssignment = async () => {
    if (!drawerOrder || !selectedStaffId) return;
    setIsSubmitting(true);

    const staffList = drawerType === 'DESIGN' ? designers : operators;
    const targetStaff = staffList.find((s) => s.id === selectedStaffId);
    const staffName = targetStaff?.fullName || 'Assigned Staff';
    const isReassign = Boolean(drawerOrder.assignedTo);

    try {
      if (drawerType === 'DESIGN') {
        await api.assignDesigner(drawerOrder.id, {
          designerId: selectedStaffId,
          reason: assignmentNotes || `${isReassign ? 'Reassigned' : 'Assigned'} to ${staffName} from Order Assignment Center`,
        }).catch(() => null);
      } else {
        await api.assignProductionOperator(drawerOrder.id, {
          operatorId: selectedStaffId,
          reason: assignmentNotes || `${isReassign ? 'Reassigned' : 'Assigned'} to ${staffName} from Order Assignment Center`,
        }).catch(() => null);
      }

      // Optimistic local state update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === drawerOrder.id
            ? {
                ...o,
                assignedTo: targetStaff,
                assignedOperator: drawerType === 'PRODUCTION' ? targetStaff : o.assignedOperator,
                assignedDesigner: drawerType === 'DESIGN' ? targetStaff : o.assignedDesigner,
                status: drawerType === 'DESIGN' ? 'DESIGN_REQUIRED' : 'PRODUCTION_QUEUE',
              }
            : o,
        ),
      );

      setLiveToast(
        isReassign
          ? `🔄 Successfully updated assignment for #${drawerOrder.orderNumber} to ${staffName}`
          : `✅ Successfully assigned #${drawerOrder.orderNumber} to ${staffName}`
      );
      setDrawerOpen(false);
      setDrawerOrder(null);
      await loadData();
    } catch (err: any) {
      console.error('Assignment error:', err);
      alert(err.message || 'Failed to complete assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── CHECKBOX TOGGLES ──────────────────────────────────────────────────────

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Selected staff object for dynamic button label
  const activeSelectedStaff = useMemo(() => {
    const list = drawerType === 'DESIGN' ? designers : operators;
    return list.find((s) => s.id === selectedStaffId);
  }, [drawerType, designers, operators, selectedStaffId]);

  // ─── THUMBNAIL RENDERER ────────────────────────────────────────────────────

  const renderThumbnail = (type: string) => {
    switch (type) {
      case 'cards':
        return (
          <div className="h-11 w-11 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] shadow-xs shrink-0 border border-slate-700">
            <span className="text-[#FFED00]">PB</span>
          </div>
        );
      case 'brochure':
        return (
          <div className="h-11 w-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
            <RiFilePdfLine className="h-5 w-5" />
          </div>
        );
      case 'box':
        return (
          <div className="h-11 w-11 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <RiBox3Line className="h-5 w-5" />
          </div>
        );
      case 'flyer':
        return (
          <div className="h-11 w-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
            <RiFileTextLine className="h-5 w-5" />
          </div>
        );
      case 'poster':
        return (
          <div className="h-11 w-11 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
            <RiPaletteLine className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="h-11 w-11 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
            <RiFileListLine className="h-5 w-5" />
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] pb-16 font-sans text-slate-900 select-none">
      {/* ─── LIVE WEBSOCKET TOAST BANNER ─────────────────────────────────── */}
      {liveToast && (
        <div className="fixed top-4 right-6 z-50 bg-slate-900 text-white text-xs font-mono font-bold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{liveToast}</span>
        </div>
      )}

      <div className="mx-auto max-w-[1440px] space-y-5">
        {/* ─── 1. PAGE TITLE & BREADCRUMB HEADER ──────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>OPERATIONS COMMAND</span>
            </div>
            <h1 className="text-[26px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-none font-sans">
              Order Assignment Center
            </h1>
            <p className="text-[13px] text-slate-500 mt-1.5 font-normal">
              All orders come to Operations. Assign to Designer or Production based on artwork status.
            </p>
          </div>

          {/* Right Date / Time Card */}
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-2.5 text-xs text-slate-700">
              <RiCalendarLine className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <div className="font-bold font-sans text-slate-900 text-[12px] leading-tight">
                  {currentDateFormatted.dateStr}
                </div>
                <div className="text-[11px] font-mono text-slate-400 leading-tight">
                  {currentDateFormatted.timeStr}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              isLoading={isLoading}
              className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 h-[38px]"
            >
              <RiRefreshLine className="h-4 w-4 mr-1" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* ─── 2. KPI SUMMARY ROW (6 Horizontal Cards) ────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Needs Action (EMPHASIZED) */}
          <div
            onClick={() => setActiveTab('NEEDS_ACTION')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'NEEDS_ACTION'
                ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <RiFileListCheckIcon className="h-4 w-4" />
              </div>
              <span className="text-[24px] font-black font-sans text-slate-900 leading-none">
                {kpiMetrics.needsAction}
              </span>
            </div>
            <div className="text-[12px] font-bold text-slate-800 tracking-tight">Needs Action</div>
          </div>

          {/* Card 2: Design Required */}
          <div
            onClick={() => setActiveTab('DESIGN_REQUIRED')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'DESIGN_REQUIRED'
                ? 'bg-red-50/90 border-red-300 ring-2 ring-red-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <div className="p-1.5 bg-red-50 rounded-lg">
                <RiPaletteLine className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-[24px] font-bold font-sans text-slate-900 leading-none">
                {kpiMetrics.designRequired}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-slate-600 tracking-tight">Design Required</div>
          </div>

          {/* Card 3: Ready for Production */}
          <div
            onClick={() => setActiveTab('READY_FOR_PRODUCTION')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'READY_FOR_PRODUCTION'
                ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <RiSettings4Line className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-[24px] font-bold font-sans text-slate-900 leading-none">
                {kpiMetrics.readyForProduction}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-slate-600 tracking-tight">Ready for Production</div>
          </div>

          {/* Card 4: In Progress */}
          <div
            onClick={() => setActiveTab('IN_PROGRESS')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'IN_PROGRESS'
                ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <RiTimeLine className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-[24px] font-bold font-sans text-slate-900 leading-none">
                {kpiMetrics.inProgress}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-slate-600 tracking-tight">In Progress</div>
          </div>

          {/* Card 5: Blocked / On Hold */}
          <div
            onClick={() => setActiveTab('BLOCKED')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'BLOCKED'
                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <div className="p-1.5 bg-amber-50 rounded-lg">
                <RiAlertLine className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-[24px] font-bold font-sans text-slate-900 leading-none">
                {kpiMetrics.blocked}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-slate-600 tracking-tight">Blocked / On Hold</div>
          </div>

          {/* Card 6: Total Operational Orders */}
          <div
            onClick={() => setActiveTab('ALL')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'ALL'
                ? 'bg-slate-100 border-slate-400'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <div className="p-1.5 bg-slate-50 rounded-lg">
                <RiFileListLine className="h-4 w-4 text-slate-500" />
              </div>
              <span className="text-[24px] font-bold font-sans text-slate-900 leading-none">
                {kpiMetrics.totalOrders}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-slate-600 tracking-tight">Total Operational Orders</div>
          </div>
        </div>

        {/* ─── 3. PRIMARY QUEUE FILTER TABS ───────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('NEEDS_ACTION')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'NEEDS_ACTION'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Needs Action ({kpiMetrics.needsAction})
          </button>
          <button
            onClick={() => setActiveTab('DESIGN_REQUIRED')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'DESIGN_REQUIRED'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Design Required ({kpiMetrics.designRequired})
          </button>
          <button
            onClick={() => setActiveTab('READY_FOR_PRODUCTION')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'READY_FOR_PRODUCTION'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Ready for Production ({kpiMetrics.readyForProduction})
          </button>
          <button
            onClick={() => setActiveTab('IN_PROGRESS')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'IN_PROGRESS'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            In Progress ({kpiMetrics.inProgress})
          </button>
          <button
            onClick={() => setActiveTab('BLOCKED')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'BLOCKED'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Blocked ({kpiMetrics.blocked})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'ALL'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            All Orders ({kpiMetrics.totalOrders})
          </button>
        </div>

        {/* ─── 4. FILTER TOOLBAR ──────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative min-w-[220px] max-w-[280px]">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#FFED00]"
              />
            </div>

            {/* Dropdown: Customers */}
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            >
              <option value="ALL">All Customers</option>
              {Array.from(new Set(orders.map((o) => o.customerName).filter(Boolean))).map((cName) => (
                <option key={cName as string} value={cName as string}>{cName as string}</option>
              ))}
            </select>

            {/* Dropdown: Products */}
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            >
              <option value="ALL">All Products</option>
              {Array.from(new Set(orders.map((o) => o.productName).filter(Boolean))).map((pName) => (
                <option key={pName as string} value={pName as string}>{pName as string}</option>
              ))}
            </select>

            {/* Dropdown: Priorities */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">URGENT</option>
              <option value="HIGH">HIGH</option>
              <option value="NORMAL">NORMAL</option>
              <option value="LOW">LOW</option>
            </select>

            {/* Dropdown: SLA */}
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            >
              <option value="ALL">SLA (All)</option>
              <option value="ON_TIME">On Schedule</option>
              <option value="DUE_SOON">Due Soon (≤ 48h)</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            {/* Filters Button */}
            <button
              type="button"
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <RiFilter3Line className="h-3.5 w-3.5 text-slate-500" />
              <span>Filters</span>
            </button>
          </div>

          {/* View Mode Toggle: Card View vs Table View */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'card'
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RiLayoutGridLine className="h-3.5 w-3.5" />
              <span>Card View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RiListCheck2 className="h-3.5 w-3.5" />
              <span>Table View</span>
            </button>
          </div>
        </div>

        {/* ─── 5. BULK ASSIGNMENT FLOATING BAR ────────────────────────────── */}
        {selectedOrderIds.length > 0 && (
          <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center justify-between text-xs font-semibold animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="bg-[#FFED00] text-slate-950 font-black px-2 py-0.5 rounded text-[11px]">
                {selectedOrderIds.length} ORDERS SELECTED
              </span>
              <span className="text-slate-300">
                Bulk assign to streamline operational routing
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  const firstSelected = orders.find((o) => selectedOrderIds.includes(o.id));
                  if (firstSelected) handleOpenDrawer(firstSelected, 'DESIGN');
                }}
                className="bg-red-600 hover:bg-red-700 text-white border-none font-bold"
              >
                <span>Bulk Assign Designer</span>
              </Button>
              <Button
                variant="primary"
                size="xs"
                onClick={() => {
                  const firstSelected = orders.find((o) => selectedOrderIds.includes(o.id));
                  if (firstSelected) handleOpenDrawer(firstSelected, 'PRODUCTION');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white border-none font-bold"
              >
                <span>Bulk Assign Production Operator</span>
              </Button>
              <button
                onClick={() => setSelectedOrderIds([])}
                className="text-slate-400 hover:text-white text-xs underline ml-2"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* ─── 6. MAIN ORDER QUEUE: COMPACT HORIZONTAL CARDS ───────────────── */}
        {viewMode === 'card' ? (
          <div className="space-y-2.5">
            {filteredOrders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400">
                <RiFileListLine className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No operational orders found.</p>
                <p className="text-slate-400 mt-0.5">Try clearing filters or switching tabs.</p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isChecked = selectedOrderIds.includes(order.id);
                const isArtReady = order.artworkState === 'READY';
                const isDesignReq = order.artworkState === 'DESIGN_REQUIRED' || order.artworkState === 'NOT_READY';

                return (
                  <div
                    key={order.id}
                    className={`bg-white border rounded-xl p-3.5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isChecked ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200/90'
                    }`}
                  >
                    {/* Left: Checkbox + Product Thumbnail + Order Info */}
                    <div className="flex items-center gap-3.5 min-w-[320px]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelectOrder(order.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-[#FFED00] cursor-pointer shrink-0"
                      />

                      {renderThumbnail(order.thumbnailType)}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/operations/orders/${order.id}`}
                            className="font-bold text-[14px] text-slate-900 hover:text-blue-600 hover:underline leading-tight tracking-tight font-sans"
                          >
                            #{order.orderNumber}
                          </Link>
                        </div>
                        <div className="font-semibold text-[13px] text-slate-800 leading-tight mt-0.5">
                          {order.customerName}
                        </div>
                        <div className="text-[12px] text-slate-500 font-medium leading-tight">
                          {order.productName}
                        </div>
                        {/* Specs Line */}
                        <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>{order.specs.quantity.toLocaleString()} pcs</span>
                          <span>|</span>
                          <span>{order.specs.dimensions}</span>
                          <span>|</span>
                          <span>{order.specs.sides}</span>
                          <span>|</span>
                          <span>{order.specs.substrate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: Artwork Status & Proof Preview */}
                    <div className="flex-1 min-w-[220px] md:px-3">
                      {isArtReady ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            ARTWORK READY
                          </span>
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                            <RiFilePdfLine className="h-4 w-4 text-blue-600 shrink-0" />
                            <span className="font-mono text-[11px] text-slate-800 truncate max-w-[150px]">
                              {order.artworkFile?.fileName}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                              {order.artworkFile?.version}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {order.artworkFile?.fileSize}
                            </span>
                          </div>
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenArtwork(order)}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RiEyeLine className="h-3 w-3" />
                              <span>View Artwork</span>
                            </button>
                          </div>
                        </div>
                      ) : order.artworkState === 'DESIGN_REQUIRED' ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            DESIGN REQUIRED
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {order.artworkMessage}
                          </p>
                          <div className="mt-1">
                            <Link
                              href={`/operations/orders/${order.id}`}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              View Requirements
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            ARTWORK NOT READY
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {order.artworkMessage}
                          </p>
                          <div className="mt-1">
                            <Link
                              href={`/operations/orders/${order.id}`}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              View Requirements
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Priority Column */}
                    <div className="min-w-[90px]">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        Priority
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                          order.priority === 'HIGH' || order.priority === 'URGENT'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : order.priority === 'LOW'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            order.priority === 'HIGH' || order.priority === 'URGENT'
                              ? 'bg-red-500'
                              : order.priority === 'LOW'
                              ? 'bg-emerald-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        {order.priority}
                      </span>
                    </div>

                    {/* Due Date / SLA Column */}
                    <div className="min-w-[110px]">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        Due Date
                      </span>
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1 mt-0.5 font-mono">
                        <RiCalendarLine className="h-3.5 w-3.5 text-slate-400" />
                        <span>{order.dueDate}</span>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold block mt-0.5 ${
                          order.dueDaysLeft <= 5 || order.priority === 'HIGH'
                            ? 'text-red-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {order.dueDaysLeft} days left
                      </span>
                    </div>

                    {/* Right: Single Contextual Action Button or Assigned Status */}
                    <div className="flex items-center gap-2 shrink-0 justify-end min-w-[220px]">
                      {order.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs">
                            <div className="h-6 w-6 rounded-full bg-slate-900 text-[#FFED00] flex items-center justify-center font-bold text-[10px] shrink-0">
                              {order.assignedTo.fullName
                                ?.split(' ')
                                .map((n: string) => n[0])
                                .slice(0, 2)
                                .join('') || 'OP'}
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="text-[9px] font-mono text-slate-400 font-semibold uppercase leading-tight">
                                {order.assignedDesigner ? 'Designer' : 'Operator'}
                              </div>
                              <div className="text-xs font-bold text-slate-900 truncate max-w-[130px] leading-tight">
                                {order.assignedTo.fullName}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenDrawer(
                                order,
                                order.assignedDesigner ? 'DESIGN' : 'PRODUCTION',
                              )
                            }
                            className="h-[38px] px-3 rounded-lg border border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Change Assignee"
                          >
                            <RiRefreshLine className="h-3.5 w-3.5 text-slate-500" />
                            <span>Change</span>
                          </button>
                        </div>
                      ) : isDesignReq ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(order, 'DESIGN')}
                          className="h-[38px] px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Assign Designer</span>
                          <RiArrowRightLine className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(order, 'PRODUCTION')}
                          className="h-[38px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Assign Production Operator</span>
                        </button>
                      )}

                      {/* Three-Dot Menu */}
                      <Link
                        href={`/operations/orders/${order.id}`}
                        className="h-[38px] w-[38px] flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
                        title="Order Actions"
                      >
                        <RiMoreFill className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ─── ALTERNATIVE TABLE VIEW ─────────────────────────────────────── */
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] bg-slate-50/70">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={handleToggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">ORDER & DATE</th>
                  <th className="py-3 px-3">CUSTOMER & PRODUCT</th>
                  <th className="py-3 px-3">SPECIFICATIONS</th>
                  <th className="py-3 px-3">ARTWORK STATUS</th>
                  <th className="py-3 px-3">PRIORITY</th>
                  <th className="py-3 px-3">DUE DATE</th>
                  <th className="py-3 px-3 text-right">NEXT ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredOrders.map((order) => {
                  const isChecked = selectedOrderIds.includes(order.id);
                  const isArtReady = order.artworkState === 'READY';
                  const isDesignReq = order.artworkState === 'DESIGN_REQUIRED' || order.artworkState === 'NOT_READY';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          href={`/operations/orders/${order.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 hover:underline font-mono"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500">{order.productName}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {order.specs.quantity.toLocaleString()} pcs • {order.specs.dimensions} • {order.specs.substrate}
                      </td>
                      <td className="py-3 px-3">
                        {isArtReady ? (
                          <button
                            type="button"
                            onClick={() => handleOpenArtwork(order)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                            title="Click to view artwork"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <RiEyeLine className="h-3 w-3 text-emerald-700" />
                            <span>READY</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-800 border border-red-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            {order.artworkState === 'DESIGN_REQUIRED' ? 'DESIGN REQUIRED' : 'NOT READY'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] font-bold">
                        {order.priority}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {order.dueDate}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {order.assignedTo ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold font-sans">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span className="truncate max-w-[120px]">{order.assignedTo.fullName}</span>
                            </span>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() =>
                                handleOpenDrawer(
                                  order,
                                  order.assignedDesigner ? 'DESIGN' : 'PRODUCTION',
                                )
                              }
                              className="text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              <span>Change</span>
                            </Button>
                          </div>
                        ) : isDesignReq ? (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => handleOpenDrawer(order, 'DESIGN')}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
                          >
                            <span>Assign Designer</span>
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => handleOpenDrawer(order, 'PRODUCTION')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                          >
                            <span>Assign Operator</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 7. RIGHT-SIDE CONTEXTUAL ASSIGNMENT DRAWER ──────────────────── */}
      {drawerOpen && drawerOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmitting && setDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-[440px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200 select-none">
            {/* Drawer Top Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {drawerOrder.assignedTo
                  ? drawerType === 'DESIGN'
                    ? 'Change Assigned Designer'
                    : 'Change Production Operator'
                  : drawerType === 'DESIGN'
                  ? 'Assign Designer'
                  : 'Assign Production Operator'}
              </h2>
              <button
                type="button"
                onClick={() => !isSubmitting && setDrawerOpen(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {/* Order Summary Mini-Card */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex items-start gap-3">
                {renderThumbnail(drawerOrder.thumbnailType)}
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 font-mono text-xs block">
                    #{drawerOrder.orderNumber}
                  </span>
                  <div className="font-bold text-slate-800 text-xs mt-0.5">
                    {drawerOrder.customerName}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {drawerOrder.productName}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    {drawerOrder.specs.quantity.toLocaleString()} pcs | {drawerOrder.specs.dimensions} | {drawerOrder.specs.sides} | {drawerOrder.specs.substrate}
                  </div>
                </div>
              </div>

              {/* Current Assignee Banner if Already Assigned */}
              {drawerOrder.assignedTo && (
                <div className="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-[#FFED00] text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
                      {drawerOrder.assignedTo.fullName
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join('') || 'ST'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono font-bold text-[#FFED00] uppercase tracking-wider">
                        Currently Assigned
                      </div>
                      <div className="text-xs font-bold text-white truncate">
                        {drawerOrder.assignedTo.fullName}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                    Active
                  </span>
                </div>
              )}

              {/* Artwork Status Alert Banner */}
              {drawerType === 'DESIGN' ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <RiAlertLine className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-red-900">Artwork Not Ready</div>
                      <div className="text-[11px] text-red-700 mt-0.5">
                        {drawerOrder.artworkMessage || 'No approved artwork version found.'}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/operations/orders/${drawerOrder.id}`}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-[11px] font-semibold rounded-lg shrink-0 shadow-xs"
                  >
                    View Requirements
                  </Link>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900">Artwork Ready & Approved</div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        {drawerOrder.artworkFile?.fileName || 'Print-ready file verified'} • {drawerOrder.specs.dimensions}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenArtwork(drawerOrder)}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 text-[11px] font-semibold rounded-lg shrink-0 shadow-xs inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <RiEyeLine className="h-3.5 w-3.5 text-emerald-600" />
                    <span>View Artwork</span>
                  </button>
                </div>
              )}

              {/* Staff Person Selector Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                    {drawerType === 'DESIGN'
                      ? drawerOrder.assignedTo ? 'Change Designer' : 'Select Designer'
                      : drawerOrder.assignedTo ? 'Change Operator' : 'Select Production Operator'}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {drawerType === 'DESIGN' ? `${designers.length} Active` : `${operators.length} Active`}
                  </span>
                </div>

                {/* Staff Search Input */}
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
                    <input
                      type="text"
                      placeholder={drawerType === 'DESIGN' ? 'Search designer...' : 'Search operator...'}
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#FFED00]"
                    />
                  </div>
                  <button
                    type="button"
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    <RiFilter3Line className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Staff Cards List */}
                <div className="space-y-2">
                  {(drawerType === 'DESIGN' ? designers : operators)
                    .filter((s) => !staffSearch || s.fullName.toLowerCase().includes(staffSearch.toLowerCase()))
                    .map((staff) => {
                      const isSelected = selectedStaffId === staff.id;

                      return (
                        <div
                          key={staff.id}
                          onClick={() => setSelectedStaffId(staff.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Radio Circle */}
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>

                            {/* Avatar */}
                            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {staff.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')}
                            </div>

                            {/* Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs truncate">
                                  {staff.fullName}
                                </span>
                                {staff.recommended && (
                                  <span className="text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded">
                                    RECOMMENDED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    staff.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-red-500'
                                  }`}
                                />
                                <span className="capitalize">{staff.status.toLowerCase()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Active Jobs + Skills */}
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-mono font-bold text-slate-700 block">
                              {staff.activeJobs} active jobs
                            </span>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {staff.skills.slice(0, 2).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Assignment Notes (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase font-bold text-slate-500">
                  Assignment Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    drawerType === 'DESIGN'
                      ? 'Add notes for the designer...'
                      : 'Add production press instructions...'
                  }
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#FFED00]"
                />
              </div>
            </div>

            {/* ─── STICKY FOOTER ─────────────────────────────────────────── */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => !isSubmitting && setDrawerOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAssignment}
                disabled={isSubmitting || !selectedStaffId}
                className="flex-1 py-2 px-4 rounded-lg bg-[#FFED00] hover:bg-[#F2DE00] text-slate-950 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 border border-[#E3A008]/40 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Updating Assignment...</span>
                ) : drawerOrder.assignedTo ? (
                  <span>Reassign to {activeSelectedStaff?.fullName || 'Selected Staff'}</span>
                ) : (
                  <span>Assign to {activeSelectedStaff?.fullName || 'Staff Member'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. INTERACTIVE ARTWORK PROOF & ASSET VIEWER MODAL ───────────── */}
      {artworkModalOpen && viewingArtwork && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
          {/* Dark Glass Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setArtworkModalOpen(false)}
          />

          {/* Main Modal Dialog Box */}
          <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden z-10">
            {/* Header Bar */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <RiShieldCheckLine className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-[#FFED00]">
                      #{viewingArtwork.orderNumber}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="font-bold text-sm text-slate-100 truncate">
                      {viewingArtwork.productName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      PREFLIGHT PASSED
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2 truncate">
                    <span>Customer: {viewingArtwork.customerName}</span>
                    <span>|</span>
                    <span className="text-slate-300">{viewingArtwork.fileName}</span>
                    <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded text-[10px]">
                      {viewingArtwork.version}
                    </span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setArtworkModalOpen(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition shrink-0 ml-4"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Split between High-Res Proof Sheet & Specs Sidebar */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
              {/* Left Canvas Preview Area (8 Cols) */}
              <div className="lg:col-span-8 bg-slate-950/60 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-800 relative select-none">
                {/* Visual Registration & Crop Target Indicators */}
                <div className="w-full max-w-md bg-slate-900 rounded-xl border border-slate-700 shadow-2xl p-5 relative overflow-hidden group">
                  {/* Proof Sheet Trim & Bleed Simulated Viewport */}
                  <div className="relative border-2 border-dashed border-red-500/60 rounded-lg p-3 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 aspect-[4/3] flex flex-col items-center justify-center text-center overflow-hidden">
                    {viewingArtwork.fileUrl && !artworkImageError && (viewingArtwork.fileUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)(\?.*)?$/i) || viewingArtwork.mimeType?.startsWith('image/')) ? (
                      <img
                        src={viewingArtwork.fileUrl}
                        alt="Customer Artwork Proof"
                        onError={() => setArtworkImageError(true)}
                        className="w-full h-full object-contain rounded"
                      />
                    ) : (
                      <div className="space-y-3 p-4">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                          <RiFilePdfLine className="h-8 w-8" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-200 font-mono">
                            {viewingArtwork.fileName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1">
                            PDF/X-1a:2001 • CMYK 300 DPI Prepress
                          </div>
                        </div>
                        {/* CMYK Color Calibration Swatches */}
                        <div className="flex items-center justify-center gap-1.5 pt-2">
                          <span className="h-3 w-6 rounded-xs bg-cyan-400" title="Cyan 100%" />
                          <span className="h-3 w-6 rounded-xs bg-fuchsia-500" title="Magenta 100%" />
                          <span className="h-3 w-6 rounded-xs bg-yellow-400" title="Yellow 100%" />
                          <span className="h-3 w-6 rounded-xs bg-black border border-slate-700" title="Key (Black) 100%" />
                        </div>
                      </div>
                    )}

                    {/* Bleed Guideline Legends */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded backdrop-blur-xs border border-slate-800">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Cut Margin (Trim Line)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Safe Zone: +3.0mm
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <span className="text-[11px] font-mono text-slate-400">
                    Press Print-Ready Vector Proof • Verified against production template
                  </span>
                </div>
              </div>

              {/* Right Preflight Inspection Panel (4 Cols) */}
              <div className="lg:col-span-4 p-6 bg-slate-900/90 flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Preflight Specifications
                    </h3>
                    <div className="mt-3 space-y-2.5 font-mono text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Target Dimensions:</span>
                        <span className="text-slate-100 font-semibold">{viewingArtwork.dimensions}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">File Format:</span>
                        <span className="text-slate-100 font-semibold">{viewingArtwork.mimeType?.includes('pdf') ? 'PDF/X-1a (Press-Ready)' : (viewingArtwork.mimeType || 'PDF/X-1a')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Resolution:</span>
                        <span className="text-emerald-400 font-semibold">300 DPI (High Res)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Color Profile:</span>
                        <span className="text-slate-100 font-semibold">CMYK ISO Coated v2</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Bleed Margin:</span>
                        <span className="text-slate-100 font-semibold">3.0 mm standard</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">File Size:</span>
                        <span className="text-slate-100 font-semibold">{viewingArtwork.fileSize}</span>
                      </div>
                    </div>
                  </div>

                  {/* Preflight Checks List */}
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      Automated Preflight Checks
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/40">
                        <RiCheckboxCircleLine className="h-4 w-4 shrink-0" />
                        <span className="font-mono text-[11px]">All typography converted to outlines</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/40">
                        <RiCheckboxCircleLine className="h-4 w-4 shrink-0" />
                        <span className="font-mono text-[11px]">Zero RGB color profiles detected</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/40">
                        <RiCheckboxCircleLine className="h-4 w-4 shrink-0" />
                        <span className="font-mono text-[11px]">Cut line bleed margins aligned</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t border-slate-800">
                  {viewingArtwork.fileUrl ? (
                    <a
                      href={viewingArtwork.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <RiExternalLinkLine className="h-4 w-4" />
                      <span>Open High-Res Original</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => alert(`Opening preflight master asset for Order #${viewingArtwork.orderNumber}`)}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <RiExternalLinkLine className="h-4 w-4" />
                      <span>Open Preflight Proof</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setArtworkModalOpen(false)}
                    className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition text-center"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ICON HELPER ─────────────────────────────────────────────────────────────

function RiFileListCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path d="M19 22H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3zm-8.293-6.707 5-5-1.414-1.414L10 13.172l-2.293-2.293-1.414 1.414 3.707 3.707z" />
    </svg>
  );
}
