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
  ProductImageItem,
  PricingRule,
} from '@/lib/api';
import { Button, Badge, Modal } from '@/components/ui';
import { parseQuantityRanges } from '../components/SingleTypePricingTable';

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

  // Single-Type Quantity Range Pricing State
  const [singleQtyRangesInput, setSingleQtyRangesInput] = useState('1-5, 6-10, 11-20');
  const [singleRangesParseError, setSingleRangesParseError] = useState<string | null>(null);
  const [singleBasePrices, setSingleBasePrices] = useState<Record<string, number | string>>({
    '1-5': 200,
    '6-10': 190,
    '11-20': 180,
  });
  const [singleExtraPrices, setSingleExtraPrices] = useState<
    Record<string, Record<string, number | string>>
  >({});

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
      const deliveryTag = prod.tags?.find((t) => t.startsWith('DELIVERY:'));
      if (deliveryTag) {
        setDeliveryTime(deliveryTag.replace('DELIVERY:', ''));
      } else if (prod.productionDays === 1) {
        setDeliveryTime('Single Day Delivery');
      } else if (prod.productionDays && prod.productionDays > 1) {
        setDeliveryTime(`${prod.productionDays} Working Days`);
        setDeliveryTime((prod as any).deliveryTime || '2-3 Working Days');
      }
      setExistingImages(prod.images || []);

      // Populate Courier Settings
      setShippingChargeType((prod.shippingChargeType as any) || 'DEFAULT');
      setUnitWeightGrams(prod.unitWeightGrams !== null && prod.unitWeightGrams !== undefined ? Number(prod.unitWeightGrams) : 2.5);
      setCourierCharge(prod.courierCharge !== null && prod.courierCharge !== undefined ? Number(prod.courierCharge) : 100);
      setPerAdditionalQtyRate(prod.perAdditionalQtyRate !== null && prod.perAdditionalQtyRate !== undefined ? Number(prod.perAdditionalQtyRate) : 25);
      setFreeShippingThreshold(prod.freeShippingThreshold !== null && prod.freeShippingThreshold !== undefined ? Number(prod.freeShippingThreshold) : 1000);

      const isSingle =
        prod.pricingModel === 'SINGLE' ||
        prod.pricingModel === 'SINGLE_RANGE' ||
        prod.tags?.includes('SINGLE_TYPE') ||
        (prod.minQuantity === 1 && prod.maxQuantity === 1);
      setQuantityType(isSingle ? 'Single' : 'Variable');

      if (isSingle) {
        const rangesTag = prod.tags?.find((t) => t.startsWith('RANGES:'));
        if (rangesTag) {
          setSingleQtyRangesInput(rangesTag.replace('RANGES:', ''));
        } else if (rules && rules.length > 0) {
          const distinctRanges: string[] = [];
          for (const r of rules) {
            const key = `${r.minQty}-${r.maxQty}`;
            if (!distinctRanges.includes(key)) {
              distinctRanges.push(key);
            }
          }
          if (distinctRanges.length > 0) {
            setSingleQtyRangesInput(distinctRanges.join(', '));
          }
        }

        if (rules && rules.length > 0) {
          const loadedBasePrices: Record<string, number | string> = {};
          const loadedExtraPrices: Record<string, Record<string, number | string>> = {};

          for (const r of rules) {
            const combo = (r.attributeCombination as any) || {};
            const rangeKey = combo.rangeLabel || `${r.minQty}-${r.maxQty}`;
            const isBase =
              combo.isBasePrice === true ||
              combo.type === 'BASE' ||
              (!combo.attributeCode && !combo.type) ||
              Object.keys(combo).filter(
                (k) => !['label', 'rangeLabel', 'quantityRanges', 'discountPercent', 'offerName', 'isBasePrice', 'type'].includes(k),
              ).length === 0;

            if (isBase) {
              loadedBasePrices[rangeKey] = Number(r.unitPrice);
            } else if (combo.type === 'ATTRIBUTE' || combo.attributeCode) {
              const attrCode =
                combo.attributeCode ||
                Object.keys(combo).find(
                  (k) => !['type', 'extraPrice', 'label', 'rangeLabel', 'quantityRanges', 'discountPercent', 'offerName', 'isBasePrice'].includes(k),
                );
              const attrVal = combo.attributeValue || combo[attrCode || ''];
              if (attrCode && attrVal) {
                const uniqueKey = `${attrCode}:${attrVal}`;
                if (!loadedExtraPrices[uniqueKey]) {
                  loadedExtraPrices[uniqueKey] = {};
                }
                loadedExtraPrices[uniqueKey][rangeKey] = Number(r.unitPrice || combo.extraPrice || 0);
              }
            }
          }

          if (Object.keys(loadedBasePrices).length > 0) {
            setSingleBasePrices(loadedBasePrices);
          }
          if (Object.keys(loadedExtraPrices).length > 0) {
            setSingleExtraPrices(loadedExtraPrices);
          }
        }
      }

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
          if (!isSingle) {
            const customFound = rawQtys.filter((q) => !PRESET_QUANTITIES.includes(q));
            setCustomQuantities(customFound);
          }
        }

        // Separate base rules and attribute specific rules
        const basePricesByQty: Record<number, number> = {};
        const attrRulesMap = new Map<string, { attributeCode: string; attributeValue: string; extraPrices: Record<number, number> }>();
        const comboTierMap = new Map<string, {
          name: string;
          basePrices: Record<number, number | ''>;
          attributes: TierAttributeRule[];
        }>();

        const METADATA_KEYS = new Set([
          'isBasePrice',
          'type',
          'rangeLabel',
          'quantityRanges',
          'extraPrice',
          'attributeCode',
          'attributeValue',
          'discountPercent',
          'label',
          'offerName',
        ]);

        for (const r of rules) {
          const combo = (r.attributeCombination as any) || {};
          let comboEntries = Object.entries(combo)
            .filter(([k]) => !METADATA_KEYS.has(k))
            .sort(([a], [b]) => a.localeCompare(b));

          // If legacy data stored attributeCode & attributeValue as properties instead of { [attrCode]: attrVal }
          if (comboEntries.length === 0 && combo.attributeCode && combo.attributeValue) {
            comboEntries = [[combo.attributeCode, String(combo.attributeValue)]];
          }

          const unitP = Number(r.unitPrice) || 0;
          const totalVal = isSingle ? Number(unitP.toFixed(2)) : Math.round(unitP * r.minQty);

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
              const extra = (isSingle && totalVal <= bPrice)
                ? totalVal
                : Math.max(0, totalVal - bPrice);
              relativeExtra[q] = extra;
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
            basePrices: isSingle
              ? { 1: Math.round(Number(prod.basePrice) || 200) }
              : { 100: 150, 200: 280, 300: 390, 400: 500, 500: 600 },
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
              basePrices: { 1: Math.round(Number(prod.basePrice) || 200) },
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

  const handleToggleAttributeForProduct = (attrId: string) => {
    if (selectedAttributes[attrId]) {
      handleRemoveAttributeFromProduct(attrId);
    } else {
      handleAddAttributeToProduct(attrId);
    }
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

      // 2. Base Unit Price & Quantity Brackets
      let calculatedBaseUnitPrice = 1.5;
      let minQtyToSave = 1;
      let maxQtyToSave = 100000;
      let parsedSingleRangesToSave: { min: number; max: number; key: string; label: string }[] = [];

      if (quantityType === 'Single') {
        const parseRes = parseQuantityRanges(singleQtyRangesInput);
        if (parseRes.error || parseRes.ranges.length === 0) {
          setSaveError(parseRes.error || 'Please define valid quantity ranges.');
          setIsSaving(false);
          return;
        }
        parsedSingleRangesToSave = parseRes.ranges;
        const firstR = parsedSingleRangesToSave[0];
        const lastR = parsedSingleRangesToSave[parsedSingleRangesToSave.length - 1];
        minQtyToSave = firstR.min;
        maxQtyToSave = lastR.max;
        const firstTier = pricingTiers[0];
        calculatedBaseUnitPrice =
          Number(firstTier?.basePrices[firstR.min]) ||
          Number(singleBasePrices[firstR.key]) ||
          200;
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

      // 3. Update Product via API
      await api.adminUpdateProduct(productId, {
        name: name.trim(),
        slug: slug.trim(),
        sku: sku.trim(),
        categoryId: categoryId,
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
        stockQuantity: stockStatus === 'Available' ? 1000 : 0,
        defaultSize: specifications.trim() || undefined,
        isFeatured: isFeatured,
        status: status,
        shippingChargeType: shippingChargeType,
        unitWeightGrams: Number(unitWeightGrams) || 0,
        courierCharge: Number(courierCharge) || 0,
        perAdditionalQtyRate: Number(perAdditionalQtyRate) || 0,
        freeShippingThreshold: Number(freeShippingThreshold) || 0,
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

      // 5. Save Pricing Rules into PricingMatrix
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

          // 5b. Save individual attribute rules with extra prices for each attribute in combination
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

          // 5c. If multiple attributes exist in tier, save the combined combination rule
          // with the sum of all attribute extra prices + base price!
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

            {/* Attached Attributes Configuration Cards */}
            {Object.keys(selectedAttributes).length > 0 && (
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
                  {quantityType === 'Single'
                    ? 'Configure quantity range pricing rules, attribute combinations, and base rates.'
                    : 'Configure variant pricing rules, attribute combinations, and standard quantity brackets.'}
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
