'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  RiArrowLeftLine,
  RiAddLine,
  RiSaveLine,
  RiEditLine,
  RiDeleteBin7Line,
  RiLoader4Line,
  RiImage2Line,
  RiListSettingsLine,
  RiCloseLine,
  RiCheckLine,
  RiPriceTag3Line,
  RiInformationLine,
  RiStackLine,
  RiTimeLine,
  RiUploadCloud2Line,
  RiSparklingFill,
  RiEyeLine,
  RiCheckboxCircleLine,
  RiCheckDoubleLine,
  RiFileCopyLine,
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
  ProductImageItem,
  PricingRule,
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

export default function AdminProductEditorPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading & Global State
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Master Data
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [attributeLibrary, setAttributeLibrary] = useState<ReusableAttribute[]>([]);

  // Core Product Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');
  const [quantityType, setQuantityType] = useState<'Variable' | 'Single'>('Variable');
  const [stockStatus, setStockStatus] = useState<'Available' | 'Not Available'>('Available');
  const [deliveryTime, setDeliveryTime] = useState('2-3 Working Days');
  const [productionDays, setProductionDays] = useState<number>(2);
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Reusable Attributes State
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, ConfiguredAttributeState>>({});
  const [selectedAttributeIdToAdd, setSelectedAttributeIdToAdd] = useState('');

  // Inline Attribute Modals
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrCode, setNewAttrCode] = useState('');
  const [newAttrDesc, setNewAttrDesc] = useState('');
  const [newAttrOptionsRaw, setNewAttrOptionsRaw] = useState('');
  const [attrModalError, setAttrModalError] = useState<string | null>(null);
  const [isSavingAttrModal, setIsSavingAttrModal] = useState(false);

  // Inline Value Modal
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [valueModalAttr, setValueModalAttr] = useState<ReusableAttribute | null>(null);
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

  // Pricing Tiers with Multiple Attributes and Extra Prices
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([
    {
      id: 'tier-1',
      name: 'TIER 1',
      basePrices: { 100: 150, 200: 280, 300: 390, 400: 500, 500: 600 },
      attributes: [],
    },
  ]);

  // Image Management
  const [existingImages, setExistingImages] = useState<ProductImageItem[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImageUpload[]>([]);
  const [isDeletingImageId, setIsDeletingImageId] = useState<string | null>(null);

  // ==========================================
  // INITIAL DATA LOADING
  // ==========================================
  useEffect(() => {
    if (!productId) return;
    loadAllData();
  }, [productId]);

  const loadAllData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [prod, cats, attrs, rules] = await Promise.all([
        api.adminGetProductById(productId),
        api.adminListCategories(),
        api.adminListAttributes(),
        api.adminGetPricingRules(productId).catch(() => [] as PricingRule[]),
      ]);

      setCategories(cats || []);
      const activeAttrs = (attrs || []).filter((a) => a.isActive);
      setAttributeLibrary(activeAttrs);

      // Populate basic info
      setName(prod.name || '');
      setSlug(prod.slug || '');
      setSku(prod.sku || '');
      setCategoryId(prod.categoryId || '');
      setStatus((prod.status as any) || 'PUBLISHED');
      setDescription(prod.description || '');
      setSpecifications(prod.defaultSize || '');
      setProductionDays(prod.productionDays || 2);
      setStockStatus(prod.stockQuantity > 0 ? 'Available' : 'Not Available');
      setIsFeatured(Boolean(prod.isFeatured));
      setDeliveryTime((prod as any).deliveryTime || '2-3 Working Days');
      setExistingImages(prod.images || []);

      const isSingle = prod.minQuantity === 1 && prod.maxQuantity === 1;
      setQuantityType(isSingle ? 'Single' : 'Variable');

      // Populate Reusable Attributes
      const mappedSelectedAttrs: Record<string, ConfiguredAttributeState> = {};
      if (prod.fields && prod.fields.length > 0) {
        for (const field of prod.fields) {
          const match = activeAttrs.find(
            (a) => a.code.toLowerCase() === field.key.toLowerCase() || a.name.toLowerCase() === field.label.toLowerCase(),
          );
          const attrId = match?.id || `custom-${field.id}`;
          const enabledVals = (field.options || []).map((o) => o.value);
          mappedSelectedAttrs[attrId] = {
            attributeId: attrId,
            name: match?.name || field.label,
            code: match?.code || field.key,
            type: match?.type || field.type || 'SELECT',
            description: match?.description || field.description,
            enabledOptionValues: enabledVals,
            isOptionalAddOn: Boolean(match?.isOptionalAddOn || match?.options?.[0]?.isOptionalAddOn),
          };
        }
      }
      setSelectedAttributes(mappedSelectedAttrs);

      // Populate Pricing Matrix & Quantities
      if (rules && rules.length > 0) {
        const rawQtys = Array.from(new Set(rules.map((r) => r.minQty))).sort((a, b) => a - b);
        if (rawQtys.length > 0) {
          setStandardQuantities(rawQtys);
          const customFound = rawQtys.filter((q) => !PRESET_QUANTITIES.includes(q));
          setCustomQuantities(customFound);
        }

        // Separate base rules and attribute specific rules
        const basePricesByQty: Record<number, number> = {};
        const attrRulesMap = new Map<string, { attributeCode: string; attributeValue: string; extraPrices: Record<number, number> }>();
        const comboTierMap = new Map<string, {
          name: string;
          basePrices: Record<number, number | ''>;
          attributes: TierAttributeRule[];
        }>();

        for (const r of rules) {
          const combo = (r.attributeCombination as any) || {};
          const comboEntries = Object.entries(combo)
            .filter(([k]) => k !== 'discountPercent' && k !== 'label' && k !== 'offerName')
            .sort(([a], [b]) => a.localeCompare(b));

          const unitP = Number(r.unitPrice) || 0;
          const totalVal = Math.round(unitP * r.minQty);

          if (comboEntries.length === 0) {
            basePricesByQty[r.minQty] = totalVal;
          } else if (comboEntries.length === 1) {
            const [attrCode, attrVal] = comboEntries[0];
            const key = `${attrCode}:::${attrVal}`;
            if (!attrRulesMap.has(key)) {
              attrRulesMap.set(key, {
                attributeCode: attrCode,
                attributeValue: String(attrVal),
                extraPrices: {},
              });
            }
            const record = attrRulesMap.get(key)!;
            record.extraPrices[r.minQty] = totalVal;
          }

          // Legacy combo key for fallback
          const comboKey = comboEntries.length > 0
            ? comboEntries.map(([k, v]) => `${k}:::${v}`).join('|||')
            : '__BASE__';

          if (!comboTierMap.has(comboKey)) {
            const tierIdx = comboTierMap.size + 1;
            comboTierMap.set(comboKey, {
              name: `TIER ${tierIdx}`,
              basePrices: {},
              attributes: comboEntries.map(([k, v], itemIdx) => ({
                id: `attr-rule-${Date.now()}-${tierIdx}-${itemIdx}`,
                attributeCode: k,
                attributeValue: String(v),
                extraPrices: {},
              })),
            });
          }
          const tierData = comboTierMap.get(comboKey)!;
          tierData.basePrices[r.minQty] = totalVal;
        }

        let loadedTiers: PricingTier[] = [];

        // If we found a base tier with base rates, calculate attribute extra prices relative to base
        if (Object.keys(basePricesByQty).length > 0) {
          const tierAttrs: TierAttributeRule[] = Array.from(attrRulesMap.values()).map((item, idx) => {
            const relativeExtra: Record<number, number | ''> = {};
            for (const [qStr, totalVal] of Object.entries(item.extraPrices)) {
              const q = Number(qStr);
              const bPrice = basePricesByQty[q] || 0;
              relativeExtra[q] = Math.max(0, totalVal - bPrice);
            }
            return {
              id: `attr-rule-${Date.now()}-${idx}`,
              attributeCode: item.attributeCode,
              attributeValue: item.attributeValue,
              extraPrices: relativeExtra,
            };
          });

          loadedTiers = [
            {
              id: 'tier-1',
              name: 'TIER 1',
              basePrices: basePricesByQty,
              attributes: tierAttrs,
            },
          ];
        } else {
          loadedTiers = Array.from(comboTierMap.entries()).map(([key, tData], idx) => ({
            id: `tier-${idx + 1}`,
            name: tData.name,
            basePrices: tData.basePrices,
            attributes: tData.attributes,
          }));
        }

        setPricingTiers(loadedTiers.length > 0 ? loadedTiers : [
          {
            id: 'tier-1',
            name: 'TIER 1',
            basePrices: { 100: 150, 200: 280, 300: 390, 400: 500, 500: 600 },
            attributes: [],
          },
        ]);
      } else {
        if (isSingle) {
          setStandardQuantities([1]);
          setPricingTiers([
            {
              id: 'tier-1',
              name: 'TIER 1',
              basePrices: { 1: Math.round(Number(prod.basePrice) || 150) },
              attributes: [],
            },
          ]);
        } else {
          setStandardQuantities([100, 200, 300, 400, 500]);
          setPricingTiers([
            {
              id: 'tier-1',
              name: 'TIER 1',
              basePrices: { 100: 150, 200: 280, 300: 390, 400: 500, 500: 600 },
              attributes: [],
            },
          ]);
        }
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load product details.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // ATTRIBUTE ATTACHMENT HANDLERS
  // ==========================================
  const handleAddAttributeToProduct = (attrId: string) => {
    if (!attrId || selectedAttributes[attrId]) return;
    const libAttr = attributeLibrary.find((a) => a.id === attrId);
    if (!libAttr) return;

    setSelectedAttributes({
      ...selectedAttributes,
      [attrId]: {
        attributeId: libAttr.id,
        name: libAttr.name,
        code: libAttr.code,
        type: libAttr.type,
        description: libAttr.description,
        enabledOptionValues: (libAttr.options || []).map((o) => o.value),
        isOptionalAddOn: Boolean(libAttr.isOptionalAddOn || libAttr.options?.[0]?.isOptionalAddOn),
      },
    });
    setSelectedAttributeIdToAdd('');
  };

  const handleRemoveAttributeFromProduct = (attrId: string) => {
    const next = { ...selectedAttributes };
    const removedCode = next[attrId]?.code;
    delete next[attrId];
    setSelectedAttributes(next);

    // If any pricing tier had this attribute code, remove it from tiers
    if (removedCode) {
      setPricingTiers((prev) =>
        prev.map((t) => ({
          ...t,
          attributes: t.attributes.filter((a) => a.attributeCode !== removedCode),
        })),
      );
    }
  };

  const handleToggleOptionForAttribute = (attrId: string, optionValue: string) => {
    const current = selectedAttributes[attrId];
    if (!current) return;

    const exists = current.enabledOptionValues.includes(optionValue);
    const updatedValues = exists
      ? current.enabledOptionValues.filter((v) => v !== optionValue)
      : [...current.enabledOptionValues, optionValue];

    setSelectedAttributes({
      ...selectedAttributes,
      [attrId]: {
        ...current,
        enabledOptionValues: updatedValues,
      },
    });
  };

  // Inline Add Reusable Attribute Modal
  const handleOpenNewAttrModal = () => {
    setNewAttrName('');
    setNewAttrCode('');
    setNewAttrDesc('');
    setNewAttrOptionsRaw('');
    setAttrModalError(null);
    setIsAttrModalOpen(true);
  };

  const handleSaveNewAttributeModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrName.trim()) {
      setAttrModalError('Attribute name is required.');
      return;
    }
    const finalCode = (newAttrCode.trim() || newAttrName.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();

    const optionsList: ReusableAttributeOption[] = newAttrOptionsRaw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((val, idx) => ({
        label: val,
        value: val.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        sortOrder: idx,
      }));

    if (optionsList.length === 0) {
      setAttrModalError('Please provide at least one option value.');
      return;
    }

    setIsSavingAttrModal(true);
    setAttrModalError(null);
    try {
      const created = await api.adminCreateAttribute({
        name: newAttrName.trim(),
        code: finalCode,
        type: 'SELECT',
        description: newAttrDesc.trim() || undefined,
        options: optionsList,
      });

      setAttributeLibrary((prev) => [...prev, created]);
      setSelectedAttributes((prev) => ({
        ...prev,
        [created.id]: {
          attributeId: created.id,
          name: created.name,
          code: created.code,
          type: created.type,
          description: created.description,
          enabledOptionValues: (created.options || []).map((o) => o.value),
          isOptionalAddOn: Boolean(created.isOptionalAddOn || created.options?.[0]?.isOptionalAddOn),
        },
      }));

      setIsAttrModalOpen(false);
    } catch (err: any) {
      setAttrModalError(err?.message || 'Failed to create attribute.');
    } finally {
      setIsSavingAttrModal(false);
    }
  };

  // Inline Add Value Modal
  const handleOpenAddValueModal = (attrId: string) => {
    const libAttr = attributeLibrary.find((a) => a.id === attrId);
    if (!libAttr) return;
    setValueModalAttr(libAttr);
    setValModalName('');
    setValModalError(null);
    setIsValueModalOpen(true);
  };

  const handleSaveAddValueModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valModalName.trim() || !valueModalAttr) {
      setValModalError('Option label is required.');
      return;
    }

    const currentOptions = valueModalAttr.options || [];
    const newVal = valModalName.trim();
    const newCode = newVal.toLowerCase().replace(/[^a-z0-9]/g, '_');

    if (currentOptions.some((o) => o.value === newCode || o.label.toLowerCase() === newVal.toLowerCase())) {
      setValModalError('This option already exists.');
      return;
    }

    const updatedOptions: ReusableAttributeOption[] = [
      ...currentOptions,
      {
        label: newVal,
        value: newCode,
        sortOrder: currentOptions.length,
      },
    ];

    setIsSavingValModal(true);
    setValModalError(null);
    try {
      const updated = await api.adminUpdateAttribute(valueModalAttr.id, {
        options: updatedOptions,
      });

      setAttributeLibrary((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

      if (selectedAttributes[updated.id]) {
        setSelectedAttributes((prev) => ({
          ...prev,
          [updated.id]: {
            ...prev[updated.id],
            enabledOptionValues: [...prev[updated.id].enabledOptionValues, newCode],
          },
        }));
      }

      setIsValueModalOpen(false);
    } catch (err: any) {
      setValModalError(err?.message || 'Failed to add option.');
    } finally {
      setIsSavingValModal(false);
    }
  };

  // ==========================================
  // COMBINATIONS PRICING GRID HANDLERS
  // ==========================================
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

  // Tier Management
  const handleAddTier = () => {
    const newIdx = pricingTiers.length + 1;
    const baseCopy: Record<number, number | ''> = {};
    standardQuantities.forEach((q) => {
      baseCopy[q] = pricingTiers[0]?.basePrices[q] ?? '';
    });
    setPricingTiers([
      ...pricingTiers,
      {
        id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `TIER ${newIdx}`,
        basePrices: baseCopy,
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

  const getOptionLabel = (attrCode: string, val: string) => {
    const libAttr = attributeLibrary.find((a) => a.code === attrCode);
    const opt = libAttr?.options?.find((o) => o.value === val);
    return opt?.label || val;
  };

  // ==========================================
  // IMAGE MANAGEMENT HANDLERS
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
        isPrimary: existingImages.length === 0 && pendingImages.length === 0 && i === 0,
      });
    }

    setPendingImages([...pendingImages, ...newUploads]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePendingImage = (id: string) => {
    const target = pendingImages.find((img) => img.id === id);
    if (target?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(target.previewUrl);
    }
    const filtered = pendingImages.filter((img) => img.id !== id);
    setPendingImages(filtered);
  };

  const handleDeleteExistingImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    setIsDeletingImageId(imageId);
    try {
      await api.adminDeleteProductImage(productId, imageId);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete image');
    } finally {
      setIsDeletingImageId(null);
    }
  };

  const handleSetPrimaryExistingImage = async (imageId: string) => {
    try {
      await api.adminSetPrimaryImage(productId, imageId);
      setExistingImages((prev) =>
        prev.map((img) => ({
          ...img,
          isPrimary: img.id === imageId,
        })),
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to set primary image');
    }
  };

  // ==========================================
  // UPDATE PRODUCT SUBMISSION
  // ==========================================
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSaveError('Please enter a product name.');
      return;
    }
    if (!categoryId) {
      setSaveError('Please select a product category.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      // 1. Build Dynamic Fields from selected attributes
      const fieldsPayload: any[] = [];
      let sortOrderCounter = 0;

      for (const attrId of Object.keys(selectedAttributes)) {
        const config = selectedAttributes[attrId];
        if (config.enabledOptionValues.length === 0) {
          setSaveError(
            `Attribute "${config.name}" has no values selected. Please choose at least one value or remove the attribute.`,
          );
          setIsSaving(false);
          return;
        }

        const sharedAttr = attributeLibrary.find((a) => a.id === attrId);
        const availableOptions = sharedAttr?.options || config.enabledOptionValues.map((v) => ({ label: v, value: v }));

        const optionsForField = availableOptions
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

      // 2. Base Unit Price from grid
      const firstTier = pricingTiers[0];
      const firstQty = standardQuantities[0] || 1;
      const firstRawPrice = Number(firstTier?.basePrices[firstQty]) || 0;
      const calculatedBaseUnitPrice =
        firstRawPrice > 10 || firstQty === 1
          ? firstRawPrice / firstQty
          : firstRawPrice > 0
          ? firstRawPrice
          : 1.5;

      // 3. Update Product via API
      await api.adminUpdateProduct(productId, {
        name: name.trim(),
        slug: slug.trim(),
        sku: sku.trim(),
        categoryId: categoryId,
        description: description.trim() || undefined,
        basePrice: Number(calculatedBaseUnitPrice.toFixed(4)),
        minQuantity: quantityType === 'Single' ? 1 : firstQty,
        maxQuantity:
          quantityType === 'Single'
            ? 1
            : standardQuantities[standardQuantities.length - 1] || 100000,
        quantityStep: quantityType === 'Single' ? 1 : 100,
        productionDays: Number(productionDays),
        trackInventory: true,
        stockQuantity: stockStatus === 'Available' ? 1000 : 0,
        defaultSize: specifications.trim() || undefined,
        isFeatured: isFeatured,
        status: status,
        fields: fieldsPayload,
      });

      // 4. Upload any new pending images
      if (pendingImages.length > 0) {
        for (const img of pendingImages) {
          if (img.file) {
            try {
              await api.adminUploadProductImage(productId, img.file, {
                altText: `${name} ${img.name}`,
                caption: img.name,
                isPrimary: existingImages.length === 0 && img.isPrimary,
              });
            } catch (imgErr) {
              console.warn('Image upload notice:', imgErr);
            }
          }
        }
        setPendingImages([]);
      }

      // 5. Save Combinations Pricing Grid into PricingMatrix rules
      const rulesPayload: CreatePricingRuleDto[] = [];
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

        // 5b. Save individual attribute rules with extra prices ONLY for optional add-ons
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

        // 5c. If multiple attributes exist in tier, also save the combined rule with sum of optional add-on extra prices
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

      if (rulesPayload.length > 0) {
        try {
          await api.adminSaveBatchPricingRules(productId, rulesPayload);
        } catch (ruleErr) {
          console.warn('Pricing rules batch notice:', ruleErr);
        }
      }

      setSaveSuccess('Changes saved successfully! Returning to product list...');
      setTimeout(() => {
        router.push('/admin/products?updated=1');
      }, 800);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update product.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // RENDER LOADING / ERROR
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-3">
        <RiLoader4Line className="h-8 w-8 text-slate-400 animate-spin" />
        <span className="text-xs font-mono text-slate-500">Loading product editor...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 max-w-xl mx-auto space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
          <p className="font-bold mb-1">Failed to load product</p>
          <p>{loadError}</p>
        </div>
        <Link href="/admin/products">
          <Button variant="outline" size="sm">
            <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
            <span>Return to Products</span>
          </Button>
        </Link>
      </div>
    );
  }

  // ==========================================
  // MAIN VIEW
  // ==========================================
  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5 bg-white p-5 rounded-xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/admin/products"
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-mono hover:underline"
            >
              <RiArrowLeftLine className="h-3.5 w-3.5" />
              <span>Back to Products</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[11px] font-mono uppercase font-semibold text-slate-400">
              EDIT PRODUCT
            </span>
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-semibold text-slate-900 tracking-tight leading-[1.2] flex items-center gap-2">
            <span>Edit Product: {name || 'Untitled'}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                status === 'PUBLISHED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : status === 'DRAFT'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {status}
            </span>
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Modify product details, reusable attributes, quantity rates, and media in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/products">
            <Button variant="outline" size="md">
              <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
              <span>Cancel</span>
            </Button>
          </Link>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleUpdateProduct}
            disabled={isSaving}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {isSaving ? (
              <RiLoader4Line className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <RiSaveLine className="h-4 w-4 mr-1.5" />
            )}
            <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* Main Single-Page Product Form */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Product Configuration</span>
              <span className="text-xs font-normal text-slate-400 font-mono">
                (Single-Page Editor)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update product details, attach reusable attributes, and configure rate matrix.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">ID: {productId}</span>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiCheckLine className="h-4 w-4 text-emerald-600 font-bold" />
              <span>{saveSuccess}</span>
            </div>
            <button
              onClick={() => setSaveSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs"
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
          </div>
        )}

        {saveError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiCloseLine className="h-4 w-4 text-red-600 font-bold" />
              <span>{saveError}</span>
            </div>
            <button
              onClick={() => setSaveError(null)}
              className="text-red-700 hover:text-red-900 text-xs"
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleUpdateProduct} className="space-y-6 text-xs">
          {/* Row 1: Core Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }
                }}
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

            {/* Quantity Type */}
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

            {/* Stock */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Stock Status
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

          {/* Row 2: Secondary Fields (Delivery Time, SKU, Slug, Status) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                URL Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="premium-visiting-cards"
                className="w-full h-10 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Product Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="PUBLISHED">Published (Live in Store)</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Row 3: Description & Specifications */}
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
                <select
                  value={selectedAttributeIdToAdd}
                  onChange={(e) => setSelectedAttributeIdToAdd(e.target.value)}
                  className="flex-1 h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                >
                  <option value="">-- Or choose from list to attach --</option>
                  {attributeLibrary
                    .filter((a) => !selectedAttributes[a.id])
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.code}) - {a.options?.length || 0} values
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddAttributeToProduct(selectedAttributeIdToAdd)}
                  disabled={!selectedAttributeIdToAdd}
                  className="h-9 text-xs shrink-0"
                >
                  <RiAddLine className="h-3.5 w-3.5 mr-1" />
                  <span>Attach Selected</span>
                </Button>
              </div>
            </div>

            {/* Attached Attributes Configuration Cards */}
            {Object.keys(selectedAttributes).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {Object.values(selectedAttributes).map((config) => {
                  const sharedAttr = attributeLibrary.find((a) => a.id === config.attributeId);
                  const rawOptions = sharedAttr?.options || config.enabledOptionValues.map((v) => ({ label: v, value: v, sortOrder: 0 }));

                  // Deduplicate options by value to prevent duplicate React keys or duplicate option chips
                  const seenValues = new Set<string>();
                  const allOptions = (Array.isArray(rawOptions) ? rawOptions : []).filter((opt) => {
                    const val = String(opt?.value ?? '');
                    if (!val || seenValues.has(val)) return false;
                    seenValues.add(val);
                    return true;
                  });

                  return (
                    <div
                      key={config.attributeId}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {config.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              ({config.code})
                            </span>
                          </div>
                          {config.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {config.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {sharedAttr && (
                            <button
                              type="button"
                              onClick={() => handleOpenAddValueModal(config.attributeId)}
                              className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold px-2 py-0.5 rounded border border-slate-200 hover:border-slate-400 bg-slate-50 transition-colors"
                              title="Add new option to this reusable attribute"
                            >
                              + Value
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttributeFromProduct(config.attributeId)}
                            className="text-slate-400 hover:text-red-500 p-1"
                            title="Remove attribute from product"
                          >
                            <RiCloseLine className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Options checkboxes */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                          Active Values for this Product:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {allOptions.map((opt, optIdx) => {
                            const isChecked = config.enabledOptionValues.includes(opt.value);
                            return (
                              <label
                                key={`${config.attributeId}-${opt.value}-${optIdx}`}
                                className={`cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors border select-none ${
                                  isChecked
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={isChecked}
                                  onChange={() =>
                                    handleToggleOptionForAttribute(config.attributeId, opt.value)
                                  }
                                />
                                {isChecked && <RiCheckLine className="h-3 w-3" />}
                                <span>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                No attributes attached yet. Choose attributes from the library above.
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
          {/* SECTION 4: PRODUCT IMAGES & MEDIA */}
          {/* ============================================================ */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Product Images & Media</span>
                <span className="text-[11px] font-normal font-mono text-slate-400">
                  ({existingImages.length} existing, {pendingImages.length} new)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Manage current product photos or upload new high-resolution images.
              </p>
            </div>

            {/* Existing Images Gallery */}
            {existingImages.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Current Product Images:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {existingImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-xs flex flex-col justify-between"
                    >
                      <img
                        src={resolveImageUrl(img.url)}
                        alt={img.altText || 'Product'}
                        className="w-full h-full object-cover"
                      />
                      {img.isPrimary && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900 text-white shadow-xs">
                          PRIMARY
                        </span>
                      )}
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryExistingImage(img.id)}
                            className="p-1 rounded bg-white/90 text-slate-800 hover:bg-white text-[10px] font-semibold"
                            title="Set as Primary"
                          >
                            ★ Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingImage(img.id)}
                          disabled={isDeletingImageId === img.id}
                          className="p-1 rounded bg-red-600 text-white hover:bg-red-700 text-xs"
                          title="Delete image"
                        >
                          <RiDeleteBin7Line className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Zone */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Upload Additional Images:</span>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <RiUploadCloud2Line className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-800 block">
                  Click to select photos or drag & drop
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  PNG, JPG, WEBP up to 10MB each
                </span>
              </div>

              {/* Pending Upload Previews */}
              {pendingImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {pendingImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-xs"
                    >
                      <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500 text-white shadow-xs">
                        NEW
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingImage(img.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 hover:bg-red-600 text-white transition-colors"
                        title="Remove pending upload"
                      >
                        <RiCloseLine className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <Link href="/admin/products">
              <Button type="button" variant="outline" size="md">
                <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                <span>Return to Catalogue</span>
              </Button>
            </Link>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSaving}
                className="bg-slate-900 text-white hover:bg-slate-800 px-6 font-semibold"
              >
                {isSaving ? (
                  <RiLoader4Line className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <RiSaveLine className="h-4 w-4 mr-1.5" />
                )}
                <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ============================================================ */}
      {/* INLINE MODAL 1: ADD REUSABLE ATTRIBUTE */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAttrModalOpen}
        onClose={() => setIsAttrModalOpen(false)}
        title="Create New Reusable Attribute"
        maxWidth="md"
      >
        <form onSubmit={handleSaveNewAttributeModal} className="space-y-4 text-xs">
          {attrModalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
              {attrModalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Attribute Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newAttrName}
              onChange={(e) => {
                setNewAttrName(e.target.value);
                if (!newAttrCode) {
                  setNewAttrCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                }
              }}
              placeholder="e.g. Paper Stock"
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Attribute Code (Slug / Key)
            </label>
            <input
              type="text"
              value={newAttrCode}
              onChange={(e) => setNewAttrCode(e.target.value)}
              placeholder="e.g. paper_stock"
              className="w-full h-9 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Initial Options (Separated by comma or new line) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={newAttrOptionsRaw}
              onChange={(e) => setNewAttrOptionsRaw(e.target.value)}
              placeholder="e.g. 300 GSM Matte, 350 GSM Gloss, 400 GSM Velvet"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
              disabled={isSavingAttrModal}
              className="bg-slate-900 text-white"
            >
              {isSavingAttrModal ? 'Creating...' : 'Create & Attach'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* INLINE MODAL 2: ADD OPTION VALUE */}
      {/* ============================================================ */}
      <Modal
        isOpen={isValueModalOpen}
        onClose={() => setIsValueModalOpen(false)}
        title={`Add Option to ${valueModalAttr?.name || 'Attribute'}`}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveAddValueModal} className="space-y-4 text-xs">
          {valModalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
              {valModalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Option Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={valModalName}
              onChange={(e) => setValModalName(e.target.value)}
              placeholder="e.g. Gold Foil"
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              required
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsValueModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingValModal}
              className="bg-slate-900 text-white"
            >
              {isSavingValModal ? 'Adding...' : 'Add Value'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
