'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiAddLine,
  RiSearch2Line,
  RiFilter3Line,
  RiFileCopyLine,
  RiEditLine,
  RiEyeLine,
  RiCheckboxCircleLine,
  RiArchiveLine,
  RiDeleteBin7Line,
  RiLoader4Line,
  RiImage2Line,
  RiListSettingsLine,
  RiFlashlightLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiSparklingFill,
  RiStarFill,
  RiPrinterLine,
  RiUploadCloud2Line,
  RiCheckLine,
  RiPriceTag3Line,
  RiInformationLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiStackLine,
  RiTimeLine,
  RiSettings4Line,
  RiTruckLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import {
  api,
  resolveImageUrl,
  DynamicProduct,
  ProductCategoryItem,
  ReusableAttribute,
  ReusableAttributeOption,
  CreatePricingRuleDto,
} from '@/lib/api';
import { Button, Badge, Modal } from '@/components/ui';
import { parseQuantityRanges } from './components/SingleTypePricingTable';

interface ConfiguredAttributeState {
  attributeId: string;
  name: string;
  code: string;
  type: string;
  description?: string | null;
  enabledOptionValues: string[];
  isOptionalAddOn?: boolean;
}

interface TierAttributeRule {
  id: string;
  attributeCode: string;
  attributeValue: string;
  extraPrices: Record<number, number | ''>;
}

interface PricingTier {
  id: string;
  name: string;
  basePrices: Record<number, number | ''>;
  attributes: TierAttributeRule[];
}

interface PendingImageUpload {
  id: string;
  file?: File;
  previewUrl: string;
  name: string;
  size: number;
  isPrimary: boolean;
}

const PRESET_QUANTITIES = [100, 200, 300, 400, 500, 1000, 2500, 5000];

