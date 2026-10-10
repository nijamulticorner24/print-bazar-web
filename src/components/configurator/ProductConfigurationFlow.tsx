'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DynamicProduct,
  api,
  resolveImageUrl,
  ProductOptionRequirement,
} from '@/lib/api';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import { formatCurrency, getEstimatedDeliveryText } from '@/lib/utils';
import {
  RiUploadCloud2Line,
  RiCheckLine,
  RiAlertFill,
  RiCloseLine,
  RiInformationLine,
  RiPaletteLine,
  RiImageAddLine,
  RiShieldCheckLine,
  RiShoppingCart2Line,
  RiFlashlightLine,
  RiFileTextLine,
  RiDeleteBinLine,
  RiSparklingFill,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiCheckboxCircleLine,
  RiEditLine,
  RiRefreshLine,
  RiTruckLine,
  RiTimeLine,
  RiRulerLine,
  RiLockLine,
  RiHandCoinLine,
  RiStore2Line,
} from 'react-icons/ri';
import { Button, Badge, Modal } from '@/components/ui';

export interface FlowArtworkState {
  fileUrl: string;
  storageKey?: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  actualMegapixels?: number | null;
  requiredMegapixels?: number;
  qualityStatus?: 'PASSED' | 'WARNING' | 'NOT_APPLICABLE';
  warningMessage?: string | null;
  warningAccepted?: boolean;
}

export interface FlowReferenceImageState {
  fileUrl: string;
  storageKey?: string;
  originalFileName: string;
  fileSize?: number;
}

export interface ProductConfigurationResult {
  product: DynamicProduct;
  quantity: number;
  fieldValues: Record<string, any>;
  hasArtwork: boolean;
  artworkFile: FlowArtworkState | null;
  hasReferenceImage: boolean;
  referenceImage: FlowReferenceImageState | null;
  hasDesignService: boolean;
  designNotes: string;
  deliveryMethod: 'COURIER' | 'STORE_PICKUP';
  paymentMethod: 'ONLINE' | 'COD';
  paymentMode: 'FULL' | 'SPLIT_50';
  advanceAmount: number;
  balanceAmount: number;
  subtotal: number;
  grandTotal: number;
  quote: any;
}

export type StepId =
  | 'SPECIFICATIONS'
  | 'QUANTITY'
  | 'ARTWORK'
  | 'REFERENCE_IMAGE'
  | 'DESIGN_SERVICE'
  | 'REVIEW';

export interface ActiveStep {
  id: StepId;
  number: number;
  label: string;
  shortLabel: string;
  requirement: ProductOptionRequirement;
  isCompleted: boolean;
  isSkipped: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  summaryText: string;
}

interface ProductConfigurationFlowProps {
  product: DynamicProduct;
  initialQuantity?: number;
  initialFieldValues?: Record<string, any>;
  isPreviewMode?: boolean;
  onAddToCart?: (result: ProductConfigurationResult) => void | Promise<void>;
  onBuyNow?: (result: ProductConfigurationResult) => void | Promise<void>;
}

