/**
 * GrowthSignalsBar.jsx
 *
 * Truthful, evidence-derived developmental signals:
 * - Focus Endurance (Median session & uninterrupted stretch progression)
 * - Recovery Resiliency (Returning after disruption without shaming)
 * - Independence (Support level / scaffolding reduction history)
 *
 * ZERO FAKE BRAIN SCORES OR IQ PERCENTAGES.
 */

import React from 'react';
import { Repeat, UserCheck, Clock } from 'lucide-react';

const GrowthSignalsBar = ({ focusSignals, recoverySignal, independenceSignal }) => {
  const {
    hasEnoughData: hasFocusData,
    longestUninterruptedMinutes,
    currentMedianMinutes,
    weeklyStretches = []
  } = focusSignals || {};

  const {
    hasEnoughData: hasRecoveryData = (recoverySignal?.hasEnoughData ?? Boolean(recoverySignal?.hasLapseRecord || (recoverySignal?.returnedSessionsCount && recoverySignal.returnedSessionsCount > 0))),
    missedDays = 0,
    returnedSessionsCount = 0,
    recoveryDays = 0,
    message: recoveryMessage
  } = recoverySignal || {};

  const {
    hasEnoughData: hasIndependenceData = Boolean(independenceSignal?.hasEnoughData ?? (independenceSignal?.supportHistory && independenceSignal.supportHistory.length > 0)),
    supportHistory = [],
    headline: independenceHeadline,
    subtext: independenceSubtext
  } = independenceSignal || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── SIGNAL 1: FOCUS DEVELOPMENT (Prompts #10, #11, #21) ── */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
        <div className="space-y-3">

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Focus Development
            </span>
            <Clock className="w-4 h-4 text-electric-500" />
          </div>

          <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
            Focus
          </h3>

          {hasFocusData ? (
            <div className="space-y-3">
              {/* Last 30 Days Summary Box (Prompt #21) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-400 font-bold block">
                  Last 30 Days
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Median uninterrupted</span>
                    <span className="font-black text-slate-900 dark:text-white text-base">
                      {focusSignals.last30Days?.medianUninterruptedMinutes || currentMedianMinutes}m
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Longest</span>
                    <span className="font-black text-slate-900 dark:text-white text-base">
                      {focusSignals.last30Days?.longestMinutes || longestUninterruptedMinutes}m
                    </span>
                  </div>
                  {focusSignals.last30Days?.distractionTrendLabel && (
                    <div>
                      <span className="text-[10px] text-slate-500 block">Distraction interruptions</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {focusSignals.last30Days.distractionTrendLabel}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-slate-500 block">Sessions completed</span>
                    <span className="font-black text-slate-800 dark:text-slate-200 text-sm">
                      {focusSignals.last30Days?.sessionsCompleted || focusSignals.totalSessionsCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Honest trend statement (Prompt #11) */}
              {focusSignals.trendStatement && (
                <div className="px-3 py-2 rounded-xl bg-electric-50/60 dark:bg-electric-950/30 border border-electric-200 dark:border-electric-800/50">
                  <p className="text-xs text-electric-900 dark:text-electric-200 font-sans">
                    {focusSignals.trendStatement}
                  </p>
                </div>
              )}

              {/* Weekly stretch progression (Prompt #10) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold block">
                  Uninterrupted Progress:
                </span>
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  {weeklyStretches.map((w, idx) => (
                    <div key={idx} className="flex-1 text-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">{w.weekLabel}</span>
                      <span className="font-black text-slate-800 dark:text-slate-200">{w.longestMinutes}m</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 block">
                Not enough history yet
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Complete at least 3 focus sessions to observe endurance patterns.
              </p>
            </div>
          )}

        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono pt-3 border-t border-slate-100 dark:border-slate-800">
          Underlying evidence from active sessions. Never converted to arbitrary score percentages.
        </p>
      </div>

      {/* ── SIGNAL 2: RECOVERY RESILIENCY ── */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
        <div className="space-y-3">

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Resilience
            </span>
            <Repeat className="w-4 h-4 text-amber-500" />
          </div>

          <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
            Recovery Pattern
          </h3>

          {hasRecoveryData ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 block font-bold uppercase">Disruption</span>
                  <span className="font-black text-slate-800 dark:text-slate-200 text-sm">{missedDays} days</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold uppercase">Return Session</span>
                  <span className="font-black text-emerald-800 dark:text-emerald-300 text-sm">{returnedSessionsCount} session{returnedSessionsCount > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Route Continuity
                  </span>
                  <span className="text-[10px] font-mono text-amber-700/80 dark:text-amber-400/80">
                    Recovery: {recoveryDays} day
                  </span>
                </div>
                <p className="text-xs text-amber-900 dark:text-amber-200 font-sans">
                  {recoveryMessage}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 block">
                Not enough history yet
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Complete sessions to track continuity and recovery patterns.
              </p>
            </div>
          )}

        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono pt-3 border-t border-slate-100 dark:border-slate-800">
          Lapses are expected human reality. Coming back is what builds capability.
        </p>
      </div>

      {/* ── SIGNAL 3: INDEPENDENCE & SCAFFOLDING REDUCTION ── */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
        <div className="space-y-3">

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Agency
            </span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>

          <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
            Support Level History
          </h3>

          {hasIndependenceData && supportHistory && supportHistory.length > 0 ? (
            <div className="space-y-2 pt-1">
              {supportHistory.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.month}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{item.learnerPercent}% Self-Directed</span>
                  </div>
                  {/* Visual Scaffolding Stack */}
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 flex overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${item.learnerPercent}%` }}
                      title="Learner Directed"
                    />
                    <div
                      className="bg-slate-300 dark:bg-slate-600 h-full transition-all"
                      style={{ width: `${item.systemPercent}%` }}
                      title="System Scaffolding"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 block">
                Not enough history yet
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Add objectives to your learning plan to observe agency patterns.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <h4 className="font-display font-bold text-xs text-slate-800 dark:text-slate-200">
              {independenceHeadline || 'Independence Pattern'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
              "{independenceSubtext || 'Agency develops through self-selected objectives over time.'}"
            </p>
          </div>

        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono pt-3 border-t border-slate-100 dark:border-slate-800">
          Green represents independent selection; gray represents system scaffolding.
        </p>
      </div>

    </div>
  );
};

export default GrowthSignalsBar;
