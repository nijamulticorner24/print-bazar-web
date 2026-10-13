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
  RiMapPin2Line,
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
  artworkFiles?: Record<string, FlowArtworkState>;
  hasReferenceImage: boolean;
  referenceImage: FlowReferenceImageState | null;
  hasDesignService: boolean;
  designNotes: string;
  deliveryMethod: 'COURIER' | 'STORE_PICKUP';
  shippingPincode?: string;
  paymentMethod: 'ONLINE';
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
  // 2. QUANTITY STATE (Synchronized to Admin Backend Configuration)
  // ---------------------------------------------------------------------------
  const backendQuantities = useMemo(() => {
    if (product.pricingMatrices && Array.isArray(product.pricingMatrices) && product.pricingMatrices.length > 0) {
      const qtys = Array.from(
        new Set(product.pricingMatrices.map((m: any) => Number(m.minQty))),
      )
        .filter((q) => !isNaN(q) && q > 0)
        .sort((a, b) => a - b);
      if (qtys.length > 0) return qtys;
    }
    return [];
  }, [product.pricingMatrices]);

  const [quantity, setQuantity] = useState<number>(() => {
    if (initialQuantity) return initialQuantity;
    if (product.pricingMatrices && Array.isArray(product.pricingMatrices) && product.pricingMatrices.length > 0) {
      const qtys = Array.from(
        new Set(product.pricingMatrices.map((m: any) => Number(m.minQty))),
      )
        .filter((q) => !isNaN(q) && q > 0)
        .sort((a, b) => a - b);
      if (qtys.length > 0) return qtys[0];
    }
    return product.minQuantity || 1;
  });

  // Ensure quantity is locked to backend quantities when available
  useEffect(() => {
    if (backendQuantities.length > 0 && !backendQuantities.includes(quantity)) {
      setQuantity(backendQuantities[0]);
    }
  }, [backendQuantities, quantity]);

  // ---------------------------------------------------------------------------
  // 3. ARTWORK & DYNAMIC SLOT CONFIGURATION STATE
  // ---------------------------------------------------------------------------
  const artworkReq: ProductOptionRequirement = product.artworkRequirement || 'OPTIONAL';
  const artworkPriceNum = Number(product.artworkPrice) || 0;
  const isArtworkQualityOn = Boolean(product.artworkQualityVerification);
  const minMegapixels = Number(product.minimumArtworkMegapixels) || 1.0;

  // Multi-slot artwork files stored by slot key (e.g. 'front', 'back', 'inside')
  const [slotFiles, setSlotFiles] = useState<Record<string, FlowArtworkState>>({});
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({});
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const [artworkFile, setArtworkFile] = useState<FlowArtworkState | null>(null);

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

  // Dynamically resolve active upload slots from selected attribute options
  const activeSlotConfigs = useMemo(() => {
    const slots: { slotKey: string; label: string; fieldKey: string }[] = [];
    for (const field of visibleFields) {
      const selectedOptValue = fieldValues[field.key];
      const opt = field.options?.find((o) => String(o.value) === String(selectedOptValue));
      if (opt && opt.fileCount && opt.fileCount > 0) {
        const count = opt.fileCount;
        const rawLabels =
          opt.fileSlotLabels && opt.fileSlotLabels.length > 0
            ? opt.fileSlotLabels
            : Array.from({ length: count }, (_, i) => `slot_${i + 1}`);

        for (let i = 0; i < count; i++) {
          const label = rawLabels[i] || `Slot ${i + 1}`;
          slots.push({
            slotKey: label.toLowerCase().replace(/\s+/g, '_'),
            label,
            fieldKey: field.key,
          });
        }
      }
    }
    return slots;
  }, [visibleFields, fieldValues]);

  // Active uploaded files corresponding strictly to the currently selected attribute values
  const activeSlotFiles = useMemo(() => {
    const activeKeys = new Set(activeSlotConfigs.map((s) => s.slotKey));
    const filtered: Record<string, FlowArtworkState> = {};
    for (const [k, v] of Object.entries(slotFiles)) {
      if (activeKeys.has(k)) {
        filtered[k] = v;
      }
    }
    return filtered;
  }, [activeSlotConfigs, slotFiles]);

  // Primary slot file reference for single-file backwards compatibility
  const primarySlotFile = useMemo(() => {
    const vals = Object.values(activeSlotFiles);
    return vals.length > 0 ? vals[0] : artworkFile;
  }, [activeSlotFiles, artworkFile]);

  // Slot file upload handler
  const handleSlotFileUpload = async (slotKey: string, file: File) => {
    setUploadingSlots((prev) => ({ ...prev, [slotKey]: true }));
    setSlotErrors((prev) => ({ ...prev, [slotKey]: '' }));
    try {
      const res = await api.uploadArtwork(file, product.id, minMegapixels);
      const state: FlowArtworkState = {
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
      };
      setSlotFiles((prev) => ({ ...prev, [slotKey]: state }));
      setArtworkFile(state);
    } catch (err: any) {
      setSlotErrors((prev) => ({
        ...prev,
        [slotKey]: err?.message || 'Failed to upload artwork file',
      }));
    } finally {
      setUploadingSlots((prev) => ({ ...prev, [slotKey]: false }));
    }
  };

  // Slot file removal handler
  const handleSlotFileRemove = (slotKey: string) => {
    setSlotFiles((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
    setSlotErrors((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  // Effective flags for pricing & submission
  const effectiveHasArtwork = useMemo(() => {
    if (artworkReq === 'DISABLED') return false;
    return Object.keys(activeSlotFiles).length > 0 || Boolean(artworkFile);
  }, [artworkReq, activeSlotFiles, artworkFile]);

  const effectiveHasDesignService = useMemo(() => {
    if (designReq === 'REQUIRED') return true;
    // Check if user selected an option requesting design assistance (e.g. Yes Please, or fileCount === 0 with design keywords)
    const hasSelectedDesignOption = visibleFields.some((f) => {
      const val = String(fieldValues[f.key] || '').toLowerCase();
      const opt = f.options?.find((o) => String(o.value) === String(fieldValues[f.key]));
      return (
        val === 'yes' ||
        val === 'yes_please' ||
        val.includes('design') ||
        (opt?.fileCount === 0 && !val.includes('no'))
      );
    });
    if (hasSelectedDesignOption) return true;
    if (designReq !== 'DISABLED' && wantsDesignService) return true;
    return false;
  }, [designReq, wantsDesignService, visibleFields, fieldValues]);

  const effectiveHasReference = useMemo(() => {
    if (refReq === 'DISABLED') return false;
    return Boolean(referenceImage && !skipReference);
  }, [refReq, referenceImage, skipReference]);

  // ---------------------------------------------------------------------------
  // 6. DYNAMIC STEP RESOLVER ENGINE (Clean 3-Step Flow: SPECS -> QTY -> REVIEW)
  // ---------------------------------------------------------------------------
  const isSpecsCompleted = useMemo(() => {
    if (visibleFields.length === 0) return true;
    for (const f of visibleFields) {
      if (f.isRequired) {
        const val = fieldValues[f.key];
        if (val === undefined || val === null || val === '') return false;
      }
    }
    // If artwork is REQUIRED and active slots are configured, ensure all slots have uploaded files
    if (artworkReq === 'REQUIRED' && activeSlotConfigs.length > 0) {
      for (const slot of activeSlotConfigs) {
        if (!slotFiles[slot.slotKey]) return false;
      }
    }
    return true;
  }, [visibleFields, fieldValues, artworkReq, activeSlotConfigs, slotFiles]);

  const isQuantityCompleted = useMemo(() => {
    return quantity >= (product.minQuantity || 1);
  }, [quantity, product.minQuantity]);

  // Dynamic active steps: Clean 3-step navigation
  const activeStepsList: StepId[] = useMemo(() => {
    const list: StepId[] = [];
    if (visibleFields.length > 0) {
      list.push('SPECIFICATIONS');
    }
    list.push('QUANTITY');
    list.push('REVIEW');
    return list;
  }, [visibleFields.length]);

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
  const [shippingPincode, setShippingPincode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pb2_user_pincode') || '';
    }
    return '';
  });
  const paymentMethod = 'ONLINE';

  useEffect(() => {
    const handlePincodeUpdate = (e: any) => {
      const code = e?.detail ?? '';
      if (typeof code === 'string' && code !== shippingPincode) {
        setShippingPincode(code);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pincode-updated', handlePincodeUpdate);
      return () => window.removeEventListener('pincode-updated', handlePincodeUpdate);
    }
  }, [shippingPincode]);

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
          shippingPincode: deliveryMethod === 'COURIER' && shippingPincode.trim().length >= 3 ? shippingPincode.trim() : undefined,
          paymentMethod: 'ONLINE',
          isCod: false,
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
    shippingPincode,
    paymentMethod,
  ]);

  // Field change handler
  const handleFieldValueChange = (fieldKey: string, val: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldKey]: val,
    }));
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
      if (activeSlotConfigs.length > 0) {
        for (const slot of activeSlotConfigs) {
          if (!slotFiles[slot.slotKey]) {
            errors.push(`Artwork file upload is required for ${slot.label}.`);
          } else if (slotFiles[slot.slotKey].qualityStatus === 'WARNING' && !slotFiles[slot.slotKey].warningAccepted) {
            errors.push(`Please acknowledge resolution warning for ${slot.label}.`);
          }
        }
      } else if (!effectiveHasDesignService && !primarySlotFile) {
        errors.push('Artwork file upload is required for this product.');
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
    activeSlotConfigs,
    slotFiles,
    effectiveHasDesignService,
    primarySlotFile,
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

  const computedGrandTotal = useMemo(() => {
    return Number(quote?.grandTotal || Math.round((computedSubtotal + computedTax + computedShipping) * 100) / 100);
  }, [quote?.grandTotal, computedSubtotal, computedTax, computedShipping]);

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
      artworkFile: effectiveHasArtwork ? primarySlotFile : null,
      artworkFiles: activeSlotFiles,
      hasReferenceImage: effectiveHasReference,
      referenceImage: effectiveHasReference ? referenceImage : null,
      hasDesignService: effectiveHasDesignService,
      designNotes,
      deliveryMethod,
      shippingPincode: deliveryMethod === 'COURIER' && shippingPincode?.trim() ? shippingPincode.trim() : undefined,
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
        shippingPincode: deliveryMethod === 'COURIER' ? shippingPincode : undefined,
        codCharge: 0,
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
                  productId={product.id}
                  slotFiles={slotFiles}
                  onSlotFileUpload={handleSlotFileUpload}
                  onSlotFileRemove={handleSlotFileRemove}
                  uploadingSlots={uploadingSlots}
                  slotErrors={slotErrors}
                  designNotes={designNotes}
                  onDesignNotesChange={setDesignNotes}
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
              const hasBackendQuantities = backendQuantities.length > 0;
              const minQty = Math.max(1, Number(product.minQuantity) || 1);
              const maxQty = Number(product.maxQuantity) || 100000;
              const rawStep = Number((product as any).quantityStep);
              const step = rawStep > 0 ? rawStep : (minQty >= 100 ? 100 : minQty >= 50 ? 50 : 25);

              // Standard preset list: if admin configured quantities in backend, show ONLY those!
              const standardPresets = hasBackendQuantities
                ? backendQuantities
                : [
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

              // Dynamic helper to get accurate price for any preset based on selected attributes
              const getPresetBatchPrice = (presetQty: number) => {
                if (product.pricingMatrices && Array.isArray(product.pricingMatrices) && product.pricingMatrices.length > 0) {
                  const rulesForQty = product.pricingMatrices.filter(
                    (m: any) => presetQty >= m.minQty && (m.maxQty === null || m.maxQty === undefined || presetQty <= m.maxQty),
                  );

                  if (rulesForQty.length > 0) {
                    let bestRule: any = null;
                    let maxMatchCount = -1;

                    for (const r of rulesForQty) {
                      const combo = (r.attributeCombination as any) || {};
                      const comboEntries = Object.entries(combo).filter(
                        ([k]) => k !== 'discountPercent' && k !== 'label' && k !== 'offerName',
                      );

                      if (comboEntries.length === 0) {
                        if (maxMatchCount < 0) {
                          bestRule = r;
                          maxMatchCount = 0;
                        }
                      } else {
                        const allMatch = comboEntries.every(([k, v]) => String(fieldValues[k]) === String(v));
                        if (allMatch && comboEntries.length > maxMatchCount) {
                          bestRule = r;
                          maxMatchCount = comboEntries.length;
                        }
                      }
                    }

                    const matchedRule = bestRule || rulesForQty[0];
                    const unitP = Number(matchedRule.unitPrice) || Number(product.basePrice || 1);
                    return Math.round(unitP * presetQty * 100) / 100;
                  }
                }
                return Number(product.basePrice || 1) * presetQty;
              };

              return (
                <div className="space-y-4">
                  {/* Custom Quantity Stepper - Only shown as fallback if NO backend quantities are set */}
                  {!hasBackendQuantities && (
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
                  )}

                  {/* Standard Presets Grid */}
                  <div className={`grid gap-2.5 ${standardPresets.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'}`}>
                    {standardPresets.map((preset) => {
                      const isSelected = quantity === preset;
                      const estimatedBatchPrice = getPresetBatchPrice(preset);

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
                            {isSelected && quote?.subtotal !== undefined
                              ? formatCurrency(quote.subtotal)
                              : formatCurrency(estimatedBatchPrice)}
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

              {/* Artwork Slots Status */}
              {Object.keys(activeSlotFiles).length > 0 ? (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between col-span-1 sm:col-span-2">
                  <div className="min-w-0 pr-2 space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      Artwork Uploads ({Object.keys(activeSlotFiles).length} Files Attached)
                    </span>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {Object.entries(activeSlotFiles).map(([slotKey, file]) => (
                        <div key={slotKey} className="flex items-center gap-1.5 bg-white border border-purple-200 px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                          <span className="font-mono text-[9px] font-black uppercase text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            {slotKey.replace(/_/g, ' ')}
                          </span>
                          <span className="font-bold text-slate-900 truncate max-w-[180px]">{file.originalFileName}</span>
                          <span className="text-[10px] font-mono text-slate-400">({(file.fileSize / (1024 * 1024)).toFixed(1)}MB)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep('SPECIFICATIONS')}
                    className="text-slate-400 hover:text-slate-900 p-1 rounded-md hover:bg-white transition-colors flex-shrink-0 cursor-pointer"
                    title="Edit Artwork Files"
                  >
                    <RiEditLine className="h-4 w-4" />
                  </button>
                </div>
              ) : activeSlotConfigs.length > 0 ? (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between col-span-1 sm:col-span-2">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      Artwork Files
                    </span>
                    <span className="font-bold text-slate-700 truncate block text-xs">
                      {artworkReq === 'OPTIONAL' ? 'None uploaded (Continue without artwork)' : 'Upload pending'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep('SPECIFICATIONS')}
                    className="text-slate-400 hover:text-slate-900 p-1 rounded-md hover:bg-white transition-colors flex-shrink-0 cursor-pointer"
                    title="Upload Artwork"
                  >
                    <RiEditLine className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {/* Design Service Status */}
              {effectiveHasDesignService && (
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-start justify-between col-span-1 sm:col-span-2">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-mono font-bold text-amber-800 block uppercase">
                      Design Studio Assistance
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-black text-slate-950 text-xs sm:text-sm">
                        In-House Studio Layout & Design Included
                      </span>
                      {designPriceNum > 0 && (
                        <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          +{formatCurrency(designPriceNum)}
                        </span>
                      )}
                    </div>
                    {designNotes && (
                      <p className="text-[11px] text-slate-600 mt-1 italic">
                        &quot;{designNotes}&quot;
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep('SPECIFICATIONS')}
                    className="text-amber-800 hover:text-amber-950 p-1 rounded-md hover:bg-amber-100/60 transition-colors flex-shrink-0 cursor-pointer"
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

              {/* Delivery Pincode & Shipping / GST Rate Checker */}
              {deliveryMethod === 'COURIER' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <RiMapPin2Line className="h-4 w-4 text-amber-500" />
                      <span>Delivery Pincode & Shipping Rate</span>
                    </div>
                    {quote?.matchedZone && (
                      <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        Zone: {quote.matchedZone.zoneName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        maxLength={6}
                        value={shippingPincode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setShippingPincode(val);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('pb2_user_pincode', val);
                            window.dispatchEvent(new CustomEvent('pincode-updated', { detail: val }));
                          }
                        }}
                        placeholder="Enter 6-digit Pincode (e.g. 560001, 400021)"
                        className="w-full h-9 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-slate-900"
                      />
                      {shippingPincode && (
                        <button
                          type="button"
                          onClick={() => {
                            setShippingPincode('');
                            if (typeof window !== 'undefined') {
                              localStorage.removeItem('pb2_user_pincode');
                              window.dispatchEvent(new CustomEvent('pincode-updated', { detail: '' }));
                            }
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <RiCloseLine className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-black text-slate-900 block">
                        {computedShipping === 0 ? (
                          <span className="text-emerald-700 font-bold">FREE Delivery</span>
                        ) : (
                          formatCurrency(computedShipping)
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {quote?.gstRatePercent ? `+${quote.gstRatePercent}% GST` : 'Tax included'}
                      </span>
                    </div>
                  </div>

                  {shippingPincode.length >= 3 ? (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span>
                        {quote?.matchedZone
                          ? `Regional courier rule applied for pincode prefix ${quote.matchedZone.pincodePrefix}`
                          : 'Standard courier fallback rate applied'}
                      </span>
                      {quote?.isFreeShippingApplied ? (
                        <span className="text-emerald-700 font-bold">Free Shipping Threshold Met!</span>
                      ) : quote?.freeShippingThreshold ? (
                        <span className="text-slate-500 font-mono text-[10px]">
                          Free delivery over {formatCurrency(quote.freeShippingThreshold)}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Enter your 6-digit delivery pincode to check regional shipping rates and delivery SLA.
                    </p>
                  )}
                </div>
              )}
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
