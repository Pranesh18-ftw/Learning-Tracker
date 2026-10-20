import React, { useState, useRef } from 'react';
import {
  X,
  Layers,
  BookMarked,
  FolderGit2,
  AlertTriangle,
  Clock,
  Sparkles,
  Compass,
  AlertCircle
} from 'lucide-react';
import { useDialogA11y } from '../utils/a11y';
import {
  RESEARCH_LAYERS,
  RESEARCH_LAYER_LABELS,
  DURABILITY_CLASSIFICATIONS,
  SOURCE_VERIFICATION_STATUSES
} from '../services/roadmapBridge/canonicalExchangeModel';

const DURABILITY_EXPLANATIONS = {
  [DURABILITY_CLASSIFICATIONS.DURABLE_FOUNDATION]: {
    label: 'Durable Foundation',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    longevity: 'Decades (20+ years)',
    meaning: 'Governing first principles and universal scientific laws that remain invariant regardless of technology or tooling changes.',
    consequence: 'Study deeply for foundational intuition and automatic recall.'
  },
  [DURABILITY_CLASSIFICATIONS.TRANSFERABLE_CAPABILITY]: {
    label: 'Transferable Capability',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    longevity: '10–20 years',
    meaning: 'Architectural patterns, mathematical problem-solving methods, and systemic debugging skills that apply across multiple subdisciplines.',
    consequence: 'Practice across multiple diverse problem contexts to build transfer.'
  },
  [DURABILITY_CLASSIFICATIONS.CURRENT_PRACTICE]: {
    label: 'Current Practice',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    longevity: '5–10 years',
    meaning: 'The prevailing industrial standards, conventions, and toolchains actively employed across modern engineering organizations.',
    consequence: 'Learn to standard professional fluency without conflating it with permanent law.'
  },
  [DURABILITY_CLASSIFICATIONS.TOOL_DEPENDENT]: {
    label: 'Tool-Dependent Knowledge',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    longevity: '3–5 years',
    meaning: 'Syntax, configuration files, and proprietary interfaces specific to particular software products or vendor ecosystems.',
    consequence: 'Learn on demand as needed for active builds; avoid over-investing in memorization.'
  },
  [DURABILITY_CLASSIFICATIONS.FAST_MOVING]: {
    label: 'Fast-Moving / Rapidly Changing',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    longevity: '1–3 years',
    meaning: 'Active areas of rapid iteration, evolving standards, and frequent library churn.',
    consequence: 'Focus on core underlying concepts rather than transient surface syntax.'
  },
  [DURABILITY_CLASSIFICATIONS.COMMODITIZING]: {
    label: 'Commoditizing Skill',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    longevity: 'Declining differentiation',
    meaning: 'Boilerplate tasks increasingly automated by compilers, code generators, or AI tooling.',
    consequence: 'Shift focus toward design specification, architecture, and verification.'
  },
  [DURABILITY_CLASSIFICATIONS.EMERGING]: {
    label: 'Emerging Frontier',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
    longevity: 'Frontier maturation',
    meaning: 'Active research and frontier exploration undergoing formalization.',
    consequence: 'Cultivate conceptual awareness without treating as hardened industry practice.'
  }
};

/**
 * FieldIntelligenceDrawer
 *
 * Central contextual dossier for the domain's field intelligence without overwhelming daily learning:
 * - 6 Evidence Layers
 * - Durability & Field Trajectory (with clear pedagogical explanations)
 * - Source Ledger & Attributed Claims (with honest epistemic provenance)
 * - Project Scaffolding Progression
 * - Research Influences & Curricular Gaps
 */
