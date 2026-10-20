import React, { useState, useRef } from 'react';
import {
  X,
  Check,
  Zap,
  Play,
  BookOpen,
  Wrench,
  HelpCircle,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  FolderGit2
} from 'lucide-react';
import { ConceptSchematicGlyph } from './ConceptObject';
import OpenInContextLinks from './OpenInContextLinks';
import { useDialogA11y } from '../utils/a11y';

/**
 * ConceptDeepDiveDrawer (Level 3 Detail & Progressive Disclosure)
 *
 * Deep dive inspection view for a topic/subtopic on the roadmap.
 * Maintains strict separation between:
 * 1. WHAT TO UNDERSTAND (Learning units, depth, misconceptions — NOT checkboxes)
 * 2. WHAT TO DO (Practice activities, doing tasks, interactive subtask checklist, evidence)
 * 3. WHY IT MATTERS (Physical intuition, failure modes, research influences)
 * 4. WHAT COMES NEXT (Capabilities unlocked, dependencies, associated projects)
 */
const ConceptDeepDiveDrawer = ({
  concept,
  allConcepts = [],
  allProjects = [],
  onClose,
  onSelectConcept,
  onFocusInNow,
  onToggleSubtask,
  onToggleTask
}) => {
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('understand'); // 'understand' | 'do' | 'why' | 'next'

  useDialogA11y({
    isOpen: Boolean(concept),
    onClose,
    containerRef
  });

  if (!concept) return null;

  const {
    name,
    glyph,
    completed,
    isCurrent,
    phaseName,
    subjectName,
    whyItMatters,
    capabilities = [],
    prerequisites = [],
    consequences = [],
    subtasks = [],
    learningUnits = [],
    doingTasks = [],
    depth,
    practicalFailureModes = [],
    highLeverageConcepts = [],
    sourceRoadmapInfluences = [],
    evidenceExpected,
    isOptional
  } = concept;

  // Find associated projects that exercise this concept or phase
  const relatedProjects = (allProjects || []).filter(p => {
    const text = `${p.name || ''} ${p.description || ''} ${(p.capabilitiesExercised || []).join(' ')} ${(p.prerequisiteModules || []).join(' ')}`.toLowerCase();
    return text.includes(name.toLowerCase()) || (concept.phaseName && text.includes(concept.phaseName.toLowerCase()));
  });

  const completedSubtasksCount = subtasks.filter(s => s.completed).length;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs anim-pop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="concept-drawer-title"
    >
      <div
        className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col justify-between"
      >
        {/* ── TOP DRAWER BAR ── */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="text-electric-600 dark:text-electric-400 font-mono">{subjectName}</span>
            <span>·</span>
            <span className="text-slate-700 dark:text-slate-300">{phaseName}</span>
            {isOptional && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                Optional Branch
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Inspector"
            aria-label="Close concept inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── MAIN CONTENT CONTAINER ── */}
        <div className="p-5 sm:p-7 space-y-6 flex-1">

          {/* Title & Schematic Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${
                completed
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-950/40'
                  : isCurrent
                    ? 'bg-coral-50 border-coral-500 text-coral-600 dark:bg-coral-950/40'
                    : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700'
              }`}>
                <ConceptSchematicGlyph glyph={glyph} className="w-9 h-9" isCurrent={isCurrent} isCompleted={completed} />
              </div>

              <div>
                <h2 id="concept-drawer-title" className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight">
                  {name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {completed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px]">✓</span>
                      Established in Knowledge Archive
                    </span>
                  ) : isCurrent ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-coral-600 dark:text-coral-400 bg-coral-50 dark:bg-coral-950/60 px-2.5 py-0.5 rounded-full border border-coral-200 dark:border-coral-800">
                      <span className="w-2 h-2 rounded-full bg-coral-500 animate-ping" />
                      Current Milestone (You Are Here)
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">
                      Available on sequence path
                    </span>
                  )}

                  {depth && (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-bold">
                      Target Depth: {depth}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => onFocusInNow && onFocusInNow(concept)}
              className="btn-tactile-coral px-5 py-2.5 text-xs flex items-center gap-2 shadow-md shrink-0 w-full sm:w-auto justify-center"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>FOCUS THIS IN NOW</span>
            </button>
          </div>

          {/* ── PROGRESSIVE DISCLOSURE TABS ── */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('understand')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 -mb-[2px] ${
                activeTab === 'understand'
                  ? 'border-electric-600 text-electric-600 dark:border-electric-400 dark:text-electric-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>What to Understand</span>
              {learningUnits.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono">
                  {learningUnits.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('do')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 -mb-[2px] ${
                activeTab === 'do'
                  ? 'border-electric-600 text-electric-600 dark:border-electric-400 dark:text-electric-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>What to Do</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono">
                {subtasks.length > 0 ? `${completedSubtasksCount}/${subtasks.length}` : (completed ? '1/1' : '0/1')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('why')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 -mb-[2px] ${
                activeTab === 'why'
                  ? 'border-electric-600 text-electric-600 dark:border-electric-400 dark:text-electric-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Why It Matters</span>
              {practicalFailureModes.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-mono">
                  {practicalFailureModes.length} risks
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('next')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 -mb-[2px] ${
                activeTab === 'next'
                  ? 'border-electric-600 text-electric-600 dark:border-electric-400 dark:text-electric-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span>What's Next</span>
              {relatedProjects.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono">
                  {relatedProjects.length} proj
                </span>
              )}
            </button>
          </div>

          {/* ── TAB 1: WHAT TO UNDERSTAND (Learning Units — strictly non-checkbox) ── */}
          {activeTab === 'understand' && (
            <div className="space-y-4 anim-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Conceptual Knowledge Acquisition
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    What to understand and reason about before practical execution.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                  Conceptual Target (Read-Only)
                </span>
              </div>

              {learningUnits.length > 0 ? (
                <div className="space-y-3">
                  {learningUnits.map((lu, idx) => (
                    <div
                      key={lu.id || idx}
                      className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-electric-100 dark:bg-electric-950/80 text-electric-700 dark:text-electric-300 font-mono text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {lu.name || lu.title}
                          </span>
                        </div>

                        {lu.depth && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900">
                            {lu.depth}
                          </span>
                        )}
                      </div>

                      {lu.whyItMatters && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed pl-8">
                          {lu.whyItMatters}
                        </p>
                      )}

                      {lu.misconceptionRisk && (
                        <div className="ml-8 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                          <span><strong>Misconception Risk:</strong> {lu.misconceptionRisk}</span>
                        </div>
                      )}

                      {lu.retrievalTarget && (
                        <div className="ml-8 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          Retrieval target: {lu.retrievalTarget}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Core Conceptual Grounding
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Master the fundamental principles, mathematical relationships, and domain intuition for {name}. Consult reference literature to establish firm understanding prior to practical implementation.
                  </p>
                </div>
              )}

              {/* High-Leverage Concepts */}
              {highLeverageConcepts.length > 0 && (
                <div className="p-4 rounded-2xl bg-electric-50/50 dark:bg-electric-950/30 border border-electric-200 dark:border-electric-900 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-electric-700 dark:text-electric-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>High-Leverage Concepts (Broad Downstream Utility)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {highLeverageConcepts.map((hlc, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-electric-700 dark:text-electric-300 border border-electric-200 dark:border-electric-800">
                        {hlc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: WHAT TO DO (Doing tasks, practice activities, checklist subtasks) ── */}
          {activeTab === 'do' && (
            <div className="space-y-5 anim-fade-in">
              {/* Doing Tasks / Practice Activities */}
              {doingTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-500">
                      Practice Activities & Applied Tasks
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Cognitive Practice Modes</span>
                  </div>

                  <div className="space-y-2">
                    {doingTasks.map((dt, idx) => (
                      <div
                        key={dt.id || idx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-electric-500 font-bold">➔</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {dt.name || dt.title}
                          </span>
                        </div>
                        {dt.mode && (
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {dt.mode}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Subtasks Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-500">
                    Execution Checklist ({subtasks.length > 0 ? `${completedSubtasksCount} of ${subtasks.length}` : `${completed ? 1 : 0} of 1`} completed)
                  </span>
                  {onToggleTask && (
                    <button
                      onClick={() => onToggleTask(concept)}
                      className="text-xs font-bold text-slate-500 hover:text-coral-600 transition-colors"
                    >
                      {completed ? '↺ Reopen Milestone' : '✓ Mark Milestone Complete'}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {subtasks.length > 0 ? (
                    subtasks.map((st) => (
                      <div
                        key={st.id || st.name}
                        onClick={() => onToggleSubtask && onToggleSubtask(concept, st)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          st.completed
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/60 text-emerald-900 dark:text-emerald-200'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 ${
                            st.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {st.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className={`text-xs font-bold ${st.completed ? 'line-through opacity-80' : ''}`}>
                            {st.name}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-400">
                          {st.completed ? 'Proven ✓' : 'Execute ➔'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Execute primary implementation and record authentic evidence
                      </span>
                      <span className="text-xs font-bold text-emerald-600">
                        {completed ? 'Proven ✓' : 'Ready'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Evidence */}
              {evidenceExpected && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Expected Learner Evidence:</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 pl-5 leading-relaxed">
                    {evidenceExpected}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: WHY IT MATTERS (Physical intuition, failure modes, research) ── */}
          {activeTab === 'why' && (
            <div className="space-y-4 anim-fade-in">
              {/* Authentic Physical Intuition */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-electric-600 dark:text-electric-400 block">
                  Core Rationale & Domain Intuition
                </span>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                  {whyItMatters}
                </p>
              </div>

              {/* Practical Failure Modes */}
              {practicalFailureModes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 block">
                    Critical Practical Failure Modes & Hazards
                  </span>
                  <div className="space-y-2">
                    {practicalFailureModes.map((fm, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs font-medium text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{fm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Research Influences */}
              {sourceRoadmapInfluences.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300 block">
                    Field Research & Curricular Influence
                  </span>
                  <ul className="space-y-1.5 text-xs text-indigo-900 dark:text-indigo-200 list-disc list-inside">
                    {sourceRoadmapInfluences.map((inf, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {typeof inf === 'string' ? inf : (inf.consequence || inf.finding || JSON.stringify(inf))}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: WHAT COMES NEXT (Capabilities unlocked, dependencies, projects) ── */}
          {activeTab === 'next' && (
            <div className="space-y-5 anim-fade-in">
              {/* Capabilities Unlocked */}
              {capabilities.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-500">
                    Capabilities You Become Capable Of
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {capabilities.map((cap, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-electric-500 font-bold">➔</span>
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies & Succession Navigation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Prerequisites */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    <span>←</span>
                    <span>Builds On (Prerequisites)</span>
                  </div>
                  {prerequisites.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {prerequisites.map((pre, i) => {
                        const matched = allConcepts.find(c => c.name === pre);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => matched && onSelectConcept && onSelectConcept(matched)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-electric-500 transition-colors"
                          >
                            {pre}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium italic">Foundational first principle in this domain.</p>
                  )}
                </div>

                {/* Consequences */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-electric-600 dark:text-electric-400">
                    <span>→</span>
                    <span>Unlocks (Consequences)</span>
                  </div>
                  {consequences.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {consequences.map((cons, i) => {
                        const matched = allConcepts.find(c => c.name === cons);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => matched && onSelectConcept && onSelectConcept(matched)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-electric-500 transition-colors"
                          >
                            {cons}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium italic">Culmination of this trajectory phase.</p>
                  )}
                </div>
              </div>

              {/* Associated Practical Projects */}
              {relatedProjects.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    <FolderGit2 className="w-4 h-4 text-coral-500" />
                    <span>Associated Practical Projects</span>
                  </div>
                  <div className="space-y-2">
                    {relatedProjects.map(proj => (
                      <div
                        key={proj.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {proj.name || proj.title}
                          </div>
                          {proj.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {proj.description}
                            </p>
                          )}
                        </div>
                        {proj.scaffoldingLevel && (
                          <span className="self-start sm:self-auto px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-coral-100 dark:bg-coral-950 text-coral-700 dark:text-coral-300 border border-coral-200 dark:border-coral-800">
                            {proj.scaffoldingLevel}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/80 rounded-b-3xl">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Explore in Context:
            </span>
            <OpenInContextLinks
              item={{
                ...concept,
                id: concept.taskId || concept.id,
                taskId: concept.taskId || concept.id,
                name: concept.name
              }}
              showWorld={false}
              compact={true}
              onAfterNavigate={onClose}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white px-3 py-2"
            >
              Close
            </button>

            <button
              onClick={() => onFocusInNow && onFocusInNow(concept)}
              className="btn-tactile-coral px-5 py-2.5 text-xs flex items-center gap-2 shadow-md shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>CONTINUE IN NOW</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptDeepDiveDrawer;
