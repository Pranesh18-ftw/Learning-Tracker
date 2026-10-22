/**
 * IdentityResourceInventory.jsx
 *
 * Second Section: RESOURCE INVENTORY — "WHAT DO YOU HAVE?"
 * Tactile resource objects rather than boring checkboxes.
 *
 * Supports:
 * - Hardware: Laptop, ESP32, Arduino, STM32, Raspberry Pi, Multimeter, Oscilloscope, Soldering Iron, Breadboard.
 * - "Hardware: None" is a completely valid, respected state (Simulation route).
 * - Software: VS Code, Python, MATLAB, LTspice, KiCad, CAD.
 * - Access: College lab, Library, Makerspace, Shared lab, Home workspace, No dedicated workspace.
 * - Internet: Reliable, Limited, Mostly mobile data, Offline often.
 */

import React, { useState } from 'react';
import { Cpu, Code, Building, Wifi, Plus, Check, ShieldAlert } from 'lucide-react';

const HARDWARE_PRESETS = [
  'Laptop',
  'ESP32',
  'Arduino',
  'STM32',
  'Raspberry Pi',
  'Multimeter',
  'Oscilloscope',
  'Soldering Iron',
  'Breadboard',
  'Function Generator',
  'Logic Analyzer'
];

const SOFTWARE_PRESETS = [
  'VS Code',
  'Python',
  'MATLAB',
  'LTspice',
  'KiCad',
  'CAD / FreeCAD',
  'GCC / GDB',
  'PlatformIO'
];

const ACCESS_PRESETS = [
  'Home workspace',
  'College lab',
  'Library',
  'Makerspace',
  'Shared lab',
  'No dedicated workspace'
];

const INTERNET_OPTIONS = [
  { id: 'Reliable', label: 'Reliable High-Speed', note: 'Can stream simulations & heavy packages' },
  { id: 'Limited', label: 'Metered / Limited', note: 'Prefer lightweight offline tools' },
  { id: 'Mostly mobile data', label: 'Mostly Mobile Data', note: 'Minimize unnecessary downloads' },
  { id: 'Offline often', label: 'Offline Often', note: 'Route prioritizes standalone documentation' }
];

const IdentityResourceInventory = ({
  resources = {},
  onUpdateResources
}) => {
  const hardware = resources.hardware || [];
  const software = resources.software || [];
  const access = resources.access || [];
  const internet = resources.internet || 'Reliable';

  const [customHW, setCustomHW] = useState('');
  const [showCustomHWInput, setShowCustomHWInput] = useState(false);

  // Toggle item in an array
  const toggleArrayItem = (key, item) => {
    const current = resources[key] || [];
    const exists = current.includes(item);
    const updated = exists ? current.filter(x => x !== item) : [...current, item];
    onUpdateResources({
      ...resources,
      [key]: updated
    });
  };

  // Toggle pure simulation mode (Hardware: None)
  const handleToggleSimulationOnly = () => {
    if (hardware.length === 0) {
      // Restore standard basic kit
      onUpdateResources({
        ...resources,
        hardware: ['Laptop', 'ESP32', 'Breadboard']
      });
    } else {
      // Clear all hardware -> None
      onUpdateResources({
        ...resources,
        hardware: []
      });
    }
  };

  const handleAddCustomHW = () => {
    if (!customHW.trim()) return;
    if (!hardware.includes(customHW.trim())) {
      onUpdateResources({
        ...resources,
        hardware: [...hardware, customHW.trim()]
      });
    }
    setCustomHW('');
    setShowCustomHWInput(false);
  };

  const handleSelectInternet = (optId) => {
    onUpdateResources({
      ...resources,
      internet: optId
    });
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Section 02 · Reality Inventory
            </span>
            <h2 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
              What do you actually have?
            </h2>
          </div>
        </div>

        {/* Simulation Only Quick Toggle */}
        <button
          onClick={handleToggleSimulationOnly}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            hardware.length === 0
              ? 'bg-amber-500/20 border-amber-400 text-amber-700 dark:text-amber-300'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {hardware.length === 0 ? '✓ Simulation Only Active' : 'Switch to Simulation Only'}
        </button>
      </div>

      {/* ── 1. HARDWARE INVENTORY ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Hardware & Equipment:
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({hardware.length} selected)
            </span>
          </div>

          <button
            onClick={() => setShowCustomHWInput(!showCustomHWInput)}
            className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add Tool</span>
          </button>
        </div>

        {/* Tactile Hardware Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 min-w-0">
          {HARDWARE_PRESETS.map((item) => {
            const hasItem = hardware.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleArrayItem('hardware', item)}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between group min-w-0 ${
                  hasItem
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600/70 text-amber-900 dark:text-amber-100 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-mono font-bold tracking-tight truncate mr-1">
                  {item}
                </span>
                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-black transition-colors shrink-0 ${
                  hasItem
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 group-hover:bg-slate-300'
                }`}>
                  {hasItem ? '✓' : '+'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Hardware input form */}
        {showCustomHWInput && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={customHW}
              onChange={(e) => setCustomHW(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomHW();
                }
              }}
              placeholder="e.g. Logic Analyzer, CAN Transceiver..."
              className="text-xs font-mono px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white flex-1 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddCustomHW}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-bold"
            >
              Add
            </button>
          </div>
        )}

        {/* Simulation Only Reassuring Banner */}
        {hardware.length === 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-400/40 text-xs font-mono text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">No resources added. The system can still work around this.</span>
              <p className="text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                Hardware: None (Pure Simulation Route Active). The Path and Now challenge engines will automatically adapt to use SPICE simulation, LTspice modeling, and waveform analysis instead of assuming physical bench instruments.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. SOFTWARE TOOLS ── */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-electric-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Software Environments Installed:
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {SOFTWARE_PRESETS.map((sw) => {
            const hasSW = software.includes(sw);
            return (
              <button
                key={sw}
                type="button"
                onClick={() => toggleArrayItem('software', sw)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  hasSW
                    ? 'bg-electric-50 dark:bg-electric-950/30 border-electric-400 dark:border-electric-600 text-electric-900 dark:text-electric-100 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span>{hasSW ? '✓' : '+'}</span>
                <span>{sw}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. WORKSPACE & LAB ACCESS ── */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Building className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Physical Access & Bench Availability:
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-w-0">
          {ACCESS_PRESETS.map((acc) => {
            const hasAcc = access.includes(acc);
            return (
              <button
                key={acc}
                type="button"
                onClick={() => toggleArrayItem('access', acc)}
                className={`p-2.5 rounded-xl border text-xs font-mono text-left transition-all flex items-center justify-between min-w-0 ${
                  hasAcc
                    ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-400 dark:border-violet-600 text-violet-900 dark:text-violet-100 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="truncate mr-1">{acc}</span>
                <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold shrink-0 ${
                  hasAcc ? 'bg-violet-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}>
                  {hasAcc ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. INTERNET REALITY ── */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Internet Connectivity Reality:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INTERNET_OPTIONS.map((opt) => {
            const isSelected = internet === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectInternet(opt.id)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100 font-bold shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div className="text-[11px] font-sans text-slate-500 dark:text-slate-400 mt-0.5">
                  {opt.note}
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </section>
  );
};

export default IdentityResourceInventory;
