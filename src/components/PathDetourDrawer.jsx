import React, { useRef } from 'react';
import { X, GitFork, ArrowLeft, Zap, Sparkles, Clock } from 'lucide-react';
import { resolveDetoursForConcept } from '../utils/pathRouteResolver';
import { useDialogA11y } from '../utils/a11y';

/**
 * PathDetourDrawer
 *
 * Manages bounded curiosity detours without derailing the main route.
 * Answers:
 * "Can I explore this interesting rabbit hole without ruining my whole plan?"
 * Yes: Bounded (15-20 min), reversible, and one-click "Return to Route".
 */
const PathDetourDrawer = ({
  stop,
  onClose,
  onReturnToRoute,
  onLaunchDetourInNow
}) => {
  const containerRef = useRef(null);

  useDialogA11y({
    isOpen: Boolean(stop),
    onClose,
    containerRef
  });

  if (!stop) return null;

  const detours = resolveDetoursForConcept(stop.name);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-label={`Curiosity Detour: ${stop.name}`}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0F172A] border-l-2 border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col justify-between overflow-y-auto anim-slide-left p-6 sm:p-8"
      >
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <GitFork className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400 block">
                  Curiosity Detour Branch
                </span>
                <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
                  {stop.name}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              aria-label="Close Detour Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Core Philosophy Notice */}
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-bold">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Bounded & Reversible Exploration</span>
            </div>
            <p className="text-purple-900/80 dark:text-purple-300/80 font-medium leading-relaxed">
              Curiosity strengthens engineering intuition. This detour is bounded (15–20 min) and will not break or distort your main route progression.
            </p>
          </div>

          {/* Detour Options */}
          <div className="space-y-4">
            <h4 className="font-display font-black text-xs uppercase tracking-wider text-slate-400">
              Available Detour Routes
            </h4>

            {detours.map(detour => (
              <div
                key={detour.id}
                className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h5 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    {detour.title}
                  </h5>
                  <span className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {detour.duration}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {detour.description}
                </p>

                <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                  <span>Consequence:</span>
                  <span className="text-slate-500 dark:text-slate-400">{detour.consequence}</span>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={() => onLaunchDetourInNow(detour, stop)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    Explore This in NOW
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer: Safe Return to Route */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            onClick={onReturnToRoute}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-md hover:opacity-95 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Main Route
          </button>
          <p className="text-[11px] text-center text-slate-400 font-medium">
            Main route remains intact at Stage {stop.stageCode}: {stop.name}
          </p>
        </div>

      </div>
    </div>
  );
};

export default PathDetourDrawer;
