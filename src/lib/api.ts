export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role:
    | 'CUSTOMER'
    | 'SALES_OFFICE'
    | 'DESIGNER_PREPRESS'
    | 'PRODUCTION_OPERATOR'
    | 'FINAL_QC_INSPECTOR'
    | 'PACKING_OPERATOR'
    | 'DISPATCH_LOGISTICS'
    | 'ACCOUNTS'
    | 'OPERATIONAL_MANAGER'
    | 'ADMIN_MANAGER';
  department?: string | null;
  customerId?: string | null;
  permissions: string[];
}

export interface LoginResponse {
  user: AuthenticatedUser;
  accessToken: string;
}

export interface KanbanCardDto {
  id: string;
  jobNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerCompany?: string;
  productName: string;
  quantity: number;
  specifications: {
    paperGsm?: string;
    finish?: string;
    printMode?: string;
    dimensions?: string;
    sides?: string;
    raw?: Record<string, unknown>;
  };
  machine?: {
    id: string;
    name: string;
    code: string;
    type: string;
  } | null;
  operator?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  status: string;
  orderStatus: string;
  currentStation: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  dueAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  slaStatus: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE';
  slaBadgeText: string;
  timeInfo: {
    label: string;
    text: string;
  };
  allowedTransitions: string[];
  allowedActions: string[];
  holdReason?: string;
  isHeld: boolean;
  version: number;
  artwork?: {
    id: string;
    storageKey: string;
    fileUrl: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    status: string;
    isApproved: boolean;
    proofUrl?: string | null;
  } | null;
}

export interface KanbanColumnDto {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  type: 'SYSTEM' | 'CUSTOM' | 'HOLD' | 'ARCHIVED';
  sortOrder: number;
  color?: string | null;
  mappedStatus?: string | null;
  mappedStation?: string | null;
  cards: KanbanCardDto[];
  cardCount: number;
}

export interface ProductionBoardResponseDto {
  columns: KanbanColumnDto[];
  metrics: {
    activeJobs: number;
    printing: number;
    finishing: number;
    finalQc: number;
    packing: number;
    readyForDispatch: number;
    dispatched: number;
    onHold: number;
  };
  shiftInfo: {
    shiftName: string;
    liveStatus: string;
    activePressCount: number;
    operatorCount: number;
  };
  availableMachines: Array<{ id: string; name: string; code: string; type: string }>;
  availableOperators: Array<{ id: string; fullName: string; role: string; department?: string }>;
}

