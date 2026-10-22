import React from 'react';

/**
 * ConceptObject
 *
 * Represents a concept as an authentic learning object (NOT a generic card).
 * Incorporates:
 * - Schematic micro-symbol (capacitor, resistor, diode, transistor, inductor, etc.)
 * - Compact typography and domain styling
 * - Unmissable "YOU ARE HERE" indicator for current concept
 * - Established ✓ indicator for completed concepts
 * - Micro progress dots for subtasks
 */
export const ConceptSchematicGlyph = ({ glyph, className = "w-6 h-6", isCurrent = false, isCompleted = false }) => {
  const strokeColor = isCompleted
    ? "#10B981"
    : isCurrent
      ? "#F97316"
      : "currentColor";

  switch (glyph) {
    case 'capacitor':
      return (
        <svg viewBox="0 0 36 20" className={className} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round">
          <line x1="2" y1="10" x2="14" y2="10" />
          <line x1="14" y1="3" x2="14" y2="17" strokeWidth="2.5" />
          <line x1="22" y1="3" x2="22" y2="17" strokeWidth="2.5" />
          <line x1="22" y1="10" x2="34" y2="10" />
        </svg>
      );
    case 'resistor':
      return (
        <svg viewBox="0 0 36 20" className={className} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="2" y1="10" x2="8" y2="10" />
          <polyline points="8,10 11,4 16,16 20,4 25,16 28,10" />
          <line x1="28" y1="10" x2="34" y2="10" />
        </svg>
      );
    case 'diode':
      return (
        <svg viewBox="0 0 36 20" className={className} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="2" y1="10" x2="12" y2="10" />
          <polygon points="12,4 24,10 12,16" fill={isCompleted ? "#10B981" : isCurrent ? "#F97316" : "currentColor"} />
          <line x1="24" y1="4" x2="24" y2="16" strokeWidth="2.5" />
          <line x1="24" y1="10" x2="34" y2="10" />
        </svg>
      );
    case 'transistor':
      return (
        <svg viewBox="0 0 36 24" className={className} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="14" y2="12" />
          <line x1="14" y1="4" x2="14" y2="20" strokeWidth="2.5" />
          <line x1="14" y1="7" x2="26" y2="3" />
          <line x1="14" y1="17" x2="26" y2="21" />
          <polygon points="21,18 26,21 24,15" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'inductor':
      return (
        <svg viewBox="0 0 36 20" className={className} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round">
          <line x1="2" y1="14" x2="6" y2="14" />
          <path d="M 6 14 A 4 6 0 0 1 14 14 A 4 6 0 0 1 22 14 A 4 6 0 0 1 30 14" />
          <line x1="30" y1="14" x2="34" y2="14" />
        </svg>
      );
    case 'memory':
      return (
        <svg viewBox="0 0 32 24" className={className} fill="none" stroke={strokeColor} strokeWidth="1.5">
          <rect x="4" y="2" width="24" height="20" rx="2" />
          <line x1="4" y1="8" x2="28" y2="8" />
          <line x1="4" y1="14" x2="28" y2="14" />
          <circle cx="8" cy="5" r="1" fill="currentColor" />
          <circle cx="8" cy="11" r="1" fill="currentColor" />
          <circle cx="8" cy="17" r="1" fill="currentColor" />
        </svg>
      );
    case 'concurrency':
      return (
        <svg viewBox="0 0 32 20" className={className} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round">
          <path d="M 4 10 L 10 10 L 16 4 L 22 4 L 28 10" />
          <path d="M 10 10 L 16 16 L 22 16 L 28 10" />
        </svg>
      );
    case 'code':
      return (
        <svg viewBox="0 0 28 20" className={className} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9,5 3,10 9,15" />
          <polyline points="19,5 25,10 19,15" />
          <line x1="16" y1="3" x2="12" y2="17" />
        </svg>
      );
    case 'hardware':
      return (
        <svg viewBox="0 0 28 24" className={className} fill="none" stroke={strokeColor} strokeWidth="1.5">
          <rect x="5" y="4" width="18" height="16" rx="2" />
          <line x1="1" y1="8" x2="5" y2="8" />
          <line x1="1" y1="16" x2="5" y2="16" />
          <line x1="23" y1="8" x2="27" y2="8" />
          <line x1="23" y1="16" x2="27" y2="16" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke={strokeColor} strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
  }
};

const ConceptObject = ({
  concept,
  isHovered = false,
  isRelated = false,
  isDimmed = false,
  onHover,
  onLeave,
  onClick
}) => {
  const {
    id,
    name,
    glyph,
    completed,
    isCurrent,
    subtasks = [],
    totalSubtasks = 0,
    completedSubtasksCount = 0
  } = concept;

  // Visual status classes
  let containerStyle = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-slate-400";
  let statusBadge = null;

  if (completed) {
    containerStyle = "border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 shadow-xs hover:border-emerald-500";
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[9px]">
          ✓
        </span>
        Established
      </span>
    );
  } else if (isCurrent) {
    containerStyle = "border-coral-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white ring-4 ring-coral-500/20 shadow-md";
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-coral-600 dark:text-coral-400 bg-coral-50 dark:bg-coral-950/60 px-2 py-0.5 rounded-full border border-coral-200 dark:border-coral-800">
        <span className="w-2 h-2 rounded-full bg-coral-500 animate-ping pointer-events-none" />
        You Are Here
      </span>
    );
  } else {
    statusBadge = (
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
        {totalSubtasks > 0 ? `${completedSubtasksCount}/${totalSubtasks} milestones` : 'Available'}
      </span>
    );
  }

  // Highlight styling on hover relations
  if (isRelated) {
    containerStyle += " ring-2 ring-electric-500/60 border-electric-500";
  }

  const opacityClass = isDimmed ? "opacity-35 transition-opacity" : "opacity-100 transition-opacity";

  return (
    <div
      role="button"
      tabIndex={0}
      data-concept-id={id}
      onMouseEnter={() => onHover && onHover(concept)}
      onMouseLeave={() => onLeave && onLeave()}
      onClick={() => onClick && onClick(concept)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick && onClick(concept);
        }
      }}
      className={`relative group cursor-pointer border-2 rounded-2xl p-4 transition-[border-color,box-shadow,opacity] duration-150 flex flex-col justify-between gap-3 min-w-[210px] max-w-[260px] ${containerStyle} ${opacityClass}`}
    >
      {/* Top Header: Schematic Symbol & Status Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className={`p-2 rounded-xl flex items-center justify-center ${
          completed
            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300'
            : isCurrent
              ? 'bg-coral-100 dark:bg-coral-900/40 text-coral-600 dark:text-coral-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
        }`}>
          <ConceptSchematicGlyph glyph={glyph} isCurrent={isCurrent} isCompleted={completed} />
        </div>

        {statusBadge}
      </div>

      {/* Middle: Concept Title */}
      <div>
        <h4 className={`font-display font-black text-sm tracking-tight leading-snug ${
          isCurrent ? 'text-coral-600 dark:text-coral-400 text-base' : 'text-slate-900 dark:text-white'
        }`}>
          {name}
        </h4>
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {concept.whyItMatters}
        </p>
      </div>

      {/* Bottom: Subtask completion track & Inspect prompt */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        {totalSubtasks > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              {subtasks.map((st, i) => (
                <div
                  key={st.id || i}
                  className={`w-2 h-2 rounded-full ${
                    st.completed ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                  title={`${st.name}: ${st.completed ? 'Done' : 'Pending'}`}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {completedSubtasksCount}/{totalSubtasks}
            </span>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-slate-400">
            {concept.time || 25} min
          </span>
        )}

        <span className="text-[10px] font-bold text-electric-600 dark:text-electric-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
          Inspect ➔
        </span>
      </div>

      {/* Current Concept Pin Flag */}
      {isCurrent && (
        <div className="absolute -top-3 left-6 bg-coral-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
          <span>●</span> Active Concept
        </div>
      )}
    </div>
  );
};

export default ConceptObject;
