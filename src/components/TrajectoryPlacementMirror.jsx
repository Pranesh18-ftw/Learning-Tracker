/**
 * TrajectoryPlacementMirror.jsx
 *
 * Placement Mode Competency Mirror (Prompt #17):
 *
 * Practical evaluation for students preparing for campus placement or core engineering roles:
 * "WHAT EMPLOYERS TYPICALLY LOOK FOR vs YOUR CURRENT EVIDENCE"
 *
 * Honest capability states:
 * - Technical foundations
 * - Practical capability
 * - Problem solving & debugging
 * - Working projects
 * - Written engineering communication
 */

import React from 'react';
import { Briefcase, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolvePlacementExpectations } from '../utils/trajectoryResolver';

const TrajectoryPlacementMirror = ({
  targetRole = 'Embedded Systems Engineer',
  roadmap = []
}) => {
  const navigate = useNavigate();
  const expectations = resolvePlacementExpectations(roadmap);

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Placement Mode · Realistic Expectations
            </span>
            <h2 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
              What Employers Look For vs Your Current Evidence
            </h2>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          Target: <strong className="text-slate-900 dark:text-white font-bold">{targetRole}</strong>
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
        Technical hiring managers don't ask for generic skill percentages. They look for specific evidence across foundations, hands-on debugging, and working hardware prototypes.
      </p>

      {/* Grid of Core Placement Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {expectations.map((item) => {
          const status = item.status;
          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    {item.area}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${status.color}`}>
                    {status.glyph} {status.label}
                  </span>
                </div>
                <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Evidence record */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-snug">{item.evidence}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer reassurance */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-400">
        <span>Grounded in actual completed tasks and projects. No arbitrary scores.</span>
        <button
          onClick={() => navigate('/achievements')}
          className="text-violet-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Inspect Evidence Portfolio in Archive</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

    </section>
  );
};

export default TrajectoryPlacementMirror;
