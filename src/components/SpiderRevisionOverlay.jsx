/**
 * SpiderRevisionOverlay.jsx
 *
 * Stylized Spider-Inspired Revision Reminder Overlay
 *
 * Sequence:
 * 1. Restrained glassmorphic dimming layer
 * 2. Fine vector web strands extend from viewport corners
 * 3. Original stylized spider descends along silk thread with damped motion
 * 4. Crisp reveal announces: "REVISION TIME"
 * 5. Displays real topic title, domain badge, days since last study, and interval
 * 6. Shows count of additional waiting topics
 * 7. Actions: "Start revision", "Remind me later" (snooze), "Not now" (dismiss)
 * 8. Full accessibility: dialog semantics, Escape key, keyboard trap, and prefers-reduced-motion safety
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock, X, Play, Zap, Brain, CheckCircle2, Sliders } from 'lucide-react';
import { isReducedMotion } from '../utils/motionTokens';

/**
 * Stylized Original Vector Spider SVG
 * Precision geometric engineering / cybernetic compass aesthetic
 */
export const StylizedSpiderSvg = ({ size = 48, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Silk thread attachment at rear spinneret */}
    <circle cx="50" cy="50" r="1.5" fill="#D97706" />

    {/* Left Legs (4 jointed limbs) */}
    {/* Leg 1 */}
    <path
      d="M44 46 C32 36, 20 32, 8 38 C5 40, 2 48, 2 54"
      stroke="#D97706"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="drop-shadow-xs"
    />
    {/* Leg 2 */}
    <path
      d="M42 49 C28 44, 18 46, 6 58 C3 62, 3 68, 5 74"
      stroke="#B45309"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Leg 3 */}
    <path
      d="M43 53 C30 54, 20 62, 10 74 C8 77, 8 83, 11 88"
      stroke="#B45309"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Leg 4 */}
    <path
      d="M45 56 C36 65, 28 76, 22 88 C20 92, 22 96, 26 98"
      stroke="#92400E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Right Legs (4 jointed limbs) */}
    {/* Leg 1 */}
    <path
      d="M56 46 C68 36, 80 32, 92 38 C95 40, 98 48, 98 54"
      stroke="#D97706"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="drop-shadow-xs"
    />
    {/* Leg 2 */}
    <path
      d="M58 49 C72 44, 82 46, 94 58 C97 62, 97 68, 95 74"
      stroke="#B45309"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Leg 3 */}
    <path
      d="M57 53 C70 54, 80 62, 90 74 C92 77, 92 83, 89 88"
      stroke="#B45309"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Leg 4 */}
    <path
      d="M55 56 C64 65, 72 76, 78 88 C80 92, 78 96, 74 98"
      stroke="#92400E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Abdomen (Ovoid Charcoal-Amber with specular ring) */}
    <ellipse cx="50" cy="62" rx="13" ry="18" fill="#1C1917" stroke="#D97706" strokeWidth="2" />
    <ellipse cx="50" cy="58" rx="8" ry="11" fill="#292524" />
    <path d="M47 52 Q50 49 53 52" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M45 59 Q50 56 55 59" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M46 66 Q50 63 54 66" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />

    {/* Cephalothorax (Head/Torso with tactical sensory eyes) */}
    <circle cx="50" cy="43" r="10" fill="#1C1917" stroke="#D97706" strokeWidth="2" />
    {/* Ocelli (4 glowing amber sensory eyes) */}
    <circle cx="47" cy="40" r="1.5" fill="#FDE68A" />
    <circle cx="53" cy="40" r="1.5" fill="#FDE68A" />
    <circle cx="45" cy="44" r="1.2" fill="#F59E0B" />
    <circle cx="55" cy="44" r="1.2" fill="#F59E0B" />

    {/* Chelicerae / Pedipalps (Front pincers) */}
    <path d="M46 36 L44 31 L47 29" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M54 36 L56 31 L53 29" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CADENCE_PRESETS = [1, 3, 5, 7, 10, 14, 30];

