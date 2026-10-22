/**
 * ArchiveArtifactCard.jsx
 *
 * Renders individual curated archive artifacts with visual weight:
 * - Projects: Large portfolio cards with Built/Tested/Measured chips & capabilities
 * - Evidence: Medium proof cards with verbatim recall quotes
 * - Concepts: Demonstrated vs in-practice capabilities breakdown
 * - Reflections: "Note to Future Me" personal realization cards
 * - Recovery: "The Return" resilience celebration
 * - Firsts / Milestones: Hero-weighted highlight composition
 */

import React from 'react';
import {
  Quote,
  Star,
  ArrowUpRight,
  Compass
} from 'lucide-react';

const ArchiveArtifactCard = ({
  artifact,
  onInspect,
  onTogglePin
}) => {
  const {
    id,
    type,
    title,
    subheading,
    domain,
    domainColor = 'blue',
    displayDate,
    stageBadges = [],
    capabilities = [],
    quote,
    reflection,
    demonstratedPoints = [],
    missedDays,
    bridge,
    weight = 'medium',
    isFirst,
    firstLabel,
    isPinned,
    annotation
  } = artifact;

  // Domain accent color styling
  const resolveDomainClasses = () => {
    switch (domainColor) {
      case 'violet':
        return 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/60';
      case 'emerald':
        return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60';
      case 'coral':
        return 'text-coral-700 dark:text-coral-300 bg-coral-50 dark:bg-coral-950/40 border-coral-200 dark:border-coral-800/60';
      case 'amber':
        return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60';
      case 'blue':
      default:
        return 'text-electric-700 dark:text-electric-300 bg-electric-50 dark:bg-electric-950/40 border-electric-200 dark:border-electric-800/60';
    }
  };

  const domainClass = resolveDomainClasses();

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`View memory moment: ${title}`}
      onClick={() => onInspect && onInspect(artifact)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onInspect && onInspect(artifact);
        }
      }}
      className={`group relative bg-white dark:bg-slate-900 border-2 rounded-3xl p-6 sm:p-8 space-y-5 transition-all cursor-pointer hover:shadow-lg ${
        isFirst || weight === 'hero'
          ? 'border-amber-400/80 dark:border-amber-500/60 shadow-amber-500/5'
          : weight === 'large'
            ? 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/50'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
      }`}
    >
      {/* ── TOP BADGES & ACTIONS ── */}
      <div className="flex items-center justify-between gap-3">

        <div className="flex flex-wrap items-center gap-2">
          {/* Milestone "First" Highlight */}
          {isFirst && (
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-white font-mono text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
              <span>★</span>
              <span>{firstLabel || 'MILESTONE FIRST'}</span>
            </span>
          )}

          {/* Domain Tag */}
          <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-mono font-bold ${domainClass}`}>
            {domain}
          </span>

          <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
            {displayDate}
          </span>
        </div>

        {/* Pin Button */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin && onTogglePin(id);
            }}
            title={isPinned ? 'Unpin from Important Work' : 'Pin to Important Work (Keep)'}
            aria-label={isPinned ? `Unpin ${title} from Important Work` : `Pin ${title} to Important Work`}
            className={`p-1.5 rounded-xl border transition-all ${
              isPinned
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-500 font-bold'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
          </button>

          <div className="w-7 h-7 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white flex items-center justify-center transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

      </div>

      {/* ── ARTIFACT TITLE & SUBHEADING ── */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
          {subheading}
        </span>
        <h3 className={`font-display font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors ${
          weight === 'hero' ? 'text-2xl sm:text-3xl' : weight === 'large' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
        }`}>
          {title}
        </h3>
      </div>

      {/* ── TYPE-SPECIFIC BODY REPRESENTATION ── */}

      {/* 1. PROJECT ARTIFACT: Built/Tested/Measured chips + Demonstrated capabilities */}
      {type === 'project' && (
        <div className="space-y-4 pt-1">

          {/* Stage Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {stageBadges.map((badge, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold flex items-center gap-1"
              >
                <span>✓</span>
                <span>{badge}</span>
              </span>
            ))}
          </div>

          {/* Capabilities List */}
          {capabilities.length > 0 && (
            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                What I Learned & Demonstrated:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs font-sans text-slate-700 dark:text-slate-300">
                {capabilities.map((cap, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reflection && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans italic">
              "{reflection}"
            </p>
          )}

        </div>
      )}

      {/* 2. EVIDENCE ARTIFACT: Direct Proof Quote */}
      {type === 'evidence' && (
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 space-y-2">
          <div className="flex items-start gap-2">
            <Quote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-emerald-950 dark:text-emerald-100 font-sans leading-relaxed">
              "{quote}"
            </p>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 block text-right font-bold">
            Self-reported unassisted recall
          </span>
        </div>
      )}

      {/* 3. CONCEPT ARTIFACT: Demonstrated breakdown checklist */}
      {type === 'concept' && demonstratedPoints.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
            Milestone breakdown:
          </span>
          <div className="space-y-1.5">
            {demonstratedPoints.map((point, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className={`font-black ${point.status === '✓' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                    {point.status}
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">{point.name}</span>
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-300">{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. REFLECTION ARTIFACT: Personal Note to Future Me */}
      {type === 'reflection' && quote && (
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
          <div className="flex items-start gap-2">
            <Quote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm font-sans text-slate-800 dark:text-slate-200 italic leading-relaxed">
              "{quote}"
            </p>
          </div>
        </div>
      )}

      {/* 5. RECOVERY ARTIFACT: "The Return" */}
      {type === 'recovery' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-400/60 dark:border-amber-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-black text-amber-700 dark:text-amber-300">{missedDays} Days Away</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">Returned with 1 Focused Session</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-sans">
            "{quote}"
          </p>
        </div>
      )}

      {/* 6. TRANSFER ARTIFACT: Cross-Domain Connection */}
      {type === 'transfer' && bridge && (
        <div className="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-violet-700 dark:text-violet-300 font-bold">
            <Compass className="w-3.5 h-3.5" />
            <span>Connection: {bridge}</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-sans">
            "{quote}"
          </p>
        </div>
      )}

      {/* ── USER ANNOTATION (If added by learner) ── */}
      {annotation && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="font-bold text-slate-700 dark:text-slate-300">Learner Note:</span>
          <span>"{annotation}"</span>
        </div>
      )}

      {/* Card Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300">
        <span>Click to inspect Memory Moment</span>
        <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          Open Artifact →
        </span>
      </div>

    </article>
  );
};

export default ArchiveArtifactCard;
