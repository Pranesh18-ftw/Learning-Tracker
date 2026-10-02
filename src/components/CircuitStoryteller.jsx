import React, { useState } from 'react';
import { BjtTransistorSymbol } from './STEMVisuals';

/**
 * CircuitStoryteller
 * Interactive sequence & laboratory instrument that allows the learner
 * to step through or scrub the physical mechanics of a circuit.
 * Directly fulfills Section 7: "Use scroll/scrub as a storytelling tool".
 */
const SEQUENCE_STEPS = [
  {
    step: '01',
    phase: 'GEOMETRY',
    title: 'Semiconductor Boundary',
    caption: 'Two P-N junctions back-to-back: Emitter (N), Base (P, ultra-thin), Collector (N). Depletion region blocks charge flow without forward bias.',
    formula: 'V_BE < 0.7V (Silicon)',
    state: 'cutoff',
    vin: 0.2,
    rb: 10
  },
  {
    step: '02',
    phase: 'EXCITATION',
    title: 'Forward Bias Overcomes Potential Barrier',
    caption: 'Base-Emitter voltage reaches 0.7V. The depletion barrier collapses; electrons from the heavily-doped emitter flood into the thin base layer.',
    formula: 'V_BE = 0.70V threshold',
    state: 'active',
    vin: 0.75,
    rb: 10
  },
  {
    step: '03',
    phase: 'DIFFUSION',
    title: 'Ohm\'s Law Governs Base Current',
    caption: 'Current through the base resistor is governed by Ohm\'s Law: I_B = (V_in - 0.7V) / R_B. Because the base is physically paper-thin, 99% of electrons shoot straight through into the collector.',
    formula: 'I_B = (V_in - 0.7) / R_B',
    state: 'active',
    vin: 2.0,
    rb: 10
  },
  {
    step: '04',
    phase: 'SATURATION',
    title: 'Collector-Emitter Switch Closes',
    caption: 'Sufficient base current drives the transistor into complete saturation. V_CE drops to ~0.2V and maximum collector current flows through the load.',
    formula: 'V_CE ≈ 0.2V · I_C ≈ V_CC / R_L',
    state: 'saturated',
    vin: 3.3,
    rb: 10
  },
  {
    step: '05',
    phase: 'PREDICTION CHALLENGE',
    title: 'Active Prediction: What if R_B doubles?',
    caption: 'If base resistance R_B doubles from 10kΩ to 20kΩ, predict the impact on saturation margin. Use the live scrub instrument below to verify your mental model.',
    formula: 'Δ I_B = -50% → check if I_C remains saturated',
    state: 'saturated',
    vin: 5.0,
    rb: 20
  }
];

