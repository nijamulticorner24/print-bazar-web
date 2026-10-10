'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiSaveLine,
  RiEyeLine,
  RiAddLine,
  RiDeleteBin7Line,
  RiEditLine,
  RiImage2Line,
  RiListSettingsLine,
  RiPriceTag3Line,
  RiStackLine,
  RiCheckDoubleLine,
  RiLoader4Line,
  RiCloseLine,
  RiCheckboxCircleLine,
  RiSparklingFill,
  RiInformationLine,
  RiArrowRightLine,
  RiUploadCloud2Line,
  RiFileLine,
  RiLinkM,
  RiImageAddLine,
  RiLockLine,
  RiRulerLine,
  RiVideoLine,
  RiMovieLine,
  RiPlayCircleLine,
  RiFilmLine,
  RiVideoAddLine,
} from 'react-icons/ri';
import { formatCurrency, getEstimatedDeliveryText, isVideoMedia } from '@/lib/utils';
import {
  api,
  DynamicProduct,
  ProductCategoryItem,
  DynamicField,
  DynamicFieldOption,
  ProductImageItem,
  ProductOptionRequirement,
  PricingRule,
  CreatePricingRuleDto,
  resolveImageUrl,
} from '@/lib/api';
import { DynamicFieldRenderer } from '@/components/configurator/DynamicFieldRenderer';
import { ProductConfigurationFlow } from '@/components/configurator/ProductConfigurationFlow';
import {
  RiPercentLine,
  RiCoupon3Line,
  RiArrowUpDownLine,
  RiMoneyDollarCircleLine,
  RiDiscountPercentLine,
  RiTruckLine,
  RiHandCoinLine,
  RiShieldCheckLine,
} from 'react-icons/ri';

