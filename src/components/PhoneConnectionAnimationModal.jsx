/**
 * PhoneConnectionAnimationModal.jsx
 *
 * TACTILE COMPANION CONNECTION CELEBRATION MODAL
 *
 * State-of-the-art interactive micro-interaction triggered whenever an Android
 * Companion phone pairs or reconnects with the Learning Tracker console.
 *
 * Visual Architecture:
 * 1. 3D Glassmorphic Pods for Workstation (Left) and Phone (Right).
 * 2. Electromagnetic Telemetry Conduit with animated photon beam & radar ripple rings.
 * 3. Two-stage Handshake Sequence (Scanning → Optical Snap & Lock-In).
 * 4. Ambient Sparkle & Energy Waves around the paired companion.
 * 5. Full WCAG Accessibility, Dialog Trapping, and prefers-reduced-motion compliance.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Laptop,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Sparkles,
  X,
  Radio
} from 'lucide-react';
import { useDialogA11y } from '../utils/a11y';
import { isReducedMotion } from '../utils/motionTokens';

export default function PhoneConnectionAnimationModal({
  isOpen = false,
  device = null,
  onClose
}) {
  const containerRef = useRef(null);
  const [stage, setStage] = useState('scanning'); // 'scanning' -> 'locked' -> 'steady'
  const [autoDismissProgress, setAutoDismissProgress] = useState(0);

  useDialogA11y({
    isOpen,
    onClose,
    containerRef
  });

  const deviceName = device?.deviceName || 'Android Companion';
  const isVerified = device?.isServerVerified !== false;

  // Staged connection choreography
  useEffect(() => {
    if (!isOpen) {
      setStage('scanning');
      setAutoDismissProgress(0);
      return;
    }

    if (isReducedMotion()) {
      setStage('steady');
      return;
    }

    // Stage 0: Initial scanning sweep (0 - 850ms)
    setStage('scanning');

    // Stage 1: Optical snap & locked handshake (850ms)
    const t1 = setTimeout(() => {
      setStage('locked');
    }, 850);

    // Stage 2: Settled celebratory state (1700ms)
    const t2 = setTimeout(() => {
      setStage('steady');
    }, 1700);

    // Auto-dismiss countdown after steady (optional, smoothly progresses)
    const startTime = Date.now() + 1700;
    const duration = 4000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 0) {
        const progress = Math.min(100, (elapsed / duration) * 100);
        setAutoDismissProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          onClose && onClose();
        }
      }
    }, 50);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-connection-modal-title"
    >
      <div
        className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.25)] text-white overflow-hidden space-y-6"
      >
        {/* Background Radial Glow */}
        <div
          className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl transition-opacity duration-1000 pointer-events-none ${
            stage === 'scanning' ? 'bg-amber-500/15' : 'bg-emerald-500/25'
          }`}
        />
        <div
          className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full blur-3xl bg-electric-500/20 pointer-events-none"
        />

        {/* Top Bar with Status & Close Button */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                stage === 'scanning' ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                stage === 'scanning' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </span>
            <span
              id="phone-connection-modal-title"
              className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300"
            >
              {stage === 'scanning' ? 'Establishing Handshake...' : 'Phone Companion Linked!'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Dismiss companion connection animation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── CENTRAL VISUAL STAGE: WORKSTATION ↔ DATA CONDUIT ↔ PHONE ── */}
        <div className="relative py-4 flex items-center justify-between gap-2 sm:gap-4">

          {/* 1. Workstation Pod (Laptop) */}
          <div className="flex flex-col items-center gap-2 relative z-10">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${
                stage === 'scanning'
                  ? 'bg-slate-800/80 border-slate-700 shadow-md text-electric-400'
                  : 'bg-electric-500/10 border-electric-400 shadow-[0_0_20px_rgba(59,130,246,0.35)] text-electric-300 scale-105'
              }`}
            >
              <Laptop className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-300 text-center">
              💻 Workstation
            </span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              Console Active
            </span>
          </div>

          {/* 2. Interactive Electromagnetic Laser Conduit (Center Beam) */}
          <div className="flex-1 relative flex flex-col items-center justify-center px-1">

            {/* Ripple Radar Waves (Expanding concentric rings) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <div
                className={`w-14 h-14 rounded-full border border-dashed transition-all duration-700 ${
                  stage === 'scanning'
                    ? 'border-amber-400/50 animate-ping'
                    : 'border-emerald-400/60 animate-ping'
                }`}
              />
              <div
                className={`w-24 h-24 rounded-full border transition-all duration-700 ${
                  stage === 'scanning'
                    ? 'border-amber-500/20'
                    : 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                }`}
              />
            </div>

            {/* Dynamic Connecting Laser Path */}
            <div className="w-full relative h-3 flex items-center">
              {/* Backing rail */}
              <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden relative">
                {/* Streaming energy laser line */}
                <div
                  className={`h-full w-full rounded-full transition-all duration-500 ${
                    stage === 'scanning'
                      ? 'bg-gradient-to-r from-electric-500 via-amber-400 to-amber-500'
                      : 'bg-gradient-to-r from-electric-400 via-emerald-400 to-emerald-300 shadow-[0_0_10px_#10B981]'
                  }`}
                  style={{
                    animation: stage === 'scanning' ? 'shimmer-sweep 1.2s infinite' : 'none'
                  }}
                />
              </div>

              {/* Central Lock-In Hologram Badge */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 -top-4 w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${
                  stage === 'scanning'
                    ? 'bg-slate-900 border-amber-500/60 text-amber-400 scale-90'
                    : 'bg-slate-900 border-emerald-400 text-emerald-300 shadow-[0_0_18px_#10B981] scale-110'
                }`}
              >
                {stage === 'scanning' ? (
                  <Radio className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                )}
              </div>
            </div>

            {/* Audio/Telemetry Equalizer Bars */}
            <div className="flex items-center gap-1 mt-6 h-3" aria-hidden="true">
              {[0.4, 0.9, 0.6, 1.0, 0.7, 0.8, 0.5].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    stage === 'scanning' ? 'bg-amber-400/70' : 'bg-emerald-400'
                  }`}
                  style={{
                    height: `${Math.round(h * 12)}px`,
                    animation: `node-wiggle ${0.4 + (i % 3) * 0.2}s ease-in-out infinite alternate`
                  }}
                />
              ))}
            </div>

            <span className="text-[10px] font-mono text-slate-400 mt-1 font-bold">
              {stage === 'scanning' ? 'Carrier Sync' : 'TLS Encrypted Relay'}
            </span>
          </div>

          {/* 3. Phone Companion Pod */}
          <div className="flex flex-col items-center gap-2 relative z-10">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${
                stage === 'scanning'
                  ? 'bg-slate-800/80 border-slate-700 text-slate-400 scale-95'
                  : 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] text-emerald-300 scale-105'
              }`}
            >
              <Smartphone className={`w-8 h-8 sm:w-10 sm:h-10 transition-transform ${
                stage !== 'scanning' ? 'rotate-[-3deg]' : ''
              }`} />
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-200 text-center truncate max-w-[110px]" title={deviceName}>
              📱 {deviceName}
            </span>
            <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-700/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              <span>{isVerified ? 'Verified' : 'Paired'}</span>
            </span>
          </div>

        </div>

        {/* ── PROTOCOL CAPABILITIES LEDGER ── */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-300 font-bold border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Focus Integrity Telemetry</span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Protocol v1.0 Live
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Zero distraction leakage</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Reference apps classified</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Hardware serials stripped</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Direct relay latency: &lt; 15ms</span>
            </div>
          </div>
        </div>

        {/* ── ACTION FOOTER & TIMED DISMISS BAR ── */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-sm tracking-wide shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Ready for Deep Focus Work</span>
          </button>

          {/* Subdued auto-dismiss progress tracker */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>Auto-returning to console</span>
            <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${autoDismissProgress}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
