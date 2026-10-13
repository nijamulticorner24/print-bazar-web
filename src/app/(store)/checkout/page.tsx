'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  Building,
  Truck,
  Store,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Printer,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import {
  RiLoader4Line,
  RiLock2Line,
  RiShieldCheckLine,
  RiAlertLine,
  RiUser3Line,
  RiShoppingBag3Line,
} from 'react-icons/ri';
import { formatCurrency, getEstimatedDeliveryText } from '@/lib/utils';
import { api, ShippingTaxCalculationResult } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CustomerAuthModal } from '@/components/auth/CustomerAuthModal';
import { Button, Input, Badge } from '@/components/ui';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [cart, setCart] = useState<{
    productId?: string;
    productName: string;
    sku: string;
    quantity: number;
    paymentMode?: 'FULL' | 'SPLIT_50';
    advanceAmount?: number;
    balanceAmount?: number;
    fieldValues?: Record<string, any>;
    specificationsSnapshot?: Record<string, any>;
    selectedOptionsSummary?: Array<{
      fieldLabel?: string;
      optionLabel?: string;
      value?: string;
      optionName?: string;
      valueName?: string;
      priceModifier?: number;
    }>;
    quote?: {
      subtotal?: number;
      totalTax?: number;
      estimatedShipping?: number;
      grandTotal?: number;
      unitPrice?: number;
    };
    artworkFile?: any;
    artworkFiles?: any;
    referenceImage?: any;
    selectedDesignService?: boolean;
    designNotes?: string;
    customerNotes?: string;
    totalPrice?: number;
  } | null>(null);

  const [paymentMode, setPaymentMode] = useState<'FULL' | 'SPLIT_50'>('FULL');

  const [customerDetails, setCustomerDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    gstin: '',
  });

  const [deliveryMethod, setDeliveryMethod] = useState<'COURIER' | 'STORE_PICKUP'>('COURIER');

  const [shippingAddress, setShippingAddress] = useState({
    contactName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Authoritative Server Shipping & Tax Quote State
  const [shippingTaxQuote, setShippingTaxQuote] = useState<ShippingTaxCalculationResult | null>(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false);

  // Load cart from sessionStorage or fallback to localStorage
  useEffect(() => {
    let parsed: any = null;
    const rawActive = sessionStorage.getItem('pb2_active_cart');
    if (rawActive) {
      try {
        parsed = JSON.parse(rawActive);
      } catch (e) {
        console.error('Error parsing pb2_active_cart:', e);
      }
    }

    if (!parsed) {
      const rawStored = localStorage.getItem('pb2_cart');
      if (rawStored) {
        try {
          const storedList = JSON.parse(rawStored);
          if (Array.isArray(storedList) && storedList.length > 0) {
            parsed = storedList[0];
          }
        } catch (e) {
          console.error('Error parsing pb2_cart:', e);
        }
      }
    }

    if (parsed) {
      setCart(parsed);
      if (parsed.paymentMode === 'SPLIT_50') {
        setPaymentMode('SPLIT_50');
      }
      const initialPincode = parsed.shippingPincode || (typeof window !== 'undefined' ? localStorage.getItem('pb2_user_pincode') : '') || '';
      if (initialPincode) {
        setShippingAddress((prev) => ({ ...prev, postalCode: prev.postalCode || initialPincode }));
      }
    }
  }, []);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setCustomerDetails((prev) => ({
        ...prev,
        fullName: user.fullName || prev.fullName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));
      setShippingAddress((prev) => ({
        ...prev,
        contactName: user.fullName || prev.contactName,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  const subtotal = Number(cart?.quote?.subtotal || cart?.totalPrice || 1475);

  // Recalculate shipping & GST authoritatively on delivery pincode or delivery method change
  useEffect(() => {
    let isCancelled = false;
    const fetchQuote = async () => {
      setIsCalculatingQuote(true);
      try {
        const res = await api.calculateShippingAndTax({
          subtotal,
          postalCode: shippingAddress.postalCode,
          deliveryMethod,
          items: cart
            ? [
                {
                  productId: cart.productId,
                  productName: cart.productName,
                  quantity: cart.quantity || 500,
                  unitPrice: cart.quote?.unitPrice || subtotal / (cart.quantity || 500),
                  totalPrice: subtotal,
                },
              ]
            : undefined,
          totalQuantity: cart?.quantity || 500,
        });
        if (!isCancelled && res) {
          setShippingTaxQuote(res);
        }
      } catch (err) {
        console.warn('Failed to calculate shipping/tax quote from server:', err);
      } finally {
        if (!isCancelled) setIsCalculatingQuote(false);
      }
    };

    fetchQuote();

    return () => {
      isCancelled = true;
    };
  }, [subtotal, shippingAddress.postalCode, deliveryMethod]);

  const gstRatePercent = shippingTaxQuote?.gstRatePercent ?? 18;
  const tax = shippingTaxQuote?.gstAmount ?? Math.round(subtotal * (gstRatePercent / 100) * 100) / 100;
  const shipping = deliveryMethod === 'STORE_PICKUP'
    ? 0
    : (shippingTaxQuote?.shippingFee ?? (Number(cart?.quote?.estimatedShipping) || 150));
  const isFreeShippingApplied = Boolean(shippingTaxQuote?.isFreeShippingApplied);
  const freeShippingThreshold = shippingTaxQuote?.freeShippingThreshold ?? 2000;
  const isFreeShippingEnabled = shippingTaxQuote?.isFreeShippingEnabled ?? true;
  const matchedZoneName = shippingTaxQuote?.matchedZone?.zoneName;
  const grandTotal = Math.round((subtotal + tax + shipping) * 100) / 100;

  const isSplit = paymentMode === 'SPLIT_50';
  const advanceAmount = isSplit ? Math.round(grandTotal * 0.5 * 100) / 100 : grandTotal;
  const balanceAmount = isSplit ? Math.round((grandTotal - advanceAmount) * 100) / 100 : 0;
  const amountToCharge = isSplit ? advanceAmount : grandTotal;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerDetails.fullName || !customerDetails.email || !customerDetails.phone) {
      setErrorMessage('Please fill in all required customer contact details.');
      return;
    }

    if (deliveryMethod === 'COURIER') {
      if (!shippingAddress.street?.trim()) {
        setErrorMessage('Please enter your Street Address / Building / Plot / Floor.');
        return;
      }
      if (!shippingAddress.city?.trim() || !shippingAddress.state?.trim() || !shippingAddress.postalCode?.trim()) {
        setErrorMessage('Please complete your City, State, and Postal Code (PIN).');
        return;
      }
    }

    setIsProcessing(true);

    try {
      // 1. Create Master Order Record via Authoritative API
      const orderPayload = {
        customerId: user?.customerId || undefined,
        customerDetails: {
          fullName: customerDetails.fullName,
          email: customerDetails.email,
          phone: customerDetails.phone,
          companyName: customerDetails.companyName || undefined,
          gstin: customerDetails.gstin || undefined,
        },
        deliveryMethod,
        shippingAddress:
          deliveryMethod === 'COURIER'
            ? {
                contactName: shippingAddress.contactName || customerDetails.fullName,
                phone: shippingAddress.phone || customerDetails.phone,
                street: shippingAddress.street,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postalCode: shippingAddress.postalCode,
                country: 'India',
              }
            : null,
        items: [
          {
            productId: cart?.productId,
            productName: cart?.productName || 'Premium Commercial Print Job',
            sku: cart?.sku || 'PB-COMM-01',
            quantity: cart?.quantity || 500,
            unitPrice: cart?.quote?.unitPrice || subtotal / (cart?.quantity || 500),
            totalPrice: subtotal,
            specifications: cart?.specificationsSnapshot || cart?.fieldValues || {},
            artworkFile: cart?.artworkFile || null,
            artworkFiles: cart?.artworkFiles || null,
            referenceImage: cart?.referenceImage || null,
            artworkUrl: cart?.artworkFile?.fileUrl || null,
            artworkStorageKey: cart?.artworkFile?.storageKey || null,
            referenceImageUrl: cart?.referenceImage?.fileUrl || null,
            hasDesignService: Boolean(cart?.selectedDesignService),
            designNotes: cart?.designNotes || null,
          },
        ],
        subtotal,
        taxAmount: tax,
        shippingAmount: shipping,
        totalAmount: grandTotal,
        paymentMode,
        paidAmount: amountToCharge,
        advanceAmount,
        balanceAmount,
        customerNotes: cart?.designNotes || cart?.customerNotes || null,
        paymentMethod: 'ONLINE_PREPAID',
      };

      const res: any = await api.createOrder(orderPayload);

      // Clear Cart
      localStorage.removeItem('pb2_cart');
      sessionStorage.removeItem('pb2_active_cart');
      window.dispatchEvent(new Event('cart-updated'));

      // Redirect to Confirmation
      const finalOrderNumber = res?.orderNumber || res?.data?.orderNumber || 'PB-2026-0001';
      router.push(
        `/checkout/confirmation?orderNumber=${finalOrderNumber}&paymentMode=${paymentMode}&paid=${amountToCharge}&balance=${balanceAmount}`
      );
    } catch (err: any) {
      console.error('Order placement failed:', err);
      setErrorMessage(err?.message || 'Failed to place order. Please check your details and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28 md:pb-24 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] py-5 sm:py-7 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#854D0E] bg-[#FEFCE8] px-2.5 py-0.5 rounded-[6px] border border-yellow-200 uppercase tracking-wider mb-1.5">
              <Lock className="h-3.5 w-3.5 text-[#854D0E]" />
              <span>SECURE 256-BIT ENCRYPTED CHECKOUT</span>
            </div>
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-black tracking-tight font-sans">
              Commercial Order Checkout
            </h1>
          </div>

          <Link href="/cart" className="self-start sm:self-auto">
            <Button variant="outline" size="sm" className="min-h-[40px]">
              <ShoppingBag className="h-3.5 w-3.5 mr-1" />
              <span>Return to Cart</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Checkout Stages */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Customer Identification */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#FFED00] border border-[#E3A008]" />
                  1. Customer & Billing Entity
                </h2>
                {!user && (
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-xs font-bold text-amber-900 hover:underline"
                  >
                    Already have an account? Sign In ➔
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name / Authorized Contact"
                  required
                  value={customerDetails.fullName}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, fullName: e.target.value })}
                  placeholder="e.g. Vikram Sharma"
                />
                <Input
                  label="Business Email"
                  type="email"
                  required
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                  placeholder="name@company.com"
                />
                <Input
                  label="Mobile Phone (SMS Tracking)"
                  type="tel"
                  required
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
                <Input
                  label="Company Name (Optional)"
                  value={customerDetails.companyName}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, companyName: e.target.value })}
                  placeholder="e.g. Acme Tech India Pvt Ltd"
                />
                <div className="sm:col-span-2">
                  <Input
                    label="GSTIN Number (For 18% Input Tax Credit)"
                    value={customerDetails.gstin}
                    onChange={(e) => setCustomerDetails({ ...customerDetails, gstin: e.target.value.toUpperCase() })}
                    placeholder="27AAACA1234A1Z5 (Optional)"
                    hint="GST invoice will be generated upon order dispatch"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Fulfillment & Delivery Method */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#FFED00] border border-[#E3A008]" />
                  2. Delivery & Fulfillment Option
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('COURIER')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    deliveryMethod === 'COURIER'
                      ? 'border-slate-900 bg-amber-50/40 ring-1 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-900 text-[#FFED00] flex-shrink-0 mt-0.5">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Doorstep Courier Delivery</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Pan-India express logistics with door-to-door tracking.
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        {isFreeShippingApplied || shipping === 0 ? 'FREE SHIPPING' : formatCurrency(shipping)}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        ARRIVAL: {getEstimatedDeliveryText((cart as any)?.productionDays || 2).deliveryRange}
                      </span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMethod('STORE_PICKUP')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    deliveryMethod === 'STORE_PICKUP'
                      ? 'border-slate-900 bg-amber-50/40 ring-1 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700 flex-shrink-0 mt-0.5">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Factory Plant Pickup</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Collect directly from Lower Parel, Mumbai press facility.
                    </div>
                    <span className="inline-block mt-2 font-mono text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                      SAME-DAY READY
                    </span>
                  </div>
                </button>
              </div>

              {/* Delivery Address Form */}
              {deliveryMethod === 'COURIER' ? (
                <div className="pt-2 space-y-3">
                  <Input
                    label="Street Address / Building / Plot / Floor"
                    required
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                    placeholder="Plot 42, Industrial Area, Main Road"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="City"
                      required
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      placeholder="e.g. Mumbai, Bengaluru"
                    />
                    <Input
                      label="State"
                      required
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      placeholder="e.g. Maharashtra"
                    />
                    <Input
                      label="Postal Code (PIN)"
                      required
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      placeholder="e.g. 400013"
                      hint={
                        matchedZoneName
                          ? `Matched: ${matchedZoneName} (${shipping === 0 ? 'FREE' : formatCurrency(shipping)})`
                          : undefined
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <p className="font-bold text-slate-900">Press Plant Collection Address:</p>
                  <p className="text-slate-600">
                    PRINT BAZZAR Press Operations, Plot 42-C, Lower Parel Industrial Estate, Mumbai 400013
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">Operating Hours: Mon-Sat 08:00 AM - 09:00 PM</p>
                </div>
              )}
            </div>

            {/* Step 3: Payment Method & Terms */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-card space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#FFED00] border border-[#E3A008]" />
                  3. Payment Terms & Gateway Settlement
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>256-Bit SSL</span>
                </div>
              </div>

              {/* Payment Mode Selection Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('FULL')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    paymentMode === 'FULL'
                      ? 'border-slate-900 bg-amber-50/40 ring-1 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-900 text-[#FFED00] flex-shrink-0 mt-0.5">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">100% Full Settlement</span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        1-CLICK
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Pay <strong>{formatCurrency(grandTotal)}</strong> now. Single seamless checkout transaction.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('SPLIT_50')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    paymentMode === 'SPLIT_50'
                      ? 'border-slate-900 bg-amber-50/40 ring-1 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-[#FFED00] text-slate-950 flex-shrink-0 mt-0.5 border border-[#E3A008]/40">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">50% Split Milestone</span>
                      <span className="text-[10px] font-mono font-black bg-[#FFED00] text-slate-950 px-1.5 py-0.5 rounded border border-[#E3A008]/40">
                        ADVANCE
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Pay <strong>{formatCurrency(advanceAmount)}</strong> (50%) today to initiate prepress. Balance <strong>{formatCurrency(balanceAmount)}</strong> on dispatch.
                    </div>
                  </div>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-xs">
                    <CreditCard className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      UPI, NetBanking, Cards & Corporate Credit
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Instant reconciliation with automated Job Card generation.
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  VERIFIED
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Order Snapshot & Confirmation Button */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-elevated space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display border-b border-slate-100 pb-3">
                Order Review
              </h3>

              {/* Item Snapshot */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{cart?.productName || 'Custom Print Order'}</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Quantity: {cart?.quantity || 500} units • {cart?.sku || 'COMM-01'}
                </div>
              </div>

              {/* Price Calculation */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST ({gstRatePercent}%)</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(tax)}</span>
                </div>
                {/* Delivery Charges - Prominently Displayed Separately */}
                <div className="flex justify-between text-slate-600 items-start p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                  <div className="pr-2">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-slate-700" />
                      <span className="font-bold text-slate-900 text-xs">Courier & Delivery Charges</span>
                    </div>
                    {deliveryMethod === 'COURIER' && (
                      <div className="space-y-0.5 mt-1">
                        {matchedZoneName && (
                          <span className="text-[10px] text-indigo-700 font-semibold block">
                            Region / Zone: {matchedZoneName}
                          </span>
                        )}
                        {shippingTaxQuote?.calculationBasis && (
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {shippingTaxQuote.calculationBasis}
                          </span>
                        )}
                        {shippingTaxQuote?.totalWeightKg ? (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Shipment Weight: {shippingTaxQuote.totalWeightKg} kg
                          </span>
                        ) : null}
                      </div>
                    )}
                    {deliveryMethod === 'STORE_PICKUP' && (
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Direct Plant Pickup (₹0.00)
                      </span>
                    )}
                  </div>
                  <span className={`font-mono font-bold text-sm shrink-0 ${shipping === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {shipping === 0 ? 'FREE (₹0)' : formatCurrency(shipping)}
                  </span>
                </div>

                {/* Free Shipping Alert or Progress Hint */}
                {deliveryMethod === 'COURIER' && isFreeShippingApplied && (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 font-medium">
                    ✓ Free delivery threshold unlocked on this order!
                  </div>
                )}
                {deliveryMethod === 'COURIER' && isFreeShippingEnabled && freeShippingThreshold > 0 && subtotal < freeShippingThreshold && (
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                    Add <strong>{formatCurrency(freeShippingThreshold - subtotal)}</strong> more for free delivery!
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-bold text-slate-600 block">Total Order Value</span>
                    <span className="text-[10px] text-slate-400 font-mono">Inclusive of GST</span>
                  </div>
                  <span className="text-lg font-black text-slate-900 font-display">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                {/* Milestone Split Block */}
                {isSplit ? (
                  <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-amber-950 font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#E3A008]" />
                        50% Advance Due Today:
                      </span>
                      <span className="font-mono font-black text-base text-slate-950">
                        {formatCurrency(advanceAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-amber-200/60">
                      <span>50% Balance on Dispatch:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatCurrency(balanceAmount)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Payment Term:</span>
                    <span className="font-bold text-slate-900">100% Full Settlement</span>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <RiAlertLine className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit CTA */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full shadow-brand"
                disabled={isProcessing}
                isLoading={isProcessing}
              >
                <span>
                  {isSplit
                    ? `Pay ${formatCurrency(advanceAmount)} (50% Advance) & Authorize`
                    : `Pay ${formatCurrency(grandTotal)} & Authorize Order`}
                </span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>

              <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500 text-center font-medium">
                <p>Upon payment authorization, an automated Job Card will route to our shop-floor work centers.</p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
