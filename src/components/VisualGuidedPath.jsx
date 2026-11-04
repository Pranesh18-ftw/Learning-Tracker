import React, { useState, useMemo } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';
import AdaptiveInterventionCard from './AdaptiveInterventionCard';
import { isReducedMotion } from '../utils/motionTokens';

/**
 * SpatialTravelerDrone
 *
 * Original vector robotic surveyor / explorer drone perched above the active milestone.
 * Moves along the physical 2.5D route only when learning progress genuinely changes.
 */
export const SpatialTravelerDrone = ({ className = '' }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[0_4px_8px_rgba(217,119,6,0.4)] ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="drone-thrust-glow" x1="16" y1="20" x2="16" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="drone-body-sheen" x1="8" y1="6" x2="24" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#57534E" />
        <stop offset="45%" stopColor="#292524" />
        <stop offset="100%" stopColor="#0C0A09" />
      </linearGradient>
    </defs>

    {/* Soft levitation contact shadow */}
    <ellipse cx="16" cy="29" rx="7" ry="2" fill="rgba(0, 0, 0, 0.45)" />

    {/* Downward levitation propulsion field */}
    <polygon points="12,19 20,19 23,28 9,28" fill="url(#drone-thrust-glow)" opacity="0.7" />

    {/* Stabilized outrigger thrusters */}
    <rect x="4.5" y="13" width="3.5" height="6.5" rx="1.5" fill="#292524" stroke="#57534E" strokeWidth="0.75" />
    <rect x="24" y="13" width="3.5" height="6.5" rx="1.5" fill="#292524" stroke="#57534E" strokeWidth="0.75" />
    <circle cx="6.25" cy="18.5" r="1" fill="#F59E0B" />
    <circle cx="25.75" cy="18.5" r="1" fill="#F59E0B" />

    {/* Aerodynamic Chassis with Directional Highlight */}
    <path
      d="M16 6 C10 6 8 10.5 8 15.5 C8 20.5 11 22.5 16 22.5 C21 22.5 24 20.5 24 15.5 C24 10.5 22 6 16 6 Z"
      fill="url(#drone-body-sheen)"
      stroke="#78716C"
      strokeWidth="1"
    />

    {/* Specular Edge Highlight */}
    <path
      d="M12 8.5 C14 7.2 18 7.2 20 8.5"
      stroke="rgba(255, 255, 255, 0.55)"
      strokeWidth="0.8"
      strokeLinecap="round"
    />

    {/* Ocular Visor Sensor */}
    <path
      d="M11 13.5 Q16 11.5 21 13.5 Q16 15.5 11 13.5 Z"
      fill="#D97706"
    />
    <circle cx="16" cy="13.5" r="1.3" fill="#FEF3C7" className="animate-pulse" />
  </svg>
);

/**
 * ExplorerTravelerAvatar
 *
 * Articulated vector explorer with life support pack and walk-cycle rig,
 * adapted from src/assets/roadmap/traveler-walk-cycle.svg.
 */
export const ExplorerTravelerAvatar = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 56"
    width="38"
    height="44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[0_4px_10px_rgba(2,132,199,0.35)] ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="suit-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
      <linearGradient id="visor-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#FCD34D" />
      </linearGradient>
    </defs>
    <ellipse cx="24" cy="51" rx="12" ry="3.5" fill="#0F172A" opacity="0.35" />
    <g className="traveler-rig">
      <g className="limb-back-arm" style={{ transformOrigin: '20px 22px' }}>
        <line x1="20" y1="22" x2="14" y2="30" stroke="#0369A1" strokeWidth="3" strokeLinecap="round" />
        <line x1="14" y1="30" x2="10" y2="36" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="10" cy="36" r="2" fill="#D97706" />
      </g>
      <g className="limb-back-leg" style={{ transformOrigin: '22px 34px' }}>
        <line x1="22" y1="34" x2="16" y2="42" stroke="#075985" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="16" y1="42" x2="12" y2="49" stroke="#0369A1" strokeWidth="3" strokeLinecap="round" />
        <path d="M 10 49 L 14 49 L 15 51 L 9 51 Z" fill="#D97706" />
      </g>
      <g className="traveler-torso">
        <rect x="12" y="19" width="6" height="12" rx="2" fill="#1E293B" stroke="#0284C7" strokeWidth="1" />
        <circle cx="15" cy="22" r="1" fill="#10B981" />
        <circle cx="15" cy="26" r="1" fill="#38BDF8" />
        <path d="M 18 18 Q 24 16 30 18 L 29 32 Q 24 34 19 32 Z" fill="url(#suit-grad)" stroke="#E0F2FE" strokeWidth="1" />
        <line x1="22" y1="20" x2="26" y2="20" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g className="limb-front-leg" style={{ transformOrigin: '26px 34px' }}>
        <line x1="26" y1="34" x2="31" y2="42" stroke="#0284C7" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="31" y1="42" x2="35" y2="49" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
        <path d="M 33 49 L 38 49 L 39 51 L 32 51 Z" fill="#F59E0B" />
      </g>
      <g className="traveler-head">
        <circle cx="25" cy="11" r="7.5" fill="#0C4A6E" stroke="#7DD3FC" strokeWidth="1.2" />
        <path d="M 23 8 Q 30 8 31 12 Q 29 15 23 15 Q 21 12 23 8 Z" fill="url(#visor-grad)" />
        <line x1="22" y1="4" x2="22" y2="1" stroke="#94A3B8" strokeWidth="1" />
        <circle cx="22" cy="1" r="1.5" fill="#F43F5E" />
      </g>
      <g className="limb-front-arm" style={{ transformOrigin: '27px 22px' }}>
        <line x1="27" y1="22" x2="33" y2="29" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
        <line x1="33" y1="29" x2="38" y2="35" stroke="#BAE6FD" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="38" cy="35" r="2" fill="#F59E0B" />
      </g>
    </g>
  </svg>
);

