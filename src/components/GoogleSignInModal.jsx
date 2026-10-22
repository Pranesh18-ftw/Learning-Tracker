/**
 * GoogleSignInModal.jsx
 *
 * Tactile, Lightweight Google Sign-In & Minimal Onboarding Modal.
 *
 * Part 3, 5, 6, 7 UX Hardening:
 * - Viewport-level dialog layer via React Portal (properly centered, never attached to header).
 * - Honest account value proposition:
 *   Title: "Create your Learning Tracker identity"
 *   Copy: "Sign in with Google to attach this learning profile to a real account. Your learning data stays on this device for now."
 *   Primary: [ Continue with Google ]
 *   Secondary: "Continue without an account" (choice, not a gate)
 *   Truthful note: "Account sync across devices will be available when cloud sync is connected."
 * - Zero claims of cloud backup, multi-device sync, or cross-device restoration.
 * - Background interaction blocked, body scroll locked while modal is open.
 */

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X
} from 'lucide-react';
import { signInWithGoogle, hasExistingLocalData } from '../services/authService';
import { loadIdentity, saveIdentity } from '../utils/identityRealityResolver';

import { useDialogA11y } from '../utils/a11y';

const GoogleSignInModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState('initial'); // 'initial' | 'local_data_prompt' | 'minimal_onboarding' | 'complete'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const modalContainerRef = useRef(null);

  // Minimal onboarding fields
  const [targetGoal, setTargetGoal] = useState('Embedded Systems Internship');
  const [weekdayMinutes, setWeekdayMinutes] = useState(35);

  // Accessible dialog handling (Escape key, focus trapping, return focus, scroll lock)
  useDialogA11y({
    isOpen,
    onClose,
    containerRef: modalContainerRef
  });

  if (!isOpen) return null;

  const handleGoogleClick = async () => {
    setLoading(true);
    setError(null);

    const hasLocal = hasExistingLocalData();
    if (hasLocal && step === 'initial') {
      setLoading(false);
      setStep('local_data_prompt');
      return;
    }

    await proceedWithSignIn(true);
  };

  const proceedWithSignIn = async (shouldClaimLocal) => {
    setLoading(true);
    setError(null);

    const res = await signInWithGoogle({
      claimExistingLocalData: shouldClaimLocal
    });

    setLoading(false);

    if (res.success) {
      if (res.redirectInitiated) {
        // Browser redirect to Google Auth provider in progress
        return;
      }

      // Check if user already has an active goal configured
      const identity = loadIdentity();
      if (!identity.destination?.primaryGoal || identity.destination.primaryGoal === 'Embedded Systems Internship') {
        // Offer quick 1-step alignment with real authenticated user
        setStep('minimal_onboarding');
      } else {
        onSuccess && onSuccess(res.user);
        onClose && onClose();
      }
    } else {
      setError(res.error || 'Authentication could not be completed.');
      setStep('initial');
    }
  };

  const handleFinishOnboarding = () => {
    const current = loadIdentity();
    saveIdentity({
      ...current,
      destination: {
        ...current.destination,
        primaryGoal: targetGoal.trim() || 'Embedded Systems Internship',
        statement: `I want to build capability toward ${targetGoal.trim()}.`
      },
      timeReality: {
        ...current.timeReality,
        weekdayMinutes: Number(weekdayMinutes) || 35
      }
    });

    onSuccess && onSuccess();
    onClose && onClose();
  };

  const modalContent = (
    <div
      ref={modalContainerRef}
      id="google-signin-modal-container"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-auth-modal-title"
    >
      <div className="w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-slate-200 dark:border-slate-800 space-y-6 relative max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] anim-pop">

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── STEP 1: INITIAL SIMPLE LOGIN ENTRY ── */}
        {step === 'initial' && (
          <div className="text-center space-y-5" id="auth-modal-step-initial">
            <div className="w-14 h-14 rounded-2xl bg-electric-600 text-white flex items-center justify-center mx-auto shadow-md">
              <Compass className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2
                id="google-auth-modal-title"
                className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight"
              >
                Create your Learning Tracker identity
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium max-w-sm mx-auto">
                Sign in with Google to attach this learning profile to a real account. Your learning data stays on this device for now.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-coral-50 dark:bg-coral-950/40 border border-coral-200 dark:border-coral-800 rounded-xl text-xs text-coral-700 dark:text-coral-300 flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                id="modal-google-signin-btn"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-900 dark:hover:border-slate-400 font-bold text-sm text-slate-900 dark:text-white flex items-center justify-center gap-3 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              <button
                type="button"
                id="modal-continue-without-account-btn"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Continue without an account
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <p className="text-[11px] text-slate-400 text-center font-mono">
                Account sync across devices will be available when cloud sync is connected.
              </p>

              <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Your learning stays yours. No surveillance.</span>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: LOCAL DATA SAFETY PROMPT ── */}
        {step === 'local_data_prompt' && (
          <div className="space-y-5" id="auth-modal-step-local-prompt">
            <div className="text-center space-y-1.5">
              <span className="text-2xl">💾</span>
              <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
                Existing Learning History Detected
              </h3>
              <p className="text-xs text-slate-500">
                You already have sessions and study milestones on this device.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                id="modal-keep-sync-btn"
                onClick={() => proceedWithSignIn(true)}
                className="w-full p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-left hover:border-emerald-600 transition-all flex items-start gap-3 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Keep Local Learning History (Recommended)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Attach all existing local sessions, tasks, and archive records to your Google account on this device.
                  </p>
                </div>
              </button>

              <button
                type="button"
                id="modal-start-fresh-btn"
                onClick={() => proceedWithSignIn(false)}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 text-left transition-all flex items-start gap-3 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full border border-slate-400 text-slate-400 flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">
                  ○
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Start Fresh Profile</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Initialize a clean account on this device. (Your current local data is archived)
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-mono font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-center"
              >
                Continue without an account
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: MINIMAL ONBOARDING (No Questionnaire) ── */}
        {step === 'minimal_onboarding' && (
          <div className="space-y-5" id="auth-modal-step-minimal-onboarding">
            <div className="text-center space-y-1">
              <span className="text-2xl">🎯</span>
              <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
                One Honest Question
              </h3>
              <p className="text-xs text-slate-500">
                Tell us what you're working toward. You can adjust this anytime in Identity.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  What is your primary goal or target milestone?
                </label>
                <input
                  type="text"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  placeholder="e.g. Embedded Systems Internship, Firmware Mastery..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-electric-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  How much focused time do you realistically have on weekdays?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 35, 45, 60].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setWeekdayMinutes(mins)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        weekdayMinutes === mins
                          ? 'bg-electric-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishOnboarding}
              className="btn-tactile-electric w-full py-3 text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer mt-2"
            >
              <span>Enter Knowledge World</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default GoogleSignInModal;
