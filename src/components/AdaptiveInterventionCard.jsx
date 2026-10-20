/**
 * AdaptiveInterventionCard.jsx
 *
 * LEARNING TRACKER — ADAPTIVE LEARNING ENGINE (Prompt #18, #19, #22, #38, #40)
 *
 * Subtle, tactile, explainable intervention card:
 * - Clear, humble recommendation ("Try 30 min today?", "Welcome back")
 * - Direct, honest empirical reason ("Why:")
 * - Expandable evidence drawer showing observed numbers without fake AI jargon
 * - Full user autonomy: Accept, Reject ("Not for me"), and Revert
 * - Never calls itself "AI Coach" or "AI Brain" (Prompt #41)
 */

import React, { useState } from 'react';
import {
  Zap,
  HelpCircle,
  RotateCcw,
  Check,
  ChevronUp,
  ShieldCheck,
  Clock,
  Compass,
  Sparkles
} from 'lucide-react';
import { RECOMMENDATION_TYPES } from '../adaptive';

const AdaptiveInterventionCard = ({
  recommendation,
  onAccept,
  onReject,
  onRevert,
  className = ''
}) => {
  const [showWhy, setShowWhy] = useState(false);

  if (!recommendation) return null;

  const {
    id,
    type,
    title,
    badge,
    reason,
    evidenceSummary,
    expectedBenefit,
    isAccepted = false,
    actions = {}
  } = recommendation;

  // Icon selector based on recommendation type
  const getBadgeIcon = () => {
    switch (type) {
      case RECOMMENDATION_TYPES.SESSION_DURATION:
        return <Clock className="w-3.5 h-3.5" />;
      case RECOMMENDATION_TYPES.RECOVERY_MOMENTUM:
        return <Compass className="w-3.5 h-3.5" />;
      case RECOMMENDATION_TYPES.PREREQUISITE_SCAFFOLD:
        return <Zap className="w-3.5 h-3.5" />;
      case RECOMMENDATION_TYPES.SPACED_RETRIEVAL:
        return <Sparkles className="w-3.5 h-3.5" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5" />;
    }
  };

  return (
    <aside
      aria-label="Adaptive Route Recommendation"
      className={`rounded-2xl border-2 transition-all anim-slide-up select-none ${
        isAccepted
          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
          : 'bg-white dark:bg-slate-900 border-coral-500/30 shadow-md text-slate-900 dark:text-white'
      } p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

        {/* Main Content */}
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-coral-500/10 text-coral-600 dark:text-coral-400 border border-coral-500/20">
              {getBadgeIcon()}
              <span>{badge || 'Route Calibration'}</span>
            </span>

            {isAccepted && (
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Active Calibration</span>
              </span>
            )}
          </div>

          <h3 className="font-display font-black text-base sm:text-lg text-slate-900 dark:text-white leading-snug">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
            {reason}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
          {isAccepted ? (
            <button
              type="button"
              onClick={() => onRevert && onRevert(id)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{actions.revertLabel || 'Revert'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onReject && onReject(id, recommendation.type)}
                className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                {actions.rejectLabel || 'Not for me'}
              </button>

              <button
                type="button"
                onClick={() => onAccept && onAccept(id, recommendation)}
                className="px-4 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-display font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{actions.acceptLabel || 'Accept'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowWhy(!showWhy)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Inspect evidence behind this recommendation"
            aria-expanded={showWhy}
          >
            {showWhy ? <ChevronUp className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* ── EXPANDABLE "WHY" EVIDENCE DRAWER (Prompt #18 & #22) ── */}
      {showWhy && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs font-mono space-y-2 anim-slide-up">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span>OBSERVED BEHAVIORAL EVIDENCE (PROVENANCE)</span>
            <span className="text-[10px] text-coral-500 uppercase">Non-diagnostic</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="text-slate-700 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white font-bold">Data Signal: </strong>
              {evidenceSummary || 'Derived from recent focus completion rates and session records.'}
            </div>
            {expectedBenefit && (
              <div className="text-slate-600 dark:text-slate-400">
                <strong className="text-slate-900 dark:text-white font-bold">Expected Benefit: </strong>
                {expectedBenefit}
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 font-sans italic">
            This adjustment is a temporary hypothesis, not a diagnosis. Rejecting it records your preference and mutes this suggestion.
          </p>
        </div>
      )}

    </aside>
  );
};

export default AdaptiveInterventionCard;
