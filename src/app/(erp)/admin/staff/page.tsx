'use client';

import { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Clock,
  CheckCircle,
  Plus,
  KeyRound,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  shift: string;
  station: string;
  status: 'ACTIVE_ON_FLOOR' | 'OFF_SHIFT';
}

const STAFF_ROSTER: StaffMember[] = [
  {
    id: 'EMP-01',
    name: 'Vikramaditya Rao',
    role: 'ADMIN_MANAGER',
    department: 'MANAGEMENT',
    shift: 'General (09:00 - 18:00)',
    station: 'Central Production Office',
    status: 'ACTIVE_ON_FLOOR',
  },
  {
    id: 'EMP-02',
    name: 'Rajesh Kumar',
    role: 'PRODUCTION_OPERATOR',
    department: 'PRESS_OPERATIONS',
    shift: 'Shift A (06:00 - 14:00)',
    station: 'HP Indigo 12000 Station',
    status: 'ACTIVE_ON_FLOOR',
  },
  {
    id: 'EMP-03',
    name: 'Sneha Patil',
    role: 'DESIGNER_PREPRESS',
    department: 'PREPRESS',
    shift: 'General (09:00 - 18:00)',
    station: 'Esko & PitStop Workstation 01',
    status: 'ACTIVE_ON_FLOOR',
  },
  {
    id: 'EMP-04',
    name: 'Mahesh Shinde',
    role: 'OPERATIONAL_MANAGER',
    department: 'OPERATIONS',
    shift: 'General (09:00 - 18:00)',
    station: 'Operations Command Center',
    status: 'ACTIVE_ON_FLOOR',
  },
  {
    id: 'EMP-05',
    name: 'Anita Desai',
    role: 'FINAL_QC_INSPECTOR',
    department: 'QUALITY_ASSURANCE',
    shift: 'Shift A (06:00 - 14:00)',
    station: 'Physical Inspection Lightbox D50',
    status: 'ACTIVE_ON_FLOOR',
  },
  {
    id: 'EMP-06',
    name: 'Sunil Varma',
    role: 'PACKING_OPERATOR',
    department: 'PACKAGING',
    shift: 'Shift A (06:00 - 14:00)',
    station: 'Digital Scale Weigh Station 02',
    status: 'ACTIVE_ON_FLOOR',
  },
  {
    id: 'EMP-07',
    name: 'Karan Mehra',
    role: 'DISPATCH_LOGISTICS',
    department: 'LOGISTICS',
    shift: 'Shift A (06:00 - 14:00)',
    station: 'Courier Bay & Store Counter',
    status: 'ACTIVE_ON_FLOOR',
  },
];

export default function StaffAdminPage() {
  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            <span>FACTORY ROSTER & RBAC</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">SHOP-FLOOR OPERATORS</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Staff Roster & Role-Based Permissions
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Active plant shifts, station allocations, and role-based permissions matrix for 10 factory roles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] px-3.5 py-2 rounded-lg shadow-sm transition">
            <Plus className="h-4 w-4" />
            <span>Assign Operator to Shift</span>
          </button>
        </div>
      </div>

      {/* 2. Roster Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-[12px] font-semibold text-slate-700 uppercase tracking-wider">
            Active Shift Operators (7 On-Duty)
          </h2>
          <span className="text-[11px] font-mono text-slate-400">Shift A (06:00 - 14:00)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-mono text-[12px] font-semibold uppercase bg-slate-50">
                <th className="p-3.5">EMPLOYEE</th>
                <th className="p-3.5">ROLE (RBAC)</th>
                <th className="p-3.5">DEPARTMENT</th>
                <th className="p-3.5">ASSIGNED STATION</th>
                <th className="p-3.5">SHIFT</th>
                <th className="p-3.5 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {STAFF_ROSTER.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-slate-900 text-amber-300 font-semibold flex items-center justify-center text-[10px] shrink-0">
                        {staff.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold text-[13px]">{staff.name}</strong>
                        <span className="text-[11px] font-mono text-slate-400">{staff.id}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5">
                    <span className="bg-slate-900 text-amber-300 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full">
                      {staff.role}
                    </span>
                  </td>

                  <td className="p-3.5 font-mono text-slate-600 text-[12px]">
                    {staff.department}
                  </td>

                  <td className="p-3.5 text-[13px] font-medium text-slate-900">
                    {staff.station}
                  </td>

                  <td className="p-3.5 text-[12px] text-slate-500 font-mono">
                    {staff.shift}
                  </td>

                  <td className="p-3.5 text-right">
                    <span className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ON DUTY
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
