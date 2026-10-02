import React, { useState } from 'react';
import { 
  BjtTransistorSymbol, 
  ResistorSymbol, 
  CapacitorSymbol, 
  DiodeSymbol, 
  MemoryModelSymbol 
} from './STEMVisuals';

/**
 * KnowledgeField
 * Principles 9, 10, 19, 20:
 * Discards the spreadsheet / contact-sheet grid of task cards.
 * Replaces it with a spatial sequence and relationship field of learning artifacts:
 * - Spatial alignment and subtle relationship connectors
 * - Qualitative visual states: unseen, ready, active (pulse), proven (check)
 * - Attention reaction: hovering an artifact illuminates its relational web and dims unrelated items
 * - Clicking an artifact recomposes the workspace around it
 */
const KnowledgeField = ({ 
  frames = [], 
  activeFrameId, 
  onSelectFrame, 
  onInspectFrame,
  phaseName,
  subjectName 
}) => {
  const [hoveredId, setHoveredId] = useState(null);

  if (!frames || frames.length === 0) return null;

  // Build relationship map for hovered artifact
  const hoveredIndex = frames.findIndex(f => f.id === hoveredId);
  const activeHoveredFrame = hoveredIndex >= 0 ? frames[hoveredIndex] : null;

  const isRelated = (frameId) => {
    if (!hoveredId) return false;
    if (frameId === hoveredId) return false;
    const idx = frames.findIndex(f => f.id === frameId);
    // Adjacent in sequence
    if (Math.abs(idx - hoveredIndex) === 1) return true;
    // Shared parent task concept
    if (activeHoveredFrame && frames[idx].taskName === activeHoveredFrame.taskName) return true;
    return false;
  };

  // Get micro-artifact visual for a concept
  const renderMicroArtifact = (name = '', taskName = '') => {
    const text = (name + ' ' + taskName).toLowerCase();
    if (text.includes('transistor') || text.includes('q1') || text.includes('bjt')) {
      return <BjtTransistorSymbol state="saturated" className="w-16 h-10" />;
    }
    if (text.includes('resistor') || text.includes('resistance') || text.includes('ohm')) {
      return <ResistorSymbol className="w-14 h-6" />;
    }
    if (text.includes('diode') || text.includes('p-n')) {
      return <DiodeSymbol className="w-12 h-6" />;
    }
    if (text.includes('capacitor')) {
      return <CapacitorSymbol className="w-14 h-6" />;
    }
    if (text.includes('memory') || text.includes('stack') || text.includes('heap') || text.includes('pointer')) {
      return <MemoryModelSymbol className="w-16 h-10" />;
    }
    return null;
  };

  return (
    <section className="space-y-4 pt-8 select-none">
      {/* ── SPATIAL HEADER: Context & Density ── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-current/10 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#B84F2B]">
            KNOWLEDGE FIELD
          </span>
          <span className="opacity-30">·</span>
          <span className="font-serif italic text-sm opacity-80">
            {phaseName || 'Active Sequence'}
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px] opacity-60">
          <span>{frames.filter(f => f.completed).length} proven</span>
          <span>/</span>
          <span>{frames.length} total concepts</span>
        </div>
      </div>

      {/* ── HORIZONTAL / SPATIAL ARTIFACT REEL ── */}
      <div className="relative overflow-x-auto pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-stretch gap-3 min-w-max">
          {frames.map((frame, idx) => {
            const isFocal = frame.isCurrent || frame.id === activeFrameId;
            const isCompleted = frame.completed;
            const isHovered = hoveredId === frame.id;
            const related = isRelated(frame.id);
            const isDimmed = hoveredId && !isHovered && !related;
            const orderNum = String(idx + 1).padStart(2, '0');

            // Qualitative state badge
            const stateLabel = isCompleted 
              ? 'PROVEN' 
              : isFocal 
                ? 'ACTIVE FOCAL' 
                : related 
                  ? 'RELATED' 
                  : 'READY';

            return (
              <div
                key={frame.id}
                data-cursor="concept"
                onMouseEnter={() => setHoveredId(frame.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectFrame(frame)}
                className={`relative w-48 sm:w-56 p-4 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isFocal
                    ? 'border-[#B84F2B] bg-[#FAF7F0] dark:bg-[#1C1C19] shadow-md z-20'
                    : isHovered
                      ? 'border-[#171716] dark:border-[#EDE9E0] bg-[#FAF7F0] dark:bg-[#1C1C19] z-10'
                      : related
                        ? 'border-[#B84F2B]/50 bg-current/[0.02] opacity-90'
                        : isDimmed
                          ? 'border-current/10 opacity-30'
                          : isCompleted
                            ? 'border-current/15 bg-current/[0.02] opacity-75'
                            : 'border-current/15 opacity-60 hover:opacity-100'
                }`}
              >
                {/* Top Sequence Marker & State */}
                <div>
                  <div className="flex items-center justify-between font-mono text-[10px] mb-2.5">
                    <span className="opacity-50">
                      {orderNum}
                    </span>

                    <span className={`text-[9px] uppercase tracking-wider font-mono ${
                      isCompleted 
                        ? 'text-[#2F7558] font-bold' 
                        : isFocal 
                          ? 'text-[#B84F2B] font-bold' 
                          : related 
                            ? 'text-[#B84F2B]' 
                            : 'opacity-40'
                    }`}>
                      {stateLabel}
                    </span>
                  </div>

                  {/* Task Chapter & Artifact Name */}
                  <div className="font-mono text-[10px] opacity-40 uppercase truncate mb-1">
                    {frame.taskName}
                  </div>

                  <h4 className="font-serif text-sm leading-snug line-clamp-2 mb-3">
                    {frame.name}
                  </h4>
                </div>

                {/* Inline Real STEM Artifact Representation */}
                <div className="mt-2 pt-2 border-t border-current/10">
                  <div className="h-10 flex items-center justify-center opacity-85">
                    {renderMicroArtifact(frame.name, frame.taskName) || (
                      <span className="font-mono text-[9px] opacity-40">
                        [ CONCEPT NODE ]
                      </span>
                    )}
                  </div>

                  {/* Foot Action / Status */}
                  <div className="flex items-center justify-between mt-2 pt-1 font-mono text-[10px]">
                    <span className="opacity-50">
                      {frame.raw?.time || 25}m
                    </span>

                    {isCompleted ? (
                      <span className="text-[#2F7558] flex items-center gap-1">
                        ✓ VERIFIED
                      </span>
                    ) : isFocal ? (
                      <span className="text-[#B84F2B] flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B84F2B] animate-pulse" />
                        CURRENT
                      </span>
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 hover:text-[#B84F2B] transition-opacity">
                        Focus ↗
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RELATIONAL KNOWLEDGE DISCOVERY BANNER (When hovering) ── */}
      {activeHoveredFrame && (
        <div className="p-3 border border-current/15 bg-current/[0.02] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#B84F2B] uppercase">Inspecting:</span>
            <span className="font-serif italic font-medium">{activeHoveredFrame.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="opacity-50">
              {activeHoveredFrame.completed ? 'State: Mastered in Archive' : 'State: Unverified Take'}
            </span>
            <button
              onClick={() => onInspectFrame(activeHoveredFrame)}
              className="text-[#B84F2B] hover:underline"
            >
              [ Open Deep Discovery → ]
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default KnowledgeField;
