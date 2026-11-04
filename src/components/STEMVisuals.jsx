import React from 'react';

/**
 * Precision engineering schematic micro-visuals for STEM concepts.
 * Vector-rendered, responsive to dark/light theme tokens.
 */

// BJT Transistor Symbol with dynamic switching state
export const BjtTransistorSymbol = ({ 
  state = 'saturated', // 'cutoff' | 'active' | 'saturated'
  interactive = false,
  className = "w-28 h-24"
}) => {
  const isCutoff = state === 'cutoff';
  const isSaturated = state === 'saturated';
  const accentColor = "#B84F2B";

  return (
    <div className={`relative inline-block ${className} select-none`}>
      <svg 
        viewBox="0 0 120 100" 
        className="w-full h-full text-[#1C1C1A] dark:text-[#F4F0E7]"
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.75"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {/* Base Terminal (left) */}
        <line x1="10" y1="50" x2="42" y2="50" />
        <circle cx="10" cy="50" r="2.5" fill="currentColor" />
        <text x="6" y="44" className="text-[8px] font-mono fill-current stroke-none">B</text>

        {/* Base Bar */}
        <line x1="42" y1="24" x2="42" y2="76" strokeWidth="3" />

        {/* Collector Terminal (top right) */}
        <line x1="42" y1="36" x2="80" y2="18" />
        <line x1="80" y1="18" x2="105" y2="18" />
        <circle cx="105" cy="18" r="2.5" fill="currentColor" />
        <text x="106" y="14" className="text-[8px] font-mono fill-current stroke-none">C</text>

        {/* Emitter Terminal with Arrow (bottom right) */}
        <line x1="42" y1="64" x2="80" y2="82" />
        <line x1="80" y1="82" x2="105" y2="82" />
        <circle cx="105" cy="82" r="2.5" fill="currentColor" />
        <text x="106" y="92" className="text-[8px] font-mono fill-current stroke-none">E</text>

        {/* NPN Emitter Arrow pointing outwards */}
        <polygon 
          points="68,76 77,80.5 73,71" 
          fill="currentColor" 
          stroke="none"
        />

        {/* Conduction flow visual */}
        {!isCutoff && (
          <path 
            d="M 105 18 L 80 18 L 42 36 L 42 64 L 80 82 L 105 82" 
            stroke={isSaturated ? accentColor : "#74716A"} 
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className="animate-pulse"
            opacity="0.8"
          />
        )}
      </svg>
      {/* State label */}
      <div className="absolute bottom-0 right-1 text-[9px] font-mono tracking-widest uppercase">
        <span className={isSaturated ? "text-[#B84F2B]" : isCutoff ? "text-[#74716A]" : "text-[#2F7558]"}>
          {state}
        </span>
      </div>
    </div>
  );
};

// Resistor Schematic Symbol (Zigzag)
export const ResistorSymbol = ({ className = "w-20 h-8" }) => (
  <svg 
    viewBox="0 0 100 30" 
    className={`${className} text-[#1C1C1A] dark:text-[#F4F0E7]`}
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.75" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <line x1="5" y1="15" x2="25" y2="15" />
    <polyline points="25,15 30,5 40,25 50,5 60,25 70,5 75,15" />
    <line x1="75" y1="15" x2="95" y2="15" />
    <circle cx="5" cy="15" r="2" fill="currentColor" />
    <circle cx="95" cy="15" r="2" fill="currentColor" />
    <text x="46" y="27" className="text-[7px] font-mono fill-current stroke-none text-center">R</text>
  </svg>
);

// Capacitor Schematic Symbol with animated charge/discharge curve
export const CapacitorSymbol = ({ className = "w-20 h-10" }) => (
  <svg 
    viewBox="0 0 100 40" 
    className={`${className} text-[#1C1C1A] dark:text-[#F4F0E7]`}
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.75" 
    strokeLinecap="round"
  >
    {/* Left plate lead */}
    <line x1="10" y1="20" x2="44" y2="20" />
    <line x1="44" y1="8" x2="44" y2="32" strokeWidth="2.5" />
    
    {/* Right plate lead */}
    <line x1="56" y1="8" x2="56" y2="32" strokeWidth="2.5" />
    <line x1="56" y1="20" x2="90" y2="20" />
    
    {/* Terminals */}
    <circle cx="10" cy="20" r="2" fill="currentColor" />
    <circle cx="90" cy="20" r="2" fill="currentColor" />

    {/* Tiny charge/discharge exponential waveform */}
    <path 
      d="M 62 14 Q 74 15 82 26" 
      stroke="#B84F2B" 
      strokeWidth="1.25" 
      fill="none" 
      strokeDasharray="2 2"
    />
  </svg>
);

// Diode Schematic Symbol
export const DiodeSymbol = ({ className = "w-18 h-8" }) => (
  <svg 
    viewBox="0 0 80 30" 
    className={`${className} text-[#1C1C1A] dark:text-[#F4F0E7]`}
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.75" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <line x1="5" y1="15" x2="30" y2="15" />
    <polygon points="30,5 50,15 30,25" fill="currentColor" />
    <line x1="50" y1="5" x2="50" y2="25" strokeWidth="2" />
    <line x1="50" y1="15" x2="75" y2="15" />
    <circle cx="5" cy="15" r="2" fill="currentColor" />
    <circle cx="75" cy="15" r="2" fill="currentColor" />
  </svg>
);

// Memory Model Visual: Stack vs Heap layout
export const MemoryModelSymbol = ({ className = "w-36 h-24" }) => (
  <svg 
    viewBox="0 0 140 90" 
    className={`${className} text-[#1C1C1A] dark:text-[#F4F0E7]`}
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.25"
  >
    {/* Memory boundary container */}
    <rect x="10" y="5" width="120" height="80" rx="1" strokeDasharray="3 3" />

    {/* Stack (top growing down) */}
    <rect x="15" y="10" width="110" height="22" fill="#B84F2B" fillOpacity="0.12" stroke="#B84F2B" />
    <text x="20" y="24" className="text-[8px] font-mono fill-current stroke-none">STACK (↓ frames)</text>

    {/* Free Space */}
    <text x="46" y="49" className="text-[7px] font-mono fill-[#74716A] dark:fill-[#9C988F] stroke-none">
      UNMAPPED GAP
    </text>

    {/* Heap (bottom growing up) */}
    <rect x="15" y="58" width="110" height="22" fill="#2F7558" fillOpacity="0.12" stroke="#2F7558" />
    <text x="20" y="72" className="text-[8px] font-mono fill-current stroke-none">HEAP (↑ malloc)</text>
  </svg>
);
