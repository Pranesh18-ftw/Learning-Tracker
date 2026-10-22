import React from 'react';
import {
  Zap,
  CheckCircle2,
  Map,
  Sparkles,
  GitFork,
  Clock
} from 'lucide-react';
import { ConceptSchematicGlyph } from './ConceptObject';

/**
 * PathWeeklyRoute
 *
 * Editorial route stops for the current learning cycle (not a generic calendar).
 * Shows:
 * - 01 BUILD A BASE
 * - 02 TEST THE IDEA
 * - 03 APPLY IT
 * - 04 RETRIEVE & CONSOLIDATE
 *
 * Each stop displays:
 * - Why this comes next (pedagogical reason)
 * - Practical Task Mode (adapted for laptop / kit / lab)
 * - Estimated time
 * - Direct connection to NOW (one-click challenge launch)
 * - Detour exploration trigger
 */
const PathWeeklyRoute = ({
  routeStops = [],
  onContinueInNow,
  onViewInWorld,
  onExploreDetour,
  onCompleteStop
}) => {
  if (routeStops.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0F172A] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
        <Sparkles className="w-8 h-8 text-electric-500 mx-auto" />
        <h3 className="font-display font-black text-lg text-slate-900 dark:text-white">
          Build your first route.
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Select concepts from World or let Path map your schedule based on your available time and hardware.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Route Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b-2 border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="font-display font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">
            Active Route Sequence
          </h2>
          <p className="text-xs font-semibold text-slate-400">
            {routeStops.length} structured stops calibrated to your time & hardware
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-coral-500" /> Current Stop
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> Upcoming Stop
          </span>
        </div>
      </div>

      {/* Route Stops List */}
      <div className="space-y-4">
        {routeStops.map((stop, idx) => {
          const isFirst = stop.isCurrentStop;
          const isDone = stop.isCompleted;

          return (
            <div
              key={stop.id || idx}
              className={`relative rounded-3xl border-2 transition-all p-5 sm:p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 ${
                isFirst
                  ? 'border-coral-500 bg-white dark:bg-[#0F172A] shadow-md shadow-coral-500/5 ring-1 ring-coral-500/20'
                  : isDone
                    ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#0F172A]/70'
              }`}
            >

              {/* Left Column: Number, Glyph & Core Details */}
              <div className="flex items-start gap-4 flex-1">

                {/* Stage Code Badge */}
                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-mono font-black shrink-0 border-2 ${
                  isFirst
                    ? 'bg-coral-500 border-coral-500 text-white shadow-xs'
                    : isDone
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  <span className="text-[10px] uppercase font-sans">Stop</span>
                  <span className="text-sm leading-none">{stop.stageCode}</span>
                </div>

                <div className="space-y-2.5 flex-1 min-w-0">

                  {/* Badges: Timing, Route Type, Mode */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${stop.routeType.color}`}>
                      {stop.routeType.badge}
                    </span>

                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${stop.modeInfo.tagColor}`}>
                      {stop.modeInfo.label}
                    </span>

                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{stop.estimatedMinutes} min
                    </span>

                    {isFirst && (
                      <span className="bg-coral-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-xs">
                        ● Priority Today
                      </span>
                    )}
                  </div>

                  {/* Concept Title & Schematic Symbol */}
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 shrink-0">
                      <ConceptSchematicGlyph
                        glyph={stop.glyph}
                        isCurrent={isFirst}
                        isCompleted={isDone}
                        className="w-5 h-5"
                      />
                    </div>
                    <h3 className="font-display font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight leading-snug">
                      {stop.name}
                    </h3>
                  </div>

                  {/* Why this is here (Pedagogical Rationale) */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-electric-600 dark:text-electric-400 block">
                      Why this comes next:
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      {stop.whyItComesNext}
                    </p>
                    {stop.modeInfo.note && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300/90 font-medium italic pt-1 border-t border-slate-200/60 dark:border-slate-800/60 mt-1">
                        💡 {stop.modeInfo.note}
                      </p>
                    )}
                  </div>

                  {/* Next Concrete Milestone */}
                  {stop.targetSubtask && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span className="text-slate-400 font-mono text-[11px]">Milestone:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold truncate">
                        {stop.targetSubtask.name}
                      </span>
                    </div>
                  )}

                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end justify-between gap-2.5 shrink-0 self-stretch md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">

                {/* Primary Action: Continue in NOW */}
                <button
                  onClick={() => onContinueInNow(stop)}
                  className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-all ${
                    isFirst
                      ? 'bg-coral-500 hover:bg-coral-600 text-white shadow-coral-500/20 hover:scale-[1.02]'
                      : 'bg-electric-600 hover:bg-electric-700 text-white'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  {isFirst ? 'Focus in NOW' : 'Schedule for NOW'}
                </button>

                {/* Secondary Actions: World & Detour */}
                <div className="flex items-center gap-1.5 w-full md:w-auto justify-end">

                  {/* Mark complete directly */}
                  <button
                    onClick={() => onCompleteStop(stop)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 hover:border-emerald-500 transition-colors"
                    title="Mark Stop Established"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  {/* View in World */}
                  <button
                    onClick={() => onViewInWorld(stop)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-electric-500 hover:text-electric-600 transition-colors"
                    title="Inspect in Knowledge World"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>World</span>
                  </button>

                  {/* Detour */}
                  <button
                    onClick={() => onExploreDetour(stop)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-purple-500 hover:text-purple-600 transition-colors"
                    title="Explore Curiosity Detour"
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    <span>Detour</span>
                  </button>
                </div>

              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PathWeeklyRoute;
