'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Standard ERP Page Header Container
 */
export function PageHeader({
  title,
  description,
  badge,
  compact = false,
  actions,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  compact?: boolean;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/90 bg-white p-5 rounded-xl border shadow-xs',
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1
            className={cn(
              'font-semibold text-slate-900 tracking-tight leading-tight',
              compact ? 'text-[22px] sm:text-[24px]' : 'text-[24px] sm:text-[28px]'
            )}
          >
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * 28px Semibold Page Title
 */
export function PageTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        'text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2]',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

/**
 * 24px Semibold Page Title Compact
 */
export function PageTitleCompact({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        'text-[20px] sm:text-[24px] font-semibold text-slate-900 tracking-tight leading-[1.25]',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

/**
 * 18px Semibold Section Title
 */
export function SectionTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'text-[18px] font-semibold text-slate-900 tracking-tight leading-[1.3]',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

/**
 * 16px Semibold Subsection Title
 */
export function SubsectionTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-[16px] font-semibold text-slate-900 tracking-tight leading-[1.35]',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

/**
 * 15px Semibold Card / Panel Title
 */
export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn(
        'text-[15px] font-semibold text-slate-900 leading-[1.35]',
        className
      )}
      {...props}
    >
      {children}
    </h4>
  );
}

/**
 * 14px Regular Body Content
 */
export function BodyText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-[14px] font-normal text-slate-700 leading-[1.45]',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * 14px Medium Body Emphasis
 */
export function BodyEmphasis({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-[14px] font-medium text-slate-900 leading-[1.45]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * 13px Table Text
 */
export function TableText({
  className,
  emphasis = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { emphasis?: boolean }) {
  return (
    <span
      className={cn(
        'text-[13px] leading-[1.4]',
        emphasis ? 'font-medium text-slate-900' : 'font-normal text-slate-700',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * 12px Table Header
 */
export function TableHeader({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'text-[12px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-4 leading-[1.3]',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

/**
 * 12px-13px Form Label
 */
export function FormLabel({
  className,
  required = false,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn(
        'block text-[12px] sm:text-[13px] font-medium text-slate-800 leading-[1.3] mb-1.5',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-amber-600 ml-0.5 font-normal">*</span>}
    </label>
  );
}

/**
 * 12px Helper Text
 */
export function HelperText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-[12px] font-normal text-slate-500 leading-tight mt-1', className)}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * 12px-13px Error Text
 */
export function ErrorText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-[12px] font-medium text-red-600 leading-tight mt-1', className)}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * 11px-12px Caption Text
 */
export function CaptionText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('text-[11px] font-normal text-slate-500 leading-tight', className)}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * 24px-32px Dashboard Metric Value with Tabular Nums
 */
export function MetricValue({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-[24px] sm:text-[28px] font-semibold tracking-tight text-slate-900 tabular-nums leading-tight block',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * 13px-14px Financial Price Value with Tabular Nums
 */
export function PriceText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-[13px] sm:text-[14px] font-semibold text-slate-900 tabular-nums',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * 13px SKU / Identifier Code
 */
export function SkuText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-[13px] font-medium font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
