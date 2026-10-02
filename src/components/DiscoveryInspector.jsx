import React from 'react';
import { 
  BjtTransistorSymbol, 
  ResistorSymbol, 
  CapacitorSymbol, 
  DiodeSymbol, 
  MemoryModelSymbol 
} from './STEMVisuals';

/**
 * DiscoveryInspector
 * Principles 11, 13, 20:
 * A spatial contextual drawer / discovery mode that unfolds without navigating away.
 * Shows:
 * - Structural anatomy of the concept
 * - Related principles and governing equations
 * - Real STEM visual artifacts
 * - Direct action to engage focus
 */
const DiscoveryInspector = ({ 
  frame, 
  allFrames = [], 
  onClose, 
  onStartFocus 
}) => {
  if (!frame) return null;

  const raw = frame.raw || {};
  const currentIndex = allFrames.findIndex(f => f.id === frame.id);
  const prevFrame = currentIndex > 0 ? allFrames[currentIndex - 1] : null;
  const nextFrame = currentIndex >= 0 && currentIndex < allFrames.length - 1 ? allFrames[currentIndex + 1] : null;

  const isBjt = frame.name?.toLowerCase().includes('q1') || frame.name?.toLowerCase().includes('transistor') || frame.taskName?.toLowerCase().includes('bjt');
  const isResistor = frame.name?.toLowerCase().includes('resistor') || frame.name?.toLowerCase().includes('resistance');
  const isDiode = frame.name?.toLowerCase().includes('diode');
  const isMemory = frame.name?.toLowerCase().includes('memory') || frame.name?.toLowerCase().includes('stack') || frame.name?.toLowerCase().includes('pointer');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 select-none anim-fade">
      <div 
        className="w-full max-w-2xl bg-[#F7F4EC] dark:bg-[#161614] border border-[#171716] dark:border-[#EDE9E0] p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* ── TOP BREADCRUMB & CLOSE ── */}
        <div className="flex items-start justify-between border-b border-current/10 pb-4">
          <div className="space-y-1">
            <div className="font-mono text-[10px] tracking-wider uppercase text-[#B84F2B]">
              DISCOVERY INSPECTION · {raw.subjectName || 'ENGINEERING'}
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-current leading-tight">
              {frame.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 font-mono text-xs opacity-60 hover:opacity-100 border border-current/20 hover:border-current transition-all"
          >
            [ ESC ]
          </button>
        </div>

        {/* ── SPATIAL RELATIONSHIP CHAIN ── */}
        <div className="p-4 border border-current/10 bg-current/[0.02] space-y-2">
          <span className="font-mono text-[10px] tracking-wider uppercase opacity-50 block">
            Relational Position in Path
          </span>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono">
            <div className="flex-1 p-2 border border-current/10 opacity-70 w-full truncate">
              <span className="text-[9px] opacity-50 block">PREREQUISITE</span>
              <span>{prevFrame ? prevFrame.name : 'Foundational Physics'}</span>
            </div>

            <span className="text-[#B84F2B] font-bold">→</span>

            <div className="flex-1 p-2 border-2 border-[#B84F2B] bg-[#B84F2B]/5 font-semibold w-full truncate">
              <span className="text-[9px] text-[#B84F2B] block">ACTIVE INSPECTION</span>
              <span>{frame.name}</span>
            </div>

            <span className="text-[#B84F2B] font-bold">→</span>

            <div className="flex-1 p-2 border border-current/10 opacity-70 w-full truncate">
              <span className="text-[9px] opacity-50 block">UNLOCKS</span>
              <span>{nextFrame ? nextFrame.name : 'Phase Synthesis'}</span>
            </div>
          </div>
        </div>

        {/* ── STEM ARTIFACT & STRUCTURAL ANATOMY ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* Anatomy Breakdown */}
          <div className="space-y-3">
            <span className="font-mono text-[10px] tracking-wider uppercase opacity-50 block">
              Structural Anatomy
            </span>

            {isBjt ? (
              <div className="space-y-2 text-xs font-mono opacity-80">
                <div className="p-2 border border-current/10">
                  <span className="text-[#B84F2B] font-bold">BASE (B):</span> Thin P-region. Injects carriers when V_BE &gt; 0.7V.
                </div>
                <div className="p-2 border border-current/10">
                  <span className="text-[#B84F2B] font-bold">COLLECTOR (C):</span> Wide N-region. Collects saturated electron flow.
                </div>
                <div className="p-2 border border-current/10">
                  <span className="text-[#B84F2B] font-bold">EMITTER (E):</span> Heavily doped. Supplies majority charge carriers.
                </div>
              </div>
            ) : isResistor ? (
              <div className="space-y-2 text-xs font-mono opacity-80">
                <div className="p-2 border border-current/10">
                  <span className="text-[#B84F2B] font-bold">LAW:</span> V = I · R (Ohm's Law)
                </div>
                <div className="p-2 border border-current/10">
                  <span className="text-[#B84F2B] font-bold">MECHANISM:</span> Scattering of drift electrons against lattice ions.
                </div>
              </div>
            ) : isMemory ? (
              <div className="space-y-2 text-xs font-mono opacity-80">
                <div className="p-2 border border-current/10">
                  <span className="text-[#B84F2B] font-bold">STACK:</span> Deterministic LIFO allocation, zero fragmentation.
                </div>
                <div className="p-2 border border-current/10">
                  <span className="text-[#B84F2B] font-bold">HEAP:</span> Dynamic lifetime, requires manual or GC ownership.
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs font-mono opacity-80">
                <div className="p-2 border border-current/10">
                  <span className="text-[#B84F2B] font-bold">GOAL:</span> Derive physical mechanism without looking at reference material.
                </div>
              </div>
            )}
          </div>

          {/* Micro Visual Artifact */}
          <div className="p-4 border border-current/15 flex flex-col items-center justify-center text-center space-y-3 bg-current/[0.02]">
            <span className="font-mono text-[10px] tracking-wider uppercase opacity-50">
              Technical Schematic
            </span>

            <div className="py-2">
              {isBjt ? (
                <BjtTransistorSymbol state="saturated" className="w-32 h-20" />
              ) : isResistor ? (
                <ResistorSymbol className="w-28 h-10" />
              ) : isDiode ? (
                <DiodeSymbol className="w-24 h-10" />
              ) : isMemory ? (
                <MemoryModelSymbol className="w-32 h-20" />
              ) : (
                <CapacitorSymbol className="w-28 h-10" />
              )}
            </div>

            <span className="font-mono text-[9px] opacity-60">
              Verified Technical Blueprint
            </span>
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="pt-4 border-t border-current/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="font-mono text-xs opacity-60 hover:opacity-100 hover:underline"
          >
            ← Back to Workspace
          </button>

          <button
            onClick={() => {
              onClose();
              onStartFocus(raw);
            }}
            data-cursor="action"
            className="px-6 py-2.5 bg-[#171716] dark:bg-[#EDE9E0] text-[#F7F4EC] dark:text-[#161614] font-mono text-xs tracking-wider uppercase font-medium hover:opacity-90 transition-opacity"
          >
            Engage Focus Session ({raw.time || 25}m) →
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryInspector;
