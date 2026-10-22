/**
 * ArchiveMemoryMomentModal.jsx
 *
 * "Memory Moment" expanded portfolio drawer.
 * Feels like opening a physical portfolio item:
 * Preserves what was actually built, understood, and survived.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Star,
  Compass,
  TrendingUp,
  Map,
  Zap,
  Quote,
  CheckCircle2,
  Edit3,
  Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoadmap } from '../context/RoadmapContext';
import { useDialogA11y } from '../utils/a11y';

const ArchiveMemoryMomentModal = ({
  artifact,
  onClose,
  onTogglePin,
  onSaveAnnotation
}) => {
  const navigate = useNavigate();
  const { selectLearningContext } = useRoadmap();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [annotationDraft, setAnnotationDraft] = useState(artifact?.annotation || '');
  const containerRef = useRef(null);

  useDialogA11y({
    isOpen: Boolean(artifact),
    onClose,
    containerRef
  });

  const syncContextAndNavigate = (targetPath) => {
    if (artifact && selectLearningContext) {
      selectLearningContext({
        id: artifact.taskId || artifact.id,
        taskId: artifact.taskId || artifact.id,
        subtaskId: artifact.subtaskId,
        name: artifact.title,
        taskName: artifact.title,
        subjectId: artifact.subjectId,
        subjectName: artifact.domain
      });
    }
    if (onClose) onClose();
    navigate(targetPath);
  };

  useEffect(() => {
    setAnnotationDraft(artifact?.annotation || '');
  }, [artifact]);

  if (!artifact) return null;

  const handleSaveNote = () => {
    onSaveAnnotation && onSaveAnnotation(artifact.id, annotationDraft);
    setIsEditingNote(false);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 anim-pop"
      role="dialog"
      aria-modal="true"
      aria-label="Archive Memory Moment"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">

        {/* Top Controls: Pin & Close */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onTogglePin && onTogglePin(artifact.id)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
              artifact.isPinned
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-600 font-black'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${artifact.isPinned ? 'fill-current' : ''}`} />
            <span>{artifact.isPinned ? 'Pinned in Important Work' : 'Pin to Important Work (Keep)'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Artifact Header Banner */}
        <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider">
              {artifact.type}
            </span>
            <span className="font-mono text-xs text-slate-400">
              {artifact.domain} · {artifact.displayDate}
            </span>
          </div>

          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
            {artifact.title}
          </h2>

          <p className="text-xs font-mono text-slate-500">
            {artifact.subheading}
          </p>
        </div>

        {/* Project Stage Badges & Demonstrated Capabilities */}
        {artifact.stageBadges && artifact.stageBadges.length > 0 && (
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Execution Lifecycle
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {artifact.stageBadges.map((b, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold"
                >
                  ✓ {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Capabilities Breakdown */}
        {artifact.capabilities && artifact.capabilities.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Demonstrated Capabilities
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
              {artifact.capabilities.map((cap, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quote / Working Reflection */}
        {(artifact.quote || artifact.reflection) && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
              <Quote className="w-3 h-3 text-amber-500" />
              Historical Reflection Recorded at Completion
            </span>
            <p className="text-sm font-sans text-slate-800 dark:text-slate-200 italic leading-relaxed">
              "{artifact.quote || artifact.reflection}"
            </p>
          </div>
        )}

        {/* Post-Facto Learner Annotation */}
        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Personal Annotation (Afterward)
            </span>
            {!isEditingNote ? (
              <button
                onClick={() => setIsEditingNote(true)}
                className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>{artifact.annotation ? 'Edit Note' : 'Add Note / Link'}</span>
              </button>
            ) : (
              <button
                onClick={handleSaveNote}
                className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
            )}
          </div>

          {isEditingNote ? (
            <textarea
              value={annotationDraft}
              onChange={(e) => setAnnotationDraft(e.target.value)}
              placeholder="Add personal context, hardware observations, or external repository links..."
              rows={3}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            />
          ) : (
            <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
              {artifact.annotation ? `"${artifact.annotation}"` : 'No post-facto annotations added yet.'}
            </p>
          )}
        </div>

        {/* Deep Connections to the Rest of the Learning World */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
            Connected Systems
          </span>
          <div className="flex flex-wrap items-center gap-2">

            <button
              onClick={() => syncContextAndNavigate('/roadmap')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-violet-500" />
              <span>View in World</span>
            </button>

            <button
              onClick={() => syncContextAndNavigate('/statistics')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>View in Growth</span>
            </button>

            <button
              onClick={() => syncContextAndNavigate('/learning-plan')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <Map className="w-3.5 h-3.5 text-electric-500" />
              <span>View in Path</span>
            </button>

            <button
              onClick={() => syncContextAndNavigate('/')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-coral-500" />
              <span>Return to Now</span>
            </button>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ArchiveMemoryMomentModal;
