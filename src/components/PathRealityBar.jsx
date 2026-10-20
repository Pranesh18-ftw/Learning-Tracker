import React from 'react';
import { Clock, Laptop, Wrench, Microscope, AlertCircle, RotateCcw } from 'lucide-react';

/**
 * PathRealityBar
 *
 * Implements Reality-Aware Routing:
 * - Time budget selector (20m sprint / 45m standard / 90m deep)
 * - Equipment / Resource selector (Laptop only / Basic kit / Full lab)
 * - Non-punitive recovery route notification when tasks were missed
 */
const PathRealityBar = ({
  timeBudget,
  setTimeBudget,
  resourceLevel,
  setResourceLevel,
  recoveryInfo,
  onRecalibrateRoute
}) => {
  const timeOptions = [
    { value: 20, label: '20m Sprint', desc: '1 core milestone + 1 rapid retrieval' },
    { value: 45, label: '45m Standard', desc: 'Base + deliberate practice + review' },
    { value: 90, label: '90m Deep Work', desc: 'Full deep-dive cycle with build/simulation' },
  ];

  const resourceOptions = [
    { value: 'laptop', label: 'Laptop Only', icon: Laptop, hint: 'Auto-adapts builds to SPICE/Python simulations' },
    { value: 'kit', label: 'Basic Kit', icon: Wrench, hint: 'Standard breadboard & discrete parts' },
    { value: 'lab', label: 'Full Lab', icon: Microscope, hint: 'Physical bench, oscilloscope & function generator' },
  ];

  return (
    <div className="space-y-4">

      {/* ── MISSED SESSIONS RECOVERY ROUTE ALERT (ANTI-CASCADE) ── */}
      {recoveryInfo.hasMissed && (
        <aside
          aria-label="Route Recovery Notification"
          className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display font-black text-sm text-amber-900 dark:text-amber-100">
                Missed {recoveryInfo.overdueCount} previous session{recoveryInfo.overdueCount > 1 ? 's' : ''}? No guilt pile.
              </h2>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                The route has adjusted: essential milestones are preserved for today, secondary tasks are deferred.
              </p>
            </div>
          </div>

          <button
            onClick={onRecalibrateRoute}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Recalibrate To Today
          </button>
        </aside>
      )}

      {/* ── REALITY CONTROLS (TIME & RESOURCES) ── */}
      <div className="bg-white dark:bg-[#0F172A] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">

        {/* Time Budget */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-coral-500" />
            <span className="font-display font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Daily Time Budget
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {timeOptions.map(opt => {
              const isSelected = timeBudget === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTimeBudget(opt.value)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                    isSelected
                      ? 'bg-coral-500 border-coral-500 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {timeOptions.find(o => o.value === timeBudget)?.desc}
          </p>
        </div>

        <div className="hidden lg:block w-px h-12 bg-slate-200 dark:bg-slate-800" />

        {/* Resources / Equipment Availability */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-electric-500" />
            <span className="font-display font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Available Resources
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {resourceOptions.map(opt => {
              const isSelected = resourceLevel === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setResourceLevel(opt.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                    isSelected
                      ? 'bg-electric-600 border-electric-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  title={opt.hint}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {resourceOptions.find(o => o.value === resourceLevel)?.hint}
          </p>
        </div>

      </div>
    </div>
  );
};

export default PathRealityBar;
