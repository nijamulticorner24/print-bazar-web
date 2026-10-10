'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RiTimeLine,
  RiLoader4Line,
  RiAlertLine,
  RiPrinterLine,
  RiCheckDoubleLine,
  RiShieldCheckLine,
  RiArrowLeftLine,
  RiSparklingFill,
  RiTruckLine,
  RiMovieLine,
  RiPlayCircleLine,
} from 'react-icons/ri';
import { getEstimatedDeliveryText, isVideoMedia } from '@/lib/utils';
import { api, DynamicProduct, resolveImageUrl } from '@/lib/api';
import {
  ProductConfigurationFlow,
  ProductConfigurationResult,
} from '@/components/configurator/ProductConfigurationFlow';
import { useAuth } from '@/lib/auth-context';
import { CustomerAuthModal } from '@/components/auth/CustomerAuthModal';
import { Button, Badge, Skeleton } from '@/components/ui';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug as string;

  const [product, setProduct] = useState<DynamicProduct | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingCheckoutResult, setPendingCheckoutResult] = useState<ProductConfigurationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch Product Schema from API
  useEffect(() => {
    async function loadProduct() {
      setIsLoadingProduct(true);
      setErrorMsg(null);
      try {
        const prod = await api.getProductBySlug(slug);
        setProduct(prod);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Product not found or currently unavailable');
      } finally {
        setIsLoadingProduct(false);
      }
    }
    if (slug) {
      loadProduct();
    }
  }, [slug]);

  // Handle Add to Cart
  const handleAddToCart = (result: ProductConfigurationResult) => {
    const subtotal = result.quote?.subtotal || (Number(result.product.basePrice) * result.quantity);
    const tax = result.quote?.totalTax || Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = result.grandTotal || (subtotal + tax);
    const isSplit = result.paymentMode === 'SPLIT_50';
    const advanceAmount = isSplit ? (result.advanceAmount || Math.round(grandTotal * 0.5 * 100) / 100) : grandTotal;
    const balanceAmount = isSplit ? (result.balanceAmount || Math.round((grandTotal - advanceAmount) * 100) / 100) : 0;

    const cartItem = {
      productId: result.product.id,
      productName: result.product.name,
      sku: result.product.sku,
      quantity: result.quantity,
      fieldValues: result.fieldValues,
      artworkFile: result.artworkFile,
      referenceImage: result.referenceImage,
      selectedDesignService: result.hasDesignService,
      designNotes: result.designNotes,
      unitPrice: result.quote?.unitPrice || Number(result.product.basePrice),
      totalPrice: subtotal,
      subtotal,
      taxAmount: tax,
      grandTotal,
      paymentMode: result.paymentMode || 'FULL',
      advanceAmount,
      balanceAmount,
      specificationsSnapshot: result.quote?.specificationsSnapshot || result.fieldValues,
      selectedOptionsSummary: result.quote?.selectedOptionsSummary || [],
      quote: result.quote,
    };

    let currentCart: any[] = [];
    try {
      const raw = localStorage.getItem('pb2_cart');
      if (raw) currentCart = JSON.parse(raw);
      if (!Array.isArray(currentCart)) currentCart = [];
    } catch {}

    currentCart.push(cartItem);
    localStorage.setItem('pb2_cart', JSON.stringify(currentCart));
    sessionStorage.setItem('pb2_active_cart', JSON.stringify(cartItem));
    window.dispatchEvent(new Event('cart-updated'));

    router.push('/cart');
  };

  // Handle Direct Buy Now / Checkout
  const handleBuyNow = (result: ProductConfigurationResult) => {
    const subtotal = result.quote?.subtotal || (Number(result.product.basePrice) * result.quantity);
    const tax = result.quote?.totalTax || Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = result.grandTotal || (subtotal + tax);
    const isSplit = result.paymentMode === 'SPLIT_50';
    const advanceAmount = isSplit ? (result.advanceAmount || Math.round(grandTotal * 0.5 * 100) / 100) : grandTotal;
    const balanceAmount = isSplit ? (result.balanceAmount || Math.round((grandTotal - advanceAmount) * 100) / 100) : 0;

    const configData = {
      productId: result.product.id,
      productName: result.product.name,
      sku: result.product.sku,
      quantity: result.quantity,
      fieldValues: result.fieldValues,
      artworkFile: result.artworkFile,
      referenceImage: result.referenceImage,
      selectedDesignService: result.hasDesignService,
      designNotes: result.designNotes,
      unitPrice: result.quote?.unitPrice || Number(result.product.basePrice),
      totalPrice: subtotal,
      subtotal,
      taxAmount: tax,
      grandTotal,
      paymentMode: result.paymentMode || 'FULL',
      advanceAmount,
      balanceAmount,
      specificationsSnapshot: result.quote?.specificationsSnapshot || result.fieldValues,
      selectedOptionsSummary: result.quote?.selectedOptionsSummary || [],
      quote: result.quote,
    };

    sessionStorage.setItem('pb2_active_cart', JSON.stringify(configData));

    if (user && user.role === 'CUSTOMER') {
      router.push('/checkout');
    } else {
      setPendingCheckoutResult(result);
      setIsAuthModalOpen(true);
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
        <RiLoader4Line className="h-10 w-10 text-[#E3A008] animate-spin mb-4" />
        <span className="text-xs font-mono text-slate-500 uppercase font-bold tracking-wider">
          Loading Manufacturing Engine & Spec Matrices...
        </span>
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="mx-auto max-w-xl my-16 bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-card">
        <RiAlertLine className="h-12 w-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-black text-slate-900 font-display">Product Unavailable</h2>
        <p className="text-xs text-slate-600 mt-2">{errorMsg || 'The requested product could not be found.'}</p>
        <Link href="/products" className="inline-block mt-6">
          <Button variant="primary" size="md">
            <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
            <span>Return to Catalogue</span>
          </Button>
        </Link>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [];
  const currentImage = images[activeImageIndex] || {
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80',
    altText: product.name,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Dynamic Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6 uppercase tracking-wider">
          <Link href="/products" className="hover:text-slate-900 transition-colors">
            Catalogue
          </Link>
          <span>/</span>
          <span className="text-slate-500">{product.category?.name || 'Category'}</span>
          <span>/</span>
          <span className="text-slate-900 font-bold">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Multi-Image Media Gallery & Production Blueprint (Sticky on Desktop) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card">
              {/* Category Tag & Production Turnaround */}
              <div className="flex items-center justify-between mb-4">
                <span className="bg-[#FFED00] text-slate-950 text-[10px] font-mono font-black px-2.5 py-1 rounded border border-[#E3A008]/40 shadow-xs">
                  {product.category?.name?.toUpperCase() || 'CUSTOM MANUFACTURING'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  <RiTimeLine className="h-4 w-4 text-[#E3A008]" />
                  <span>{product.productionDays || 2} DAYS SLA</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                {product.name}
              </h1>

              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {product.description ||
                  'High-precision commercial print manufacturing calibrated on Heidelberg offset and HP Indigo digital work centers.'}
              </p>

              {/* Expected Delivery & Dispatch Banner */}
              {(() => {
                const delivery = getEstimatedDeliveryText(product.productionDays || 2);
                return (
                  <div className="mt-4 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-200/80 rounded-xl space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                        <RiTruckLine className="h-4 w-4 text-emerald-600" />
                        <span>Expected Delivery:</span>
                        <span className="font-mono font-black text-emerald-800 underline decoration-emerald-400 underline-offset-2">
                          {delivery.deliveryRange}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                        FREE SHIPPING
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5 border-t border-emerald-200/50">
                      <span>⚡ Production Turnaround: <strong>{product.productionDays || 2} working days</strong></span>
                      <span className="text-slate-500 font-mono">Dispatches by {delivery.dispatchDate}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Media Gallery Display (Photos & Video Demos) */}
              <div className="mt-6 space-y-3">
                <div className="relative h-64 sm:h-80 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-2">
                  {isVideoMedia(currentImage.url) ? (
                    <video
                      src={resolveImageUrl(currentImage.url)}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="max-h-full max-w-full rounded-lg object-contain"
                    />
                  ) : (
                    <img
                      src={resolveImageUrl(currentImage.url)}
                      alt={currentImage.altText || product.name}
                      className="max-h-full max-w-full object-contain transition-all duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                  )}

                  {/* Video Badge */}
                  {isVideoMedia(currentImage.url) && (
                    <span className="absolute top-3 right-3 bg-indigo-900/90 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-indigo-500/40 shadow-sm flex items-center gap-1.5 pointer-events-none">
                      <RiMovieLine className="h-3.5 w-3.5 text-[#FFED00]" />
                      <span>DEMO VIDEO</span>
                    </span>
                  )}

                  {currentImage.caption && (
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                      {currentImage.caption}
                    </div>
                  )}
                </div>

                {/* Thumbnails Row */}
                {images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {images.map((img, idx) => {
                      const isVid = isVideoMedia(img.url);
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative h-14 w-18 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all bg-slate-900 ${
                            activeImageIndex === idx
                              ? 'border-slate-900 ring-2 ring-[#FFED00]'
                              : 'border-slate-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {isVid ? (
                            <div className="relative h-full w-full bg-slate-950 flex items-center justify-center">
                              <video src={resolveImageUrl(img.url)} className="h-full w-full object-cover opacity-60 pointer-events-none" />
                              <RiPlayCircleLine className="h-5 w-5 text-white absolute inset-auto z-10 drop-shadow-md" />
                            </div>
                          ) : (
                            <img src={resolveImageUrl(img.url)} alt={img.altText || ''} className="h-full w-full object-cover" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Manufacturing Specification Blueprint */}
              <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200/90 p-4">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-b border-slate-200 pb-2 mb-3">
                  <span className="font-bold uppercase tracking-wider">PLANT TECHNICAL CALIBRATION</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ISO 12647-2 READY
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">SKU</span>
                    <span className="font-bold text-slate-900 truncate block">{product.sku}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">MIN RUN</span>
                    <span className="font-bold text-slate-900">{product.minQuantity} units</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">COLOR MODEL</span>
                    <span className="font-bold text-slate-900">CMYK 2400 DPI</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">BLEED TOLERANCE</span>
                    <span className="font-bold text-slate-900">3.0 mm Trim</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Generic Customer Product Flow Engine */}
          <div className="lg:col-span-7">
            <ProductConfigurationFlow
              product={product}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
            />
          </div>
        </div>

        {/* Customer Checkout Authentication Gate Modal */}
        <CustomerAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            router.push('/checkout');
          }}
        />
      </div>
    </div>
  );
}
