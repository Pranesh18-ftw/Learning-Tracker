/**
 * IdentityRealityCheckSummary.jsx
 *
 * REALITY CHECK SUMMARY
 * "YOUR CURRENT REALITY"
 *
 * Strict rule:
 * No arbitrary gamified numbers or fake psychological scores (e.g. "Capacity = 62").
 * Uses qualitative, grounded factual indicators.
 */

import React from 'react';
import { Activity, CheckCircle2, ShieldCheck } from 'lucide-react';

const IdentityRealityCheckSummary = ({
  realitySummary = {}
}) => {
  const {
    time = { label: '35 min weekdays', meter: 60 },
    hardware = { label: 'Basic Hardware Kit', meter: 60, isSimulationOnly: false },
    lab = { label: 'College lab (weekends)', meter: 70 },
    internet = { label: 'Reliable', meter: 90 },
    feasibility = {
      status: 'feasible',
      badge: '✓ FEASIBLE ROUTE',
      note: 'Route adapts to your available resources.'
    }
  } = realitySummary;

  const rows = [
    { label: 'Time Capacity', value: time.label, meter: time.meter, color: 'bg-emerald-500' },
    { label: 'Hardware Profile', value: hardware.label, meter: hardware.meter, color: 'bg-amber-500' },
    { label: 'Physical Workspace', value: lab.label, meter: lab.meter, color: 'bg-violet-500' },
    { label: 'Connectivity', value: internet.label, meter: internet.meter, color: 'bg-electric-500' }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-slate-800 text-white rounded-3xl p-6 sm:p-7 shadow-md space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
            Reality Check · Grounded Feasibility
          </span>
        </div>

        <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{feasibility.badge}</span>
        </span>
      </div>

      {/* Visual Meters Grid */}
      <div className="space-y-3.5 pt-1">
        {rows.map((row, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">{row.label}</span>
              <span className="font-bold text-slate-200">{row.value}</span>
            </div>

            {/* Custom Meter Track */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
              <div
                className={`h-full rounded-full transition-all duration-500 ${row.color}`}
                style={{ width: `${Math.min(100, Math.max(10, row.meter))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Feasibility Note */}
      <div className="pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs font-mono text-slate-300">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="font-sans text-slate-300 leading-relaxed">
          {feasibility.note}
        </p>
      </div>

    </div>
  );
};

export default IdentityRealityCheckSummary;
