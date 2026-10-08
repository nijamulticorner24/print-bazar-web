import { IconType } from 'react-icons';
import {
  RiDashboard3Line,
  RiShoppingBag3Line,
  RiPrinterLine,
  RiFileCheckLine,
  RiCheckboxCircleLine,
  RiBox3Line,
  RiTruckLine,
  RiBuilding4Line,
  RiPriceTag3Line,
  RiExchangeDollarLine,
  RiShieldUserLine,
  RiSettings4Line,
  RiArchiveDrawerLine,
  RiFoldersLine,
  RiStackLine,
  RiStore2Line,
  RiPulseLine,
  RiListCheck2,
} from 'react-icons/ri';

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: IconType;
  requiredPermissions: string[];
  matchMode?: 'all' | 'any';
  section: string;
  order: number;
  badge?: string;
  badgeVariant?: 'yellow' | 'emerald' | 'blue' | 'zinc' | 'amber';
  description?: string;
}

export interface AdminNavSection {
  id: string;
  title: string;
  order: number;
  items: AdminNavItem[];
}

export const CANONICAL_ADMIN_NAV: AdminNavItem[] = [
  // SECTION: OVERVIEW & INTELLIGENCE
  {
    id: 'dashboard',
    label: 'Overview Dashboard',
    href: '/admin/dashboard',
    icon: RiDashboard3Line,
    requiredPermissions: ['overview.read'],
    matchMode: 'all',
    section: 'MANAGEMENT_INTELLIGENCE',
    order: 10,
    badge: 'LIVE',
    badgeVariant: 'yellow',
    description: 'Executive plant telemetry & order velocities',
  },

  // SECTION: OPERATIONS COORDINATION (OE)
  {
    id: 'operations-dashboard',
    label: 'Operations Command',
    href: '/operations',
    icon: RiPulseLine,
    requiredPermissions: ['operations.read'],
    matchMode: 'all',
    section: 'OPERATIONS_COORDINATION',
    order: 12,
    badge: 'OE',
    badgeVariant: 'yellow',
    description: 'Central operational order intake & department coordination',
  },
  {
    id: 'operations-orders',
    label: 'Operational Orders',
    href: '/operations/orders',
    icon: RiListCheck2,
    requiredPermissions: ['operations.read'],
    matchMode: 'all',
    section: 'OPERATIONS_COORDINATION',
    order: 13,
    description: 'Live order queue, assignment status & blocker engine',
  },

  // SECTION: CATALOGUE & INVENTORY (ADMIN-CONTROLLED)
  {
    id: 'products',
    label: 'Products & Field Builder',
    href: '/admin/products',
    icon: RiArchiveDrawerLine,
    requiredPermissions: ['orders.read', 'production.read'],
    matchMode: 'any',
    section: 'CATALOGUE_INVENTORY',
    order: 15,
    badge: 'BUILDER',
    badgeVariant: 'yellow',
    description: 'Dynamic products, custom fields & media manager',
  },
  {
    id: 'categories',
    label: 'Categories & Taxonomies',
    href: '/admin/categories',
    icon: RiFoldersLine,
    requiredPermissions: ['orders.read', 'production.read'],
    matchMode: 'any',
    section: 'CATALOGUE_INVENTORY',
    order: 16,
    description: 'Storefront categories & ordering',
  },
  {
    id: 'inventory',
    label: 'Materials & Substrates',
    href: '/production/inventory',
    icon: RiStackLine,
    requiredPermissions: ['production.read', 'orders.read'],
    matchMode: 'any',
    section: 'CATALOGUE_INVENTORY',
    order: 17,
    badgeVariant: 'amber',
    description: 'Raw paper, greyboard, films & stock movements',
  },

  // SECTION: CORE OPERATIONS
  {
    id: 'orders',
    label: 'Orders Master Queue',
    href: '/sales/orders',
    icon: RiShoppingBag3Line,
    requiredPermissions: ['orders.read'],
    matchMode: 'all',
    section: 'CORE_OPERATIONS',
    order: 20,
    badgeVariant: 'blue',
    description: 'Central customer order stream & status tracker',
  },
  {
    id: 'walk-in-orders',
    label: 'Walk-in POS Orders',
    href: '/sales/walk-in',
    icon: RiStore2Line,
    requiredPermissions: ['orders.read'],
    matchMode: 'all',
    section: 'CORE_OPERATIONS',
    order: 21,
    badge: 'POS',
    badgeVariant: 'amber',
    description: 'Direct sales counter & phone order creation desk',
  },
  {
    id: 'production',
    label: 'Production & Job Cards',
    href: '/production/queue',
    icon: RiPrinterLine,
    requiredPermissions: ['production.read'],
    matchMode: 'all',
    section: 'CORE_OPERATIONS',
    order: 30,
    badgeVariant: 'amber',
    description: 'Press scheduling, RIP engines & machine routing',
  },

  // SECTION: QUALITY & PREPRESS GATES
  {
    id: 'artwork',
    label: 'Artwork & Prepress',
    href: '/prepress/artwork',
    icon: RiFileCheckLine,
    requiredPermissions: ['artwork.read'],
    matchMode: 'all',
    section: 'QUALITY_GATES',
    order: 40,
    description: 'Pre-flight file verification & proof approvals',
  },
  {
    id: 'qc',
    label: 'QC Release & Inspection',
    href: '/qc/inspection',
    icon: RiCheckboxCircleLine,
    requiredPermissions: ['qc.preproduction.read', 'qc.final.read'],
    matchMode: 'any',
    section: 'QUALITY_GATES',
    order: 50,
    badgeVariant: 'emerald',
    description: 'Tolerance gates, bleed audits & batch sign-off',
  },

  // SECTION: FULFILLMENT & DISPATCH
  {
    id: 'packing',
    label: 'Packing & Parcel Station',
    href: '/packing/station',
    icon: RiBox3Line,
    requiredPermissions: ['packing.read'],
    matchMode: 'all',
    section: 'FULFILLMENT',
    order: 60,
    description: 'Carton labeling, barcode scanning & bundling',
  },
  {
    id: 'dispatch',
    label: 'Dispatch & Courier Manifest',
    href: '/dispatch/manifest',
    icon: RiTruckLine,
    requiredPermissions: ['dispatch.read'],
    matchMode: 'all',
    section: 'FULFILLMENT',
    order: 70,
    description: 'Waybills, carrier integrations & logistics',
  },

  // SECTION: COMMERCIAL & FINANCE
  {
    id: 'customers',
    label: 'Corporate Customers',
    href: '/sales/customers',
    icon: RiBuilding4Line,
    requiredPermissions: ['customers.read'],
    matchMode: 'all',
    section: 'COMMERCIAL',
    order: 80,
    badge: 'B2B',
    badgeVariant: 'zinc',
    description: 'B2B client directories & custom SLAs',
  },
  {
    id: 'pricing',
    label: 'Pricing & Substrates',
    href: '/sales/pricing',
    icon: RiPriceTag3Line,
    requiredPermissions: ['pricing.read'],
    matchMode: 'all',
    section: 'COMMERCIAL',
    order: 90,
    description: 'Substrate GSM tables, slabs & cost formulas',
  },
  {
    id: 'finance',
    label: 'Payments & Invoices',
    href: '/finance/payments',
    icon: RiExchangeDollarLine,
    requiredPermissions: ['finance.read'],
    matchMode: 'all',
    section: 'COMMERCIAL',
    order: 100,
    description: 'Tax ledgers, GST filings & payment gateway sync',
  },

  // SECTION: SYSTEM & STAFF GOVERNANCE
  {
    id: 'staff',
    label: 'Staff & Shift RBAC',
    href: '/admin/staff',
    icon: RiShieldUserLine,
    requiredPermissions: ['staff.read'],
    matchMode: 'all',
    section: 'GOVERNANCE',
    order: 110,
    description: 'Operator permissions, shift rotas & access audit',
  },
  {
    id: 'settings',
    label: 'Factory Plant Settings',
    href: '/admin/settings',
    icon: RiSettings4Line,
    requiredPermissions: ['settings.read'],
    matchMode: 'all',
    section: 'GOVERNANCE',
    order: 120,
    description: 'Machine calibrations & environmental profiles',
  },
];

