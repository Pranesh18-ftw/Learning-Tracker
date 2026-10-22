import React, { useRef } from 'react';
import {
  X,
  Compass,
  CheckCircle2,
  FolderGit2,
  ArrowRight,
  HelpCircle,
  Link2
} from 'lucide-react';
import { useDialogA11y } from '../utils/a11y';

/**
 * LearningArcModal (Level 2: Learning Arc / Knowledge Area Detail)
 *
 * When a learner opens a learning arc / phase:
 * - Purpose
 * - Capabilities developed
 * - Important concepts
 * - Prerequisite relationships
 * - Why this area matters
 * - Relationship to the larger field
 * - Associated projects
 * - Relevant research findings
 */
const LearningArcModal = ({
  arc,
  subjectName = 'Knowledge Track',
  allProjects = [],
  onClose,
  onSelectConcept
}) => {
  const containerRef = useRef(null);

  useDialogA11y({
    isOpen: Boolean(arc),
    onClose,
    containerRef
  });

  if (!arc) return null;

  const {
    name,
    purpose,
    capabilitiesDeveloped = [],
    whyThisAreaMatters,
    importantConcepts = [],
    prerequisites = [],
    relevantResearchFindings = [],
    concepts = [],
    establishedCount = 0,
    totalConcepts = 0
  } = arc;

  // Filter associated projects for this arc
  const arcProjects = (allProjects || []).filter(p => {
    const text = `${p.name || ''} ${p.description || ''} ${(p.prerequisiteModules || []).join(' ')}`.toLowerCase();
    return text.includes(name.toLowerCase());
  });

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs anim-pop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arc-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between">

        {/* Top Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
            <Compass className="w-4 h-4 text-electric-600 dark:text-electric-400" />
            <span>{subjectName}</span>
            <span>·</span>
            <span className="text-electric-600 dark:text-electric-400">Learning Arc Level 2</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Arc Inspector"
            aria-label="Close learning arc inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 space-y-6 flex-1">

          {/* Arc Title and Progress */}
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-coral-600 dark:text-coral-400 uppercase tracking-wider">
              <span>Phase {arc.index || 1} Knowledge Area</span>
            </div>
            <h2 id="arc-modal-title" className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white mt-1">
              {name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {establishedCount} of {totalConcepts} concepts established
              </span>
              {establishedCount === totalConcepts && totalConcepts > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Area Mastered
                </span>
              )}
            </div>
          </div>

          {/* Purpose & Why this area matters */}
          {(purpose || whyThisAreaMatters) && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-electric-600 dark:text-electric-400">
                <HelpCircle className="w-4 h-4" />
                <span>Purpose & Field Significance</span>
              </div>
              {purpose && (
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                  {purpose}
                </p>
              )}
              {whyThisAreaMatters && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {whyThisAreaMatters}
                </p>
              )}
            </div>
          )}

          {/* Capabilities Developed */}
          {capabilitiesDeveloped.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Capabilities Developed in This Arc
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {capabilitiesDeveloped.map((cap, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-start gap-2">
                    <span className="text-electric-500 font-bold">➔</span>
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Conceptual Highlights */}
          {importantConcepts.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Key Conceptual Highlights
              </span>
              <div className="flex flex-wrap gap-1.5">
                {importantConcepts.map((item, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    {typeof item === 'string' ? item : (item.name || item.title || JSON.stringify(item))}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Link2 className="w-3.5 h-3.5" />
                <span>Prerequisites for this Arc</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {prerequisites.map((item, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    {typeof item === 'string' ? item : (item.name || item.title || JSON.stringify(item))}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Concepts within this Arc */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Curricular Concepts ({concepts.length})
            </span>
            <div className="space-y-2">
              {concepts.map((concept) => (
                <div
                  key={concept.id}
                  onClick={() => {
                    onClose();
                    if (onSelectConcept) onSelectConcept(concept);
                  }}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-electric-500 flex items-center justify-between cursor-pointer transition-colors bg-white dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${concept.completed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {concept.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-electric-600 dark:text-electric-400 font-bold flex items-center gap-1">
                    <span>Inspect Concept</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Associated Projects */}
          {arcProjects.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-coral-600 dark:text-coral-400">
                <FolderGit2 className="w-4 h-4" />
                <span>Associated Practical Projects</span>
              </div>
              <div className="space-y-2">
                {arcProjects.map(p => (
                  <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{p.name || p.title}</h4>
                      {p.scaffoldingLevel && (
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-coral-100 dark:bg-coral-950 text-coral-700 dark:text-coral-300">
                          {p.scaffoldingLevel}
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{p.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relevant Research Findings */}
          {relevantResearchFindings.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 space-y-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                Research Findings Influencing This Arc
              </span>
              <ul className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1 list-disc list-inside">
                {relevantResearchFindings.map((finding, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {typeof finding === 'string' ? finding : JSON.stringify(finding)}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/80 dark:bg-slate-900/80 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="btn-tactile-ghost px-5 py-2 text-xs font-bold"
          >
            Close Arc
          </button>
        </div>

      </div>
    </div>
  );
};

export default LearningArcModal;
