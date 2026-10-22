/**
 * IdentityControlRoomHeader.jsx
 *
 * Header for IDENTITY / REALITY:
 * Feels like a personal control room rather than a boring settings page.
 * "YOUR WORLD · Personal Operating Context"
 */

import React from 'react';
import { Compass, Cpu, Clock, ShieldCheck, Sparkles } from 'lucide-react';

const IdentityControlRoomHeader = ({
  identity,
  activeSection,
  onSelectSection
}) => {
  const goal = identity?.destination?.primaryGoal || 'Stem Mastery';
  const hwCount = (identity?.resources?.hardware || []).length;
  const mins = identity?.timeReality?.weekdayMinutes || 35;

  const sections = [
    { id: 'destination', label: 'Destination', icon: Compass },
    { id: 'resources', label: 'What I Have', icon: Cpu },
    { id: 'time', label: 'Time Reality', icon: Clock },
    { id: 'limits', label: 'Limits & Context', icon: Sparkles },
    { id: 'knowledge', label: 'System Knowledge', icon: ShieldCheck },
    { id: 'system', label: 'System & Privacy', icon: ShieldCheck }
  ];

  return (
    <header className="relative bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden anim-fade-in space-y-6">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-electric-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 min-w-0">

        <div className="space-y-3 max-w-xl min-w-0">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              YOUR WORLD
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              · Control Room & Reality Engine
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
              Identity & Reality
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Who you are trying to become, what you currently have, and the authentic constraints you are living with.
            </p>
          </div>
        </div>

        {/* Operating Context Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono min-w-0">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Compass className="w-3.5 h-3.5 text-electric-500 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">{goal}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{hwCount > 0 ? `${hwCount} Tools` : 'Simulation Route'}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{mins}m / day</span>
          </div>
        </div>

      </div>

      {/* Navigation Pills Bar */}
      <div className="relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 max-w-full min-w-0 scrollbar-none">
        {sections.map(sec => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

export default IdentityControlRoomHeader;