export const SECTION_METADATA: Record<string, { title: string; order: number }> = {
  MANAGEMENT_INTELLIGENCE: { title: 'EXECUTIVE INTELLIGENCE', order: 1 },
  OPERATIONS_COORDINATION: { title: 'OPERATIONAL COMMAND (OE)', order: 2 },
  CATALOGUE_INVENTORY: { title: 'CATALOGUE & INVENTORY', order: 3 },
  CORE_OPERATIONS: { title: 'SHOP-FLOOR OPERATIONS', order: 4 },
  QUALITY_GATES: { title: 'PREPRESS & QUALITY GATES', order: 5 },
  FULFILLMENT: { title: 'PACKING & DISPATCH', order: 6 },
  COMMERCIAL: { title: 'COMMERCIAL & LEDGER', order: 7 },
  GOVERNANCE: { title: 'PLANT GOVERNANCE & ROLES', order: 8 },
};

/**
 * Validates if the user's permissions grant access to a specific nav item
 */
export function isNavItemAuthorized(item: AdminNavItem, userPermissions: string[]): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  if (item.matchMode === 'any') {
    return item.requiredPermissions.some((perm) => userPermissions.includes(perm));
  }

  // Default: must satisfy all required permissions
  return item.requiredPermissions.every((perm) => userPermissions.includes(perm));
}

/**
 * Centralized, permission-aware navigation builder.
 * Filters canonical navigation against backend permissions and eliminates empty sections.
 */
export function getVisibleAdminNavigation(userPermissions: string[]): AdminNavSection[] {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return [];
  }

  // 1. Filter authorized items
  const authorizedItems = CANONICAL_ADMIN_NAV.filter((item) =>
    isNavItemAuthorized(item, userPermissions)
  );

  // 2. Group by section
  const sectionMap = new Map<string, AdminNavItem[]>();

  for (const item of authorizedItems) {
    const existing = sectionMap.get(item.section) || [];
    existing.push(item);
    sectionMap.set(item.section, existing);
  }

  // 3. Build ordered section list, discarding empty sections
  const resultSections: AdminNavSection[] = [];

  for (const [sectionKey, items] of sectionMap.entries()) {
    if (items.length === 0) continue;

    const meta = SECTION_METADATA[sectionKey] || { title: sectionKey, order: 99 };
    items.sort((a, b) => a.order - b.order);

    resultSections.push({
      id: sectionKey,
      title: meta.title,
      order: meta.order,
      items,
    });
  }

  resultSections.sort((a, b) => a.order - b.order);
  return resultSections;
}

/**
 * Route protection helper: checks if the current URL pathname is authorized
 * for the user based on their permissions.
 */
export function checkRouteAuthorization(
  pathname: string,
  userPermissions: string[]
): { isAuthorized: boolean; requiredPermissions: string[] } {
  const matchingItem = [...CANONICAL_ADMIN_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (!matchingItem) {
    return { isAuthorized: true, requiredPermissions: [] };
  }

  const authorized = isNavItemAuthorized(matchingItem, userPermissions);
  return {
    isAuthorized: authorized,
    requiredPermissions: matchingItem.requiredPermissions,
  };
}