export interface DynamicFieldOption {
  id: string;
  fieldId: string;
  label: string;
  value: string;
  priceModifierType: string;
  priceModifier: number | string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface DynamicField {
  id: string;
  productId: string;
  label: string;
  key: string;
  type:
    | 'TEXT'
    | 'TEXTAREA'
    | 'NUMBER'
    | 'EMAIL'
    | 'PHONE'
    | 'DATE'
    | 'TIME'
    | 'SELECT'
    | 'MULTI_SELECT'
    | 'RADIO'
    | 'CHECKBOX'
    | 'TOGGLE'
    | 'FILE'
    | 'IMAGE'
    | 'COLOR'
    | 'RANGE';
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  isRequired: boolean;
  isCustomerVisible: boolean;
  isCustomerEditable: boolean;
  sortOrder: number;
  validationRules?: Record<string, any>;
  conditionalLogic?: {
    dependsOnFieldKey: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'GREATER_THAN' | 'LESS_THAN';
    value: any;
  };
  options: DynamicFieldOption[];
}

export interface ProductImageItem {
  id: string;
  productId: string;
  url: string;
  storageKey?: string;
  altText?: string;
  caption?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  children?: ProductCategoryItem[];
  _count?: { products: number; children?: number };
}

export type ProductOptionRequirement = 'REQUIRED' | 'OPTIONAL' | 'DISABLED';

export interface PricingRule {
  id: string;
  productId: string;
  minQty: number;
  maxQty: number;
  unitPrice: number;
  discountPercent?: number;
  label?: string;
  attributeCombination?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePricingRuleDto {
  minQty: number;
  maxQty?: number | null;
  discountPercent?: number | null;
  unitPrice?: number | null;
  label?: string | null;
  attributeCombination?: Record<string, any> | null;
}

export interface DynamicProduct {
  id: string;
  categoryId: string;
  category?: ProductCategoryItem;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  pricingModel: string;
  basePrice: number | string;
  minQuantity: number;
  quantityStep?: number | null;
  maxQuantity: number;
  productionDays: number;
  sortOrder: number;
  isFeatured: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  trackInventory: boolean;
  stockQuantity: number;
  lowStockAlert: number;
  defaultSize?: string | null;
  // Fulfillment & Payment Surcharges (Admin-Controlled)
  courierCharge?: number | string | null;
  freeShippingThreshold?: number | string | null;
  allowCod?: boolean;
  codSurcharge?: number | string | null;
  // Dynamic Product Flow Engine Configuration (Admin-Controlled)
  artworkRequirement?: ProductOptionRequirement;
  artworkPrice?: number | string | null;
  artworkQualityVerification?: boolean;
  minimumArtworkMegapixels?: number | null;
  referenceImageRequirement?: ProductOptionRequirement;
  designServiceRequirement?: ProductOptionRequirement;
  designServicePrice?: number | string | null;
  images: ProductImageItem[];
  fields: DynamicField[];
  pricingMatrices?: PricingRule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDto {
  id: string;
  name: string;
  sku: string;
  category: 'SUBSTRATE' | 'BOARD' | 'FABRIC' | 'VINYL' | 'INK_CONSUMABLE' | 'PACKAGING' | 'FINISHED_GOODS';
  unit: string;
  currentStock: number | string;
  reservedStock: number | string;
  minStockThreshold: number | string;
  costPerUnit: number | string;
  location?: string;
  notes?: string;
  isActive: boolean;
  movements?: any[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function resolveImageUrl(url?: string | null): string {
  if (!url) return 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiHost = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace('/api/v1', '');
  return `${apiHost}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('pb2_token') : null;

  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || errJson.message || errorDetail;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Authentication
  login: (data: { identifier: string; password: string }): Promise<LoginResponse> =>
    fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: { email: string; password: string; fullName: string; phone?: string }): Promise<LoginResponse> =>
    fetchApi<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: (): Promise<{ success: boolean; message: string }> =>
    fetchApi<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    }),

  getCurrentUser: (): Promise<AuthenticatedUser> =>
    fetchApi<AuthenticatedUser>('/auth/me'),

  // Orders API (Customer & ERP)
  getOrders: (query?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (query?.status) params.append('status', query.status);
    if (query?.search) params.append('search', query.search);
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    return fetchApi<{ data: any[]; meta: { total: number; page: number; totalPages: number } }>(
      `/orders?${params.toString()}`,
    );
  },
  getOrderById: (id: string) => fetchApi<any>(`/orders/${id}`),

  // Storefront Public APIs
  getProducts: (categoryId?: string, search?: string) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (search) params.append('search', search);
    return fetchApi<DynamicProduct[]>(`/products?${params.toString()}`);
  },
  getCategories: () => fetchApi<ProductCategoryItem[]>('/products/categories'),
  getProductBySlug: (slug: string) => fetchApi<DynamicProduct>(`/products/${slug}`),

  // Authoritative Pricing Quote
  calculateQuote: (data: {
    productId: string;
    quantity: number;
    options?: Array<{ optionCode: string; valueCode: string }>;
    fieldValues?: Record<string, any>;
    hasArtwork?: boolean;
    hasDesignService?: boolean;
    hasReferenceImage?: boolean;
    shippingPincode?: string;
    isInterState?: boolean;
    deliveryMethod?: 'COURIER' | 'STORE_PICKUP' | string;
    paymentMethod?: 'ONLINE' | 'COD' | string;
    isCod?: boolean;
  }) => fetchApi<any>('/pricing/calculate-quote', { method: 'POST', body: JSON.stringify(data) }),

  // Artwork & Media Uploads
  uploadArtwork: (file: File, productId?: string, minimumMegapixels?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (productId) formData.append('productId', productId);
    if (minimumMegapixels !== undefined) formData.append('minimumMegapixels', String(minimumMegapixels));
    return fetchApi<{
      fileUrl: string;
      storageKey: string;
      originalFileName: string;
      fileSize: number;
      mimeType: string;
      width: number | null;
      height: number | null;
      actualMegapixels: number | null;
      requiredMegapixels: number;
      qualityVerificationEnabled: boolean;
      qualityStatus: 'PASSED' | 'WARNING' | 'NOT_APPLICABLE';
      warningMessage: string | null;
      timestamp: string;
    }>('/artwork/upload', {
      method: 'POST',
      body: formData,
    });
  },

  uploadReferenceImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi<{
      fileUrl: string;
      storageKey: string;
      originalFileName: string;
      fileSize: number;
      mimeType: string;
      timestamp: string;
    }>('/artwork/upload-reference', {
      method: 'POST',
      body: formData,
    });
  },

  // Admin Catalogue: Categories
  adminListCategories: () => fetchApi<ProductCategoryItem[]>('/admin/catalogue/categories'),
  adminGetCategory: (id: string) => fetchApi<ProductCategoryItem>(`/admin/catalogue/categories/${id}`),
  adminCreateCategory: (data: Partial<ProductCategoryItem>) =>
    fetchApi<ProductCategoryItem>('/admin/catalogue/categories', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCategory: (id: string, data: Partial<ProductCategoryItem>) =>
    fetchApi<ProductCategoryItem>(`/admin/catalogue/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteCategory: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/categories/${id}`, { method: 'DELETE' }),

  // Admin Catalogue: Products
  adminListProducts: (query?: { categoryId?: string; status?: string; search?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (query?.categoryId) params.append('categoryId', query.categoryId);
    if (query?.status) params.append('status', query.status);
    if (query?.search) params.append('search', query.search);
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    return fetchApi<{ data: DynamicProduct[]; meta: { total: number; page: number; totalPages: number } }>(
      `/admin/catalogue/products?${params.toString()}`,
    );
  },
  adminGetProductById: (id: string) => fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}`),
  adminCreateProduct: (data: any) =>
    fetchApi<DynamicProduct>('/admin/catalogue/products', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateProduct: (id: string, data: any) =>
    fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDuplicateProduct: (id: string) =>
    fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}/duplicate`, { method: 'POST' }),
  adminPublishProduct: (id: string) =>
    fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}/publish`, { method: 'PATCH' }),
  adminArchiveProduct: (id: string) =>
    fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}/archive`, { method: 'PATCH' }),
  adminDeleteProduct: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${id}`, { method: 'DELETE' }),

