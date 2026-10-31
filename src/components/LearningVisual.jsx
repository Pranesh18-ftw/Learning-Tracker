import React, { useState, useEffect } from 'react';
import { DiodeSymbol, MemoryModelSymbol } from './STEMVisuals';
import {
  calculateCapacitorEnergy,
  formatEnergy,
  calculateRcTau,
  calculateRcChargingVoltage,
  calculateRcDischargeVoltage,
  calculateRcChargingCurrent,
  calculateOhmsLawCurrent
} from '../utils/physicsCalculations';

/**
 * LearningVisual
 *
 * Truthful, scientifically validated, task-aware visual learning object.
 *
 * CORE TRUTHFULNESS INVARIANTS (P0.5):
 * 1. Only renders when explicitly mapped via visualRegistry.
 * 2. Every quantitative visual is derived from genuine analytical mathematical equations.
 * 3. Every conceptual visual is explicitly labeled as an educational model/approximation.
 * 4. Zero arbitrary animation-derived states masquerading as measurements.
 * 5. Returns null if visual is missing or type is 'none'.
 */
const LearningVisual = ({ visual = { type: 'none' }, taskName = '', conceptName = '' }) => {
  if (!visual || visual.type === 'none') {
    return null;
  }

  return (
    <div className="h-full flex flex-col justify-between select-none">
      {visual.model === 'rc-circuit' && (
        <CapacitorInteractiveStage visual={visual} />
      )}

      {visual.model === 'ohms-law' && (
        <OhmsLawInteractiveStage visual={visual} />
      )}

      {visual.model === 'bjt-switch' && (
        <BjtInteractiveStage visual={visual} />
      )}

      {visual.model === 'diode' && (
        <DiodeDiagramStage visual={visual} />
      )}

      {visual.model === 'memory-model' && (
        <MemoryDiagramStage visual={visual} />
      )}

      {visual.model === 'concurrency' && (
        <ConcurrencyDiagramStage visual={visual} />
      )}

      {visual.model === 'gpio-stage' && (
        <GpioDiagramStage visual={visual} />
      )}

      {visual.type === 'code' && (
        <CodeDiagramStage visual={visual} />
      )}
    </div>
  );
};

/* =========================================================================
   1. CAPACITOR INTERACTIVE STAGE (Analytical RC Exponential Model)
   Governed strictly by:
   - τ = R × C
   - V_c(t) = V_s · (1 - e^(-t / τ)) [charging]
   - V_c(t) = V_0 · e^(-t / τ) [discharging]
   - I(t) = (V_s / R) · e^(-t / τ)
   - E = ½ · C · V²
   ========================================================================= */