export function ProductConfigurationFlow({
  product,
  initialQuantity,
  initialFieldValues,
  isPreviewMode = false,
  onAddToCart,
  onBuyNow,
}: ProductConfigurationFlowProps) {
  // ---------------------------------------------------------------------------
  // 1. DYNAMIC FIELDS STATE
  // ---------------------------------------------------------------------------
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = { ...(initialFieldValues || {}) };
    if (product.fields && product.fields.length > 0) {
      for (const field of product.fields) {
        if (initial[field.key] === undefined) {
          if (field.defaultValue) {
            initial[field.key] = field.defaultValue;
          } else if (field.options && field.options.length > 0) {
            const def = field.options.find((o) => o.isDefault) || field.options[0];
            if (def) initial[field.key] = def.value;
          }
        }
      }
    }
    return initial;
  });

  // Dynamic conditional fields filtering
  const visibleFields = useMemo(() => {
    if (!product.fields || product.fields.length === 0) return [];
    return product.fields.filter((field) => {
      if (!field.isCustomerVisible) return false;
      if (field.conditionalLogic && typeof field.conditionalLogic === 'object') {
        const { dependsOnFieldKey, operator, value } = field.conditionalLogic;
        const parentVal = fieldValues[dependsOnFieldKey];
        if (operator === 'EQUALS' && parentVal !== value) return false;
        if (operator === 'NOT_EQUALS' && parentVal === value) return false;
        if (operator === 'IN' && Array.isArray(value) && !value.includes(parentVal)) return false;
      }
      return true;
    });
  }, [product.fields, fieldValues]);

  // ---------------------------------------------------------------------------
  // 2. QUANTITY STATE
  // ---------------------------------------------------------------------------
  const [quantity, setQuantity] = useState<number>(() => {
    if (initialQuantity) return initialQuantity;
    const min = product.minQuantity || 1;
    const standardPreset = [50, 100, 250, 500, 1000, 2500, 5000].find((p) => p >= min);
    return standardPreset || min || 50;
  });

  // ---------------------------------------------------------------------------
  // 3. ARTWORK STATE
  // ---------------------------------------------------------------------------
  const artworkReq: ProductOptionRequirement = product.artworkRequirement || 'OPTIONAL';
  const artworkPriceNum = Number(product.artworkPrice) || 0;
  const isArtworkQualityOn = Boolean(product.artworkQualityVerification);
  const minMegapixels = Number(product.minimumArtworkMegapixels) || 1.0;

  const [artworkFile, setArtworkFile] = useState<FlowArtworkState | null>(null);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState<boolean>(false);
  const [artworkUploadError, setArtworkUploadError] = useState<string | null>(null);
  const [skipArtwork, setSkipArtwork] = useState<boolean>(false);
  const [artworkChoice, setArtworkChoice] = useState<'UPLOAD' | 'SKIP' | null>(() => {
    return artworkReq === 'REQUIRED' ? 'UPLOAD' : null;
  });
  const artworkInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // 4. REFERENCE IMAGE STATE
  // ---------------------------------------------------------------------------
  const refReq: ProductOptionRequirement = product.referenceImageRequirement || 'DISABLED';
  const [referenceImage, setReferenceImage] = useState<FlowReferenceImageState | null>(null);
  const [isUploadingRef, setIsUploadingRef] = useState<boolean>(false);
  const [refUploadError, setRefUploadError] = useState<string | null>(null);
  const [skipReference, setSkipReference] = useState<boolean>(false);
  const refInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // 5. DESIGN SERVICE & PAYMENT TERMS STATE
  // ---------------------------------------------------------------------------
  const designReq: ProductOptionRequirement = product.designServiceRequirement || 'DISABLED';
  const designPriceNum = Number(product.designServicePrice) || 0;
  const [wantsDesignService, setWantsDesignService] = useState<boolean>(() => {
    return designReq === 'REQUIRED';
  });
  const [uploadDesignAssist, setUploadDesignAssist] = useState<boolean>(false);
  const [designNotes, setDesignNotes] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'SPLIT_50'>('FULL');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);

  // Synchronize design service if requirement changes dynamically in preview
  useEffect(() => {
    if (designReq === 'REQUIRED') {
      setWantsDesignService(true);
    } else if (designReq === 'DISABLED') {
      setWantsDesignService(false);
    }
  }, [designReq]);

  // Effective flags for pricing & submission
  const effectiveHasArtwork = useMemo(() => {
    if (artworkReq === 'DISABLED') return false;
    if (artworkChoice === 'SKIP' || skipArtwork) return false;
    if (artworkReq === 'REQUIRED') return true;
    return Boolean(artworkFile);
  }, [artworkReq, artworkFile, skipArtwork, artworkChoice]);

  const effectiveHasDesignService = useMemo(() => {
    if (designReq === 'DISABLED') return false;
    if (artworkChoice === 'SKIP') return true; // Auto-included when customer has no artwork!
    if (artworkChoice === 'UPLOAD' || artworkFile) return Boolean(uploadDesignAssist); // If artwork uploaded, include if customer requested Design Assist
    if (designReq === 'REQUIRED') return true;
    return Boolean(wantsDesignService);
  }, [designReq, wantsDesignService, artworkChoice, artworkFile, uploadDesignAssist]);

  const effectiveHasReference = useMemo(() => {
    if (refReq === 'DISABLED') return false;
    if (artworkChoice === 'UPLOAD') return false; // Auto-skipped when customer uploads artwork!
    return Boolean(referenceImage && !skipReference);
  }, [refReq, referenceImage, skipReference, artworkChoice]);

  // ---------------------------------------------------------------------------
  // 6. DYNAMIC STEP RESOLVER ENGINE
  // ---------------------------------------------------------------------------
  // Check completion states
  const isSpecsCompleted = useMemo(() => {
    if (visibleFields.length === 0) return true;
    for (const f of visibleFields) {
      if (f.isRequired) {
        const val = fieldValues[f.key];
        if (val === undefined || val === null || val === '') return false;
      }
    }
    return true;
  }, [visibleFields, fieldValues]);

  const isQuantityCompleted = useMemo(() => {
    return quantity >= (product.minQuantity || 1);
  }, [quantity, product.minQuantity]);

  const isArtworkCompleted = useMemo(() => {
    if (artworkReq === 'DISABLED') return true;
    if (artworkReq === 'REQUIRED') {
      if (!artworkFile) return false;
      if (artworkFile.qualityStatus === 'WARNING' && !artworkFile.warningAccepted) return false;
      return true;
    }
    // OPTIONAL: completed if uploaded OR explicitly skipped
    return Boolean(artworkFile || skipArtwork || artworkChoice === 'SKIP');
  }, [artworkReq, artworkFile, skipArtwork, artworkChoice]);

  const isReferenceCompleted = useMemo(() => {
    if (refReq === 'DISABLED') return true;
    if (refReq === 'REQUIRED') {
      return Boolean(referenceImage);
    }
    // OPTIONAL: completed if uploaded OR explicitly skipped
    return Boolean(referenceImage || skipReference);
  }, [refReq, referenceImage, skipReference]);

  const isDesignCompleted = useMemo(() => {
    if (designReq === 'DISABLED') return true;
    if (designReq === 'REQUIRED') return true;
    return wantsDesignService !== null;
  }, [designReq, wantsDesignService]);

  // Active steps dynamically resolved based on product configuration
  const activeStepsList: StepId[] = useMemo(() => {
    const list: StepId[] = [];
    if (visibleFields.length > 0) {
      list.push('SPECIFICATIONS');
    }
    list.push('QUANTITY');
    if (artworkReq !== 'DISABLED') {
      list.push('ARTWORK');
    } else {
      // If artwork is disabled, only then optionally show standalone reference/design steps
      if (refReq !== 'DISABLED') {
        list.push('REFERENCE_IMAGE');
      }
      if (designReq !== 'DISABLED') {
        list.push('DESIGN_SERVICE');
      }
    }
    list.push('REVIEW');
    return list;
  }, [visibleFields.length, artworkReq, refReq, designReq]);

  // Active step ID
  const [currentStepId, setCurrentStepId] = useState<StepId>(() => {
    return visibleFields.length > 0 ? 'SPECIFICATIONS' : 'QUANTITY';
  });

  // Keep current step valid if activeStepsList changes
  useEffect(() => {
    if (!activeStepsList.includes(currentStepId)) {
      setCurrentStepId(activeStepsList[0] || 'REVIEW');
    }
  }, [activeStepsList, currentStepId]);

  // Step metadata definitions for UI rendering
  const activeSteps: ActiveStep[] = useMemo(() => {
    let stepNum = 1;
    return activeStepsList.map((id) => {
      let label = '';
      let shortLabel = '';
      let requirement: ProductOptionRequirement = 'OPTIONAL';
      let isCompleted = false;
      let isSkipped = false;
      let summaryText = '';

      switch (id) {
        case 'SPECIFICATIONS': {
          label = 'Product Specifications';
          shortLabel = 'Specifications';
          requirement = visibleFields.some((f) => f.isRequired) ? 'REQUIRED' : 'OPTIONAL';
          isCompleted = isSpecsCompleted;
          isSkipped = false;
          const configuredCount = Object.keys(fieldValues).filter(
            (k) => fieldValues[k] !== undefined && fieldValues[k] !== ''
          ).length;
          summaryText = `${configuredCount} of ${visibleFields.length} options selected`;
          break;
        }
        case 'QUANTITY': {
          label = 'Production Quantity';
          shortLabel = 'Quantity';
          requirement = 'REQUIRED';
          isCompleted = isQuantityCompleted;
          isSkipped = false;
          summaryText = `${quantity.toLocaleString()} pcs`;
          break;
        }
        case 'ARTWORK': {
          label = 'Artwork & Preflight';
          shortLabel = 'Artwork';
          requirement = artworkReq;
          isCompleted = Boolean(artworkFile);
          isSkipped = Boolean(skipArtwork && !artworkFile);
          summaryText = artworkFile
            ? `${artworkFile.originalFileName} (${(artworkFile.fileSize / (1024 * 1024)).toFixed(1)}MB)`
            : skipArtwork
            ? 'Skipped (Send Later / Design Needed)'
            : 'Pending upload';
          break;
        }
        case 'REFERENCE_IMAGE': {
          label = 'Reference Sample';
          shortLabel = 'Reference';
          requirement = refReq;
          isCompleted = Boolean(referenceImage);
          isSkipped = Boolean(skipReference && !referenceImage);
          summaryText = referenceImage
            ? referenceImage.originalFileName
            : skipReference
            ? 'Skipped'
            : 'Pending sample';
          break;
        }
        case 'DESIGN_SERVICE': {
          label = 'Design Studio Assistance';
          shortLabel = 'Design Service';
          requirement = designReq;
          isCompleted = isDesignCompleted;
          isSkipped = !wantsDesignService && designReq === 'OPTIONAL';
          summaryText = wantsDesignService
            ? `Included (+${formatCurrency(designPriceNum)})`
            : 'No design service';
          break;
        }
        case 'REVIEW': {
          label = 'Summary & Checkout';
          shortLabel = 'Review';
          requirement = 'REQUIRED';
          isCompleted = false;
          isSkipped = false;
          summaryText = 'Final configuration review';
          break;
        }
      }

      const currentIndex = activeStepsList.indexOf(currentStepId);
      const thisIndex = activeStepsList.indexOf(id);
      const isCurrent = id === currentStepId;
      const isLocked = thisIndex > currentIndex && !isCompleted && !isSkipped;

      return {
        id,
        number: stepNum++,
        label,
        shortLabel,
        requirement,
        isCompleted,
        isSkipped,
        isCurrent,
        isLocked,
        summaryText,
      };
    });
  }, [
    activeStepsList,
    currentStepId,
    visibleFields,
    fieldValues,
    isSpecsCompleted,
    quantity,
    isQuantityCompleted,
    artworkReq,
    artworkFile,
    skipArtwork,
    refReq,
    referenceImage,
    skipReference,
    designReq,
    isDesignCompleted,
    wantsDesignService,
    designPriceNum,
  ]);

  // Find current step index and adjacent steps
  const currentStepIndex = activeStepsList.indexOf(currentStepId);
  const nextStepId = currentStepIndex >= 0 && currentStepIndex < activeStepsList.length - 1
    ? activeStepsList[currentStepIndex + 1]
    : null;
  const prevStepId = currentStepIndex > 0 ? activeStepsList[currentStepIndex - 1] : null;

  const currentStepDef = activeSteps.find((s) => s.id === currentStepId) || activeSteps[0];
  const nextStepDef = nextStepId ? activeSteps.find((s) => s.id === nextStepId) : null;
  const prevStepDef = prevStepId ? activeSteps.find((s) => s.id === prevStepId) : null;

  // Container ref for smooth scroll
  const stepContainerRef = useRef<HTMLDivElement>(null);

  const scrollToStepHeader = () => {
    if (stepContainerRef.current) {
      stepContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goToNextStep = () => {
    if (nextStepId) {
      setCurrentStepId(nextStepId);
      scrollToStepHeader();
    }
  };

  const goToPrevStep = () => {
    if (prevStepId) {
      setCurrentStepId(prevStepId);
      scrollToStepHeader();
    }
  };

  const jumpToStep = (id: StepId) => {
    setCurrentStepId(id);
    scrollToStepHeader();
  };

  // Delivery & Payment Method States
  const [deliveryMethod, setDeliveryMethod] = useState<'COURIER' | 'STORE_PICKUP'>('COURIER');
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');

  // ---------------------------------------------------------------------------
  // 7. AUTHORITATIVE QUOTE ENGINE
  // ---------------------------------------------------------------------------
  const [quote, setQuote] = useState<any>(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let isCurrent = true;
    const fetchQuote = async () => {
      setIsCalculatingQuote(true);
      setQuoteError(null);
      try {
        const q = await api.calculateQuote({
          productId: product.id,
          quantity: Number(quantity) || product.minQuantity || 1,
          fieldValues,
          hasArtwork: effectiveHasArtwork,
          hasDesignService: effectiveHasDesignService,
          hasReferenceImage: effectiveHasReference,
          deliveryMethod,
          paymentMethod,
          isCod: paymentMethod === 'COD',
        });
        if (isCurrent) {
          setQuote(q);
        }
      } catch (err: any) {
        if (isCurrent) {
          setQuoteError(err?.message || 'Unable to calculate quote');
        }
      } finally {
        if (isCurrent) {
          setIsCalculatingQuote(false);
        }
      }
    };

    const timer = setTimeout(fetchQuote, 150);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [
    product.id,
    product.minQuantity,
    quantity,
    fieldValues,
    effectiveHasArtwork,
    effectiveHasDesignService,
    effectiveHasReference,
    deliveryMethod,
    paymentMethod,
  ]);

  // Field change handler
  const handleFieldValueChange = (fieldKey: string, val: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldKey]: val,
    }));
  };

  // Artwork Upload Handler
  const handleArtworkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingArtwork(true);
    setArtworkUploadError(null);
    try {
      const res = await api.uploadArtwork(file, product.id, minMegapixels);
      setArtworkFile({
        fileUrl: res.fileUrl,
        storageKey: res.storageKey,
        originalFileName: res.originalFileName,
        fileSize: res.fileSize,
        mimeType: res.mimeType,
        width: res.width,
        height: res.height,
        actualMegapixels: res.actualMegapixels,
        requiredMegapixels: res.requiredMegapixels,
        qualityStatus: res.qualityStatus,
        warningMessage: res.warningMessage,
        warningAccepted: res.qualityStatus === 'PASSED',
      });
      setSkipArtwork(false);
    } catch (err: any) {
      setArtworkUploadError(err?.message || 'Failed to upload artwork file');
    } finally {
      setIsUploadingArtwork(false);
      if (artworkInputRef.current) artworkInputRef.current.value = '';
    }
  };

  // Reference Image Upload Handler
  const handleReferenceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingRef(true);
    setRefUploadError(null);
    try {
      const res = await api.uploadReferenceImage(file);
      setReferenceImage({
        fileUrl: res.fileUrl,
        storageKey: res.storageKey,
        originalFileName: res.originalFileName,
        fileSize: res.fileSize,
      });
      setSkipReference(false);
    } catch (err: any) {
      setRefUploadError(err?.message || 'Failed to upload reference image');
    } finally {
      setIsUploadingRef(false);
      if (refInputRef.current) refInputRef.current.value = '';
    }
  };

  // Skip Artwork action -> resolves next step dynamically
  const handleSkipArtwork = () => {
    setSkipArtwork(true);
    setArtworkFile(null);
    goToNextStep();
  };

  // Skip Reference action -> resolves next step dynamically
  const handleSkipReference = () => {
    setSkipReference(true);
    setReferenceImage(null);
    goToNextStep();
  };

  // ---------------------------------------------------------------------------
  // 8. OVERALL VALIDATION
  // ---------------------------------------------------------------------------
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // Required Dynamic Fields
    for (const f of visibleFields) {
      if (f.isRequired) {
        const val = fieldValues[f.key];
        if (val === undefined || val === null || val === '') {
          errors.push(`Please complete required specification: ${f.label}`);
        }
      }
    }

    // Minimum Quantity
    if (quantity < (product.minQuantity || 1)) {
      errors.push(`Minimum quantity is ${product.minQuantity || 1} units.`);
    }

    // Required Artwork
    if (artworkReq === 'REQUIRED') {
      if (!artworkFile) {
        errors.push('Artwork file upload is required for this product.');
      } else if (artworkFile.qualityStatus === 'WARNING' && !artworkFile.warningAccepted) {
        errors.push('Please accept the prepress resolution warning or upload higher resolution artwork.');
      }
    }

    // Required Reference Image
    if (refReq === 'REQUIRED' && !referenceImage) {
      errors.push('Reference sample image upload is required.');
    }

    // Terms and Conditions
    if (!termsAccepted) {
      errors.push('Please confirm and accept the Design Proof & Printing Terms and Conditions.');
    }

    return errors;
  }, [
    visibleFields,
    fieldValues,
    quantity,
    product.minQuantity,
    artworkReq,
    artworkFile,
    refReq,
    referenceImage,
    termsAccepted,
  ]);

  const isValid = validationErrors.length === 0;

  // Compute live monetary amounts
  const computedSubtotal = useMemo(() => {
    return Number(quote?.subtotal || (Number(product.basePrice) * quantity));
  }, [quote?.subtotal, product.basePrice, quantity]);

  const computedTax = useMemo(() => {
    return Number(quote?.totalTax || Math.round(computedSubtotal * 0.18 * 100) / 100);
  }, [quote?.totalTax, computedSubtotal]);

  const computedShipping = useMemo(() => {
    if (deliveryMethod === 'STORE_PICKUP') return 0;
    return Number(quote?.shippingAmount ?? quote?.estimatedShipping ?? 0);
  }, [deliveryMethod, quote?.shippingAmount, quote?.estimatedShipping]);

  const computedCodCharge = useMemo(() => {
    if (paymentMethod !== 'COD') return 0;
    return Number(quote?.codCharge ?? 0);
  }, [paymentMethod, quote?.codCharge]);

  const computedGrandTotal = useMemo(() => {
    return Number(quote?.grandTotal || Math.round((computedSubtotal + computedTax + computedShipping + computedCodCharge) * 100) / 100);
  }, [quote?.grandTotal, computedSubtotal, computedTax, computedShipping, computedCodCharge]);

  const computedAdvanceAmount = useMemo(() => {
    if (paymentMode === 'SPLIT_50') {
      return Math.round(computedGrandTotal * 0.5 * 100) / 100;
    }
    return computedGrandTotal;
  }, [paymentMode, computedGrandTotal]);

  const computedBalanceAmount = useMemo(() => {
    if (paymentMode === 'SPLIT_50') {
      return Math.round((computedGrandTotal - computedAdvanceAmount) * 100) / 100;
    }
    return 0;
  }, [paymentMode, computedGrandTotal, computedAdvanceAmount]);

  // Build Configuration Result Snapshot
  const buildResult = (): ProductConfigurationResult => {
    return {
      product,
      quantity,
      fieldValues,
      hasArtwork: effectiveHasArtwork,
      artworkFile: effectiveHasArtwork ? artworkFile : null,
      hasReferenceImage: effectiveHasReference,
      referenceImage: effectiveHasReference ? referenceImage : null,
      hasDesignService: effectiveHasDesignService,
      designNotes,
      deliveryMethod,
      paymentMethod,
      paymentMode,
      advanceAmount: computedAdvanceAmount,
      balanceAmount: computedBalanceAmount,
      subtotal: computedSubtotal,
      grandTotal: computedGrandTotal,
      quote: {
        ...(quote || {}),
        subtotal: computedSubtotal,
        totalTax: computedTax,
        estimatedShipping: computedShipping,
        shippingAmount: computedShipping,
        codCharge: computedCodCharge,
        grandTotal: computedGrandTotal,
        deliveryMethod,
        paymentMethod,
        paymentMode,
        advanceAmount: computedAdvanceAmount,
        balanceAmount: computedBalanceAmount,
      },
    };
  };

  const handleAddToCartClick = async () => {
    if (!isValid || !onAddToCart) return;
    setIsSubmitting(true);
    try {
      await onAddToCart(buildResult());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNowClick = async () => {
    if (!isValid || !onBuyNow) return;
    setIsSubmitting(true);
    try {
      await onBuyNow(buildResult());
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to build friendly label for a field selection
  const getFieldDisplayValue = (fieldKey: string, val: any) => {
    const field = product.fields?.find((f) => f.key === fieldKey);
    if (!field) return String(val);
    if (field.options && field.options.length > 0) {
      const opt = field.options.find((o) => String(o.value) === String(val));
      if (opt) return opt.label;
    }
    return String(val);
  };

  return (
    <div ref={stepContainerRef} className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* 1. DYNAMIC STEP PROGRESS INDICATOR                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black uppercase text-slate-400 tracking-wider">
              Configuration Flow
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-slate-900">
              Step {currentStepDef?.number} of {activeSteps.length}: {currentStepDef?.shortLabel}
            </span>
          </div>

          <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            {Math.round((currentStepDef?.number / activeSteps.length) * 100)}% Complete
          </span>
        </div>

        {/* Responsive Stepper Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {activeSteps.map((step) => {
            const isClickable = step.isCompleted || step.isSkipped || step.id === currentStepId;

            return (
              <button
                key={step.id}
                type="button"
                disabled={!isClickable}
                onClick={() => jumpToStep(step.id)}
                className={`group relative text-left p-2.5 rounded-xl border transition-all duration-150 ${
                  step.isCurrent
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : step.isCompleted
                    ? 'border-emerald-200 bg-emerald-50/60 text-slate-900 hover:bg-emerald-50 hover:border-emerald-300'
                    : step.isSkipped
                    ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    : 'border-slate-200 bg-white text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-mono font-bold tracking-wider ${
                      step.isCurrent
                        ? 'text-[#FFED00]'
                        : step.isCompleted
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  >
                    0{step.number}
                  </span>

                  {step.isCompleted ? (
                    <div className="h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <RiCheckLine className="h-3 w-3 stroke-[3]" />
                    </div>
                  ) : step.isSkipped ? (
                    <span className="text-[9px] font-mono font-bold uppercase bg-slate-200 text-slate-700 px-1 py-0.2 rounded">
                      Skip
                    </span>
                  ) : step.isCurrent ? (
                    <div className="h-2 w-2 rounded-full bg-[#FFED00] animate-pulse" />
                  ) : null}
                </div>

                <div
                  className={`text-xs font-bold truncate ${
                    step.isCurrent ? 'text-white font-black' : step.isCompleted ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {step.shortLabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. ACTIVE STEP CONTENT CONTAINER                                   */}
      {/* ------------------------------------------------------------------ */}

      {/* STEP: SPECIFICATIONS */}
      {currentStepId === 'SPECIFICATIONS' && visibleFields.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                  Step 01 / 0{activeSteps.length}
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                  Product Specifications & Materials
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                {visibleFields.length} {visibleFields.length === 1 ? 'Option Group' : 'Option Groups'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select your preferred paper substrates, finishes, and manufacturing dimensions.
            </p>
          </div>

          <div className="space-y-6">
            {/* Standard Factory Finished Dimensions (Fixed Specification) */}
            {product.defaultSize && (
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0 font-bold border border-amber-200/60 shadow-2xs">
                    <RiRulerLine className="h-4 w-4 text-[#E3A008]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                        Standard Finished Dimensions
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-slate-200/90 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">
                        <RiLockLine className="h-2.5 w-2.5" /> Fixed Standard
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 font-sans">
                      {product.defaultSize}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline-block flex-shrink-0">
                  Precision Factory Size
                </span>
              </div>
            )}

            {visibleFields.map((field) => (
              <div key={field.id} className="pb-5 border-b border-slate-100 last:border-0 last:pb-0">
                <DynamicFieldRenderer
                  field={field}
                  value={fieldValues[field.key]}
                  onChange={(val) => handleFieldValueChange(field.key, val)}
                />
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!isSpecsCompleted}
              onClick={goToNextStep}
              className="w-full sm:w-auto"
            >
              <span>Continue to {nextStepDef?.shortLabel || 'Quantity'}</span>
              <RiArrowRightLine className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP: QUANTITY */}
      {currentStepId === 'QUANTITY' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
              Step 0{currentStepDef.number} / 0{activeSteps.length}
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
              Production Quantity & Run Size
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select standard production volume batch size (Minimum:{' '}
              <span className="font-bold text-slate-800">{product.minQuantity || 1} units</span>).
            </p>
          </div>

          <div className="space-y-4">
            {/* Quick Preset Buttons & Stepper */}
            {(() => {
              const minQty = Math.max(1, Number(product.minQuantity) || 1);
              const maxQty = Number(product.maxQuantity) || 100000;
              const rawStep = Number((product as any).quantityStep);
              const step = rawStep > 0 ? rawStep : (minQty >= 100 ? 100 : minQty >= 50 ? 50 : 25);

              // Standard preset list generated based on MOQ & step
              const standardPresets = [
                minQty,
                minQty + 1 * step,
                minQty + 2 * step,
                minQty + 4 * step,
                minQty + 9 * step,
                minQty + 19 * step,
                minQty + 49 * step,
                minQty + 99 * step,
              ]
                .filter((val, idx, arr) => val <= maxQty && arr.indexOf(val) === idx)
                .slice(0, 8);

              return (
                <div className="space-y-4">
                  {/* Custom Quantity Stepper */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 uppercase font-mono block">
                          Custom Batch Quantity
                        </span>
                        <span className="bg-indigo-100 text-indigo-900 text-[10px] font-mono font-black px-2 py-0.5 rounded border border-indigo-200">
                          Step: +{step.toLocaleString()} units
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Adjust run volume in exact increments of {step.toLocaleString()} units (Min: {minQty.toLocaleString()} units)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(minQty, quantity - step))}
                        disabled={quantity <= minQty}
                        className="h-10 w-10 rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-black text-lg flex items-center justify-center transition shadow-2xs cursor-pointer"
                        title={`Decrease by ${step} units`}
                      >
                        -
                      </button>

                      <div className="relative">
                        <input
                          type="number"
                          min={minQty}
                          max={maxQty}
                          step={step}
                          value={quantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val > 0) setQuantity(val);
                          }}
                          className="w-28 sm:w-32 h-10 bg-white border border-slate-300 rounded-xl text-center font-mono font-black text-slate-950 text-base focus:outline-none focus:border-slate-900 shadow-2xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(maxQty, quantity + step))}
                        disabled={quantity >= maxQty}
                        className="h-10 w-10 rounded-xl bg-slate-900 text-[#FFED00] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-black text-lg flex items-center justify-center transition shadow-2xs cursor-pointer"
                        title={`Increase by ${step} units`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Standard Presets Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {standardPresets.map((preset) => {
                      const isSelected = quantity === preset;
                      const estimatedBatchPrice = Number(product.basePrice || 1) * preset;

                      // Check for matched offer tier for this preset
                      let presetOfferDisc = 0;
                      let presetOfferLabel = '';
                      if (quote?.availableOffers && Array.isArray(quote.availableOffers)) {
                        const matched = quote.availableOffers.find(
                          (o: any) => preset >= o.minQty && (o.maxQty === null || o.maxQty === undefined || preset <= o.maxQty)
                        );
                        if (matched && matched.discountPercent > 0) {
                          presetOfferDisc = matched.discountPercent;
                          presetOfferLabel = matched.label || `${matched.discountPercent}% OFF`;
                        }
                      } else if (product.pricingMatrices && Array.isArray(product.pricingMatrices)) {
                        const matched = product.pricingMatrices.find(
                          (m: any) => preset >= m.minQty && (m.maxQty === null || m.maxQty === undefined || preset <= m.maxQty)
                        );
                        if (matched) {
                          const combo = (matched.attributeCombination as any) || {};
                          const disc = matched.discountPercent ?? combo.discountPercent ?? 0;
                          if (disc > 0) {
                            presetOfferDisc = disc;
                            presetOfferLabel = matched.label || combo.label || `${disc}% OFF`;
                          }
                        }
                      }

                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuantity(preset)}
                          className={`relative py-3.5 px-4 rounded-xl text-center border transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {presetOfferDisc > 0 && (
                            <span className={`absolute -top-2.5 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider shadow-2xs border ${
                              isSelected
                                ? 'bg-[#FFED00] text-slate-950 border-amber-300'
                                : 'bg-emerald-600 text-white border-emerald-700'
                            }`}>
                              {presetOfferDisc}% OFF
                            </span>
                          )}

                          <div className="flex items-center justify-center gap-1">
                            <span className={`text-base sm:text-lg font-mono font-black ${isSelected ? 'text-[#FFED00]' : 'text-slate-950'}`}>
                              {preset.toLocaleString()}
                            </span>
                            <span className={`text-[10px] uppercase font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                              Units
                            </span>
                          </div>

                          <div className={`text-xs font-mono font-bold mt-1 ${isSelected ? 'text-emerald-300' : 'text-slate-600'}`}>
                            {isSelected ? formatCurrency(computedGrandTotal) : formatCurrency(estimatedBatchPrice)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Auto-Applied Offer Notification Banner */}
            {quote?.appliedOffer && (quote.appliedOffer.discountPercent > 0 || quote.appliedOffer.savingsAmount > 0) && (
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-amber-500/10 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-950 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-xs">
                    🎉
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-950 flex items-center gap-2 flex-wrap">
                      <span>Volume Offer Auto-Applied:</span>
                      <span className="bg-emerald-600 text-white text-[10px] font-mono font-black px-2 py-0.5 rounded-md">
                        {quote.appliedOffer.discountPercent}% OFF
                      </span>
                      <span className="text-slate-700 font-normal">({quote.appliedOffer.offerName})</span>
                    </div>
                    <div className="text-[11px] text-emerald-800 mt-0.5">
                      You are automatically saving <strong className="text-emerald-950 font-mono font-black">{formatCurrency(quote.appliedOffer.savingsAmount)}</strong> on this order volume!
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-black uppercase text-emerald-900 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md hidden sm:inline-block">
                  AUTO-APPLIED
                </span>
              </div>
            )}

            {/* Live Calculated Price Preview Card */}
            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#FFED00] text-slate-950 flex items-center justify-center font-black border border-[#E3A008]/40 shadow-xs flex-shrink-0">
                  <RiFlashlightLine className="h-5 w-5 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-slate-900 tracking-wider font-mono">
                      {quantity.toLocaleString()} Units Run Size
                    </span>
                    {isCalculatingQuote && (
                      <span className="text-[10px] font-mono text-amber-900 bg-amber-200/80 px-2 py-0.2 rounded font-bold animate-pulse">
                        Calculating...
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Unit Rate: <strong className="text-slate-900 font-mono">₹{(computedSubtotal / Math.max(1, quantity)).toFixed(2)} / unit</strong> (pre-tax) • Subtotal: <strong className="text-slate-900 font-mono">{formatCurrency(computedSubtotal)}</strong>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-amber-200/60 pt-2 sm:pt-0">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                  Estimated Total (Incl. 18% GST)
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-950 font-display">
                  {formatCurrency(computedGrandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {prevStepDef ? (
              <Button type="button" variant="outline" size="md" onClick={goToPrevStep}>
                <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                <span>Back to {prevStepDef.shortLabel}</span>
              </Button>
            ) : <div />}

            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!isQuantityCompleted}
              onClick={goToNextStep}
            >
              <span>Continue to {nextStepDef?.shortLabel || 'Artwork'}</span>
              <RiArrowRightLine className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP: ARTWORK */}
      {currentStepId === 'ARTWORK' && artworkReq !== 'DISABLED' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                  Step 0{currentStepDef.number} / 0{activeSteps.length}
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                  Artwork & Preflight Verification
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {artworkReq === 'REQUIRED' ? (
                  <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                    Mandatory
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                    Optional
                  </span>
                )}
                {artworkPriceNum > 0 && (
                  <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md">
                    +{formatCurrency(artworkPriceNum)}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {artworkReq === 'REQUIRED'
                ? 'Upload your print-ready high resolution vector or raster file.'
                : 'Upload your print file now, or continue without artwork to send files later or request design assistance.'}
            </p>
          </div>

          <input
            type="file"
            ref={artworkInputRef}
            onChange={handleArtworkFileUpload}
            accept=".pdf,.png,.jpg,.jpeg,.ai,.psd,.eps"
            className="hidden"
          />

          {/* If artwork not yet uploaded */}
          {!artworkFile && (
            <div className="space-y-4">
              {/* Optional Mode Decision Cards */}
              {artworkReq === 'OPTIONAL' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setArtworkChoice('UPLOAD');
                      setSkipArtwork(false);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all duration-150 group flex items-start gap-3.5 cursor-pointer ${
                      artworkChoice === 'UPLOAD'
                        ? 'border-slate-900 bg-amber-50/40 ring-1.5 ring-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                        artworkChoice === 'UPLOAD'
                          ? 'bg-slate-900 text-[#FFED00]'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                      }`}
                    >
                      <RiUploadCloud2Line className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-[13px] font-bold text-slate-900">
                        Upload My Artwork Now
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        I have a print-ready design file (PDF, AI, PSD, PNG, JPG)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setArtworkChoice('SKIP');
                      setSkipArtwork(true);
                      setArtworkFile(null);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all duration-150 group flex items-start gap-3.5 cursor-pointer ${
                      artworkChoice === 'SKIP'
                        ? 'border-slate-900 bg-amber-50/40 ring-1.5 ring-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                        artworkChoice === 'SKIP'
                          ? 'bg-slate-900 text-[#FFED00]'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                      }`}
                    >
                      <RiArrowRightLine className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-[13px] font-bold text-slate-900">
                        Continue Without Artwork
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {designReq !== 'DISABLED' || designPriceNum > 0
                          ? `Add reference sample or request design assistance (+${formatCurrency(designPriceNum)})`
                          : 'Send files after checkout or provide sample reference'}
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* BRANCH 1: Customer Selected 'Upload My Artwork Now' */}
              {(artworkReq === 'REQUIRED' || artworkChoice === 'UPLOAD') && (
                <div className="space-y-3 pt-1 animate-fadeIn">
                  <button
                    type="button"
                    disabled={isUploadingArtwork}
                    onClick={() => artworkInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-slate-900 rounded-2xl p-7 flex flex-col items-center justify-center text-center group transition-colors bg-slate-50/50 hover:bg-amber-50/20 cursor-pointer"
                  >
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs text-slate-700 group-hover:text-slate-950 group-hover:scale-110 transition-transform mb-2.5">
                      <RiUploadCloud2Line className="h-7 w-7" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {isUploadingArtwork
                        ? 'Analyzing Resolution & Preflight Standards...'
                        : 'Click or Drag & Drop Print Artwork File'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Supported: PDF, AI, PSD, PNG, JPG, EPS (Up to 100MB)
                    </div>
                    {isArtworkQualityOn && (
                      <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        <RiShieldCheckLine className="h-4 w-4 text-emerald-600" />
                        <span>Automated Prepress Quality Gate: Min {minMegapixels} MP</span>
                      </div>
                    )}
                  </button>

                  {artworkUploadError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                      <RiAlertFill className="h-4 w-4 flex-shrink-0" />
                      <span>{artworkUploadError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* BRANCH 2: Customer Selected 'Continue Without Artwork' -> Reveal Reference Image & Design Service directly */}
              {artworkChoice === 'SKIP' && (
                <div className="space-y-5 pt-2 animate-fadeIn border-t border-slate-100">
                  {/* Optional Reference Image Upload */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <RiImageAddLine className="h-4 w-4 text-[#E3A008]" />
                        <span>Reference Sample Image</span>
                        <span className="text-[10px] font-mono font-normal text-slate-400">(Optional)</span>
                      </label>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Visual Alignment
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Attach a reference photo, sketch, or layout sample so our team understands your branding vision.
                    </p>

                    <input
                      type="file"
                      ref={refInputRef}
                      onChange={handleReferenceFileUpload}
                      accept=".png,.jpg,.jpeg,.webp,.pdf"
                      className="hidden"
                    />

                    {!referenceImage ? (
                      <div>
                        <button
                          type="button"
                          disabled={isUploadingRef}
                          onClick={() => refInputRef.current?.click()}
                          className="w-full border border-dashed border-slate-300 hover:border-slate-900 rounded-xl p-4 flex items-center justify-center gap-3 group transition-colors bg-slate-50/60 hover:bg-amber-50/20 cursor-pointer"
                        >
                          <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs text-slate-700 group-hover:text-slate-950 transition-transform">
                            <RiImageAddLine className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-900">
                              {isUploadingRef ? 'Uploading Reference Image...' : 'Upload Reference Photo / Sample'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              PNG, JPG, WEBP, PDF (Max 20MB)
                            </div>
                          </div>
                        </button>
                        {refUploadError && (
                          <p className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <RiAlertFill className="h-3.5 w-3.5" />
                            {refUploadError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={resolveImageUrl(referenceImage.fileUrl)}
                            alt="Reference Preview"
                            className="h-10 w-10 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {referenceImage.originalFileName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Reference sample attached
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => refInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setReferenceImage(null)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                            title="Remove reference"
                          >
                            <RiDeleteBinLine className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mandatory Design Service (Auto-included for No-Artwork flow) */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300/80 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-900 text-[#FFED00] rounded-lg flex-shrink-0 mt-0.5">
                            <RiPaletteLine className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-950 flex items-center gap-2">
                              <span>In-House Design Studio Service</span>
                              <span className="text-[10px] font-mono font-black uppercase bg-[#FFED00] text-slate-950 px-2 py-0.5 rounded border border-[#E3A008]/50">
                                Auto Included
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                              Our expert graphics team will design and format your print-ready artwork from your instructions and reference sample.
                            </p>
                          </div>
                        </div>

                        {designPriceNum > 0 ? (
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs sm:text-sm font-black font-mono text-slate-950 block">
                              +{formatCurrency(designPriceNum)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Design Fee</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex-shrink-0">
                            Included
                          </span>
                        )}
                      </div>

                      {/* Design instructions textarea */}
                      <div className="pt-1">
                        <label className="block text-[11px] font-bold text-slate-800 mb-1">
                          Design Instructions & Branding Details (Optional)
                        </label>
                        <textarea
                          value={designNotes}
                          onChange={(e) => setDesignNotes(e.target.value)}
                          placeholder="Include logo details, text, contact numbers, brand color codes, or layout guidelines..."
                          rows={3}
                          className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-sans shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Uploaded Artwork Card & Verification Feedback */}
          {artworkFile && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-3 bg-slate-900 text-[#FFED00] rounded-xl flex-shrink-0">
                    <RiFileTextLine className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {artworkFile.originalFileName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{(artworkFile.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                      {artworkFile.width && artworkFile.height && (
                        <span>
                          • {artworkFile.width} × {artworkFile.height} px
                        </span>
                      )}
                      {artworkFile.actualMegapixels !== null && artworkFile.actualMegapixels !== undefined && (
                        <span className="font-bold text-slate-800">
                          • {artworkFile.actualMegapixels} MP
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => artworkInputRef.current?.click()}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg shadow-xs cursor-pointer"
                  >
                    Replace
                  </button>
                  {artworkReq === 'OPTIONAL' && (
                    <button
                      type="button"
                      onClick={() => setArtworkFile(null)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove artwork"
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Prepress Quality Status */}
              {isArtworkQualityOn && artworkFile.actualMegapixels !== null && (
                <div>
                  {artworkFile.qualityStatus === 'WARNING' ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <RiAlertFill className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold">
                            Artwork resolution is below recommended print threshold
                          </div>
                          <div className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                            Required minimum: <span className="font-bold">{minMegapixels} MP</span> | Detected:{' '}
                            <span className="font-bold">{artworkFile.actualMegapixels} MP</span>.
                            Printing at lower resolution may cause blurriness on press.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => artworkInputRef.current?.click()}
                          className="px-3 py-1.5 text-xs font-bold bg-amber-950 text-white rounded-lg hover:bg-black cursor-pointer"
                        >
                          Replace File
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setArtworkFile((prev) => (prev ? { ...prev, warningAccepted: true } : null))
                          }
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                            artworkFile.warningAccepted
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          {artworkFile.warningAccepted ? '✓ Warning Acknowledged' : 'Accept & Continue'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RiCheckLine className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
                        <span className="text-xs font-bold">
                          Prepress Quality Check Passed ({artworkFile.actualMegapixels} MP ≥ {minMegapixels} MP)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        High Quality
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Design Assistance / Editing Touch-Up for Uploaded Artwork */}
              {designReq !== 'DISABLED' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RiSparklingFill className="h-4 w-4 text-[#E3A008]" />
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-display">
                        Need Professional Design Edits or Touch-up on this Artwork?
                      </h4>
                    </div>
                    {designPriceNum > 0 && uploadDesignAssist && (
                      <span className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300 self-start sm:self-auto">
                        +{formatCurrency(designPriceNum)} Added
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    If your uploaded artwork needs text adjustments, logo alignment, color corrections, background edits, or bleed formatting, our studio team can edit it.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUploadDesignAssist(false)}
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        !uploadDesignAssist
                          ? 'border-slate-900 bg-white ring-1 ring-slate-900 shadow-xs'
                          : 'border-slate-200 bg-white/70 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          !uploadDesignAssist ? 'border-slate-950 bg-slate-950' : 'border-slate-300'
                        }`}>
                          {!uploadDesignAssist && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">No, Print As-Is</div>
                          <div className="text-[10px] text-slate-500 font-mono">Use uploaded file directly</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-600">₹0</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUploadDesignAssist(true)}
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        uploadDesignAssist
                          ? 'border-amber-400 bg-amber-50/90 ring-1 ring-amber-400 shadow-xs'
                          : 'border-slate-200 bg-white/70 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          uploadDesignAssist ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                        }`}>
                          {uploadDesignAssist && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-950">Yes, Add Design Assistance</div>
                          <div className="text-[10px] text-amber-800 font-mono font-bold">Studio touch-up & edits</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-black text-amber-950">
                        {designPriceNum > 0 ? `+${formatCurrency(designPriceNum)}` : 'Included'}
                      </span>
                    </button>
                  </div>

                  {/* Edits Instructions Textarea */}
                  {uploadDesignAssist && (
                    <div className="pt-2 space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-800">
                        Specify what changes or touch-ups are needed on this artwork:
                      </label>
                      <textarea
                        value={designNotes}
                        onChange={(e) => setDesignNotes(e.target.value)}
                        placeholder="e.g. Update phone number to +91 9876543210, fix bleed margin, sharpen logo, align address text..."
                        rows={3}
                        className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-sans shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {prevStepDef ? (
              <Button type="button" variant="outline" size="md" onClick={goToPrevStep}>
                <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                <span>Back to {prevStepDef.shortLabel}</span>
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={!isArtworkCompleted}
                onClick={goToNextStep}
              >
                <span>Continue to {nextStepDef?.shortLabel || 'Next Step'}</span>
                <RiArrowRightLine className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP: REFERENCE IMAGE */}
      {currentStepId === 'REFERENCE_IMAGE' && refReq !== 'DISABLED' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                  Step 0{currentStepDef.number} / 0{activeSteps.length}
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                  Reference Sample / Photo
                </h2>
              </div>
              <div>
                {refReq === 'REQUIRED' ? (
                  <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                    Mandatory
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                    Optional
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {refReq === 'REQUIRED'
                ? 'Upload a reference image or design mockup for manufacturing alignment.'
                : 'Optional: provide a reference picture or visual sample for our production team.'}
            </p>
          </div>

          <input
            type="file"
            ref={refInputRef}
            onChange={handleReferenceFileUpload}
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            className="hidden"
          />

          {!referenceImage ? (
            <div className="space-y-4">
              <button
                type="button"
                disabled={isUploadingRef}
                onClick={() => refInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 hover:border-slate-900 rounded-2xl p-8 flex flex-col items-center justify-center text-center group transition-colors bg-slate-50/50 hover:bg-amber-50/20 cursor-pointer"
              >
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs text-slate-700 group-hover:text-slate-950 group-hover:scale-110 transition-transform mb-2">
                  <RiImageAddLine className="h-7 w-7" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {isUploadingRef ? 'Uploading Reference Image...' : 'Click to Upload Reference Sample'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  PNG, JPG, WEBP, PDF (Max 20MB)
                </div>
              </button>

              {refUploadError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <RiAlertFill className="h-4 w-4 flex-shrink-0" />
                  <span>{refUploadError}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={resolveImageUrl(referenceImage.fileUrl)}
                  alt="Reference Preview"
                  className="h-14 w-14 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {referenceImage.originalFileName}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Reference sample attached
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refInputRef.current?.click()}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg shadow-xs cursor-pointer"
                >
                  Replace
                </button>
                {refReq === 'OPTIONAL' && (
                  <button
                    type="button"
                    onClick={() => setReferenceImage(null)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove reference"
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {prevStepDef ? (
              <Button type="button" variant="outline" size="md" onClick={goToPrevStep}>
                <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                <span>Back to {prevStepDef.shortLabel}</span>
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              {refReq === 'OPTIONAL' && !referenceImage && (
                <Button type="button" variant="ghost" size="md" onClick={handleSkipReference}>
                  <span>Skip Reference</span>
                </Button>
              )}

              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={!isReferenceCompleted}
                onClick={goToNextStep}
              >
                <span>Continue to {nextStepDef?.shortLabel || 'Next Step'}</span>
                <RiArrowRightLine className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP: DESIGN SERVICE */}
      {currentStepId === 'DESIGN_SERVICE' && designReq !== 'DISABLED' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                  Step 0{currentStepDef.number} / 0{activeSteps.length}
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                  Professional Design Studio Service
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {designReq === 'REQUIRED' ? (
                  <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                    Mandatory
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                    Optional
                  </span>
                )}
                {designPriceNum > 0 && (
                  <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md">
                    +{formatCurrency(designPriceNum)}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Have our professional in-house graphics team craft or polish your artwork before printing.
            </p>
          </div>

          {/* Design Service Toggle Choices */}
          {designReq === 'OPTIONAL' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWantsDesignService(true)}
                className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all duration-150 cursor-pointer ${
                  wantsDesignService
                    ? 'border-slate-900 bg-amber-50/40 ring-1.5 ring-slate-900 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                    wantsDesignService
                      ? 'bg-slate-900 text-[#FFED00]'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <RiPaletteLine className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">
                    Yes — Include Design Assistance
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {designPriceNum > 0
                      ? `+${formatCurrency(designPriceNum)} design fee`
                      : 'Complimentary with product'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setWantsDesignService(false)}
                className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all duration-150 cursor-pointer ${
                  !wantsDesignService
                    ? 'border-slate-900 bg-amber-50/40 ring-1.5 ring-slate-900 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                    !wantsDesignService
                      ? 'bg-slate-900 text-[#FFED00]'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <RiCloseLine className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">
                    No — Design Assistance Not Needed
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Using my own print files or standard layout
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-950 flex items-center justify-between">
              <span>Design Service is mandatory for this custom-manufactured product.</span>
              <span className="font-mono text-xs">+{formatCurrency(designPriceNum)}</span>
            </div>
          )}

          {/* Design Notes Input if selected */}
          {effectiveHasDesignService && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Design Instructions & Branding Requirements (Optional)
              </label>
              <textarea
                value={designNotes}
                onChange={(e) => setDesignNotes(e.target.value)}
                placeholder="Include logo details, required text, color codes, contact numbers, and formatting directions..."
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-sans"
              />
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {prevStepDef ? (
              <Button type="button" variant="outline" size="md" onClick={goToPrevStep}>
                <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                <span>Back to {prevStepDef.shortLabel}</span>
              </Button>
            ) : <div />}

            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!isDesignCompleted}
              onClick={goToNextStep}
            >
              <span>Continue to {nextStepDef?.shortLabel || 'Review'}</span>
              <RiArrowRightLine className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP: REVIEW & FINAL QUOTE */}
      {currentStepId === 'REVIEW' && (
        <div className="space-y-6">
          {/* Configuration Summary Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-5">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                  Final Step
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                  Your Configuration Summary
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review all selected specifications, quantity, and services before ordering.
                </p>
              </div>
            </div>

            {/* Structured Specifications Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Expected Delivery & SLA */}
              {(() => {
                const delivery = getEstimatedDeliveryText(product.productionDays || 2);
                return (
                  <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between col-span-1 sm:col-span-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <RiTruckLine className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block">
                          Expected Delivery Window (SLA)
                        </span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {delivery.deliveryRange}{' '}
                          <span className="text-slate-500 font-normal text-xs font-mono">
                            ({product.productionDays || 2} Days Plant Run + Express Shipping)
                          </span>
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      ON SCHEDULE
                    </span>
                  </div>
                );
              })()}

              {/* Standard Dimensions (Read-Only) */}
              {product.defaultSize && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                        Product Dimensions
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-200/90 px-1.5 py-0.2 rounded">
                        Standard
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block font-sans">
                      {product.defaultSize}
                    </span>
                  </div>
                  <div className="text-slate-400 p-1 flex-shrink-0" title="Fixed Standard Specification (Non-editable)">
                    <RiLockLine className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                    Quantity
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {quantity.toLocaleString()} pcs
                    </span>
                    {(quote?.appliedOffer?.discountPercent > 0 || quote?.discountPercent > 0) && (
                      <span className="inline-flex items-center text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300/60">
                        🎉 {quote?.appliedOffer?.discountPercent || quote?.discountPercent}% OFF
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => jumpToStep('QUANTITY')}
                  className="text-slate-400 hover:text-slate-900 p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                  title="Edit Quantity"
                >
                  <RiEditLine className="h-4 w-4" />
                </button>
              </div>

              {/* Dynamic Options */}
              {visibleFields.map((f) => {
                const val = fieldValues[f.key];
                const displayVal = getFieldDisplayValue(f.key, val);
                return (
                  <div
                    key={f.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase truncate">
                        {f.label}
                      </span>
                      <span className="font-bold text-slate-900 truncate block">
                        {displayVal || 'Not selected'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => jumpToStep('SPECIFICATIONS')}
                      className="text-slate-400 hover:text-slate-900 p-1 rounded-md hover:bg-white transition-colors flex-shrink-0 cursor-pointer"
                      title={`Edit ${f.label}`}
                    >
                      <RiEditLine className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              {/* Artwork Status */}
              {artworkReq !== 'DISABLED' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      Artwork File
                    </span>
                    <span className="font-bold text-slate-900 truncate block">
                      {artworkFile
                        ? `Uploaded (${artworkFile.originalFileName})`
                        : artworkChoice === 'SKIP' || skipArtwork
                        ? 'No Artwork (Design Service Included)'
                        : 'Not provided'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep('ARTWORK')}
                    className="text-slate-400 hover:text-slate-900 p-1 rounded-md hover:bg-white transition-colors flex-shrink-0 cursor-pointer"
                    title="Edit Artwork"
                  >
                    <RiEditLine className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Reference Image Status */}
              {(refReq !== 'DISABLED' || artworkChoice === 'SKIP') && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      Reference Sample
                    </span>
                    <span className="font-bold text-slate-900 truncate block">
                      {referenceImage
                        ? referenceImage.originalFileName
                        : artworkChoice === 'UPLOAD'
                        ? 'Not needed (Artwork uploaded)'
                        : 'None provided'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep('ARTWORK')}
                    className="text-slate-400 hover:text-slate-900 p-1 rounded-md hover:bg-white transition-colors flex-shrink-0 cursor-pointer"
                    title="Edit Reference Sample"
                  >
                    <RiEditLine className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Design Service Status */}
              {(designReq !== 'DISABLED' || designPriceNum > 0 || artworkChoice === 'SKIP') && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      Design Service
                    </span>
                    <span className="font-bold text-slate-900 truncate block">
                      {effectiveHasDesignService
                        ? `Included (+${formatCurrency(designPriceNum)})`
                        : 'Not needed (Own Artwork)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep('ARTWORK')}
                    className="text-slate-400 hover:text-slate-900 p-1 rounded-md hover:bg-white transition-colors flex-shrink-0 cursor-pointer"
                    title="Edit Design Service"
                  >
                    <RiEditLine className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Authoritative Live Price Breakdown & Payment Mode Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-elevated space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RiFlashlightLine className="h-4 w-4 text-[#E3A008]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display">
                  Live Authoritative Price Breakdown
                </h3>
              </div>
              {isCalculatingQuote && (
                <span className="text-[11px] font-mono text-slate-400 animate-pulse">
                  Updating server quote...
                </span>
              )}
            </div>

            {/* Price Rows */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>
                  Base Unit Rate ({quantity.toLocaleString()} pcs @ ₹{Number(quote?.originalBasePrice || product.basePrice || 0).toFixed(2)}/pc)
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(Number(quote?.baseSubtotal || (Number(product.basePrice || 0) * quantity) || 0))}
                </span>
              </div>

              {Number(quote?.dynamicModifiersTotal || quote?.optionsCost || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Selected Specification Upgrades</span>
                  <span className="font-mono font-bold text-slate-900">
                    +{formatCurrency(Number(quote?.dynamicModifiersTotal || quote?.optionsCost || 0))}
                  </span>
                </div>
              )}

              {effectiveHasArtwork && artworkPriceNum > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Prepress & Preflight Processing</span>
                  <span className="font-mono font-bold text-slate-900">
                    +{formatCurrency(artworkPriceNum)}
                  </span>
                </div>
              )}

              {effectiveHasDesignService && designPriceNum > 0 && (
                <div className="flex justify-between text-slate-950 font-bold bg-amber-50/60 p-2 rounded-lg border border-amber-200/70">
                  <div className="flex items-center gap-1.5">
                    <RiPaletteLine className="h-4 w-4 text-[#E3A008]" />
                    <span>In-House Design Studio Fee</span>
                  </div>
                  <span className="font-mono text-amber-950">
                    +{formatCurrency(designPriceNum)}
                  </span>
                </div>
              )}

              {/* Volume Discount / Offer Savings Line Item */}
              {(Number(quote?.appliedOffer?.savingsAmount || quote?.discountAmount || 0) > 0 || Number(quote?.appliedOffer?.discountPercent || quote?.discountPercent || 0) > 0) && (
                <div className="flex justify-between items-center text-emerald-900 font-bold bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-300/80 shadow-2xs animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-base flex-shrink-0">🎉</span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-emerald-950 truncate">
                        {quote?.appliedOffer?.offerName || `Volume Offer (${quote?.appliedOffer?.discountPercent || quote?.discountPercent}% OFF)`}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Instant Auto-Applied Savings
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-black text-emerald-700 flex-shrink-0">
                    -{formatCurrency(Number(quote?.appliedOffer?.savingsAmount || quote?.discountAmount || 0))}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-600">
                <span>Pre-tax Subtotal</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(computedSubtotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Estimated GST (18% Print Tariff)</span>
                <span className="font-mono font-bold text-slate-900">
                  +{formatCurrency(computedTax)}
                </span>
              </div>

              {/* Courier Delivery Fee Line Item */}
              <div className="flex justify-between items-center text-slate-600">
                <div className="flex items-center gap-1.5">
                  <RiTruckLine className="h-3.5 w-3.5 text-indigo-600" />
                  <span>
                    {deliveryMethod === 'STORE_PICKUP' ? 'Store Hub Pickup' : 'Doorstep Courier Delivery'}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {deliveryMethod === 'STORE_PICKUP' ? (
                    <span className="text-emerald-700 font-bold">FREE (Self Pickup)</span>
                  ) : computedShipping === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE (Eligible)</span>
                  ) : (
                    `+${formatCurrency(computedShipping)}`
                  )}
                </span>
              </div>

              {/* COD Handling Fee Line Item */}
              {paymentMethod === 'COD' && computedCodCharge > 0 && (
                <div className="flex justify-between items-center text-amber-900 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-1.5">
                    <RiHandCoinLine className="h-3.5 w-3.5 text-amber-700" />
                    <span className="text-xs font-bold">Cash on Delivery (COD) Surcharge</span>
                  </div>
                  <span className="font-mono font-bold text-amber-950">
                    +{formatCurrency(computedCodCharge)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                    Total Order Value (Incl. Taxes & Delivery)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {quote?.unitPrice ? `₹${Number(quote.unitPrice).toFixed(2)} / unit (pre-tax)` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display block">
                    {formatCurrency(computedGrandTotal)}
                  </span>
                  {Number(quote?.appliedOffer?.savingsAmount || quote?.discountAmount || 0) > 0 && (
                    <span className="text-[11px] font-mono font-bold text-emerald-700">
                      Total Savings: {formatCurrency(Number(quote?.appliedOffer?.savingsAmount || quote?.discountAmount || 0))}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Clickable Delivery Method Selection */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                  Select Delivery Fulfillment
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose doorstep courier dispatch or free in-person collection.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Courier Delivery Option */}
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('COURIER')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    deliveryMethod === 'COURIER'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1.5 ring-indigo-600 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          deliveryMethod === 'COURIER'
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {deliveryMethod === 'COURIER' && <RiCheckLine className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">Doorstep Courier</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                      {computedShipping === 0 ? 'FREE' : formatCurrency(computedShipping)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Direct insured courier shipping to your address
                  </div>
                </button>

                {/* Store Pickup Option */}
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('STORE_PICKUP')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    deliveryMethod === 'STORE_PICKUP'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1.5 ring-indigo-600 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          deliveryMethod === 'STORE_PICKUP'
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {deliveryMethod === 'STORE_PICKUP' && <RiCheckLine className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">Self Store Pickup</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      FREE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Collect directly from central print hub facility
                  </div>
                </button>
              </div>
            </div>

            {/* Clickable Payment Method Selection (Prepaid Online vs COD) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                  Select Payment Method
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose instant online prepaid checkout or Cash on Delivery (COD).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Prepaid Online */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'ONLINE'
                      ? 'border-slate-900 bg-amber-50/40 ring-1.5 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === 'ONLINE'
                            ? 'border-slate-900 bg-slate-900 text-[#FFED00]'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {paymentMethod === 'ONLINE' && <RiCheckLine className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">Online Prepaid</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      ₹0 Surcharge
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Instant UPI, Credit/Debit Cards, Net Banking, EMI
                  </div>
                </button>

                {/* Cash on Delivery (COD) */}
                <button
                  type="button"
                  disabled={product.allowCod === false}
                  onClick={() => {
                    if (product.allowCod !== false) {
                      setPaymentMethod('COD');
                    }
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    product.allowCod === false
                      ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200'
                      : paymentMethod === 'COD'
                      ? 'border-emerald-600 bg-emerald-50/40 ring-1.5 ring-emerald-600 shadow-xs cursor-pointer'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === 'COD'
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {paymentMethod === 'COD' && <RiCheckLine className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">Cash on Delivery (COD)</span>
                    </div>
                    {product.allowCod === false ? (
                      <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                        Unavailable
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        {computedCodCharge > 0 ? `+${formatCurrency(computedCodCharge)} Fee` : '₹0 Surcharge'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {product.allowCod === false
                      ? 'COD is not supported for this custom print item'
                      : 'Pay remaining balance upon doorstep delivery'}
                  </div>
                </button>
              </div>
            </div>

            {/* Payment Terms Selector: Full Pay vs 50% Split Milestone */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                  Select Payment Terms
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose full settlement or split milestone payment (minimum 50% deposit required).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Full Payment */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('FULL')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMode === 'FULL'
                      ? 'border-slate-900 bg-amber-50/40 ring-1.5 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          paymentMode === 'FULL'
                            ? 'border-slate-900 bg-slate-900 text-[#FFED00]'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {paymentMode === 'FULL' && <RiCheckLine className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">Full Settlement</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      100%
                    </span>
                  </div>

                  <div className="text-base font-mono font-black text-slate-950 mb-0.5">
                    {formatCurrency(computedGrandTotal)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Pay complete amount • Immediate production dispatch priority
                  </div>
                </button>

                {/* Option 2: Split 50% Advance */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('SPLIT_50')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMode === 'SPLIT_50'
                      ? 'border-slate-900 bg-amber-50/40 ring-1.5 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          paymentMode === 'SPLIT_50'
                            ? 'border-slate-900 bg-slate-900 text-[#FFED00]'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {paymentMode === 'SPLIT_50' && <RiCheckLine className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">Split Milestone</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                      50% Advance
                    </span>
                  </div>

                  <div className="text-base font-mono font-black text-slate-950 mb-0.5">
                    {formatCurrency(computedAdvanceAmount)}{' '}
                    <span className="text-xs font-normal text-slate-500 font-sans">Now</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Balance {formatCurrency(computedBalanceAmount)} payable before dispatch
                  </div>
                </button>
              </div>
            </div>

            {/* Terms and Conditions Acceptance Checkbox */}
            <div className="pt-4 border-t border-slate-100">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5 flex items-center">
                    <input
                      type="checkbox"
                      id="terms-acceptance-checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 focus:ring-offset-0 cursor-pointer accent-slate-900"
                    />
                  </div>
                  <div className="text-xs flex-1">
                    <label
                      htmlFor="terms-acceptance-checkbox"
                      className="font-semibold text-slate-900 cursor-pointer select-none leading-relaxed"
                    >
                      I have reviewed and agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsTermsModalOpen(true);
                        }}
                        className="font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        Terms and Conditions
                      </button>{' '}
                      & Design Proof Approval Policy.
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1">
                      By confirming the proof, you acknowledge that the design is final, and any errors after printing will be your responsibility.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Errors Notice */}
            {!isValid && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-rose-800 flex items-center gap-1.5">
                  <RiAlertFill className="h-4 w-4 flex-shrink-0" />
                  <span>Please complete required steps before ordering:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-rose-700 pl-1 space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA Buttons */}
            {!isPreviewMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={!isValid || isSubmitting}
                  onClick={handleAddToCartClick}
                  className="w-full"
                >
                  <RiShoppingCart2Line className="h-4 w-4 mr-2" />
                  <span>Add to Cart</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={!isValid || isSubmitting}
                  onClick={handleBuyNowClick}
                  className="w-full"
                >
                  <span>
                    {paymentMode === 'SPLIT_50'
                      ? `Pay 50% Advance (${formatCurrency(computedAdvanceAmount)})`
                      : `Instant Checkout (${formatCurrency(computedGrandTotal)})`}
                  </span>
                  <RiArrowRightLine className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Design Proof & Printing Terms and Conditions Modal */}
      <Modal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        title="Terms & Conditions — Design Proof & Print Approval"
        subtitle="Please review the production approval policy before placing your order"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p className="font-medium text-slate-900 text-sm">
            Please find the design proof for your order attached. Kindly review it carefully and confirm that everything is correct, including:
          </p>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#E3A008] flex-shrink-0" />
              <span>Text (spelling, grammar, and alignment)</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#E3A008] flex-shrink-0" />
              <span>Colors, images, and design layout</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#E3A008] flex-shrink-0" />
              <span>Dimensions and bleed/crop marks (if applicable)</span>
            </div>
          </div>

          <p className="text-slate-600">
            If there are any changes needed, please let us know as soon as possible. Once we receive your approval, we’ll proceed with printing.
          </p>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 flex items-start gap-3">
            <RiAlertFill className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="block text-amber-900 font-bold mb-1">⚠ Please note:</strong>
              By confirming the proof, you acknowledge that the design is final, and any errors after printing will be your responsibility.
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsTermsModalOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setTermsAccepted(true);
                setIsTermsModalOpen(false);
              }}
            >
              <RiCheckLine className="h-4 w-4 mr-1.5" />
              <span>Accept & Confirm</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
