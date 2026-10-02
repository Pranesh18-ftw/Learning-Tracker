import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';

/**
 * VisualGuidedPath
 * Principles 8, 9, 11:
 * Duolingo-inspired STEM progression path.
 * Renders learning levels along a winding/stepped visual path with:
 * - Segmented visual progress bar
 * - Tactile milestone tokens (Completed = Emerald check, Current = Vibrant Pulse, Ready = Active)
 * - Connecting path lines with progression cues
 * - Interactive inspection on click/hover
 */
const VisualGuidedPath = ({ 
  frames = [], 
  activeFrameId, 
  onSelectFrame,
  phaseName = 'Active Path',
  subjectName = 'Electronics' 
}) => {
  const [hoveredFrameId, setHoveredFrameId] = useState(null);

  if (!frames || frames.length === 0) return null;

  const completedCount = frames.filter(f => f.completed).length;
  const progressPercent = Math.round((completedCount / frames.length) * 100);

  // Icon mapping helper based on title keywords
  const getNodeIcon = (title = '', isCompleted, isCurrent) => {
    if (isCompleted) return <Check className="w-5 h-5 stroke-[3] text-white" />;
    const lower = title.toLowerCase();
    if (lower.includes('diode') || lower.includes('zener')) return '⚡';
    if (lower.includes('transistor') || lower.includes('q1') || lower.includes('bjt')) return '🔌';
    if (lower.includes('resistor') || lower.includes('ohm')) return '📐';
    if (lower.includes('switch') || lower.includes('driver')) return '⚙️';
    if (lower.includes('gpio') || lower.includes('interrupt')) return '💻';
    if (lower.includes('pointer') || lower.includes('memory')) return '🧠';
    return isCurrent ? '🎯' : '⚛️';
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* ── HEADER: PROGRESSION & SEGMENTED METER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-electric-100 dark:bg-electric-950 text-electric-600 dark:text-electric-400 font-bold text-xs uppercase px-2.5 py-0.5 rounded-full">
              Guided Mastery Path
            </span>
            <span className="text-xs font-semibold text-slate-400">·</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {subjectName} / {phaseName}
            </span>
          </div>
          <h3 className="font-display font-black text-xl sm:text-2xl text-slate-900 dark:text-white mt-1">
            Learning Progression
          </h3>
        </div>

        {/* Visual Progress Segments */}
        <div className="flex flex-col sm:items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
              {progressPercent}%
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ({completedCount} of {frames.length} Mastered)
            </span>
          </div>

          {/* Segmented Meter Blocks */}
          <div className="flex items-center gap-1.5">
            {frames.map((f, i) => (
              <div 
                key={f.id || i}
                className={`h-2.5 w-6 rounded-full transition-all ${
                  f.completed 
                    ? 'bg-emerald-500 shadow-xs' 
                    : f.isCurrent 
                      ? 'bg-electric-500 animate-pulse' 
                      : 'bg-slate-200 dark:bg-slate-700'
                }`}
                title={f.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── VISUAL PATH NODES (Duolingo-style winding stepped trail) ── */}
      <div className="py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {frames.map((frame, idx) => {
            const isCompleted = frame.completed;
            const isCurrent = frame.isCurrent || frame.id === activeFrameId;
            const isHovered = hoveredFrameId === frame.id;
            const nodeNumber = String(idx + 1).padStart(2, '0');

            return (
              <div
                key={frame.id}
                onMouseEnter={() => setHoveredFrameId(frame.id)}
                onMouseLeave={() => setHoveredFrameId(null)}
                onClick={() => onSelectFrame(frame)}
                className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                  isHovered ? 'scale-[1.02] shadow-md' : ''
                } ${
                  isCurrent
                    ? 'bg-electric-50/80 dark:bg-electric-950/40 border-electric-500 shadow-lg shadow-blue-500/10 -translate-y-1'
                    : isCompleted
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/80 hover:-translate-y-0.5'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5'
                }`}
              >
                {/* Visual Node Token */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-md transition-transform ${
                  isCompleted
                    ? 'bg-emerald-500 text-white border-b-4 border-emerald-700'
                    : isCurrent
                      ? 'bg-electric-600 text-white border-b-4 border-electric-800 scale-105 pulse-ring-active'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-b-4 border-slate-300 dark:border-slate-600'
                }`}>
                  {getNodeIcon(frame.name, isCompleted, isCurrent)}
                </div>

                {/* Node Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] font-bold text-slate-400">
                      STEP {nodeNumber}
                    </span>
                    {isCurrent && (
                      <span className="bg-electric-600 text-white text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md">
                        ACTIVE NOW
                      </span>
                    )}
                    {isCompleted && (
                      <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md">
                        COMPLETED ✓
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {frame.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {frame.taskName} · {frame.raw?.time || 25} min
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 opacity-60" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Motivational Footnote */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="flex items-center gap-1.5 font-medium">
          <span>🏆</span> Each milestone locks in permanent concept recall.
        </span>
        <span className="font-bold text-electric-600 dark:text-electric-400 cursor-pointer hover:underline">
          Explore Full World Map →
        </span>
      </div>
    </section>
  );
};

export default VisualGuidedPath;