export default function SpiderRevisionOverlay({
  isOpen,
  dueTopic,
  totalWaitingCount = 0,
  onStartRevision,
  onSnooze,
  onDismiss,
  onUpdateInterval
}) {
  const [animStage, setAnimStage] = useState('entering'); // 'entering' | 'web_spread' | 'revealed'
  const overlayRef = useRef(null);
  const primaryButtonRef = useRef(null);
  const reducedMotion = isReducedMotion();

  const status = dueTopic?.revisionStatus || {};
  const initialInterval = status.intervalDays ?? 10;
  const [currentInterval, setCurrentInterval] = useState(initialInterval);

  useEffect(() => {
    if (status.intervalDays) {
      setCurrentInterval(status.intervalDays);
    }
  }, [status.intervalDays]);

  // Animation reveal sequence
  useEffect(() => {
    if (!isOpen) {
      setAnimStage('entering');
      return;
    }

    if (reducedMotion) {
      setAnimStage('revealed');
      return;
    }

    // Step 1: 0ms -> spider starts descending
    setAnimStage('entering');

    // Step 2: 450ms -> web strands spread
    const t1 = setTimeout(() => {
      setAnimStage('web_spread');
    }, 450);

    // Step 3: 950ms -> reveal content card
    const t2 = setTimeout(() => {
      setAnimStage('revealed');
      primaryButtonRef.current?.focus();
    }, 950);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen, reducedMotion]);

  // Focus trap & Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss && onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen || !dueTopic) return null;

  const daysSince = status.daysSinceLastActivity ?? currentInterval;
  const interval = currentInterval || status.intervalDays || 10;
  const subjectName = dueTopic.subjectName || status.subjectName || 'Knowledge World';
  const topicTitle = dueTopic.name || dueTopic.taskName || status.topicName || 'Revision Milestone';

  const handleCadenceSelect = (days) => {
    setCurrentInterval(days);
    if (onUpdateInterval) {
      onUpdateInterval(days);
    }
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="revision-time-title"
      aria-describedby="revision-time-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-stone-950/80 backdrop-blur-md anim-curtain-reveal"
    >
      {/* ── 2.5D MULTI-DEPTH VECTOR WEB STRANDS ── */}
      {!reducedMotion && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700"
          style={{ opacity: animStage === 'entering' ? 0.3 : 0.8 }}
          aria-hidden="true"
        >
          <defs>
            {/* Deep background out-of-focus blur */}
            <filter id="web-depth-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
            <linearGradient id="foreground-silk-sheen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Depth Layer 1: Out-of-focus deep background strands */}
          <g filter="url(#web-depth-blur)" opacity="0.35">
            <path d="M0 0 L260 200 M0 120 L220 180 M120 0 L180 220" stroke="#78350F" strokeWidth="2.5" />
            <path d="M100% 0 Lcalc(100% - 260px) 200 M100% 120 Lcalc(100% - 220px) 180" stroke="#78350F" strokeWidth="2.5" />
            <path d="M60 40 Q160 100 220 180" stroke="#B45309" strokeWidth="2" fill="none" />
          </g>

          {/* Depth Layer 2: Midground radial anchor struts & logarithmic web mesh from spider-web-mesh.svg */}
          <g opacity="0.65">
            <path d="M0 0 L180 140 M0 60 L140 100 M60 0 L100 140" stroke="rgba(245, 158, 11, 0.45)" strokeWidth="1.2" strokeDasharray="3 2" />
            <path d="M40 20 Q100 60 140 100" stroke="rgba(245, 158, 11, 0.35)" strokeWidth="1" fill="none" />
            <path d="M80 40 Q140 100 180 140" stroke="rgba(245, 158, 11, 0.35)" strokeWidth="1" fill="none" />
            <path d="M100% 0 Lcalc(100% - 180px) 140 M100% 60 Lcalc(100% - 140px) 100 Mcalc(100% - 60px) 0 Lcalc(100% - 100px) 140" stroke="rgba(245, 158, 11, 0.45)" strokeWidth="1.2" strokeDasharray="3 2" />
            {/* Concentric Logarithmic Web Spirals & Dewdrops */}
            <g stroke="rgba(254, 243, 199, 0.35)" strokeWidth="1" strokeLinejoin="round" fill="none">
              <polygon points="calc(50% - 60px),40 50%,22 calc(50% + 60px),40 calc(50% + 75px),80 calc(50% + 50px),120 50%,130 calc(50% - 50px),120 calc(50% - 75px),80" strokeDasharray="4 2" />
              <polygon points="calc(50% - 110px),60 50%,32 calc(50% + 110px),60 calc(50% + 140px),130 calc(50% + 90px),190 50%,205 calc(50% - 90px),190 calc(50% - 140px),130" strokeWidth="1.2" />
              <circle cx="50%" cy="32" r="2" fill="#FEF3C7" />
              <circle cx="50%" cy="130" r="2.2" fill="#FEF3C7" />
              <circle cx="50%" cy="205" r="2.5" fill="#FEF3C7" />
            </g>
          </g>

          {/* Depth Layer 3: Foreground luminous silk guideline (Physically attached to spider spinneret) */}
          <line
            x1="50%"
            y1="0"
            x2="50%"
            y2={animStage === 'entering' ? '28%' : '20%'}
            stroke="url(#foreground-silk-sheen)"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="transition-all duration-700 ease-out drop-shadow-[0_0_4px_rgba(254,243,199,0.8)]"
          />
        </svg>
      )}

      {/* ── STYLIZED DESCENDING SPIDER (Anchored to Silk Guideline) ── */}
      {!reducedMotion && (
        <div
          className="absolute left-1/2 pointer-events-none transition-all duration-700 ease-out z-25"
          style={{
            top: animStage === 'entering' ? '25%' : '17%',
            transform: `translateX(-50%) scale(${animStage === 'entering' ? 1.15 : 0.98})`
          }}
          aria-hidden="true"
        >
          <StylizedSpiderSvg size={58} className="filter drop-shadow-[0_8px_16px_rgba(217,119,6,0.4)]" />
        </div>
      )}

      {/* ── MAIN REVISION CARD (Glassmorphic Elevated Surface) ── */}
      <div
        className={`relative z-20 w-full max-w-lg mx-auto surface-spatial-elevated rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-amber-500/50 space-y-5 text-center transition-all duration-500 ${
          animStage === 'revealed' || reducedMotion
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Header Tag / Alert Indicator */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <span className="flex items-center gap-2 text-xs font-sans font-medium text-amber-700 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Spaced Revision Protocol · Active Recall
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors cursor-pointer p-1 rounded-lg"
            aria-label="Dismiss revision alert for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Big Reveal Heading */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-mono font-black text-xs uppercase tracking-widest">
            🕷️ REVISION TIME
          </div>

          <h2
            id="revision-time-title"
            className="font-display font-black text-2xl sm:text-3xl text-stone-900 dark:text-warmwhite tracking-tight"
          >
            {topicTitle}
          </h2>

          <div className="flex items-center justify-center gap-2 pt-0.5">
            <span className="bg-mineral-100 dark:bg-mineral-900/60 text-mineral-800 dark:text-mineral-200 font-mono text-xs px-2.5 py-0.5 rounded-full border border-mineral-200 dark:border-mineral-800">
              {subjectName}
            </span>
            <span className="text-xs font-mono text-stone-400">·</span>
            <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
              {daysSince} days since last study
            </span>
          </div>
        </div>

        {/* ── TACTILE ELECTROMAGNETIC RECALL CONDUIT ANIMATION ── */}
        <div className="relative p-4 rounded-2xl bg-gradient-to-b from-stone-900/90 to-stone-950 border border-amber-500/30 overflow-hidden shadow-inner text-left">
          {/* Ambient electromagnetic background grid */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Dual Pod Conduit Chamber */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            {/* Pod A: Memory Origin */}
            <div className="flex-1 bg-stone-900/80 border border-cyan-500/40 rounded-xl p-2.5 flex flex-col items-center text-center shadow-sm">
              <div className="relative mb-1">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/50 flex items-center justify-center text-cyan-400">
                  <Brain className="w-4 h-4 animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <span className="text-[11px] font-sans font-medium text-slate-300">Memory Origin</span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">{daysSince}d ago</span>
            </div>

            {/* Central Electromagnetic Laser Conduit */}
            <div className="flex-1 flex flex-col items-center justify-center px-1">
              {/* Laser Conduit Beam */}
              <div className="relative w-full h-2 rounded-full bg-stone-800 overflow-hidden border border-amber-500/30">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-amber-400 to-emerald-400 opacity-75" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent w-1/3 animate-[shimmer_1.5s_infinite]" />
              </div>

              {/* Synaptic Frequency Equalizer Bars */}
              <div className="flex items-end justify-center gap-1 h-5 mt-1.5">
                <span className="w-1 bg-amber-400 rounded-full animate-[pulse_1s_ease-in-out_infinite] h-3" />
                <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_1.2s_ease-in-out_infinite] h-5" />
                <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-4" />
                <span className="w-1 bg-amber-300 rounded-full animate-[pulse_1.4s_ease-in-out_infinite] h-2" />
              </div>

              <span className="text-[9px] font-mono uppercase tracking-wider text-amber-300/90 font-bold mt-1 text-center">
                Synapse Pulse
              </span>
            </div>

            {/* Pod B: Active Recall Target (Due Today) */}
            <div className="flex-1 bg-stone-900/80 border border-amber-500/40 rounded-xl p-2.5 flex flex-col items-center text-center shadow-sm">
              <div className="relative mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-400/50 flex items-center justify-center text-amber-400">
                  <Zap className="w-4 h-4 animate-bounce" />
                </div>
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <span className="text-[11px] font-sans font-medium text-slate-300">Due Today</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">Consolidation</span>
            </div>
          </div>

          {/* Lock-in Synapse Indicator */}
          <div className="mt-2.5 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Lock-In Revision Synchronized</span>
            </span>
            <span className="font-mono text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
              Cadence: {interval}d
            </span>
          </div>
        </div>

        {/* ── USER CADENCE ADJUSTER (Inline Setting) ── */}
        <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-stone-900/40 border border-amber-200/80 dark:border-stone-800 space-y-2 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="font-sans font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Review Cadence (Days Between Revisions):</span>
            </span>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
              Every {interval} days
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {CADENCE_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleCadenceSelect(d)}
                className={`flex-1 min-w-[38px] py-1 px-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                  interval === d
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm scale-105'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-amber-400'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Reason / Factual Explanation */}
        <div
          id="revision-time-description"
          className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-stone-700 dark:text-stone-300 space-y-1.5 text-left"
        >
          <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Scheduled Review Interval: {interval} Days</span>
          </div>
          <p className="leading-relaxed font-sans text-stone-600 dark:text-stone-300">
            Deliberate spaced recall prevents knowledge decay. You previously proven this milestone on{' '}
            <strong>{status.lastActivityDateKey || 'an earlier date'}</strong>. Re-testing this intuition now will consolidate permanent retention.
          </p>

          {totalWaitingCount > 1 && (
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300">
              + {totalWaitingCount - 1} more topics waiting in your revision queue
            </div>
          )}
        </div>

        {/* ── ACTION CONTROLS ── */}
        <div className="space-y-2 pt-1">
          <button
            ref={primaryButtonRef}
            type="button"
            id="start-revision-btn"
            onClick={() => onStartRevision && onStartRevision(dueTopic)}
            className="w-full py-3.5 px-6 rounded-2xl bg-copper-600 hover:bg-copper-700 text-white font-mono font-bold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-copper-600/20 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START REVISION NOW</span>
          </button>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <button
              type="button"
              id="snooze-revision-btn"
              onClick={onSnooze}
              className="py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold transition-colors cursor-pointer"
              title="Pause reminder for 4 hours"
            >
              Remind me later (4h)
            </button>

            <button
              type="button"
              id="dismiss-revision-btn"
              onClick={onDismiss}
              className="py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold transition-colors cursor-pointer"
              title="Dismiss for this session without altering due state"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
