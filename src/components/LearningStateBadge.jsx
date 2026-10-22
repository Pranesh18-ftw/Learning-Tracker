/**
 * LearningStateBadge.jsx
 *
 * Reusable Visual State Primitive (Prompt #8)
 * Standardizes honest capability & completion states across all surfaces.
 */

import React from 'react';

const STATE_CONFIGS = {
  DEMONSTRATED: {
    glyph: '✓',
    label: 'Demonstrated',
    classes: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
  },
  COMPLETED: {
    glyph: '✓',
    label: 'Completed',
    classes: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
  },
  COMPLETE: {
    glyph: '✓',
    label: 'Complete',
    classes: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
  },
  NOT_STARTED: {
    glyph: '○',
    label: 'Not Started',
    classes: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
  },
  NO_REQUIRED_WORK: {
    glyph: '—',
    label: 'No Items',
    classes: 'text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
  },
  APPLIED: {
    glyph: '▲',
    label: 'Applied in Build',
    classes: 'text-electric-700 dark:text-electric-300 bg-electric-50 dark:bg-electric-950/40 border-electric-300 dark:border-electric-800'
  },
  PRACTICED: {
    glyph: '◉',
    label: 'Practiced',
    classes: 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800'
  },
  DEVELOPING: {
    glyph: '◐',
    label: 'Developing',
    classes: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
  },
  IN_PROGRESS: {
    glyph: '◐',
    label: 'In Progress',
    classes: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
  },
  NEEDS_REVIEW: {
    glyph: '△',
    label: 'Needs Review',
    classes: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
  },
  UNEXPLORED: {
    glyph: '○',
    label: 'Unexplored',
    classes: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
  }
};

const LearningStateBadge = ({
  status = 'UNEXPLORED',
  customLabel,
  compact = false,
  className = ''
}) => {
  const normalizedKey = (status || '').toUpperCase().replace(/\s+/g, '_');
  const cfg = STATE_CONFIGS[normalizedKey] || STATE_CONFIGS.UNEXPLORED;
  const label = customLabel || cfg.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold border rounded-lg transition-colors ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${cfg.classes} ${className}`}
    >
      <span className="font-black text-current">{cfg.glyph}</span>
      <span>{label}</span>
    </span>
  );
};

export default LearningStateBadge;
