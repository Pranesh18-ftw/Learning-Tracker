/**
 * GrowthEvidenceModal.jsx
 *
 * Deep-dive evidence modal connecting timeline milestones directly
 * to the learner's actual recorded notes, time, and world connections.
 */

import React, { useRef } from 'react';
import { X, CheckCircle2, Clock, Quote, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDialogA11y } from '../utils/a11y';

const GrowthEvidenceModal = ({ event, onClose }) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  useDialogA11y({
    isOpen: Boolean(event),
    onClose,
    containerRef
  });

  if (!event) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 anim-pop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="growth-evidence-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-8">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold uppercase tracking-wider">
              Verified Evidence Record
            </span>
            <span className="font-mono text-xs text-slate-400">
              {event.displayDate}
            </span>
          </div>

          <h3 id="growth-evidence-title" className="font-display font-black text-2xl text-slate-900 dark:text-white">
            {event.title}
          </h3>

          <p className="text-xs font-mono text-slate-500">
            Concept: <span className="font-bold text-slate-700 dark:text-slate-300">{event.conceptName}</span>
          </p>
        </div>

        {/* Key Signals in this Record */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
              <Clock className="w-3 h-3 text-electric-500" /> Duration
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {event.durationMinutes} minutes
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Recall Status
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {event.explainWithoutNotes === 'yes' ? 'Explained without notes' : 'Partly from memory'}
            </span>
          </div>
        </div>

        {/* World Connection */}
        {event.worldConnection && (
          <div className="p-3.5 rounded-2xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <div className="text-xs font-mono">
                <span className="text-violet-700 dark:text-violet-400 font-bold block">World Connection</span>
                <span className="text-slate-600 dark:text-slate-300">{event.worldConnection}</span>
              </div>
            </div>
            <button
              onClick={() => {
                onClose && onClose();
                navigate('/roadmap');
              }}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-mono text-[10px] font-bold transition-colors"
            >
              View in World
            </button>
          </div>
        )}

        {/* Recorded Reflection / Derivation Notes */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5 text-emerald-500" /> Learner Reflection & Working Notes
          </span>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
            {event.notes ? `"${event.notes}"` : <span className="italic text-slate-400 dark:text-slate-500">No reflection notes recorded for this session.</span>}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-mono font-bold transition-colors"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};

export default GrowthEvidenceModal;
