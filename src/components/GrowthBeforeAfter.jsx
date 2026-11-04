/**
 * GrowthBeforeAfter.jsx
 *
 * Interactive Before → After Capability Scrubber.
 * Gives the visceral feeling: "I wasn't here before."
 */

import React, { useState } from 'react';
import { Sliders, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

const GrowthBeforeAfter = ({ beforeAfterData }) => {
  const { earlierLabel = 'Earlier Baseline', nowLabel = 'Current Capability', items = [] } = beforeAfterData || {};

  // scrubPosition: 0 = earlier, 1 = current
  const [scrubPosition, setScrubPosition] = useState(1);

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">

      {/* Header & Concept Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Transformation Mirror
          </span>
          <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white">
            Before → After
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
            Scrub through time to see how your conceptual independence evolved.
          </p>
        </div>

        {/* Time Scrubber Control */}
        {items && items.length > 0 && (
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 sm:gap-3 max-w-full">
            <button
              onClick={() => setScrubPosition(0)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                scrubPosition === 0
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {earlierLabel}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={scrubPosition}
              onChange={(e) => setScrubPosition(parseFloat(e.target.value))}
              className="w-24 sm:w-32 accent-emerald-500 cursor-pointer"
              aria-label="Time progression scrubber"
            />

            <button
              onClick={() => setScrubPosition(1)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                scrubPosition === 1
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {nowLabel}
            </button>
          </div>
        )}
      </div>

      {(!items || items.length === 0) ? (
        <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="font-display font-bold text-slate-700 dark:text-slate-300 text-sm">
            No conceptual history yet.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-md mx-auto">
            Complete roadmap exercises and unassisted retrieval sessions to see your before and after evolution.
          </p>
        </div>
      ) : (
        <>
          {/* Grid of Concept Progression Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => {
          // Compute interpolated state based on scrubber
          const isAtStart = scrubPosition <= 0.3;
          const isAtEnd = scrubPosition >= 0.7;

          let displayStatus = isAtStart ? item.earlierStatus : item.nowStatus;
          if (!isAtStart && !isAtEnd) {
            displayStatus = item.nowStatus === 'proven' ? 'practiced' : item.earlierStatus;
          }

          let badgeBg = 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400';
          let statusLabel = 'Unattempted';
          let StatusIcon = XCircle;

          if (displayStatus === 'proven') {
            badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-600 dark:text-emerald-300';
            statusLabel = 'Unassisted Recall Recorded';
            StatusIcon = CheckCircle2;
          } else if (displayStatus === 'practiced') {
            badgeBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-600 dark:text-amber-300';
            statusLabel = 'Completed / Practiced';
            StatusIcon = AlertCircle;
          }

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${badgeBg}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-bold">
                    {item.phaseName || 'Core Topic'}
                  </span>
                  <h4 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {item.name}
                  </h4>
                </div>

                <div className="shrink-0 pt-0.5">
                  <StatusIcon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold">
                  {statusLabel}
                </span>

                {item.isChanged && scrubPosition > 0.5 && (
                  <span className="text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center gap-0.5">
                    <span>↑</span> Improved
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

        {/* Visceral Footer */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-500" />
            <span>
              {scrubPosition === 1 ? 'Showing current capability state' : 'Showing earlier baseline before practice sessions'}
            </span>
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {items.filter(i => i.nowStatus === 'proven').length} Unassisted Recall · {items.filter(i => i.nowStatus === 'practiced').length} Completed
          </span>
        </div>
      </>
      )}

    </section>
  );
};

export default GrowthBeforeAfter;
