/**
 * TrajectoryDevelopingGaps.jsx
 *
 * Developing Areas & Single Immediate Next Action
 *
 * Philosophy:
 * - Never frames gaps as "deficiencies" or "low score".
 * - Shows genuine recommended actions directly from the imported roadmap for the active domain.
 * - Prominent "NEXT ACTION" button that takes the user directly to NOW -> FOCUS -> EVIDENCE.
 */

import React from 'react';
import { Target, Zap, ArrowRight, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoadmap } from '../context/RoadmapContext';

const TrajectoryDevelopingGaps = ({
  developingAreas = [],
  nextAction,
  recommendedActions = [],
  activeDomainName = null,
  onSelectCapability
}) => {
  const navigate = useNavigate();
  const { selectLearningContext, roadmap = [], subjects = [] } = useRoadmap();

  const handleLaunchSpecificAction = (action) => {
    if (!action) return;
    if (selectLearningContext) {
      const allTasks = [];
      const roadmapsToScan = (subjects && subjects.length > 0) ? subjects : roadmap;
      roadmapsToScan.forEach(s => {
        (s.phases || []).forEach(p => {
          (p.tasks || []).forEach(t => {
            allTasks.push({ ...t, subjectId: s.id, subjectName: s.name, phaseId: p.id, phaseName: p.name });
          });
        });
      });

      // Match by exact taskId first if present
      const match = (action.taskId && allTasks.find(t => t.id === action.taskId)) ||
        (action.taskName && allTasks.find(t => t.name?.toLowerCase() === action.taskName.toLowerCase())) ||
        allTasks.find(t => (action.conceptMatch || []).some(k => t.name?.toLowerCase().includes(k))) ||
        allTasks.find(t => !t.completed) ||
        allTasks[0];

      if (match) {
        const targetSubtask = (match.subtasks || []).find(s => !s.completed) || match.subtasks?.[0];
        selectLearningContext({
          id: match.id,
          taskId: match.id,
          name: match.name,
          taskName: match.name,
          subjectId: match.subjectId,
          subjectName: match.subjectName,
          phaseId: match.phaseId,
          phaseName: match.phaseName,
          subtaskId: targetSubtask?.id || null,
          subtaskName: targetSubtask?.name || null
        });
      }
    }
    navigate(action?.route || '/');
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

      {/* ── 1. IMMEDIATE NEXT ACTION CARD (Prominent) ── */}
      {nextAction && (
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-electric-600 text-white shadow-lg space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-white/20 text-white font-sans text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                RECOMMENDED NEXT ACTION
              </span>
              {nextAction.priorityBadge && (
                <span className={`px-2.5 py-0.5 rounded-xl font-sans text-xs font-semibold tracking-wide ${
                  nextAction.isInactive
                    ? 'bg-amber-300 text-amber-950 shadow-sm'
                    : 'bg-white/25 text-white'
                }`}>
                  {nextAction.priorityBadge}
                </span>
              )}
              {nextAction.isPrimaryDomain && !nextAction.priorityBadge?.includes('Primary') && (
                <span className="px-2.5 py-0.5 rounded-xl font-sans text-xs font-semibold tracking-wide bg-indigo-500/40 text-white border border-indigo-300/40">
                  Primary Domain
                </span>
              )}
              {nextAction.matchesPrimaryTarget && !nextAction.priorityBadge?.includes('Target') && (
                <span className="px-2.5 py-0.5 rounded-xl font-sans text-xs font-semibold tracking-wide bg-rose-500/40 text-white border border-rose-300/40">
                  Target Focus
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {nextAction.domain && (
                <span className="px-2.5 py-0.5 rounded-lg bg-black/20 text-white/95 text-xs font-sans font-semibold tracking-wide">
                  {nextAction.domain}
                </span>
              )}
              {nextAction.phaseName && (
                <span className="text-xs font-sans text-white/80 hidden sm:inline">
                  · {nextAction.phaseName}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1 relative z-10">
            <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
              {nextAction.taskDescription || nextAction.taskName}
            </h3>
            <p className="text-xs sm:text-sm font-sans text-white/90 leading-relaxed max-w-2xl">
              {nextAction.whyItMatters}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3 relative z-10">
            <button
              onClick={() => handleLaunchSpecificAction(nextAction)}
              className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-sans font-bold transition-all flex items-center gap-2 shadow-md hover:scale-105 active:scale-95"
            >
              <span>{nextAction.buttonLabel || 'Launch Task in Now'}</span>
              <ArrowRight className="w-4 h-4 text-violet-600" />
            </button>
            <span className="text-xs font-serif italic text-white/80">
              One click opens active drill in Now
            </span>
          </div>
        </div>
      )}

      {/* ── 2. RECOMMENDED DOMAIN ACTIONS (Actual tasks from imported roadmap) ── */}
      {recommendedActions && recommendedActions.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-sans font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Recommended Actions from {activeDomainName || 'Active Roadmap'}:
              </span>
            </div>
            <span className="text-xs font-serif italic text-slate-500 dark:text-slate-400">
              Prioritized by Primary Domain, Inactive Concepts & Target
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommendedActions.map((action, idx) => (
              <div
                key={action.id || idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 hover:border-violet-400 dark:hover:border-violet-500 transition-all group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-xs font-sans font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                        {action.phaseName || action.domain}
                      </span>
                      {action.priorityBadge && (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-sans font-semibold ${
                          action.isInactive
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
                            : (action.isPrimaryDomain
                              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300')
                        }`}>
                          {action.priorityBadge}
                        </span>
                      )}
                      {action.isPrimaryDomain && !action.priorityBadge?.includes('Primary') && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-sans font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Primary Domain
                        </span>
                      )}
                      {action.matchesPrimaryTarget && !action.priorityBadge?.includes('Target') && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-sans font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          Target Match
                        </span>
                      )}
                    </div>
                    {action.inProgress && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-sans font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        In Progress
                      </span>
                    )}
                  </div>

                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {action.taskName}
                  </h4>

                  <p className="text-xs font-sans text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {action.whyItMatters || action.taskDescription}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-serif italic text-slate-500 dark:text-slate-400">
                    {action.totalSubtasks > 0 ? `${action.completedSubtasks}/${action.totalSubtasks} subtasks done` : 'Milestone drill'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLaunchSpecificAction(action)}
                    className="text-xs font-sans font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Launch in Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. DEVELOPING AREAS (Focused 1-3 competencies) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-sans font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Immediate Developing Competencies (Next on Route):
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {developingAreas.map((cap) => (
            <button
              key={cap.id}
              type="button"
              onClick={() => onSelectCapability(cap)}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-left hover:border-amber-400 dark:hover:border-amber-500 transition-all group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  {cap.name}
                </span>
                <span className="text-xs font-bold text-amber-500">
                  {cap.status?.glyph || '◐'}
                </span>
              </div>

              <p className="text-xs font-sans text-slate-500 dark:text-slate-400 line-clamp-2">
                {cap.whyItMatters}
              </p>

              <span className="text-xs font-serif italic text-slate-500 dark:text-slate-400 block pt-1 group-hover:translate-x-1 transition-transform">
                Inspect Roadmap Link →
              </span>
            </button>
          ))}
        </div>
      </div>

    </section>
  );
};

export default TrajectoryDevelopingGaps;
