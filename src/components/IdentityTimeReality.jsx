/**
 * IdentityTimeReality.jsx
 *
 * Third Section: TIME REALITY
 * "WHAT TIME DO YOU REALISTICALLY HAVE?"
 *
 * Never asks for ideal theoretical study blocks.
 * Calibrates to real constraints:
 * Weekdays: 20m, 30m, 35m, 45m, 60m
 * Saturday / Sunday: Realistic weekend allocations
 */

import React from 'react';
import { Clock, Zap } from 'lucide-react';

const WEEKDAY_PRESETS = [20, 30, 35, 45, 60];
const SATURDAY_PRESETS = [1, 2, 3, 4];
const SUNDAY_PRESETS = [0.5, 1, 2, 3];

const IdentityTimeReality = ({
  timeReality = {},
  onUpdateTimeReality
}) => {
  const weekdayMins = timeReality.weekdayMinutes || 35;
  const satHours = timeReality.saturdayHours || 2;
  const sunHours = timeReality.sundayHours || 1;

  // Calculate total realistic weekly capacity
  const weeklyTotalHours = Number(((weekdayMins * 5) / 60 + satHours + sunHours).toFixed(1));

  const handleUpdate = (updates) => {
    onUpdateTimeReality({
      ...timeReality,
      ...updates
    });
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Section 03 · Time Reality
            </span>
            <h2 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
              What time do you realistically have?
            </h2>
          </div>
        </div>

        {/* Weekly Capacity Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
          <Zap className="w-3.5 h-3.5 text-emerald-500" />
          <span>~{weeklyTotalHours} hrs / week total</span>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
        The system plans around the authentic shape of your life. A realistic 30-minute session completed every weekday consistently outperforms an idealized 4-hour weekend cram session.
      </p>

      {/* Grid of Time Allocations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* 1. Weekday Allocation */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-700 dark:text-slate-300">
              Monday – Friday
            </span>
            <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
              {weekdayMins} min / day
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleUpdate({ weekdayMinutes: m })}
                className={`flex-1 min-w-[50px] py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                  weekdayMins === m
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>

          {/* Slider for fine adjustment */}
          <input
            type="range"
            min="15"
            max="90"
            step="5"
            value={weekdayMins}
            onChange={(e) => handleUpdate({ weekdayMinutes: Number(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer"
          />

          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 block">
            Feeds directly into daily challenge sizing in Now & Path.
          </span>
        </div>

        {/* 2. Saturday Allocation */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-700 dark:text-slate-300">
              Saturday
            </span>
            <span className="text-xs font-mono font-black text-electric-600 dark:text-electric-400">
              {satHours} hrs
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SATURDAY_PRESETS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => handleUpdate({ saturdayHours: h })}
                className={`flex-1 min-w-[50px] py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                  satHours === h
                    ? 'bg-electric-600 text-white border-electric-700 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 block pt-4">
            Ideal for deeper project builds, lab work, or circuit assembly.
          </span>
        </div>

        {/* 3. Sunday Allocation */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-700 dark:text-slate-300">
              Sunday
            </span>
            <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
              {sunHours === 0.5 ? '30 min' : `${sunHours} hrs`}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUNDAY_PRESETS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => handleUpdate({ sundayHours: h })}
                className={`flex-1 min-w-[50px] py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                  sunHours === h
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {h === 0.5 ? '30m' : `${h}h`}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 block pt-4">
            Used for conceptual review, synthesis, and route preview.
          </span>
        </div>

      </div>

    </section>
  );
};

export default IdentityTimeReality;
