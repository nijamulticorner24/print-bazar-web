'use client';

import React, { useMemo } from 'react';
import { RiAlertLine, RiInformationLine, RiSparklingFill } from 'react-icons/ri';
import { ReusableAttribute } from '@/lib/api';

export interface ParsedQtyRange {
  min: number;
  max: number;
  key: string; // e.g. "1-5"
  label: string; // e.g. "Qty 1–5"
}

export interface ParseRangesResult {
  ranges: ParsedQtyRange[];
  error: string | null;
}

export function parseQuantityRanges(raw: string): ParseRangesResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ranges: [],
      error: 'Please enter at least one quantity range (e.g. 1-5, 6-10, 11-20).',
    };
  }

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return {
      ranges: [],
      error: 'Please enter at least one quantity range (e.g. 1-5, 6-10, 11-20).',
    };
  }

  const ranges: ParsedQtyRange[] = [];
  let lastMax = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const dashMatch = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    const singleMatch = part.match(/^(\d+)$/);

    let min: number;
    let max: number;

    if (dashMatch) {
      min = parseInt(dashMatch[1], 10);
      max = parseInt(dashMatch[2], 10);
    } else if (singleMatch) {
      min = parseInt(singleMatch[1], 10);
      max = min;
    } else {
      return {
        ranges: [],
        error: `Invalid range format: "${part}". Use comma-separated brackets like 1-5, 6-10, 11-20.`,
      };
    }

    if (isNaN(min) || isNaN(max) || min <= 0 || max <= 0) {
      return {
        ranges: [],
        error: `Quantities must be positive integers: "${part}".`,
      };
    }

    if (min > max) {
      return {
        ranges: [],
        error: `Invalid range "${part}": Start quantity (${min}) cannot exceed end quantity (${max}).`,
      };
    }

    if (i > 0) {
      if (min <= lastMax) {
        return {
          ranges: [],
          error: `Range "${part}" overlaps with previous bracket ending at ${lastMax}. Start quantity must be at least ${lastMax + 1}.`,
        };
      }
      if (min < lastMax) {
        return {
          ranges: [],
          error: `Ranges must be in ascending order: "${part}".`,
        };
      }
    }

    lastMax = max;
    ranges.push({
      min,
      max,
      key: `${min}-${max}`,
      label: min === max ? `Qty ${min}` : `Qty ${min}–${max}`,
    });
  }

  return { ranges, error: null };
}

export interface SingleTypePricingTableProps {
  rangesInput: string;
  onRangesInputChange: (val: string) => void;
  basePrices: Record<string, number | string>;
  onBasePricesChange: (val: Record<string, number | string>) => void;
  extraPrices: Record<string, Record<string, number | string>>;
  onExtraPricesChange: (val: Record<string, Record<string, number | string>>) => void;
  selectedAttributes: Record<
    string,
    {
      attributeId: string;
      name: string;
      code: string;
      enabledOptionValues: string[];
      isOptionalAddOn?: boolean;
    }
  >;
  attributeLibrary?: ReusableAttribute[];
  getOptionLabel: (attrCode: string, val: string) => string;
}

