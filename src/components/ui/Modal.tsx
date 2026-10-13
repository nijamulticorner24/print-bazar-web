'use client';

import React, { useEffect } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { cn } from './index';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog Body */}
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200',
          maxWidthMap[maxWidth]
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              {title && (
                <h3 className="text-base font-black text-slate-900 tracking-tight font-display">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <RiCloseLine className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
