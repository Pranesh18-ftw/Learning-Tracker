/**
 * TrajectoryEvidencePortfolio.jsx
 *
 * Projects as First-Class Career Evidence:
 * Projects are where capability becomes undeniable.
 *
 * Shows what was actually built, measured, and verified.
 * Direct links into Archive.
 */

import React from 'react';
import { Award, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TrajectoryEvidencePortfolio = ({
  roadmap = []
}) => {
  const navigate = useNavigate();

  // Find completed or near-completed project tasks
  const projectTasks = [];
  (roadmap || []).forEach(subj => {
    (subj.phases || []).forEach(ph => {
      (ph.tasks || []).forEach(tk => {
        const text = (tk.name || '').toLowerCase();
        if (text.includes('project') || text.includes('build') || text.includes('monitor') || text.includes('circuit')) {
          projectTasks.push({
            ...tk,
            subjectName: subj.name,
            phaseName: ph.name
          });
        }
      });
    });
  });

  // Find completed project tasks only (never treat incomplete tasks or fallbacks as verified builds)
  const completedProjects = projectTasks.filter(t => t.completed || (t.subtasks && t.subtasks.length > 0 && t.subtasks.every(s => s.completed)));
  const primaryProject = completedProjects[0] || null;

  // Extract authentic capabilities from completed subtasks
  const capabilities = (primaryProject?.subtasks || [])
    .filter(s => s.completed)
    .map(s => s.name)
    .slice(0, 4);

  // Derive authentic stage badge
  const allText = primaryProject ? ((primaryProject.name || '') + ' ' + (primaryProject.subtasks || []).map(s => s.name).join(' ')).toLowerCase() : '';
  const badges = [];
  if (allText.includes('build') || allText.includes('assembly')) badges.push('Built');
  if (allText.includes('test') || allText.includes('simulate')) badges.push('Tested');
  if (allText.includes('measure') || allText.includes('multimeter')) badges.push('Measured');
  const stageBadgeLabel = badges.length > 0 ? badges.join(' · ') : 'Completed Project';

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Practical Proof
            </span>
            <h2 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
              Projects as First-Class Evidence
            </h2>
          </div>
        </div>

        <button
          onClick={() => navigate('/achievements')}
          className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <span>Open Full Archive Museum</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
        Interviewers and technical teams don't evaluate quiz percentages. They inspect working projects and the engineering skills logged during the build.
      </p>

      {/* Featured Project Evidence Card or Honest Empty State */}
      {!primaryProject ? (
        <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="font-display font-bold text-slate-700 dark:text-slate-300 text-sm">
            No demonstrated project evidence yet.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-md mx-auto">
            Practical engineering projects completed in your learning route will appear here as permanent, inspectable proof of capability.
          </p>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-emerald-300 dark:border-emerald-800/60 space-y-4">

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold">
                  ✓ COMPLETED PROJECT BUILD
                </span>
                <span className="text-xs font-mono text-slate-400">
                  · {primaryProject.subjectName}
                </span>
              </div>
              <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
                {primaryProject.name}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {stageBadgeLabel}
              </span>
            </div>
          </div>

          {/* Demonstrated Capabilities Chips */}
          {capabilities.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                Capabilities Demonstrated:
              </span>
              <div className="flex flex-wrap gap-2">
                {capabilities.map((cap, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-mono font-bold flex items-center gap-1.5"
                  >
                    <span>✓</span>
                    <span>{cap}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-slate-300">Permanent record in Archive</span>
            <button
              onClick={() => navigate('/achievements')}
              className="font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 flex items-center gap-1"
            >
              <span>Inspect Artifact & Notes →</span>
            </button>
          </div>

        </div>
      )}

    </section>
  );
};

export default TrajectoryEvidencePortfolio;
