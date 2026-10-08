'use client';

import React from 'react';
import { DynamicField, DynamicFieldOption } from '@/lib/api';
import { RiCheckLine, RiInformationLine, RiUploadCloud2Line } from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';

interface DynamicFieldRendererProps {
  field: DynamicField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled = false,
}: DynamicFieldRendererProps) {
  const { type, label, description, placeholder, isRequired, options, validationRules } = field;

  // Option price modifier badge
  const renderPriceBadge = (opt: DynamicFieldOption, isSelected: boolean) => {
    const mod = Number(opt.priceModifier || 0);
    if (mod === 0) {
      return (
        <span
          className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded transition-colors ${
            isSelected
              ? 'bg-slate-900 text-slate-100'
              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
          }`}
        >
          Included
        </span>
      );
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

  // Determine grid layout based on option count
  const getGridColsClass = (count: number) => {
    if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2';
  };

  return (
    <div className="space-y-2.5">
      {/* Field Header: Label & Optional Unit/Requirement */}
      <div className="flex items-baseline justify-between">
        <div>
          <label className="text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-1.5 font-sans tracking-tight">
            <span>{label}</span>
            {isRequired ? (
              <span className="text-amber-600 font-bold text-xs" title="Required field">
                *
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400 font-normal">(Optional)</span>
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
              <div className={`grid gap-2 sm:gap-2.5 ${getGridColsClass(options.length)}`}>
                {options.map((opt) => {
                  const isSelected = String(value) === String(opt.value);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange(opt.value)}
                      className={`group w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 bg-amber-50/40 ring-1.5 ring-slate-900 shadow-xs'
                          : 'border-slate-200/90 bg-white hover:border-slate-400 hover:bg-slate-50/70'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {/* Radio selection circle */}
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-[#FFED00]'
                              : 'border-slate-300 bg-white group-hover:border-slate-400'
                          }`}
                        >
                          {isSelected && <RiCheckLine className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span
                            className={`text-xs sm:text-[13px] block truncate transition-colors ${
                              isSelected ? 'font-black text-slate-950' : 'font-semibold text-slate-800'
                            }`}
                          >
                            {opt.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0">{renderPriceBadge(opt, isSelected)}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-400 italic font-mono border border-slate-200">
                No options configured for this specification.
              </div>
            )}
          </div>
        )}

        {/* 2. TOGGLE (Segmented Switch or Switch control) */}
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
