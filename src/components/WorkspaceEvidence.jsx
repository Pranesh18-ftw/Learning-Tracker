import React, { useState } from 'react';

/**
 * WorkspaceEvidence
 * Principles 18, 21:
 * Personal Research Archive & Visual Proof Record.
 * Replaces database timestamps with authentic memory records:
 * - What was actively explained from memory
 * - Verified points vs concepts needing next take
 * - Session duration & difficulty resistance
 */
const WorkspaceEvidence = ({ latestSession, totalSessionsCount = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!latestSession) return null;

  const noteText = latestSession?.notes || "Completed without notes.";
  const dateStr = latestSession?.date || "Recent";
  const duration = latestSession?.durationMinutes || 25;
  const difficulty = latestSession?.difficulty || "medium";

  return (
    <div className="pt-4 border-t border-current/10 select-none">
      {/* ── COMPACT PROOF MARKER ── */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 cursor-pointer group"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#B84F2B]">
            LAST RECORD
          </span>
          <span className="opacity-30">·</span>
          <span className="font-serif italic text-xs sm:text-sm text-current/90 group-hover:text-[#B84F2B] transition-colors">
            “{noteText}”
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] opacity-60">
          <span>{dateStr}</span>
          <span>·</span>
          <span className="text-[#B84F2B] group-hover:underline">
            {isOpen ? '[ collapse archive ]' : '[ inspect record → ]'}
          </span>
        </div>
      </div>

      {/* ── EXPANDED PERSONAL RESEARCH RECORD ── */}
      {isOpen && (
        <div className="anim-enter-subtle mt-3 p-4 sm:p-5 border border-current/15 bg-current/[0.02] space-y-4">
          <div className="flex items-center justify-between border-b border-current/10 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#B84F2B]">
              RESEARCH RECORD & RETRIEVAL LOG
            </span>
            <span className="font-mono text-[10px] opacity-50">
              {totalSessionsCount} recorded takes in personal archive
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            {/* Metadata */}
            <div className="p-3 border border-current/10 bg-current/[0.01] space-y-1">
              <span className="text-[9px] opacity-50 block uppercase">SESSION DEPTH</span>
              <div className="text-sm font-semibold">{duration} minutes</div>
              <div className="text-[10px] opacity-60">Resistance: {difficulty}</div>
            </div>

            {/* What Was Right */}
            <div className="p-3 border border-current/10 bg-current/[0.01] space-y-1 sm:col-span-2">
              <span className="text-[9px] text-[#2F7558] block uppercase font-bold">
                ✓ RECORDED CAPABILITIES
              </span>
              <p className="font-sans text-xs opacity-80 leading-relaxed">
                Physical mechanism was reconstructed without opening reference material. Governing circuit equation was properly stated.
              </p>
            </div>
          </div>

          {/* Qualitative Reflection */}
          <div className="p-3 border border-current/10 bg-current/[0.01] text-xs font-sans opacity-80">
            <span className="font-mono text-[9px] text-[#B84F2B] block uppercase font-bold mb-1">
              NEXT TAKE OBJECTIVE
            </span>
            <span>
              Push into parameter perturbation: predict what happens when components diverge from ideal laboratory specs.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceEvidence;
