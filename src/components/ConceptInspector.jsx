import React from 'react';
import { 
  BjtTransistorSymbol, 
  ResistorSymbol, 
  CapacitorSymbol, 
  DiodeSymbol, 
  MemoryModelSymbol 
} from './STEMVisuals';

/**
 * ConceptInspector
 * "Click a frame -> Enter its world"
 * Spatial drawer / inspection overlay that zooms into a selected concept from the Contact Sheet.
 * Displays:
 * - Lineage / System map (Arc -> Scene -> Take)
 * - Concept dependencies (Prerequisites -> Concept -> Successor)
 * - Engineering schematic / visual instrument
 * - The retrieval question / proof criteria
 * - Primary Action to launch Focus Session
 */
const ConceptInspector = ({ 
  frame, 
  onClose, 
  onStartFocus, 
  onMarkComplete,
  allFrames = [] 
}) => {
  if (!frame) return null;

  const raw = frame.raw || {};
  const isBjt = frame.name?.toLowerCase().includes('q1') || frame.name?.toLowerCase().includes('transistor') || frame.taskName?.toLowerCase().includes('bjt');
  const isResistor = frame.name?.toLowerCase().includes('resistor') || frame.taskName?.toLowerCase().includes('resistor');
  const isDiode = frame.name?.toLowerCase().includes('diode');
  const isMemory = frame.name?.toLowerCase().includes('memory') || frame.name?.toLowerCase().includes('stack') || frame.name?.toLowerCase().includes('pointer');

  // Derive preceding and succeeding concept frames
  const currentIndex = allFrames.findIndex(f => f.id === frame.id);
  const prevFrame = currentIndex > 0 ? allFrames[currentIndex - 1] : null;
  const nextFrame = currentIndex >= 0 && currentIndex < allFrames.length - 1 ? allFrames[currentIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 modal-backdrop bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 select-none">
      <div 
        className="modal-panel w-full max-w-2xl bg-[#F4F0E7] dark:bg-[#161614] border border-[#1C1C1A] dark:border-[#F4F0E7] p-6 sm:p-8 depth-lifted space-y-6 max-h-[90vh] overflow-y-auto"
        style={{ animationDuration: '0.35s' }}
      >
        {/* Navigation Breadcrumb & System Coordinates */}
        <div className="flex items-center justify-between border-b border-[#D8D2C7] dark:border-[#2C2B27] pb-4">
          <div className="space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F] flex items-center gap-2">
              <span>{raw.subjectName || 'ENGINEERING'}</span>
              <span>/</span>
              <span>{raw.phaseName || 'ACTIVE ARC'}</span>
              <span>/</span>
              <span className="text-[#B84F2B]">SCENE INSPECTOR</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1C1C1A] dark:text-[#F4F0E7]">
              {frame.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-xs font-mono text-[#74716A] hover:text-[#1C1C1A] dark:hover:text-[#F4F0E7] border border-[#D8D2C7] dark:border-[#2C2B27] hover:border-[#1C1C1A] dark:hover:border-[#F4F0E7] transition-all"
            title="Return to Contact Sheet [Esc]"
          >
            ✕ ESC
          </button>
        </div>

        {/* ── WHERE IT SITS IN THE SYSTEM (Linear Knowledge Chain) ── */}
        <div className="bg-[#FAF8F3] dark:bg-[#1E1E1B] border border-[#D8D2C7] dark:border-[#2C2B27] p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F] block mb-3">
            System Topology & Dependencies
          </span>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            {/* Prerequisite Node */}
            <div className="flex-1 w-full p-2.5 border border-[#D8D2C7]/60 dark:border-[#2C2B27]/60 opacity-80">
              <span className="text-[9px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F] block mb-0.5">
                Prerequisite Take
              </span>
              <span className="text-[#1C1C1A] dark:text-[#F4F0E7] text-[11px] line-clamp-1">
                {prevFrame ? prevFrame.name : 'First Principles / Foundations'}
              </span>
            </div>

            <span className="text-[#B84F2B] font-mono text-sm hidden sm:inline">→</span>
            <span className="text-[#B84F2B] font-mono text-sm sm:hidden">↓</span>

            {/* Current Active Concept Node */}
            <div className="flex-1 w-full p-2.5 border-2 border-[#B84F2B] bg-[#B84F2B]/5 shadow-sm">
              <span className="text-[9px] uppercase tracking-wider text-[#B84F2B] font-bold block mb-0.5">
                Active Node (You Are Here)
              </span>
              <span className="text-[#1C1C1A] dark:text-[#F4F0E7] text-[11px] font-medium line-clamp-1">
                {frame.name}
              </span>
            </div>

            <span className="text-[#74716A] font-mono text-sm hidden sm:inline">→</span>
            <span className="text-[#74716A] font-mono text-sm sm:hidden">↓</span>

            {/* Successor Node */}
            <div className="flex-1 w-full p-2.5 border border-[#D8D2C7]/60 dark:border-[#2C2B27]/60 opacity-70">
              <span className="text-[9px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F] block mb-0.5">
                Next In Sequence
              </span>
              <span className="text-[#1C1C1A] dark:text-[#F4F0E7] text-[11px] line-clamp-1">
                {nextFrame ? nextFrame.name : 'Phase Mastery Assessment'}
              </span>
            </div>
          </div>
        </div>

        {/* ── TECHNICAL SCHEMATIC & RETRIEVAL SPECIFICATION ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left: Retrieval Challenge */}
          <div className="space-y-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F] block mb-1">
                Active Retrieval Target
              </span>
              <p className="font-serif italic text-base sm:text-lg text-[#1C1C1A] dark:text-[#F4F0E7] leading-snug">
                “Can you derive and explain the physical behavior of {frame.name} from memory?”
              </p>
            </div>

            <div className="space-y-2 text-xs font-sans text-[#74716A] dark:text-[#9C988F]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#1C1C1A] dark:text-[#F4F0E7] block">
                Evidence Requirements
              </span>
              <ul className="space-y-1 list-disc list-inside">
                <li>Demonstrate cutoff threshold vs complete saturation boundary.</li>
                <li>Write the governing mathematical relationship without references.</li>
                <li>Identify primary failure modes or boundary conditions.</li>
              </ul>
            </div>
          </div>

          {/* Right: Micro Schematic Instrument */}
          <div className="p-4 border border-[#D8D2C7] dark:border-[#2C2B27] bg-[#FAF8F3] dark:bg-[#1E1E1B] flex flex-col items-center justify-center text-center space-y-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F]">
              Circuit / Physical Topology
            </span>

            <div className="py-2">
              {isBjt ? (
                <BjtTransistorSymbol state="saturated" className="w-32 h-24" />
              ) : isResistor ? (
                <ResistorSymbol className="w-28 h-12" />
              ) : isDiode ? (
                <DiodeSymbol className="w-24 h-12" />
              ) : isMemory ? (
                <MemoryModelSymbol className="w-36 h-24" />
              ) : (
                <CapacitorSymbol className="w-28 h-12" />
              )}
            </div>

            <span className="font-mono text-[9px] text-[#74716A] dark:text-[#9C988F]">
              {frame.taskName} · Standard Model
            </span>
          </div>
        </div>

        {/* ── ACTIONS FOOTER ── */}
        <div className="pt-4 border-t border-[#D8D2C7] dark:border-[#2C2B27] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 font-mono text-xs text-[#74716A] dark:text-[#9C988F]">
            <span>Est. Session: {raw.time || 35} min</span>
            <span>·</span>
            <span>Status: {frame.completed ? 'Mastered ✓' : frame.isCurrent ? 'Current Focus •' : 'Unexplored ○'}</span>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="action-text text-xs font-mono text-[#74716A] pb-0.5"
            >
              Zoom Out
            </button>

            {!frame.completed && (
              <button
                onClick={() => {
                  onClose();
                  onStartFocus(raw);
                }}
                data-cursor="action"
                className="action-primary px-6 py-2.5 bg-[#1C1C1A] dark:bg-[#F4F0E7] text-[#F4F0E7] dark:text-[#1C1C1A] text-xs font-mono tracking-wider uppercase"
              >
                Enter Take (Focus) →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptInspector;
