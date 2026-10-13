'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Percent,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  MapPin,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  RiTruckLine,
  RiPercentLine,
  RiMoneyDollarCircleLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiShieldCheckLine,
  RiAlertLine,
  RiCheckLine,
  RiCloseLine,
  RiSearch2Line,
} from 'react-icons/ri';
import {
  api,
  ShippingGstSettings,
  ShippingZone,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button, Input, Modal, Badge } from '@/components/ui';

export default function AdminShippingGstPage() {
  // Loading & Global Status
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Core Settings Form State
  const [baseShippingFee, setBaseShippingFee] = useState<number | ''>(150);
  const [gstRate, setGstRate] = useState<number | ''>(18);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | ''>(2000);
  const [isFreeShippingEnabled, setIsFreeShippingEnabled] = useState(true);

  // Regional Pincode Zones State
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [modalZoneName, setModalZoneName] = useState('');
  const [modalPincodePrefix, setModalPincodePrefix] = useState('');
  const [modalShippingCharge, setModalShippingCharge] = useState<number | ''>('');
  const [modalIsActive, setModalIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSavingZone, setIsSavingZone] = useState(false);

  // Delete Confirmation State
  const [zoneToDelete, setZoneToDelete] = useState<ShippingZone | null>(null);
  const [isDeletingZone, setIsDeletingZone] = useState(false);

  // Load Data
  const loadAllData = async () => {
    setIsLoading(true);
    setSettingsError(null);
    try {
      const [settingsRes, zonesRes] = await Promise.all([
        api.getShippingGstSettings(),
        api.listShippingZones(),
      ]);

      if (settingsRes) {
        setBaseShippingFee(settingsRes.baseShippingFee);
        setGstRate(settingsRes.gstRate);
        setFreeShippingThreshold(settingsRes.freeShippingThreshold);
        setIsFreeShippingEnabled(settingsRes.isFreeShippingEnabled);
      }

      setZones(zonesRes || []);
    } catch (err: any) {
      console.error('Failed to load Shipping & GST data:', err);
      setSettingsError(err?.message || 'Failed to load settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Save Core Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);

    const baseFeeNum = Number(baseShippingFee);
    const gstRateNum = Number(gstRate);
    const thresholdNum = Number(freeShippingThreshold);

    if (isNaN(baseFeeNum) || baseFeeNum < 0) {
      setSettingsError('Default Base Shipping Fee must be a valid non-negative number.');
      return;
    }

    if (isNaN(gstRateNum) || gstRateNum < 0 || gstRateNum > 100) {
      setSettingsError('GST Tax Rate must be between 0% and 100%.');
      return;
    }

    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setSettingsError('Free Shipping Threshold must be a non-negative amount.');
      return;
    }

    setIsSavingSettings(true);
    try {
      const updated = await api.updateShippingGstSettings({
        baseShippingFee: baseFeeNum,
        gstRate: gstRateNum,
        freeShippingThreshold: thresholdNum,
        isFreeShippingEnabled,
      });

      setBaseShippingFee(updated.baseShippingFee);
      setGstRate(updated.gstRate);
      setFreeShippingThreshold(updated.freeShippingThreshold);
      setIsFreeShippingEnabled(updated.isFreeShippingEnabled);

      setSettingsSuccess('Shipping and GST settings successfully saved & applied to checkout pricing engine.');
      setTimeout(() => setSettingsSuccess(null), 4000);
    } catch (err: any) {
      setSettingsError(err?.message || 'Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Open Add Zone Modal
  const handleOpenAddZone = () => {
    setEditingZoneId(null);
    setModalZoneName('');
    setModalPincodePrefix('');
    setModalShippingCharge('');
    setModalIsActive(true);
    setModalError(null);
    setIsZoneModalOpen(true);
  };

  // Open Edit Zone Modal
  const handleOpenEditZone = (zone: ShippingZone) => {
    setEditingZoneId(zone.id);
    setModalZoneName(zone.zoneName);
    setModalPincodePrefix(zone.pincodePrefix);
    setModalShippingCharge(zone.shippingCharge);
    setModalIsActive(zone.isActive);
    setModalError(null);
    setIsZoneModalOpen(true);
  };

  // Save Zone (Create or Update)
  const handleSaveZoneModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalZoneName.trim()) {
      setModalError('Region/Zone name is required.');
      return;
    }

    const cleanPrefix = modalPincodePrefix.trim();
    if (!cleanPrefix || !/^[0-9]{1,6}$/.test(cleanPrefix)) {
      setModalError('Pincode or prefix must be 1 to 6 numeric digits (e.g. 56 or 560001).');
      return;
    }

    const chargeNum = Number(modalShippingCharge);
    if (isNaN(chargeNum) || chargeNum < 0) {
      setModalError('Shipping charge must be a non-negative amount.');
      return;
    }

    // Check client-side duplicate prefix
    const duplicate = zones.find(
      (z) => z.pincodePrefix === cleanPrefix && z.id !== editingZoneId,
    );
    if (duplicate) {
      setModalError(`A zone for pincode prefix '${cleanPrefix}' already exists (${duplicate.zoneName}).`);
      return;
    }

    setIsSavingZone(true);
    try {
      if (editingZoneId) {
        const updated = await api.updateShippingZone(editingZoneId, {
          zoneName: modalZoneName.trim(),
          pincodePrefix: cleanPrefix,
          shippingCharge: chargeNum,
          isActive: modalIsActive,
        });
        setZones((prev) => prev.map((z) => (z.id === editingZoneId ? updated : z)));
      } else {
        const created = await api.createShippingZone({
          zoneName: modalZoneName.trim(),
          pincodePrefix: cleanPrefix,
          shippingCharge: chargeNum,
          isActive: modalIsActive,
        });
        setZones((prev) => [created, ...prev]);
      }
      setIsZoneModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save shipping zone.');
    } finally {
      setIsSavingZone(false);
    }
  };

  // Confirm Delete Zone
  const handleDeleteZone = async () => {
    if (!zoneToDelete) return;
    setIsDeletingZone(true);
    try {
      await api.deleteShippingZone(zoneToDelete.id);
      setZones((prev) => prev.filter((z) => z.id !== zoneToDelete.id));
      setZoneToDelete(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete shipping zone.');
    } finally {
      setIsDeletingZone(false);
    }
  };

  // Filtered Zones List
  const filteredZones = zones.filter((z) => {
    if (!zoneSearchQuery.trim()) return true;
    const q = zoneSearchQuery.toLowerCase();
    return (
      z.zoneName.toLowerCase().includes(q) ||
      z.pincodePrefix.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            <span>COMMERCIAL ADMINISTRATION</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">SHIPPING & GST CONFIGURATION</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Shipping & GST Settings
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Configure default courier charges, GST tax rate, automatic free shipping thresholds, and regional pincode zone rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSavingSettings || isLoading}
            isLoading={isSavingSettings}
            variant="primary"
            size="md"
            className="shadow-sm font-semibold text-[13px]"
          >
            <Save className="h-4 w-4 mr-1.5" />
            <span>SAVE CHANGES</span>
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {settingsSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[13px] font-medium rounded-lg flex items-center gap-2 shadow-xs transition-all">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{settingsSuccess}</span>
        </div>
      )}

      {settingsError && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-800 text-[13px] font-medium rounded-lg flex items-center gap-2 shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{settingsError}</span>
        </div>
      )}

      {/* 2. Main Grid: Section A & Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Core Rates & Tax Parameters Form (Section A) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-200">
                <Truck className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
                  Core Rates & Tax Parameters
                </h2>
                <p className="text-[12px] text-slate-500">
                  Global baseline rates used across storefront checkout and quotes.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              SECTION A
            </span>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Base Shipping Fee */}
            <div>
              <label className="text-[13px] font-semibold text-slate-800 block mb-1">
                Default Base Shipping Fee (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={baseShippingFee}
                  onChange={(e) => setBaseShippingFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 150"
                  className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Standard courier fee applied when customer delivery pincode does not match any regional zone.
              </p>
            </div>

            {/* GST Tax Rate */}
            <div>
              <label className="text-[13px] font-semibold text-slate-800 block mb-1">
                GST Tax Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 18"
                  className="w-full h-10 px-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-semibold">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Standard Goods & Services Tax percentage (e.g. 18% = 9% CGST + 9% SGST intra-state, 18% IGST inter-state).
              </p>
            </div>

            {/* Free Shipping Threshold */}
            <div>
              <label className="text-[13px] font-semibold text-slate-800 block mb-1">
                Free Shipping Threshold (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 2000"
                  className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Orders with eligible merchandise subtotal reaching or exceeding this amount qualify for ₹0 shipping fee.
              </p>
            </div>

            {/* Enable Automatic Free Shipping Checkbox */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFreeShippingEnabled}
                  onChange={(e) => setIsFreeShippingEnabled(e.target.checked)}
                  className="h-4 w-4 mt-0.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                />
                <div>
                  <span className="text-[13px] font-bold text-slate-900 block">
                    Enable Automatic Free Shipping Threshold
                  </span>
                  <span className="text-[12px] text-slate-500 block mt-0.5">
                    When checked, checkout automatically zeroes out shipping charges when order subtotal reaches {formatCurrency(Number(freeShippingThreshold || 0))}.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSavingSettings || isLoading}
                isLoading={isSavingSettings}
                className="w-full justify-center font-bold text-xs uppercase tracking-wider"
              >
                <span>Save Core Parameters</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Calculation Simulation & Summary */}
        <div className="lg:col-span-6 space-y-4">
          {/* Summary Telemetry Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Checkout Engine Policy Summary</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Default Courier Base</span>
                <span className="font-mono font-bold text-base text-slate-900 block mt-0.5">
                  {formatCurrency(Number(baseShippingFee || 0))}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Fallback charge</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block text-[11px]">GST Rate</span>
                <span className="font-mono font-bold text-base text-slate-900 block mt-0.5">
                  {Number(gstRate || 0)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Tax on subtotal</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Free Shipping Threshold</span>
                <span className="font-mono font-bold text-base text-slate-900 block mt-0.5">
                  {formatCurrency(Number(freeShippingThreshold || 0))}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {isFreeShippingEnabled ? 'Status: Active' : 'Status: Disabled'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Pincode Zone Rules</span>
                <span className="font-mono font-bold text-base text-indigo-700 block mt-0.5">
                  {zones.length} Configured
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Prefix matching active</span>
              </div>
            </div>

            {/* Quick Preview Calculation Box */}
            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-amber-950">
                <span>Illustrative Quote Example:</span>
                <span className="font-mono">Subtotal: ₹1,500</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-600 border-t border-amber-200/50 pt-2 font-mono">
                <div className="flex justify-between">
                  <span>Shipping (Base fallback):</span>
                  <span>{formatCurrency(Number(baseShippingFee || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({Number(gstRate || 0)}%):</span>
                  <span>{formatCurrency(Math.round(1500 * (Number(gstRate || 0) / 100) * 100) / 100)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-amber-200/40">
                  <span>Total Payable:</span>
                  <span>
                    {formatCurrency(
                      Math.round(
                        (1500 +
                          1500 * (Number(gstRate || 0) / 100) +
                          (isFreeShippingEnabled && 1500 >= Number(freeShippingThreshold || 0)
                            ? 0
                            : Number(baseShippingFee || 0))) *
                          100,
                      ) / 100,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. SECTION B: REGIONAL PINCODE ZONE RATES */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Regional Pincode Zone Rates</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                  {zones.length} {zones.length === 1 ? 'Zone' : 'Zones'}
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure specialized courier fees for specific pincodes or delivery prefixes. Longest prefix takes precedence.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search filter */}
            <div className="relative w-60">
              <RiSearch2Line className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={zoneSearchQuery}
                onChange={(e) => setZoneSearchQuery(e.target.value)}
                placeholder="Search zone or prefix..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenAddZone}
              className="gap-1.5 font-bold"
            >
              <RiAddLine className="h-4 w-4" />
              <span>Add Shipping Zone</span>
            </Button>
          </div>
        </div>

        {/* Zones Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-mono font-semibold">
              <tr>
                <th className="py-3 px-4">Zone / Region Name</th>
                <th className="py-3 px-4">Pincode Prefix / Code</th>
                <th className="py-3 px-4">Shipping Charge</th>
                <th className="py-3 px-4">Rule Precedence</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                    Loading shipping zones catalog...
                  </td>
                </tr>
              ) : filteredZones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-slate-800">
                        No regional shipping zones configured
                      </span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        All delivery pincodes will automatically receive the configured default base shipping fee ({formatCurrency(Number(baseShippingFee || 0))}).
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenAddZone}
                        className="mt-2"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        <span>Add First Shipping Zone</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredZones.map((zone) => {
                  const isExact = zone.pincodePrefix.length === 6;

                  return (
                    <tr key={zone.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Zone Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{zone.zoneName}</span>
                        </div>
                      </td>

                      {/* Pincode Prefix */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 border border-slate-200">
                          {zone.pincodePrefix}
                          {!isExact && <span className="text-slate-400 font-normal">***</span>}
                        </span>
                      </td>

                      {/* Shipping Charge */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {zone.shippingCharge === 0 ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            FREE (₹0)
                          </span>
                        ) : (
                          <span>{formatCurrency(zone.shippingCharge)}</span>
                        )}
                      </td>

                      {/* Rule Precedence */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {isExact ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                            Exact 6-Digit Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                            {zone.pincodePrefix.length}-Digit Prefix Match
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {zone.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditZone(zone)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit shipping zone"
                          >
                            <RiEditLine className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoneToDelete(zone)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete shipping zone"
                          >
                            <RiDeleteBinLine className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ADD / EDIT ZONE MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        title={editingZoneId ? 'Edit Regional Shipping Zone' : 'Add Regional Shipping Zone'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveZoneModal} className="space-y-4 pt-2">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center gap-2">
              <RiAlertLine className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1">
              Zone / Region Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modalZoneName}
              onChange={(e) => setModalZoneName(e.target.value)}
              placeholder="e.g. Mumbai Metropolitan Region, Karnataka Hub"
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1">
              Pincode or Pincode Prefix <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={modalPincodePrefix}
              onChange={(e) => setModalPincodePrefix(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 400 (prefix) or 560001 (exact)"
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Enter 1–6 numeric digits. Prefix matching will apply to all matching delivery postal codes.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1">
              Shipping Charge (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-semibold">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={modalShippingCharge}
                onChange={(e) => setModalShippingCharge(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g. 80"
                className="w-full h-9 pl-7 pr-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Enter 0 for free shipping in this specific regional zone.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={modalIsActive}
                onChange={(e) => setModalIsActive(e.target.checked)}
                className="h-4 w-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
              />
              <span className="text-xs font-semibold text-slate-800">Zone is Active</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsZoneModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingZone}
              isLoading={isSavingZone}
            >
              <span>{editingZoneId ? 'Save Changes' : 'Create Zone'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!zoneToDelete}
        onClose={() => setZoneToDelete(null)}
        title="Confirm Zone Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete the shipping zone <strong>&ldquo;{zoneToDelete?.zoneName}&rdquo;</strong> (Pincode prefix: <strong>{zoneToDelete?.pincodePrefix}</strong>)?
          </p>
          <p className="text-[11px] text-slate-500">
            Deliveries to this prefix will revert to using the default base shipping fee ({formatCurrency(Number(baseShippingFee || 0))}).
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoneToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isDeletingZone}
              isLoading={isDeletingZone}
              onClick={handleDeleteZone}
            >
              <span>Delete Zone</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