export default function AdminProductsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data Collections
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [attributeLibrary, setAttributeLibrary] = useState<ReusableAttribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Product List Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Product View & Quick Edit Modal State
  const [viewingProduct, setViewingProduct] = useState<DynamicProduct | null>(null);
  const [isModalInlineEditing, setIsModalInlineEditing] = useState(false);
  const [modalEditName, setModalEditName] = useState('');
  const [modalEditPrice, setModalEditPrice] = useState<number | string>('');
  const [modalEditStatus, setModalEditStatus] = useState<'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('PUBLISHED');
  const [modalEditStock, setModalEditStock] = useState<number | string>('');
  const [isSavingModalEdit, setIsSavingModalEdit] = useState(false);
  const [modalEditError, setModalEditError] = useState<string | null>(null);

  const handleOpenViewModal = (prod: DynamicProduct) => {
    setViewingProduct(prod);
    setIsModalInlineEditing(false);
    setModalEditName(prod.name);
    setModalEditPrice(prod.basePrice);
    setModalEditStatus(prod.status);
    setModalEditStock(prod.stockQuantity ?? 1000);
    setModalEditError(null);
  };

  const handleSaveModalInlineEdit = async () => {
    if (!viewingProduct) return;
    if (!modalEditName.trim()) {
      setModalEditError('Product name is required.');
      return;
    }
    setIsSavingModalEdit(true);
    setModalEditError(null);
    try {
      const updated = await api.adminUpdateProduct(viewingProduct.id, {
        name: modalEditName.trim(),
        basePrice: parseFloat(String(modalEditPrice)) || 0,
        status: modalEditStatus,
        stockQuantity: parseInt(String(modalEditStock), 10) || 0,
      });
      setViewingProduct(updated);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      setIsModalInlineEditing(false);
    } catch (err: any) {
      setModalEditError(err?.message || 'Failed to update product details.');
    } finally {
      setIsSavingModalEdit(false);
    }
  };

  const formatCreatedDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // ==========================================
  // SINGLE-PAGE PRODUCT CREATION FORM STATE
  // ==========================================
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [quantityType, setQuantityType] = useState<'Variable' | 'Single'>('Variable');
  const [stockStatus, setStockStatus] = useState<'Available' | 'Not Available'>('Available');
  const [deliveryTime, setDeliveryTime] = useState('2-3 Working Days');
  const [productionDays, setProductionDays] = useState<number>(2);
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [isFeatured, setIsFeatured] = useState<boolean>(false);

  // Courier & Delivery Charges State (Alongside Product Configuration)
  const [shippingChargeType, setShippingChargeType] = useState<'DEFAULT' | 'FIXED' | 'FREE' | 'QUANTITY_BASED' | 'WEIGHT_BASED'>('DEFAULT');
  const [unitWeightGrams, setUnitWeightGrams] = useState<number | ''>(2.5);
  const [courierCharge, setCourierCharge] = useState<number | ''>(100);
  const [perAdditionalQtyRate, setPerAdditionalQtyRate] = useState<number | ''>(25);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | ''>(1000);

  // Dynamic Delivery Turnaround Handlers
  const handleDeliveryTimeInput = (val: string) => {
    const trimmed = val.trim();

    if (!val) {
      setDeliveryTime('');
      return;
    }

    // Direct entry: "1" -> "Single Day Delivery"
    if (trimmed === '1' || /^1\s*(day|working\s*day)?$/i.test(trimmed)) {
      setDeliveryTime('Single Day Delivery');
      setProductionDays(1);
      return;
    }

    // Direct entry: range like "2-3", "2 - 3", "3-5"
    const rangeMatch = trimmed.match(/^(\d+)\s*[-–—]\s*(\d+)(\s*working\s*days?|\s*days?)?$/i);
    if (rangeMatch) {
      const min = rangeMatch[1];
      const max = rangeMatch[2];
      setDeliveryTime(`${min}-${max} Working Days`);
      setProductionDays(Number(min) || 2);
      return;
    }

    // Direct entry: single integer > 1 like "2", "3", "5"
    const numMatch = trimmed.match(/^(\d+)(\s*working\s*days?|\s*days?)?$/i);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num === 1) {
        setDeliveryTime('Single Day Delivery');
        setProductionDays(1);
      } else {
        setDeliveryTime(`${num} Working Days`);
        setProductionDays(num);
      }
      return;
    }

    // Free text input fallback
    setDeliveryTime(val);
    const parsedNum = parseInt(trimmed.match(/\d+/)?.[0] || '', 10);
    if (!isNaN(parsedNum)) {
      setProductionDays(parsedNum);
    }
  };

  const handleDeliveryTimeBlur = () => {
    if (!deliveryTime.trim()) {
      setDeliveryTime('2-3 Working Days');
      setProductionDays(2);
      return;
    }
    const trimmed = deliveryTime.trim();
    if (trimmed === '1' || /^1\s*(day|working\s*day)?$/i.test(trimmed)) {
      setDeliveryTime('Single Day Delivery');
      setProductionDays(1);
    } else if (/^(\d+)\s*[-–—]\s*(\d+)$/.test(trimmed)) {
      setDeliveryTime(`${trimmed} Working Days`);
    } else if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (num === 1) {
        setDeliveryTime('Single Day Delivery');
        setProductionDays(1);
      } else {
        setDeliveryTime(`${num} Working Days`);
        setProductionDays(num);
      }
    }
  };

  const applyDeliveryPreset = (preset: number | string) => {
    if (preset === 1 || preset === '1') {
      setDeliveryTime('Single Day Delivery');
      setProductionDays(1);
    } else if (typeof preset === 'number') {
      setDeliveryTime(`${preset} Working Days`);
      setProductionDays(preset);
    } else {
      setDeliveryTime(`${preset} Working Days`);
      const min = parseInt(String(preset).split('-')[0], 10);
      setProductionDays(min || 2);
    }
  };

  // Selected Reusable Attributes for this Product
  const [attributeSearch, setAttributeSearch] = useState('');
  const [selectedAttributeIdToAdd, setSelectedAttributeIdToAdd] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, ConfiguredAttributeState>
  >({});

  // Add / Edit Attribute Value Modal State
  const [valueModalAttr, setValueModalAttr] = useState<ReusableAttribute | null>(null);
  const [valueModalEditingIndex, setValueModalEditingIndex] = useState<number | null>(null);
  const [valModalName, setValModalName] = useState('');
  const [valModalError, setValModalError] = useState<string | null>(null);
  const [isSavingValModal, setIsSavingValModal] = useState(false);

  // Combinations Pricing Grid
  const [standardQuantities, setStandardQuantities] = useState<number[]>([100, 200, 300, 400, 500]);
  const [customQuantities, setCustomQuantities] = useState<number[]>([]);
  const [customQtyInput, setCustomQtyInput] = useState('');
  const [customQtyError, setCustomQtyError] = useState<string | null>(null);

  const displayQuantities = useMemo(() => {
    const set = new Set([...PRESET_QUANTITIES, ...customQuantities, ...standardQuantities]);
    return Array.from(set).sort((a, b) => a - b);
  }, [customQuantities, standardQuantities]);

  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([
    {
      id: 'tier-1',
      name: 'TIER 1',
      basePrices: { 100: 150, 200: 280, 300: 390, 400: 500, 500: 600 },
      attributes: [],
    },
  ]);

  // Single-Type Quantity Range Pricing State
  const [singleQtyRangesInput, setSingleQtyRangesInput] = useState('1-5, 6-10, 11-20');
  const [singleBasePrices, setSingleBasePrices] = useState<Record<string, number | string>>({
    '1-5': 200,
    '6-10': 190,
    '11-20': 180,
  });
  const [singleExtraPrices, setSingleExtraPrices] = useState<
    Record<string, Record<string, number | string>>
  >({});

  // Image Upload Area
  const [pendingImages, setPendingImages] = useState<PendingImageUpload[]>([]);

  // Submission State
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // ==========================================
  // INLINE ADD REUSABLE ATTRIBUTE MODAL STATE
  // ==========================================
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrCode, setNewAttrCode] = useState('');
  const [newAttrType, setNewAttrType] = useState('SELECT');
  const [newAttrDesc, setNewAttrDesc] = useState('');
  const [newAttrOptions, setNewAttrOptions] = useState<ReusableAttributeOption[]>([
    { label: '', value: '', priceModifier: 0, priceModifierType: 'FIXED', isDefault: true },
  ]);
  const [attrModalError, setAttrModalError] = useState<string | null>(null);
  const [isSavingAttr, setIsSavingAttr] = useState(false);

  // Load All Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodsRes, catsRes, attrsRes] = await Promise.allSettled([
        api.adminListProducts({ limit: 100 }),
        api.adminListCategories(),
        api.adminListAttributes(),
      ]);

      if (prodsRes.status === 'fulfilled') {
        setProducts(prodsRes.value.data || []);
      }
      if (catsRes.status === 'fulfilled') {
        const catsList = catsRes.value || [];
        setCategories(catsList);
        if (catsList.length > 0 && !categoryId) {
          setCategoryId(catsList[0].id);
        }
      }
      if (attrsRes.status === 'fulfilled') {
        setAttributeLibrary(attrsRes.value || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('updated')) {
        setCreateSuccess('Changes saved successfully!');
        window.history.replaceState({}, '', '/admin/products');
      }
    }
  }, []);

  // Handle Product Name Change (Auto-generate slug & SKU)
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(generatedSlug);

    const prefix = val.trim().slice(0, 3).toUpperCase() || 'PRD';
    const randCode = Math.floor(100 + Math.random() * 900);
    setSku(`PRD-${prefix}-${randCode}`);
  };

  // Handle Parent Category Cascading

  // ==========================================
  // REUSABLE ATTRIBUTES SELECTION & CONFIG
  // ==========================================

  // Reusable attributes available in library that are not yet attached to this product
  const availableAttributesToAdd = useMemo(() => {
    return attributeLibrary.filter((attr) => {
      if (selectedAttributes[attr.id]) return false;
      if (!attributeSearch.trim()) return true;
      const q = attributeSearch.toLowerCase();
      return attr.name.toLowerCase().includes(q) || attr.code.toLowerCase().includes(q);
    });
  }, [attributeLibrary, selectedAttributes, attributeSearch]);

  const handleAddAttributeToProduct = (attributeIdToAdd?: string) => {
    const attrId = attributeIdToAdd || selectedAttributeIdToAdd;
    if (!attrId) return;

    if (selectedAttributes[attrId]) {
      return;
    }

    const attr = attributeLibrary.find((a) => a.id === attrId);
    if (!attr) return;

    // Attach attribute with all values enabled by default as promised by UI
    setSelectedAttributes((prev) => ({
      ...prev,
      [attr.id]: {
        attributeId: attr.id,
        name: attr.name,
        code: attr.code,
        type: attr.type,
        description: attr.description,
        enabledOptionValues: (attr.options || []).map((o) => o.value),
        isOptionalAddOn: Boolean(attr.isOptionalAddOn || attr.options?.[0]?.isOptionalAddOn),
      },
    }));
    setSelectedAttributeIdToAdd('');
  };

  const handleToggleAttributeForProduct = (attrId: string) => {
    if (selectedAttributes[attrId]) {
      handleRemoveAttributeFromProduct(attrId);
    } else {
      handleAddAttributeToProduct(attrId);
    }
  };

  const handleRemoveAttributeFromProduct = (attrId: string) => {
    const attr = attributeLibrary.find((a) => a.id === attrId);
    setSelectedAttributes((prev) => {
      const next = { ...prev };
      delete next[attrId];
      return next;
    });

    // Clean up pricing attribute rules if they were assigned to this attribute
    if (attr) {
      setPricingTiers((prev) =>
        prev.map((tier) => ({
          ...tier,
          attributes: tier.attributes.filter((a) => a.attributeCode !== attr.code),
        })),
      );
    }
  };

  const handleToggleOptionValue = (attrId: string, value: string) => {
    const current = selectedAttributes[attrId];
    if (!current) return;

    const isAlreadyEnabled = current.enabledOptionValues.includes(value);
    const updated = isAlreadyEnabled
      ? current.enabledOptionValues.filter((v) => v !== value)
      : [...current.enabledOptionValues, value];

    setSelectedAttributes((prev) => ({
      ...prev,
      [attrId]: {
        ...current,
        enabledOptionValues: updated,
      },
    }));
  };

  const handleRemoveValueFromProduct = (attrId: string, value: string) => {
    const current = selectedAttributes[attrId];
    if (!current) return;

    setSelectedAttributes((prev) => ({
      ...prev,
      [attrId]: {
        ...current,
        enabledOptionValues: current.enabledOptionValues.filter((v) => v !== value),
      },
    }));
  };

  // Add / Edit Value in Shared Attribute Modal
  const handleOpenAddValue = (attr: ReusableAttribute) => {
    setValueModalAttr(attr);
    setValueModalEditingIndex(null);
    setValModalName('');
    setValModalError(null);
  };

  const handleOpenEditValue = (attr: ReusableAttribute, optIndex: number) => {
    const opt = attr.options?.[optIndex];
    if (!opt) return;
    setValueModalAttr(attr);
    setValueModalEditingIndex(optIndex);
    setValModalName(opt.label || opt.value || '');
    setValModalError(null);
  };

  const handleSaveValueModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valueModalAttr) return;
    if (!valModalName.trim()) {
      setValModalError('Value name is required.');
      return;
    }

    const valueCode = valModalName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '');

    const currentOptions = [...(valueModalAttr.options || [])];
    let finalValueCode = valueCode;

    if (valueModalEditingIndex !== null) {
      const existing = currentOptions[valueModalEditingIndex];
      finalValueCode = existing?.value || valueCode;
      currentOptions[valueModalEditingIndex] = {
        ...existing,
        label: valModalName.trim(),
        value: finalValueCode,
      };
    } else {
      // Avoid duplicate code
      if (currentOptions.some((o) => o.value === valueCode)) {
        finalValueCode = `${valueCode}_${Date.now().toString().slice(-4)}`;
      }
      currentOptions.push({
        label: valModalName.trim(),
        value: finalValueCode,
        isActive: true,
        priceModifier: 0,
        priceModifierType: 'FIXED',
        isDefault: currentOptions.length === 0,
      });
    }

    setIsSavingValModal(true);
    setValModalError(null);
    try {
      const updatedAttr = await api.adminUpdateAttribute(valueModalAttr.id, {
        options: currentOptions,
      });

      // Update library state
      setAttributeLibrary((prev) =>
        prev.map((a) => (a.id === updatedAttr.id ? updatedAttr : a)),
      );

      // If adding a new value, automatically enable it for the current product
      if (valueModalEditingIndex === null) {
        setSelectedAttributes((prev) => {
          const current = prev[valueModalAttr.id];
          if (!current) return prev;
          return {
            ...prev,
            [valueModalAttr.id]: {
              ...current,
              enabledOptionValues: Array.from(
                new Set([...current.enabledOptionValues, finalValueCode]),
              ),
            },
          };
        });
      }

      setValueModalAttr(null);
    } catch (err: any) {
      setValModalError(err?.message || 'Failed to save attribute value.');
    } finally {
      setIsSavingValModal(false);
    }
  };

  // ==========================================
  // INLINE ADD REUSABLE ATTRIBUTE HANDLERS
  // ==========================================
  const handleOpenNewAttrModal = () => {
    setNewAttrName('');
    setNewAttrCode('');
    setNewAttrType('SELECT');
    setNewAttrDesc('');
    setNewAttrOptions([
      { label: '', value: '', priceModifier: 0, priceModifierType: 'FIXED', isDefault: true },
    ]);
    setAttrModalError(null);
    setIsAttrModalOpen(true);
  };

  const handleNewAttrNameChange = (val: string) => {
    setNewAttrName(val);
    const code = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '');
    setNewAttrCode(code);
  };

  const handleNewAttrOptionChange = (
    idx: number,
    field: keyof ReusableAttributeOption,
    val: any,
  ) => {
    const updated = [...newAttrOptions];
    updated[idx] = { ...updated[idx], [field]: val };
    if (field === 'label' && !updated[idx].value) {
      updated[idx].value = String(val)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)+/g, '');
    }
    setNewAttrOptions(updated);
  };

  const handleAddNewAttrOptionRow = () => {
    setNewAttrOptions([
      ...newAttrOptions,
      { label: '', value: '', priceModifier: 0, priceModifierType: 'FIXED', isDefault: false },
    ]);
  };

  const handleRemoveNewAttrOptionRow = (idx: number) => {
    if (newAttrOptions.length <= 1) return;
    setNewAttrOptions(newAttrOptions.filter((_, i) => i !== idx));
  };

  const handleSaveNewReusableAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrName.trim() || !newAttrCode.trim()) {
      setAttrModalError('Attribute name and internal code are required.');
      return;
    }

    const validOptions = newAttrOptions
      .filter((o) => o.label.trim() !== '')
      .map((o) => ({
        ...o,
        priceModifier: 0,
        priceModifierType: 'FIXED' as const,
      }));

    if (validOptions.length === 0) {
      setAttrModalError('Please add at least one valid option with a label.');
      return;
    }

    setIsSavingAttr(true);
    setAttrModalError(null);
    try {
      const created = await api.adminCreateAttribute({
        name: newAttrName.trim(),
        code: newAttrCode.trim(),
        type: newAttrType,
        description: newAttrDesc.trim() || null,
        options: validOptions,
      });

      // Refresh attribute library
      const updatedList = await api.adminListAttributes();
      setAttributeLibrary(updatedList || []);

      // Attach newly created attribute to the current product form with its options enabled
      setSelectedAttributes((prev) => ({
        ...prev,
        [created.id]: {
          attributeId: created.id,
          name: created.name,
          code: created.code,
          type: created.type,
          description: created.description,
          enabledOptionValues: (created.options || []).map((o: any) => o.value),
        },
      }));
      setIsAttrModalOpen(false);
    } catch (err: any) {
      setAttrModalError(err?.message || 'Failed to save reusable attribute.');
    } finally {
      setIsSavingAttr(false);
    }
  };

  // ==========================================
  // COMBINATIONS PRICING GRID HANDLERS
  // ==========================================
  const getOptionLabel = (attrCode: string, val: string) => {
    const libAttr = attributeLibrary.find((a) => a.code === attrCode);
    const opt = libAttr?.options?.find((o) => o.value === val);
    return opt?.label || val;
  };

  const [singleRangesParseError, setSingleRangesParseError] = useState<string | null>(null);

  const parsedSingleRanges = useMemo(() => {
    if (quantityType !== 'Single') return [];
    const res = parseQuantityRanges(singleQtyRangesInput);
    return res.ranges || [];
  }, [quantityType, singleQtyRangesInput]);

  const handleSingleRangesInputChange = (val: string) => {
    setSingleQtyRangesInput(val);
    const res = parseQuantityRanges(val);
    if (!res.error && res.ranges.length > 0) {
      setSingleRangesParseError(null);
      const newQtys = res.ranges.map((r) => r.min);
      setStandardQuantities(newQtys);
    } else {
      setSingleRangesParseError(res.error || 'Please define valid quantity ranges.');
    }
  };

  const handleQuantityTypeChange = (type: 'Variable' | 'Single') => {
    setQuantityType(type);
    if (type === 'Single') {
      const res = parseQuantityRanges(singleQtyRangesInput);
      if (res.ranges.length > 0) {
        setStandardQuantities(res.ranges.map((r) => r.min));
      } else {
        setStandardQuantities([1]);
      }
    } else {
      if (standardQuantities.length <= 1) {
        setStandardQuantities([100, 200, 300, 400, 500]);
      }
    }
  };

  const gridColumns = useMemo(() => {
    if (quantityType === 'Single') {
      if (parsedSingleRanges.length > 0) {
        return parsedSingleRanges.map((r) => ({
          qty: r.min,
          headerLabel: `Qty ${r.label}`,
          fieldLabel: `Qty ${r.label}`,
          isSingleRange: true,
          range: r,
        }));
      }
      return standardQuantities.map((q) => ({
        qty: q,
        headerLabel: `Qty ${q}`,
        fieldLabel: `Qty ${q}`,
        isSingleRange: true,
        range: null,
      }));
    }
    return standardQuantities.map((q) => ({
      qty: q,
      headerLabel: `Qty ${q.toLocaleString()}`,
      fieldLabel: `Qty ${q.toLocaleString()}`,
      isSingleRange: false,
      range: null,
    }));
  }, [quantityType, parsedSingleRanges, standardQuantities]);

  const handleToggleQuantityColumn = (qty: number) => {
    if (standardQuantities.includes(qty)) {
      if (standardQuantities.length <= 1) {
        setCustomQtyError('At least one quantity column is required in the pricing grid.');
        return;
      }
      setCustomQtyError(null);
      setStandardQuantities((prev) => prev.filter((q) => q !== qty));
    } else {
      setCustomQtyError(null);
      setStandardQuantities((prev) => [...prev, qty].sort((a, b) => a - b));
    }
  };

  const handleAddCustomQuantity = () => {
    const trimmed = customQtyInput.trim();
    if (!trimmed) return;
    const qty = parseInt(trimmed, 10);
    if (isNaN(qty) || qty <= 0) {
      setCustomQtyError('Please enter a valid positive quantity.');
      return;
    }
    if (standardQuantities.includes(qty)) {
      setCustomQtyError(`Quantity ${qty.toLocaleString()} is already in the grid.`);
      return;
    }
    setCustomQtyError(null);
    setCustomQuantities((prev) => (prev.includes(qty) ? prev : [...prev, qty]));
    setStandardQuantities((prev) => [...prev, qty].sort((a, b) => a - b));
    setCustomQtyInput('');
  };

  const handleRemoveQuantityColumn = (qty: number) => {
    if (standardQuantities.length <= 1) {
      setCustomQtyError('At least one quantity column is required in the pricing grid.');
      return;
    }
    setCustomQtyError(null);
    setStandardQuantities((prev) => prev.filter((q) => q !== qty));
  };

  // Tier Handlers
  const handleAddTier = () => {
    const newIdx = pricingTiers.length + 1;
    const basePricesCopy: Record<number, number | ''> = {};
    standardQuantities.forEach((q) => {
      basePricesCopy[q] = pricingTiers[0]?.basePrices[q] ?? '';
    });

    setPricingTiers([
      ...pricingTiers,
      {
        id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `TIER ${newIdx}`,
        basePrices: basePricesCopy,
        attributes: [],
      },
    ]);
  };

  const handleRemoveTier = (tierId: string) => {
    if (pricingTiers.length <= 1) return;
    setPricingTiers(pricingTiers.filter((t) => t.id !== tierId));
  };

  const handleUpdateTierBasePrice = (tierId: string, qty: number, val: string) => {
    const num = val === '' ? '' : parseFloat(val);
    setPricingTiers(
      pricingTiers.map((t) => {
        if (t.id !== tierId) return t;
        return {
          ...t,
          basePrices: {
            ...t.basePrices,
            [qty]: isNaN(num as number) ? '' : num,
          },
        };
      }),
    );
  };

  const handleAddAttributeToTier = (tierId: string, attrCode: string) => {
    const attrConfig = Object.values(selectedAttributes).find((a) => a.code === attrCode);
    if (!attrConfig) return;
    const defaultValue = attrConfig.enabledOptionValues?.[0] || '';

    setPricingTiers((prev) =>
      prev.map((t) => {
        if (t.id !== tierId) return t;
        const newAttrRule: TierAttributeRule = {
          id: `attr-rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          attributeCode: attrCode,
          attributeValue: defaultValue,
          extraPrices: {},
        };
        return {
          ...t,
          attributes: [...t.attributes, newAttrRule],
        };
      }),
    );
  };

  const handleRemoveAttributeFromTier = (tierId: string, attrRuleId: string) => {
    setPricingTiers(
      pricingTiers.map((t) => {
        if (t.id !== tierId) return t;
        return {
          ...t,
          attributes: t.attributes.filter((a) => a.id !== attrRuleId),
        };
      }),
    );
  };

  const handleUpdateTierAttributeValue = (
    tierId: string,
    attrRuleId: string,
    val: string,
  ) => {
    setPricingTiers(
      pricingTiers.map((t) => {
        if (t.id !== tierId) return t;
        return {
          ...t,
          attributes: t.attributes.map((a) => (a.id === attrRuleId ? { ...a, attributeValue: val } : a)),
        };
      }),
    );
  };

  const handleGenerateAllVariants = () => {
    const attrList = Object.values(selectedAttributes).filter(
      (a) => a.enabledOptionValues && a.enabledOptionValues.length > 0,
    );

    if (attrList.length === 0) {
      alert('Please attach at least one attribute with selected values in Section 2 above before generating variants.');
      return;
    }

    // Cartesian product of all attached attributes and their enabled values
    let combinations: Array<Array<{ attributeCode: string; attributeValue: string }>> = [[]];
    for (const attr of attrList) {
      const nextCombos: Array<Array<{ attributeCode: string; attributeValue: string }>> = [];
      for (const existing of combinations) {
        for (const val of attr.enabledOptionValues) {
          nextCombos.push([...existing, { attributeCode: attr.code, attributeValue: val }]);
        }
      }
      combinations = nextCombos;
    }

    if (combinations.length === 0) return;

    if (combinations.length > 100) {
      const confirmed = window.confirm(
        `This will generate ${combinations.length} variant tiers. Do you want to proceed?`,
      );
      if (!confirmed) return;
    }

    // Template prices from first tier if present
    const templatePrices: Record<number, number | ''> = {};
    standardQuantities.forEach((q) => {
      templatePrices[q] = pricingTiers[0]?.basePrices[q] ?? '';
    });

    const newTiers: PricingTier[] = combinations.map((combo, idx) => ({
      id: `tier-variant-${Date.now()}-${idx}`,
      name: `TIER ${idx + 1}`,
      basePrices: { ...templatePrices },
      attributes: combo.map((item, itemIdx) => ({
        id: `attr-rule-${Date.now()}-${idx}-${itemIdx}`,
        attributeCode: item.attributeCode,
        attributeValue: item.attributeValue,
        extraPrices: {},
      })),
    }));

    setPricingTiers(newTiers);
  };

  const handleCopyPricesToAllTiers = () => {
    if (pricingTiers.length <= 1) return;
    const sourcePrices = { ...(pricingTiers[0]?.basePrices || {}) };
    setPricingTiers(
      pricingTiers.map((t, idx) => (idx === 0 ? t : { ...t, basePrices: { ...sourcePrices } })),
    );
  };

  const handleDuplicateTier = (sourceTierId?: string) => {
    if (pricingTiers.length === 0) return;
    const sourceTier = sourceTierId
      ? pricingTiers.find((t) => t.id === sourceTierId)
      : pricingTiers[pricingTiers.length - 1];
    if (!sourceTier) return;

    const newIdx = pricingTiers.length + 1;
    const clonedTier: PricingTier = {
      id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `TIER ${newIdx}`,
      basePrices: { ...(sourceTier.basePrices || {}) },
      attributes: (sourceTier.attributes || []).map((attr, aIdx) => ({
        id: `attr-rule-${Date.now()}-${newIdx}-${aIdx}-${Math.random().toString(36).slice(2, 6)}`,
        attributeCode: attr.attributeCode,
        attributeValue: attr.attributeValue,
        extraPrices: { ...(attr.extraPrices || {}) },
      })),
    };

    setPricingTiers((prev) => [...prev, clonedTier]);
  };

  const handleUpdateTierExtraPrice = (
    tierId: string,
    attrRuleId: string,
    qty: number,
    val: string,
  ) => {
    const num = val === '' ? '' : parseFloat(val);
    setPricingTiers(
      pricingTiers.map((t) => {
        if (t.id !== tierId) return t;
        return {
          ...t,
          attributes: t.attributes.map((a) => {
            if (a.id !== attrRuleId) return a;
            return {
              ...a,
              extraPrices: {
                ...a.extraPrices,
                [qty]: isNaN(num as number) ? '' : num,
              },
            };
          }),
        };
      }),
    );
  };

  // ==========================================
  // IMAGE UPLOADS
  // ==========================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUploads: PendingImageUpload[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      newUploads.push({
        id: `img-${Date.now()}-${i}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        isPrimary: pendingImages.length === 0 && i === 0,
      });
    }

    setPendingImages([...pendingImages, ...newUploads]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (id: string) => {
    const target = pendingImages.find((img) => img.id === id);
    if (target?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(target.previewUrl);
    }
    const filtered = pendingImages.filter((img) => img.id !== id);
    if (target?.isPrimary && filtered.length > 0) {
      filtered[0].isPrimary = true;
    }
    setPendingImages(filtered);
  };

  const handleSetPrimaryImage = (id: string) => {
    setPendingImages(
      pendingImages.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      })),
    );
  };

  // ==========================================
  // CREATE PRODUCT SUBMISSION
  // ==========================================
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategoryId = categoryId;
    if (!name.trim()) {
      setCreateError('Please enter a product name.');
      return;
    }
    if (!finalCategoryId) {
      setCreateError('Please select a product category.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      // 1. Build Dynamic Fields from selected reusable attributes
      const fieldsPayload: any[] = [];
      let sortOrderCounter = 0;

      for (const attrId of Object.keys(selectedAttributes)) {
        const config = selectedAttributes[attrId];
        if (config.enabledOptionValues.length === 0) {
          setCreateError(
            `Attribute "${config.name}" has no values selected. Please choose at least one value or remove the attribute from this product.`,
          );
          setIsCreating(false);
          return;
        }

        const sharedAttr = attributeLibrary.find((a) => a.id === attrId);
        if (!sharedAttr) continue;

        const optionsForField = (sharedAttr.options || [])
          .filter((opt) => config.enabledOptionValues.includes(opt.value))
          .map((opt, oIdx) => ({
            label: opt.label,
            value: opt.value,
            priceModifierType: 'FIXED',
            priceModifier: 0,
            isDefault: oIdx === 0,
            sortOrder: oIdx,
          }));

        if (optionsForField.length === 0) continue;

        fieldsPayload.push({
          label: config.name,
          key: config.code,
          type: config.type || 'SELECT',
          description: config.description || undefined,
          isRequired: true,
          isCustomerVisible: true,
          isCustomerEditable: true,
          defaultValue: optionsForField[0]?.value || undefined,
          sortOrder: sortOrderCounter++,
          options: optionsForField,
        });
      }

      // 2. Base Unit Price & Quantity Brackets
      let calculatedBaseUnitPrice = 1.5;
      let minQtyToSave = 1;
      let maxQtyToSave = 100000;
      let parsedSingleRangesToSave: { min: number; max: number; key: string; label: string }[] = [];

      if (quantityType === 'Single') {
        const parseRes = parseQuantityRanges(singleQtyRangesInput);
        if (parseRes.error || parseRes.ranges.length === 0) {
          setCreateError(parseRes.error || 'Please define valid quantity ranges.');
          setIsCreating(false);
          return;
        }
        parsedSingleRangesToSave = parseRes.ranges;
        const firstR = parsedSingleRangesToSave[0];
        const lastR = parsedSingleRangesToSave[parsedSingleRangesToSave.length - 1];
        minQtyToSave = firstR.min;
        maxQtyToSave = lastR.max;
        calculatedBaseUnitPrice = Number(singleBasePrices[firstR.key]) || 200;
      } else {
        const firstTier = pricingTiers[0];
        const firstQty = standardQuantities[0] || 1;
        const firstRawPrice = Number(firstTier?.basePrices[firstQty]) || 0;
        calculatedBaseUnitPrice =
          firstRawPrice > 10 || firstQty === 1
            ? firstRawPrice / firstQty
            : firstRawPrice > 0
            ? firstRawPrice
            : 1.5;
        minQtyToSave = firstQty;
        maxQtyToSave = standardQuantities[standardQuantities.length - 1] || 100000;
      }

      // 3. Create the Product via Catalogue API
      const created = await api.adminCreateProduct({
        name: name.trim(),
        slug: slug.trim(),
        sku: sku.trim(),
        categoryId: finalCategoryId,
        description: description.trim() || undefined,
        basePrice: Number(calculatedBaseUnitPrice.toFixed(4)),
        minQuantity: minQtyToSave,
        maxQuantity: maxQtyToSave,
        quantityStep: quantityType === 'Single' ? 1 : 100,
        productionDays: Number(productionDays),
        tags: [
          ...(quantityType === 'Single' ? ['SINGLE_TYPE', `RANGES:${singleQtyRangesInput.trim()}`] : []),
          `DELIVERY:${deliveryTime.trim()}`,
        ],
        isFeatured: isFeatured,
        status: 'PUBLISHED',
        shippingChargeType: shippingChargeType,
        unitWeightGrams: Number(unitWeightGrams) || 0,
        courierCharge: Number(courierCharge) || 0,
        perAdditionalQtyRate: Number(perAdditionalQtyRate) || 0,
        freeShippingThreshold: Number(freeShippingThreshold) || 0,
        fields: fieldsPayload,
      });

      // 4. Upload Pending Images
      if (pendingImages.length > 0) {
        for (const img of pendingImages) {
          if (img.file) {
            try {
              await api.adminUploadProductImage(created.id, img.file, {
                altText: `${created.name} ${img.name}`,
                caption: img.name,
                isPrimary: img.isPrimary,
              });
            } catch (imgErr) {
              console.warn('Image upload notice:', imgErr);
            }
          }
        }
      }

      // 5. Save Pricing Rules
      const rulesPayload: CreatePricingRuleDto[] = [];

      if (quantityType === 'Single') {
        for (const tier of pricingTiers) {
          // 5a. Save base rate rule for the tier for each range
          for (const r of parsedSingleRangesToSave) {
            const rawPrice = Number(
              tier.basePrices[r.min] !== undefined && tier.basePrices[r.min] !== ''
                ? tier.basePrices[r.min]
                : singleBasePrices[r.key] || 0,
            );
            if (!isNaN(rawPrice) && rawPrice > 0) {
              rulesPayload.push({
                minQty: r.min,
                maxQty: r.max,
                unitPrice: Number(rawPrice.toFixed(4)),
                attributeCombination: {},
                label: `${tier.name} Base Rate`,
              });
            }
          }

          // 5b. Individual attribute rules with extra prices for each range
          for (const attr of tier.attributes) {
            if (attr.attributeCode && attr.attributeValue) {
              const attrConfig = Object.values(selectedAttributes).find((a) => a.code === attr.attributeCode);
              const attrDisplayName = attrConfig?.name || attr.attributeCode;
              const optLabel = getOptionLabel(attr.attributeCode, attr.attributeValue);

              for (const r of parsedSingleRangesToSave) {
                const basePrice = Number(
                  tier.basePrices[r.min] !== undefined && tier.basePrices[r.min] !== ''
                    ? tier.basePrices[r.min]
                    : singleBasePrices[r.key] || 0,
                );
                const uniqueKey = `${attr.attributeCode}:${attr.attributeValue}`;
                const extraPrice = Number(
                  attr.extraPrices?.[r.min] !== undefined && attr.extraPrices?.[r.min] !== ''
                    ? attr.extraPrices[r.min]
                    : singleExtraPrices[uniqueKey]?.[r.key] || 0,
                );
                const totalPrice = basePrice + extraPrice;

                if (totalPrice > 0) {
                  rulesPayload.push({
                    minQty: r.min,
                    maxQty: r.max,
                    unitPrice: Number(totalPrice.toFixed(4)),
                    attributeCombination: { [attr.attributeCode]: attr.attributeValue },
                    label: `${tier.name} (${attrDisplayName}: ${optLabel})`,
                  });
                }
              }
            }
          }

          // 5c. Combined combination rules
          if (tier.attributes.length > 1) {
            const combinedCombo: Record<string, string> = {};
            const labelParts: string[] = [];
            for (const attr of tier.attributes) {
              if (attr.attributeCode && attr.attributeValue) {
                combinedCombo[attr.attributeCode] = attr.attributeValue;
                const optLabel = getOptionLabel(attr.attributeCode, attr.attributeValue);
                labelParts.push(`${attr.attributeCode}:${optLabel}`);
              }
            }
            if (Object.keys(combinedCombo).length > 1) {
              for (const r of parsedSingleRangesToSave) {
                const basePrice = Number(
                  tier.basePrices[r.min] !== undefined && tier.basePrices[r.min] !== ''
                    ? tier.basePrices[r.min]
                    : singleBasePrices[r.key] || 0,
                );
                let totalExtra = 0;
                for (const attr of tier.attributes) {
                  const uniqueKey = `${attr.attributeCode}:${attr.attributeValue}`;
                  const extraPrice = Number(
                    attr.extraPrices?.[r.min] !== undefined && attr.extraPrices?.[r.min] !== ''
                      ? attr.extraPrices[r.min]
                      : singleExtraPrices[uniqueKey]?.[r.key] || 0,
                  );
                  totalExtra += extraPrice;
                }
                const totalPrice = basePrice + totalExtra;
                if (totalPrice > 0) {
                  rulesPayload.push({
                    minQty: r.min,
                    maxQty: r.max,
                    unitPrice: Number(totalPrice.toFixed(4)),
                    attributeCombination: combinedCombo,
                    label: `${tier.name} Combined (${labelParts.join(', ')})`,
                  });
                }
              }
            }
          }
        }
      } else {
        // Variable Type Pricing Matrix (100% Unchanged)
        for (const tier of pricingTiers) {
          // 5a. Save base rate rule for the tier
          for (const q of standardQuantities) {
            const rawPrice = Number(tier.basePrices[q]);
            if (!isNaN(rawPrice) && rawPrice > 0) {
              const unitRate = rawPrice > 10 || q === 1 ? rawPrice / q : rawPrice;
              rulesPayload.push({
                minQty: q,
                maxQty: q,
                unitPrice: Number(unitRate.toFixed(4)),
                attributeCombination: {},
                label: `${tier.name} Base Rate`,
              });
            }
          }

          // 5b. Save individual attribute rules with extra prices
          for (const attr of tier.attributes) {
            if (attr.attributeCode && attr.attributeValue) {
              const attrConfig = Object.values(selectedAttributes).find((a) => a.code === attr.attributeCode);
              const attrDisplayName = attrConfig?.name || attr.attributeCode;
              const optLabel = getOptionLabel(attr.attributeCode, attr.attributeValue);

              for (const q of standardQuantities) {
                const basePrice = Number(tier.basePrices[q]) || 0;
                const extraPrice = Number(attr.extraPrices?.[q]) || 0;
                const totalPrice = basePrice + extraPrice;

                if (totalPrice > 0) {
                  const unitRate = totalPrice > 10 || q === 1 ? totalPrice / q : totalPrice;
                  rulesPayload.push({
                    minQty: q,
                    maxQty: q,
                    unitPrice: Number(unitRate.toFixed(4)),
                    attributeCombination: { [attr.attributeCode]: attr.attributeValue },
                    label: `${tier.name} (${attrDisplayName}: ${optLabel})`,
                  });
                }
              }
            }
          }

          // 5c. Combined combination rule
          if (tier.attributes.length > 1) {
            const combinedCombo: Record<string, string> = {};
            const labelParts: string[] = [];
            for (const attr of tier.attributes) {
              if (attr.attributeCode && attr.attributeValue) {
                combinedCombo[attr.attributeCode] = attr.attributeValue;
                const optLabel = getOptionLabel(attr.attributeCode, attr.attributeValue);
                labelParts.push(`${attr.attributeCode}:${optLabel}`);
              }
            }
            if (Object.keys(combinedCombo).length > 1) {
              for (const q of standardQuantities) {
                const basePrice = Number(tier.basePrices[q]) || 0;
                let totalExtra = 0;
                for (const attr of tier.attributes) {
                  totalExtra += Number(attr.extraPrices?.[q]) || 0;
                }
                const totalPrice = basePrice + totalExtra;
                if (totalPrice > 0) {
                  const unitRate = totalPrice > 10 || q === 1 ? totalPrice / q : totalPrice;
                  rulesPayload.push({
                    minQty: q,
                    maxQty: q,
                    unitPrice: Number(unitRate.toFixed(4)),
                    attributeCombination: combinedCombo,
                    label: `${tier.name} Combined (${labelParts.join(', ')})`,
                  });
                }
              }
            }
          }
        }
      }

      if (rulesPayload.length > 0) {
        try {
          await api.adminSaveBatchPricingRules(created.id, rulesPayload);
        } catch (ruleErr) {
          console.warn('Pricing rules batch notice:', ruleErr);
        }
      }

      // 5. Clean reset form state
      setName('');
      setSlug('');
      setSku('');
      setDescription('');
      setSpecifications('');
      setQuantityType('Variable');
      setStockStatus('Available');
      setDeliveryTime('2-3 Working Days');
      setProductionDays(2);
      setSelectedAttributes({});
      setSelectedAttributeIdToAdd('');
      setStandardQuantities([100, 200, 300, 400, 500]);
      setCustomQuantities([]);
      setCustomQtyInput('');
      setCustomQtyError(null);
      setPricingTiers([
        {
          id: 'tier-1',
          name: 'TIER 1',
          basePrices: { 100: 150, 200: 280, 300: 390, 400: 500, 500: 600 },
          attributes: [],
        },
      ]);
      setPendingImages([]);
      setIsFeatured(false);
      setShippingChargeType('DEFAULT');
      setUnitWeightGrams(2.5);
      setCourierCharge(100);
      setPerAdditionalQtyRate(25);
      setFreeShippingThreshold(1000);
      setCreateSuccess(`Product "${created.name}" created and published successfully!`);

      // Refresh product list underneath
      await loadData();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create product.');
    } finally {
      setIsCreating(false);
    }
  };

  // ==========================================
  // EXISTING PRODUCT LIST ACTIONS
  // ==========================================
  const handleDuplicate = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.adminDuplicateProduct(id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate product.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetStatus = async (
    id: string,
    newStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  ) => {
    setActionLoadingId(id);
    try {
      if (newStatus === 'PUBLISHED') {
        await api.adminPublishProduct(id);
      } else if (newStatus === 'ARCHIVED') {
        await api.adminArchiveProduct(id);
      } else {
        await api.adminUpdateProduct(id, { status: 'DRAFT', isActive: true });
      }
      await loadData();
    } catch (err: any) {
      alert(err?.message || `Failed to update status.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete product "${prodName}"?\n\nIf the product has historical orders, it will be safely archived instead.`,
      )
    ) {
      return;
    }
    setActionLoadingId(id);
    try {
      await api.adminDeleteProduct(id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete product.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategoryFilter === 'ALL' || p.categoryId === selectedCategoryFilter;
      const matchesStatus =
        selectedStatusFilter === 'ALL' || p.status === selectedStatusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategoryFilter, selectedStatusFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* ============================================================ */}
      {/* TOP HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5 bg-white p-5 rounded-xl border shadow-xs">
        <div>
          <span className="text-[11px] font-mono uppercase font-semibold text-slate-400 block mb-1">
            CATALOGUE MANAGEMENT
          </span>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2]">
            Product Management
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Create products, select reusable attributes, set quantity pricing, and manage catalogue all in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/attributes">
            <Button variant="outline" size="md">
              <RiListSettingsLine className="h-4 w-4 mr-1.5" />
              <span>Attributes Library</span>
            </Button>
          </Link>
          <Link href="/admin/categories">
            <Button variant="outline" size="md">
              <span>Categories</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: ADD NEW PRODUCT FORM (TOP OF THE PAGE) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Add New Product</span>
            <span className="text-xs font-normal text-slate-400 font-mono">
              (Single-Page Product Creator)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter product details, attach reusable attributes, configure quantity rates, and save directly.
          </p>
        </div>

        {createSuccess && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiCheckLine className="h-4 w-4 text-emerald-600 font-bold" />
              <span>{createSuccess}</span>
            </div>
            <button
              onClick={() => setCreateSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs"
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
          </div>
        )}

        {createError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiCloseLine className="h-4 w-4 text-red-600 font-bold" />
              <span>{createError}</span>
            </div>
            <button
              onClick={() => setCreateError(null)}
              className="text-red-700 hover:text-red-900 text-xs"
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleCreateProduct} className="space-y-6 text-xs">
          {/* Row 1: Core Product Fields (4 Columns Desktop / 2 Tablet / 1 Mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Premium Visiting Cards"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                required
              >
                <option value="" disabled>
                  Select Category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Type — Exactly Three Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Quantity Type
              </label>
              <select
                value={quantityType}
                onChange={(e) => handleQuantityTypeChange(e.target.value as any)}
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="Variable">Variable</option>
                <option value="Single">Single</option>
              </select>
            </div>

            {/* Stock — Available / Not Available */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Stock
              </label>
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as 'Available' | 'Not Available')}
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="Available">Available</option>
                <option value="Not Available">Not Available</option>
              </select>
            </div>
          </div>

          {/* Row 2: Secondary Fields (Delivery Time, SKU — Min Quantity removed) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Delivery Time / Turnaround
                </label>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    deliveryTime.toLowerCase().includes('single')
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {deliveryTime.toLowerCase().includes('single')
                    ? '⚡ Single Day Delivery'
                    : `${productionDays} Working Days`}
                </span>
              </div>
              <input
                type="text"
                value={deliveryTime}
                onChange={(e) => handleDeliveryTimeInput(e.target.value)}
                onBlur={handleDeliveryTimeBlur}
                placeholder="Enter 1 for Single Day Delivery or 2 for 2 Working Days"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => applyDeliveryPreset(1)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                    deliveryTime.toLowerCase().includes('single')
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Single Day Delivery (1 Day)"
                >
                  ⚡ 1 (Single Day Delivery)
                </button>
                <button
                  type="button"
                  onClick={() => applyDeliveryPreset(2)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                    deliveryTime === '2 Working Days'
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="2 Working Days"
                >
                  2 Working Days
                </button>
                <button
                  type="button"
                  onClick={() => applyDeliveryPreset(3)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                    deliveryTime === '3 Working Days'
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="3 Working Days"
                >
                  3 Working Days
                </button>
                <button
                  type="button"
                  onClick={() => applyDeliveryPreset('2-3')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                    deliveryTime === '2-3 Working Days'
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="2-3 Working Days"
                >
                  2-3 Working Days
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                SKU Code
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="PRD-BC-001"
                className="w-full h-10 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Row 3: Description & Specifications (Full-width textareas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed print description, finishing options, paper stocks, and customer notes..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Specifications & Dimensions
              </label>
              <textarea
                rows={3}
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                placeholder="Standard Size: 89 x 54 mm, Bleed: 3mm, Resolution: 300 DPI CMYK..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION: COURIER & DELIVERY CHARGE SETTINGS */}
          {/* ============================================================ */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RiTruckLine className="h-4 w-4 text-slate-800" />
                <span>Courier & Delivery Charge Configuration</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure item-specific courier charge rules, unit piece weight (in grams), and quantity-wise surcharges.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200/90 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                  Courier Calculation Mode
                </label>
                <select
                  value={shippingChargeType}
                  onChange={(e) => setShippingChargeType(e.target.value as any)}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-medium"
                >
                  <option value="DEFAULT">DEFAULT (Store Policy)</option>
                  <option value="FIXED">FIXED (Custom Flat Fee)</option>
                  <option value="FREE">FREE (Free Delivery)</option>
                  <option value="QUANTITY_BASED">QUANTITY_BASED</option>
                  <option value="WEIGHT_BASED">WEIGHT_BASED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                  Unit Weight (Grams / pc)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={unitWeightGrams}
                  onChange={(e) => setUnitWeightGrams(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 2.5"
                  className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                  Custom Courier Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={courierCharge}
                  onChange={(e) => setCourierCharge(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 100"
                  className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                  Qty Step Surcharge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={perAdditionalQtyRate}
                  onChange={(e) => setPerAdditionalQtyRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 25"
                  className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                  Free Shipping Threshold (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 1000"
                  className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 2: PRODUCT ATTRIBUTES */}
          {/* ============================================================ */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Product Attributes
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select attributes; all of their values will appear in the pricing grid
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 bg-slate-100/90 px-3 py-1 rounded-full border border-slate-200/60 font-mono">
                  {Object.keys(selectedAttributes).length} of {attributeLibrary.length} active
                </span>
                <Link
                  href="/admin/attributes"
                  target="_blank"
                  className="text-xs text-slate-600 hover:text-slate-950 flex items-center gap-1 font-medium hover:underline ml-2"
                  title="Manage Reusable Attributes Library in a new tab"
                >
                  <RiListSettingsLine className="h-3.5 w-3.5" />
                  <span>Library</span>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenNewAttrModal}
                  className="h-8 text-xs font-semibold"
                >
                  <RiAddLine className="h-3.5 w-3.5 mr-1" />
                  <span>Add Attribute</span>
                </Button>
              </div>
            </div>

            {/* Reusable Attributes Grid (8 columns matching reference UI) */}
            {attributeLibrary.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-2xl bg-white text-center">
                <p className="text-xs text-slate-500">
                  No attributes found in the library. Click "Add Attribute" above to create one.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                {attributeLibrary.map((attr) => {
                  const isActive = Boolean(selectedAttributes[attr.id]);
                  const optCount = (attr.options || []).length;
                  const typeLabel = (attr.type || 'select').toLowerCase();

                  return (
                    <button
                      type="button"
                      key={attr.id}
                      onClick={() => handleToggleAttributeForProduct(attr.id)}
                      className={`group text-left rounded-2xl border p-3 flex flex-col justify-between min-h-[92px] transition-all duration-150 cursor-pointer select-none ${
                        isActive
                          ? 'border-2 border-slate-900 bg-slate-50/90 shadow-xs ring-1 ring-slate-900/10'
                          : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 w-full">
                        <span
                          className={`font-bold text-[11px] sm:text-xs uppercase tracking-wide leading-tight line-clamp-2 ${
                            isActive ? 'text-slate-950 font-extrabold' : 'text-slate-800'
                          }`}
                        >
                          {attr.name}
                        </span>
                        {isActive && (
                          <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="pt-2 mt-auto border-t border-slate-100 group-hover:border-slate-200 transition-colors w-full">
                        <span
                          className={`text-[10px] sm:text-[11px] font-normal lowercase tracking-tight ${
                            isActive ? 'text-slate-600 font-medium' : 'text-slate-400'
                          }`}
                        >
                          {typeLabel} · {optCount} values.
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active Attributes Configuration & Values Fine-Tuning */}
            {Object.keys(selectedAttributes).length > 0 && (
              <div className="space-y-3">
                {Object.keys(selectedAttributes).map((attrId) => {
                  const config = selectedAttributes[attrId];
                  const sharedAttr = attributeLibrary.find((a) => a.id === attrId);
                  if (!sharedAttr) return null;

                  const rawOptions = sharedAttr.options || [];
                  const seenValues = new Set<string>();
                  const allOptions = (Array.isArray(rawOptions) ? rawOptions : []).filter((opt) => {
                    const val = String(opt?.value ?? '');
                    if (!val || seenValues.has(val)) return false;
                    seenValues.add(val);
                    return true;
                  });
                  const enabledCount = config.enabledOptionValues.length;

                  return (
                    <div
                      key={attrId}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
                    >
                      {/* Attribute Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {config.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            ({enabledCount} of {allOptions.length} values selected)
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenAddValue(sharedAttr)}
                            className="text-xs text-slate-700 hover:text-slate-950 font-semibold flex items-center gap-1 hover:underline"
                          >
                            <RiAddLine className="h-3.5 w-3.5" />
                            <span>Add Value</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttributeFromProduct(attrId)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                            title="Remove this attribute from current product (does not delete from shared library)"
                          >
                            <RiCloseLine className="h-3.5 w-3.5" />
                            <span>Remove Attribute</span>
                          </button>
                        </div>
                      </div>

                      {/* Manual Attribute Values: simple editable list */}
                      {allOptions.length === 0 ? (
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                          <p className="text-xs text-slate-500">
                            No shared values defined for this attribute yet.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenAddValue(sharedAttr)}
                            className="text-xs text-blue-600 hover:underline font-semibold mt-1"
                          >
                            + Add Value
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {allOptions.map((opt, optIdx) => {
                            const isChecked = config.enabledOptionValues.includes(opt.value);

                            return (
                              <div
                                key={`${attrId}-${opt.value}-${optIdx}`}
                                className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                                  isChecked
                                    ? 'border-slate-900 bg-slate-50/70 shadow-xs'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleOptionValue(attrId, opt.value)}
                                    className="accent-slate-900 h-3.5 w-3.5 rounded"
                                  />
                                  <span
                                    className={`truncate font-medium ${
                                      isChecked
                                        ? 'text-slate-900 font-semibold'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {opt.label || opt.value}
                                  </span>
                                </label>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditValue(sharedAttr, optIdx)}
                                    className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                                    title="Edit Value in Library"
                                  >
                                    <RiEditLine className="h-3.5 w-3.5" />
                                  </button>
                                  {isChecked && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveValueFromProduct(attrId, opt.value)}
                                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                      title="Remove Value from this product"
                                    >
                                      <RiCloseLine className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* SECTION 3: COMBINATIONS PRICING GRID */}
          {/* ============================================================ */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Combinations Pricing Grid</span>
                  <span className="text-[11px] font-normal font-mono text-slate-400">
                    ({gridColumns.length} quantity column{gridColumns.length === 1 ? '' : 's'}, {pricingTiers.length} variant tier{pricingTiers.length === 1 ? '' : 's'})
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Configure variant pricing rules, attribute combinations, and standard quantity brackets.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateAllVariants}
                  className="h-8 text-xs shrink-0 font-bold bg-[#FFED00] text-slate-950 hover:bg-[#FCDD55] shadow-2xs"
                  title="Generate all combinations of attached attributes (Cartesian product)"
                >
                  <RiSparklingFill className="h-3.5 w-3.5 mr-1" />
                  <span>Generate All Variants</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicateTier()}
                  className="h-8 text-xs shrink-0"
                  title="Duplicate tier with its attribute combinations and pricing"
                >
                  <RiFileCopyLine className="h-3.5 w-3.5 mr-1" />
                  <span>Duplicate Tier</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTier}
                  className="h-8 text-xs shrink-0"
                >
                  <RiAddLine className="h-3.5 w-3.5 mr-1" />
                  <span>Add Tier</span>
                </Button>
              </div>
            </div>

            {/* Quantity Columns Toolbar: Ranges Toolbar for Single Type, Standard Qtys for Variable Type */}
            {quantityType === 'Single' ? (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span>Quantity Ranges (Columns)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#FFED00] text-slate-950 font-bold border border-[#E3A008]">
                      Single Type
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Example: 1-5, 6-10, 11-20 or 1-15, 16-30, 31-45
                  </span>
                </div>
                <input
                  type="text"
                  value={singleQtyRangesInput}
                  onChange={(e) => handleSingleRangesInputChange(e.target.value)}
                  placeholder="1-5, 6-10, 11-20"
                  className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                />
                {singleRangesParseError ? (
                  <p className="text-[11px] text-rose-600 font-medium">{singleRangesParseError}</p>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[11px] text-slate-500 font-mono">Pricing columns:</span>
                    {parsedSingleRanges.map((r) => (
                      <span
                        key={r.key}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-900 text-white"
                      >
                        Qty {r.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-600 font-mono font-semibold mr-1">
                      Standard Quantities:
                    </span>
                    {displayQuantities.map((qty) => {
                      const isSelected = standardQuantities.includes(qty);
                      const isCustom = !PRESET_QUANTITIES.includes(qty);
                      return (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => handleToggleQuantityColumn(qty)}
                          title={
                            isSelected
                              ? `Click to remove Qty ${qty.toLocaleString()} column`
                              : `Click to add Qty ${qty.toLocaleString()} column`
                          }
                          className={`group relative inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all border ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <span className="text-emerald-400 group-hover:hidden text-[10px] font-bold">✓</span>
                              <span className="text-red-400 hidden group-hover:inline text-[10px] font-bold">×</span>
                              <span>{qty.toLocaleString()}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-400 text-[10px] font-bold">+</span>
                              <span>{qty.toLocaleString()}</span>
                            </>
                          )}
                          {isCustom && !isSelected && (
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomQuantities((prev) => prev.filter((q) => q !== qty));
                              }}
                              className="ml-0.5 text-slate-400 hover:text-red-500 font-bold px-0.5"
                              title="Delete custom quantity"
                            >
                              ×
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Quantity Input */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-slate-500 font-mono font-medium">Custom:</span>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 750"
                        value={customQtyInput}
                        onChange={(e) => {
                          setCustomQtyInput(e.target.value);
                          if (customQtyError) setCustomQtyError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomQuantity();
                          }
                        }}
                        className="h-7 w-20 px-2 text-xs font-mono rounded-l-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomQuantity}
                        className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-r-lg border border-slate-900 transition-colors flex items-center gap-1"
                        title="Add custom quantity column"
                      >
                        <RiAddLine className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {customQtyError && (
                  <p className="text-[11px] text-rose-600 font-medium px-1">
                    {customQtyError}
                  </p>
                )}
              </div>
            )}

            {/* Unified Combinations Pricing Grid Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-mono font-semibold">
                  <tr>
                    <th className="py-3 px-4 min-w-[300px]">Attributes (Rule)</th>
                    {gridColumns.map((col) => (
                      <th key={col.qty} className="py-3 px-3 min-w-[130px] text-center font-mono">
                        <div className="flex items-center justify-center gap-1">
                          <span>{col.headerLabel}</span>
                          {!col.isSingleRange && standardQuantities.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuantityColumn(col.qty)}
                              className="text-slate-300 hover:text-red-500 font-normal text-xs px-0.5"
                              title={`Remove ${col.headerLabel}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-4 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pricingTiers.map((tier, tierIdx) => (
                    <tr key={tier.id} className="bg-white hover:bg-slate-50/30 transition-colors">
                      {/* Column 1: Attributes (Rule) */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-3">
                          <span className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono block">
                            {tier.name || `TIER ${tierIdx + 1}`}
                          </span>

                          {/* Attribute Rules List */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-[280px]">
                            {tier.attributes.map((attrRule) => {
                              const currentAttrConfig = Object.values(selectedAttributes).find(
                                (a) => a.code === attrRule.attributeCode,
                              );
                              const attrDisplayName =
                                currentAttrConfig?.name || attrRule.attributeCode || 'ATTRIBUTE';

                              return (
                                <div key={attrRule.id} className="space-y-1 w-full min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span
                                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono truncate max-w-[100px]"
                                      title={attrDisplayName}
                                    >
                                      {attrDisplayName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAttributeFromTier(tier.id, attrRule.id)}
                                      className="text-red-400 hover:text-red-600 text-xs font-semibold ml-1 transition-colors leading-none"
                                      title={`Remove ${attrDisplayName}`}
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  <select
                                    value={attrRule.attributeValue}
                                    onChange={(e) =>
                                      handleUpdateTierAttributeValue(tier.id, attrRule.id, e.target.value)
                                    }
                                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 shadow-2xs font-medium"
                                  >
                                    <option value="">Any / Select</option>
                                    {currentAttrConfig?.enabledOptionValues.map((val) => (
                                      <option key={val} value={val}>
                                        {getOptionLabel(currentAttrConfig.code, val)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>

                          {/* + Add Attribute Value button — only selected attributes for this product */}
                          <div>
                            {(() => {
                              const productAttributes = Object.values(selectedAttributes);
                              if (productAttributes.length === 0) {
                                return (
                                  <span className="text-[11px] text-amber-600 font-medium italic bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-block">
                                    Select attributes above first
                                  </span>
                                );
                              }

                              const selectedCodesInTier = new Set(
                                tier.attributes.map((a) => a.attributeCode.toLowerCase()),
                              );
                              // Attached attributes not yet in this tier
                              const notYetInTier = productAttributes.filter(
                                (a) => !selectedCodesInTier.has(a.code.toLowerCase()),
                              );
                              // Attached attributes already in this tier
                              const alreadyInTier = productAttributes.filter(
                                (a) => selectedCodesInTier.has(a.code.toLowerCase()),
                              );

                              return (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAddAttributeToTier(tier.id, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  value=""
                                  className="h-7 px-2.5 text-[11px] text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-400 font-semibold cursor-pointer transition-colors"
                                >
                                  <option value="" disabled>
                                    + Add Attribute Value
                                  </option>

                                  {notYetInTier.map((a) => (
                                    <option key={a.code} value={a.code}>
                                      + {a.name}
                                    </option>
                                  ))}

                                  {/* If all attributes are already in this tier, keep them available so user is never limited */}
                                  {alreadyInTier.map((a) => (
                                    <option key={`again-${a.code}`} value={a.code}>
                                      + {a.name} {notYetInTier.length === 0 ? '' : '(Add another)'}
                                    </option>
                                  ))}
                                </select>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Qty Price Columns */}
                      {gridColumns.map((col) => {
                        const qty = col.qty;
                        const baseVal = tier.basePrices[qty] ?? '';
                        const numBase = Number(baseVal || 0);
                        let runningTotal = numBase;

                        return (
                          <td key={qty} className="py-3.5 px-3 align-top">
                            <div className="space-y-3 text-center">
                              {/* 1. Base Price Input */}
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  Price for {col.fieldLabel}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="Price"
                                  value={baseVal}
                                  onChange={(e) =>
                                    handleUpdateTierBasePrice(tier.id, qty, e.target.value)
                                  }
                                  className="w-full h-9 px-2 text-center text-xs font-mono font-medium bg-slate-50/60 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-all shadow-2xs"
                                />
                                <span className="text-[11px] text-slate-500 block font-mono">
                                  Price: ₹{numBase.toFixed(2)}{col.isSingleRange ? ' / pc' : ''}
                                </span>
                              </div>

                              {/* 2. Extra Price for each Attribute in this combination */}
                              {tier.attributes.map((attrRule) => {
                                const currentAttrConfig = Object.values(selectedAttributes).find(
                                  (a) => a.code === attrRule.attributeCode,
                                );
                                const attrDisplayName =
                                  currentAttrConfig?.name || attrRule.attributeCode || 'Attribute';
                                const optLabel = attrRule.attributeValue
                                  ? getOptionLabel(attrRule.attributeCode, attrRule.attributeValue)
                                  : '';
                                const extraVal = attrRule.extraPrices?.[qty] ?? '';
                                const numExtra = Number(extraVal || 0);
                                runningTotal += numExtra;
                                const withThisTotal = runningTotal;

                                return (
                                  <div key={attrRule.id} className="space-y-1">
                                    <span
                                      className="text-[10px] text-slate-400 block font-mono truncate"
                                      title={`${attrDisplayName}${optLabel ? `: ${optLabel}` : ''} extra`}
                                    >
                                      {attrDisplayName}{optLabel ? `: ${optLabel}` : ''} extra
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      placeholder="Extra price"
                                      value={extraVal}
                                      onChange={(e) =>
                                        handleUpdateTierExtraPrice(tier.id, attrRule.id, qty, e.target.value)
                                      }
                                      className="w-full h-9 px-2 text-center text-xs font-mono font-medium bg-slate-50/60 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-all shadow-2xs"
                                    />
                                    <span className="text-[11px] text-slate-500 block font-mono">
                                      With this: ₹{withThisTotal.toFixed(2)}{col.isSingleRange ? ' / pc' : ''}
                                    </span>
                                  </div>
                                );
                              })}

                              {/* 3. Total Price for this Quantity at the end of the combination */}
                              {(() => {
                                const totalExtraForQty = tier.attributes.reduce((sum, a) => {
                                  const v = Number(a.extraPrices?.[qty] || 0);
                                  return sum + (isNaN(v) ? 0 : v);
                                }, 0);
                                const totalCombinationPrice = numBase + totalExtraForQty;
                                const unitRate = col.isSingleRange
                                  ? totalCombinationPrice
                                  : qty > 0 ? totalCombinationPrice / qty : 0;

                                return (
                                  <div className="pt-2 mt-2 border-t border-slate-200 bg-emerald-50/70 border border-emerald-200/70 rounded-lg p-2 text-center shadow-2xs">
                                    <div className="text-[9px] uppercase font-bold text-emerald-800 font-mono tracking-wider">
                                      Total ({col.fieldLabel})
                                    </div>
                                    <div className="text-sm font-bold font-mono text-emerald-700 leading-tight mt-0.5">
                                      ₹{totalCombinationPrice.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </div>
                                    {col.isSingleRange ? (
                                      <div className="text-[9px] text-emerald-600 font-mono mt-0.5">
                                        ₹{totalCombinationPrice.toFixed(2)}/pc
                                      </div>
                                    ) : (
                                      qty > 1 && totalCombinationPrice > 0 && (
                                        <div className="text-[9px] text-emerald-600 font-mono mt-0.5">
                                          ₹{unitRate.toFixed(2)}/unit
                                        </div>
                                      )
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                        );
                      })}

                      {/* Action: Duplicate & Trash */}
                      <td className="py-3.5 px-4 align-top text-center pt-5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateTier(tier.id)}
                            className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex items-center justify-center"
                            title={`Duplicate ${tier.name || 'Tier'}`}
                          >
                            <RiFileCopyLine className="h-4 w-4" />
                          </button>
                          {pricingTiers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTier(tier.id)}
                              className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors inline-flex items-center justify-center"
                              title={`Remove ${tier.name}`}
                            >
                              <RiDeleteBin7Line className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 4: FEATURED OPTION & IMAGE UPLOAD */}
          {/* ============================================================ */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Featured Option */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="font-bold text-slate-900 text-xs block">
                Featured Product
              </span>
              <p className="text-[11px] text-slate-500">
                Display this product on storefront homepage highlights and featured banners.
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 rounded"
                />
                <span className="font-semibold text-slate-800 text-xs">
                  Mark as Featured Product
                </span>
              </label>
            </div>

            {/* Compact Image Upload Area */}
            <div className="md:col-span-2 space-y-3">
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  Product Images & Media
                </span>
                <p className="text-[11px] text-slate-500">
                  Upload product photography and thumbnails. The first or selected image acts as primary.
                </p>
              </div>

              {/* Compact Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-900 bg-slate-50/50 hover:bg-white transition-all cursor-pointer flex items-center justify-center gap-3 text-center"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <RiUploadCloud2Line className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Click or drag & drop images to upload
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    PNG, JPG, WEBP up to 25MB each
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Image Previews */}
              {pendingImages.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {pendingImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden group bg-slate-100"
                    >
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimaryImage(img.id);
                          }}
                          className={`p-1 rounded text-[10px] font-bold ${
                            img.isPrimary
                              ? 'bg-[#FFED00] text-slate-950'
                              : 'bg-white text-slate-800 hover:bg-slate-100'
                          }`}
                          title="Set as Primary Image"
                        >
                          {img.isPrimary ? 'Primary' : 'Make 1st'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(img.id);
                          }}
                          className="p-1 rounded bg-red-600 text-white hover:bg-red-700"
                          title="Remove Image"
                        >
                          <RiCloseLine className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {img.isPrimary && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FFED00] text-slate-950 border border-[#E3A008]/40 shadow-xs">
                          PRIMARY
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 5: CREATE PRODUCT SUBMIT BUTTON */}
          {/* ============================================================ */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Ready to publish to storefront catalogue
            </span>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isCreating}
              className="bg-[#FFED00] text-slate-950 hover:bg-[#FCDD55] font-bold shadow-sm"
            >
              {isCreating ? (
                <>
                  <RiLoader4Line className="h-4 w-4 mr-2 animate-spin" />
                  <span>Creating & Publishing Product...</span>
                </>
              ) : (
                <>
                  <RiAddLine className="h-4 w-4 mr-1.5" />
                  <span>Create Product</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* ============================================================ */}
      {/* SECTION 6: EXISTING PRODUCT LIST (UNDERNEATH THE FORM) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Existing Products</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {filteredProducts.length} items
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage existing catalogue items, statuses, and duplication.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative w-64">
              <RiSearch2Line className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, SKU, slug..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="h-9 px-3 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-xs font-mono text-slate-500">
              Loading Products Catalog...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No products match your criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-mono font-semibold">
                <tr>
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Attributes</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const primaryImg =
                    p.images?.find((img) => img.isPrimary) || p.images?.[0];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {primaryImg ? (
                              <img
                                src={resolveImageUrl(primaryImg.url)}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <RiImage2Line className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {p.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              SKU: {p.sku} | /{p.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium">
                          {p.category?.name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(Number(p.basePrice))}
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          min {p.minQuantity} units
                        </span>
                      </td>

                      {/* Attributes */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.fields && p.fields.length > 0 ? (
                            p.fields.map((f) => (
                              <span
                                key={f.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {f.label}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px] font-mono">
                              0 attributes
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4 font-mono">
                        {p.trackInventory ? (
                          <span
                            className={
                              p.stockQuantity <= (p.lowStockAlert || 10)
                                ? 'text-amber-600 font-bold'
                                : 'text-slate-700'
                            }
                          >
                            {p.stockQuantity} units
                          </span>
                        ) : (
                          <span className="text-slate-400">Unlimited</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            p.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Product Details Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(p)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                            title="View Product Details"
                          >
                            <RiEyeLine className="h-4 w-4" />
                          </button>

                          {/* Configure / Full Studio */}
                          <Link href={`/admin/products/${p.id}`}>
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                              title="Edit Product"
                            >
                              <RiEditLine className="h-4 w-4" />
                            </button>
                          </Link>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(p.id)}
                            disabled={actionLoadingId === p.id}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                            title="Duplicate Product"
                          >
                            <RiFileCopyLine className="h-4 w-4" />
                          </button>

                          {/* Publish / Unpublish */}
                          {p.status === 'PUBLISHED' ? (
                            <button
                              type="button"
                              onClick={() => handleSetStatus(p.id, 'ARCHIVED')}
                              disabled={actionLoadingId === p.id}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                              title="Archive / Unpublish"
                            >
                              <RiArchiveLine className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetStatus(p.id, 'PUBLISHED')}
                              disabled={actionLoadingId === p.id}
                              className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-40"
                              title="Publish to Storefront"
                            >
                              <RiCheckboxCircleLine className="h-4 w-4" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={actionLoadingId === p.id}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-700 disabled:opacity-40"
                            title="Delete Product"
                          >
                            <RiDeleteBin7Line className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* INLINE MODAL: ADD REUSABLE ATTRIBUTE TO LIBRARY */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAttrModalOpen}
        onClose={() => setIsAttrModalOpen(false)}
        title="Add New Reusable Attribute"
        maxWidth="xl"
      >
        <form onSubmit={handleSaveNewReusableAttribute} className="space-y-4 text-xs">
          {attrModalError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {attrModalError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attribute Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newAttrName}
                onChange={(e) => handleNewAttrNameChange(e.target.value)}
                placeholder="e.g. Special Finish, GSM, Color"
                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newAttrCode}
                onChange={(e) => setNewAttrCode(e.target.value)}
                placeholder="e.g. special_finish"
                className="w-full h-9 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Input Type
              </label>
              <select
                value={newAttrType}
                onChange={(e) => setNewAttrType(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="SELECT">Select Dropdown</option>
                <option value="RADIO">Radio Buttons</option>
                <option value="CHECKBOX">Checkbox</option>
                <option value="TEXT">Text Input</option>
                <option value="TEXTAREA">Text Box</option>
                <option value="TOGGLE">Toggle Switch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newAttrDesc}
                onChange={(e) => setNewAttrDesc(e.target.value)}
                placeholder="Explanation for customers"
                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Options Rows */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Attribute Options
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddNewAttrOptionRow}
                className="h-7 text-[11px]"
              >
                <RiAddLine className="h-3 w-3 mr-1" />
                Add Option
              </Button>
            </div>

            <div className="space-y-2">
              {newAttrOptions.map((opt, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) =>
                        handleNewAttrOptionChange(idx, 'label', e.target.value)
                      }
                      placeholder="Option Value (e.g. 350 GSM, Matte, Double Side)"
                      className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewAttrOptionRow(idx)}
                    disabled={newAttrOptions.length <= 1}
                    className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                  >
                    <RiCloseLine className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAttrModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingAttr}
              className="bg-[#FFED00] text-slate-950 hover:bg-[#FCDD55] font-bold"
            >
              {isSavingAttr ? 'Saving...' : 'Save & Attach to Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: ADD / EDIT VALUE FOR REUSABLE ATTRIBUTE */}
      {/* ============================================================ */}
      <Modal
        isOpen={Boolean(valueModalAttr)}
        onClose={() => setValueModalAttr(null)}
        title={
          valueModalEditingIndex !== null
            ? `Edit Value for ${valueModalAttr?.name}`
            : `Add Value for ${valueModalAttr?.name}`
        }
      >
        <form onSubmit={handleSaveValueModal} className="p-4 space-y-4">
          {valModalError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {valModalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Value Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={valModalName}
              onChange={(e) => setValModalName(e.target.value)}
              placeholder="e.g. Single Side, Double Side, Glossy, 350 GSM..."
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {valueModalEditingIndex !== null
                ? 'Updates this value label in the shared attributes library.'
                : 'This value will be added to the shared library and enabled for this product.'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValueModalAttr(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingValModal}
              className="bg-[#FFED00] text-slate-950 hover:bg-[#FCDD55] font-bold"
            >
              {isSavingValModal ? 'Saving...' : 'Save Value'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: VIEW PRODUCT DETAILS (SCREENSHOT 3 SPEC) */}
      {/* ============================================================ */}
      {viewingProduct && (() => {
        const isSingle =
          viewingProduct.tags?.includes('SINGLE_TYPE') ||
          viewingProduct.tags?.includes('QTY_TYPE:SINGLE') ||
          viewingProduct.quantityStep === 1;

        const primaryImg =
          viewingProduct.images?.find((img) => img.isPrimary) || viewingProduct.images?.[0];

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setViewingProduct(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight truncate">
                      {viewingProduct.name}
                    </h2>
                    {viewingProduct.isFeatured && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-900 border border-amber-200 shrink-0">
                        <RiStarFill className="h-3 w-3 text-amber-500" />
                        <span>Featured</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Category: <span className="text-slate-700 font-semibold">{viewingProduct.category?.name || 'Unassigned'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                  title="Close modal"
                >
                  <RiCloseLine className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
                {modalEditError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                    {modalEditError}
                  </div>
                )}

                {/* Primary Image Preview Container */}
                <div className="w-full bg-[#f8fafc] border border-slate-100 rounded-xl p-4 flex items-center justify-center min-h-[220px] max-h-[300px] overflow-hidden">
                  {primaryImg ? (
                    <img
                      src={resolveImageUrl(primaryImg.url)}
                      alt={viewingProduct.name}
                      className="max-h-[260px] max-w-full object-contain drop-shadow-sm transition-transform hover:scale-105 duration-300 rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2 py-8">
                      <RiImage2Line className="h-12 w-12 stroke-[1.5]" />
                      <span className="text-xs font-mono">No image available</span>
                    </div>
                  )}
                </div>

                {/* Inline Editing Inputs OR Stat Cards */}
                {isModalInlineEditing ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-slate-800 uppercase font-mono">
                      Quick Edit Product Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Product Name
                        </label>
                        <input
                          type="text"
                          value={modalEditName}
                          onChange={(e) => setModalEditName(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Base Price (₹)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={modalEditPrice}
                          onChange={(e) => setModalEditPrice(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Status
                        </label>
                        <select
                          value={modalEditStatus}
                          onChange={(e) => setModalEditStatus(e.target.value as any)}
                          className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                        >
                          <option value="PUBLISHED">Published (active)</option>
                          <option value="DRAFT">Draft</option>
                          <option value="ARCHIVED">Archived</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Stock Quantity
                        </label>
                        <input
                          type="number"
                          value={modalEditStock}
                          onChange={(e) => setModalEditStock(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsModalInlineEditing(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveModalInlineEdit}
                        disabled={isSavingModalEdit}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
                      >
                        {isSavingModalEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 4 Key Metrics Cards */
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* STATUS */}
                    <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                        STATUS
                      </span>
                      <div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            viewingProduct.status === 'PUBLISHED'
                              ? 'bg-[#e6f7ed] text-[#12a150]'
                              : viewingProduct.status === 'DRAFT'
                              ? 'bg-amber-100/70 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {viewingProduct.status === 'PUBLISHED' ? 'active' : viewingProduct.status?.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    {/* STOCK */}
                    <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                        STOCK
                      </span>
                      <span className="text-sm font-bold text-[#12a150] block truncate">
                        {viewingProduct.trackInventory
                          ? `${viewingProduct.stockQuantity} units`
                          : 'Available'}
                      </span>
                    </div>

                    {/* QUANTITY TYPE */}
                    <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                        QUANTITY TYPE
                      </span>
                      <span className="text-sm font-bold text-slate-800 block truncate">
                        {isSingle ? 'Single (Counting)' : 'Variable'}
                      </span>
                    </div>

                    {/* BASE / MIN PRICE */}
                    <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                        BASE / MIN PRICE
                      </span>
                      <span className="text-sm font-bold text-[#1a73e8] block truncate font-mono">
                        ₹ {Number(viewingProduct.basePrice || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Assigned Attributes Breakdown */}
                <div className="border border-slate-200/80 rounded-2xl p-4 space-y-3 bg-white">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                    ASSIGNED ATTRIBUTES
                  </h3>
                  {viewingProduct.fields && viewingProduct.fields.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {viewingProduct.fields.map((f: any) => (
                        <div
                          key={f.id || f.key}
                          className="bg-white border border-slate-200/90 rounded-xl p-3.5 space-y-2 shadow-2xs"
                        >
                          <span className="text-xs font-bold text-[#1e293b] block truncate">
                            {f.label}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {f.options && f.options.length > 0 ? (
                              f.options.map((opt: any) => (
                                <span
                                  key={opt.id || opt.value}
                                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#f1f5f9] text-[#334155] border border-slate-200/50"
                                >
                                  {opt.label || opt.value}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No option values</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      No custom attributes configured for this product.
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:px-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-slate-400 font-mono">
                  Created: {formatCreatedDate(viewingProduct.createdAt)}
                </span>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {!isModalInlineEditing && (
                    <button
                      type="button"
                      onClick={() => setIsModalInlineEditing(true)}
                      className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                      title="Quick edit product details directly inside this modal"
                    >
                      Quick Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const prodId = viewingProduct.id;
                      setViewingProduct(null);
                      router.push(`/admin/products/${prodId}`);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#5349e0] hover:bg-[#4338ca] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <RiEditLine className="h-3.5 w-3.5" />
                    <span>Edit Product</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingProduct(null)}
                    className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
