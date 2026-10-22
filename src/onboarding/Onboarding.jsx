/**
 * Onboarding.jsx
 *
 * Unified, Coherent Onboarding Experience for Learning Tracker.
 *
 * Replaces competing overlays with a single explicit state machine:
 * ONBOARDING_IDLE -> ONBOARDING_WELCOME -> ONBOARDING_PATH_SETUP -> ONBOARDING_COMPLETE
 *
 * Guarantees:
 * - Only ONE dialog active at a time.
 * - Viewport-centered on desktop; safe-area aware responsive sheet/modal on mobile.
 * - Prevents background page scrolling while active.
 * - Clean transitions: Welcome -> Path Setup -> Application.
 * - Respects learner choice: Can choose a curated path, explore freely, or dismiss anytime.
 * - Works for first-time, returning, dismissed, authenticated, and anonymous learners.
 * - Does NOT force Google authentication.
 */

import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  X,
  Cpu,
  Layers,
  ShieldCheck,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';
import { CURATED_ROADMAPS } from '../data/curatedRoadmaps';
import { useDialogA11y } from '../utils/a11y';

export const ONBOARDING_STATES = {
  IDLE: 'ONBOARDING_IDLE',
  WELCOME: 'ONBOARDING_WELCOME',
  PATH_SETUP: 'ONBOARDING_PATH_SETUP',
  COMPLETE: 'ONBOARDING_COMPLETE'
};

const Onboarding = ({ onComplete, onStepChange }) => {
  const roadmapContext = useRoadmap() || {};
  const {
    showTutorial,
    hasImportedRoadmap,
    completeTutorial,
    importRoadmap
  } = roadmapContext;
  const navigate = useNavigate();
  const modalContainerRef = useRef(null);

  const [onboardingState, setOnboardingState] = useState(() => {
    if (!showTutorial || hasImportedRoadmap) {
      return ONBOARDING_STATES.IDLE;
    }
    return ONBOARDING_STATES.WELCOME;
  });

  const handleDismiss = useCallback(() => {
    setOnboardingState(ONBOARDING_STATES.COMPLETE);
    if (completeTutorial) completeTutorial();
    else if (onComplete) onComplete();
  }, [completeTutorial, onComplete]);

  const isOpen = onboardingState !== ONBOARDING_STATES.IDLE && onboardingState !== ONBOARDING_STATES.COMPLETE;
  useDialogA11y({
    isOpen,
    onClose: handleDismiss,
    containerRef: modalContainerRef
  });

  const handleProceedToPathSetup = () => {
    setOnboardingState(ONBOARDING_STATES.PATH_SETUP);
    if (onStepChange) onStepChange(2);
  };

  const handleBackToWelcome = () => {
    setOnboardingState(ONBOARDING_STATES.WELCOME);
    if (onStepChange) onStepChange(1);
  };

  const handleSelectCuratedTrack = (track) => {
    if (importRoadmap && track) {
      importRoadmap(track);
    }
    setOnboardingState(ONBOARDING_STATES.COMPLETE);
    if (completeTutorial) completeTutorial();
    else if (onComplete) onComplete();
    navigate('/roadmap');
  };

  const handleExploreKnowledgeWorld = () => {
    setOnboardingState(ONBOARDING_STATES.COMPLETE);
    if (completeTutorial) completeTutorial();
    else if (onComplete) onComplete();
    navigate('/roadmap');
  };

  if (onboardingState === ONBOARDING_STATES.IDLE || onboardingState === ONBOARDING_STATES.COMPLETE) {
    return null;
  }

  const modalContent = (
    <div
      ref={modalContainerRef}
      id="onboarding-overlay-container"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-slate-200 dark:border-slate-800 space-y-6 relative max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] anim-pop">

        {/* Close / Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Dismiss onboarding"
          aria-label="Close onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── STEP 1: ONBOARDING_WELCOME ── */}
        {onboardingState === ONBOARDING_STATES.WELCOME && (
          <div className="space-y-6" id="onboarding-step-welcome">
            <div className="text-center space-y-3 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-electric-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Compass className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-electric-600 dark:text-electric-400">
                  Welcome to Learning Tracker
                </span>
                <h2
                  id="onboarding-modal-title"
                  className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight"
                >
                  Build Genuine Technical Capability
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed max-w-sm mx-auto">
                A first-principles, distraction-free environment to track your true understanding, calibrated to your authentic weekly time reality.
              </p>
            </div>

            {/* Core Grounded Value Pillars */}
            <div className="space-y-2.5 pt-1">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Grounded Learning Records</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                    Track authentic learning progress, physical builds, and focus records without arbitrary gamification.
                  </p>
                </div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-electric-500/10 text-electric-600 dark:text-electric-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Authentic Time Planning</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                    Plans adapt to your real weekdays, lab hours, and hardware constraints.
                  </p>
                </div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Local-First Privacy</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                    Your learning data stays on this device. Explore anonymously or attach Google later anytime.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              <button
                id="onboarding-setup-path-btn"
                type="button"
                onClick={handleProceedToPathSetup}
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-xs font-bold tracking-wider uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Set up your path</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="onboarding-dismiss-btn"
                onClick={handleDismiss}
                className="w-full py-2.5 px-4 text-xs font-mono font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Explore on my own (Dismiss)
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: ONBOARDING_PATH_SETUP ── */}
        {onboardingState === ONBOARDING_STATES.PATH_SETUP && (
          <div className="space-y-6" id="onboarding-step-path-setup">
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleBackToWelcome}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <h2
                id="onboarding-modal-title"
                className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight"
              >
                Choose your starting path
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                Mount one of our curated STEM tracks below to start immediately, or explore the open Knowledge World.
              </p>
            </div>

            {/* Curated Track Choices */}
            <div className="space-y-3 pt-1">
              {CURATED_ROADMAPS && CURATED_ROADMAPS.slice(0, 2).map((track) => (
                <div
                  key={track.id}
                  className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-500 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {track.id === 'electronics-embedded' ? (
                        <Cpu className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Layers className="w-4 h-4 text-electric-500" />
                      )}
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {track.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                      {track.description || 'First-principles progressive technical trajectory.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectCuratedTrack(track)}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-mono font-bold tracking-wider uppercase hover:opacity-90 transition-all shrink-0 cursor-pointer text-center"
                  >
                    Start Track
                  </button>
                </div>
              ))}
            </div>

            {/* Alternate Options */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                type="button"
                id="onboarding-build-with-ai-btn"
                onClick={() => {
                  setOnboardingState(ONBOARDING_STATES.COMPLETE);
                  if (completeTutorial) completeTutorial();
                  else if (onComplete) onComplete();
                  navigate('/roadmap');
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-electric-300 dark:border-electric-800 bg-electric-50/50 dark:bg-electric-950/30 text-electric-700 dark:text-electric-300 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2 hover:bg-electric-100"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Build with Any AI (Universal Roadmap Bridge)</span>
              </button>

              <button
                type="button"
                id="onboarding-explore-world-btn"
                onClick={handleExploreKnowledgeWorld}
                className="w-full py-3 px-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-400 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <span>Explore Knowledge World</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2 text-xs font-mono font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-center"
              >
                I'll set this up later
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Onboarding;
