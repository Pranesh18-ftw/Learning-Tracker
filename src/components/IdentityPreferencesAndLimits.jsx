/**
 * IdentityPreferencesAndLimits.jsx
 *
 * Fourth Section: LIMITS, ENVIRONMENT & STARTING PREFERENCES
 *
 * Philosophy:
 * - Avoids pseudoscientific labels ("visual learner", "auditory learner").
 * - Asks pragmatic behavioral questions:
 *   "What helps you start?"
 *   "Where do you usually work?"
 *   "What usually limits you?"
 *   "Learning flow preference" (Concrete -> Abstract vs Abstract -> Concrete)
 */

import React from 'react';
import { Sparkles, AlertOctagon, MapPin, Sliders, Volume2 } from 'lucide-react';

const START_TRIGGER_PRESETS = [
  'A concrete problem to solve',
  'A physical build or project',
  'A clear, step-by-step checklist',
  'A clean conceptual explanation',
  'A rapid derivation challenge',
  'Quiet independent tinkering'
];

const CONSTRAINT_PRESETS = [
  'Time availability',
  'College / work schedule',
  'Hardware budget',
  'Physical workspace',
  'Daily energy / fatigue',
  'Internet connectivity',
  'Commute & travel time',
  'Frequent interruptions'
];

const LOCATION_OPTIONS = [
  'Home workspace',
  'College campus',
  'Engineering lab',
  'Library',
  'Hostel / dorm',
  'Cafe',
  'Mixed / Variable'
];

const NOISE_OPTIONS = [
  'Quiet environment',
  'Moderate ambient noise',
  'Frequent interruptions',
  'Shared living space'
];

const IdentityPreferencesAndLimits = ({
  constraints = [],
  workEnvironment = {},
  preferences = {},
  onUpdateConstraints,
  onUpdateWorkEnvironment,
  onUpdatePreferences
}) => {
  const startTriggers = preferences.startTriggers || [];
  const conceptFlow = preferences.conceptFlow || 'concrete-to-abstract';
  const executionBias = preferences.executionBias || 'build-to-understand';
  const sessionBias = preferences.sessionBias || 'short-focused';

  const location = workEnvironment.primaryLocation || 'Mixed / Variable';
  const noiseLevel = workEnvironment.noiseLevel || 'Moderate ambient noise';

  const toggleTrigger = (trigger) => {
    const next = startTriggers.includes(trigger)
      ? startTriggers.filter(t => t !== trigger)
      : [...startTriggers, trigger];
    onUpdatePreferences({
      ...preferences,
      startTriggers: next
    });
  };

  const toggleConstraint = (c) => {
    const next = constraints.includes(c)
      ? constraints.filter(x => x !== c)
      : [...constraints, c];
    onUpdateConstraints(next);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">

      {/* Section Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
            Section 04 · Reality Constraints & Preferences
          </span>
          <h2 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
            What gets in the way, and what helps you start?
          </h2>
        </div>
      </div>

      {/* ── 1. WHAT HELPS YOU START? ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            What helps you overcome friction to start?
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {START_TRIGGER_PRESETS.map((trigger) => {
            const isSelected = startTriggers.includes(trigger);
            return (
              <button
                key={trigger}
                type="button"
                onClick={() => toggleTrigger(trigger)}
                className={`p-3 rounded-2xl border text-left text-xs font-mono transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100 font-bold shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span>{trigger}</span>
                <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold ${
                  isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}>
                  {isSelected ? '✓' : '+'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. WHAT USUALLY LIMITS YOU? ── */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-3.5 h-3.5 text-coral-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            What usually limits you? (Resource Constraints)
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {CONSTRAINT_PRESETS.map((c) => {
            const hasC = constraints.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleConstraint(c)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 ${
                  hasC
                    ? 'bg-coral-50 dark:bg-coral-950/30 border-coral-400 dark:border-coral-700 text-coral-900 dark:text-coral-200 font-bold shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span>{hasC ? '✕' : '+'}</span>
                <span>{c}</span>
              </button>
            );
          })}
        </div>

        <span className="text-[10px] font-mono text-slate-400 block">
          Used to produce realistic routes and gentle recovery adjustments when life gets busy.
        </span>
      </div>

      {/* ── 3. WORK ENVIRONMENT & NOISE ── */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-electric-500" />
              <span>Primary Workspace:</span>
            </div>
            <select
              value={location}
              onChange={(e) => onUpdateWorkEnvironment({ ...workEnvironment, primaryLocation: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-electric-500"
            >
              {LOCATION_OPTIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Sound / Interruption Level */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Interruption / Soundscape:</span>
            </div>
            <select
              value={noiseLevel}
              onChange={(e) => onUpdateWorkEnvironment({ ...workEnvironment, noiseLevel: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {NOISE_OPTIONS.map(noise => (
                <option key={noise} value={noise}>{noise}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ── 4. LIGHTWEIGHT LEARNING PREFERENCES ── */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
          Pedagogical Sequencing Preferences:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">

          {/* Concrete vs Abstract */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Theory Progression:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdatePreferences({ ...preferences, conceptFlow: 'concrete-to-abstract' })}
                className={`py-1.5 px-2 rounded-xl text-center transition-all ${
                  conceptFlow === 'concrete-to-abstract'
                    ? 'bg-violet-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Concrete → Theory
              </button>
              <button
                type="button"
                onClick={() => onUpdatePreferences({ ...preferences, conceptFlow: 'abstract-to-concrete' })}
                className={`py-1.5 px-2 rounded-xl text-center transition-all ${
                  conceptFlow === 'abstract-to-concrete'
                    ? 'bg-violet-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Theory → Concrete
              </button>
            </div>
          </div>

          {/* Build vs Understand */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Execution Instinct:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdatePreferences({ ...preferences, executionBias: 'build-to-understand' })}
                className={`py-1.5 px-2 rounded-xl text-center transition-all ${
                  executionBias === 'build-to-understand'
                    ? 'bg-electric-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Build → Learn
              </button>
              <button
                type="button"
                onClick={() => onUpdatePreferences({ ...preferences, executionBias: 'understand-to-build' })}
                className={`py-1.5 px-2 rounded-xl text-center transition-all ${
                  executionBias === 'understand-to-build'
                    ? 'bg-electric-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Learn → Build
              </button>
            </div>
          </div>

          {/* Session Duration Bias */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Session Cadence:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdatePreferences({ ...preferences, sessionBias: 'short-focused' })}
                className={`py-1.5 px-2 rounded-xl text-center transition-all ${
                  sessionBias === 'short-focused'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Focused (25-35m)
              </button>
              <button
                type="button"
                onClick={() => onUpdatePreferences({ ...preferences, sessionBias: 'deep-immersion' })}
                className={`py-1.5 px-2 rounded-xl text-center transition-all ${
                  sessionBias === 'deep-immersion'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Deep (45m+)
              </button>
            </div>
          </div>

        </div>
      </div>

    </section>
  );
};

export default IdentityPreferencesAndLimits;
