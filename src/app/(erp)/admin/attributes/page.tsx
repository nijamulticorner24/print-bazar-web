'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Edit2,
  Trash2,
  ListOrdered,
  Plus,
  Search,
  Check,
  X,
  Pencil,
  FileText,
  Upload,
  AlertCircle,
  Layers,
} from 'lucide-react';
import {
  api,
  resolveImageUrl,
  ReusableAttribute,
  ReusableAttributeOption,
} from '@/lib/api';
import { Modal } from '@/components/ui';

// Human-friendly mapping for supported input types
const TYPE_CONFIG = {
  SELECT: { label: 'Select Dropdown', code: 'SELECT' },
  RADIO: { label: 'Radio Buttons', code: 'RADIO' },
  CHECKBOX: { label: 'Checkboxes', code: 'CHECKBOX' },
  TEXT: { label: 'Text Input', code: 'TEXT' },
  TEXTAREA: { label: 'Text Box', code: 'TEXTAREA' },
} as const;

type SupportedType = keyof typeof TYPE_CONFIG;

export default function AdminAttributesPage() {
  const [attributes, setAttributes] = useState<ReusableAttribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form State: Add / Edit Attribute at Top
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<SupportedType>('SELECT');
  const [isOptionalAddOn, setIsOptionalAddOn] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Values Management Modal State
  const [valuesModalAttr, setValuesModalAttr] = useState<ReusableAttribute | null>(null);
  const [modalOptions, setModalOptions] = useState<ReusableAttributeOption[]>([]);
  const [valuesModalError, setValuesModalError] = useState<string | null>(null);
  const [valuesModalSuccess, setValuesModalSuccess] = useState<string | null>(null);
  const [isSavingValues, setIsSavingValues] = useState(false);

  // Individual Value Form inside Modal
  const [editingValIndex, setEditingValIndex] = useState<number | null>(null);
  const [valName, setValName] = useState('');
  const [includeImage, setIncludeImage] = useState(false);
  const [valImageUrl, setValImageUrl] = useState('');
  const [isUploadingValImg, setIsUploadingValImg] = useState(false);
  const [setFileCount, setSetFileCount] = useState(false);
  const [valFileCount, setValFileCount] = useState<number>(1);
  const [valFileSlotLabels, setValFileSlotLabels] = useState<string[]>(['']);
  const [valMinMegapixels, setValMinMegapixels] = useState<number>(1.5);
  const [valActive, setValActive] = useState(true);
  const valFileInputRef = useRef<HTMLInputElement>(null);

  // Load all attributes from API
  const loadAttributes = async () => {
    setIsLoading(true);
    try {
      const res = await api.adminListAttributes();
      setAttributes(res || []);
    } catch (err: any) {
      console.error('Failed to load attributes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttributes();
  }, []);

  // Handle Name Input change with auto-generated code
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (formError) setFormError(null);
  };

  // Reset Add/Edit Form at top
  const resetForm = () => {
    setEditingAttrId(null);
    setFormName('');
    setFormType('SELECT');
    setIsOptionalAddOn(false);
    setIsActive(true);
    setFormError(null);
  };

  // Start editing an existing attribute
  const startEdit = (attr: ReusableAttribute) => {
    setEditingAttrId(attr.id);
    setFormName(attr.name);
    const matchedType = (
      attr.type in TYPE_CONFIG ? attr.type : 'SELECT'
    ) as SupportedType;
    setFormType(matchedType);
    setIsActive(attr.isActive !== false);
    setIsOptionalAddOn(Boolean(attr.isOptionalAddOn || attr.options?.[0]?.isOptionalAddOn));
    setFormError(null);
    setFormSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save (Create or Update) Attribute
  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Please enter an attribute name.');
      return;
    }

    const generatedCode = formName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '');

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingAttrId) {
        // Update existing attribute
        const current = attributes.find((a) => a.id === editingAttrId);
        const updatedOptions = (current?.options || []).map((o) => ({
          ...o,
          isOptionalAddOn,
        }));
        await api.adminUpdateAttribute(editingAttrId, {
          name: formName.trim(),
          type: formType,
          isActive,
          isOptionalAddOn,
          options: updatedOptions,
        });
        setFormSuccess(`Attribute "${formName.trim()}" updated successfully.`);
      } else {
        // Create new attribute with initial sensible default option
        const initialOptions =
          formType === 'TEXT' || formType === 'TEXTAREA'
            ? []
            : [
                {
                  label: 'Default',
                  value: 'default',
                  priceModifier: 0,
                  priceModifierType: 'FIXED',
                  isDefault: true,
                  isActive: true,
                  isOptionalAddOn,
                },
              ];

        await api.adminCreateAttribute({
          name: formName.trim(),
          code: generatedCode,
          type: formType,
          isActive,
          isOptionalAddOn,
          options: initialOptions,
        });
        setFormSuccess(`Attribute "${formName.trim()}" created successfully.`);
      }

      resetForm();
      await loadAttributes();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save attribute.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete / Deactivate Attribute
  const handleDeleteAttribute = async (attr: ReusableAttribute) => {
    if (
      !confirm(
        `Are you sure you want to delete attribute "${attr.name}"? Products using this attribute will preserve their snapshots.`,
      )
    ) {
      return;
    }

    setActionLoadingId(attr.id);
    try {
      await api.adminDeleteAttribute(attr.id);
      if (editingAttrId === attr.id) {
        resetForm();
      }
      await loadAttributes();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete attribute.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==========================================
  // VALUES MODAL HANDLERS
  // ==========================================
  const openValuesModal = (attr: ReusableAttribute) => {
    setValuesModalAttr(attr);
    setValuesModalError(null);
    setValuesModalSuccess(null);
    setModalOptions(attr.options ? attr.options.map((o) => ({ ...o })) : []);
    resetValueForm();
  };

  const resetValueForm = () => {
    setEditingValIndex(null);
    setValName('');
    setIncludeImage(false);
    setValImageUrl('');
    setSetFileCount(false);
    setValFileCount(1);
    setValFileSlotLabels(['']);
    setValMinMegapixels(1.5);
    setValActive(true);
    setValuesModalError(null);
  };

  const handleStartEditValue = (idx: number) => {
    const opt = modalOptions[idx];
    if (!opt) return;
    setEditingValIndex(idx);
    setValName(opt.label || '');
    setIncludeImage(Boolean(opt.imageUrl));
    setValImageUrl(opt.imageUrl || '');
    const hasFiles = Boolean(opt.fileCount && opt.fileCount > 0);
    setSetFileCount(hasFiles);
    const count = opt.fileCount || 1;
    setValFileCount(count);
    setValMinMegapixels(opt.minMegapixels ? Number(opt.minMegapixels) : 1.5);
    if (opt.fileSlotLabels && opt.fileSlotLabels.length > 0) {
      setValFileSlotLabels([...opt.fileSlotLabels]);
    } else {
      setValFileSlotLabels(Array.from({ length: count }, () => ''));
    }
    setValActive(opt.isActive !== false);
    setValuesModalError(null);
  };

  const handleFileCountChange = (count: number) => {
    const safeCount = Math.max(1, Math.min(10, count));
    setValFileCount(safeCount);
    setValFileSlotLabels((prev) => {
      const updated = [...prev];
      while (updated.length < safeCount) {
        updated.push('');
      }
      return updated.slice(0, safeCount);
    });
  };

  const handleSlotLabelChange = (slotIdx: number, val: string) => {
    setValFileSlotLabels((prev) => {
      const updated = [...prev];
      updated[slotIdx] = val;
      return updated;
    });
  };

  const handleValImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingValImg(true);
    try {
      const res = await api.uploadReferenceImage(file);
      setValImageUrl(res.fileUrl);
    } catch (err: any) {
      alert(err?.message || 'Failed to upload image');
    } finally {
      setIsUploadingValImg(false);
    }
  };

  const handleSaveValueRow = async () => {
    if (!valuesModalAttr) return;
    if (!valName.trim()) {
      setValuesModalError('Value Name is required.');
      return;
    }

    const valueCode = valName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '');

    const newOpt: ReusableAttributeOption = {
      label: valName.trim(),
      value:
        editingValIndex !== null && modalOptions[editingValIndex]?.value
          ? modalOptions[editingValIndex].value
          : valueCode,
      isActive: valActive,
      imageUrl: includeImage && valImageUrl ? valImageUrl : null,
      fileCount: setFileCount ? Math.max(1, Math.floor(Number(valFileCount) || 1)) : null,
      fileSlotLabels: setFileCount
        ? valFileSlotLabels.map((s) => s.trim()).filter((s) => s.length > 0)
        : undefined,
      minMegapixels: setFileCount
        ? Number(valMinMegapixels) > 0
          ? Number(valMinMegapixels)
          : 1.5
        : null,
      isDefault:
        editingValIndex !== null
          ? modalOptions[editingValIndex]?.isDefault
          : modalOptions.length === 0,
      priceModifier:
        editingValIndex !== null ? modalOptions[editingValIndex]?.priceModifier : 0,
      priceModifierType:
        editingValIndex !== null
          ? modalOptions[editingValIndex]?.priceModifierType || 'FIXED'
          : 'FIXED',
    };

    let updatedList: ReusableAttributeOption[];
    if (editingValIndex !== null) {
      updatedList = modalOptions.map((o, i) => (i === editingValIndex ? newOpt : o));
    } else {
      updatedList = [...modalOptions, newOpt];
    }

    setIsSavingValues(true);
    setValuesModalError(null);
    try {
      await api.adminUpdateAttribute(valuesModalAttr.id, { options: updatedList });
      setModalOptions(updatedList);
      setValuesModalAttr({ ...valuesModalAttr, options: updatedList });
      resetValueForm();
      setValuesModalSuccess(
        editingValIndex !== null
          ? `Value "${newOpt.label}" updated.`
          : `Value "${newOpt.label}" added.`,
      );
      setTimeout(() => setValuesModalSuccess(null), 3000);
      await loadAttributes();
    } catch (err: any) {
      setValuesModalError(err?.message || 'Failed to save attribute value.');
    } finally {
      setIsSavingValues(false);
    }
  };

  const handleDeleteValue = async (idx: number) => {
    if (!valuesModalAttr) return;
    const opt = modalOptions[idx];
    if (!confirm(`Are you sure you want to delete value "${opt?.label}"?`)) return;

    const updated = modalOptions.filter((_, i) => i !== idx);
    setModalOptions(updated);
    if (editingValIndex === idx) {
      resetValueForm();
    } else if (editingValIndex !== null && editingValIndex > idx) {
      setEditingValIndex(editingValIndex - 1);
    }

    setIsSavingValues(true);
    try {
      await api.adminUpdateAttribute(valuesModalAttr.id, { options: updated });
      setValuesModalAttr({ ...valuesModalAttr, options: updated });
      await loadAttributes();
    } catch (err: any) {
      setValuesModalError(err?.message || 'Failed to delete value.');
    } finally {
      setIsSavingValues(false);
    }
  };

  // Filtered attribute list
  const filteredAttributes = useMemo(() => {
    return attributes.filter((attr) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = attr.name.toLowerCase().includes(q);
        const matchesCode = attr.code.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && attr.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const isActiveAttr = attr.isActive !== false;
        if (statusFilter === 'ACTIVE' && !isActiveAttr) return false;
        if (statusFilter === 'INACTIVE' && isActiveAttr) return false;
      }

      return true;
    });
  }, [attributes, searchQuery, typeFilter, statusFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ============================================================ */}
      {/* 1. PAGE HEADER */}
      {/* ============================================================ */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
          Product Attributes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Create reusable product options and manage their available values.
        </p>
      </div>

      {/* ============================================================ */}
      {/* 2. ADD / EDIT ATTRIBUTE FORM */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFED00] ring-4 ring-[#FFED00]/30" />
            <h2 className="text-sm font-bold text-[#0F172A]">
              {editingAttrId ? `Edit Attribute` : `Add New Attribute`}
            </h2>
          </div>
          {editingAttrId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* Feedback Alerts */}
        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-red-500 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setFormSuccess(null)}
              className="text-emerald-600 hover:text-emerald-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSaveAttribute} className="space-y-4">
          {/* Row 1: Name and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Material, Size, Lamination"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F172A] focus:bg-white transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as SupportedType)}
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F172A] focus:bg-white transition-colors"
              >
                <option value="SELECT">Select Dropdown</option>
                <option value="RADIO">Radio Buttons</option>
                <option value="CHECKBOX">Checkboxes</option>
                <option value="TEXT">Text Input</option>
                <option value="TEXTAREA">Text Box</option>
              </select>
            </div>
          </div>

          {/* Row 2: Optional add-on and Active */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isOptionalAddOn}
                  onChange={(e) => setIsOptionalAddOn(e.target.checked)}
                  className="w-4 h-4 accent-[#0F172A] rounded border-slate-300"
                />
                <span className="text-xs font-medium text-slate-700">
                  Optional add-on
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#0F172A] rounded border-slate-300"
                />
                <span className="text-xs font-medium text-slate-700">
                  Active
                </span>
              </label>
            </div>

            {/* Primary Save Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving
                ? 'SAVING...'
                : editingAttrId
                ? 'UPDATE ATTRIBUTE'
                : 'SAVE ATTRIBUTE'}
            </button>
          </div>
        </form>
      </div>

      {/* ============================================================ */}
      {/* 3. ATTRIBUTE LIST & SEARCH */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden space-y-4 p-5">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search attributes..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F172A] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Filter by Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-2.5 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F172A] text-slate-700"
            >
              <option value="ALL">All Types</option>
              <option value="SELECT">Select Dropdown</option>
              <option value="RADIO">Radio Buttons</option>
              <option value="CHECKBOX">Checkboxes</option>
              <option value="TEXT">Text Input</option>
              <option value="TEXTAREA">Text Box</option>
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F172A] text-slate-700"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              {filteredAttributes.length} item{filteredAttributes.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="border border-[#E2E8F0] rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-50 border-b border-[#E2E8F0] text-slate-500 uppercase text-[11px] font-mono font-semibold">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Values Count</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs font-mono text-slate-400">
                    Loading attributes library...
                  </td>
                </tr>
              ) : filteredAttributes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                    No attributes found. Create an attribute to get started.
                  </td>
                </tr>
              ) : (
                filteredAttributes.map((attr) => {
                  const valuesCount = attr.options?.length || 0;
                  const typeLabel =
                    attr.type in TYPE_CONFIG
                      ? TYPE_CONFIG[attr.type as SupportedType].label
                      : attr.type;
                  const isAttrActive = attr.isActive !== false;

                  return (
                    <tr
                      key={attr.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        editingAttrId === attr.id ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {attr.name}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          code: {attr.code}
                        </span>
                      </td>

                      {/* Type & Add-on Badge */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                            {typeLabel}
                          </span>
                          {Boolean(attr.isOptionalAddOn || attr.options?.[0]?.isOptionalAddOn) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Optional Add-on
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            isAttrActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isAttrActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Values Count */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {attr.type === 'TEXT' || attr.type === 'TEXTAREA' ? (
                          <span className="text-slate-400 italic font-sans text-[11px]">
                            Freeform Text
                          </span>
                        ) : (
                          <span>
                            {valuesCount} {valuesCount === 1 ? 'value' : 'values'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Values Button */}
                          <button
                            type="button"
                            onClick={() => openValuesModal(attr)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                            title="Manage Attribute Values"
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                            <span>Values</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => startEdit(attr)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Edit Attribute"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteAttribute(attr)}
                            disabled={actionLoadingId === attr.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors cursor-pointer"
                            title="Delete Attribute"
                          >
                            <Trash2 className="w-4 h-4" />
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
      {/* 4. EXACT VALUES MANAGEMENT MODAL (AS IN SCREENSHOT) */}
      {/* ============================================================ */}
      <Modal
        isOpen={Boolean(valuesModalAttr)}
        onClose={() => setValuesModalAttr(null)}
        title={
          valuesModalAttr ? (
            <span className="text-base sm:text-lg font-bold text-[#0F172A]">
              Values for{' '}
              <span className="text-[#2563EB]">{valuesModalAttr.name}</span>
            </span>
          ) : (
            'Values'
          )
        }
        maxWidth="xl"
      >
        <div className="space-y-4 p-1 text-xs">
          {/* Alerts */}
          {valuesModalError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{valuesModalError}</span>
              </div>
              <button
                type="button"
                onClick={() => setValuesModalError(null)}
                className="text-red-500 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {valuesModalSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{valuesModalSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setValuesModalSuccess(null)}
                className="text-emerald-600 hover:text-emerald-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {valuesModalAttr?.type === 'TEXT' || valuesModalAttr?.type === 'TEXTAREA' ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <Layers className="w-8 h-8 mx-auto text-slate-400" />
              <h4 className="font-semibold text-slate-900 text-sm">
                {valuesModalAttr?.type === 'TEXTAREA' ? 'Text Box' : 'Text Input'} Attribute
              </h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                {valuesModalAttr?.type === 'TEXTAREA' ? 'Text Box' : 'Text Input'} attributes capture custom freeform customer input (such as names, custom dimensions, or notes) and do not require predefined option values.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Form Section */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Value Name
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="text"
                      value={valName}
                      onChange={(e) => setValName(e.target.value)}
                      placeholder="e.g. Custom Printed, PVC White"
                      className="flex-1 h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    />

                    {/* Checkboxes aligned horizontally */}
                    <div className="flex items-center gap-4 shrink-0 flex-wrap">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={includeImage}
                          onChange={(e) => setIncludeImage(e.target.checked)}
                          className="w-4 h-4 accent-blue-600 rounded border-slate-300"
                        />
                        <span>include image ?</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={setFileCount}
                          onChange={(e) => {
                            setSetFileCount(e.target.checked);
                            if (e.target.checked && valFileSlotLabels.length === 0) {
                              setValFileSlotLabels(['']);
                            }
                          }}
                          className="w-4 h-4 accent-blue-600 rounded border-slate-300"
                        />
                        <span>Set File Count?</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={valActive}
                          onChange={(e) => setValActive(e.target.checked)}
                          className="w-4 h-4 accent-blue-600 rounded border-slate-300"
                        />
                        <span>Active</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Conditional Set File Count Box (Matching Screenshot Exactly) */}
                {setFileCount && (
                  <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-200/90 space-y-3.5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          File Count (Qty)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={valFileCount}
                          onChange={(e) =>
                            handleFileCountChange(Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-purple-600 transition-colors font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          Minimum Image Resolution (MP)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={valMinMegapixels}
                            onChange={(e) =>
                              setValMinMegapixels(parseFloat(e.target.value) || 1.5)
                            }
                            placeholder="1.5"
                            className="w-full h-10 px-3 pr-10 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-purple-600 transition-colors font-mono font-bold"
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-purple-700">
                            MP
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200/80 text-[11px] text-purple-900 flex items-start gap-2">
                      <span className="font-bold shrink-0">Client Quality Gate:</span>
                      <span>
                        Client-side upload will strictly enforce minimum <strong>{valMinMegapixels || 1.5} MP</strong> resolution (e.g. 1500×1000px). Uploads below this threshold are blocked. Maximum resolution has no limit.
                      </span>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wide mb-2">
                        CUSTOM LABELS PER FILE SLOT ({valFileCount})
                      </div>
                      <div className="space-y-2.5">
                        {Array.from({ length: valFileCount }).map((_, slotIdx) => (
                          <div key={slotIdx}>
                            <label className="block text-[11px] text-purple-700 font-semibold mb-1">
                              File Slot {slotIdx + 1} Label:
                            </label>
                            <input
                              type="text"
                              value={valFileSlotLabels[slotIdx] || ''}
                              onChange={(e) =>
                                handleSlotLabelChange(slotIdx, e.target.value)
                              }
                              placeholder={
                                slotIdx === 0
                                  ? 'e.g. Front Side Image'
                                  : slotIdx === 1
                                  ? 'e.g. Back Side Image'
                                  : `e.g. Artwork Slot ${slotIdx + 1}`
                              }
                              className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-purple-600 transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Include Image Upload */}
                {includeImage && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-150">
                    <span className="block text-xs font-semibold text-slate-800">
                      Value Image / Preview
                    </span>
                    {valImageUrl ? (
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={resolveImageUrl(valImageUrl)}
                            alt="Preview"
                            className="w-9 h-9 rounded object-cover border border-slate-200"
                          />
                          <span className="text-xs text-slate-600 truncate max-w-[200px]">
                            Image configured
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setValImageUrl('')}
                          className="text-xs text-red-600 hover:underline px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          ref={valFileInputRef}
                          onChange={handleValImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => valFileInputRef.current?.click()}
                          disabled={isUploadingValImg}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {isUploadingValImg ? 'Uploading...' : 'Choose Image File'}
                          </span>
                        </button>
                        <span className="text-[11px] text-slate-400">
                          PNG, JPG, WebP supported
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Big Yellow Button (as in reference screenshot) */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveValueRow}
                    disabled={isSavingValues}
                    className="w-full py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] transition-colors shadow-xs cursor-pointer text-center disabled:opacity-50"
                  >
                    {isSavingValues
                      ? 'SAVING...'
                      : editingValIndex !== null
                      ? 'UPDATE VALUE'
                      : 'ADD VALUE'}
                  </button>
                  {editingValIndex !== null && (
                    <button
                      type="button"
                      onClick={resetValueForm}
                      className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* ============================================================ */}
              {/* Values List Cards (Matching 3-column screenshot layout) */}
              {/* ============================================================ */}
              <div className="pt-2">
                {modalOptions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    No values added yet. Use the form above to add one.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {modalOptions.map((opt, idx) => {
                      const isValActive = opt.isActive !== false;
                      const hasFileCount =
                        opt.fileCount !== undefined &&
                        opt.fileCount !== null &&
                        Number(opt.fileCount) > 0;
                      const hasImage = Boolean(opt.imageUrl);

                      return (
                        <div
                          key={idx}
                          className={`p-2.5 px-3 rounded-xl border bg-white transition-all shadow-2xs space-y-1 ${
                            editingValIndex === idx
                              ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/30'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Card Header: dot + name + pencil/trash */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isValActive ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              />
                              <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                                {opt.label}
                              </span>
                            </div>

                            {/* Actions: Blue Pencil & Red Trash */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditValue(idx)}
                                className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                title="Edit value"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteValue(idx)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Delete value"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Card Footer Badges: File Count / Image (if configured) */}
                          {(hasFileCount || hasImage) && (
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {hasFileCount && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                  <FileText className="w-2.5 h-2.5 shrink-0" />
                                  <span>
                                    Count: {opt.fileCount} • Min {opt.minMegapixels || 1.5} MP
                                    {opt.fileSlotLabels && opt.fileSlotLabels.length > 0
                                      ? ` (${opt.fileSlotLabels.join(', ')})`
                                      : ''}
                                  </span>
                                </span>
                              )}

                              {hasImage && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  <img
                                    src={resolveImageUrl(opt.imageUrl!)}
                                    alt=""
                                    className="w-3 h-3 rounded object-cover"
                                  />
                                  <span>Image</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
