/**
 * TrajectoryDevelopingGaps.jsx
 *
 * Developing Areas & Single Immediate Next Action
 *
 * Philosophy:
 * - Never frames gaps as "deficiencies" or "low score".
 * - Shows only 1-3 immediate focus areas so user isn't overwhelmed.
 * - Prominent "NEXT ACTION" button that takes the user directly to NOW -> FOCUS -> EVIDENCE.
 */

import React from 'react';
import { Target, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoadmap } from '../context/RoadmapContext';

const TrajectoryDevelopingGaps = ({
  developingAreas = [],
  nextAction,
  onSelectCapability
}) => {
  const navigate = useNavigate();
  const { selectLearningContext, roadmap = [], subjects = [] } = useRoadmap();

  const handleLaunchNextAction = () => {
    if (selectLearningContext && nextAction) {
      const allTasks = [];
      const roadmapsToScan = (subjects && subjects.length > 0) ? subjects : roadmap;
      roadmapsToScan.forEach(s => {
        (s.phases || []).forEach(p => {
          (p.tasks || []).forEach(t => {
            allTasks.push({ ...t, subjectId: s.id, subjectName: s.name, phaseId: p.id, phaseName: p.name });
          });
        });
      });

      const match = allTasks.find(t =>
        (nextAction.conceptMatch || []).some(k => t.name?.toLowerCase().includes(k)) ||
        (nextAction.capabilityName && t.name?.toLowerCase().includes(nextAction.capabilityName.toLowerCase())) ||
        (nextAction.taskDescription && t.name?.toLowerCase().includes(nextAction.taskDescription.toLowerCase()))
      ) || allTasks.find(t => !t.completed) || allTasks[0];

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
    navigate(nextAction?.route || '/');
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

      {/* ── 1. IMMEDIATE NEXT ACTION CARD (Prominent) ── */}
      {nextAction && (
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-violet-600 to-electric-600 text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-xl bg-white/20 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              RECOMMENDED NEXT ACTION
            </span>
            <span className="text-xs font-mono text-white/80">Trajectory Priority</span>
          </div>

          <div className="space-y-1">
            <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
              {nextAction.taskDescription}
            </h3>
            <p className="text-xs sm:text-sm font-sans text-white/90 leading-relaxed max-w-xl">
              {nextAction.whyItMatters}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleLaunchNextAction}
              className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-mono font-black transition-all flex items-center gap-2 shadow-md hover:scale-105 active:scale-95"
            >
              <span>{nextAction.buttonLabel || 'Launch Challenge in Now'}</span>
              <ArrowRight className="w-4 h-4 text-violet-600" />
            </button>
            <span className="text-xs font-mono text-white/70">
              One click begins session
            </span>
          </div>
        </div>
      )}

      {/* ── 2. DEVELOPING AREAS (Focused 1-3 competencies) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  {cap.name}
                </span>
                <span className="text-xs font-bold text-amber-500">
                  {cap.status?.glyph || '◐'}
                </span>
              </div>

              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 line-clamp-2">
                {cap.whyItMatters}
              </p>

              <span className="text-[10px] font-mono text-slate-400 block pt-1 group-hover:translate-x-1 transition-transform">
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
