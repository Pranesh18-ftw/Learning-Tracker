/**
 * GrowthDevelopmentHero.jsx
 *
 * Top hero of the GROWTH screen: "You, Over Time".
 * Emotionally meaningful, scientifically truthful summary.
 */

import React from 'react';
import { Compass, CheckCircle2, ChevronDown } from 'lucide-react';

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
    <header className="relative card-workbench bg-[#FAF8F5] dark:bg-[#1F1D1B] border border-stone-300 dark:border-[#2A2725] rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden anim-entrance-1">
      {/* Subtle background ambient workbench texture */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#3B5571]/5 via-[#C25524]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">

        {/* Left: Identity & Emotional Truth */}
        <div className="space-y-4 max-w-2xl">

          {/* Top Label & Domain Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-stone-100 dark:bg-[#141312] text-stone-700 dark:text-stone-300 font-mono text-xs font-bold uppercase tracking-wider border border-stone-200 dark:border-[#2A2725] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#C25524]" />
              YOUR DEVELOPMENT
            </span>

            {/* Domain Dropdown / Selector */}
            {roadmap && roadmap.length > 0 && (
              <div className="relative inline-block">
                <select
                  value={selectedDomainId}
                  onChange={(e) => onSelectDomain(e.target.value)}
                  className="appearance-none bg-stone-100 dark:bg-[#141312] text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-[#2A2725] rounded-xl px-3 py-1 pr-7 text-xs font-mono font-bold cursor-pointer hover:border-[#3B5571] transition-colors"
                >
                  <option value="all">All Learning Domains</option>
                  {roadmap.map(subj => (
                    <option key={subj.id} value={subj.id}>
                      {subj.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#3B5571] dark:text-[#486581] absolute right-2 top-2.5 pointer-events-none" />
              </div>
            )}

            <span className="text-xs font-mono text-stone-500 dark:text-stone-400 font-bold">
              · {currentMonthYear}
            </span>
          </div>

          {/* Emotional Statement */}
          <div className="space-y-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[#141312] dark:text-[#FAF8F5] tracking-tight leading-tight">
              "{headline}"
            </h1>

            <p className="text-sm sm:text-base font-medium text-stone-600 dark:text-stone-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4D6B58] shrink-0" />
              <span>{supportingEvidence}</span>
            </p>
          </div>

        </div>

        {/* Right: Dual View Toggle (Growth Mirror vs Archive Log) */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">

          <div className="inline-flex p-1 bg-stone-200/60 dark:bg-[#141312] rounded-2xl border border-stone-300 dark:border-[#2A2725] self-start sm:self-auto">
            <button
              onClick={() => onChangeViewMode('growth')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeViewMode === 'growth'
                  ? 'bg-white dark:bg-[#1F1D1B] text-[#141312] dark:text-[#FAF8F5] shadow-sm font-black'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              Growth Mirror
            </button>
            <button
              onClick={() => onChangeViewMode('archive')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeViewMode === 'archive'
                  ? 'bg-white dark:bg-[#1F1D1B] text-[#141312] dark:text-[#FAF8F5] shadow-sm font-black'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              Activity Archive
            </button>
          </div>

          {activeViewMode === 'growth' && onExploreTimeline && (
            <button
              onClick={onExploreTimeline}
              className="btn-workbench-mineral px-4 py-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 rounded-xl cursor-pointer"
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
