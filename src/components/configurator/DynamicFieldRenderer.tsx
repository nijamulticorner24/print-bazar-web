'use client';

import React from 'react';
import { DynamicField, DynamicFieldOption, resolveImageUrl } from '@/lib/api';
import {
  RiCheckLine,
  RiInformationLine,
  RiUploadCloud2Line,
  RiCameraLine,
  RiFileTextLine,
  RiDeleteBinLine,
  RiAlertFill,
  RiPaletteLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import type { FlowArtworkState } from './ProductConfigurationFlow';

export function formatSlotLabel(rawLabel: string): { title: string; placeholder: string } {
  const clean = (rawLabel || '').trim();
  if (!clean) return { title: 'ARTWORK FILE', placeholder: 'Click or drag artwork file' };

  const words = clean.replace(/[_-]+/g, ' ').split(' ').filter(Boolean);
  const baseTitle = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  let displayTitle = baseTitle;
  const lower = clean.toLowerCase();
  if (['front', 'back', 'left', 'right', 'top', 'bottom'].includes(lower)) {
    if (!displayTitle.toLowerCase().includes('side')) {
      displayTitle = `${displayTitle} Side`;
    }
  }

  return {
    title: displayTitle.toUpperCase(),
    placeholder: `Click or drag ${displayTitle} file`,
  };
}

interface DynamicFieldRendererProps {
  field: DynamicField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  productId?: string;
  slotFiles?: Record<string, FlowArtworkState>;
  onSlotFileUpload?: (slotKey: string, file: File) => Promise<void>;
  onSlotFileRemove?: (slotKey: string) => void;
  uploadingSlots?: Record<string, boolean>;
  slotErrors?: Record<string, string>;
  designNotes?: string;
  onDesignNotesChange?: (notes: string) => void;
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled = false,
  productId,
  slotFiles = {},
  onSlotFileUpload,
  onSlotFileRemove,
  uploadingSlots = {},
  slotErrors = {},
  designNotes,
  onDesignNotesChange,
}: DynamicFieldRendererProps) {
  const { type, label, description, placeholder, isRequired, options, validationRules } = field;

  // Selected option resolution
  const selectedOption = options?.find((opt) => String(opt.value) === String(value));

  // Option price modifier badge
  const renderPriceBadge = (opt: DynamicFieldOption, isSelected: boolean) => {
    const mod = Number(opt.priceModifier || 0);
    if (mod === 0) {
      return null;
    }
    const sign = mod > 0 ? '+' : '';
    const formatted =
      opt.priceModifierType === 'PERCENTAGE'
        ? `${sign}${mod}%`
        : `${sign}${formatCurrency(mod)}${opt.priceModifierType === 'PER_UNIT' ? '/pc' : ''}`;

    return (
      <span
        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded transition-colors ${
          isSelected
            ? 'bg-[#FFED00] text-slate-950 font-black border border-[#E3A008]/50'
            : 'bg-amber-50 text-amber-900 border border-amber-200/80 group-hover:bg-amber-100/70'
        }`}
      >
        {formatted}
      </span>
    );
  };

  // Check if options are compact pills (e.g. 2 short options like Yes Please / No Thanks)
  const isCompactPillLayout =
    options &&
    options.length <= 4 &&
    options.every((o) => (o.label || '').length <= 16 && (!o.priceModifier || Number(o.priceModifier) === 0));

  return (
    <div className="space-y-2.5">
      {/* Field Header: Label & Optional Unit/Requirement */}
      <div className="flex items-baseline justify-between">
        <div>
          <label className="text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-1.5 font-sans tracking-tight uppercase">
            <span>{label}</span>
            {isRequired ? (
              <span className="text-amber-600 font-bold text-xs" title="Required field">
                *
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400 font-normal lowercase">(optional)</span>
            )}
          </label>
          {description && (
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>
        {validationRules?.unit && (
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold tracking-wider">
            {validationRules.unit}
          </span>
        )}
      </div>

      {/* Field Controls by Type */}
      <div>
        {/* 1. SELECT / RADIO / MULTI Option Cards */}
        {(type === 'SELECT' || type === 'RADIO' || type === 'MULTI_SELECT') && (
          <div>
            {options && options.length > 0 ? (
              <div>
                {/* Options Layout */}
                <div
                  className={
                    isCompactPillLayout
                      ? 'flex flex-wrap items-center gap-2'
                      : `grid gap-2 sm:gap-2.5 ${options.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`
                  }
                >
                  {options.map((opt) => {
                    const isSelected = String(value) === String(opt.value);
                    const badge = renderPriceBadge(opt, isSelected);

                    if (isCompactPillLayout) {
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => onChange(opt.value)}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'border-slate-950 bg-slate-950 text-white shadow-xs ring-1 ring-slate-950'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isSelected && <RiCheckLine className="h-4 w-4 text-[#FFED00] stroke-[2.5]" />}
                          <span>{opt.label}</span>
                          {badge}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(opt.value)}
                        className={`group w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-slate-950 bg-slate-950 text-white ring-1.5 ring-slate-950 shadow-xs'
                            : 'border-slate-200/90 bg-white hover:border-slate-400 hover:bg-slate-50/70 text-slate-800'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? 'border-[#FFED00] bg-[#FFED00] text-slate-950'
                                : 'border-slate-300 bg-white group-hover:border-slate-400'
                            }`}
                          >
                            {isSelected && <RiCheckLine className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`text-xs sm:text-[13px] block truncate transition-colors ${
                                isSelected ? 'font-black text-white' : 'font-semibold text-slate-800'
                              }`}
                            >
                              {opt.label}
                            </span>
                          </div>
                        </div>

                        {badge && <div className="flex-shrink-0">{badge}</div>}
                      </button>
                    );
                  })}
                </div>

                {/* ------------------------------------------------------------- */}
                {/* DYNAMIC UPLOAD SLOTS SECTION (Admin Configured File Slots)    */}
                {/* ------------------------------------------------------------- */}
                {selectedOption?.fileCount && selectedOption.fileCount > 0 ? (
                  <div className="rounded-2xl border border-purple-200 bg-white p-4 sm:p-5 mt-3.5 space-y-4 shadow-xs animate-in fade-in duration-200">
                    {Array.from({ length: selectedOption.fileCount }).map((_, slotIdx) => {
                      const rawSlotLabel =
                        selectedOption.fileSlotLabels?.[slotIdx] ||
                        (selectedOption.fileCount === 1 ? 'artwork' : slotIdx === 0 ? 'front' : 'back');
                      const { title, placeholder } = formatSlotLabel(rawSlotLabel);
                      const slotKey = rawSlotLabel.toLowerCase().trim();
                      const uploadedFile = slotFiles?.[slotKey];
                      const isUploading = Boolean(uploadingSlots?.[slotKey]);
                      const errorMsg = slotErrors?.[slotKey];

                      return (
                        <div key={`${slotKey}-${slotIdx}`} className="space-y-1.5">
                          {/* Slot Header Label */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-black text-purple-900 tracking-wide font-mono uppercase">
                              <RiCameraLine className="h-4 w-4 text-purple-700" />
                              <span>{title}</span>
                            </div>
                            {uploadedFile && (
                              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <RiCheckLine className="h-3 w-3 stroke-[3]" /> File Ready
                              </span>
                            )}
                          </div>

                          {/* Hidden File Input */}
                          <input
                            type="file"
                            id={`slot-file-${field.key}-${slotKey}`}
                            accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && onSlotFileUpload) {
                                onSlotFileUpload(slotKey, file);
                              }
                              e.target.value = '';
                            }}
                          />

                          {/* If File NOT yet uploaded: Show Purple Dashed Dropzone */}
                          {!uploadedFile ? (
                            <label
                              htmlFor={`slot-file-${field.key}-${slotKey}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files?.[0];
                                if (file && onSlotFileUpload) {
                                  onSlotFileUpload(slotKey, file);
                                }
                              }}
                              className={`block border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer group ${
                                isUploading
                                  ? 'border-purple-400 bg-purple-50/50 cursor-wait'
                                  : 'border-purple-300 hover:border-purple-600 bg-white hover:bg-purple-50/40'
                              }`}
                            >
                              {isUploading ? (
                                <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                                  <div className="h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                  <span className="text-xs font-bold text-purple-900">
                                    Checking Resolution & Uploading...
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <div className="text-sm font-bold text-purple-900 group-hover:text-purple-950">
                                    {placeholder}
                                  </div>
                                  <div className="text-[11px] font-bold text-purple-700 bg-purple-100/70 inline-block px-2.5 py-0.5 rounded-full mt-1.5 font-mono">
                                    Min {selectedOption.minMegapixels || 1.5} MP Quality • Max Not Limited
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-1 font-sans">
                                    PNG, JPG, WEBP, PDF (Upload must match min {selectedOption.minMegapixels || 1.5} MP)
                                  </div>
                                </>
                              )}
                            </label>
                          ) : (
                            /* If File IS uploaded: Show Uploaded Card */
                            <div className="p-3.5 bg-purple-50/30 border border-purple-200 rounded-xl flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {uploadedFile.fileUrl && /\.(png|jpe?g|webp|svg)$/i.test(uploadedFile.originalFileName) ? (
                                  <img
                                    src={resolveImageUrl(uploadedFile.fileUrl)}
                                    alt={title}
                                    className="h-10 w-10 object-cover rounded-lg border border-purple-200 bg-white flex-shrink-0"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0 font-bold border border-purple-200">
                                    <RiFileTextLine className="h-5 w-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 truncate max-w-[220px] sm:max-w-[340px]">
                                    {uploadedFile.originalFileName}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span>{(uploadedFile.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                                    {uploadedFile.actualMegapixels ? (
                                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                        ✓ {uploadedFile.actualMegapixels} MP (Verified ≥ {selectedOption.minMegapixels || 1.5} MP)
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <label
                                  htmlFor={`slot-file-${field.key}-${slotKey}`}
                                  className="px-2.5 py-1 text-xs font-bold text-purple-900 bg-white border border-purple-200 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors"
                                >
                                  Replace
                                </label>
                                <button
                                  type="button"
                                  onClick={() => onSlotFileRemove?.(slotKey)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                                  title="Remove file"
                                >
                                  <RiDeleteBinLine className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Error Message */}
                          {errorMsg && (
                            <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                              <RiAlertFill className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>{errorMsg}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ------------------------------------------------------------- */
                  /* DESIGN ASSISTANCE CARD (When Yes Please / Design Option chosen)*/
                  /* ------------------------------------------------------------- */
                  (!selectedOption?.fileCount &&
                    (selectedOption?.value === 'yes_please' ||
                      field.key === 'l' ||
                      field.label.toLowerCase().includes('design')) && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 mt-3 space-y-2.5 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-slate-900 text-[#FFED00] flex items-center justify-center flex-shrink-0 shadow-2xs">
                            <RiPaletteLine className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              Professional Design Assistance Selected
                            </span>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                              Our prepress creative studio will design and format your print-ready artwork according to your branding requirements.
                            </p>
                          </div>
                        </div>

                        <div className="pt-1">
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">
                            Design Notes & Branding Details (Optional)
                          </label>
                          <textarea
                            value={designNotes || ''}
                            onChange={(e) => onDesignNotesChange?.(e.target.value)}
                            placeholder="Enter your logo placement, contact details, text copy, color preferences, or reference notes..."
                            rows={2}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 font-sans shadow-2xs"
                          />
                        </div>
                      </div>
                    ))
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-400 italic font-mono border border-slate-200">
                No options configured for this specification.
              </div>
            )}
          </div>
        )}

        {/* 2. TOGGLE */}
        {type === 'TOGGLE' && (
          <div className="flex items-center gap-2 sm:gap-3">
            {options && options.length > 0 ? (
              options.map((opt) => {
                const isSelected = String(value) === String(opt.value);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(opt.value)}
                    className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs sm:text-[13px] font-bold transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-[#FFED00] shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {Number(opt.priceModifier || 0) > 0 && (
                      <span className="text-[11px] font-mono text-[#FFED00]">
                        +{formatCurrency(Number(opt.priceModifier))}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  {value === 'yes' ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(value === 'yes' ? 'no' : 'yes')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value === 'yes' ? 'bg-slate-900' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value === 'yes' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. NUMBER */}
        {type === 'NUMBER' && (
          <div className="relative flex items-center">
            <input
              type="number"
              disabled={disabled}
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
              min={validationRules?.min}
              max={validationRules?.max}
              step={validationRules?.step || 1}
              placeholder={placeholder || 'Enter value'}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
            />
            {validationRules?.step && (
              <span className="absolute right-3 text-[11px] font-mono text-slate-400">
                Step: {validationRules.step}
              </span>
            )}
          </div>
        )}

        {/* 4. TEXT */}
        {type === 'TEXT' || type === 'EMAIL' || type === 'PHONE' || type === 'DATE' || type === 'TIME' ? (
          <input
            type={type === 'EMAIL' ? 'email' : type === 'PHONE' ? 'tel' : type === 'DATE' ? 'date' : type === 'TIME' ? 'time' : 'text'}
            disabled={disabled}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'Enter specifications'}
            maxLength={validationRules?.maxLength}
            minLength={validationRules?.minLength}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all font-sans"
          />
        ) : null}

        {/* 5. TEXTAREA */}
        {type === 'TEXTAREA' && (
          <textarea
            disabled={disabled}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'Enter custom requirements or special notes...'}
            rows={3}
            maxLength={validationRules?.maxLength}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all font-sans"
          />
        )}

        {/* 6. COLOR */}
        {type === 'COLOR' && (
          <div className="flex items-center gap-3">
            <input
              type="color"
              disabled={disabled}
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-12 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase"
            />
          </div>
        )}

        {/* 7. RANGE */}
        {type === 'RANGE' && (
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-500">Min: {validationRules?.min || 0}</span>
              <span className="font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-xs">
                {value ?? validationRules?.min ?? 0} {validationRules?.unit || ''}
              </span>
              <span className="text-slate-500">Max: {validationRules?.max || 100}</span>
            </div>
            <input
              type="range"
              disabled={disabled}
              value={value ?? validationRules?.min ?? 0}
              onChange={(e) => onChange(Number(e.target.value))}
              min={validationRules?.min || 0}
              max={validationRules?.max || 100}
              step={validationRules?.step || 1}
              className="w-full accent-slate-900 cursor-pointer"
            />
          </div>
        )}

        {/* 8. FILE / IMAGE (Generic Dropzone) */}
        {(type === 'FILE' || type === 'IMAGE') && (
          <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-4 bg-slate-50/50 text-center transition-colors">
            <RiUploadCloud2Line className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
            <div className="text-xs font-bold text-slate-800">
              {value ? (
                <span className="text-emerald-700 font-mono">{typeof value === 'object' ? value.name : value}</span>
              ) : (
                'Attach file / asset'
              )}
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
              {validationRules?.allowedExtensions?.join(', ') || 'PDF, AI, EPS, ZIP'} (Max{' '}
              {validationRules?.maxFileSizeMb || 50} MB)
            </p>
          </div>
        )}
      </div>

      {/* Validation Error */}
      {error && (
        <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
          <RiInformationLine className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
