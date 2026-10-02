import React from 'react';

/**
 * FocusSanctuary
 * Principles 23, 24:
 * Radically quiet, distraction-free environment.
 * The entire surrounding workspace recedes.
 * Pure focus:
 * - Remaining time in large, quiet typography
 * - The central challenge question
 * - Minimal, physical controls
 */
const FocusSanctuary = ({
  task,
  timeLeft,
  isTimerRunning,
  onPause,
  onResume,
  onFinish,
  onAbandon,
  formatTimeStr
}) => {
  if (!task) return null;

  const totalSeconds = (task.time || 25) * 60;
  const progressPercent = Math.max(0, 100 - (timeLeft / totalSeconds) * 100);

  return (
    <div className="min-h-[75vh] flex flex-col justify-between py-12 px-4 max-w-xl mx-auto text-center select-none anim-enter">
      {/* ── QUIET SPATIAL BREADCRUMB ── */}
      <div className="font-mono text-[11px] tracking-wider uppercase opacity-40 flex items-center justify-center gap-3">
        <span>{task.subjectName}</span>
        <span>·</span>
        <span>{task.phaseName}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#B84F2B] animate-pulse" />
      </div>

      {/* ── CENTRAL FOCAL CORE ── */}
      <div className="my-16 space-y-8">
        {/* Breathing Timer Clock */}
        <div className="font-mono text-6xl sm:text-7xl font-light tracking-tight text-current">
          {formatTimeStr(timeLeft)}
        </div>

        {/* Minimal Progress Track */}
        <div className="max-w-xs mx-auto h-0.5 bg-current/15 overflow-hidden">
          <div 
            className="h-full bg-[#B84F2B] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* The Central Question — Cognitive Anchor */}
        <h2 className="font-serif italic text-2xl sm:text-4xl text-current max-w-lg mx-auto leading-snug">
          "{task.subtaskId ? task.name : 'Explain the mechanism without looking at notes.'}"
        </h2>

        <p className="font-mono text-xs opacity-50 max-w-xs mx-auto">
          The workspace has become quiet. Reconstruct the mechanism from first principles.
        </p>

        {/* Minimal Actions */}
        <div className="flex items-center justify-center gap-6 pt-4 font-mono text-xs">
          <button
            onClick={isTimerRunning ? onPause : onResume}
            className="px-4 py-2 border border-current/20 hover:border-current transition-all uppercase tracking-wider"
          >
            {isTimerRunning ? '[ pause ]' : '[ resume ]'}
          </button>

          <button
            onClick={onFinish}
            data-cursor="action"
            className="px-5 py-2 bg-[#B84F2B] text-[#F7F4EC] font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            [ complete take → ]
          </button>

          <button
            onClick={onAbandon}
            className="opacity-40 hover:opacity-100 transition-opacity text-[11px]"
          >
            abandon
          </button>
        </div>
      </div>

      {/* ── BASELINE MARGINALIA ── */}
      <div className="font-serif italic text-xs opacity-40">
        “Attention is the currency with which capability is purchased.”
      </div>
    </div>
  );
};

export default FocusSanctuary;
