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
      alert('This attribute is already attached to this product.');
      return;
    }

    const attr = attributeLibrary.find((a) => a.id === attrId);
    if (!attr) return;

    // Attach attribute with empty values by default (admin manually selects values)
    setSelectedAttributes((prev) => ({
      ...prev,
      [attr.id]: {
        attributeId: attr.id,
        name: attr.name,
        code: attr.code,
        type: attr.type,
        description: attr.description,
        enabledOptionValues: [],
        isOptionalAddOn: Boolean(attr.isOptionalAddOn || attr.options?.[0]?.isOptionalAddOn),
      },
    }));
    setSelectedAttributeIdToAdd('');
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

  const handleQuantityTypeChange = (type: 'Variable' | 'Single') => {
    setQuantityType(type);
    if (type === 'Single') {
      setStandardQuantities([1]);
      setPricingTiers((prev) =>
        prev.map((t) => ({
          ...t,
          basePrices: { 1: t.basePrices[1] !== undefined ? t.basePrices[1] : (t.basePrices[100] || 150) },
        })),
      );
    } else {
      // Variable
      if (standardQuantities.length === 1 && standardQuantities[0] === 1) {
        setStandardQuantities([100, 200, 300, 400, 500]);
        setPricingTiers((prev) =>
          prev.map((t) => ({
            ...t,
            basePrices: { 100: 150, 200: 280, 300: 390, 400: 500, 500: 600 },
          })),
        );
      }
    }
  };

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
    const defaultValue = attrConfig?.enabledOptionValues[0] || '';

    setPricingTiers(
      pricingTiers.map((t) => {
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

      // Determine base price from grid
      const firstTier = pricingTiers[0];
      const firstQty = standardQuantities[0] || 1;
      const firstRawPrice = Number(firstTier?.basePrices[firstQty]) || 0;
      const calculatedBaseUnitPrice =
        (firstRawPrice > 10 || firstQty === 1)
          ? (firstRawPrice / firstQty)
          : (firstRawPrice > 0 ? firstRawPrice : 1.5);

      // 2. Create the Product via Catalogue API
      const created = await api.adminCreateProduct({
        name: name.trim(),
        slug: slug.trim(),
        sku: sku.trim(),
        categoryId: finalCategoryId,
        description: description.trim() || undefined,
        basePrice: Number(calculatedBaseUnitPrice.toFixed(4)),
        minQuantity: quantityType === 'Single' ? 1 : firstQty,
        maxQuantity:
          quantityType === 'Single'
            ? 1
            : (standardQuantities[standardQuantities.length - 1] || 100000),
        quantityStep: quantityType === 'Single' ? 1 : 100,
        productionDays: Number(productionDays),
        trackInventory: true,
        stockQuantity: stockStatus === 'Available' ? 1000 : 0,
        defaultSize: specifications.trim() || undefined,
        isFeatured: isFeatured,
        status: 'PUBLISHED',
        fields: fieldsPayload,
      });

      // 3. Upload Pending Images
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

      // 4. Save Combinations Pricing Grid into PricingMatrix rules
      const rulesPayload: CreatePricingRuleDto[] = [];
      for (const tier of pricingTiers) {
        // 4a. Save base rate rule for the tier
        for (const q of standardQuantities) {
          const rawPrice = Number(tier.basePrices[q]);
          if (!isNaN(rawPrice) && rawPrice > 0) {
            const unitRate = (rawPrice > 10 || q === 1) ? (rawPrice / q) : rawPrice;
            rulesPayload.push({
              minQty: q,
              maxQty: q,
              unitPrice: Number(unitRate.toFixed(4)),
              attributeCombination: {},
              label: `${tier.name} Base Rate`,
            });
          }
        }

        // 4b. Save individual attribute rules with extra prices ONLY for optional add-ons
        for (const attr of tier.attributes) {
          if (attr.attributeCode && attr.attributeValue) {
            const attrConfig = Object.values(selectedAttributes).find((a) => a.code === attr.attributeCode);
            const isAddOn = Boolean(
              attrConfig?.isOptionalAddOn ??
              attributeLibrary.find((a) => a.code === attr.attributeCode)?.isOptionalAddOn ??
              attributeLibrary.find((a) => a.code === attr.attributeCode)?.options?.[0]?.isOptionalAddOn
            );

            // Case B: If Optional add-on is unchecked, do not generate attribute-specific surcharges
            if (!isAddOn) {
              continue;
            }

            const attrDisplayName = attrConfig?.name || attr.attributeCode;
            const optLabel = getOptionLabel(attr.attributeCode, attr.attributeValue);

            for (const q of standardQuantities) {
              const basePrice = Number(tier.basePrices[q]) || 0;
              const extraPrice = Number(attr.extraPrices?.[q]) || 0;
              const totalPrice = basePrice + extraPrice;

              if (totalPrice > 0) {
                const unitRate = (totalPrice > 10 || q === 1) ? (totalPrice / q) : totalPrice;
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

        // 4c. If multiple attributes exist in tier, also save the combined rule with sum of optional add-on extra prices
        if (tier.attributes.length > 1) {
          const combinedCombo: Record<string, string> = {};
          const labelParts: string[] = [];
          for (const attr of tier.attributes) {
            if (attr.attributeCode && attr.attributeValue) {
              combinedCombo[attr.attributeCode] = attr.attributeValue;
              labelParts.push(`${attr.attributeCode}:${attr.attributeValue}`);
            }
          }
          if (Object.keys(combinedCombo).length > 1) {
            for (const q of standardQuantities) {
              const basePrice = Number(tier.basePrices[q]) || 0;
              let totalExtra = 0;
              for (const attr of tier.attributes) {
                const attrConfig = Object.values(selectedAttributes).find((a) => a.code === attr.attributeCode);
                const isAddOn = Boolean(
                  attrConfig?.isOptionalAddOn ??
                  attributeLibrary.find((a) => a.code === attr.attributeCode)?.isOptionalAddOn ??
                  attributeLibrary.find((a) => a.code === attr.attributeCode)?.options?.[0]?.isOptionalAddOn
                );
                if (isAddOn) {
                  totalExtra += Number(attr.extraPrices?.[q]) || 0;
                }
              }
              const totalPrice = basePrice + totalExtra;
              if (totalPrice > 0) {
                const unitRate = (totalPrice > 10 || q === 1) ? (totalPrice / q) : totalPrice;
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
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Delivery Time / Turnaround
              </label>
              <input
                type="text"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                placeholder="2-3 Working Days"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
              />
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
          {/* SECTION 2: PRODUCT ATTRIBUTES */}
          {/* ============================================================ */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Product Attributes</span>
                  <span className="text-[11px] font-normal font-mono text-slate-400">
                    ({Object.keys(selectedAttributes).length} selected)
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Choose the options customers can select for this product.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/admin/attributes"
                  target="_blank"
                  className="text-xs text-slate-600 hover:text-slate-950 flex items-center gap-1 font-medium hover:underline mr-1"
                  title="Manage Reusable Attributes Library in a new tab"
                >
                  <RiListSettingsLine className="h-3.5 w-3.5" />
                  <span>Attributes Library</span>
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

            {/* Reusable Attributes Library Selector */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Available Library Attributes</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700 font-semibold">
                    {attributeLibrary.length}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Click any attribute to attach it to this product
                </span>
              </div>

              {/* Clickable Attributes Palette from Library */}
              {attributeLibrary.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {attributeLibrary.map((attr) => {
                    const isAttached = Boolean(selectedAttributes[attr.id]);
                    return (
                      <button
                        key={attr.id}
                        type="button"
                        onClick={() => {
                          if (isAttached) {
                            handleRemoveAttributeFromProduct(attr.id);
                          } else {
                            handleAddAttributeToProduct(attr.id);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                          isAttached
                            ? 'bg-[#FFED00] border-[#E3A008] text-slate-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {isAttached ? (
                          <RiCheckLine className="h-3.5 w-3.5 text-slate-950 font-bold" />
                        ) : (
                          <RiAddLine className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span>{attr.name}</span>
                        <span className="text-[10px] font-normal font-mono text-slate-500">
                          ({attr.options?.length || 0})
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                  Loading attributes library...
                </div>
              )}

              {/* Search & Dropdown Row */}
              <div className="pt-2 border-t border-slate-200/70 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <RiSearch2Line className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={attributeSearch}
                    onChange={(e) => setAttributeSearch(e.target.value)}
                    placeholder="Search attributes library (e.g. Material, GSM)..."
                    className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="sm:w-64">
                  <select
                    value={selectedAttributeIdToAdd}
                    onChange={(e) => setSelectedAttributeIdToAdd(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-800 font-medium"
                  >
                    <option value="">Select attribute to add...</option>
                    {availableAttributesToAdd.map((attr) => (
                      <option key={attr.id} value={attr.id}>
                        {attr.name} ({attr.options?.length || 0} values)
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!selectedAttributeIdToAdd}
                  onClick={() => handleAddAttributeToProduct()}
                  className="h-8 px-3 text-xs font-bold bg-[#FFED00] text-slate-950 hover:bg-[#FCDD55] shrink-0"
                >
                  <RiAddLine className="h-3.5 w-3.5 mr-1" />
                  <span>Attach</span>
                </Button>
              </div>
            </div>

            {/* Clear List of Attributes Selected for the Current Product */}
            {Object.keys(selectedAttributes).length === 0 ? (
              <div className="p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center space-y-1">
                <p className="text-xs text-slate-600 font-semibold">
                  Select attributes from the library above to configure this product
                </p>
                <p className="text-[11px] text-slate-400">
                  Click any attribute chip (such as Material, GSM, Lamination, or Printing Location) to choose which values apply.
                </p>
              </div>
            ) : (
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
                    ({standardQuantities.length} quantity column{standardQuantities.length === 1 ? '' : 's'}, {pricingTiers.length} variant tier{pricingTiers.length === 1 ? '' : 's'})
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

                {pricingTiers.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPricesToAllTiers}
                    className="h-8 text-xs shrink-0"
                    title="Copy Tier 1 quantity prices across all variant tiers"
                  >
                    <RiFileCopyLine className="h-3.5 w-3.5 mr-1" />
                    <span>Copy Tier 1 Prices</span>
                  </Button>
                )}

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

            {/* Standard Quantities (Columns) Toolbar */}
            {quantityType !== 'Single' && (
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
                    {standardQuantities.map((qty) => (
                      <th key={qty} className="py-3 px-3 min-w-[130px] text-center font-mono">
                        <div className="flex items-center justify-center gap-1">
                          <span>Qty {qty.toLocaleString()}</span>
                          {standardQuantities.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuantityColumn(qty)}
                              className="text-slate-300 hover:text-red-500 font-normal text-xs px-0.5"
                              title={`Remove Qty ${qty}`}
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
                          {tier.attributes.map((attrRule) => {
                            const currentAttrConfig = Object.values(selectedAttributes).find(
                              (a) => a.code === attrRule.attributeCode,
                            );
                            const attrDisplayName =
                              currentAttrConfig?.name || attrRule.attributeCode || 'ATTRIBUTE';
                            const isAddOn = Boolean(
                              currentAttrConfig?.isOptionalAddOn ??
                              attributeLibrary.find((a) => a.code === attrRule.attributeCode)?.isOptionalAddOn ??
                              attributeLibrary.find((a) => a.code === attrRule.attributeCode)?.options?.[0]?.isOptionalAddOn
                            );

                            return (
                              <div key={attrRule.id} className="space-y-1 w-full max-w-[220px]">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono truncate max-w-[120px]"
                                      title={attrDisplayName}
                                    >
                                      {attrDisplayName}
                                    </span>
                                    {isAddOn ? (
                                      <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        Add-on
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-1 py-0.2 rounded font-mono text-slate-400 bg-slate-50 border border-slate-200">
                                        Standard
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAttributeFromTier(tier.id, attrRule.id)}
                                    className="text-red-500 hover:text-red-700 text-xs font-semibold ml-1 transition-colors"
                                    title={`Remove ${attrDisplayName}`}
                                  >
                                    Remove
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

                          {/* + Add Attribute Value button */}
                          <div>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddAttributeToTier(tier.id, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              defaultValue=""
                              className="h-7 px-2.5 text-[11px] text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-400 font-semibold cursor-pointer transition-colors"
                            >
                              <option value="" disabled>
                                + Add Attribute Value
                              </option>
                              {Object.values(selectedAttributes).map((a) => (
                                <option key={a.code} value={a.code}>
                                  + {a.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </td>

                      {/* Qty Price Columns */}
                      {standardQuantities.map((qty) => {
                        const baseVal = tier.basePrices[qty] ?? '';
                        const numBase = Number(baseVal || 0);

                        return (
                          <td key={qty} className="py-3.5 px-3 align-top">
                            <div className="space-y-3 text-center">
                              {/* 1. Base Price Input */}
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  Price for Qty {qty.toLocaleString()}
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
                                  Price: ₹{numBase.toFixed(2)}
                                </span>
                              </div>

                              {/* 2. Extra Price for each Attribute Rule ONLY if Optional Add-on is checked */}
                              {tier.attributes.map((attrRule) => {
                                const currentAttrConfig = Object.values(selectedAttributes).find(
                                  (a) => a.code === attrRule.attributeCode,
                                );
                                const isAddOn = Boolean(
                                  currentAttrConfig?.isOptionalAddOn ??
                                  attributeLibrary.find((a) => a.code === attrRule.attributeCode)?.isOptionalAddOn ??
                                  attributeLibrary.find((a) => a.code === attrRule.attributeCode)?.options?.[0]?.isOptionalAddOn
                                );

                                // Case B — Optional add-on is unchecked:
                                // Do not display the extra-price inputs for that attribute or its values!
                                if (!isAddOn) {
                                  return null;
                                }

                                const attrDisplayName =
                                  currentAttrConfig?.name || attrRule.attributeCode || 'Attribute';
                                const optLabel = attrRule.attributeValue
                                  ? getOptionLabel(attrRule.attributeCode, attrRule.attributeValue)
                                  : '';
                                const extraVal = attrRule.extraPrices?.[qty] ?? '';
                                const numExtra = Number(extraVal || 0);
                                const totalPriceWithExtra = numBase + numExtra;

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
                                      With this: ₹{totalPriceWithExtra.toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}

                      {/* Action: Trash Icon */}
                      <td className="py-3.5 px-4 align-top text-center pt-5">
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
                          {/* Configure / Full Studio */}
                          <Link href={`/admin/products/${p.id}`}>
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
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
    </div>
  );
}
