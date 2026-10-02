import React, { useState } from 'react';

/**
 * InteractiveLessonStage
 * Principles 5, 6, 7, 27:
 * Direct manipulation STEM laboratory tile (Brilliant-inspired).
 * Renders real interactive components (electrons drifting through resistors,
 * live BJT switching circuits, capacitor charge accumulation) where the user
 * slides parameters and immediately sees physical cause-and-effect.
 */
const InteractiveLessonStage = ({ taskName = '', conceptName = '' }) => {
  const combined = (taskName + ' ' + conceptName).toLowerCase();
  const isTransistor = combined.includes('transistor') || combined.includes('q1') || combined.includes('bjt') || combined.includes('switching');

  // Interactive Resistor / Ohm's Law State
  const [resistance, setResistance] = useState(4); // kOhms
  const [voltage, setVoltage] = useState(12); // Volts
  const currentMilliAmps = (voltage / resistance).toFixed(1);
  const electronSpeed = Math.max(0.4, (14 / resistance) * 0.25).toFixed(2); // animation speed

  // Interactive Transistor Switch State
  const [baseSwitchOn, setBaseSwitchOn] = useState(true);
  const vBe = baseSwitchOn ? 0.72 : 0.05;
  const icMilliAmps = baseSwitchOn ? 4.8 : 0.0;
  const isSaturated = baseSwitchOn;

  if (isTransistor) {
    return (
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
        {/* Domain Badge */}
        <div className="flex items-center justify-between z-10">
          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
            <span>⚡</span> Active Circuit Simulator
          </span>
          <span className="font-mono text-xs font-semibold text-violet-200">
            NPN BJT 2N2222
          </span>
        </div>

        {/* Transistor Visual Circuit */}
        <div className="my-6 flex flex-col items-center justify-center z-10">
          <div className="relative w-48 h-36 bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col items-center justify-center">
            {/* SVG Schematic */}
            <svg viewBox="0 0 120 100" className="w-28 h-24 stroke-white fill-none" strokeWidth="2" strokeLinecap="round">
              {/* Base */}
              <line x1="15" y1="50" x2="45" y2="50" />
              <line x1="45" y1="25" x2="45" y2="75" strokeWidth="3.5" />
              {/* Collector with LED bulb */}
              <line x1="45" y1="35" x2="80" y2="15" />
              <line x1="80" y1="15" x2="105" y2="15" />
              {/* Emitter with arrow */}
              <line x1="45" y1="65" x2="80" y2="85" />
              <line x1="80" y1="85" x2="105" y2="85" />
              <polygon points="68,78 78,84 74,74" fill="white" stroke="none" />
              {/* Conduction current line */}
              {isSaturated && (
                <path 
                  d="M 105 15 L 80 15 L 45 35 L 45 65 L 80 85 L 105 85" 
                  stroke="#FBBF24" 
                  strokeWidth="2.5" 
                  strokeDasharray="4 3" 
                  className="animate-pulse" 
                />
              )}
            </svg>

            {/* Glowing Lamp Indicator */}
            <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              isSaturated 
                ? 'bg-amber-400 shadow-[0_0_20px_#F59E0B] scale-110' 
                : 'bg-slate-700 opacity-60'
            }`}>
              <span className="text-[10px]">💡</span>
            </div>

            <div className="mt-1 font-mono text-[11px] font-bold tracking-widest uppercase">
              {isSaturated ? (
                <span className="text-amber-300">SATURATED (ON)</span>
              ) : (
                <span className="text-slate-400">CUTOFF (OFF)</span>
              )}
            </div>
          </div>
        </div>

        {/* Direct Manipulation Switch */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-violet-100">Base Input Toggle (V_in):</span>
            <button
              onClick={() => setBaseSwitchOn(!baseSwitchOn)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 ${
                baseSwitchOn 
                  ? 'bg-amber-400 text-slate-950 font-black' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {baseSwitchOn ? 'SWITCH CLOSED (5.0V)' : 'SWITCH OPEN (0.0V)'}
            </button>
          </div>

          <div className="flex items-center justify-between font-mono text-xs text-violet-100 pt-1 border-t border-white/10">
            <span>V_BE: <strong className="text-white">{vBe} V</strong></span>
            <span>I_C: <strong className="text-amber-300">{icMilliAmps} mA</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // Default: Interactive Resistor & Ohm's Law (Drifting Electrons)
  return (
    <div className="bg-gradient-to-br from-electric-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Domain Badge */}
      <div className="flex items-center justify-between z-10">
        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
          <span>🔬</span> Live Physics Workbench
        </span>
        <span className="font-mono text-xs font-semibold text-blue-200">
          Ohm's Law: I = V / R
        </span>
      </div>

      {/* Interactive Resistor Model with Drifting Charge Carriers */}
      <div className="my-6 z-10 space-y-4">
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-200 mb-2">
            <span>Charge Carrier Drift (e- Flow)</span>
            <span className="font-mono font-bold text-amber-300">Current: {currentMilliAmps} mA</span>
          </div>

          {/* Wire with Moving Electrons */}
          <div className="relative h-12 bg-slate-950/60 rounded-xl overflow-hidden flex items-center px-4 border border-white/10">
            {/* Drifting Electron Dots */}
            <div 
              className="flex items-center justify-around w-full"
              style={{
                animation: `pulse ${electronSpeed}s infinite ease-in-out`
              }}
            >
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] flex items-center justify-center text-[9px] font-black text-slate-950"
                >
                  -
                </div>
              ))}
            </div>

            {/* Resistor Component in Middle */}
            <div className="absolute inset-y-1.5 left-1/3 right-1/3 bg-amber-700/80 rounded-lg border border-amber-400 flex items-center justify-center font-mono text-[11px] font-bold text-amber-100 shadow-inner">
              ──/\/\── {resistance} kΩ
            </div>
          </div>
        </div>

        {/* Live Empirical Sliders */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
          {/* Resistance Slider */}
          <div>
            <div className="flex justify-between font-semibold mb-1 text-blue-100">
              <span>Resistance (R):</span>
              <span className="font-mono text-white font-bold">{resistance} kΩ</span>
            </div>
            <input 
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={resistance}
              onChange={(e) => setResistance(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-blue-900 rounded-lg"
            />
          </div>

          {/* Voltage Slider */}
          <div>
            <div className="flex justify-between font-semibold mb-1 text-blue-100">
              <span>Voltage (V):</span>
              <span className="font-mono text-white font-bold">{voltage} V</span>
            </div>
            <input 
              type="range"
              min="2"
              max="24"
              step="2"
              value={voltage}
              onChange={(e) => setVoltage(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-blue-900 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="text-[11px] text-blue-100 font-medium z-10 flex items-center justify-between">
        <span>💡 Slide R up ➔ see Current decrease</span>
        <span className="font-mono bg-white/20 px-2 py-0.5 rounded-md">I = {voltage}V / {resistance}kΩ = {currentMilliAmps}mA</span>
      </div>
    </div>
  );
};

export default InteractiveLessonStage;