export default function AdminProductEditorPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<DynamicProduct | null>(null);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    'GENERAL' | 'MEDIA' | 'FIELDS' | 'ARTWORK_DESIGN' | 'PRICING' | 'PREVIEW'
  >('GENERAL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State: General Tab
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [minQuantity, setMinQuantity] = useState<number>(100);
  const [quantityStep, setQuantityStep] = useState<number>(100);
  const [maxQuantity, setMaxQuantity] = useState<number>(10000);
  const [productionDays, setProductionDays] = useState<number>(2);
  const [trackInventory, setTrackInventory] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [defaultSize, setDefaultSize] = useState('');
  const [sizeInputMode, setSizeInputMode] = useState<'PRESET' | 'BUILDER' | 'RAW'>('PRESET');
  const [manualWidth, setManualWidth] = useState<string>('89');
  const [manualHeight, setManualHeight] = useState<string>('54');
  const [manualDepth, setManualDepth] = useState<string>('');
  const [manualUnit, setManualUnit] = useState<'mm' | 'cm' | 'in' | 'ft' | 'm'>('mm');
  const [manualSizeLabel, setManualSizeLabel] = useState<string>('Standard Landscape');

  // Fulfillment & Payment Surcharges (Admin-Controlled Delivery & COD)
  const [courierCharge, setCourierCharge] = useState<number>(100);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(1000);
  const [allowCod, setAllowCod] = useState<boolean>(true);
  const [codSurcharge, setCodSurcharge] = useState<number>(50);

  // Dynamic Product Flow Engine Configuration (Admin-Controlled)
  const [artworkRequirement, setArtworkRequirement] = useState<ProductOptionRequirement>('OPTIONAL');
  const [artworkPrice, setArtworkPrice] = useState<number>(0);
  const [artworkQualityVerification, setArtworkQualityVerification] = useState<boolean>(true);
  const [minimumArtworkMegapixels, setMinimumArtworkMegapixels] = useState<number>(1.0);
  const [referenceImageRequirement, setReferenceImageRequirement] = useState<ProductOptionRequirement>('DISABLED');
  const [designServiceRequirement, setDesignServiceRequirement] = useState<ProductOptionRequirement>('DISABLED');
  const [designServicePrice, setDesignServicePrice] = useState<number>(0);

  // Modal & Upload State: Add Image
  const [isAddImageModalOpen, setIsAddImageModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'FILE' | 'URL'>('FILE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPrimaryImage, setIsPrimaryImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');

  // Modal State: Add Dynamic Field
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [isFieldKeyTouched, setIsFieldKeyTouched] = useState(false);
  const [fieldType, setFieldType] = useState<any>('SELECT');
  const [fieldDesc, setFieldDesc] = useState('');
  const [fieldRequired, setFieldRequired] = useState(true);
  const [fieldOptions, setFieldOptions] = useState<Array<{ label: string; value: string; priceModifier: number }>>([
    { label: '', value: '', priceModifier: 0 },
  ]);
  const [hasCondition, setHasCondition] = useState(false);
  const [conditionParentKey, setConditionParentKey] = useState('');
  const [conditionValue, setConditionValue] = useState('');

  // Modal State: Add Option to Existing Field
  const [activeFieldForOption, setActiveFieldForOption] = useState<string | null>(null);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [isNewOptionValueTouched, setIsNewOptionValueTouched] = useState(false);
  const [newOptionPrice, setNewOptionPrice] = useState<number>(0);

  // Form State: Pricing Rules (Tab 5: Volume Offers & Tier Engine)
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(false);
  const [isSavingRule, setIsSavingRule] = useState<boolean>(false);
  const [isDeletingRuleId, setIsDeletingRuleId] = useState<string | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleMinQty, setRuleMinQty] = useState<number>(500);
  const [ruleMaxQty, setRuleMaxQty] = useState<string>('');
  const [ruleDiscountPercent, setRuleDiscountPercent] = useState<number>(10);
  const [ruleUnitPrice, setRuleUnitPrice] = useState<number>(0);
  const [ruleLabel, setRuleLabel] = useState<string>('');
  const [testSimQty, setTestSimQty] = useState<number>(1000);

  // Preview State
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [previewQuantity, setPreviewQuantity] = useState<number>(100);
  const [previewQuote, setPreviewQuote] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prod, cats, rules] = await Promise.all([
        api.adminGetProductById(productId),
        api.adminListCategories(),
        api.adminGetPricingRules(productId).catch(() => [] as PricingRule[]),
      ]);
      setProduct(prod);
      setCategories(cats);
      setPricingRules(Array.isArray(rules) ? rules : []);

      // Populate form
      setName(prod.name);
      setSlug(prod.slug);
      setSku(prod.sku);
      setCategoryId(prod.categoryId);
      setDescription(prod.description || '');
      setStatus(prod.status);
      setBasePrice(Number(prod.basePrice));
      setMinQuantity(prod.minQuantity || 100);
      setQuantityStep((prod as any).quantityStep || (prod.minQuantity >= 100 ? 100 : prod.minQuantity >= 50 ? 50 : 25));
      setMaxQuantity(prod.maxQuantity || 10000);
      setProductionDays(prod.productionDays);
      setTrackInventory(prod.trackInventory);
      setStockQuantity(prod.stockQuantity);
      setDefaultSize(prod.defaultSize || '');

      // Populate Dynamic Flow Engine fields
      setArtworkRequirement(prod.artworkRequirement || 'OPTIONAL');
      setArtworkPrice(Number(prod.artworkPrice) || 0);
      setArtworkQualityVerification(prod.artworkQualityVerification ?? true);
      setMinimumArtworkMegapixels(Number(prod.minimumArtworkMegapixels) || 1.0);
      setReferenceImageRequirement(prod.referenceImageRequirement || 'DISABLED');
      setDesignServiceRequirement(prod.designServiceRequirement || 'DISABLED');
      setDesignServicePrice(Number(prod.designServicePrice) || 0);

      // Populate Fulfillment & COD Surcharge fields
      setCourierCharge(prod.courierCharge !== null && prod.courierCharge !== undefined ? Number(prod.courierCharge) : 100);
      setFreeShippingThreshold(prod.freeShippingThreshold !== null && prod.freeShippingThreshold !== undefined ? Number(prod.freeShippingThreshold) : 1000);
      setAllowCod(prod.allowCod ?? true);
      setCodSurcharge(prod.codSurcharge !== null && prod.codSurcharge !== undefined ? Number(prod.codSurcharge) : 50);

      // Initialize preview values
      const initialPrev: Record<string, any> = {};
      if (prod.fields) {
        for (const f of prod.fields) {
          if (f.options && f.options.length > 0) {
            initialPrev[f.key] = f.options.find((o) => o.isDefault)?.value || f.options[0].value;
          } else if (f.type === 'NUMBER') {
            initialPrev[f.key] = f.validationRules?.min || 100;
          }
        }
      }
      setPreviewValues(initialPrev);
      setPreviewQuantity(prod.minQuantity || 100);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      loadData();
    }
  }, [productId]);

  // Handle General & Configuration Form Save
  const handleSaveGeneral = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await api.adminUpdateProduct(productId, {
        name,
        slug,
        sku,
        categoryId,
        description,
        status,
        basePrice: Number(basePrice),
        minQuantity: Number(minQuantity),
        quantityStep: Number(quantityStep),
        maxQuantity: Number(maxQuantity),
        productionDays: Number(productionDays),
        defaultSize: defaultSize.trim() || null,
        trackInventory,
        stockQuantity: Number(stockQuantity),
        artworkRequirement,
        artworkPrice: Number(artworkPrice),
        artworkQualityVerification,
        minimumArtworkMegapixels: Number(minimumArtworkMegapixels),
        referenceImageRequirement,
        designServiceRequirement,
        designServicePrice: Number(designServicePrice),
        courierCharge: Number(courierCharge),
        freeShippingThreshold: Number(freeShippingThreshold),
        allowCod: Boolean(allowCod),
        codSurcharge: Number(codSurcharge),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save product details');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Product Permanently
  const handleDeleteProduct = async () => {
    if (!confirm(`Are you sure you want to delete product "${name}"?\n\nIf the product has historical orders, it will be safely archived instead.`)) {
      return;
    }
    setIsSaving(true);
    try {
      await api.adminDeleteProduct(productId);
      router.push('/admin/products');
    } catch (err: any) {
      alert(err?.message || 'Failed to delete product');
      setIsSaving(false);
    }
  };

  // Handle File Selection & Drag-and-Drop (Images & Videos)
  const handleFileSelect = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || Boolean(file.name.match(/\.(mp4|webm|mov|ogg|m4v|mkv)$/i));
    if (!isImage && !isVideo) {
      alert('Please select a valid image (PNG, JPG, WEBP, SVG) or video file (MP4, WEBM, MOV).');
      return;
    }
    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setFilePreview(preview);
    if (!newImageAlt) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setNewImageAlt((isVideo ? 'Video: ' : '') + cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const clearSelectedFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
  };

  // Direct quick upload from media dropzone (Supports both Images & Videos)
  const handleQuickUpload = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.type.startsWith('video/') ||
        Boolean(f.name.match(/\.(mp4|webm|mov|ogg|m4v|mkv)$/i)),
    );
    if (validFiles.length === 0) {
      alert('Please drop valid image files (PNG, JPG, WEBP, SVG) or demo video clips (MP4, WEBM, MOV).');
      return;
    }
    setIsUploading(true);
    try {
      for (const file of validFiles) {
        const isVid = file.type.startsWith('video/') || Boolean(file.name.match(/\.(mp4|webm|mov|ogg|m4v|mkv)$/i));
        await api.adminUploadProductImage(productId, file, {
          altText: (isVid ? 'Video: ' : '') + file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        });
      }
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Add Image / Video Modal Submit
  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      if (uploadMode === 'FILE') {
        if (!selectedFile) {
          alert('Please select an image or video file to upload.');
          setIsUploading(false);
          return;
        }
        await api.adminUploadProductImage(productId, selectedFile, {
          altText: newImageAlt || name,
          caption: newImageCaption,
          isPrimary: isPrimaryImage,
        });
      } else {
        if (!newImageUrl) {
          alert('Please enter a valid image or video stream URL.');
          setIsUploading(false);
          return;
        }
        await api.adminAddProductImage(productId, {
          url: newImageUrl,
          altText: newImageAlt || name,
          caption: newImageCaption,
          isPrimary: isPrimaryImage,
        });
      }
      setIsAddImageModalOpen(false);
      clearSelectedFile();
      setNewImageUrl('');
      setNewImageAlt('');
      setNewImageCaption('');
      setIsPrimaryImage(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to add media');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Set Primary Image
  const handleSetPrimaryImage = async (imageId: string) => {
    try {
      await api.adminSetPrimaryImage(productId, imageId);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to update primary image');
    }
  };

  // Handle Delete Image
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image?')) return;
    try {
      await api.adminDeleteProductImage(productId, imageId);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete image');
    }
  };

  // Handle Add Dynamic Field
  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = fieldLabel.trim();
    if (!cleanLabel) {
      alert('Please enter a Field Label.');
      return;
    }

    const autoKey = cleanLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '');

    const finalKey = (fieldKey.trim() || autoKey)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '');

    const validOptions = fieldOptions
      .filter((o) => o.label.trim() !== '')
      .map((o, idx) => {
        const optClean = o.label.trim();
        const autoOptVal = optClean
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/(^_|_$)+/g, '');
        return {
          label: optClean,
          value: o.value.trim() || autoOptVal,
          priceModifier: Number(o.priceModifier || 0),
          priceModifierType: 'FIXED',
          isDefault: idx === 0,
        };
      });

    const conditionalLogic =
      hasCondition && conditionParentKey
        ? {
            dependsOnFieldKey: conditionParentKey,
            operator: 'EQUALS',
            value: conditionValue,
          }
        : undefined;

    try {
      await api.adminAddField(productId, {
        label: cleanLabel,
        key: finalKey,
        type: fieldType,
        description: fieldDesc,
        isRequired: fieldRequired,
        options: validOptions,
        conditionalLogic,
      });
      setIsAddFieldModalOpen(false);
      setFieldLabel('');
      setFieldKey('');
      setIsFieldKeyTouched(false);
      setFieldDesc('');
      setFieldOptions([{ label: '', value: '', priceModifier: 0 }]);
      setHasCondition(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create field');
    }
  };

  // Handle Delete Field
  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field?')) return;
    try {
      await api.adminDeleteField(productId, fieldId);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete field');
    }
  };

  // Handle Add Option to Field
  const handleAddOptionToField = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = newOptionLabel.trim();
    if (!activeFieldForOption || !cleanLabel) return;
    const finalVal = (newOptionValue.trim() || cleanLabel)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '');

    try {
      await api.adminAddFieldOption(productId, activeFieldForOption, {
        label: cleanLabel,
        value: finalVal,
        priceModifier: Number(newOptionPrice),
      });
      setActiveFieldForOption(null);
      setNewOptionLabel('');
      setNewOptionValue('');
      setIsNewOptionValueTouched(false);
      setNewOptionPrice(0);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to add option');
    }
  };

  // Handle Delete Option
  const handleDeleteOption = async (fieldId: string, optionId: string) => {
    try {
      await api.adminDeleteFieldOption(productId, fieldId, optionId);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete option');
    }
  };

  // Open Add Rule Modal
  const handleOpenAddRuleModal = () => {
    setEditingRuleId(null);
    setRuleMinQty(500);
    setRuleMaxQty('');
    setRuleDiscountPercent(10);
    const calculatedUnit = Number(basePrice) > 0 ? Math.round(Number(basePrice) * 0.9 * 100) / 100 : 0;
    setRuleUnitPrice(calculatedUnit);
    setRuleLabel('10% OFF Bulk Tier');
    setIsRuleModalOpen(true);
  };

  // Open Edit Rule Modal
  const handleOpenEditRuleModal = (rule: PricingRule) => {
    setEditingRuleId(rule.id);
    setRuleMinQty(rule.minQty);
    setRuleMaxQty(rule.maxQty !== null && rule.maxQty !== undefined && rule.maxQty < 999999 ? String(rule.maxQty) : '');
    
    const combo = (rule.attributeCombination as any) || {};
    let disc = rule.discountPercent ?? combo.discountPercent ?? 0;
    if (!disc && Number(rule.unitPrice) < Number(basePrice) && Number(basePrice) > 0) {
      disc = Math.round(((Number(basePrice) - Number(rule.unitPrice)) / Number(basePrice)) * 100);
    }
    setRuleDiscountPercent(disc);
    setRuleUnitPrice(Number(rule.unitPrice));
    setRuleLabel(rule.label || combo.label || '');
    setIsRuleModalOpen(true);
  };

  // Sync Discount % -> Unit Price
  const handleDiscountPercentChange = (percent: number) => {
    setRuleDiscountPercent(percent);
    if (Number(basePrice) > 0) {
      const calculatedUnit = Math.max(0, Math.round(Number(basePrice) * (1 - percent / 100) * 100) / 100);
      setRuleUnitPrice(calculatedUnit);
    }
  };

  // Sync Unit Price -> Discount %
  const handleUnitPriceChange = (unitPrice: number) => {
    setRuleUnitPrice(unitPrice);
    if (Number(basePrice) > 0 && unitPrice < Number(basePrice)) {
      const calculatedDiscount = Math.round(((Number(basePrice) - unitPrice) / Number(basePrice)) * 100);
      setRuleDiscountPercent(calculatedDiscount);
    }
  };

  // Save Pricing Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ruleMinQty < 1) {
      alert('Minimum quantity must be at least 1.');
      return;
    }
    const maxQtyNum = ruleMaxQty ? Number(ruleMaxQty) : null;
    if (maxQtyNum && maxQtyNum < ruleMinQty) {
      alert('Maximum quantity cannot be less than minimum quantity.');
      return;
    }

    setIsSavingRule(true);
    try {
      const payload: CreatePricingRuleDto = {
        minQty: Number(ruleMinQty),
        maxQty: maxQtyNum,
        discountPercent: Number(ruleDiscountPercent),
        unitPrice: Number(ruleUnitPrice),
        label: ruleLabel.trim() || `${ruleDiscountPercent}% OFF (${ruleMinQty.toLocaleString()}+ units)`,
        attributeCombination: {
          discountPercent: Number(ruleDiscountPercent),
          label: ruleLabel.trim() || `${ruleDiscountPercent}% OFF`,
        },
      };

      if (editingRuleId) {
        await api.adminUpdatePricingRule(productId, editingRuleId, payload);
      } else {
        await api.adminAddPricingRule(productId, payload);
      }

      setIsRuleModalOpen(false);
      const updatedRules = await api.adminGetPricingRules(productId);
      setPricingRules(updatedRules);
    } catch (err: any) {
      alert(err?.message || 'Failed to save pricing rule');
    } finally {
      setIsSavingRule(false);
    }
  };

  // Delete Pricing Rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule tier?')) return;
    setIsDeletingRuleId(ruleId);
    try {
      await api.adminDeletePricingRule(productId, ruleId);
      const updatedRules = await api.adminGetPricingRules(productId);
      setPricingRules(updatedRules);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete pricing rule');
    } finally {
      setIsDeletingRuleId(null);
    }
  };

  // Apply Quick Preset Tiers
  const handleApplyPresetRules = async (presetType: 'STANDARD' | 'WHOLESALE') => {
    if (pricingRules.length > 0) {
      if (!confirm('This will replace your existing pricing rules with preset volume tiers. Continue?')) {
        return;
      }
    }

    setIsLoadingRules(true);
    try {
      const base = Number(basePrice) > 0 ? Number(basePrice) : 10;
      let presets: CreatePricingRuleDto[] = [];

      if (presetType === 'STANDARD') {
        presets = [
          {
            minQty: 500,
            maxQty: 999,
            discountPercent: 5,
            unitPrice: Math.round(base * 0.95 * 100) / 100,
            label: '5% OFF Standard Bulk (500–999)',
          },
          {
            minQty: 1000,
            maxQty: 2499,
            discountPercent: 10,
            unitPrice: Math.round(base * 0.90 * 100) / 100,
            label: '10% OFF Pro Run (1,000–2,499)',
          },
          {
            minQty: 2500,
            maxQty: 4999,
            discountPercent: 15,
            unitPrice: Math.round(base * 0.85 * 100) / 100,
            label: '15% OFF Enterprise Volume (2,500–4,999)',
          },
          {
            minQty: 5000,
            maxQty: null,
            discountPercent: 20,
            unitPrice: Math.round(base * 0.80 * 100) / 100,
            label: '20% OFF Mega Production (5,000+)',
          },
        ];
      } else {
        presets = [
          {
            minQty: 250,
            maxQty: 499,
            discountPercent: 5,
            unitPrice: Math.round(base * 0.95 * 100) / 100,
            label: '5% OFF Starter Commercial (250–499)',
          },
          {
            minQty: 500,
            maxQty: 999,
            discountPercent: 12,
            unitPrice: Math.round(base * 0.88 * 100) / 100,
            label: '12% OFF Commercial Saver (500–999)',
          },
          {
            minQty: 1000,
            maxQty: 2499,
            discountPercent: 20,
            unitPrice: Math.round(base * 0.80 * 100) / 100,
            label: '20% OFF Master Wholesale (1,000–2,499)',
          },
          {
            minQty: 2500,
            maxQty: 4999,
            discountPercent: 28,
            unitPrice: Math.round(base * 0.72 * 100) / 100,
            label: '28% OFF Industrial Fleet (2,500–4,999)',
          },
          {
            minQty: 5000,
            maxQty: null,
            discountPercent: 35,
            unitPrice: Math.round(base * 0.65 * 100) / 100,
            label: '35% OFF Maximum Plant Wholesale (5,000+)',
          },
        ];
      }

      await api.adminSaveBatchPricingRules(productId, presets);
      const updatedRules = await api.adminGetPricingRules(productId);
      setPricingRules(updatedRules);
    } catch (err: any) {
      alert(err?.message || 'Failed to apply preset rules');
    } finally {
      setIsLoadingRules(false);
    }
  };

  // Preview quote recalculation
  useEffect(() => {
    if (activeTab === 'PREVIEW' && product) {
      api
        .calculateQuote({
          productId: product.id,
          quantity: previewQuantity,
          fieldValues: previewValues,
        })
        .then((q) => setPreviewQuote(q))
        .catch(() => {});
    }
  }, [activeTab, product, previewQuantity, previewValues]);

  // Tab Step Configuration
  const TABS_SEQUENCE = [
    { id: 'GENERAL', label: '1. General Info', short: 'General Info' },
    { id: 'MEDIA', label: '2. Media Gallery', short: 'Media Gallery' },
    { id: 'FIELDS', label: '3. Dynamic Fields', short: 'Dynamic Fields' },
    { id: 'ARTWORK_DESIGN', label: '4. Artwork & Design Engine', short: 'Artwork & Design' },
    { id: 'PRICING', label: '5. Pricing Rules & Offers', short: 'Pricing Rules' },
    { id: 'PREVIEW', label: '6. Live Simulator', short: 'Live Simulator' },
  ] as const;

  const renderBottomTabNavigation = (currentTabId: typeof activeTab) => {
    const currentIndex = TABS_SEQUENCE.findIndex((t) => t.id === currentTabId);
    const prevTab = currentIndex > 0 ? TABS_SEQUENCE[currentIndex - 1] : null;
    const nextTab = currentIndex < TABS_SEQUENCE.length - 1 ? TABS_SEQUENCE[currentIndex + 1] : null;

    return (
      <div className="mt-8 pt-5 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-amber-50/20 p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          {prevTab ? (
            <button
              type="button"
              onClick={() => {
                setActiveTab(prevTab.id as any);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              <RiArrowLeftLine className="h-4 w-4 text-slate-600" />
              <span>Previous: {prevTab.label}</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
              Step 1 of {TABS_SEQUENCE.length} (Product Core)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleSaveGeneral}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
          >
            <RiSaveLine className="h-4 w-4 text-slate-600" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Progress'}</span>
          </button>

          {nextTab ? (
            <button
              type="button"
              onClick={async () => {
                if (currentTabId === 'GENERAL' || currentTabId === 'ARTWORK_DESIGN') {
                  await handleSaveGeneral();
                }
                setActiveTab(nextTab.id as any);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FCDD55] hover:bg-[#FBBF24] text-zinc-950 font-black text-xs border border-zinc-900 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <span>Next: {nextTab.label}</span>
              <RiArrowRightLine className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href={`/products/${product?.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition active:scale-95 cursor-pointer"
            >
              <RiEyeLine className="h-4 w-4" />
              <span>View Live on Storefront</span>
            </Link>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center flex flex-col items-center">
        <RiLoader4Line className="h-10 w-10 text-[#FCDD55] animate-spin mb-3" />
        <span className="text-xs font-mono text-zinc-500 uppercase font-bold">
          Loading Product Architecture...
        </span>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition"
            title="Back to Products"
          >
            <RiArrowLeftLine className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] sm:text-[24px] font-semibold text-slate-900 leading-tight">
                {product.name}
              </h1>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                  product.status === 'PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {product.status}
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
              SKU: {product.sku} • Slug: /{product.slug} • {product.fields?.length || 0} Dynamic Fields
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition"
          >
            <RiEyeLine className="h-4 w-4" />
            <span>Storefront Link</span>
          </Link>
          <button
            type="button"
            onClick={handleDeleteProduct}
            disabled={isSaving}
            className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition"
            title="Delete Product"
          >
            <RiDeleteBin7Line className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleSaveGeneral}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-[#FCDD55] hover:bg-[#FBBF24] text-zinc-950 font-black text-xs px-5 py-2 rounded-lg border border-zinc-900 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <RiSaveLine className="h-4 w-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600" />
          <span>Product configuration updated successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
          <RiInformationLine className="h-4 w-4 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 6-TAB Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'GENERAL', label: '1. General Info' },
          { id: 'MEDIA', label: `2. Media Gallery (${product.images?.length || 0})` },
          { id: 'FIELDS', label: `3. Dynamic Fields (${product.fields?.length || 0})` },
          { id: 'ARTWORK_DESIGN', label: '4. Artwork & Design Engine' },
          { id: 'PRICING', label: `5. Pricing Rules & Offers (${pricingRules.length})` },
          { id: 'PREVIEW', label: '6. Live Customer Flow Simulator' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-t-lg text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-zinc-900 text-zinc-900 bg-white font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GENERAL SPECIFICATIONS */}
      {activeTab === 'GENERAL' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-6">
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-3">
            Core Product Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">Category & Subcategory</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-zinc-900"
              >
                {(() => {
                  const rootCats = categories.filter((c) => !c.parentId);
                  return (rootCats.length > 0 ? rootCats : categories).map((root) => {
                    const children = categories.filter((c) => c.parentId === root.id);
                    if (children.length === 0) {
                      return (
                        <option key={root.id} value={root.id}>
                          📁 {root.name}
                        </option>
                      );
                    }
                    return (
                      <optgroup key={root.id} label={`📁 ${root.name}`}>
                        <option value={root.id}>• {root.name} (Main Category)</option>
                        {children.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            ↳ {sub.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  });
                })()}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">SKU Master Code</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono font-bold text-zinc-900 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">Base Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono font-bold text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">Publication Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-zinc-900"
              >
                <option value="DRAFT">DRAFT (Hidden from storefront)</option>
                <option value="PUBLISHED">PUBLISHED (Live for ordering)</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-800 mb-1">
                Expected Production Turnaround & Delivery SLA (Days)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={productionDays}
                  onChange={(e) => setProductionDays(Math.max(1, Number(e.target.value)))}
                  className="w-28 bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <span className="text-xs text-zinc-500 font-medium">Days in Plant</span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { label: '1 Day (Express/Same-Day)', days: 1 },
                  { label: '2 Days (Standard)', days: 2 },
                  { label: '3 Days (Commercial)', days: 3 },
                  { label: '5 Days (Heavy Finishing)', days: 5 },
                  { label: '7 Days (Packaging/Rigid)', days: 7 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setProductionDays(preset.days)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                      productionDays === preset.days
                        ? 'bg-zinc-900 text-[#FFED00] shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Live Customer Preview Box */}
              {(() => {
                const deliveryEstimate = getEstimatedDeliveryText(productionDays);
                return (
                  <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-amber-900 flex items-center gap-1">
                        <RiSparklingFill className="h-3.5 w-3.5 text-[#E3A008]" />
                        Customer Storefront Preview
                      </span>
                      <span className="bg-[#FFED00] text-slate-950 text-[9px] font-mono font-black px-1.5 py-0.5 rounded border border-[#E3A008]/40">
                        LIVE SLA
                      </span>
                    </div>
                    <div className="text-zinc-900 font-bold text-xs pt-0.5">
                      🚚 Expected Delivery: <span className="text-emerald-800 font-black">{deliveryEstimate.deliveryRange}</span>
                    </div>
                    <div className="text-[11px] text-zinc-600">
                      ⚡ Factory Dispatch: <strong>{deliveryEstimate.dispatchDate}</strong> ({deliveryEstimate.totalDays})
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Batch Ordering & Quantity Denomination (Admin Fixed MOQ & Step) */}
            <div className="md:col-span-2 p-5 bg-gradient-to-br from-slate-50 via-white to-amber-50/30 border border-slate-200 rounded-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm border border-amber-200/60 shadow-2xs">
                    🔢
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                      Batch Quantity & Denomination Rules (Admin Fixed)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Define the minimum order volume and the exact fixed denomination increment for customer ordering.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-900 px-2.5 py-1 rounded border border-amber-300 shadow-2xs flex-shrink-0 self-start sm:self-center">
                  <RiLockLine className="h-3 w-3" /> Admin Enforced
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Minimum Order Quantity (MOQ) */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-900">
                      Minimum Order Quantity (MOQ)
                    </label>
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Starting Run
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step={quantityStep || 1}
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-mono font-black text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 shadow-2xs"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 uppercase">
                      Units
                    </span>
                  </div>

                  {/* MOQ Presets */}
                  <div>
                    <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block mb-1">
                      Quick MOQ Presets:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[25, 50, 100, 250, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setMinQuantity(preset)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            minQuantity === preset
                              ? 'bg-slate-900 text-[#FFED00] shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Customers cannot place an order below this batch threshold.
                  </p>
                </div>

                {/* 2. Quantity Increasing Denomination (Fixed Step) */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-900">
                      Increasing Denomination (Step)
                    </label>
                    <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      Fixed Step
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={quantityStep}
                      onChange={(e) => setQuantityStep(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-mono font-black text-indigo-950 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-2xs"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-indigo-400 uppercase">
                      +Units/Step
                    </span>
                  </div>

                  {/* Denomination Presets */}
                  <div>
                    <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block mb-1">
                      Quick Denominations:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[25, 50, 100, 250, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuantityStep(preset)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            quantityStep === preset
                              ? 'bg-indigo-900 text-[#FFED00] shadow-2xs'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/60'
                          }`}
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Every stepper click or custom run strictly multiplies by this fixed step.
                  </p>
                </div>

                {/* 3. Maximum Order Quantity Run Cap */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-900">
                      Maximum Quantity (Run Cap)
                    </label>
                    <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      Max Batch
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={minQuantity || 1}
                      step={quantityStep || 100}
                      value={maxQuantity}
                      onChange={(e) => setMaxQuantity(Math.max(minQuantity, Number(e.target.value)))}
                      className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-mono font-black text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 shadow-2xs"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 uppercase">
                      Max Units
                    </span>
                  </div>

                  {/* Max Presets */}
                  <div>
                    <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block mb-1">
                      Quick Max Caps:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[5000, 10000, 25000, 50000, 100000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setMaxQuantity(preset)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            maxQuantity === preset
                              ? 'bg-slate-900 text-[#FFED00] shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {preset >= 1000 ? `${preset / 1000}k` : preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Higher orders automatically route to custom enterprise quoting.
                  </p>
                </div>
              </div>

              {/* Real-Time Customer Storefront Quantity Experience Simulation */}
              <div className="p-4 bg-white rounded-xl border border-amber-200/90 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <RiSparklingFill className="h-4 w-4 text-[#E3A008]" />
                    <span className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider">
                      Live Storefront Quantity Experience Preview
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      MOQ: {minQuantity.toLocaleString()} Units
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Denomination: +{quantityStep.toLocaleString()} Step
                    </span>
                  </div>
                </div>

                {/* Simulated Stepper & Preset Buttons */}
                <div className="space-y-2.5 pt-1">
                  <div className="text-[11px] text-slate-600">
                    Calculated Standard Batch Multiples available to customer:
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      minQuantity,
                      minQuantity + 1 * quantityStep,
                      minQuantity + 2 * quantityStep,
                      minQuantity + 4 * quantityStep,
                      minQuantity + 9 * quantityStep,
                      minQuantity + 24 * quantityStep,
                    ]
                      .filter((val, idx, arr) => val <= maxQuantity && arr.indexOf(val) === idx)
                      .slice(0, 6)
                      .map((val, idx) => (
                        <div
                          key={val}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-black flex items-center gap-1.5 ${
                            idx === 0
                              ? 'bg-slate-900 text-[#FFED00] border-slate-900 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <span>{val.toLocaleString()}</span>
                          <span className="text-[9px] font-normal uppercase text-slate-400">units</span>
                          {idx === 0 && (
                            <span className="text-[8px] bg-amber-400 text-slate-950 px-1 py-0.2 rounded font-black uppercase">
                              MOQ
                            </span>
                          )}
                        </div>
                      ))}
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-400 uppercase font-bold text-[10px]">Valid Sequence:</span>
                      <span className="font-bold text-slate-900">
                        {minQuantity.toLocaleString()}, {(minQuantity + quantityStep).toLocaleString()}, {(minQuantity + 2 * quantityStep).toLocaleString()}, {(minQuantity + 3 * quantityStep).toLocaleString()}, {(minQuantity + 4 * quantityStep).toLocaleString()}... up to {maxQuantity.toLocaleString()}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 hidden sm:inline-block">
                      Step Multiplier Enforced
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Default Product Size (Admin-configured; read-only for customer storefront) */}
            <div className="md:col-span-2 p-5 bg-gradient-to-br from-slate-50 via-white to-amber-50/20 border border-slate-200 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center justify-center font-bold text-sm shadow-2xs">
                    <RiRulerLine className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                      Product Default Size (Fixed Standard Dimensions)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure factory standard manufacturing dimensions manually or choose from presets. Verified for customer storefront.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase bg-slate-200 text-slate-800 px-2.5 py-1 rounded border border-slate-300 flex-shrink-0 self-start sm:self-center">
                  <RiLockLine className="h-3 w-3" /> Storefront Read-Only
                </span>
              </div>

              {/* Mode Selection Tabs: Presets vs Manual Builder vs Freeform Text */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/80 w-fit">
                <button
                  type="button"
                  onClick={() => setSizeInputMode('PRESET')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    sizeInputMode === 'PRESET'
                      ? 'bg-white text-slate-950 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Quick Industry Presets
                </button>
                <button
                  type="button"
                  onClick={() => setSizeInputMode('BUILDER')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    sizeInputMode === 'BUILDER'
                      ? 'bg-white text-indigo-950 shadow-2xs border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📐 Manual Dimension Builder
                </button>
                <button
                  type="button"
                  onClick={() => setSizeInputMode('RAW')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    sizeInputMode === 'RAW'
                      ? 'bg-white text-slate-950 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✍️ Direct Text Input
                </button>
              </div>

              {/* MODE 1: MANUAL DIMENSION BUILDER (WIDTH x HEIGHT x DEPTH x UNIT) */}
              {sizeInputMode === 'BUILDER' && (
                <div className="p-5 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <span className="text-xs font-mono font-black uppercase text-indigo-950 block">
                        Custom Dimension Matrix (Manual Admin Specs)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Type custom width, height, thickness and units. Live preview updates immediately.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const w = manualWidth;
                          const h = manualHeight;
                          setManualWidth(h);
                          setManualHeight(w);
                          const formatted = `${h} ${manualUnit} x ${w} ${manualUnit}${
                            manualDepth ? ` x ${manualDepth} ${manualUnit}` : ''
                          }${manualSizeLabel.trim() ? ` (${manualSizeLabel.trim()})` : ''}`;
                          setDefaultSize(formatted);
                        }}
                        className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                        title="Swap Width and Height"
                      >
                        <RiArrowUpDownLine className="h-3 w-3" />
                        <span>Rotate / Swap (W ↔ H)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    {/* Width */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Width <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={manualWidth}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualWidth(val);
                            if (val && manualHeight) {
                              const formatted = `${val} ${manualUnit} x ${manualHeight} ${manualUnit}${
                                manualDepth ? ` x ${manualDepth} ${manualUnit}` : ''
                              }${manualSizeLabel.trim() ? ` (${manualSizeLabel.trim()})` : ''}`;
                              setDefaultSize(formatted);
                            }
                          }}
                          placeholder="e.g. 89"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-2xs"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 font-bold uppercase">
                          {manualUnit}
                        </span>
                      </div>
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Height <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={manualHeight}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualHeight(val);
                            if (manualWidth && val) {
                              const formatted = `${manualWidth} ${manualUnit} x ${val} ${manualUnit}${
                                manualDepth ? ` x ${manualDepth} ${manualUnit}` : ''
                              }${manualSizeLabel.trim() ? ` (${manualSizeLabel.trim()})` : ''}`;
                              setDefaultSize(formatted);
                            }
                          }}
                          placeholder="e.g. 54"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-2xs"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 font-bold uppercase">
                          {manualUnit}
                        </span>
                      </div>
                    </div>

                    {/* Depth / Thickness */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Depth / Thickness (Optional)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={manualDepth}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualDepth(val);
                            if (manualWidth && manualHeight) {
                              const formatted = `${manualWidth} ${manualUnit} x ${manualHeight} ${manualUnit}${
                                val ? ` x ${val} ${manualUnit}` : ''
                              }${manualSizeLabel.trim() ? ` (${manualSizeLabel.trim()})` : ''}`;
                              setDefaultSize(formatted);
                            }
                          }}
                          placeholder="e.g. 60 (Boxes)"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-2xs"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 font-bold uppercase">
                          {manualUnit}
                        </span>
                      </div>
                    </div>

                    {/* Unit Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Measurement Unit <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={manualUnit}
                        onChange={(e) => {
                          const unit = e.target.value as any;
                          setManualUnit(unit);
                          if (manualWidth && manualHeight) {
                            const formatted = `${manualWidth} ${unit} x ${manualHeight} ${unit}${
                              manualDepth ? ` x ${manualDepth} ${unit}` : ''
                            }${manualSizeLabel.trim() ? ` (${manualSizeLabel.trim()})` : ''}`;
                            setDefaultSize(formatted);
                          }
                        }}
                        className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-2 text-xs font-bold text-indigo-950 focus:outline-none focus:border-indigo-600 shadow-2xs cursor-pointer"
                      >
                        <option value="mm">mm (Millimeters - Standard for Cards & Print)</option>
                        <option value="cm">cm (Centimeters - Standard for Packaging)</option>
                        <option value="in">in (Inches - Standard for US Formats)</option>
                        <option value="ft">ft (Feet - Standard for Flex & Standees)</option>
                        <option value="m">m (Meters - Large Format)</option>
                      </select>
                    </div>
                  </div>

                  {/* Label / Description & Quick Tags */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Specification Description / Variant Label (Optional)
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Included in parentheses for customer clarification
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={manualSizeLabel}
                          onChange={(e) => {
                            const label = e.target.value;
                            setManualSizeLabel(label);
                            if (manualWidth && manualHeight) {
                              const formatted = `${manualWidth} ${manualUnit} x ${manualHeight} ${manualUnit}${
                                manualDepth ? ` x ${manualDepth} ${manualUnit}` : ''
                              }${label.trim() ? ` (${label.trim()})` : ''}`;
                              setDefaultSize(formatted);
                            }
                          }}
                          placeholder="e.g. Standard Landscape, Executive Portrait, Custom Die-Cut Box"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-2xs"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {['Standard Landscape', 'Executive Portrait', 'Square', 'Custom Box'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setManualSizeLabel(tag);
                              if (manualWidth && manualHeight) {
                                const formatted = `${manualWidth} ${manualUnit} x ${manualHeight} ${manualUnit}${
                                  manualDepth ? ` x ${manualDepth} ${manualUnit}` : ''
                                } (${tag})`;
                                setDefaultSize(formatted);
                              }
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold transition cursor-pointer"
                          >
                            +{tag.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Manual Size Action Bar */}
                  <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-900 uppercase">
                        Live Generated Format:
                      </span>
                      <span className="text-xs font-mono font-black text-indigo-950 bg-white px-2.5 py-1 rounded border border-indigo-200">
                        {manualWidth && manualHeight
                          ? `${manualWidth} ${manualUnit} x ${manualHeight} ${manualUnit}${
                              manualDepth ? ` x ${manualDepth} ${manualUnit}` : ''
                            }${manualSizeLabel.trim() ? ` (${manualSizeLabel.trim()})` : ''}`
                          : 'Enter width and height above'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!manualWidth || !manualHeight) {
                          alert('Please specify both width and height.');
                          return;
                        }
                        const formatted = `${manualWidth} ${manualUnit} x ${manualHeight} ${manualUnit}${
                          manualDepth ? ` x ${manualDepth} ${manualUnit}` : ''
                        }${manualSizeLabel.trim() ? ` (${manualSizeLabel.trim()})` : ''}`;
                        setDefaultSize(formatted);
                      }}
                      className="px-4 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white font-black text-xs rounded-lg shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
                    >
                      <RiCheckboxCircleLine className="h-4 w-4 text-[#FFED00]" />
                      <span>Sync & Confirm Manual Size</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 2: QUICK INDUSTRY PRESETS */}
              {sizeInputMode === 'PRESET' && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3 animate-in fade-in">
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Click any preset to apply standard factory dimensions:
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {[
                      { label: 'Visiting Card', size: '89 mm x 54 mm (Standard Visiting Card)', category: 'Cards' },
                      { label: 'Euro Card', size: '90 mm x 50 mm (European Business Card)', category: 'Cards' },
                      { label: 'Square Card', size: '65 mm x 65 mm (Square Card)', category: 'Cards' },
                      { label: 'A4 Letterhead', size: 'A4 (210 mm x 297 mm)', category: 'Paper' },
                      { label: 'A5 Flyer/Note', size: 'A5 (148 mm x 210 mm)', category: 'Paper' },
                      { label: 'A3 Poster', size: 'A3 (297 mm x 420 mm)', category: 'Paper' },
                      { label: 'A6 Postcard', size: 'A6 (105 mm x 148 mm)', category: 'Paper' },
                      { label: 'Standee (2.5x6 ft)', size: '2.5 x 6 ft (800 x 2000 mm Aluminium Base)', category: 'Large Format' },
                      { label: 'Flex Banner (3x6 ft)', size: '3 x 6 ft (900 x 1800 mm Outdoor Banner)', category: 'Large Format' },
                      { label: 'Hoarding (4x8 ft)', size: '4 x 8 ft (1200 x 2400 mm Large Format)', category: 'Large Format' },
                      { label: 'Rigid Box', size: '200 mm x 150 mm x 60 mm (Custom Presentation Box)', category: 'Packaging' },
                      { label: 'Cube Box', size: '100 mm x 100 mm x 100 mm (Rigid Cube Box)', category: 'Packaging' },
                    ].map((preset) => (
                      <button
                        key={preset.size}
                        type="button"
                        onClick={() => setDefaultSize(preset.size)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          defaultSize === preset.size
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs ring-1 ring-slate-900'
                            : 'bg-slate-50/70 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className={`text-[10px] font-mono font-bold uppercase ${defaultSize === preset.size ? 'text-[#FFED00]' : 'text-slate-400'}`}>
                          {preset.category}
                        </div>
                        <div className="text-xs font-bold truncate mt-0.5">
                          {preset.label}
                        </div>
                        <div className={`text-[10px] font-mono truncate mt-0.5 ${defaultSize === preset.size ? 'text-slate-300' : 'text-slate-500'}`}>
                          {preset.size.split('(')[0]}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MODE 3: DIRECT RAW TEXT INPUT */}
              {sizeInputMode === 'RAW' && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-800">
                    Freeform Dimension String
                  </label>
                  <input
                    type="text"
                    value={defaultSize}
                    onChange={(e) => setDefaultSize(e.target.value)}
                    placeholder="e.g. 89 mm x 54 mm (Standard Visiting Card) or 2.5 x 6 ft"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 placeholder:font-normal placeholder:text-slate-400 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-500">
                    Type whatever custom measurements, shapes, or notes you want to display on the storefront.
                  </p>
                </div>
              )}

              {/* CURRENT ACTIVE SIZE STATUS & STOREFRONT LIVE PREVIEW */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-base flex-shrink-0 border border-amber-200">
                    📐
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                        Current Configured Size:
                      </span>
                      {defaultSize ? (
                        <span className="text-xs font-mono font-black text-slate-900">
                          {defaultSize}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-slate-400 italic">
                          No default size configured
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Customers will see this verified size badge on the product configurator.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {defaultSize && (
                    <button
                      type="button"
                      onClick={() => setDefaultSize('')}
                      className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold transition cursor-pointer"
                    >
                      Clear Size
                    </button>
                  )}
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                    <RiSparklingFill className="h-3 w-3 text-[#E3A008]" />
                    {defaultSize ? 'Active' : 'Unset'}
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-800 mb-1">Product Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg p-3 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                placeholder="Industrial printing details, machines and substrates..."
              />
            </div>
          </div>

          {renderBottomTabNavigation('GENERAL')}
        </div>
      )}

      {/* TAB 2: MEDIA GALLERY (PHOTOS & VIDEO DEMOS) */}
      {activeTab === 'MEDIA' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <RiFilmLine className="h-4 w-4 text-indigo-600" />
                Product Media & Video Gallery
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Upload multiple high-res product photos and <strong>product demo videos (MP4, WEBM, MOV)</strong> or add remote stream URLs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setUploadMode('URL');
                  setIsAddImageModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs px-3.5 py-2 rounded-lg border border-zinc-300 transition cursor-pointer"
              >
                <RiLinkM className="h-4 w-4 text-zinc-600" />
                <span>Add Video / Image URL</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadMode('FILE');
                  setIsAddImageModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-[#FCDD55] text-zinc-950 font-black text-xs px-3.5 py-2 rounded-lg border border-zinc-900 shadow-sm hover:bg-[#F3CE3E] transition cursor-pointer active:scale-95"
              >
                <RiUploadCloud2Line className="h-4 w-4" />
                <span>Upload Photos / Video Clip</span>
              </button>
            </div>
          </div>

          {/* Quick Drag & Drop Upload Strip (Photos & Videos) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleQuickUpload(e.dataTransfer.files);
              }
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              isDragOver
                ? 'border-indigo-600 bg-indigo-50/50'
                : 'border-zinc-200 bg-zinc-50/60 hover:border-zinc-400 hover:bg-zinc-50'
            }`}
          >
            <input
              type="file"
              id="quick-image-upload"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/jpg,image/gif,video/mp4,video/webm,video/quicktime,video/ogg,video/m4v"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleQuickUpload(e.target.files);
                }
              }}
            />
            <label
              htmlFor="quick-image-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="h-11 w-11 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 shadow-sm">
                {isUploading ? (
                  <RiLoader4Line className="h-5 w-5 animate-spin text-zinc-900" />
                ) : (
                  <div className="flex items-center gap-1 text-indigo-700">
                    <RiUploadCloud2Line className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="text-xs">
                <span className="font-bold text-zinc-900 underline">Click to upload photos or demo videos</span>
                <span className="text-zinc-500"> or drag and drop media files directly here</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                📸 Images (PNG, JPG, WEBP, SVG) & 🎥 Videos (MP4, WEBM, MOV up to 100MB) • Multi-upload enabled
              </p>
            </label>
          </div>

          {/* Media Grid Cards */}
          {product.images && product.images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {product.images.map((img) => {
                const isVideo = isVideoMedia(img.url);
                return (
                  <div
                    key={img.id}
                    className={`relative rounded-xl border overflow-hidden bg-zinc-50 flex flex-col justify-between group transition-all duration-200 ${
                      img.isPrimary ? 'border-zinc-900 ring-2 ring-[#FCDD55] shadow-md' : 'border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <div className="relative h-48 w-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                      {isVideo ? (
                        <video
                          src={resolveImageUrl(img.url)}
                          controls
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={resolveImageUrl(img.url)}
                          alt={img.altText || ''}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}

                      {/* Video vs Photo Badge */}
                      <span
                        className={`absolute top-2 right-2 text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1 ${
                          isVideo
                            ? 'bg-indigo-900 text-white border border-indigo-700'
                            : 'bg-black/60 backdrop-blur-xs text-white'
                        }`}
                      >
                        {isVideo ? (
                          <>
                            <RiMovieLine className="h-3 w-3 text-[#FFED00]" />
                            <span>VIDEO CLIP</span>
                          </>
                        ) : (
                          <>
                            <RiImage2Line className="h-3 w-3" />
                            <span>PHOTO</span>
                          </>
                        )}
                      </span>

                      {img.isPrimary && (
                        <span className="absolute top-2 left-2 bg-zinc-900 text-[#FCDD55] text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-sm border border-zinc-800">
                          PRIMARY COVER
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-white border-t border-zinc-100 space-y-2">
                      <div className="flex items-center gap-1.5">
                        {isVideo && <RiPlayCircleLine className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />}
                        <p className="text-xs font-bold text-zinc-800 truncate">{img.altText || (isVideo ? 'Product Demo Video' : 'Product Image')}</p>
                      </div>
                      {img.caption && <p className="text-[10px] text-zinc-500 truncate">{img.caption}</p>}

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-50">
                        {!img.isPrimary ? (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(img.id)}
                            className="text-[10px] font-bold text-zinc-700 hover:text-zinc-900 underline cursor-pointer"
                          >
                            Set Primary Cover
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <RiCheckboxCircleLine className="h-3.5 w-3.5" />
                            Default Showcase
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          className="p-1 rounded text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete media asset"
                        >
                          <RiDeleteBin7Line className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 border-2 border-dashed border-zinc-200 rounded-xl text-center p-8 bg-zinc-50/50">
              <div className="flex items-center justify-center gap-2 mb-2 text-zinc-300">
                <RiImage2Line className="h-10 w-10" />
                <RiMovieLine className="h-10 w-10 text-indigo-200" />
              </div>
              <p className="text-xs font-bold text-zinc-700">No photos or videos added yet</p>
              <p className="text-xs text-zinc-500 mt-0.5">Upload local photos or product video clips in the area above.</p>
            </div>
          )}

          {renderBottomTabNavigation('MEDIA')}
        </div>
      )}

      {/* TAB 3: DYNAMIC FIELDS BUILDER */}
      {activeTab === 'FIELDS' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                Custom Dynamic Field Engine
              </h2>
              <p className="text-xs text-zinc-500">
                Define the exact customer-facing steps, dropdown options, and price modifiers. Zero hardcoding!
              </p>
            </div>
            <button
              onClick={() => setIsAddFieldModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#FCDD55] text-zinc-950 font-black text-xs px-3.5 py-2 rounded-lg border border-zinc-900 shadow-sm"
            >
              <RiAddLine className="h-4 w-4" />
              <span>+ Add Field</span>
            </button>
          </div>

          {product.fields && product.fields.length > 0 ? (
            <div className="space-y-4">
              {product.fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3 hover:border-zinc-300 transition"
                >
                  {/* Field Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded bg-zinc-900 text-[#FCDD55] font-mono font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-zinc-900">{field.label}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 font-bold">
                            {field.type}
                          </span>
                          {field.isRequired && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                              REQUIRED
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          Key: <code className="text-zinc-700 font-bold">{field.key}</code>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveFieldForOption(field.id)}
                        className="px-2.5 py-1 text-xs font-bold text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition"
                      >
                        + Add Option
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg"
                        title="Delete Field"
                      >
                        <RiDeleteBin7Line className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {field.description && (
                    <p className="text-xs text-zinc-500">{field.description}</p>
                  )}

                  {/* Conditional Rule Badge if present */}
                  {field.conditionalLogic && (
                    <div className="p-2 rounded bg-amber-50/80 border border-amber-200 text-[11px] font-mono text-amber-900 flex items-center gap-1.5">
                      <RiInformationLine className="h-3.5 w-3.5 text-amber-600" />
                      <span>
                        Conditional: Visible only when{' '}
                        <strong>{field.conditionalLogic.dependsOnFieldKey}</strong> = &quot;
                        <strong>{field.conditionalLogic.value}</strong>&quot;
                      </span>
                    </div>
                  )}

                  {/* Options List */}
                  {field.options && field.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                      {field.options.map((opt) => (
                        <div
                          key={opt.id}
                          className="p-2.5 rounded-lg bg-white border border-zinc-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-zinc-800 block truncate">{opt.label}</span>
                            <span className="text-[10px] font-mono text-zinc-400 block">
                              val: {opt.value}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {Number(opt.priceModifier) > 0 ? `+${formatCurrency(Number(opt.priceModifier))}` : '₹0'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(field.id, opt.id)}
                              className="text-zinc-400 hover:text-red-500"
                            >
                              <RiCloseLine className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 border-2 border-dashed border-zinc-200 rounded-xl text-center p-8">
              <RiListSettingsLine className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-zinc-700">No dynamic fields configured</p>
              <p className="text-xs text-zinc-500 mt-0.5">Click &quot;+ Add Field&quot; to define paper types, dimensions, or finishes.</p>
            </div>
          )}

          {renderBottomTabNavigation('FIELDS')}
        </div>
      )}

      {/* TAB 4: ARTWORK & DESIGN CONFIGURATION (ADMIN-DRIVEN FLOW ENGINE) */}
      {activeTab === 'ARTWORK_DESIGN' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#1A1A1A]"></span>
                Artwork & Design Workflow Configuration
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure requirement modes (Required, Optional, Disabled), service pricing, and preflight quality thresholds.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveGeneral}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-[#FCDD55] hover:bg-[#FBBF24] text-zinc-950 font-black text-xs px-4 py-2 rounded-lg border border-zinc-900 shadow-sm transition active:scale-95"
            >
              <RiSaveLine className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>

          {/* 1. ARTWORK CONFIGURATION */}
          <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                  1. Customer Artwork File
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Controls whether the customer must provide a print-ready artwork file.
                </p>
              </div>
            </div>

            {/* Requirement Mode Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wide">
                Requirement Mode:
              </label>
              <div className="grid grid-cols-3 gap-3 max-w-lg">
                {(['REQUIRED', 'OPTIONAL', 'DISABLED'] as ProductOptionRequirement[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setArtworkRequirement(mode)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                      artworkRequirement === mode
                        ? 'bg-zinc-900 text-[#FCDD55] border-zinc-900 shadow-sm ring-1 ring-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {mode === 'REQUIRED' && 'Required'}
                    {mode === 'OPTIONAL' && 'Optional'}
                    {mode === 'DISABLED' && 'Disabled'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dependent Artwork Settings (Only if not Disabled) */}
            {artworkRequirement !== 'DISABLED' && (
              <div className="pt-3 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Artwork Service Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={artworkPrice}
                    onChange={(e) => setArtworkPrice(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono font-bold text-zinc-900"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Added to order total when artwork is uploaded/required. Set ₹0 for free.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800">
                      Artwork Quality Verification
                    </label>
                    <button
                      type="button"
                      onClick={() => setArtworkQualityVerification(!artworkQualityVerification)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                        artworkQualityVerification
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {artworkQualityVerification ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {artworkQualityVerification && (
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                        Minimum Artwork Quality (Megapixels)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={minimumArtworkMegapixels}
                        onChange={(e) => setMinimumArtworkMegapixels(Number(e.target.value))}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono font-bold text-zinc-900"
                      />
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Calculated server-side via (width × height) / 1,000,000. Customer receives quality warning if below this threshold.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. REFERENCE IMAGE CONFIGURATION */}
          <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-4">
            <div>
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                2. Reference Design Image
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Allows or requires customer to upload design samples, photos of existing prints, or layout references.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wide">
                Requirement Mode:
              </label>
              <div className="grid grid-cols-3 gap-3 max-w-lg">
                {(['REQUIRED', 'OPTIONAL', 'DISABLED'] as ProductOptionRequirement[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setReferenceImageRequirement(mode)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                      referenceImageRequirement === mode
                        ? 'bg-zinc-900 text-[#FCDD55] border-zinc-900 shadow-sm ring-1 ring-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {mode === 'REQUIRED' && 'Required'}
                    {mode === 'OPTIONAL' && 'Optional'}
                    {mode === 'DISABLED' && 'Disabled'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. DESIGN SERVICE CONFIGURATION */}
          <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-4">
            <div>
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                3. Professional Design Service
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Offer prepress design assistance for customers who lack print-ready files.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wide">
                Requirement Mode:
              </label>
              <div className="grid grid-cols-3 gap-3 max-w-lg">
                {(['REQUIRED', 'OPTIONAL', 'DISABLED'] as ProductOptionRequirement[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDesignServiceRequirement(mode)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                      designServiceRequirement === mode
                        ? 'bg-zinc-900 text-[#FCDD55] border-zinc-900 shadow-sm ring-1 ring-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {mode === 'REQUIRED' && 'Required'}
                    {mode === 'OPTIONAL' && 'Optional'}
                    {mode === 'DISABLED' && 'Disabled'}
                  </button>
                ))}
              </div>
            </div>

            {designServiceRequirement !== 'DISABLED' && (
              <div className="pt-3 border-t border-zinc-200 max-w-md">
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Design Service Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={designServicePrice}
                  onChange={(e) => setDesignServicePrice(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono font-bold text-zinc-900"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Charged when customer selects design service or when design service is mandatory.
                </p>
              </div>
            )}
          </div>

          {renderBottomTabNavigation('ARTWORK_DESIGN')}
        </div>
      )}

      {/* TAB 5: PRICING RULES & QUANTITY TIER OFFERS */}
      {activeTab === 'PRICING' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <RiDiscountPercentLine className="h-5 w-5 text-amber-500" />
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                  Quantity Tier Offers & Bulk Pricing Rules
                </h2>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Configure quantity threshold discounts. When customers order above these thresholds, the discount % is <strong>auto-applied</strong> instantly in the cart and checkout.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleApplyPresetRules('STANDARD')}
                disabled={isLoadingRules}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition flex items-center gap-1.5 cursor-pointer"
                title="Populate 500 (5%), 1000 (10%), 2500 (15%), 5000 (20%) tiers"
              >
                <RiCoupon3Line className="h-3.5 w-3.5 text-amber-500" />
                <span>Standard Tiers</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetRules('WHOLESALE')}
                disabled={isLoadingRules}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition flex items-center gap-1.5 cursor-pointer"
                title="Populate Commercial Wholesale volume tiers"
              >
                <RiMoneyDollarCircleLine className="h-3.5 w-3.5 text-emerald-600" />
                <span>Wholesale Tiers</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddRuleModal}
                className="px-3.5 py-1.5 rounded-lg bg-[#FCDD55] text-zinc-950 font-black text-xs border border-zinc-900 shadow-sm hover:bg-[#FBBF24] transition flex items-center gap-1.5 cursor-pointer"
              >
                <RiAddLine className="h-4 w-4" />
                <span>Add Offer Tier</span>
              </button>
            </div>
          </div>

          {/* Pricing Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[11px] font-bold text-zinc-500 uppercase font-mono block">Base Unit Price</span>
              <div className="text-xl font-black text-zinc-900 font-mono mt-1">
                {formatCurrency(basePrice)}
              </div>
              <span className="text-[10px] text-zinc-400">Starting rate for 1 unit</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[11px] font-bold text-zinc-500 uppercase font-mono block">Pricing Model</span>
              <div className="text-xl font-black text-zinc-900 font-mono mt-1 uppercase">
                {product.pricingModel || 'TIERED'}
              </div>
              <span className="text-[10px] text-zinc-400">Automatic volume discount model</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
              <span className="text-[11px] font-bold text-amber-800 uppercase font-mono block">Configured Tiers</span>
              <div className="text-xl font-black text-amber-950 font-mono mt-1">
                {pricingRules.length} Active Rules
              </div>
              <span className="text-[10px] text-amber-700">Applied automatically on customer selection</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800 uppercase font-mono block">Max Offer Discount</span>
              <div className="text-xl font-black text-emerald-700 font-mono mt-1">
                {pricingRules.length > 0
                  ? `${Math.max(
                      0,
                      ...pricingRules.map((r) => {
                        const combo = (r.attributeCombination as any) || {};
                        return r.discountPercent || combo.discountPercent || 0;
                      })
                    )}% OFF`
                  : '0% OFF'}
              </div>
              <span className="text-[10px] text-emerald-600">Peak customer volume savings</span>
            </div>
          </div>

          {/* Pricing Rules Table */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-zinc-800 font-mono">
                Active Quantity Tiers ({pricingRules.length})
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Sorted by Minimum Quantity Ascending
              </span>
            </div>

            {pricingRules.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                  <RiCoupon3Line className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">No Quantity Offer Rules Configured Yet</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                    Set up bulk offer tiers (e.g., 500+ units: 10% OFF) to incentivize customers to place larger print runs.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPresetRules('STANDARD')}
                    className="px-3.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-bold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                  >
                    Apply Standard 4-Tier Presets
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddRuleModal}
                    className="px-4 py-1.5 rounded-lg bg-[#FCDD55] text-zinc-950 font-black text-xs border border-zinc-900 shadow-sm hover:bg-[#FBBF24] cursor-pointer"
                  >
                    + Create Custom Rule
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 uppercase font-mono text-[10px]">
                      <th className="py-2.5 px-4 font-bold">Quantity Range</th>
                      <th className="py-2.5 px-4 font-bold">Offer Badge / Label</th>
                      <th className="py-2.5 px-4 font-bold text-right">Discount %</th>
                      <th className="py-2.5 px-4 font-bold text-right">Offer Unit Price</th>
                      <th className="py-2.5 px-4 font-bold text-right">Est. Savings / 1,000 Units</th>
                      <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {pricingRules
                      .slice()
                      .sort((a, b) => a.minQty - b.minQty)
                      .map((rule) => {
                        const combo = (rule.attributeCombination as any) || {};
                        const disc = rule.discountPercent ?? combo.discountPercent ?? 0;
                        const label = rule.label || combo.label || `${disc}% OFF Bulk Tier`;
                        const unitRate = Number(rule.unitPrice);
                        const savingsPerUnit = Math.max(0, Number(basePrice) - unitRate);
                        const savingsPer1k = savingsPerUnit * 1000;

                        return (
                          <tr key={rule.id} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                              <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                {rule.minQty.toLocaleString()}
                                {rule.maxQty && rule.maxQty < 999999
                                  ? ` – ${rule.maxQty.toLocaleString()}`
                                  : '+'} units
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded text-[11px]">
                                <span>🎉</span>
                                <span>{label}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                              {disc > 0 ? `${disc}% OFF` : 'Custom Rate'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <div className="font-bold text-zinc-900">
                                {formatCurrency(unitRate)} <span className="text-[10px] text-zinc-400 font-normal">/ unit</span>
                              </div>
                              {disc > 0 && (
                                <div className="text-[10px] text-zinc-400 line-through">
                                  {formatCurrency(basePrice)}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                              {savingsPer1k > 0 ? formatCurrency(savingsPer1k) : '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRuleModal(rule)}
                                  className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition cursor-pointer"
                                  title="Edit Tier Rule"
                                >
                                  <RiEditLine className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  disabled={isDeletingRuleId === rule.id}
                                  className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Delete Tier Rule"
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
              </div>
            )}
          </div>

          {/* Live Admin Tier Simulator & Verification Sandbox */}
          <div className="p-5 bg-gradient-to-r from-amber-50/50 via-zinc-50 to-emerald-50/40 rounded-xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiSparklingFill className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-black uppercase text-zinc-900 tracking-wider font-mono">
                  Live Rule Evaluation Simulator
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200">
                Runtime Match Verification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Test Quantity: <strong className="text-zinc-900 font-mono">{testSimQty.toLocaleString()} units</strong>
                </label>
                <input
                  type="range"
                  min="50"
                  max="10000"
                  step="50"
                  value={testSimQty}
                  onChange={(e) => setTestSimQty(Number(e.target.value))}
                  className="w-full accent-zinc-900"
                />
                <input
                  type="number"
                  min="1"
                  value={testSimQty}
                  onChange={(e) => setTestSimQty(Math.max(1, Number(e.target.value)))}
                  className="w-full mt-1.5 bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs font-mono text-zinc-900"
                />
              </div>

              {(() => {
                const matched = pricingRules
                  .slice()
                  .sort((a, b) => a.minQty - b.minQty)
                  .reverse()
                  .find((r) => testSimQty >= r.minQty && (r.maxQty === null || r.maxQty === undefined || testSimQty <= r.maxQty));

                const combo = (matched?.attributeCombination as any) || {};
                const disc = matched ? (matched.discountPercent ?? combo.discountPercent ?? 0) : 0;
                const unitRate = matched ? Number(matched.unitPrice) : Number(basePrice);
                const subtotal = unitRate * testSimQty;
                const originalTotal = Number(basePrice) * testSimQty;
                const savings = Math.max(0, originalTotal - subtotal);

                return (
                  <>
                    <div className="p-3 bg-white rounded-lg border border-zinc-200 shadow-2xs space-y-1">
                      <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 block">
                        Matched Tier Rule
                      </span>
                      {matched ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <span>🎉</span>
                          <span className="truncate">{matched.label || combo.label || `${disc}% OFF`}</span>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-zinc-500">
                          Standard Base Rate (No Tier Matched)
                        </div>
                      )}
                      <div className="text-[11px] font-mono font-bold text-emerald-600">
                        {disc > 0 ? `${disc}% Discount Applied` : '0% Discount'}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-zinc-200 shadow-2xs space-y-1">
                      <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 block">
                        Effective Price & Savings
                      </span>
                      <div className="text-xs font-bold text-zinc-900 font-mono">
                        {formatCurrency(unitRate)} / unit • Total: {formatCurrency(subtotal)}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-emerald-700">
                        Customer Saves: {formatCurrency(savings)}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* FULFILLMENT & PAYMENT SURCHARGES: COURIER & COD CONFIGURATION */}
          <div className="pt-6 border-t border-zinc-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <RiTruckLine className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider font-mono">
                    Courier Shipping & COD Payment Surcharges
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Configure per-product delivery rates, free delivery thresholds, and Cash on Delivery (COD) handling surcharges. Click any preset or enter custom values.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveGeneral}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RiLoader4Line className="h-4 w-4 animate-spin" />
                    <span>Saving Rules...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <RiCheckboxCircleLine className="h-4 w-4 text-emerald-400" />
                    <span>Changes Saved!</span>
                  </>
                ) : (
                  <>
                    <RiShieldCheckLine className="h-4 w-4 text-[#FFED00]" />
                    <span>Save Fulfillment Rules</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Courier / Shipping Delivery Rate */}
              <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/60 space-y-4 hover:border-zinc-300 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <RiTruckLine className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider font-mono">
                        Doorstep Courier Rate
                      </h4>
                      <span className="text-[11px] text-zinc-500">
                        Direct shipment to customer address
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                    {courierCharge === 0 ? 'FREE DELIVERY' : `₹${courierCharge} / order`}
                  </span>
                </div>

                {/* Clickable Quick Presets */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
                    Quick Courier Presets (Click to Apply)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Free Shipping', value: 0, threshold: 0 },
                      { label: 'Standard (₹100)', value: 100, threshold: 1000 },
                      { label: 'Express (₹250)', value: 250, threshold: 2500 },
                      { label: 'Heavy Cargo (₹500)', value: 500, threshold: 5000 },
                    ].map((preset) => {
                      const isSelected = courierCharge === preset.value;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setCourierCharge(preset.value);
                            setFreeShippingThreshold(preset.threshold);
                          }}
                          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 ring-1.5 ring-indigo-600 shadow-2xs'
                              : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="text-xs font-bold text-zinc-900 truncate">
                            {preset.label}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {preset.value === 0 ? 'Always Free' : `Free over ₹${preset.threshold}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Courier Charge (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 font-mono">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={courierCharge}
                        onChange={(e) => setCourierCharge(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-zinc-200 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      Fee added when order is shipped via courier
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Free Shipping Above (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 font-mono">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={freeShippingThreshold}
                        onChange={(e) => setFreeShippingThreshold(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-zinc-200 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      Set 0 to disable free shipping threshold
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: COD (Cash on Delivery) Surcharge & Availability */}
              <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/60 space-y-4 hover:border-zinc-300 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <RiHandCoinLine className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider font-mono">
                        Cash on Delivery (COD) Rules
                      </h4>
                      <span className="text-[11px] text-zinc-500">
                        Pay on delivery handling fee & permission
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${
                      allowCod
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-rose-700 bg-rose-50 border-rose-200'
                    }`}
                  >
                    {allowCod ? (codSurcharge === 0 ? 'COD FREE' : `COD +₹${codSurcharge}`) : 'COD DISABLED'}
                  </span>
                </div>

                {/* Clickable Quick Presets */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
                    Quick COD Presets (Click to Apply)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'COD Enabled (₹0)', allow: true, surcharge: 0 },
                      { label: 'Standard COD (₹50)', allow: true, surcharge: 50 },
                      { label: 'High Risk (₹100)', allow: true, surcharge: 100 },
                      { label: 'Disable COD', allow: false, surcharge: 0 },
                    ].map((preset) => {
                      const isSelected = allowCod === preset.allow && (!preset.allow || codSurcharge === preset.surcharge);
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setAllowCod(preset.allow);
                            if (preset.allow) {
                              setCodSurcharge(preset.surcharge);
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 ring-1.5 ring-emerald-600 shadow-2xs'
                              : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="text-xs font-bold text-zinc-900 truncate">
                            {preset.label}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {preset.allow ? `+₹${preset.surcharge} surcharge` : 'Online Only'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* COD Toggle & Custom Surcharge */}
                <div className="space-y-3 pt-2">
                  <div
                    onClick={() => setAllowCod(!allowCod)}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={allowCod}
                        onChange={(e) => setAllowCod(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer accent-zinc-900"
                      />
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block">
                          Allow Cash on Delivery (COD)
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Customers can select COD at checkout for this product
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded ${allowCod ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'}`}>
                      {allowCod ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  {allowCod && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        COD Handling Surcharge (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 font-mono">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={codSurcharge}
                          onChange={(e) => setCodSurcharge(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-white border border-zinc-200 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        Extra fee added to order when customer selects Cash on Delivery
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {renderBottomTabNavigation('PRICING')}
        </div>
      )}

      {/* TAB 6: LIVE STOREFRONT SIMULATOR (USES EXACT SAME CUSTOMER FLOW ENGINE) */}
      {activeTab === 'PREVIEW' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <RiSparklingFill className="h-4 w-4 text-[#FCDD55]" />
                Live Customer Flow Simulator
              </h2>
              <p className="text-xs text-zinc-500">
                Exact runtime ProductConfigurationFlow component that powers the storefront. Test artwork requirements, megapixels verification, design services, and live pricing.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-[#FCDD55] text-zinc-950 px-2.5 py-1 rounded">
              UNIFIED ENGINE
            </span>
          </div>

          <ProductConfigurationFlow
            product={{
              ...product,
              name,
              basePrice,
              minQuantity,
              quantityStep,
              maxQuantity,
              productionDays,
              defaultSize,
              artworkRequirement,
              artworkPrice,
              artworkQualityVerification,
              minimumArtworkMegapixels,
              referenceImageRequirement,
              designServiceRequirement,
              designServicePrice,
            }}
            isPreviewMode={true}
          />

          {renderBottomTabNavigation('PREVIEW')}
        </div>
      )}

      {/* MODAL: ADD / UPLOAD PRODUCT IMAGE */}
      {isAddImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <RiFilmLine className="h-5 w-5 text-indigo-700" />
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                  Add Media Asset (Photo or Demo Video)
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddImageModalOpen(false);
                  clearSelectedFile();
                }}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            {/* Upload Method Tabs */}
            <div className="flex border-b border-zinc-100 bg-zinc-50/50 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setUploadMode('FILE')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  uploadMode === 'FILE'
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <RiUploadCloud2Line className="h-4 w-4" />
                <span>Upload Local File (Image/Video)</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('URL')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  uploadMode === 'URL'
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <RiLinkM className="h-4 w-4" />
                <span>Remote URL / Stream</span>
              </button>
            </div>

            <form onSubmit={handleAddImage} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* LOCAL FILE UPLOAD MODE */}
              {uploadMode === 'FILE' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                    Select Local Image or Video File *
                  </label>
                  {!filePreview ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileSelect(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-zinc-300 hover:border-zinc-900 bg-zinc-50/50 hover:bg-zinc-50'
                      }`}
                    >
                      <input
                        type="file"
                        id="modal-image-file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/jpg,image/gif,video/mp4,video/webm,video/quicktime,video/ogg,video/m4v"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />
                      <label htmlFor="modal-image-file" className="cursor-pointer space-y-2 block">
                        <div className="h-12 w-12 rounded-full bg-white border border-zinc-200 flex items-center justify-center mx-auto text-indigo-700 shadow-sm">
                          <RiUploadCloud2Line className="h-6 w-6" />
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-zinc-900 underline">Click to browse file</span>
                          <span className="text-zinc-500"> or drag and drop</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          PNG, JPG, WEBP, SVG, MP4, WEBM, MOV up to 100MB
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative rounded-xl border border-zinc-200 bg-zinc-50 p-3 flex items-center gap-3.5">
                      <div className="h-24 w-28 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-300 flex-shrink-0 flex items-center justify-center">
                        {selectedFile && (selectedFile.type.startsWith('video/') || selectedFile.name.match(/\.(mp4|webm|mov|ogg|m4v|mkv)$/i)) ? (
                          <video src={filePreview} controls className="h-full w-full object-cover" />
                        ) : (
                          <img src={filePreview} alt="Selected preview" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate">{selectedFile?.name}</p>
                        <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                          {selectedFile?.size ? (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB' : ''} •{' '}
                          {selectedFile?.type || 'media'}
                        </p>
                        <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Ready to Upload
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={clearSelectedFile}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                        title="Remove selection"
                      >
                        <RiDeleteBin7Line className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* REMOTE URL MODE */}
              {uploadMode === 'URL' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Direct Image / Video Stream URL *
                  </label>
                  <input
                    type="url"
                    required={uploadMode === 'URL'}
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://example.com/demo.mp4 or https://images.unsplash.com/..."
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono focus:border-indigo-600 focus:outline-none"
                  />
                  {newImageUrl && (
                    <div className="mt-2 h-32 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-900 flex items-center justify-center">
                      {isVideoMedia(newImageUrl) ? (
                        <video src={newImageUrl} controls className="h-full w-full object-cover" />
                      ) : (
                        <img
                          src={newImageUrl}
                          alt="URL Preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as any).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* METADATA FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Alt Text (Accessibility)</label>
                  <input
                    type="text"
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                    placeholder="e.g. Matte Laminated Business Card"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Caption (Optional)</label>
                  <input
                    type="text"
                    value={newImageCaption}
                    onChange={(e) => setNewImageCaption(e.target.value)}
                    placeholder="e.g. 350 GSM Velvet Finish"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Primary Image Toggle */}
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isPrimaryImage}
                  onChange={(e) => setIsPrimaryImage(e.target.checked)}
                  className="h-4 w-4 rounded accent-zinc-900"
                />
                <span>Set as primary catalogue thumbnail</span>
              </label>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setIsAddImageModalOpen(false);
                    clearSelectedFile();
                  }}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (uploadMode === 'FILE' && !selectedFile) || (uploadMode === 'URL' && !newImageUrl)}
                  className="px-5 py-2 rounded-lg bg-[#FCDD55] text-zinc-950 font-black text-xs border border-zinc-900 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RiLoader4Line className="h-4 w-4 animate-spin" />
                      <span>Uploading Media...</span>
                    </>
                  ) : (
                    <>
                      <RiUploadCloud2Line className="h-4 w-4" />
                      <span>{uploadMode === 'FILE' ? 'Upload & Save Image' : 'Save Image URL'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DYNAMIC FIELD */}
      {isAddFieldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="text-xs font-black text-zinc-900 uppercase">
                Configure Custom Dynamic Field
              </h3>
              <button onClick={() => setIsAddFieldModalOpen(false)} className="p-1 rounded text-zinc-400">
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateField} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Field Label *</label>
                  <input
                    type="text"
                    required
                    value={fieldLabel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFieldLabel(val);
                      if (!isFieldKeyTouched) {
                        setFieldKey(
                          val
                            .toLowerCase()
                            .trim()
                            .replace(/[^a-z0-9]+/g, '_')
                            .replace(/(^_|_$)+/g, ''),
                        );
                      }
                    }}
                    placeholder="e.g. Paper Substrate"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-900 shadow-2xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-zinc-800">Internal Key</label>
                    <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                      ✨ Auto-fills from Label
                    </span>
                  </div>
                  <input
                    type="text"
                    value={fieldKey}
                    onChange={(e) => {
                      setFieldKey(e.target.value);
                      setIsFieldKeyTouched(true);
                    }}
                    placeholder="e.g. paper_substrate"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 shadow-2xs"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Used for price formulas & ERP job tickets (auto-generated).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Field Type *</label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold"
                  >
                    <option value="SELECT">SELECT (Dropdown / Cards)</option>
                    <option value="RADIO">RADIO (Select One)</option>
                    <option value="TOGGLE">TOGGLE (Yes / No Switch)</option>
                    <option value="NUMBER">NUMBER (Length, GSM, etc.)</option>
                    <option value="TEXT">TEXT (Single line)</option>
                    <option value="TEXTAREA">TEXTAREA (Multi line notes)</option>
                    <option value="COLOR">COLOR (Color Swatch)</option>
                    <option value="RANGE">RANGE (Slider)</option>
                    <option value="FILE">FILE (Artwork Attachment)</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldRequired}
                      onChange={(e) => setFieldRequired(e.target.checked)}
                      className="h-4 w-4 rounded accent-zinc-900"
                    />
                    <span>Required Field</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Customer Helper Description</label>
                <input
                  type="text"
                  value={fieldDesc}
                  onChange={(e) => setFieldDesc(e.target.value)}
                  placeholder="e.g. Choose heavy art card for crisp executive cards"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              {/* Initial Options for SELECT / RADIO / TOGGLE */}
              {(fieldType === 'SELECT' || fieldType === 'RADIO' || fieldType === 'TOGGLE') && (
                <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-zinc-600 block uppercase">
                      Initial Options
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">
                      Option values auto-slugify as you type labels
                    </span>
                  </div>
                  {fieldOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Option Label (e.g. 350 GSM Matte)"
                        value={opt.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = [...fieldOptions];
                          const oldAutoSlug = updated[idx].label
                            .toLowerCase()
                            .trim()
                            .replace(/[^a-z0-9]+/g, '_')
                            .replace(/(^_|_$)+/g, '');
                          const isAuto = !updated[idx].value || updated[idx].value === oldAutoSlug;
                          updated[idx].label = val;
                          if (isAuto) {
                            updated[idx].value = val
                              .toLowerCase()
                              .trim()
                              .replace(/[^a-z0-9]+/g, '_')
                              .replace(/(^_|_$)+/g, '');
                          }
                          setFieldOptions(updated);
                        }}
                        className="flex-1 bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs shadow-2xs"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 350_gsm_matte)"
                        value={opt.value}
                        onChange={(e) => {
                          const updated = [...fieldOptions];
                          updated[idx].value = e.target.value;
                          setFieldOptions(updated);
                        }}
                        className="w-28 bg-zinc-50 border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-mono shadow-2xs"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="+₹ Mod"
                        value={opt.priceModifier || ''}
                        onChange={(e) => {
                          const updated = [...fieldOptions];
                          updated[idx].priceModifier = Number(e.target.value);
                          setFieldOptions(updated);
                        }}
                        className="w-20 bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-mono font-bold shadow-2xs"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFieldOptions([...fieldOptions, { label: '', value: '', priceModifier: 0 }])}
                    className="text-[10px] font-bold text-zinc-700 hover:text-zinc-900 underline block pt-1 cursor-pointer"
                  >
                    + Add Another Option
                  </button>
                </div>
              )}

              {/* Conditional Visibility Engine */}
              <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50/50 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCondition}
                    onChange={(e) => setHasCondition(e.target.checked)}
                    className="h-4 w-4 rounded accent-zinc-900"
                  />
                  <span>Enable Conditional Visibility (Depends on Another Field)</span>
                </label>

                {hasCondition && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-500 font-bold mb-1">
                        Parent Field Key
                      </label>
                      <input
                        type="text"
                        value={conditionParentKey}
                        onChange={(e) => setConditionParentKey(e.target.value)}
                        placeholder="e.g. need_foil"
                        className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-500 font-bold mb-1">
                        Required Value
                      </label>
                      <input
                        type="text"
                        value={conditionValue}
                        onChange={(e) => setConditionValue(e.target.value)}
                        placeholder="e.g. yes"
                        className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddFieldModalOpen(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-bold text-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#FCDD55] hover:bg-[#FBBF24] text-zinc-950 font-black text-xs border border-zinc-900 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Create Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD OPTION TO EXISTING FIELD */}
      {activeFieldForOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="text-xs font-black text-zinc-900 uppercase">Add Option to Field</h3>
              <button onClick={() => setActiveFieldForOption(null)} className="p-1 rounded text-zinc-400 cursor-pointer">
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddOptionToField} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Option Label *</label>
                <input
                  type="text"
                  required
                  value={newOptionLabel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewOptionLabel(val);
                    if (!isNewOptionValueTouched) {
                      setNewOptionValue(
                        val
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, '_')
                          .replace(/(^_|_$)+/g, ''),
                      );
                    }
                  }}
                  placeholder="e.g. Thermal Velvet Lamination"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-zinc-800">Option Value</label>
                  <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded">
                    Auto-slug
                  </span>
                </div>
                <input
                  type="text"
                  value={newOptionValue}
                  onChange={(e) => {
                    setNewOptionValue(e.target.value);
                    setIsNewOptionValueTouched(true);
                  }}
                  placeholder="e.g. thermal_velvet_lamination"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Price Modifier (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newOptionPrice}
                  onChange={(e) => setNewOptionPrice(Number(e.target.value))}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFieldForOption(null)}
                  className="px-3.5 py-1.5 rounded-lg border text-xs font-bold text-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#FCDD55] text-zinc-950 font-black text-xs border border-zinc-900"
                >
                  Save Option
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRICING RULE (OFFER TIER) */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <RiDiscountPercentLine className="h-5 w-5 text-amber-500" />
                <h3 className="text-xs font-black text-zinc-900 uppercase">
                  {editingRuleId ? 'Edit Quantity Offer Tier' : 'Add New Quantity Offer Tier'}
                </h3>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 transition"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Min Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={ruleMinQty}
                    onChange={(e) => setRuleMinQty(Math.max(1, Number(e.target.value)))}
                    placeholder="e.g. 500"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-zinc-400">Lower threshold</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Max Quantity (Optional)
                  </label>
                  <input
                    type="number"
                    min={ruleMinQty}
                    value={ruleMaxQty}
                    onChange={(e) => setRuleMaxQty(e.target.value)}
                    placeholder="Leave empty for unlimited"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-zinc-400">Empty = {ruleMinQty}+ units</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <span className="text-[11px] font-black uppercase text-amber-900 font-mono block">
                  Discount & Unit Rate Configuration
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-800 mb-1">
                      Discount Offer (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={ruleDiscountPercent}
                        onChange={(e) => handleDiscountPercentChange(Number(e.target.value))}
                        className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs font-mono font-bold pr-7"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-mono text-zinc-500">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-800 mb-1">
                      Calculated Unit Price (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-mono text-zinc-500">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ruleUnitPrice}
                        onChange={(e) => handleUnitPriceChange(Number(e.target.value))}
                        className="w-full bg-white border border-zinc-300 rounded-lg pl-6 pr-3 py-2 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-amber-950 font-mono flex items-center justify-between border-t border-amber-200/80 pt-2">
                  <span>Base: ₹{Number(basePrice).toFixed(2)}</span>
                  <span>→</span>
                  <span className="font-bold text-emerald-700">
                    Tier Rate: ₹{Number(ruleUnitPrice).toFixed(2)} ({ruleDiscountPercent}% OFF)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Offer Display Badge / Label (Optional)
                </label>
                <input
                  type="text"
                  value={ruleLabel}
                  onChange={(e) => setRuleLabel(e.target.value)}
                  placeholder={`e.g. Save ${ruleDiscountPercent}% on ${ruleMinQty}+ items`}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                />
                <span className="text-[10px] text-zinc-400">
                  Displayed as a highlighted badge to customers in storefront & checkout
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRule}
                  className="px-5 py-2 rounded-lg bg-[#FCDD55] text-zinc-950 font-black text-xs border border-zinc-900 shadow-sm hover:bg-[#FBBF24] cursor-pointer"
                >
                  {isSavingRule ? 'Saving...' : editingRuleId ? 'Update Tier Rule' : 'Create Tier Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
