/**
 * GrowthProofCards.jsx
 *
 * Concrete Proof of Growth cards.
 * Compares an earlier moment of struggle to today's independent derivation.
 */

import React from 'react';
import { ShieldCheck, ArrowRight, Quote } from 'lucide-react';

const GrowthProofCards = ({ proofs = [], onInspectEvidence }) => {
  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Direct Evidence
          </span>
          <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <span>Proof of Growth</span>
          </h2>
        </div>

        <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-bold">
          Recorded Reflections
        </span>
      </div>

      {/* Proof Cards Grid or Honest Empty State */}
      {(!proofs || proofs.length === 0) ? (
        <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="font-display font-bold text-slate-700 dark:text-slate-300 text-sm">
            No growth records yet.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-md mx-auto">
            Complete unassisted retrieval sessions or reflection notes to establish authentic evidence of conceptual growth.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {proofs.map((proof) => (
          <div
            key={proof.id}
            className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 space-y-5 shadow-sm hover:border-emerald-500/50 transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">

              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {proof.title}
                </span>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  {proof.durationMinutes} min session
                </span>
              </div>

              {/* Before vs Now Comparison */}
              <div className="space-y-3 font-sans">

                {/* Earlier State */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                    Earlier Baseline
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    "{proof.earlierMoment}"
                  </p>
                </div>

                <div className="flex justify-center text-slate-300 dark:text-slate-600">
                  <span className="text-xs font-mono">↓</span>
                </div>

                {/* Today State */}
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 space-y-1">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Today
                  </span>
                  <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                    "{proof.nowMoment}"
                  </p>
                </div>

              </div>

              {/* Recorded Evidence Quote */}
              {proof.evidenceSnippet && (
                <div className="pt-2 flex items-start gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 italic">
                  <Quote className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>"{proof.evidenceSnippet}"</span>
                </div>
              )}

            </div>

            {/* Bottom Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => onInspectEvidence && onInspectEvidence(proof)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 font-display font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>VIEW EVIDENCE RECORD</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        ))}
      </div>
      )}

    </section>
  );
};

export default GrowthProofCards;