const CapacitorInteractiveStage = ({ visual }) => {
  const [capacitanceUf, setCapacitanceUf] = useState(10); // μF (10 microfarads)
  const [resistanceKohm, setResistanceKohm] = useState(10); // kΩ (10 kilo-ohms)
  const [isCharging, setIsCharging] = useState(true);
  const [modelTimeSeconds, setModelTimeSeconds] = useState(0.5); // elapsed time t in seconds
  const [isPlaying, setIsPlaying] = useState(true);

  const supplyVoltage = 10.0; // Vs = 10V
  const rOhms = resistanceKohm * 1e3;
  const cFarads = capacitanceUf * 1e-6;

  // Analytical Time Constant τ (seconds) and in milliseconds
  const tauSeconds = calculateRcTau(rOhms, cFarads);
  const tauMs = Number((tauSeconds * 1e3).toFixed(1));

  // Advance model time t analytically
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setModelTimeSeconds((prev) => {
        // Step forward in time proportional to tau for a natural, calibrated progression
        const dt = tauSeconds * 0.08;
        const nextTime = prev + dt;
        // Cycle smoothly within 0 to 4.5 tau
        if (nextTime > tauSeconds * 4.5) {
          return 0;
        }
        return nextTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, tauSeconds]);

  // Reset model time when toggling charge/discharge
  const handleToggleSwitch = () => {
    setIsCharging((prev) => !prev);
    setModelTimeSeconds(0);
  };

  // ANALYTICAL PHYSICAL VALUES (never fake frame counters)
  const capacitorVoltage = isCharging
    ? calculateRcChargingVoltage(supplyVoltage, modelTimeSeconds, rOhms, cFarads)
    : calculateRcDischargeVoltage(supplyVoltage, modelTimeSeconds, rOhms, cFarads);

  const chargingCurrentAmps = isCharging
    ? calculateRcChargingCurrent(supplyVoltage, modelTimeSeconds, rOhms, cFarads)
    : -(capacitorVoltage / rOhms);

  const currentMilliAmps = (chargingCurrentAmps * 1e3).toFixed(2);

  // Energy at theoretical full charge (10V): E = 1/2 C V^2
  // For C = 10 µF, V = 10 V: E = 0.5 * 10e-6 * 100 = 0.0005 J = 500 µJ
  const fullEnergyJoules = calculateCapacitorEnergy(cFarads, supplyVoltage);
  const fullEnergyFormatted = formatEnergy(fullEnergyJoules);

  // Instantaneous stored energy: E(t) = 1/2 C V_c(t)^2
  const currentEnergyJoules = calculateCapacitorEnergy(cFarads, capacitorVoltage);
  const currentEnergyFormatted = formatEnergy(currentEnergyJoules);

  // Voltage fraction (0.0 to 1.0) strictly from model
  const voltageFraction = Math.max(0, Math.min(1, capacitorVoltage / supplyVoltage));

  return (
    <div className="glass-panel-warm-interactive rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between h-full">
      {/* Header with Classification Badge */}
      <div className="flex items-center justify-between z-10 flex-wrap gap-2">
        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
          <span>⚡</span> Capacitor Dynamics
        </span>
        <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
          QUANTITATIVE MODEL
        </span>
        <span className="font-mono text-xs font-semibold text-blue-200">
          τ = R · C = {tauMs} ms
        </span>
      </div>

      {/* Capacitor Physical Charge Visual */}
      <div className="my-4 z-10 space-y-3">
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between text-xs text-blue-200 mb-2 font-mono flex-wrap gap-1">
            <span>ELECTROSTATIC FIELD & CHARGE</span>
            <span className="text-amber-300 font-bold">
              {isCharging ? 'CHARGING' : 'DISCHARGING'}: V_C(t) = {capacitorVoltage.toFixed(2)} V
            </span>
          </div>

          {/* Physical Parallel Plate Capacitor Diagram */}
          <div className="relative h-20 bg-slate-950/70 rounded-xl overflow-hidden flex items-center justify-center px-4 border border-white/10">
            {/* Left Wire */}
            <div className="w-16 h-1 bg-slate-400" />

            {/* Positive Plate (+Q) */}
            <div
              className="w-3.5 h-14 bg-coral-500 rounded-xs flex flex-col items-center justify-around py-1 transition-all duration-150"
              style={{
                boxShadow: `0 0 ${Math.round(voltageFraction * 14)}px #EA580C`,
                opacity: 0.35 + voltageFraction * 0.65
              }}
            >
              {[...Array(4)].map((_, i) => (
                <span key={i} className="text-[8px] font-black text-white leading-none">+</span>
              ))}
            </div>

            {/* Dielectric Gap */}
            <div
              className="w-12 h-14 border-y border-dashed border-blue-400/40 flex items-center justify-center transition-colors duration-150"
              style={{
                backgroundColor: `rgba(30, 58, 138, ${0.2 + voltageFraction * 0.5})`
              }}
            >
              <span className="text-[8px] font-mono text-blue-200 tracking-tighter rotate-90 font-bold">
                E-FIELD
              </span>
            </div>

            {/* Negative Plate (-Q) */}
            <div
              className="w-3.5 h-14 bg-electric-500 rounded-xs flex flex-col items-center justify-around py-1 transition-all duration-150"
              style={{
                boxShadow: `0 0 ${Math.round(voltageFraction * 14)}px #3B82F6`,
                opacity: 0.35 + voltageFraction * 0.65
              }}
            >
              {[...Array(4)].map((_, i) => (
                <span key={i} className="text-[8px] font-black text-white leading-none">-</span>
              ))}
            </div>

            {/* Right Wire */}
            <div className="w-16 h-1 bg-slate-400" />
          </div>

          {/* Analytical Metrics */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono text-blue-200 pt-2 border-t border-white/10">
            <div>
              <span>Current I(t): </span>
              <strong className="text-white">{currentMilliAmps} mA</strong>
            </div>
            <div>
              <span>Model t: </span>
              <strong className="text-white">{(modelTimeSeconds * 1e3).toFixed(0)} ms</strong>
              <span className="text-blue-300"> ({(modelTimeSeconds / (tauSeconds || 1)).toFixed(2)}τ)</span>
            </div>
            <div>
              <span>Stored Energy: </span>
              <strong className="text-amber-300">{currentEnergyFormatted.formatted}</strong>
            </div>
            <div>
              <span>Full Cap Energy (10V): </span>
              <strong className="text-amber-300">{fullEnergyFormatted.formatted}</strong>
            </div>
          </div>
        </div>

        {/* Sliders for C and R */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
          <div>
            <div className="flex justify-between font-semibold mb-1 text-blue-100">
              <span>Capacitance (C):</span>
              <span className="font-mono text-white font-bold">{capacitanceUf} µF</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={capacitanceUf}
              onChange={(e) => setCapacitanceUf(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-blue-900 rounded-lg"
              aria-label="Capacitance in microfarads"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold mb-1 text-blue-100">
              <span>Series Resistor (R):</span>
              <span className="font-mono text-white font-bold">{resistanceKohm} kΩ</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={resistanceKohm}
              onChange={(e) => setResistanceKohm(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-blue-900 rounded-lg"
              aria-label="Resistance in kilo-ohms"
            />
          </div>
        </div>
      </div>

      {/* Switch & Action */}
      <div className="flex items-center justify-between z-10 pt-1 flex-wrap gap-2">
        <button
          onClick={handleToggleSwitch}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 ${
            isCharging
              ? 'bg-amber-400 text-slate-950 font-black'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          {isCharging ? 'SWITCH: CONNECTED TO 10V' : 'SWITCH: GROUNDED (DISCHARGE)'}
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-[11px] font-mono text-blue-200 underline hover:text-white"
        >
          {isPlaying ? '⏸ Pause Time' : '▶ Resume Time'}
        </button>
        <span className="text-[11px] font-mono text-blue-200">
          {isCharging ? 'V_C = V_S(1 - e^-t/τ)' : 'V_C = V_0 · e^-t/τ'}
        </span>
      </div>
    </div>
  );
};

/* =========================================================================
   2. OHM'S LAW INTERACTIVE STAGE (Quantitative Analytical Model)
   Governed by: I = V / R
   ========================================================================= */
const OhmsLawInteractiveStage = ({ visual }) => {
  const [resistanceKohm, setResistanceKohm] = useState(4); // kΩ
  const [voltage, setVoltage] = useState(12); // Volts

  const rOhms = resistanceKohm * 1e3;
  const currentAmperes = calculateOhmsLawCurrent(voltage, rOhms);
  const currentMilliAmps = (currentAmperes * 1e3).toFixed(2);
  const powerWatts = (voltage * currentAmperes).toFixed(3);

  return (
    <div className="glass-panel-warm-interactive bg-gradient-to-br from-blue-600/40 via-indigo-600/30 to-blue-900/50 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between h-full border border-blue-400/25">
      <div className="flex items-center justify-between z-10 flex-wrap gap-2">
        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
          <span>🔬</span> Ohm's Law Workbench
        </span>
        <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
          QUANTITATIVE MODEL
        </span>
        <span className="font-mono text-xs font-semibold text-blue-200">
          I = V / R
        </span>
      </div>

      <div className="my-4 z-10 space-y-3">
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-200 mb-2">
            <span>Illustrative Carrier Drift (Visualization aid)</span>
            <span className="font-mono font-bold text-amber-300">Calculated Current: {currentMilliAmps} mA</span>
          </div>

          <div className="relative h-12 bg-slate-950/70 rounded-xl overflow-hidden flex items-center px-4 border border-white/10">
            <div className="flex items-center justify-around w-full opacity-80">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] flex items-center justify-center text-[9px] font-black text-slate-950"
                >
                  -
                </div>
              ))}
            </div>

            <div className="absolute inset-y-1.5 left-1/3 right-1/3 bg-amber-700/80 rounded-lg border border-amber-400 flex items-center justify-center font-mono text-[11px] font-bold text-amber-100 shadow-inner">
              ──/\/\── {resistanceKohm} kΩ
            </div>
          </div>

          <div className="mt-2 text-[10px] font-mono text-slate-300 text-right">
            Power: P = V · I = {powerWatts} W
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
          <div>
            <div className="flex justify-between font-semibold mb-1 text-blue-100">
              <span>Resistance (R):</span>
              <span className="font-mono text-white font-bold">{resistanceKohm} kΩ</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={resistanceKohm}
              onChange={(e) => setResistanceKohm(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-blue-900 rounded-lg"
              aria-label="Resistance in kilo-ohms"
            />
          </div>

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
              aria-label="Voltage in volts"
            />
          </div>
        </div>
      </div>

      <div className="text-[11px] text-blue-100 font-medium z-10 flex items-center justify-between flex-wrap gap-2">
        <span>💡 Inverse linearity: doubling R halves I</span>
        <span className="font-mono bg-white/20 px-2 py-0.5 rounded-md">
          {voltage}V / {resistanceKohm}kΩ = {currentMilliAmps}mA
        </span>
      </div>
    </div>
  );
};

/* =========================================================================
   3. BJT TRANSISTOR SWITCH STAGE (Conceptual Educational Model)
   Approximates V_BE ≈ 0.7V for Silicon NPN switching
   ========================================================================= */
const BjtInteractiveStage = ({ visual }) => {
  const [baseSwitchOn, setBaseSwitchOn] = useState(true);
  const vBeApproximation = baseSwitchOn ? 0.70 : 0.00;
  const isSaturated = baseSwitchOn;

  return (
    <div className="glass-panel-warm-interactive rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between h-full">
      <div className="flex items-center justify-between z-10 flex-wrap gap-2">
        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
          <span>🔌</span> BJT Switching Circuit
        </span>
        <span className="text-[10px] font-mono font-bold bg-violet-300 text-slate-950 px-2 py-0.5 rounded-full">
          CONCEPTUAL MODEL
        </span>
        <span className="font-mono text-xs font-semibold text-violet-200">
          NPN (Silicon Model)
        </span>
      </div>

      <div className="my-4 flex flex-col items-center justify-center z-10">
        <div className="relative w-full h-36 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col items-center justify-center">
          <svg viewBox="0 0 120 100" className="w-28 h-24 stroke-white fill-none" strokeWidth="2" strokeLinecap="round">
            <line x1="15" y1="50" x2="45" y2="50" />
            <line x1="45" y1="25" x2="45" y2="75" strokeWidth="3.5" />
            <line x1="45" y1="35" x2="80" y2="15" />
            <line x1="80" y1="15" x2="105" y2="15" />
            <line x1="45" y1="65" x2="80" y2="85" />
            <line x1="80" y1="85" x2="105" y2="85" />
            <polygon points="68,78 78,84 74,74" fill="white" stroke="none" />
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

          <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
            isSaturated
              ? 'bg-amber-400 shadow-[0_0_20px_#F59E0B] scale-110'
              : 'bg-slate-700 opacity-60'
          }`}>
            <span className="text-[10px]">💡</span>
          </div>

          <div className="mt-1 font-mono text-[11px] font-bold tracking-widest uppercase">
            {isSaturated ? (
              <span className="text-amber-300">SATURATED (LOAD ON)</span>
            ) : (
              <span className="text-slate-400">CUTOFF (LOAD OFF)</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 z-10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-violet-100">Base Input:</span>
          <button
            onClick={() => setBaseSwitchOn(!baseSwitchOn)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 ${
              baseSwitchOn
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {baseSwitchOn ? 'V_IN = 5.0V (FORWARD BIASED)' : 'V_IN = 0.0V (CUTOFF)'}
          </button>
        </div>

        <div className="text-[10px] text-violet-200 border-t border-white/10 pt-1 leading-snug">
          V_BE ≈ {vBeApproximation.toFixed(1)}V assumption (Silicon baseline). Actual drop varies with temperature and base drive.
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. DIODE SCHEMATIC & P-N JUNCTION STAGE (Physical Glassmorphic Model)
   ========================================================================= */
const DiodeDiagramStage = ({ visual }) => {
  const [forwardBias, setForwardBias] = useState(true);

  return (
    <div className="glass-panel-warm-interactive rounded-3xl p-5 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between h-full border border-white/15">
      {/* Top Header */}
      <div className="flex items-center justify-between z-10 flex-wrap gap-2">
        <span className="glass-pill-warm px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 text-amber-300 border border-amber-400/30">
          <span>⚡</span> Semiconductor Junction
        </span>
        <span className="text-[10px] font-mono font-bold bg-white/10 text-white/90 px-2 py-0.5 rounded-full border border-white/15">
          PHYSICAL MODEL
        </span>
        <span className="font-mono text-xs font-semibold text-slate-300">
          V_th ≈ 0.7 V (Si)
        </span>
      </div>

      {/* Hero Visual: 3D-like Luminous Crystal Semiconductor Junction */}
      <div className="my-3 z-10 space-y-3">
        <div className="relative rounded-2xl p-4 bg-black/30 backdrop-blur-xl border border-white/15 shadow-inner overflow-hidden">
          {/* Subtle Ambient Refraction Behind the Crystal */}
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-cyan-500/10 pointer-events-none" />
          
          {/* Conduction Status Banner */}
          <div className="flex items-center justify-between text-xs font-semibold mb-3 px-1">
            <span className="flex items-center gap-1.5 text-slate-300 text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${forwardBias ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {forwardBias ? 'Forward Bias (Conducts)' : 'Reverse Bias (Blocks)'}
            </span>
            <span className="font-mono text-[11px] text-amber-300">
              {forwardBias ? 'I_forward ≫ 0 mA' : 'I_leakage ≈ 0 µA'}
            </span>
          </div>

          {/* Dual Crystal Blocks: P-Type (Anode) & N-Type (Cathode) */}
          <div className="relative flex items-center justify-between gap-1.5 h-32 sm:h-36 px-1">
            
            {/* ANODE: P-Type Ruby-Amber Crystal Block */}
            <div className="flex-1 h-full rounded-2xl bg-gradient-to-br from-rose-500/25 via-amber-500/15 to-rose-950/40 border border-rose-400/40 p-2 sm:p-3 flex flex-col justify-between relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_rgba(244,63,94,0.15)] backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono font-bold">
                <span className="text-rose-300">ANODE (+)</span>
                <span className="text-rose-200/80 hidden sm:inline">h+ holes</span>
              </div>

              {/* Glowing Holes (p-carriers) */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 my-auto place-items-center">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-500/40 border border-rose-300/80 text-rose-200 text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                  >
                    +
                  </div>
                ))}
              </div>

              <div className="text-center font-display font-black text-sm sm:text-lg text-rose-200/90 tracking-wider">
                P-TYPE
              </div>
            </div>

            {/* CENTRAL JUNCTION & DEPLETION REGION */}
            <div className={`transition-all duration-300 flex flex-col items-center justify-center relative shrink-0 ${
              forwardBias ? 'w-7 sm:w-10' : 'w-10 sm:w-16'
            }`}>
              {/* Depletion Barrier Layer */}
              <div className={`w-full h-full rounded-xl border border-dashed flex flex-col items-center justify-center text-center transition-all ${
                forwardBias
                  ? 'bg-emerald-500/15 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                  : 'bg-rose-500/25 border-rose-400/70 shadow-[0_0_16px_rgba(244,63,94,0.45)]'
              }`}>
                {forwardBias ? (
                  <div className="space-y-0.5">
                    <span className="text-emerald-300 text-xs font-black animate-pulse">➔</span>
                    <span className="text-[7px] sm:text-[8px] font-mono font-bold text-emerald-300 uppercase block tracking-tighter">
                      FLOW
                    </span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-rose-400 text-xs font-black">✖</span>
                    <span className="text-[7px] sm:text-[8px] font-mono font-bold text-rose-300 uppercase block tracking-tighter">
                      BLOCK
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* CATHODE: N-Type Sapphire-Cyan Crystal Block */}
            <div className="flex-1 h-full rounded-2xl bg-gradient-to-br from-cyan-500/25 via-blue-500/15 to-indigo-950/40 border border-cyan-400/40 p-2 sm:p-3 flex flex-col justify-between relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_rgba(14,165,233,0.15)] backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono font-bold">
                <span className="text-cyan-300">CATHODE (-)</span>
                <span className="text-cyan-200/80 hidden sm:inline">e- electrons</span>
              </div>

              {/* Glowing Electrons (n-carriers) */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 my-auto place-items-center">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-cyan-500/40 border border-cyan-300/80 text-cyan-200 text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(14,165,233,0.6)]"
                  >
                    −
                  </div>
                ))}
              </div>

              <div className="text-center font-display font-black text-sm sm:text-lg text-cyan-200/90 tracking-wider">
                N-TYPE
              </div>
            </div>
          </div>

          {/* Schematic Diode Circuit Leads Representation */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between px-1 sm:px-2 text-[10px] sm:text-[11px] font-mono text-slate-300">
            <span className="text-rose-300 font-bold">Anode (P)</span>
            <div className="flex items-center gap-1 opacity-80">
              <span className="h-0.5 w-3 sm:w-6 bg-slate-400" />
              <DiodeSymbol className="w-8 sm:w-12 h-5 sm:h-6 text-white inline-block" />
              <span className="h-0.5 w-3 sm:w-6 bg-slate-400" />
            </div>
            <span className="text-cyan-300 font-bold">Cathode (N)</span>
          </div>
        </div>
      </div>

      {/* Tactile Bias Switch Controls */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 z-10 flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setForwardBias(true)}
              className={`px-3 py-1.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
                forwardBias
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_2px_12px_rgba(16,185,129,0.4)] border border-white/30'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15 border border-white/10'
              }`}
            >
              Forward Bias (+0.7V)
            </button>
            <button
              onClick={() => setForwardBias(false)}
              className={`px-3 py-1.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
                !forwardBias
                  ? 'bg-gradient-to-r from-rose-500 to-amber-600 text-white shadow-[0_2px_12px_rgba(244,63,94,0.4)] border border-white/30'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15 border border-white/10'
              }`}
            >
              Reverse Bias (-5.0V)
            </button>
          </div>

          <span className="text-[11px] font-mono font-semibold text-amber-200">
            {forwardBias ? 'V_D ≥ 0.7V ➔ Low Resistance' : 'V_D < 0.7V ➔ High Barrier'}
          </span>
        </div>

        <div className="text-[10px] text-slate-400 border-t border-white/10 pt-1 leading-snug">
          Educational Silicon Model: Forward voltage collapses the depletion region, allowing diffusion current to surge exponentially (Shockley equation).
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   5. MEMORY MODEL DIAGRAM STAGE (Stack vs Heap)
   ========================================================================= */
const MemoryDiagramStage = ({ visual }) => {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-full border border-slate-700">
      <div className="flex items-center justify-between z-10 flex-wrap gap-2">
        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
          <span>🧠</span> Virtual Memory Model
        </span>
        <span className="text-[10px] font-mono font-bold bg-slate-300 text-slate-950 px-2 py-0.5 rounded-full">
          CONCEPTUAL ARCHITECTURE
        </span>
        <span className="font-mono text-xs text-slate-300">
          Canonical Process Layout
        </span>
      </div>

      <div className="my-4 z-10 flex items-center justify-center">
        <MemoryModelSymbol className="w-56 h-36" />
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 z-10 flex items-center justify-between text-xs font-mono">
        <span className="text-coral-300">Stack: Auto-freed frames (↓)</span>
        <span className="text-emerald-300">Heap: Dynamic allocation (↑)</span>
      </div>
    </div>
  );
};

/* =========================================================================
   6. CONCURRENCY & CAS DIAGRAM STAGE
   ========================================================================= */
const ConcurrencyDiagramStage = ({ visual }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-full border border-indigo-700">
      <div className="flex items-center justify-between z-10 flex-wrap gap-2">
        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
          <span>🔒</span> Lock-Free Primitive
        </span>
        <span className="text-[10px] font-mono font-bold bg-indigo-300 text-slate-950 px-2 py-0.5 rounded-full">
          CONCEPTUAL PRIMITIVE
        </span>
        <span className="font-mono text-xs text-indigo-200">
          Atomic CAS
        </span>
      </div>

      <div className="my-4 p-4 bg-slate-900/60 rounded-2xl border border-white/15 font-mono text-xs space-y-2 z-10">
        <div className="text-indigo-300 font-bold">{"// Hardware atomic compare-and-swap"}</div>
        <div className="text-slate-200">bool CAS(int* ptr, int oldVal, int newVal)</div>
        <div className="text-emerald-400">if (*ptr == oldVal) &#123; *ptr = newVal; return true; &#125;</div>
        <div className="text-coral-400">return false; // Retry in lock-free loop</div>
      </div>

      <div className="text-[11px] font-mono text-indigo-200 z-10">
        Hardware-level coordination primitive preventing race conditions without OS kernel lock.
      </div>
    </div>
  );
};

/* =========================================================================
   7. GPIO HARDWARE BUFFER STAGE
   ========================================================================= */
const GpioDiagramStage = ({ visual }) => {
  return (
    <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-full">
      <div className="flex items-center justify-between z-10 flex-wrap gap-2">
        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
          <span>⚙️</span> I/O Pin Architecture
        </span>
        <span className="text-[10px] font-mono font-bold bg-amber-200 text-slate-950 px-2 py-0.5 rounded-full">
          CONCEPTUAL ARCHITECTURE
        </span>
        <span className="font-mono text-xs text-amber-100">
          Push-Pull vs Open-Drain
        </span>
      </div>

      <div className="my-4 p-4 bg-slate-900/60 rounded-2xl border border-white/20 font-mono text-xs space-y-2 z-10">
        <div className="flex justify-between text-amber-200 font-bold">
          <span>P-MOS (High side)</span>
          <span>Pulls to V_DD (3.3V)</span>
        </div>
        <div className="h-0.5 bg-white/20" />
        <div className="flex justify-between text-amber-200 font-bold">
          <span>N-MOS (Low side)</span>
          <span>Pulls to GND (0.0V)</span>
        </div>
      </div>

      <div className="text-[11px] font-mono text-amber-100 z-10">
        Input Schmitt trigger provides hysteresis. Exact electrical thresholds depend on MCU datasheet.
      </div>
    </div>
  );
};

/* =========================================================================
   8. CODE TRACE STAGE
   ========================================================================= */
const CodeDiagramStage = ({ visual }) => {
  return (
    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-full border border-slate-700">
      <div className="flex items-center justify-between z-10 flex-wrap gap-2">
        <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
          💻 Code Pipeline
        </span>
        <span className="text-[10px] font-mono font-bold bg-emerald-300 text-slate-950 px-2 py-0.5 rounded-full">
          ILLUSTRATIVE TRACE
        </span>
        <span className="font-mono text-xs text-slate-400">
          Trace Execution
        </span>
      </div>

      <pre className="my-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto z-10 leading-relaxed">
{`def transform(stream):
    result = []
    for item in stream:
        if predicate(item):
            result.append(process(item))
    return result`}
      </pre>

      <div className="text-[11px] font-mono text-slate-400 z-10">
        Deterministic state transition from input stream to accumulator.
      </div>
    </div>
  );
};

export default LearningVisual;
