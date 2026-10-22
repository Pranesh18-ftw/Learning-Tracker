/**
 * ArchiveIdentityHeader.jsx
 *
 * Top of the ARCHIVE screen: Starts with identity and personal work.
 * "YOUR ARCHIVE · The work you've done. · 2026"
 */

import React from 'react';
import { Archive, Search, Star, Sparkles, ChevronDown } from 'lucide-react';

const ArchiveIdentityHeader = ({
  summary,
  activeFilter,
  onSelectFilter,
  searchQuery,
  onSearchChange,
  domainFilter,
  onDomainChange,
  domains = []
}) => {
  const { totalCount, projectCount, evidenceCount, pinnedCount, currentYear } = summary;

  const filterTabs = [
    { id: 'all', label: 'All Artifacts' },
    { id: 'pinned', label: `Pinned (${pinnedCount})`, icon: Star },
    { id: 'projects', label: `Projects (${projectCount})` },
    { id: 'evidence', label: `Evidence (${evidenceCount})` },
    { id: 'concepts', label: 'Concepts' },
    { id: 'reflections', label: 'Reflections' },
    { id: 'recovery', label: 'The Return' },
    { id: 'milestones', label: 'Firsts' }
  ];

  return (
    <header className="relative bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden anim-fade-in space-y-6">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/5 via-violet-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Identity Top Line */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">

        <div className="space-y-3 max-w-xl">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5 text-amber-500" />
              YOUR ARCHIVE
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              · {currentYear}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
              The work you've done.
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              A permanent, physical record of what you actually built, understood, survived, and became capable of.
            </p>
          </div>
        </div>

        {/* Counter Pill */}
        <div className="shrink-0 flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-bold text-slate-800 dark:text-slate-200">{totalCount}</span> Curated Artifacts
        </div>

      </div>

      {/* Search and Filters Bar */}
      <div className="relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-black'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {Icon && <Icon className="w-3 h-3 text-amber-400 fill-current" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Domain Filter Inputs */}
        <div className="flex items-center gap-2">

          {/* Domain Dropdown (if multiple exist) */}
          {domains && domains.length > 0 && (
            <div className="relative">
              <select
                value={domainFilter}
                onChange={(e) => onDomainChange(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 pr-7 text-xs font-mono font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60"
              >
                <option value="all">All Domains</option>
                {domains.map(d => (
                  <option key={d.id || d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search artifacts..."
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono w-40 sm:w-52"
            />
          </div>

        </div>

      </div>
    </header>
  );
};

export default ArchiveIdentityHeader;