  // Admin Catalogue: Dynamic Fields
  adminAddField: (productId: string, data: any) =>
    fetchApi<DynamicField>(`/admin/catalogue/products/${productId}/fields`, { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateField: (productId: string, fieldId: string, data: any) =>
    fetchApi<DynamicField>(`/admin/catalogue/products/${productId}/fields/${fieldId}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteField: (productId: string, fieldId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/fields/${fieldId}`, { method: 'DELETE' }),
  adminAddFieldOption: (productId: string, fieldId: string, data: any) =>
    fetchApi<DynamicFieldOption>(`/admin/catalogue/products/${productId}/fields/${fieldId}/options`, { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateFieldOption: (productId: string, fieldId: string, optionId: string, data: any) =>
    fetchApi<DynamicFieldOption>(`/admin/catalogue/products/${productId}/fields/${fieldId}/options/${optionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteFieldOption: (productId: string, fieldId: string, optionId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/fields/${fieldId}/options/${optionId}`, { method: 'DELETE' }),

  // Admin Catalogue: Media
  adminUploadProductImage: (productId: string, file: File, metadata?: { altText?: string; caption?: string; isPrimary?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.altText) formData.append('altText', metadata.altText);
    if (metadata?.caption) formData.append('caption', metadata.caption);
    if (metadata?.isPrimary !== undefined) formData.append('isPrimary', String(metadata.isPrimary));
    return fetchApi<ProductImageItem>(`/admin/catalogue/products/${productId}/upload-image`, {
      method: 'POST',
      body: formData,
    });
  },
  adminAddProductImage: (productId: string, data: any) =>
    fetchApi<ProductImageItem>(`/admin/catalogue/products/${productId}/images`, { method: 'POST', body: JSON.stringify(data) }),
  adminSetPrimaryImage: (productId: string, imageId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/images/${imageId}/primary`, { method: 'PATCH' }),
  adminDeleteProductImage: (productId: string, imageId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/images/${imageId}`, { method: 'DELETE' }),
  adminReorderImages: (productId: string, orderedImageIds: string[]) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/images/reorder`, { method: 'PATCH', body: JSON.stringify({ orderedImageIds }) }),

  // Admin Catalogue: Pricing Rules & Quantity Tier Offers
  adminGetPricingRules: (productId: string) =>
    fetchApi<PricingRule[]>(`/admin/catalogue/products/${productId}/pricing-rules`),
  adminAddPricingRule: (productId: string, data: CreatePricingRuleDto) =>
    fetchApi<PricingRule>(`/admin/catalogue/products/${productId}/pricing-rules`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adminUpdatePricingRule: (productId: string, ruleId: string, data: Partial<CreatePricingRuleDto>) =>
    fetchApi<PricingRule>(`/admin/catalogue/products/${productId}/pricing-rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  adminDeletePricingRule: (productId: string, ruleId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/pricing-rules/${ruleId}`, {
      method: 'DELETE',
    }),
  adminSaveBatchPricingRules: (productId: string, rules: CreatePricingRuleDto[]) =>
    fetchApi<PricingRule[]>(`/admin/catalogue/products/${productId}/pricing-rules-batch`, {
      method: 'PUT',
      body: JSON.stringify({ rules }),
    }),

  // Admin Inventory
  adminListInventory: (query?: { category?: string; search?: string; lowStockOnly?: boolean }) => {
    const params = new URLSearchParams();
    if (query?.category) params.append('category', query.category);
    if (query?.search) params.append('search', query.search);
    if (query?.lowStockOnly) params.append('lowStockOnly', 'true');
    return fetchApi<InventoryItemDto[]>(`/admin/inventory/items?${params.toString()}`);
  },
  adminCreateInventoryItem: (data: any) =>
    fetchApi<InventoryItemDto>('/admin/inventory/items', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateInventoryItem: (id: string, data: any) =>
    fetchApi<InventoryItemDto>(`/admin/inventory/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminRecordStockMovement: (id: string, data: any) =>
    fetchApi<any>(`/admin/inventory/items/${id}/movement`, { method: 'POST', body: JSON.stringify(data) }),
  adminListStockMovements: (itemId?: string) =>
    fetchApi<any[]>(`/admin/inventory/movements${itemId ? `?itemId=${itemId}` : ''}`),

  // Orders
  createOrder: (orderData: unknown) =>
    fetchApi('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  getOrder: (idOrNumber: string) => fetchApi(`/orders/${idOrNumber}`),
  listOrders: (query?: Record<string, string>) => {
    const params = new URLSearchParams(query || {});
    return fetchApi(`/orders?${params.toString()}`);
  },

  // Workflow
  transitionWorkflow: (data: { orderId: string; targetStatus: string; notes?: string }) =>
    fetchApi('/workflow/transition', { method: 'POST', body: JSON.stringify(data) }),
  managerOverride: (data: { orderId: string; targetStatus: string; reason: string; notes?: string }) =>
    fetchApi('/workflow/override', { method: 'POST', body: JSON.stringify(data) }),
  pauseOrder: (orderId: string, reason: string) =>
    fetchApi(`/workflow/${orderId}/pause`, { method: 'POST', body: JSON.stringify({ reason }) }),
  resumeOrder: (orderId: string, preHoldStatus: string) =>
    fetchApi(`/workflow/${orderId}/resume`, { method: 'POST', body: JSON.stringify({ preHoldStatus }) }),

  // Quality Control
  getQCTemplates: (type: 'pre-production' | 'final') => fetchApi(`/qc/template/${type}`),
  getPreProductionQCQueue: (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return fetchApi<any[]>(`/qc/queue/pre-production?${params.toString()}`);
  },
  getFinalQCQueue: (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return fetchApi<any[]>(`/qc/queue/final?${params.toString()}`);
  },
  submitQC: (data: unknown) => fetchApi('/qc/inspect', { method: 'POST', body: JSON.stringify(data) }),

  // Job Cards
  listJobCards: (station?: string) => fetchApi(`/job-cards${station ? `?station=${station}` : ''}`),
  claimJobCard: (id: string) => fetchApi(`/job-cards/${id}/claim`, { method: 'POST' }),
  startJobCard: (id: string) => fetchApi(`/job-cards/${id}/start`, { method: 'POST' }),
  completeStation: (id: string, nextStation: string) =>
    fetchApi(`/job-cards/${id}/complete-station`, { method: 'POST', body: JSON.stringify({ nextStation }) }),

  // Production Kanban Board
  getProductionBoard: (query?: {
    search?: string;
    machineId?: string;
    operatorId?: string;
    priority?: string;
    slaStatus?: string;
    columnKey?: string;
  }) => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.machineId && query.machineId !== 'ALL') params.append('machineId', query.machineId);
    if (query?.operatorId && query.operatorId !== 'ALL') params.append('operatorId', query.operatorId);
    if (query?.priority && query.priority !== 'ALL') params.append('priority', query.priority);
    if (query?.slaStatus && query.slaStatus !== 'ALL') params.append('slaStatus', query.slaStatus);
    if (query?.columnKey) params.append('columnKey', query.columnKey);
    return fetchApi<ProductionBoardResponseDto>(`/production/board?${params.toString()}`);
  },
  transitionProductionJob: (
    jobId: string,
    data: {
      targetColumnKey: string;
      reason?: string;
      machineId?: string;
      operatorId?: string;
      managerOverrideReason?: string;
    },
  ) =>
    fetchApi<any>(`/production/jobs/${jobId}/transition`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createProductionColumn: (data: {
    name: string;
    key?: string;
    description?: string;
    type?: 'SYSTEM' | 'CUSTOM' | 'HOLD' | 'ARCHIVED';
    sortOrder?: number;
    color?: string;
    mappedStatus?: string;
    mappedStation?: string;
  }) =>
    fetchApi<any>('/production/columns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProductionColumn: (id: string, data: any) =>
    fetchApi<any>(`/production/columns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  reorderProductionColumns: (columnOrders: Array<{ id: string; sortOrder: number }>) =>
    fetchApi<{ success: boolean; message: string }>('/production/columns/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ columnOrders }),
    }),
  archiveProductionColumn: (id: string) =>
    fetchApi<any>(`/production/columns/${id}/archive`, {
      method: 'POST',
    }),

  // Packing & Dispatch
  getPackingQueue: (query?: { search?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.priority && query.priority !== 'ALL') params.append('priority', query.priority);
    return fetchApi<any[]>(`/packing/queue?${params.toString()}`);
  },
  getPackagingMaterials: () => fetchApi<any[]>('/packing/materials'),
  getPackingJob: (id: string) => fetchApi<any>(`/packing/jobs/${id}`),
  completePacking: (data: {
    orderId: string;
    packages: Array<{
      sequenceNumber: number;
      cartonType?: string;
      grossWeightGrams: number;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
    }>;
    courierName?: string;
    stationPrinter?: string;
  }) => fetchApi<any>('/packing/complete', { method: 'POST', body: JSON.stringify(data) }),
  recordLabelReprint: (id: string, reason?: string) =>
    fetchApi<{ success: boolean; message: string }>(`/packing/jobs/${id}/label/reprint`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  confirmCourierHandover: (data: unknown) =>
    fetchApi('/dispatch/courier-handover', { method: 'POST', body: JSON.stringify(data) }),
  confirmStorePickup: (data: unknown) =>
    fetchApi('/dispatch/store-pickup-handover', { method: 'POST', body: JSON.stringify(data) }),

  // Payments & Finance Board
  getFinanceBoard: (query?: {
    search?: string;
    paymentStatus?: string;
    method?: string;
    priority?: string;
  }) => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.paymentStatus && query.paymentStatus !== 'ALL') params.append('paymentStatus', query.paymentStatus);
    if (query?.method && query.method !== 'ALL') params.append('method', query.method);
    if (query?.priority && query.priority !== 'ALL') params.append('priority', query.priority);
    return fetchApi<{
      metrics: {
        totalGrossBilling: number;
        gstCollected: number;
        settledAmount: number;
        pendingAmount: number;
        corporateCreditAmount: number;
        overdueAmount: number;
        collectionRate: number;
        pendingCount: number;
        corporateCount: number;
        settledCount: number;
        overdueCount: number;
      };
      cards: any[];
    }>(`/payments/board?${params.toString()}`);
  },
  recordManualPayment: (data: {
    orderId: string;
    amount: number;
    method: string;
    referenceNumber: string;
    notes?: string;
  }) => fetchApi<any>('/payments/manual', { method: 'POST', body: JSON.stringify(data) }),
  createPaymentIntent: (orderId: string) =>
    fetchApi('/payments/create-intent', { method: 'POST', body: JSON.stringify({ orderId }) }),
  verifyPayment: (data: unknown) =>
    fetchApi('/payments/verify', { method: 'POST', body: JSON.stringify(data) }),

  // SLA
  getSlaOverview: () => fetchApi('/sla/overview'),

  // Design Team & Artwork Studio Workflow
  getDesignQueue: (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return fetchApi<any[]>(`/artwork/design-queue?${params.toString()}`);
  },
  claimDesignJob: (orderId: string) =>
    fetchApi<any>(`/artwork/design/${orderId}/claim`, { method: 'POST' }),
  completeDesignJob: (orderId: string, data: {
    storageKey: string;
    originalFileName: string;
    mimeType?: string;
    fileSize?: number;
    prepressNotes?: string;
    resolutionDpi?: number;
  }) => fetchApi<any>(`/artwork/design/${orderId}/complete`, { method: 'POST', body: JSON.stringify(data) }),
  getArtworkVersions: (orderItemId: string) =>
    fetchApi<any[]>(`/artwork/item/${orderItemId}`),
  registerArtwork: (data: any) =>
    fetchApi<any>('/artwork/register', { method: 'POST', body: JSON.stringify(data) }),
  submitProofForApproval: (artworkVersionId: string, prepressNotes: string) =>
    fetchApi<any>(`/artwork/submit-proof/${artworkVersionId}`, { method: 'POST', body: JSON.stringify({ prepressNotes }) }),
  approveProof: (data: { orderItemId: string; artworkVersionId: string }) =>
    fetchApi<any>('/artwork/approve-proof', { method: 'POST', body: JSON.stringify(data) }),
  requestRevision: (data: { orderItemId: string; reason: string; customerNotes?: string }) =>
    fetchApi<any>('/artwork/request-revision', { method: 'POST', body: JSON.stringify(data) }),

  // Operations Coordinator (OE) Module
  getOperationsDashboard: () =>
    fetchApi<any>('/operations/dashboard'),
  getOperationsOrders: (query?: {
    search?: string;
    statusGroup?: string;
    assignedDesignerId?: string;
    assignedOperatorId?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.statusGroup && query.statusGroup !== 'ALL') params.append('statusGroup', query.statusGroup);
    if (query?.assignedDesignerId && query.assignedDesignerId !== 'ALL') params.append('assignedDesignerId', query.assignedDesignerId);
    if (query?.assignedOperatorId && query.assignedOperatorId !== 'ALL') params.append('assignedOperatorId', query.assignedOperatorId);
    if (query?.priority && query.priority !== 'ALL') params.append('priority', query.priority);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    return fetchApi<any>(`/operations/orders?${params.toString()}`);
  },
  getOperationsIntakeOrders: () =>
    fetchApi<any[]>('/operations/orders/intake'),
  getOperationsUnassignedDesignOrders: () =>
    fetchApi<any[]>('/operations/orders/unassigned/design'),
  getOperationsUnassignedProductionOrders: () =>
    fetchApi<any[]>('/operations/orders/unassigned/production'),
  getOperationsBlockedOrders: () =>
    fetchApi<any[]>('/operations/orders/blocked'),
  getOperationsOrderDetail: (orderId: string) =>
    fetchApi<any>(`/operations/orders/${orderId}`),
  getOperationsOrderTimeline: (orderId: string) =>
    fetchApi<any[]>(`/operations/orders/${orderId}/timeline`),
  assignDesigner: (orderId: string, data: { designerId: string; reason?: string }) =>
    fetchApi<any>(`/operations/orders/${orderId}/design-assignment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  assignProductionOperator: (orderId: string, data: { operatorId: string; reason?: string }) =>
    fetchApi<any>(`/operations/orders/${orderId}/production-assignment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addOperationalNote: (orderId: string, data: { content: string }) =>
    fetchApi<any>(`/operations/orders/${orderId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateOrderPriority: (orderId: string, data: { priority: string; reason?: string }) =>
    fetchApi<any>(`/operations/orders/${orderId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getEligibleDesigners: () =>
    fetchApi<any[]>('/operations/assignees/designers'),
  getEligibleProductionOperators: () =>
    fetchApi<any[]>('/operations/assignees/operators'),
  getOrderReadiness: (orderId: string) =>
    fetchApi<any>(`/operations/orders/${orderId}/readiness`),
  releaseOrderToProduction: (orderId: string, data?: { managerOverrideReason?: string; notes?: string; assignedOperatorId?: string }) =>
    fetchApi<any>(`/operations/orders/${orderId}/release-to-production`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
};
