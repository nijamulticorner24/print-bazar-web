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
} from 'react-icons/ri';
import { formatCurrency, getEstimatedDeliveryText } from '@/lib/utils';
import {
  api,
  DynamicProduct,
  ProductCategoryItem,
  DynamicField,
  DynamicFieldOption,
  ProductImageItem,
  ProductOptionRequirement,
  resolveImageUrl,
} from '@/lib/api';
import { DynamicFieldRenderer } from '@/components/configurator/DynamicFieldRenderer';
import { ProductConfigurationFlow } from '@/components/configurator/ProductConfigurationFlow';

export default function AdminProductEditorPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<DynamicProduct | null>(null);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    'GENERAL' | 'MEDIA' | 'FIELDS' | 'ARTWORK_DESIGN' | 'PRICING' | 'INVENTORY' | 'PREVIEW'
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
  const [maxQuantity, setMaxQuantity] = useState<number>(10000);
  const [productionDays, setProductionDays] = useState<number>(2);
  const [trackInventory, setTrackInventory] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);

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
  const [newOptionPrice, setNewOptionPrice] = useState<number>(0);

  // Preview State
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [previewQuantity, setPreviewQuantity] = useState<number>(100);
  const [previewQuote, setPreviewQuote] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prod, cats] = await Promise.all([
        api.adminGetProductById(productId),
        api.adminListCategories(),
      ]);
      setProduct(prod);
      setCategories(cats);

      // Populate form
      setName(prod.name);
      setSlug(prod.slug);
      setSku(prod.sku);
      setCategoryId(prod.categoryId);
      setDescription(prod.description || '');
      setStatus(prod.status);
      setBasePrice(Number(prod.basePrice));
      setMinQuantity(prod.minQuantity);
      setMaxQuantity(prod.maxQuantity);
      setProductionDays(prod.productionDays);
      setTrackInventory(prod.trackInventory);
      setStockQuantity(prod.stockQuantity);

      // Populate Dynamic Flow Engine fields
      setArtworkRequirement(prod.artworkRequirement || 'OPTIONAL');
      setArtworkPrice(Number(prod.artworkPrice) || 0);
      setArtworkQualityVerification(prod.artworkQualityVerification ?? true);
      setMinimumArtworkMegapixels(Number(prod.minimumArtworkMegapixels) || 1.0);
      setReferenceImageRequirement(prod.referenceImageRequirement || 'DISABLED');
      setDesignServiceRequirement(prod.designServiceRequirement || 'DISABLED');
      setDesignServicePrice(Number(prod.designServicePrice) || 0);

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
        maxQuantity: Number(maxQuantity),
        productionDays: Number(productionDays),
        trackInventory,
        stockQuantity: Number(stockQuantity),
        artworkRequirement,
        artworkPrice: Number(artworkPrice),
        artworkQualityVerification,
        minimumArtworkMegapixels: Number(minimumArtworkMegapixels),
        referenceImageRequirement,
        designServiceRequirement,
        designServicePrice: Number(designServicePrice),
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

  // Handle File Selection & Drag-and-Drop
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP, SVG).');
      return;
    }
    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setFilePreview(preview);
    if (!newImageAlt) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setNewImageAlt(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const clearSelectedFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
  };

  // Direct quick upload from media dropzone
  const handleQuickUpload = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      alert('Please drop valid image files (PNG, JPG, WEBP, SVG).');
      return;
    }
    setIsUploading(true);
    try {
      for (const file of validFiles) {
        await api.adminUploadProductImage(productId, file, {
          altText: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        });
      }
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Add Image Modal Submit
  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      if (uploadMode === 'FILE') {
        if (!selectedFile) {
          alert('Please select an image file to upload.');
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
          alert('Please enter a valid image URL.');
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
      alert(err?.message || 'Failed to add image');
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
    if (!fieldLabel || !fieldKey) return;

    const validOptions = fieldOptions
      .filter((o) => o.label.trim() !== '' && o.value.trim() !== '')
      .map((o, idx) => ({
        label: o.label.trim(),
        value: o.value.trim(),
        priceModifier: Number(o.priceModifier || 0),
        priceModifierType: 'FIXED',
        isDefault: idx === 0,
      }));

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
        label: fieldLabel,
        key: fieldKey,
        type: fieldType,
        description: fieldDesc,
        isRequired: fieldRequired,
        options: validOptions,
        conditionalLogic,
      });
      setIsAddFieldModalOpen(false);
      setFieldLabel('');
      setFieldKey('');
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
    if (!activeFieldForOption || !newOptionLabel || !newOptionValue) return;

    try {
      await api.adminAddFieldOption(productId, activeFieldForOption, {
        label: newOptionLabel,
        value: newOptionValue,
        priceModifier: Number(newOptionPrice),
      });
      setActiveFieldForOption(null);
      setNewOptionLabel('');
      setNewOptionValue('');
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
            onClick={handleSaveGeneral}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-[#FCDD55] hover:bg-[#FBBF24] text-zinc-950 font-black text-xs px-5 py-2 rounded-lg border border-zinc-900 shadow-sm transition active:scale-95"
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

      {/* 7-TAB Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'GENERAL', label: '1. General Info' },
          { id: 'MEDIA', label: `2. Media Gallery (${product.images?.length || 0})` },
          { id: 'FIELDS', label: `3. Dynamic Fields (${product.fields?.length || 0})` },
          { id: 'ARTWORK_DESIGN', label: '4. Artwork & Design Engine' },
          { id: 'PRICING', label: '5. Pricing Rules' },
          { id: 'INVENTORY', label: '6. Inventory & Materials' },
          { id: 'PREVIEW', label: '7. Live Customer Flow Simulator' },
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
              <label className="block text-xs font-bold text-zinc-800 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
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

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">Minimum Order Quantity</label>
              <input
                type="number"
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-900"
              />
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
        </div>
      )}

      {/* TAB 2: MEDIA GALLERY */}
      {activeTab === 'MEDIA' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <RiImage2Line className="h-4 w-4 text-zinc-700" />
                Product Image Manager
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Upload multiple high-res product photos from your local disk or URLs, configure primary thumbnails and order.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setUploadMode('FILE');
                  setIsAddImageModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-[#FCDD55] text-zinc-950 font-black text-xs px-3.5 py-2 rounded-lg border border-zinc-900 shadow-sm hover:bg-[#F3CE3E] transition-all"
              >
                <RiUploadCloud2Line className="h-4 w-4" />
                <span>Upload Local Image</span>
              </button>
            </div>
          </div>

          {/* Quick Drag & Drop Upload Strip */}
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
                ? 'border-zinc-900 bg-[#FCDD55]/10'
                : 'border-zinc-200 bg-zinc-50/60 hover:border-zinc-400 hover:bg-zinc-50'
            }`}
          >
            <input
              type="file"
              id="quick-image-upload"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/jpg"
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
              <div className="h-10 w-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 shadow-sm">
                {isUploading ? (
                  <RiLoader4Line className="h-5 w-5 animate-spin text-zinc-900" />
                ) : (
                  <RiUploadCloud2Line className="h-5 w-5" />
                )}
              </div>
              <div className="text-xs">
                <span className="font-bold text-zinc-900 underline">Click to upload from local files</span>
                <span className="text-zinc-500"> or drag and drop images directly here</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Supports PNG, JPG, JPEG, WEBP, SVG • Multi-file upload supported
              </p>
            </label>
          </div>

          {product.images && product.images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {product.images.map((img) => (
                <div
                  key={img.id}
                  className={`relative rounded-xl border overflow-hidden bg-zinc-50 flex flex-col justify-between group transition-all duration-200 ${
                    img.isPrimary ? 'border-zinc-900 ring-2 ring-[#FCDD55] shadow-md' : 'border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  <div className="relative h-44 w-full bg-zinc-100 overflow-hidden">
                    <img
                      src={resolveImageUrl(img.url)}
                      alt={img.altText || ''}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {img.isPrimary && (
                      <span className="absolute top-2 left-2 bg-zinc-900 text-[#FCDD55] text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-sm border border-zinc-800">
                        PRIMARY THUMBNAIL
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-white border-t border-zinc-100 space-y-2">
                    <p className="text-xs font-bold text-zinc-800 truncate">{img.altText || 'Product Image'}</p>
                    {img.caption && <p className="text-[10px] text-zinc-500 truncate">{img.caption}</p>}

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-50">
                      {!img.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(img.id)}
                          className="text-[10px] font-bold text-zinc-700 hover:text-zinc-900 underline"
                        >
                          Set Primary
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <RiCheckboxCircleLine className="h-3.5 w-3.5" />
                          Default Card
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="p-1 rounded text-zinc-400 hover:text-red-600 transition-colors"
                        title="Delete image"
                      >
                        <RiDeleteBin7Line className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 border-2 border-dashed border-zinc-200 rounded-xl text-center p-8 bg-zinc-50/50">
              <RiImage2Line className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-zinc-700">No images added yet</p>
              <p className="text-xs text-zinc-500 mt-0.5">Upload local image files or drop them in the area above.</p>
            </div>
          )}
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
        </div>
      )}

      {/* TAB 5: PRICING RULES */}
      {activeTab === 'PRICING' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-6">
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-3">
            Authoritative Pricing Engine
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
              <span className="text-xs font-bold text-zinc-900 block">Base Unit Price</span>
              <div className="text-2xl font-black text-zinc-900 font-mono">
                {formatCurrency(basePrice)}
              </div>
              <p className="text-[11px] text-zinc-500">
                Minimum starting rate for {minQuantity} units prior to custom option additions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
              <span className="text-xs font-bold text-zinc-900 block">GST Tariff Policy</span>
              <div className="text-2xl font-black text-emerald-600 font-mono">18.00% GST</div>
              <p className="text-[11px] text-zinc-500">
                Standard Indian Print tariff (9% CGST + 9% SGST intra-state or 18% IGST inter-state).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: INVENTORY & MATERIALS */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-6">
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-3">
            Stock & Raw Substrate Linking
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <input
                type="checkbox"
                id="trackInventory"
                checked={trackInventory}
                onChange={(e) => setTrackInventory(e.target.checked)}
                className="h-4 w-4 rounded accent-zinc-900"
              />
              <label htmlFor="trackInventory" className="text-xs font-bold text-zinc-900 cursor-pointer">
                Track Finished Product Inventory & Restock Alerts
              </label>
            </div>

            {trackInventory && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Available Stock Units</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-900"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: LIVE STOREFRONT SIMULATOR (USES EXACT SAME CUSTOMER FLOW ENGINE) */}
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
              maxQuantity,
              productionDays,
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
        </div>
      )}

      {/* MODAL: ADD / UPLOAD PRODUCT IMAGE */}
      {isAddImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <RiImageAddLine className="h-5 w-5 text-zinc-800" />
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                  Add Product Media Asset
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddImageModalOpen(false);
                  clearSelectedFile();
                }}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            {/* Upload Method Tabs */}
            <div className="flex border-b border-zinc-100 bg-zinc-50/50 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setUploadMode('FILE')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  uploadMode === 'FILE'
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <RiUploadCloud2Line className="h-4 w-4" />
                <span>Upload Local File</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('URL')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  uploadMode === 'URL'
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <RiLinkM className="h-4 w-4" />
                <span>Remote Image URL</span>
              </button>
            </div>

            <form onSubmit={handleAddImage} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* LOCAL FILE UPLOAD MODE */}
              {uploadMode === 'FILE' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                    Select Local Image File *
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
                          ? 'border-zinc-900 bg-[#FCDD55]/10'
                          : 'border-zinc-300 hover:border-zinc-900 bg-zinc-50/50 hover:bg-zinc-50'
                      }`}
                    >
                      <input
                        type="file"
                        id="modal-image-file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/jpg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />
                      <label htmlFor="modal-image-file" className="cursor-pointer space-y-2 block">
                        <div className="h-12 w-12 rounded-full bg-white border border-zinc-200 flex items-center justify-center mx-auto text-zinc-700 shadow-sm">
                          <RiUploadCloud2Line className="h-6 w-6" />
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-zinc-900 underline">Click to browse file</span>
                          <span className="text-zinc-500"> or drag and drop</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          PNG, JPG, WEBP, SVG up to 25MB
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative rounded-xl border border-zinc-200 bg-zinc-50 p-3 flex items-center gap-3.5">
                      <div className="h-20 w-24 rounded-lg overflow-hidden bg-zinc-200 border border-zinc-300 flex-shrink-0">
                        <img src={filePreview} alt="Selected preview" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate">{selectedFile?.name}</p>
                        <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                          {selectedFile?.size ? (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB' : ''} •{' '}
                          {selectedFile?.type || 'image'}
                        </p>
                        <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Ready to Upload
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={clearSelectedFile}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
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
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Image URL *</label>
                  <input
                    type="url"
                    required={uploadMode === 'URL'}
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono"
                  />
                  {newImageUrl && (
                    <div className="mt-2 h-24 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
                      <img
                        src={newImageUrl}
                        alt="URL Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
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
                      setFieldLabel(e.target.value);
                      if (!fieldKey) {
                        setFieldKey(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '_')
                            .replace(/(^_|_$)+/g, ''),
                        );
                      }
                    }}
                    placeholder="e.g. Paper Substrate"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Internal Key *</label>
                  <input
                    type="text"
                    required
                    value={fieldKey}
                    onChange={(e) => setFieldKey(e.target.value)}
                    placeholder="e.g. paper_stock"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
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
                  <span className="text-[11px] font-mono font-bold text-zinc-600 block uppercase">
                    Initial Options
                  </span>
                  {fieldOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Option Label (e.g. 350 GSM)"
                        value={opt.label}
                        onChange={(e) => {
                          const updated = [...fieldOptions];
                          updated[idx].label = e.target.value;
                          if (!updated[idx].value) {
                            updated[idx].value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                          }
                          setFieldOptions(updated);
                        }}
                        className="flex-1 bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 350_gsm)"
                        value={opt.value}
                        onChange={(e) => {
                          const updated = [...fieldOptions];
                          updated[idx].value = e.target.value;
                          setFieldOptions(updated);
                        }}
                        className="w-28 bg-zinc-50 border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-mono"
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
                        className="w-20 bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFieldOptions([...fieldOptions, { label: '', value: '', priceModifier: 0 }])}
                    className="text-[10px] font-bold text-zinc-700 hover:text-zinc-900 underline block pt-1"
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
                  className="px-4 py-2 rounded-lg border text-xs font-bold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#FCDD55] text-zinc-950 font-black text-xs border border-zinc-900"
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
              <button onClick={() => setActiveFieldForOption(null)} className="p-1 rounded text-zinc-400">
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
                    setNewOptionLabel(e.target.value);
                    if (!newOptionValue) {
                      setNewOptionValue(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
                    }
                  }}
                  placeholder="e.g. Thermal Velvet Lamination"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Option Value *</label>
                <input
                  type="text"
                  required
                  value={newOptionValue}
                  onChange={(e) => setNewOptionValue(e.target.value)}
                  placeholder="e.g. velvet_lami"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono"
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
                  className="px-3.5 py-1.5 rounded-lg border text-xs font-bold text-zinc-700"
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
    </div>
  );
}
