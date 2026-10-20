/**
 * GrowthProjectProgression.jsx
 *
 * Practical Project Progression.
 * Practical work needs a stronger visual treatment than a checkbox.
 * Visualizes: Concept → Simulation → Code → Prototype → Measurement → Test.
 */

import React from 'react';
import { Cpu } from 'lucide-react';

const GrowthProjectProgression = ({ projects = [], onInspectProject }) => {
  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Practical Execution
          </span>
          <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-coral-500" />
            <span>Practical Project Progression</span>
          </h2>
        </div>

        <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-bold">
          Hardware & Software Builds
        </span>
      </div>

      {/* Projects List or Honest Empty State */}
      {(!projects || projects.length === 0) ? (
        <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="font-display font-bold text-slate-700 dark:text-slate-300 text-sm">
            No practical projects in roadmap yet.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-md mx-auto">
            Practical engineering projects in your learning route will display their multi-stage progression here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
        {projects.map((proj) => {
          const currentStageIndex = proj.stages.indexOf(proj.currentStage);

          return (
            <div
              key={proj.id}
              className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-coral-500 dark:text-coral-400">
                    {proj.subjectName || 'Electronics'}
                  </span>
                  <h3 className="font-display font-black text-lg text-slate-900 dark:text-white">
                    {proj.name}
                  </h3>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Stage reached:</span>
                  <span className="font-black text-coral-600 dark:text-coral-400">{proj.currentStage}</span>
                </div>
              </div>

              {/* Linear Step Progression (Concept → Simulation → Code → Prototype → Measurement → Test) */}
              <div className="pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {proj.stages.map((stage, idx) => {
                    const isPassed = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    let stepBg = 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-400';
                    let dotColor = 'bg-slate-300 dark:bg-slate-700';

                    if (isPassed) {
                      stepBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300';
                      dotColor = 'bg-emerald-500';
                    } else if (isCurrent) {
                      stepBg = 'bg-coral-50 dark:bg-coral-950/40 border-coral-400 dark:border-coral-700 text-coral-800 dark:text-coral-300 font-black shadow-sm ring-1 ring-coral-400/50';
                      dotColor = 'bg-coral-500';
                    }

                    return (
                      <div
                        key={stage}
                        className={`p-2.5 rounded-xl border text-center space-y-1 transition-all ${stepBg}`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                            {stage}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono block text-slate-500 dark:text-slate-400">
                          {isPassed ? '✓ Completed' : isCurrent ? '● Active' : '○ Upcoming'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })}
      </div>
      )}

    </section>
  );
};

export default GrowthProjectProgression;
