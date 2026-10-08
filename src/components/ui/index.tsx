'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// -------------------------------------------------------------
// 1. BUTTON
// -------------------------------------------------------------
const buttonVariants = cva(
  'inline-flex items-center justify-center font-bold tracking-tight rounded-[8px] transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFED00] focus-visible:ring-offset-2 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 border border-[#E3A008]/40 shadow-sm shadow-[#FFED00]/20 font-black',
        secondary:
          'bg-[#E3A008] hover:bg-[#C88A06] text-white border border-[#C88A06] shadow-sm font-bold',
        dark:
          'bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 shadow-sm',
        outline:
          'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs hover:border-slate-300',
        subtle:
          'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-transparent',
        ghost:
          'hover:bg-slate-100 text-slate-700 hover:text-slate-900',
        danger:
          'bg-red-600 hover:bg-red-700 text-white shadow-sm border border-red-700',
        dangerOutline:
          'bg-white hover:bg-red-50 text-red-600 border border-red-200 shadow-xs',
      },
      size: {
        xs: 'text-[11px] h-7 px-2.5 gap-1.5',
        sm: 'text-xs h-8 px-3 gap-1.5',
        md: 'text-xs h-10 px-4 gap-2',
        lg: 'text-sm h-12 px-6 gap-2.5 font-bold',
        icon: 'h-9 w-9 p-0',
        iconSm: 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {isLoading && (
          <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// -------------------------------------------------------------
// 2. BADGE & STATUS BADGE
// -------------------------------------------------------------
const badgeVariants = cva(
  'inline-flex items-center font-mono font-bold uppercase tracking-wider rounded px-2 py-0.5 text-[10px] transition-colors',
  {
    variants: {
      variant: {
        yellow: 'bg-[#FFFBEB] text-[#92400E] border border-[#FFED00]',
        brand: 'bg-[#FFED00] text-slate-950 font-black border border-[#E3A008]/50',
        gold: 'bg-amber-50 text-amber-900 border border-amber-300',
        emerald: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        blue: 'bg-sky-50 text-sky-800 border border-sky-200',
        indigo: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
        purple: 'bg-purple-50 text-purple-800 border border-purple-200',
        rose: 'bg-rose-50 text-rose-800 border border-rose-200',
        red: 'bg-red-50 text-red-800 border border-red-200',
        zinc: 'bg-slate-100 text-slate-700 border border-slate-200',
        dark: 'bg-slate-900 text-white font-bold',
      },
    },
    defaultVariants: {
      variant: 'zinc',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const norm = status?.toUpperCase() || 'UNKNOWN';

  let variant: VariantProps<typeof badgeVariants>['variant'] = 'zinc';
  let dotColor = 'bg-slate-400';

  if (
    norm.includes('PAID') ||
    norm.includes('DELIVERED') ||
    norm.includes('PASSED') ||
    norm.includes('COMPLETED') ||
    norm.includes('APPROVED') ||
    norm.includes('PUBLISHED') ||
    norm.includes('ACTIVE') ||
    norm.includes('ON_TIME')
  ) {
    variant = 'emerald';
    dotColor = 'bg-emerald-500';
  } else if (
    norm.includes('PENDING') ||
    norm.includes('PROGRESS') ||
    norm.includes('PRINTING') ||
    norm.includes('PRODUCTION') ||
    norm.includes('REVIEW') ||
    norm.includes('CLAIMED') ||
    norm.includes('PACKING')
  ) {
    variant = 'blue';
    dotColor = 'bg-sky-500';
  } else if (
    norm.includes('REQUIRED') ||
    norm.includes('APPROVAL') ||
    norm.includes('WAITING') ||
    norm.includes('AT_RISK') ||
    norm.includes('DISPATCH') ||
    norm.includes('WARNING')
  ) {
    variant = 'gold';
    dotColor = 'bg-amber-500';
  } else if (
    norm.includes('HOLD') ||
    norm.includes('REJECTED') ||
    norm.includes('FAILED') ||
    norm.includes('DELAYED') ||
    norm.includes('BLOCKED') ||
    norm.includes('OVERDUE')
  ) {
    variant = 'red';
    dotColor = 'bg-red-500';
  }

  const label = status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        badgeVariants({ variant }),
        'inline-flex items-center gap-1.5 py-0.5 px-2 font-mono text-[10px]',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0 animate-pulse', dotColor)} />
      <span>{label}</span>
    </span>
  );
}

// -------------------------------------------------------------
// 3. CARD / PANEL
// -------------------------------------------------------------
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200/90 rounded-[10px] p-5 shadow-card transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  title,
  subtitle,
  action,
  children,
}: {
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-3 mb-4 border-b border-slate-100',
        className
      )}
    >
      <div>
        {title && (
          <h3 className="text-sm font-black text-slate-900 tracking-tight font-display">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5 leading-tight">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
      {children}
    </div>
  );
}

// -------------------------------------------------------------
// 4. INPUT & FORM CONTROLS
// -------------------------------------------------------------
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-xs font-bold text-slate-800">
            {label}
            {props.required && <span className="text-amber-600 ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-10 px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-[8px] placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors disabled:bg-slate-50 disabled:text-slate-400',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/20',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-[11px] text-slate-500 leading-tight">{hint}</p>
        )}
        {error && (
          <p className="text-[11px] font-medium text-red-600 leading-tight">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// -------------------------------------------------------------
// 5. EMPTY STATE
// -------------------------------------------------------------
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[220px]',
        className
      )}
    >
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// -------------------------------------------------------------
// 6. SKELETON LOADER
// -------------------------------------------------------------
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse bg-slate-100 rounded-[6px]', className)}
      {...props}
    />
  );
}

// -------------------------------------------------------------
// 7. DIALOGS & NAVIGATION
// -------------------------------------------------------------
export * from './Modal';
export * from './Tabs';

