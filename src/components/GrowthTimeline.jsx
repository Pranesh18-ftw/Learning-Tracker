/**
 * GrowthTimeline.jsx
 *
 * Visual Development Timeline.
 * Answers: "What is actually changing because I've been doing this?"
 * Timeline of meaningful evidence, not a graph wall.
 */

import React from 'react';
import { Calendar, ArrowRight, Award, Zap, Repeat, Cpu, BookOpen } from 'lucide-react';

const GrowthTimeline = ({ events = [], onSelectEvent }) => {
  if (!events || events.length === 0) {
    return (
      <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
        <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="font-display font-bold text-lg text-slate-800 dark:text-slate-200">
          Not enough evidence yet. Keep working.
        </h3>
        <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
          Complete focused sessions in Focus Mode to record authentic evidence of recall, projects, and recovery milestones.
        </p>
      </section>
    );
  }

  // Group events by Month Group
  const groups = events.reduce((acc, ev) => {
    const grp = ev.monthGroup || 'EARLIER';
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(ev);
    return acc;
  }, {});

  // Badge stylings based on consistent color psychology
  const resolveBadgeConfig = (type) => {
    switch (type) {
      case 'EVIDENCE':
        return {
          label: 'Evidence',
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-300 dark:border-emerald-700/60',
          dot: 'bg-emerald-500',
          icon: Award
        };
      case 'APPLICATION':
        return {
          label: 'Application',
          bg: 'bg-blue-50 dark:bg-blue-950/40',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-300 dark:border-blue-700/60',
          dot: 'bg-blue-500',
          icon: Zap
        };
      case 'RECOVERY':
        return {
          label: 'Recovery',
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-300 dark:border-amber-700/60',
          dot: 'bg-amber-500',
          icon: Repeat
        };
      case 'PROJECT':
        return {
          label: 'Project Build',
          bg: 'bg-coral-50 dark:bg-coral-950/40',
          text: 'text-coral-700 dark:text-coral-300',
          border: 'border-coral-300 dark:border-coral-700/60',
          dot: 'bg-coral-500',
          icon: Cpu
        };
      case 'TRANSFER':
        return {
          label: 'Transfer',
          bg: 'bg-violet-50 dark:bg-violet-950/40',
          text: 'text-violet-700 dark:text-violet-300',
          border: 'border-violet-300 dark:border-violet-700/60',
          dot: 'bg-violet-500',
          icon: BookOpen
        };
      default:
        return {
          label: 'Milestone',
          bg: 'bg-slate-50 dark:bg-slate-800',
          text: 'text-slate-700 dark:text-slate-300',
          border: 'border-slate-300 dark:border-slate-700',
          dot: 'bg-slate-500',
          icon: Zap
        };
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Primary View
          </span>
          <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white">
            Development Timeline
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Evidence
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Application
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Recovery
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="flex items-center gap-1 text-coral-700 dark:text-coral-400">
            <span className="w-2 h-2 rounded-full bg-coral-500 inline-block" /> Project
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="flex items-center gap-1 text-violet-700 dark:text-violet-400">
            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Transfer
          </span>
        </div>
      </div>

      {/* Month Groups */}
      <div className="space-y-10">
        {Object.entries(groups).map(([monthGroup, groupEvents]) => (
          <div key={monthGroup} className="space-y-4">

            {/* Month Header Banner */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-black tracking-wider border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{monthGroup}</span>
            </div>

            {/* Event Timeline Rows */}
            <div className="relative pl-6 sm:pl-8 space-y-4 border-l-2 border-slate-200 dark:border-slate-800 ml-3">
              {groupEvents.map((ev) => {
                const badge = resolveBadgeConfig(ev.type);
                const IconComponent = badge.icon;

                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent && onSelectEvent(ev)}
                    className="group relative bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all hover:shadow-md"
                  >
                    {/* Node Dot on the timeline track */}
                    <div
                      className={`absolute -left-[31px] sm:-left-[39px] top-6 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${badge.dot} shadow-sm group-hover:scale-125 transition-transform`}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                      {/* Left: Date, Badge & Title */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">
                            {ev.displayDate}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1 ${badge.bg} ${badge.text} ${badge.border}`}>
                            <IconComponent className="w-3 h-3" />
                            <span>● {badge.label}</span>
                          </span>

                          {ev.worldConnection && (
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                              {ev.worldConnection}
                            </span>
                          )}
                        </div>

                        <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {ev.title}
                        </h3>

                        {ev.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-sans line-clamp-2">
                            "{ev.notes}"
                          </p>
                        )}
                      </div>

                      {/* Right: Metrics & Inspection prompt */}
                      <div className="shrink-0 flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right text-xs font-mono">
                          <span className="text-slate-700 dark:text-slate-300 font-bold block">
                            {ev.durationMinutes} min
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 text-[10px]">
                            {ev.explainWithoutNotes === 'yes' ? 'No notes needed' : 'Practiced'}
                          </span>
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

    </section>
  );
};

export default GrowthTimeline;
