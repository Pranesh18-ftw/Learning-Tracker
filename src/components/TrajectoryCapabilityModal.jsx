/**
 * TrajectoryCapabilityModal.jsx
 *
 * Interactive Capability Inspector (Prompts #8, #9, #10, #21, #22):
 *
 * The visual and logical connector across the entire Learning Tracker:
 * TRAJECTORY  (Where am I trying to go?)
 *      ↓
 * WORLD        (Microcontrollers → GPIO)
 *      ↓
 * CURRENT EVIDENCE (2 practice tasks, 1 project build)
 *      ↓
 * YOUR PATH    (5-step sequential roadmap from concept to hardware)
 *      ↓
 * NEXT ACTION  (Interrupt-driven GPIO → Launch in Now)
 */

import React, { useRef } from 'react';
import { X, CheckCircle2, Compass, Zap, MapPin, Globe, ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoadmap } from '../context/RoadmapContext';
import { useDialogA11y } from '../utils/a11y';

const DEFAULT_PATH_STEPS = [
  'Understand first-principles mechanism and theoretical equations',
  'Recall key registers, pin definitions, and formulas without notes',
  'Implement simple baseline circuit or software subroutine',
  'Test and observe waveform behavior on simulator / SPICE',
  'Apply to physical hardware target and measure response'
];

const TrajectoryCapabilityModal = ({
  capability,
  onClose,
  targetRole = 'Embedded Systems Engineer'
}) => {
  const navigate = useNavigate();
  const { selectLearningContext, roadmap = [], subjects = [] } = useRoadmap();
  const containerRef = useRef(null);

  useDialogA11y({
    isOpen: Boolean(capability),
    onClose,
    containerRef
  });

  if (!capability) return null;

  const handleLaunchInNow = () => {
    if (selectLearningContext) {
      const allTasks = [];
      const roadmapsToScan = (subjects && subjects.length > 0) ? subjects : roadmap;
      roadmapsToScan.forEach(s => {
        (s.phases || []).forEach(p => {
          (p.tasks || []).forEach(t => {
            allTasks.push({ ...t, subjectId: s.id, subjectName: s.title, phaseId: p.id, phaseName: p.name });
          });
        });
      });
      const match = allTasks.find(t =>
        (capability.conceptMatch || []).some(k => t.name?.toLowerCase().includes(k)) ||
        t.name?.toLowerCase().includes(capability.name?.toLowerCase())
      ) || allTasks[0];

      if (match) {
        selectLearningContext({
          id: match.id,
          taskId: match.id,
          name: match.name,
          subjectId: match.subjectId,
          subjectName: match.subjectName,
          phaseId: match.phaseId,
          phaseName: match.phaseName
        });
      }
    }
    onClose();
    navigate('/');
  };

  const status = capability.status || { label: 'Developing', glyph: '◐', color: 'text-amber-500' };
  const pathSteps = capability.pathSteps && capability.pathSteps.length > 0
    ? capability.pathSteps
    : DEFAULT_PATH_STEPS;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 anim-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trajectory-capability-title"
    >
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden my-8">

        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-violet-500/10 via-electric-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border ${status.color}`}>
                {status.glyph} {status.label}
              </span>
              <span className="text-xs font-mono text-slate-400">
                · {capability.relatedRoadmapPhase}
              </span>
            </div>

            <h3 id="trajectory-capability-title" className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
              {capability.name}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors shrink-0"
            aria-label="Close capability dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── 1. THE 4-PILLAR UNIFIED CONNECTOR (Prompt #8) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs font-mono">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <MapPin className="w-3 h-3 text-violet-500" />
              TRAJECTORY
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {targetRole}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Globe className="w-3 h-3 text-electric-500" />
              WORLD
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {capability.relatedRoadmapPhase}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              EVIDENCE
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {(capability.evidence || []).length} Records
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              NEXT
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {capability.nextStepLabel || capability.name}
            </p>
          </div>
        </div>

        {/* ── 2. WHY THIS MATTERS (Prompt #22) ── */}
        <div className="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-violet-700 dark:text-violet-300">
            <Compass className="w-3.5 h-3.5" />
            <span>Why this matters in industry & engineering:</span>
          </div>
          <p className="text-xs font-sans text-slate-700 dark:text-slate-300 leading-relaxed">
            {capability.whyItMatters}
          </p>
        </div>

        {/* ── 3. YOUR PATH SEQUENTIAL LADDER (Prompt #9) ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Compass className="w-3 h-3 text-electric-500" />
              Your Path Progression (From Theory to Hardware):
            </span>
            <span className="text-[10px] font-mono text-slate-400">Step 1 → 5</span>
          </div>

          <div className="space-y-1.5">
            {pathSteps.map((step, idx) => (
              <div
                key={idx}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 text-xs font-mono flex items-center gap-3 text-slate-700 dark:text-slate-300"
              >
                <span className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. CURRENT EVIDENCE RECORDS (Prompt #10) ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Capability Records & Evidence:
            </span>
            <button
              onClick={() => {
                onClose();
                navigate('/achievements');
              }}
              className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>View Archive Museum</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {(capability.evidence || []).map((ev, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs font-mono flex items-start gap-2 text-slate-800 dark:text-slate-200"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{ev}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. IMMEDIATE ACTION FOOTER ── */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-electric-50 dark:from-emerald-950/20 dark:to-electric-950/20 border border-emerald-300 dark:border-emerald-800/60 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-emerald-700 dark:text-emerald-300">Continue Capability in Now:</span>
            <span className="text-[10px] text-slate-400">No duplicated task lists</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleLaunchInNow}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Launch Next Challenge in Now →</span>
            </button>

            <button
              onClick={() => {
                onClose();
                navigate('/learning-plan');
              }}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-mono font-bold transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-electric-500" />
              <span>Continue Path</span>
            </button>

            <button
              onClick={() => {
                onClose();
                navigate('/roadmap');
              }}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-mono font-bold transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-violet-500" />
              <span>Open in World</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TrajectoryCapabilityModal;
