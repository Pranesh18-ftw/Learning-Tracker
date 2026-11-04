import React from 'react';
import { Compass } from 'lucide-react';

/**
 * PathDestinationHeader
 *
 * Top-level destination banner and route expedition thread.
 * Distinguishes:
 * - DESTINATION (What the learner is trying to achieve)
 * - ROUTE THREAD (Foundations -> Current Stage -> Applications -> Project Evidence)
 * - EVIDENCE-BASED METRICS (No fake percentages)
 */
const PathDestinationHeader = ({
  destination,
  subjects = [],
  selectedSubjectId,
  onSelectSubject,
  currentPhaseName = 'Foundations',
  phases = []
}) => {
  return (
    <header className="space-y-6">

      {/* ── TOP BADGE & SUBJECT DOMAIN PILLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-electric-600 dark:text-electric-400">
          <Compass className="w-4 h-4 text-electric-500 animate-spin-slow" />
          <span>Active Learning Route · Destination Planning</span>
        </div>

        {/* Subject Domain Pills */}
        {subjects.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
            {subjects.map(subj => {
              const isActive = subj.id === selectedSubjectId;
              return (
                <button
                  key={subj.id}
                  onClick={() => onSelectSubject(subj.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-electric-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  {subj.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── DESTINATION HERO CARD ── */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-[#0F172A] dark:to-[#0B0F19] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-electric-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="text-[11px] font-mono uppercase tracking-widest font-black text-coral-600 dark:text-coral-400">
                Your Destination Goal
              </span>
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white tracking-tight leading-tight">
                {destination.title}
              </h1>
              <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                {destination.targetCapability}
              </p>
            </div>

            {/* Evidence-Based Metrics */}
            <div className="flex flex-row md:flex-col gap-2 shrink-0 self-start sm:self-auto">
              <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-4 py-2.5 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Capabilities In Route
                </span>
                <span className="font-display font-black text-xl text-electric-600 dark:text-electric-400">
                  {destination.totalCapabilities}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-4 py-2.5 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Currently Developing
                </span>
                <span className="font-display font-black text-xl text-coral-600 dark:text-coral-400">
                  {destination.developingCapabilities}
                </span>
              </div>
            </div>
          </div>

          {/* ── EXPEDITION ROUTE THREAD ("WHERE YOU ARE") ── */}
          <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider">Route Expedition Thread</span>
              <span className="text-coral-600 dark:text-coral-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-coral-500 animate-pulse" />
                Current Stage: {currentPhaseName}
              </span>
            </div>

            {/* Horizontal Route Stages Conduits */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {phases.slice(0, 4).map((phase, idx) => {
                const isCurrent = phase.name.toLowerCase() === currentPhaseName.toLowerCase();
                const allDone = (phase.tasks || []).every(t => t.completed);

                return (
                  <div
                    key={phase.id || idx}
                    className={`relative rounded-2xl p-3 border-2 transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'border-coral-500 bg-coral-50/50 dark:bg-coral-950/30 text-coral-950 dark:text-coral-100 shadow-sm'
                        : allDone
                          ? 'border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200'
                          : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                      <span>0{idx + 1}</span>
                      {allDone ? (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ Done</span>
                      ) : isCurrent ? (
                        <span className="text-coral-600 dark:text-coral-400 font-black">● YOU ARE HERE</span>
                      ) : (
                        <span>Upcoming</span>
                      )}
                    </div>

                    <div className="font-display font-bold text-xs sm:text-sm truncate">
                      {phase.name}
                    </div>

                    {isCurrent && (
                      <div className="w-full bg-coral-500 h-1 rounded-full mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PathDestinationHeader;