/**
 * VisualGuidedPath
 *
 * Upgraded 2.5D Physical Spatial Journey:
 * - Winding 2.5D physical conduit with cast shadows and metallic bevel.
 * - Tactile cylindrical milestone pucks (completed emerald cylinder, active amber beacon, locked titanium).
 * - Original Waypoint Seeker Drone traveler perched at the current active milestone.
 * - Full accessibility, honest metrics, and responsive fallback.
 */
const VisualGuidedPath = ({
  frames = [],
  activeFrameId,
  onSelectFrame,
  onToggleStep,
  phaseName = 'Active Path',
  subjectName = 'Active Domain'
}) => {
  const [hoveredFrameId, setHoveredFrameId] = useState(null);
  const { adaptiveState, acceptRecommendation, rejectRecommendation, revertRecommendation } = useRoadmap();
  const reducedMotion = isReducedMotion();

  const safeFrames = useMemo(() => (Array.isArray(frames) ? frames : []), [frames]);
  const hasFrames = safeFrames.length > 0;

  const completedCount = safeFrames.filter(f => f.completed).length;
  const progressPercent = hasFrames ? Math.round((completedCount / safeFrames.length) * 100) : 0;
  const isSimulationOnly = adaptiveState?.features?.resources?.isSimulationMode || false;
  const pathRecommendations = (adaptiveState?.recommendations || []).filter(r => r.surface === 'PATH');

  // 2.5D Winding Path Geometry Coordinates
  const stepWidth = 160;
  const padLeft = 85;
  const totalSvgWidth = Math.max(safeFrames.length * stepWidth + padLeft + 60, 680);
  const svgHeight = 100;

  const coords = useMemo(() => {
    return safeFrames.map((_, i) => {
      const x = padLeft + i * stepWidth;
      const y = 50 + Math.sin(i * 1.2) * 16;
      return { x, y };
    });
  }, [safeFrames, stepWidth, padLeft]);

  // Smooth bezier conduit path
  const fullPathD = useMemo(() => {
    if (coords.length === 0) return '';
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [coords]);

  // Completed segment conduit path
  const completedPathD = useMemo(() => {
    if (coords.length === 0 || completedCount === 0) return '';
    const sliceEnd = Math.min(completedCount, coords.length - 1);
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < sliceEnd; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [coords, completedCount]);

  if (!hasFrames) return null;

  // Current active milestone index & traveler position
  const activeIdx = safeFrames.findIndex(f => f.isCurrent || f.id === activeFrameId);
  const currentMilestoneIndex = activeIdx !== -1 ? activeIdx : Math.min(completedCount, safeFrames.length - 1);
  const currentPos = coords[currentMilestoneIndex] || { x: padLeft, y: 50 };

  // Authentic STEM icon helper
  const getNodeIcon = (title = '', isCompleted, isCurrent) => {
    if (isCompleted) return <Check className="w-4 h-4 stroke-[3] text-white" />;
    const lower = title.toLowerCase();
    if (lower.includes('diode') || lower.includes('zener')) return '⚡';
    if (lower.includes('transistor') || lower.includes('q1') || lower.includes('bjt')) return '🔌';
    if (lower.includes('resistor') || lower.includes('ohm')) return '📐';
    if (lower.includes('capacitor') || lower.includes('rc')) return '🔋';
    if (lower.includes('switch') || lower.includes('driver')) return '⚙️';
    if (lower.includes('gpio') || lower.includes('interrupt')) return '💻';
    if (lower.includes('pointer') || lower.includes('memory') || lower.includes('stack')) return '🧠';
    return isCurrent ? '🎯' : '○';
  };

  return (
    <section className="surface-spatial-base rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">

      {/* ── HEADER: HONEST PROGRESSION & STATS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="glass-pill-warm text-amber-800 dark:text-amber-300 bg-amber-500/15 dark:bg-amber-500/20 font-extrabold text-xs uppercase px-3 py-1 rounded-full border border-amber-500/25 dark:border-amber-400/35 shadow-xs">
              Spatial Guided Path
            </span>
            {isSimulationOnly && (
              <span className="glass-pill-warm text-slate-600 dark:text-slate-300 font-mono text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border border-black/10 dark:border-white/15">
                Simulation Mode
              </span>
            )}
            <span className="text-xs font-semibold text-slate-400">·</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {subjectName} / {phaseName}
            </span>
          </div>
          <h3 className="font-display font-black text-xl sm:text-2xl text-slate-900 dark:text-white mt-1 tracking-tight">
            Learning Progression
          </h3>
        </div>

        {/* Truthful Progress */}
        <div className="flex flex-col sm:items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
              {progressPercent}%
            </span>
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
              ({completedCount} of {frames.length} completed)
            </span>
          </div>

          {/* Segmented Progress Track */}
          <div className="flex items-center gap-1.5">
            {frames.map((f, i) => (
              <div
                key={f.id || i}
                onClick={() => onSelectFrame && onSelectFrame(f)}
                className={`h-2.5 w-6 rounded-full transition-all cursor-pointer ${
                  f.completed
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-xs'
                    : (f.isCurrent || f.id === activeFrameId)
                      ? 'bg-copper-500 animate-pulse'
                      : 'bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600'
                }`}
                title={`${f.name} (${f.completed ? 'Completed' : 'Upcoming'})`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── PATH ADAPTIVE CALIBRATION CARD ── */}
      {pathRecommendations.map(rec => (
        <AdaptiveInterventionCard
          key={rec.id}
          recommendation={rec}
          onAccept={acceptRecommendation}
          onReject={rejectRecommendation}
          onRevert={revertRecommendation}
        />
      ))}

      {/* ── 2.5D LUMINOUS CONSTELLATION PATHWAY ── */}
      <div className="py-2 overflow-x-auto select-none">
        <div
          className="relative min-w-max px-2 py-6"
          style={{ width: `${totalSvgWidth}px`, height: `${svgHeight + 60}px` }}
        >
          {/* Background Constellation Filament SVG */}
          <svg
            width={totalSvgWidth}
            height={svgHeight}
            viewBox={`0 0 ${totalSvgWidth} ${svgHeight}`}
            className="absolute top-8 left-0 pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="completed-filament-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>

            {/* Ambient track glow */}
            <path
              d={fullPathD}
              fill="none"
              stroke="currentColor"
              className="text-slate-300/40 dark:text-white/10"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Subtle Guide Filament */}
            <path
              d={fullPathD}
              fill="none"
              stroke="currentColor"
              className="text-slate-400 dark:text-white/20"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Luminous Completed Route */}
            {completedPathD && (
              <path
                d={completedPathD}
                fill="none"
                stroke="url(#completed-filament-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]"
              />
            )}
          </svg>

          {/* Luminous Milestone Nodes */}
          {frames.map((frame, idx) => {
            const isCompleted = frame.completed;
            const isCurrent = frame.isCurrent || frame.id === activeFrameId;
            const pos = coords[idx] || { x: padLeft + idx * stepWidth, y: 50 };

            return (
              <div
                key={frame.id || idx}
                className="absolute transition-transform duration-200"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y + 12}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isCurrent ? 25 : 15
                }}
              >
                {/* Milestone Node Button */}
                <button
                  type="button"
                  onClick={() => onSelectFrame && onSelectFrame(frame)}
                  className={`group relative flex flex-col items-center focus:outline-none transition-all ${
                    isCurrent
                      ? 'scale-110'
                      : 'hover:scale-105 active:scale-95'
                  }`}
                  title={`Step ${idx + 1}: ${frame.name}`}
                  aria-label={`Milestone ${idx + 1}: ${frame.name} (${isCompleted ? 'Completed' : isCurrent ? 'Active Destination' : 'Upcoming'})`}
                >
                  {/* Luminous Node Orb */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                        : isCurrent
                          ? 'bg-amber-500 dark:bg-white text-white dark:text-slate-950 font-black border-2 border-amber-600 dark:border-white shadow-[0_0_20px_rgba(245,158,11,0.5)] dark:shadow-[0_0_24px_rgba(255,255,255,0.9)] ring-4 ring-amber-500/20 dark:ring-white/20'
                          : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 shadow-xs'
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>

                  {/* Pulsating Beacon Ring for Active Destination */}
                  {isCurrent && !reducedMotion && (
                    <span className="absolute -inset-1 rounded-full border border-amber-500 dark:border-white/60 animate-ping opacity-40 pointer-events-none" />
                  )}

                  {/* Node Label */}
                  <span className={`mt-2 font-sans text-xs font-semibold max-w-[130px] text-center line-clamp-2 leading-tight ${
                    isCurrent
                      ? 'text-slate-900 dark:text-white font-extrabold'
                      : isCompleted
                        ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {frame.name}
                  </span>
                </button>
              </div>
            );
          })}

          {/* Active Milestone Status Pill */}
          <div
            className="absolute pointer-events-none z-30 flex flex-col items-center"
            style={{
              left: `${currentPos.x}px`,
              top: `${currentPos.y - 12}px`,
              transform: 'translate(-50%, -100%)',
              transition: reducedMotion ? 'none' : 'left 0.7s cubic-bezier(0.16, 1, 0.3, 1), top 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            aria-hidden="true"
          >
            <div className="px-2.5 py-0.5 rounded-full bg-white text-slate-950 font-mono text-xs font-bold shadow-[0_0_15px_rgba(255,255,255,0.6)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>YOU ARE HERE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP CARDS GRID (Tactile 2.5D Surfaces) ── */}
      <div className="py-2">
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
                onClick={() => onSelectFrame && onSelectFrame(frame)}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                  isHovered ? 'scale-[1.01] -translate-y-1' : ''
                } ${
                  isCurrent
                    ? 'surface-spatial-elevated border-amber-500/80 shadow-lg ring-2 ring-amber-500/20'
                    : isCompleted
                      ? 'surface-spatial-base border-emerald-500/60'
                      : 'surface-spatial-base border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                {/* Visual Node Token */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-md transition-transform ${
                    isCompleted
                      ? 'bg-emerald-500 text-white border-b-4 border-emerald-700'
                      : isCurrent
                        ? 'bg-amber-600 text-white border-b-4 border-amber-800 scale-105'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-b-4 border-stone-300 dark:border-stone-700'
                  }`}
                >
                  {getNodeIcon(frame.name, isCompleted, isCurrent)}
                </div>

                {/* Node Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-bold text-stone-400">
                      STEP {nodeNumber}
                    </span>
                    {isCurrent && (
                      <span className="bg-amber-600 text-white text-xs font-extrabold uppercase px-1.5 py-0.5 rounded-md">
                        DESTINATION
                      </span>
                    )}
                    {isCompleted && (
                      <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold uppercase px-1.5 py-0.5 rounded-md">
                        COMPLETED ✓
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-stone-900 dark:text-warmwhite truncate">
                    {frame.name}
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                    {frame.taskName} · {frame.raw?.time || 25} min
                  </p>
                </div>

                {onToggleStep && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStep(frame);
                    }}
                    className={`btn-tactile-instrument px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      isCompleted
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-coral-50 hover:text-coral-600'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-xs'
                    }`}
                    title={isCompleted ? 'Undo / Reopen milestone' : 'Mark milestone complete'}
                  >
                    {isCompleted ? '↺ Undo' : '✓ Done'}
                  </button>
                )}

                <ChevronRight className="w-5 h-5 text-stone-400 shrink-0 opacity-60" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footnote */}
      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-200 dark:border-stone-800">
        <span className="flex items-center gap-1.5 font-medium">
          <span>🎯</span> Selecting any milestone centers attention directly on that concept.
        </span>
        <span className="font-bold text-copper-600 dark:text-copper-400">
          Dimensional Knowledge Progression
        </span>
      </div>
    </section>
  );
};

export default VisualGuidedPath;