export const SingleTypePricingTable: React.FC<SingleTypePricingTableProps> = ({
  rangesInput,
  onRangesInputChange,
  basePrices,
  onBasePricesChange,
  extraPrices,
  onExtraPricesChange,
  selectedAttributes,
  getOptionLabel,
}) => {
  const parsed = useMemo(() => parseQuantityRanges(rangesInput), [rangesInput]);

  // Derive attribute rows from attached attributes and their enabled values
  const attributeRows = useMemo(() => {
    const rows: {
      uniqueKey: string;
      attributeName: string;
      attributeCode: string;
      optionValue: string;
      optionLabel: string;
      isAddOn: boolean;
    }[] = [];

    for (const attrId of Object.keys(selectedAttributes)) {
      const config = selectedAttributes[attrId];
      // Only show extra price rows for attributes configured as Optional add-on
      if (!config.isOptionalAddOn) continue;
      for (const val of config.enabledOptionValues) {
        rows.push({
          uniqueKey: `${config.code}:${val}`,
          attributeName: config.name,
          attributeCode: config.code,
          optionValue: val,
          optionLabel: getOptionLabel(config.code, val),
          isAddOn: true,
        });
      }
    }

    return rows;
  }, [selectedAttributes, getOptionLabel]);

  return (
    <div className="space-y-4">
      {/* Header & Description */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>Single-Type Quantity Range Pricing</span>
          <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
            Single Product Mode
          </span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Define quantity brackets and configure per-piece base prices and attribute add-on pricing for each range.
        </p>
      </div>

      {/* Quantity Ranges Input Field */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold text-slate-900 uppercase font-mono block">
              Quantity Ranges (Columns)
            </label>
            <p className="text-[11px] text-slate-500">
              Enter comma-separated quantity ranges (e.g.{' '}
              <span className="font-mono font-bold text-slate-800">1-5, 6-10, 11-20</span>). Each range becomes a pricing column.
            </p>
          </div>

          {parsed.ranges.length > 0 && !parsed.error && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
                Min: {parsed.ranges[0].min} pcs
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                Max: {parsed.ranges[parsed.ranges.length - 1].max} pcs
              </span>
            </div>
          )}
        </div>

        <input
          type="text"
          value={rangesInput}
          onChange={(e) => onRangesInputChange(e.target.value)}
          placeholder="e.g. 1-5, 6-10, 11-20"
          className={`w-full h-10 px-3 text-xs font-mono font-bold bg-white border rounded-lg focus:outline-none focus:ring-1 transition-all ${
            parsed.error
              ? 'border-red-400 focus:border-red-600 focus:ring-red-600 text-red-950 bg-red-50/20'
              : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900 text-slate-900'
          }`}
        />

        {parsed.error && (
          <div className="text-xs text-red-600 flex items-center gap-1.5 font-medium pt-0.5">
            <RiAlertLine className="h-4 w-4 shrink-0 text-red-500" />
            <span>{parsed.error}</span>
          </div>
        )}
      </div>

      {/* Range-Based Pricing Table */}
      {parsed.ranges.length > 0 ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-mono font-bold">
                <tr>
                  <th className="py-3 px-4 min-w-[240px]">Attributes</th>
                  {parsed.ranges.map((r) => (
                    <th key={r.key} className="py-3 px-4 text-center font-mono min-w-[140px]">
                      <span className="font-bold text-slate-900 text-xs block">{r.label}</span>
                      <span className="text-[10px] text-slate-400 font-normal block font-sans">
                        {r.min === r.max ? `${r.min} unit` : `${r.min} to ${r.max} units`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Base Price Row */}
                <tr className="bg-amber-50/25 hover:bg-amber-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">Base price</span>
                      <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                        Per Piece
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                      Base manufacturing unit price for each quantity range
                    </span>
                  </td>

                  {parsed.ranges.map((r) => {
                    const rawVal = basePrices[r.key] ?? '';
                    const numVal = Number(rawVal || 0);

                    return (
                      <td key={r.key} className="py-3.5 px-3 text-center align-middle">
                        <div className="space-y-1 max-w-[130px] mx-auto">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={rawVal}
                              onChange={(e) =>
                                onBasePricesChange({
                                  ...basePrices,
                                  [r.key]: e.target.value,
                                })
                              }
                              placeholder="0.00"
                              className="w-full h-9 pl-6 pr-2 text-center text-xs font-mono font-black text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 shadow-2xs"
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            ₹{numVal.toFixed(2)}/pc
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* 2. Attached Product Attributes & Add-ons */}
                {attributeRows.map((row) => (
                  <tr key={row.uniqueKey} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 text-xs">
                          {row.attributeName}:
                        </span>
                        <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {row.optionLabel}
                        </span>
                        {row.isAddOn && (
                          <span className="text-[9px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded uppercase">
                            Add-on
                          </span>
                        )}
                      </div>
                    </td>

                    {parsed.ranges.map((r) => {
                      const rawExtra = extraPrices[row.uniqueKey]?.[r.key] ?? '';
                      const numExtra = Number(rawExtra || 0);

                      return (
                        <td key={r.key} className="py-3 px-3 text-center align-middle">
                          <div className="space-y-1 max-w-[130px] mx-auto">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                                +₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={rawExtra}
                                onChange={(e) =>
                                  onExtraPricesChange({
                                    ...extraPrices,
                                    [row.uniqueKey]: {
                                      ...(extraPrices[row.uniqueKey] || {}),
                                      [r.key]: e.target.value,
                                    },
                                  })
                                }
                                placeholder="0.00"
                                className="w-full h-9 pl-7 pr-2 text-center text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 shadow-2xs"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {numExtra > 0 ? `+₹${numExtra.toFixed(2)}` : '₹0.00'}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {attributeRows.length === 0 && (
            <div className="p-3 bg-slate-50/60 border-t border-slate-100 text-center text-[11px] text-slate-500">
              <RiInformationLine className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
              Only attributes checked as "Optional add-on" display extra price rows here. Standard variation pricing is determined by the Base price row.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