const CircuitStoryteller = () => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isLabOpen, setIsLabOpen] = useState(false);

  // Live interactive controls for step 5 or interactive mode
  const [inputVoltage, setInputVoltage] = useState(3.3);
  const [baseResistance, setBaseResistance] = useState(10); // kOhms

  const activeStep = SEQUENCE_STEPS[currentStepIdx];

  // Calculate live circuit metrics
  const vBeThreshold = 0.7;
  const vInEffective = Math.max(0, inputVoltage - vBeThreshold);
  const baseCurrentMicroAmps = inputVoltage > vBeThreshold 
    ? Math.round((vInEffective / (baseResistance * 1000)) * 1000000) 
    : 0;
  
  // Beta / hFE approx 100, Load = 1k, Vcc = 5V
  const maxIcMilliAmps = (5.0 - 0.2) / 1.0; // ~4.8 mA in saturation
  const unsaturatedIc = (baseCurrentMicroAmps * 100) / 1000;
  const actualIcMilliAmps = Math.min(maxIcMilliAmps, unsaturatedIc).toFixed(2);
  
  const liveState = inputVoltage < 0.7 
    ? 'cutoff' 
    : actualIcMilliAmps >= maxIcMilliAmps 
      ? 'saturated' 
      : 'active';

  return (
    <section className="anim-enter border-t border-[#D8D2C7] dark:border-[#2C2B27] pt-8 space-y-6">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F] flex items-center gap-2">
            <span>interactive sequence</span>
            <span className="text-[#D8D2C7] dark:text-[#2C2B27]">·</span>
            <span className="text-[#B84F2B]">storytelling instrument</span>
          </span>
          <h3 className="font-serif text-xl sm:text-2xl text-[#1C1C1A] dark:text-[#F4F0E7]">
            Physical Circuit Assembly
          </h3>
        </div>

        <button
          onClick={() => setIsLabOpen(!isLabOpen)}
          className="action-text text-xs font-mono text-[#B84F2B] pb-0.5 flex items-center gap-1.5"
        >
          {isLabOpen ? '[ collapse instrument ]' : '[ expand interactive lab ]'}
        </button>
      </div>

      {isLabOpen && (
        <div className="anim-enter-subtle space-y-6">
          {/* Step Timeline Track */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 border-b border-[#D8D2C7] dark:border-[#2C2B27] pb-4">
            {SEQUENCE_STEPS.map((s, idx) => {
              const isSelected = idx === currentStepIdx;
              return (
                <button
                  key={s.step}
                  onClick={() => setCurrentStepIdx(idx)}
                  className={`text-left p-2 border transition-all ${
                    isSelected
                      ? 'border-[#1C1C1A] dark:border-[#F4F0E7] bg-[#FAF8F3] dark:bg-[#1E1E1B] ring-1 ring-[#1C1C1A] dark:ring-[#F4F0E7]'
                      : 'border-[#D8D2C7] dark:border-[#2C2B27] opacity-60 hover:opacity-100 hover:border-[#74716A]'
                  }`}
                >
                  <div className="font-mono text-[9px] text-[#74716A] dark:text-[#9C988F] mb-0.5">
                    {s.step}
                  </div>
                  <div className="font-sans text-[11px] text-[#1C1C1A] dark:text-[#F4F0E7] font-medium truncate">
                    {s.phase}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Story Step Narrative */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-[#FAF8F3] dark:bg-[#1E1E1B] border border-[#D8D2C7] dark:border-[#2C2B27] p-5">
            {/* Step Explanation */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-3 font-mono text-[10px] text-[#74716A] dark:text-[#9C988F]">
                <span className="uppercase tracking-widest text-[#B84F2B]">
                  ACT {activeStep.step} / 05
                </span>
                <span>·</span>
                <span>{activeStep.phase}</span>
              </div>

              <h4 className="font-serif text-lg sm:text-xl text-[#1C1C1A] dark:text-[#F4F0E7]">
                {activeStep.title}
              </h4>

              <p className="font-sans text-xs sm:text-sm text-[#74716A] dark:text-[#9C988F] leading-relaxed">
                {activeStep.caption}
              </p>

              <div className="pt-2">
                <span className="font-mono text-xs text-[#1C1C1A] dark:text-[#F4F0E7] px-2.5 py-1 bg-white/60 dark:bg-black/40 border border-[#D8D2C7] dark:border-[#2C2B27] inline-block">
                  {activeStep.formula}
                </span>
              </div>
            </div>

            {/* Micro Schematic Reaction */}
            <div className="p-4 border border-[#D8D2C7]/60 dark:border-[#2C2B27]/60 flex flex-col items-center justify-center text-center space-y-2 bg-white/40 dark:bg-black/20">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F]">
                Conduction State
              </span>
              <BjtTransistorSymbol state={activeStep.state} className="w-28 h-20" />
              <span className="font-mono text-[10px] text-[#B84F2B] uppercase">
                {activeStep.state}
              </span>
            </div>
          </div>

          {/* ── LIVE INTERACTIVE SCRUBBER (The Learner Probes the Physics) ── */}
          <div className="p-5 border border-[#1C1C1A] dark:border-[#F4F0E7] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D2C7] dark:border-[#2C2B27] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#B84F2B] block">
                  empirical probe
                </span>
                <h4 className="font-serif text-base text-[#1C1C1A] dark:text-[#F4F0E7]">
                  Scrub Parameters & Observe State
                </h4>
              </div>

              <div className="font-mono text-xs flex items-center gap-3">
                <span className="text-[#74716A] dark:text-[#9C988F]">State:</span>
                <span className={`font-bold uppercase ${liveState === 'saturated' ? 'text-[#B84F2B]' : liveState === 'active' ? 'text-[#2F7558]' : 'text-[#74716A]'}`}>
                  {liveState}
                </span>
              </div>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Voltage Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono text-xs text-[#74716A] dark:text-[#9C988F]">
                  <span>Base Input Voltage (V_in):</span>
                  <span className="text-[#1C1C1A] dark:text-[#F4F0E7] font-medium">{inputVoltage.toFixed(1)} V</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="5.0"
                  step="0.1"
                  value={inputVoltage}
                  data-cursor="drag"
                  onChange={(e) => setInputVoltage(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#D8D2C7] dark:bg-[#2C2B27] rounded-none appearance-none cursor-ew-resize accent-[#1C1C1A] dark:accent-[#F4F0E7]"
                />
                <div className="flex justify-between font-mono text-[9px] text-[#74716A] dark:text-[#9C988F]">
                  <span>0V (Off)</span>
                  <span>0.7V (Threshold)</span>
                  <span>5V (High)</span>
                </div>
              </div>

              {/* Resistance Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono text-xs text-[#74716A] dark:text-[#9C988F]">
                  <span>Base Resistor (R_B):</span>
                  <span className="text-[#1C1C1A] dark:text-[#F4F0E7] font-medium">{baseResistance} kΩ</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={baseResistance}
                  data-cursor="drag"
                  onChange={(e) => setBaseResistance(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-[#D8D2C7] dark:bg-[#2C2B27] rounded-none appearance-none cursor-ew-resize accent-[#1C1C1A] dark:accent-[#F4F0E7]"
                />
                <div className="flex justify-between font-mono text-[9px] text-[#74716A] dark:text-[#9C988F]">
                  <span>1 kΩ (Low R)</span>
                  <span>10 kΩ (Standard)</span>
                  <span>50 kΩ (High R)</span>
                </div>
              </div>
            </div>

            {/* Calculated Output Instruments */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#D8D2C7]/60 dark:border-[#2C2B27]/60 text-center font-mono">
              <div className="p-2 border border-[#D8D2C7]/40 dark:border-[#2C2B27]/40 bg-white/40 dark:bg-black/20">
                <span className="text-[9px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F] block mb-0.5">
                  I_Base
                </span>
                <span className="text-sm font-medium text-[#1C1C1A] dark:text-[#F4F0E7]">
                  {baseCurrentMicroAmps} µA
                </span>
              </div>

              <div className="p-2 border border-[#D8D2C7]/40 dark:border-[#2C2B27]/40 bg-white/40 dark:bg-black/20">
                <span className="text-[9px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F] block mb-0.5">
                  I_Collector
                </span>
                <span className="text-sm font-medium text-[#B84F2B]">
                  {actualIcMilliAmps} mA
                </span>
              </div>

              <div className="p-2 border border-[#D8D2C7]/40 dark:border-[#2C2B27]/40 bg-white/40 dark:bg-black/20">
                <span className="text-[9px] uppercase tracking-wider text-[#74716A] dark:text-[#9C988F] block mb-0.5">
                  Load Lamp
                </span>
                <span className={`text-sm font-medium ${liveState === 'saturated' ? 'text-[#2F7558]' : 'text-[#74716A]'}`}>
                  {liveState === 'saturated' ? '100% ILLUMINATED' : liveState === 'active' ? 'DIM GLOW' : 'DARK'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CircuitStoryteller;
