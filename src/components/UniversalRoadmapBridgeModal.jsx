/**
 * UniversalRoadmapBridgeModal.jsx
 *
 * Universal AI Roadmap Bridge v2: Research-First Intelligence + Flexible Ingestion UI.
 *
 * Features:
 * - Lightweight learner context collection (goal, destination, level, purpose, time).
 * - 12-Phase Universal Deep Research Charter generator with one-click copy.
 * - Multi-format ingestion: Canonical JSON, Alternate JSON, Markdown, Research Reports, Mixed.
 * - Real-time format detection & extraction confidence reporting.
 * - Conversion / repair prompt generator fallback for unstructured inputs.
 * - Detailed preview (Arcs, Modules, Subtasks, Projects, Frontier, Sources).
 * - Epistemic truthfulness notice: "Imported as PLAN only."
 * - Existing roadmap protection: Replace vs Append vs Cancel.
 * - Accessible dialog semantics, keyboard navigation, responsive mobile-to-desktop layout.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Upload,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Compass,
  ShieldAlert
} from 'lucide-react';
import {
  LEARNER_LEVELS,
  LEARNER_LEVEL_LABELS,
  LEARNER_PURPOSES,
  LEARNER_PURPOSE_LABELS,
  createLearnerContext
} from '../services/roadmapBridge/learnerContextModel';
import {
  generateDeepResearchCharter,
  generateConversionPrompt
} from '../services/roadmapBridge/researchCharter';
import {
  normalizeRoadmapInput
} from '../services/roadmapBridge/roadmapNormalizer';
import {
  CONFIDENCE_LEVELS,
  SAMPLE_AI_RESEARCH_ANSWER_MARKDOWN,
  SAMPLE_CANONICAL_V2_DATA
} from '../services/roadmapBridge/canonicalExchangeModel';
import { useDialogA11y } from '../utils/a11y';

const STEPS = {
  INTENT: 1,
  INPUT: 2,
  CONFIDENCE_AND_PREVIEW: 3,
  IMPORT_CONFIRM: 4
};

const UniversalRoadmapBridgeModal = ({
  isOpen,
  onClose,
  onImport,
  existingRoadmapCount = 0
}) => {
  const containerRef = useRef(null);

  // Modal Step State
  const [currentStep, setCurrentStep] = useState(STEPS.INTENT);

  // Step 1: Learner Context State
  const [goal, setGoal] = useState('');
  const [destination, setDestination] = useState('');
  const [currentLevel, setCurrentLevel] = useState(LEARNER_LEVELS.BEGINNER);
  const [purpose, setPurpose] = useState(LEARNER_PURPOSES.CAREER);
  const [targetHorizon, setTargetHorizon] = useState('3-6 months');
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [constraints, setConstraints] = useState('');
  const [priorKnowledge, setPriorKnowledge] = useState('');
  const [showAdvancedContext, setShowAdvancedContext] = useState(false);

  // Step 2: Ingestion Input State
  const [rawInputText, setRawInputText] = useState('');
  const [copiedCharter, setCopiedCharter] = useState(false);
  const [copiedConversionPrompt, setCopiedConversionPrompt] = useState(false);
  const [previewTab, setPreviewTab] = useState('plan'); // 'plan' | 'research' | 'projects'

  // Step 4: Import Mode State
  const [importMode, setImportMode] = useState('append'); // 'append' | 'replace'
  const [importError, setImportError] = useState(null);

  // Dialog Accessibility (Focus trap, Escape key)
  useDialogA11y({
    isOpen,
    onClose,
    containerRef
  });

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(STEPS.INTENT);
      setImportError(null);
    }
  }, [isOpen]);

  // Current Learner Context Object
  const learnerContext = useMemo(() => {
    return createLearnerContext({
      goal,
      destination,
      currentLevel,
      purpose,
      targetHorizon,
      weeklyHours,
      constraints,
      priorKnowledge
    });
  }, [goal, destination, currentLevel, purpose, targetHorizon, weeklyHours, constraints, priorKnowledge]);

  // Generated Deep Research Charter
  const generatedCharter = useMemo(() => {
    return generateDeepResearchCharter(learnerContext);
  }, [learnerContext]);

  // Live Normalization Analysis
  const normalizationReport = useMemo(() => {
    if (!rawInputText.trim()) return null;
    return normalizeRoadmapInput(rawInputText, learnerContext);
  }, [rawInputText, learnerContext]);

  // Generated Conversion / Repair Prompt (if needed)
  const conversionPrompt = useMemo(() => {
    if (!normalizationReport) return '';
    return generateConversionPrompt(rawInputText, normalizationReport, learnerContext);
  }, [rawInputText, normalizationReport, learnerContext]);

  // Copy Charter to Clipboard
  const handleCopyCharter = async () => {
    try {
      await navigator.clipboard.writeText(generatedCharter);
      setCopiedCharter(true);
      setTimeout(() => setCopiedCharter(false), 2500);
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  // Copy Conversion Prompt to Clipboard
  const handleCopyConversionPrompt = async () => {
    try {
      await navigator.clipboard.writeText(conversionPrompt);
      setCopiedConversionPrompt(true);
      setTimeout(() => setCopiedConversionPrompt(false), 2500);
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  // Load Demonstration Sample
  const handleLoadSample = (mode = 'markdown') => {
    if (mode === 'json') {
      setRawInputText(JSON.stringify(SAMPLE_CANONICAL_V2_DATA, null, 2));
    } else {
      setRawInputText(SAMPLE_AI_RESEARCH_ANSWER_MARKDOWN);
    }
    setGoal('Applied Quantum Computing');
    setDestination('Quantum Algorithm Developer');
    setCurrentLevel(LEARNER_LEVELS.INTERMEDIATE);
    setPurpose(LEARNER_PURPOSES.RESEARCH);
    setCurrentStep(STEPS.INPUT);
  };

  // Execute Import
  const handleConfirmImport = (selectedMode) => {
    if (!normalizationReport?.canonicalRoadmap) return;
    const modeToUse = selectedMode || importMode;
    setImportError(null);
    if (onImport) {
      const res = onImport(normalizationReport.canonicalRoadmap, { mode: modeToUse });
      if (res === false) {
        setImportError('Failed to import roadmap. Please verify the track structure.');
        return;
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="universal-roadmap-bridge-title"
    >
      <div
        ref={containerRef}
        className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
      >

        {/* ── HEADER ── */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-electric-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-electric-100 dark:bg-electric-950/70 text-electric-700 dark:text-electric-300 border border-electric-200 dark:border-electric-800">
                  Universal Bridge v2.3
                </span>
                <span className="text-xs font-semibold text-slate-500">Research-First Ingestion</span>
              </div>
              <h2 id="universal-roadmap-bridge-title" className="font-display font-black text-lg sm:text-xl text-slate-900 dark:text-white">
                Universal AI Roadmap Bridge
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── STEP PROGRESS BAR ── */}
        <div className="px-6 py-3 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
          <button
            type="button"
            onClick={() => setCurrentStep(STEPS.INTENT)}
            className={`flex items-center gap-1.5 transition-colors ${currentStep === STEPS.INTENT ? 'text-electric-600 dark:text-electric-400' : 'text-slate-500'}`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-electric-600 text-white">1</span>
            <span>Learner Intent & Charter</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">➔</span>
          <button
            type="button"
            onClick={() => setCurrentStep(STEPS.INPUT)}
            className={`flex items-center gap-1.5 transition-colors ${currentStep === STEPS.INPUT ? 'text-electric-600 dark:text-electric-400' : 'text-slate-500'}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= STEPS.INPUT ? 'bg-electric-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>2</span>
            <span>Paste AI Output</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">➔</span>
          <button
            type="button"
            onClick={() => normalizationReport && setCurrentStep(STEPS.CONFIDENCE_AND_PREVIEW)}
            disabled={!normalizationReport}
            className={`flex items-center gap-1.5 transition-colors ${currentStep === STEPS.CONFIDENCE_AND_PREVIEW ? 'text-electric-600 dark:text-electric-400' : 'text-slate-500 disabled:opacity-50'}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= STEPS.CONFIDENCE_AND_PREVIEW ? 'bg-electric-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>3</span>
            <span>Preview & Confidence</span>
          </button>
        </div>

        {/* ── MODAL BODY CONTENT ── */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 1: DEFINE INTENT & RESEARCH CHARTER                    */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentStep === STEPS.INTENT && (
            <div className="space-y-6">
              <div className="bg-electric-50/70 dark:bg-electric-950/30 border border-electric-200 dark:border-electric-900 rounded-2xl p-4 text-xs text-electric-900 dark:text-electric-200 space-y-1">
                <p className="font-bold">Reconstruct any field deeply before studying it.</p>
                <p className="text-electric-700 dark:text-electric-300">
                  Learning Tracker generates a deep 15-phase research charter you can copy to Claude, ChatGPT, or Gemini. The external AI reconstructs foundational lineage, epistemic concepts, learning vs. doing separation, anti-saturation thresholds, and the research frontier rather than creating a shallow course syllabus.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="learner-goal-input" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    What do you want to learn? <span className="text-coral-500">*</span>
                  </label>
                  <input
                    id="learner-goal-input"
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. Applied Quantum Computing, Compilers, Robotics..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="learner-dest-input" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Desired Destination / Capability Outcome
                  </label>
                  <input
                    id="learner-dest-input"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Quantum Algorithm Developer, Ready for Internship..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-electric-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="learner-level-select" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Current Level
                  </label>
                  <select
                    id="learner-level-select"
                    value={currentLevel}
                    onChange={(e) => setCurrentLevel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-electric-500"
                  >
                    {Object.keys(LEARNER_LEVELS).map((lvl) => (
                      <option key={lvl} value={lvl}>{LEARNER_LEVEL_LABELS[lvl]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="learner-purpose-select" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Learning Purpose
                  </label>
                  <select
                    id="learner-purpose-select"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-electric-500"
                  >
                    {Object.keys(LEARNER_PURPOSES).map((purp) => (
                      <option key={purp} value={purp}>{LEARNER_PURPOSE_LABELS[purp]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="learner-horizon-input" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Target Horizon
                  </label>
                  <input
                    id="learner-horizon-input"
                    type="text"
                    value={targetHorizon}
                    onChange={(e) => setTargetHorizon(e.target.value)}
                    placeholder="e.g. 3-6 months"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="learner-hours-input" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Weekly Time (Hours)
                  </label>
                  <input
                    id="learner-hours-input"
                    type="number"
                    min="1"
                    max="80"
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-electric-500"
                  />
                </div>
              </div>

              {/* Expandable Advanced Context (Optional) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedContext(!showAdvancedContext)}
                  className="text-xs font-bold text-electric-600 dark:text-electric-400 flex items-center gap-1 hover:underline"
                >
                  <span>{showAdvancedContext ? '▼ Hide' : '▶ Show'} Optional Constraints & Background</span>
                </button>

                {showAdvancedContext && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="space-y-1.5">
                      <label htmlFor="learner-constraints-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Constraints / Resources (Hardware, Tools, Budget)
                      </label>
                      <input
                        id="learner-constraints-input"
                        type="text"
                        value={constraints}
                        onChange={(e) => setConstraints(e.target.value)}
                        placeholder="e.g. Linux laptop, no GPU, no hardware lab..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="learner-prior-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Prior Knowledge / Background
                      </label>
                      <input
                        id="learner-prior-input"
                        type="text"
                        value={priorKnowledge}
                        onChange={(e) => setPriorKnowledge(e.target.value)}
                        placeholder="e.g. Python basics, calculus, circuits..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Prompt Copy Card */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Generated Deep Research Charter Prompt
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCharter}
                    className="btn-tactile-electric px-3 py-1.5 text-xs flex items-center gap-1.5 bg-electric-500 hover:bg-electric-400"
                  >
                    {copiedCharter ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                    <span>{copiedCharter ? 'Copied Prompt!' : 'Copy Charter Prompt'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 max-h-32 overflow-y-auto whitespace-pre-line border border-slate-800">
                  {generatedCharter.slice(0, 500)}...
                </div>

                <p className="text-[11px] text-slate-400">
                  Paste this into Claude 3.7, ChatGPT o3-mini, Gemini 2.0 Pro, or DeepSeek R1 to reconstruct the field. Then paste their answer in Step 2.
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 2: PASTE AI OUTPUT                                   */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentStep === STEPS.INPUT && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Paste the AI roadmap or research answer here
                  </h3>
                  <p className="text-xs text-slate-500">
                    Accepts Markdown, canonical JSON, alternate course formats, research dossiers, or freeform text.
                  </p>
                </div>

                {/* Demo Loaders */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">Sample Demo:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('markdown')}
                    className="px-2.5 py-1 text-xs font-bold text-electric-600 dark:text-electric-400 bg-electric-50 dark:bg-electric-950/60 rounded-lg hover:underline"
                    title="SAMPLE ONLY — NEVER IMPORT THIS DATA"
                  >
                    Markdown Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('json')}
                    className="px-2.5 py-1 text-xs font-bold text-electric-600 dark:text-electric-400 bg-electric-50 dark:bg-electric-950/60 rounded-lg hover:underline"
                    title="SAMPLE ONLY — NEVER IMPORT THIS DATA"
                  >
                    JSON Sample
                  </button>
                </div>
              </div>

              {/* Big Flexible Input Textarea */}
              <div className="relative">
                <textarea
                  id="paste-ai-roadmap-textarea"
                  value={rawInputText}
                  onChange={(e) => setRawInputText(e.target.value)}
                  placeholder={`Paste output from Claude, ChatGPT, Gemini, or DeepSeek here...

Examples:
- Markdown with '# Learning Arc', '## Module', and '- [ ] Subtask'
- Deep Research Report with Phase 1 to Phase 12 findings
- Canonical JSON or any other course/task JSON tree`}
                  className="w-full h-64 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-electric-500 shadow-inner"
                />

                {/* Live Format Badge */}
                {normalizationReport && (
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 text-slate-100 border border-slate-700 shadow-xs">
                      Format: {normalizationReport.format}
                    </span>
                  </div>
                )}
              </div>

              {/* Sample Only Warning Notice if sample loaded */}
              {rawInputText.includes('SAMPLE ONLY') && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>SAMPLE ONLY — Demonstrates schema capabilities; do not use as personal progress.</span>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 3: CONFIDENCE MATRIX & PREVIEW                       */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentStep === STEPS.CONFIDENCE_AND_PREVIEW && normalizationReport && (
            <div className="space-y-6">

              {/* Extraction Confidence Matrix */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Extraction Confidence & Section Coverage
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    Format: {normalizationReport.format}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {Object.entries(normalizationReport.confidence).map(([section, level]) => {
                    const isDetected = level === CONFIDENCE_LEVELS.DETECTED;
                    const isPartial = level === CONFIDENCE_LEVELS.PARTIALLY_DETECTED;
                    return (
                      <div
                        key={section}
                        className={`p-2 rounded-xl border flex items-center gap-2 font-bold ${
                          isDetected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                            : (isPartial
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400')
                        }`}
                      >
                        {isDetected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {isPartial && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                        {!isDetected && !isPartial && <span className="text-[10px]">✕</span>}
                        <span className="truncate capitalize">{section.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Research Depth & Provenance Gate (v2.3) */}
              {normalizationReport.researchQuality && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Structural Research Coverage Gate
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        normalizationReport.researchQuality.rating === 'STRONG'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                          : normalizationReport.researchQuality.rating === 'ADEQUATE'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                          : normalizationReport.researchQuality.rating === 'LIMITED'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        Research Coverage: {normalizationReport.researchQuality.rating}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">
                      {normalizationReport.summaryMetrics?.layersDetectedCount || 0} of 6 Evidence Layers Detected
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    Structural coverage assessed from schema depth. Citations and claims are attributed as provided by external AI; they are not independently fact-verified.
                  </p>

                  {/* 6 Evidence Layers Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-[11px]">
                    {[
                      { key: 'FOUNDATIONS', label: 'A: Foundations' },
                      { key: 'FIELD_DEVELOPMENT', label: 'B: Development' },
                      { key: 'CURRENT_PRACTICE', label: 'C: Practice' },
                      { key: 'CURRENT_RESEARCH', label: 'D: Research' },
                      { key: 'EMERGING_FUTURE', label: 'E: Emerging' },
                      { key: 'FIELD_SURVIVAL', label: 'F: Durability' }
                    ].map(layer => {
                      const active = normalizationReport.researchQuality.layersDetected?.[layer.key];
                      return (
                        <div
                          key={layer.key}
                          className={`p-1.5 rounded-lg border text-center font-bold truncate ${
                            active
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                              : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          <span>{active ? '✓ ' : '✕ '}{layer.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Source Categories Breakdown */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500 font-bold">Source Types:</span>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      Primary Research: {normalizationReport.researchQuality.sourceCategories?.primaryResearch || 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      Reviews & Surveys: {normalizationReport.researchQuality.sourceCategories?.reviews || 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      Official Standards/Docs: {normalizationReport.researchQuality.sourceCategories?.officialOrStandards || 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      Other: {normalizationReport.researchQuality.sourceCategories?.other || 0}
                    </span>
                  </div>
                </div>
              )}

              {/* Extraction Warnings if any */}
              {normalizationReport.warnings.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Provenance & Quality Warnings:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-2 font-semibold text-amber-800 dark:text-amber-300">
                    {normalizationReport.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* If normalization cannot extract actionable tasks: Show Conversion Prompt Fallback */}
              {normalizationReport.needsConversion && (
                <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-amber-400">
                        Conversion Required: Useful Research Detected
                      </h4>
                      <p className="text-xs text-slate-300">
                        Your AI answer contains useful roadmap material, but it is not yet in an importable structure. Copy this targeted conversion prompt into your external AI to format it into actionable modules:
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyConversionPrompt}
                      className="btn-tactile-electric px-3.5 py-2 text-xs flex items-center gap-1.5 shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                    >
                      {copiedConversionPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedConversionPrompt ? 'Copied Prompt!' : 'Copy Conversion Prompt'}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 max-h-28 overflow-y-auto border border-slate-800">
                    {conversionPrompt.slice(0, 400)}...
                  </div>
                </div>
              )}

              {/* Preview Metrics & Summary */}
              {normalizationReport.canImportDirectly && (
                <div className="space-y-4">
                  {/* Summary Metric Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-electric-100 dark:bg-electric-950 text-electric-700 dark:text-electric-300 font-bold text-xs">
                      {normalizationReport.summaryMetrics.arcCount} Learning Arcs
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                      {normalizationReport.summaryMetrics.moduleCount} Modules
                    </span>
                    {normalizationReport.summaryMetrics.learningUnitCount > 0 && (
                      <span className="px-3 py-1 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold text-xs">
                        {normalizationReport.summaryMetrics.learningUnitCount} Learning Units (Knowledge)
                      </span>
                    )}
                    {normalizationReport.summaryMetrics.doingTaskCount > 0 && (
                      <span className="px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-xs">
                        {normalizationReport.summaryMetrics.doingTaskCount} Doing Tasks (Application)
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">
                      {normalizationReport.summaryMetrics.subtaskCount} Subtasks
                    </span>
                    {normalizationReport.summaryMetrics.projectCount > 0 && (
                      <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                        {normalizationReport.summaryMetrics.projectCount} Projects
                      </span>
                    )}
                    {normalizationReport.summaryMetrics.competencyCount > 0 && (
                      <span className="px-3 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                        {normalizationReport.summaryMetrics.competencyCount} Competencies
                      </span>
                    )}
                    {normalizationReport.summaryMetrics.sourceCount > 0 && (
                      <span className="px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold text-xs">
                        {normalizationReport.summaryMetrics.sourceCount} Sources Listed
                      </span>
                    )}
                    {normalizationReport.summaryMetrics.claimCount > 0 && (
                      <span className="px-3 py-1 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-xs">
                        {normalizationReport.summaryMetrics.claimCount} Claims Attributed
                      </span>
                    )}
                    {normalizationReport.summaryMetrics.researchQualityRating && (
                      <span className="px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold text-xs">
                        Coverage: {normalizationReport.summaryMetrics.researchQualityRating}
                      </span>
                    )}
                  </div>

                  {/* Epistemic Truthfulness Notice */}
                  <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Imported as PLAN only. No completion, evidence, verification or mastery has been created.</span>
                  </div>

                  {/* Tabs: Plan vs Research vs Projects */}
                  <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('plan')}
                      className={`pb-2 transition-colors ${previewTab === 'plan' ? 'border-b-2 border-electric-600 text-electric-600 dark:text-electric-400' : 'text-slate-500'}`}
                    >
                      Roadmap Structure ({normalizationReport.summaryMetrics.arcCount} Arcs)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('research')}
                      className={`pb-2 transition-colors ${previewTab === 'research' ? 'border-b-2 border-electric-600 text-electric-600 dark:text-electric-400' : 'text-slate-500'}`}
                    >
                      Research Dossier ({normalizationReport.summaryMetrics.sourceCount} Sources)
                    </button>
                    {normalizationReport.summaryMetrics.projectCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewTab('projects')}
                        className={`pb-2 transition-colors ${previewTab === 'projects' ? 'border-b-2 border-electric-600 text-electric-600 dark:text-electric-400' : 'text-slate-500'}`}
                      >
                        Projects & Specializations
                      </button>
                    )}
                  </div>

                  {/* Tab 1: Roadmap Structure */}
                  {previewTab === 'plan' && (
                    <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                      {normalizationReport.canonicalRoadmap.map((subj) => (
                        <div key={subj.id} className="space-y-2">
                          <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            Track: {subj.name}
                          </h5>
                          {(subj.phases || []).map((phase, pIdx) => (
                            <div key={phase.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                              <span className="font-bold text-xs text-electric-700 dark:text-electric-300">
                                Phase {pIdx + 1}: {phase.name}
                              </span>
                              <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5">
                                {(phase.tasks || []).map((task) => (
                                  <div key={task.id} className="text-xs space-y-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">• {task.name}</span>
                                      {task.learningUnits?.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                                          {task.learningUnits.length} learn units
                                        </span>
                                      )}
                                      {task.doingTasks?.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                          {task.doingTasks.length} doing tasks
                                        </span>
                                      )}
                                      {task.subtasks?.length > 0 && (
                                        <span className="text-slate-400 text-[11px]">({task.subtasks.length} subtasks)</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 2: Research Dossier (v2.3) */}
                  {previewTab === 'research' && (() => {
                    const fi = normalizationReport.canonicalRoadmap[0]?.fieldIntelligence || {};
                    return (
                      <div className="max-h-72 overflow-y-auto space-y-3.5 text-xs pr-2">
                        {/* Field Definition */}
                        {fi.fieldDefinition && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Field Definition:</span>
                            <p className="text-slate-600 dark:text-slate-300">
                              {fi.fieldDefinition}
                            </p>
                          </div>
                        )}

                        {/* Claims Traceability Ledger */}
                        {fi.claims?.length > 0 && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                                Claim & Source Evidence Traceability ({fi.claims.length}):
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {fi.claims.map((cl, idx) => (
                                <div key={cl.id || idx} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {cl.claim}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {cl.sourceId && (
                                        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                          {cl.sourceId}
                                        </span>
                                      )}
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        cl.confidence === 'HIGH'
                                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                                          : cl.confidence === 'UNCERTAIN'
                                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                                          : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
                                      }`}>
                                        {cl.confidence || 'MEDIUM'}
                                      </span>
                                    </div>
                                  </div>
                                  {(cl.whySourceMatters || cl.sourceType || cl.publicationYear) && (
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                                      {cl.sourceType && <span>Type: {cl.sourceType}</span>}
                                      {cl.publicationYear && <span>Year: {cl.publicationYear}</span>}
                                      {cl.whySourceMatters && <span>· {cl.whySourceMatters}</span>}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* What the Standard Roadmap Would Miss (Gap Analysis) */}
                        {fi.whatStandardRoadmapWouldMiss?.length > 0 && (
                          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2">
                            <span className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[11px]">
                              What The Standard Roadmap Would Miss ({fi.whatStandardRoadmapWouldMiss.length}):
                            </span>
                            <div className="space-y-1.5">
                              {fi.whatStandardRoadmapWouldMiss.map((gap, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/40 space-y-1">
                                  <div className="font-bold text-slate-800 dark:text-slate-200">
                                    {gap.area || 'Gap Area'}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                                    {gap.commonlyOmitted && (
                                      <div><span className="font-semibold text-rose-600 dark:text-rose-400">Commonly Omitted:</span> {gap.commonlyOmitted}</div>
                                    )}
                                    {gap.highLeverage && (
                                      <div><span className="font-semibold text-emerald-600 dark:text-emerald-400">High Leverage:</span> {gap.highLeverage}</div>
                                    )}
                                    {gap.bridgeConcept && (
                                      <div><span className="font-semibold text-indigo-600 dark:text-indigo-400">Bridge Concept:</span> {gap.bridgeConcept}</div>
                                    )}
                                    {gap.realWorldFailure && (
                                      <div><span className="font-semibold text-amber-600 dark:text-amber-400">Failure Mode:</span> {gap.realWorldFailure}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Research Finding -> Roadmap Consequence Influences */}
                        {fi.roadmapInfluences?.length > 0 && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                              Roadmap Influence Test (Finding → Consequence):
                            </span>
                            <div className="space-y-1">
                              {fi.roadmapInfluences.map((inf, idx) => (
                                <div key={idx} className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] flex items-start gap-2">
                                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">Finding:</span>
                                  <span className="text-slate-700 dark:text-slate-300">{inf.finding}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Consequence:</span>
                                  <span className="text-slate-700 dark:text-slate-300">{inf.consequence}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Durability Map */}
                        {fi.durabilityMap?.length > 0 && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                              Durability & Field Survival Map:
                            </span>
                            <div className="space-y-1">
                              {fi.durabilityMap.map((dur, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-0.5">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {dur.capability || dur.skill || dur.knowledge || 'Skill'}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      {dur.classification}
                                    </span>
                                  </div>
                                  {dur.why && (
                                    <p className="text-slate-500 dark:text-slate-400">{dur.why}</p>
                                  )}
                                  {dur.recommendedDepth && (
                                    <div className="text-[10px] text-electric-600 dark:text-electric-400 font-semibold">
                                      Recommended Depth: {dur.recommendedDepth}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Research Frontier */}
                        {fi.researchFrontier?.length > 0 && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Research Frontier:</span>
                            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                              {fi.researchFrontier.map((rf, idx) => (
                                <li key={idx}>
                                  {typeof rf === 'string' ? rf : rf.area || JSON.stringify(rf)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Comprehensive Source Ledger */}
                        {fi.sourceLedger?.length > 0 && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                                Source Ledger ({fi.sourceLedger.length}):
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {fi.sourceLedger.map((src, idx) => (
                                <div key={src.id || idx} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                      {src.id && <span className="font-mono text-electric-600 mr-1">[{src.id}]</span>}
                                      <span>{src.title || src.citation}</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                                      {src.verificationStatus || src.status || 'SOURCE_VERIFIED'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400 text-[10px]">
                                    {src.type && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{src.type}</span>}
                                    {src.year && <span>Year: {src.year}</span>}
                                    {src.recency && <span>Horizon: {src.recency}</span>}
                                    {src.authors?.length > 0 && <span>Authors: {Array.isArray(src.authors) ? src.authors.join(', ') : src.authors}</span>}
                                    {src.identifier && <span className="font-mono">ID: {src.identifier}</span>}
                                    {src.url && (
                                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-electric-500 hover:underline">
                                        Link ↗
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Research Scope & Limitations Honesty */}
                        {(fi.researchScope || fi.researchLimitations?.length > 0 || fi.coverageGaps?.length > 0) && (
                          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Research Honesty & Scope:</span>
                            {fi.researchScope && <p><span className="font-semibold">Scope:</span> {fi.researchScope}</p>}
                            {fi.researchLimitations?.length > 0 && (
                              <p><span className="font-semibold">Limitations:</span> {Array.isArray(fi.researchLimitations) ? fi.researchLimitations.join('; ') : fi.researchLimitations}</p>
                            )}
                            {fi.coverageGaps?.length > 0 && (
                              <p><span className="font-semibold">Coverage Gaps:</span> {Array.isArray(fi.coverageGaps) ? fi.coverageGaps.join('; ') : fi.coverageGaps}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Tab 3: Projects & Specializations */}
                  {previewTab === 'projects' && (
                    <div className="max-h-60 overflow-y-auto space-y-3 text-xs pr-2">
                      {(normalizationReport.canonicalRoadmap[0]?.projects || []).map((proj) => (
                        <div key={proj.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{proj.name}</span>
                            {proj.scaffoldingLevel && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                                {proj.scaffoldingLevel}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">{proj.description}</p>
                          {proj.failureModes?.length > 0 && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-300">
                              <span className="font-semibold">Failure modes: </span>
                              {proj.failureModes.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}

                      {normalizationReport.canonicalRoadmap[0]?.adaptationRules?.rules?.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                          <span className="font-bold text-purple-700 dark:text-purple-300">Adaptation & Remediation Rules:</span>
                          <div className="space-y-1">
                            {normalizationReport.canonicalRoadmap[0].adaptationRules.rules.map((rule, idx) => (
                              <div key={idx} className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                                <span className="font-bold text-slate-800 dark:text-slate-200">[{rule.weaknessType}] </span>
                                <span className="text-slate-600 dark:text-slate-300">{rule.action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {importError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 4: EXISTING ROADMAP PROTECTION CONFIRMATION          */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentStep === STEPS.IMPORT_CONFIRM && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Existing Roadmap Detected ({existingRoadmapCount} tracks)</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  You already have active roadmaps in your learning tracker. Choose how you want to handle the new track:
                </p>
              </div>

              {normalizationReport?.canonicalRoadmap?.[0] && (
                <div className="p-3.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="text-electric-600 dark:text-electric-400 font-black">Incoming Track:</span>
                    <span>{normalizationReport.canonicalRoadmap[0].name}</span>
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {normalizationReport.summaryMetrics.arcCount || 0} arcs · {normalizationReport.summaryMetrics.moduleCount || 0} modules · {normalizationReport.summaryMetrics.subtaskCount || 0} steps
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setImportMode('append');
                    handleConfirmImport('append');
                  }}
                  className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-electric-500 bg-white dark:bg-slate-800 text-left space-y-2 transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-electric-100 dark:bg-electric-950 text-electric-600 dark:text-electric-400 flex items-center justify-center font-bold">
                    +
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-electric-600">
                    Add as New Subject Track (Recommended)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Preserves your existing roadmap and adds this track alongside it. Switch between them anytime.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setImportMode('replace');
                    handleConfirmImport('replace');
                  }}
                  className="p-5 rounded-2xl border-2 border-coral-200 dark:border-coral-800/60 hover:border-coral-500 bg-coral-50/30 dark:bg-coral-950/20 text-left space-y-2 transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-coral-100 dark:bg-coral-950 text-coral-600 dark:text-coral-400 flex items-center justify-center font-bold">
                    ↺
                  </div>
                  <h4 className="font-bold text-sm text-coral-700 dark:text-coral-300 group-hover:text-coral-600">
                    Replace Current Roadmap
                  </h4>
                  <p className="text-xs text-slate-500">
                    Replaces your current roadmap with this new plan. Previous unarchived roadmap data will be overwritten.
                  </p>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER NAVIGATION ── */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            {currentStep > STEPS.INTENT && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="btn-tactile-ghost px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>

            {currentStep === STEPS.INTENT && (
              <button
                type="button"
                onClick={() => setCurrentStep(STEPS.INPUT)}
                disabled={!goal.trim()}
                className="btn-tactile-electric px-5 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Continue to AI Output</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === STEPS.INPUT && (
              <button
                type="button"
                onClick={() => setCurrentStep(STEPS.CONFIDENCE_AND_PREVIEW)}
                disabled={!rawInputText.trim() || !normalizationReport}
                className="btn-tactile-electric px-5 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Analyze & Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === STEPS.CONFIDENCE_AND_PREVIEW && normalizationReport?.canImportDirectly && (
              <button
                type="button"
                onClick={() => {
                  if (existingRoadmapCount > 0) {
                    setCurrentStep(STEPS.IMPORT_CONFIRM);
                  } else {
                    handleConfirmImport('replace');
                  }
                }}
                className="btn-tactile-electric px-5 py-2 text-xs flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{existingRoadmapCount > 0 ? 'Proceed to Import Options' : 'Import Roadmap as Plan'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UniversalRoadmapBridgeModal;
