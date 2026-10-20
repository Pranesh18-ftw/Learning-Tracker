/**
 * IdentitySystemKnowledgeCard.jsx
 *
 * Fifth Section: WHAT LEARNING TRACKER CURRENTLY KNOWS
 *
 * Deep Transparency & Epistemic Honesty:
 * - DECLARED: What the user explicitly stated.
 * - OBSERVED: What the system measured from real focus sessions and completed milestones.
 * - INFERRED: System working hypotheses (never stated as fact).
 *
 * User Correction:
 * - Every single item allows "Change" or "That's not right".
 * - User corrections override system assumptions immediately.
 */

import React, { useState } from 'react';
import { ShieldCheck, RotateCcw, Edit2 } from 'lucide-react';

const IdentitySystemKnowledgeCard = ({
  knowledgeItems = [],
  onOverrideKnowledge,
  onResetOverride
}) => {
  const [activeCorrectionId, setActiveCorrectionId] = useState(null);
  const [correctionText, setCorrectionText] = useState('');

  const handleStartCorrection = (item) => {
    setActiveCorrectionId(item.id);
    setCorrectionText(item.overrideText || '');
  };

  const handleSaveCorrection = (id) => {
    if (correctionText.trim()) {
      onOverrideKnowledge(id, correctionText.trim());
    } else {
      onResetOverride(id);
    }
    setActiveCorrectionId(null);
    setCorrectionText('');
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-electric-500/10 text-electric-600 dark:text-electric-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Section 05 · Transparency & Knowledge Integrity
            </span>
            <h2 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
              What Learning Tracker currently knows
            </h2>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          User Corrections Overrule System Logic
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
        The system separates what you directly told us (Declared) from what we actually measured (Observed), and from tentative hypotheses (Inferred). If any assumption is wrong, tell us below.
      </p>

      {/* 3-Tier Semantic Knowledge Cards */}
      <div className="space-y-3">
        {knowledgeItems.map((item) => {
          const isCorrecting = activeCorrectionId === item.id;
          const isOverridden = item.isOverridden;

          // Tier colors & badges
          let tierBadgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
          if (item.tier === 'DECLARED') {
            tierBadgeColor = 'bg-electric-50 dark:bg-electric-950/40 text-electric-700 dark:text-electric-300 border-electric-200 dark:border-electric-800';
          } else if (item.tier === 'OBSERVED') {
            tierBadgeColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
          } else if (item.tier === 'INFERRED') {
            tierBadgeColor = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
          }

          return (
            <div
              key={item.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isOverridden
                  ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">

                {/* Content */}
                <div className="space-y-1.5 flex-1">

                  {/* Semantic Tier + Category */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border ${tierBadgeColor}`}>
                      {item.tier}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      · {item.category}
                    </span>
                    {isOverridden && (
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-lg">
                        User Overridden
                      </span>
                    )}
                  </div>

                  {/* Primary Knowledge Claim */}
                  <h4 className="text-sm sm:text-base font-display font-black text-slate-900 dark:text-white">
                    {item.title}
                  </h4>

                  {/* Context & Source */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-sans">
                    {item.detail}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                    <span>Source: {item.source}</span>
                    <span>·</span>
                    <span>Confidence: {item.confidence}</span>
                  </div>

                  {/* User Overridden Note display */}
                  {isOverridden && item.overrideText && (
                    <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-xs font-mono text-amber-900 dark:text-amber-200">
                      <span className="font-bold">Your correction: </span>
                      <span>"{item.overrideText}"</span>
                    </div>
                  )}

                </div>

                {/* Action buttons (Change / That's not right) */}
                {item.canOverride && (
                  <div className="shrink-0 flex items-center gap-2">
                    {isOverridden ? (
                      <button
                        onClick={() => onResetOverride(item.id)}
                        className="px-2.5 py-1 rounded-xl text-xs font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                        title="Restore original system model"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartCorrection(item)}
                        className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>That's not right</span>
                      </button>
                    )}
                  </div>
                )}

              </div>

              {/* In-place Correction Dialog */}
              {isCorrecting && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 anim-fade-in">
                  <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block">
                    What should the system know instead?
                  </label>
                  <input
                    type="text"
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveCorrection(item.id);
                      }
                    }}
                    placeholder="e.g. Actually, I prefer 45-minute deep blocks rather than short intervals."
                    className="w-full text-xs font-mono p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveCorrectionId(null)}
                      className="px-3 py-1 text-xs font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCorrection(item.id)}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-bold rounded-xl"
                    >
                      Apply Correction
                    </button>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </section>
  );
};

export default IdentitySystemKnowledgeCard;
