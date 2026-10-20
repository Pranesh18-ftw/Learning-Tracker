/**
 * GrowthDevelopmentHero.jsx
 *
 * Top hero of the GROWTH screen: "You, Over Time".
 * Emotionally meaningful, scientifically truthful summary.
 */

import React from 'react';
import { Compass, Sparkles, ChevronDown } from 'lucide-react';

const GrowthDevelopmentHero = ({
  summary,
  roadmap = [],
  selectedDomainId,
  onSelectDomain,
  onExploreTimeline,
  activeViewMode,
  onChangeViewMode
}) => {
  const { currentMonthYear, headline, supportingEvidence } = summary;

  return (
    <header className="relative bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden anim-fade-in">
      {/* Subtle background ambient gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/5 via-electric-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">

        {/* Left: Identity & Emotional Truth */}
        <div className="space-y-4 max-w-2xl">

          {/* Top Label & Domain Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-coral-500" />
              YOUR DEVELOPMENT
            </span>

            {/* Domain Dropdown / Selector */}
            {roadmap && roadmap.length > 0 && (
              <div className="relative inline-block">
                <select
                  value={selectedDomainId}
                  onChange={(e) => onSelectDomain(e.target.value)}
                  className="appearance-none bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 rounded-xl px-3 py-1 pr-7 text-xs font-mono font-bold cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  <option value="all">All Learning Domains</option>
                  {roadmap.map(subj => (
                    <option key={subj.id} value={subj.id}>
                      {subj.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            )}

            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-bold">
              · {currentMonthYear}
            </span>
          </div>

          {/* Emotional Statement */}
          <div className="space-y-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white tracking-tight leading-tight">
              "{headline}"
            </h1>

            <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{supportingEvidence}</span>
            </p>
          </div>

        </div>

        {/* Right: Dual View Toggle (Growth Mirror vs Archive Log) */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
            <button
              onClick={() => onChangeViewMode('growth')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                activeViewMode === 'growth'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Growth Mirror
            </button>
            <button
              onClick={() => onChangeViewMode('archive')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                activeViewMode === 'archive'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Activity Archive
            </button>
          </div>

          {activeViewMode === 'growth' && onExploreTimeline && (
            <button
              onClick={onExploreTimeline}
              className="btn-tactile-emerald px-4 py-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5"
            >
              <span>Explore Timeline</span>
              <span>↓</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};

export default GrowthDevelopmentHero;