const FieldIntelligenceDrawer = ({
  subject,
  onClose
}) => {
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('layers'); // 'layers' | 'durability' | 'sources' | 'projects' | 'gaps'

  useDialogA11y({
    isOpen: Boolean(subject),
    onClose,
    containerRef
  });

  if (!subject) return null;

  const fi = subject.fieldIntelligence || {};
  const projects = subject.projects || [];
  const adaptationRules = subject.adaptationRules || [];
  const durabilityMap = fi.durabilityMap || {};
  const claims = fi.claims || [];
  const sourceLedger = fi.sourceLedger || [];
  const researchLayers = fi.researchLayers || {};
  const gapAnalysis = fi.whatStandardRoadmapWouldMiss || [];
  const roadmapInfluences = fi.roadmapInfluences || [];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs anim-pop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="field-intel-drawer-title"
    >
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col justify-between">

        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-electric-600 dark:text-electric-400 uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Field Intelligence & Research Dossier</span>
            </div>
            <h2 id="field-intel-drawer-title" className="font-display font-black text-xl sm:text-2xl text-slate-900 dark:text-white mt-1">
              {subject.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Field Intelligence"
            aria-label="Close field intelligence drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 sm:px-6 gap-1 sm:gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('layers')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'layers'
                ? 'border-electric-600 text-electric-600 dark:border-electric-400 dark:text-electric-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Research Layers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('durability')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'durability'
                ? 'border-electric-600 text-electric-600 dark:border-electric-400 dark:text-electric-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Durability Map</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'sources'
                ? 'border-electric-600 text-electric-600 dark:border-electric-400 dark:text-electric-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Sources & Claims</span>
            {claims.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono">
                {claims.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'projects'
                ? 'border-electric-600 text-electric-600 dark:border-electric-400 dark:text-electric-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            <span>Projects Progression</span>
            {projects.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono">
                {projects.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gaps')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'gaps'
                ? 'border-electric-600 text-electric-600 dark:border-electric-400 dark:text-electric-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Gaps & Adaptation</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-7 space-y-6 flex-1">

          {/* ── TAB 1: 6 EVIDENCE LAYERS ── */}
          {activeTab === 'layers' && (
            <div className="space-y-4 anim-fade-in">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Stratified Evidence Architecture
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Field reconstruction categorizes knowledge across six historical, professional, and research layers to prevent flattening deep scholarship into isolated tasks.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.keys(RESEARCH_LAYERS).map(key => {
                  const label = RESEARCH_LAYER_LABELS[key] || key;
                  const content = researchLayers[key];
                  const hasContent = Boolean(content && (typeof content === 'string' ? content.trim() : (Array.isArray(content) ? content.length > 0 : Object.keys(content).length > 0)));

                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-2xl border transition-all ${
                        hasContent
                          ? 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 shadow-xs'
                          : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          {label}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          hasContent
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          {hasContent ? 'Documented' : 'Not Detected'}
                        </span>
                      </div>

                      {hasContent ? (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-4">
                          {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          No research extracted for this layer in the imported document.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB 2: DURABILITY MAP ── */}
          {activeTab === 'durability' && (
            <div className="space-y-5 anim-fade-in">
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 block">
                  Pedagogical Durability Framework
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Different concepts have vastly different shelf lives. Invariant mathematical and physical foundations remain valid for decades, while vendor configuration tools churn rapidly. Allocate deep study time proportionally.
                </p>
              </div>

              {/* Categorized Skills */}
              <div className="space-y-4">
                {/* Durable Foundations */}
                {durabilityMap.durableSkills && durabilityMap.durableSkills.length > 0 && (
                  <div className="p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Durable Foundations (20+ Year Longevity)
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        Target: Deep Understanding
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {DURABILITY_EXPLANATIONS.DURABLE_FOUNDATION.meaning}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {durabilityMap.durableSkills.map((skill, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transferable Capabilities */}
                {durabilityMap.transferableSkills && durabilityMap.transferableSkills.length > 0 && (
                  <div className="p-4 rounded-2xl border-2 border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                        Transferable Capabilities (Cross-Disciplinary)
                      </span>
                      <span className="text-[10px] font-mono text-blue-700 dark:text-blue-400 font-bold">
                        Target: Working Fluency
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {DURABILITY_EXPLANATIONS.TRANSFERABLE_CAPABILITY.meaning}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {durabilityMap.transferableSkills.map((skill, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tool-Dependent Knowledge */}
                {durabilityMap.toolDependentSkills && durabilityMap.toolDependentSkills.length > 0 && (
                  <div className="p-4 rounded-2xl border-2 border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Tool-Dependent Knowledge (Vendor / Tooling Specific)
                      </span>
                      <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold">
                        Target: Just-in-Time Application
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {DURABILITY_EXPLANATIONS.TOOL_DEPENDENT.meaning}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {durabilityMap.toolDependentSkills.map((skill, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fast-Moving / Vulnerable Knowledge */}
                {durabilityMap.vulnerableKnowledge && durabilityMap.vulnerableKnowledge.length > 0 && (
                  <div className="p-4 rounded-2xl border-2 border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 space-y-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 block">
                      Rapidly Changing / High-Churn Knowledge
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {DURABILITY_EXPLANATIONS.FAST_MOVING.meaning}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {durabilityMap.vulnerableKnowledge.map((skill, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: SOURCES & CLAIMS PROVENANCE ── */}
          {activeTab === 'sources' && (
            <div className="space-y-5 anim-fade-in">
              {/* Epistemic Honesty Banner */}
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                    Epistemic Provenance & Verification Notice
                  </span>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Learning Tracker displays citations extracted from external AI models honestly. Citations marked "Source Attributed" reflect references cited in the source report; Learning Tracker does not independently guarantee live bibliographic existence without active library verification.
                  </p>
                </div>
              </div>

              {/* Claims Ledger */}
              {claims.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    Attributed Research Claims ({claims.length})
                  </span>

                  <div className="space-y-2">
                    {claims.map((claim, idx) => {
                      const claimText = typeof claim === 'string' ? claim : (claim.claim || claim.text || JSON.stringify(claim));
                      const sourceRef = claim.sourceRef || claim.citation || claim.source || null;
                      const confidence = claim.confidence || 'MODERATE';
                      const verified = claim.verified || (claim.status === SOURCE_VERIFICATION_STATUSES.SOURCE_VERIFIED);

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                              "{claimText}"
                            </p>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 border ${
                              verified
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                            }`}>
                              {verified ? 'Source Attributed' : 'Unverified Citation'}
                            </span>
                          </div>

                          {sourceRef && (
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <BookMarked className="w-3.5 h-3.5 text-electric-500 shrink-0" />
                              <span>Source: <strong>{sourceRef}</strong></span>
                              <span className="text-slate-400">· Confidence: {confidence}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Source Ledger / Bibliography */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  Source Ledger & Primary References ({sourceLedger.length})
                </span>

                {sourceLedger.length > 0 ? (
                  <div className="space-y-2">
                    {sourceLedger.map((src, idx) => {
                      const srcText = typeof src === 'string' ? src : (src.title || src.citation || JSON.stringify(src));
                      const srcType = typeof src === 'object' ? (src.type || 'REFERENCE') : 'REFERENCE';

                      return (
                        <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3 text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                            {srcText}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold shrink-0">
                            {srcType}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-3">
                    No explicit source citations provided in this roadmap document.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 4: PROJECTS PROGRESSION ── */}
          {activeTab === 'projects' && (
            <div className="space-y-4 anim-fade-in">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  Scaffolded Practical Progression
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Projects advance from GUIDED exercises to PARTIALLY_GUIDED implementations, SPECIFICATION_ONLY builds, and OPEN_ENDED design capstones.
                </p>
              </div>

              {projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.map((proj, idx) => {
                    const scaf = proj.scaffoldingLevel || proj.scaffolding || 'GUIDED';
                    const caps = proj.capabilitiesExercised || [];
                    const fails = proj.failureModes || proj.failureModesEncountered || [];

                    return (
                      <div
                        key={proj.id || idx}
                        className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-coral-600 dark:text-coral-400">
                              Project #{idx + 1}
                            </span>
                            <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
                              {proj.name || proj.title}
                            </h3>
                          </div>

                          <span className="self-start sm:self-auto px-2.5 py-1 rounded-lg font-mono text-[10px] font-black uppercase bg-coral-100 dark:bg-coral-950 text-coral-700 dark:text-coral-300 border border-coral-200 dark:border-coral-800">
                            {scaf}
                          </span>
                        </div>

                        {proj.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {proj.description}
                          </p>
                        )}

                        {caps.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                              Capabilities Exercised:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {caps.map((c, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {fails.length > 0 && (
                          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                            <span className="font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              Failure Modes Encountered:
                            </span>
                            <p className="pl-5">{fails.join(', ')}</p>
                          </div>
                        )}

                        {proj.whatFailureTeaches && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 italic pl-1">
                            <strong>What failure teaches:</strong> {proj.whatFailureTeaches}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-500">No integrated projects specified in this track.</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 5: GAPS & ADAPTATION ── */}
          {activeTab === 'gaps' && (
            <div className="space-y-4 anim-fade-in">
              {/* Gap Analysis */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  Curricular Gap Analysis (What Standard Roadmaps Omit)
                </span>
                {gapAnalysis.length > 0 ? (
                  <div className="space-y-2">
                    {gapAnalysis.map((gap, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{gap}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-3">
                    Standard roadmap curriculum baseline applied.
                  </p>
                )}
              </div>

              {/* Roadmap Influences */}
              {roadmapInfluences.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    Research-to-Roadmap Influence Connections
                  </span>
                  <div className="space-y-2">
                    {roadmapInfluences.map((inf, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {typeof inf === 'string' ? inf : JSON.stringify(inf)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adaptation Rules */}
              {adaptationRules.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    Learner Recovery & Adaptation Rules
                  </span>
                  <div className="space-y-2">
                    {adaptationRules.map((rule, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white">When stuck on: </strong>
                          <span className="text-slate-600 dark:text-slate-300">{rule.condition}</span>
                        </div>
                        <div className="text-electric-600 dark:text-electric-400 font-bold sm:text-right">
                          ➔ {rule.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};

export default FieldIntelligenceDrawer;
