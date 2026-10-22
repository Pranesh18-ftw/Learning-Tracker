/**
 * TrajectoryCapabilityMap.jsx
 *
 * Interactive Capability Map:
 * Arranges domain capability clusters connecting required engineering skills
 * with real roadmap milestones and demonstrated evidence.
 *
 * Honest States (No fake percentages):
 * - ✓ Demonstrated
 * - ▲ Applied in Project
 * - ◉ Practiced
 * - ◐ Developing
 * - ○ Not Yet Explored
 */

import React from 'react';
import { Layers, ArrowRight } from 'lucide-react';
import { CAPABILITY_STATUSES } from '../utils/trajectoryResolver';

const TrajectoryCapabilityMap = ({
  clusters = [],
  onSelectCapability
}) => {
  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Core Competency Map
            </span>
            <h2 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
              Required Capabilities Landscape
            </h2>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
            <span>✓</span> Demonstrated
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 font-bold text-violet-600 dark:text-violet-400">
            <span>◉</span> Practiced
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
            <span>◐</span> Developing
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 text-slate-400">
            <span>○</span> Unexplored
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
        Click any capability to inspect why it matters in industry, your current evidence records, and the concrete next step to develop it.
      </p>

      {/* Capability Clusters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {clusters.map((cluster, cIdx) => (
          <div
            key={cIdx}
            className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4"
          >
            {/* Cluster Title */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                Cluster 0{cIdx + 1} · {cluster.domain}
              </span>
              <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
                {cluster.clusterName}
              </h3>
            </div>

            {/* Capability Objects */}
            <div className="space-y-2.5">
              {cluster.capabilities.map((cap) => {
                const status = cap.status || CAPABILITY_STATUSES.NOT_EXPLORED;
                return (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => onSelectCapability(cap)}
                    className="w-full text-left p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-sm transition-all group flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-black border ${status.color}`}>
                          {status.glyph}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {cap.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block pl-7">
                        {status.label}
                      </span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>

            {/* Connecting Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>{cluster.capabilities.length} Capabilities</span>
              <span>Integrates in Projects →</span>
            </div>

          </div>
        ))}
      </div>

    </section>
  );
};

export default TrajectoryCapabilityMap;
