/**
 * TemporalInstrumentTimer.jsx
 *
 * Cinematic Temporal Instrument Timer for Focus Space (Phase 5.A)
 *
 * Architecture (5 Distinct Physical Layers):
 * 1. Deep Recessed Outer Bezel: Machined dark casing with radial calibration ticks (0–60m).
 * 2. Concentric Chrono Ring: Brushed metallic orbital ring showing exact progress arc.
 * 3. Core Recessed Dial: Monospaced digital readout, state readout, and micro-texture.
 * 4. Sweeping Precision Needle: Physical indicator hand tracking elapsed time.
 * 5. Directional Glass Lens Arc: Top-left specular glare reflection giving convex lens depth.
 *
 * Driven 100% by the real wall-clock Focus timer; zero artificial clock drift.
 */

import React, { useMemo, useId } from 'react';
import { isReducedMotion } from '../utils/motionTokens';

export default function TemporalInstrumentTimer({
  timeLeftSeconds,
  remainingSeconds,
  targetMinutes,
  durationSeconds,
  isPaused,
  isRunning,
  status = 'ready',
  label = 'Temporal Focus Instrument',
  className = ''
}) {
  const id = useId();
  const dialFillId = `${id}-dial-fill`;
  const progressGradId = `${id}-progress`;
  const reducedMotion = isReducedMotion();

  // Harmonize props from both codebase conventions and starter kit conventions
  const effectiveTargetMinutes = targetMinutes !== undefined
    ? targetMinutes
    : (durationSeconds !== undefined ? Math.max(1, Math.round(durationSeconds / 60)) : 25);

  const effectiveDuration = durationSeconds !== undefined
    ? Math.max(1, Number(durationSeconds) || 1)
    : (effectiveTargetMinutes * 60);

  const effectiveRemaining = remainingSeconds !== undefined
    ? Math.max(0, Math.floor(Number(remainingSeconds) || 0))
    : (timeLeftSeconds !== undefined ? Math.max(0, Math.floor(Number(timeLeftSeconds) || 0)) : 1500);

  const effectivePaused = isPaused !== undefined
    ? isPaused
    : (isRunning !== undefined ? !isRunning : false);

  const progressRatio = Math.max(0, Math.min(1, 1 - (effectiveRemaining / effectiveDuration)));

  // Calculate needle and orbital rotation angles (0 to 360 deg)
  const needleAngle = progressRatio * 360;

  // Format MM:SS
  const mins = Math.floor(effectiveRemaining / 60);
  const secs = effectiveRemaining % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // SVG dimensions
  const size = 260;
  const center = size / 2;
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  // Generate 60 radial tick marks
  const tickMarks = useMemo(() => {
    const marks = [];
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6 * Math.PI) / 180;
      const isMajor = i % 5 === 0;
      const isQuarter = i % 15 === 0;
      const len = isQuarter ? 10 : isMajor ? 6 : 3;
      const outerR = radius + 14;
      const innerR = outerR - len;

      const x1 = center + innerR * Math.cos(angle);
      const y1 = center + innerR * Math.sin(angle);
      const x2 = center + outerR * Math.cos(angle);
      const y2 = center + outerR * Math.sin(angle);

      marks.push({
        id: i,
        x1,
        y1,
        x2,
        y2,
        isMajor,
        isQuarter
      });
    }
    return marks;
  }, [center, radius]);

  const stateLabel = effectivePaused
    ? 'TEMPORAL LATCH ENGAGED · PAUSED'
    : status === 'running' || isRunning
      ? 'ACTIVE TEMPORAL CONTAINER'
      : 'STANDBY · READY TO CALIBRATE';

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      style={{ perspective: 1000 }}
      role="region"
      aria-label={label}
    >
      {/* ── 2.5D RECESSED CASING & INSTRUMENT HOUSING ── */}
      <div
        aria-hidden="true"
        className="relative w-68 h-68 sm:w-74 sm:h-74 rounded-full flex items-center justify-center p-3 transition-transform duration-300"
        style={{
          background: 'radial-gradient(circle at 35% 25%, #262320 0%, #141210 70%, #0a0908 100%)',
          boxShadow: `
            0 20px 50px -10px rgba(0, 0, 0, 0.8),
            0 8px 20px -5px rgba(0, 0, 0, 0.6),
            inset 0 3px 6px rgba(255, 255, 255, 0.12),
            inset 0 -4px 10px rgba(0, 0, 0, 0.9)
          `,
          border: '3px solid #38332E',
          transform: effectivePaused ? 'scale(0.985) translateZ(-8px)' : 'scale(1) translateZ(0)'
        }}
      >
        {/* Layer 1: Radial Calibration Dial SVG */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <radialGradient id={dialFillId} cx="35%" cy="25%" r="80%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#0F172A" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0B0D12" stopOpacity="1" />
            </radialGradient>
            <linearGradient id={progressGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={effectivePaused ? '#64748B' : '#38BDF8'} />
              <stop offset="100%" stopColor={effectivePaused ? '#475569' : '#FFFFFF'} />
            </linearGradient>
          </defs>

          {/* Subtle outer metallic rim */}
          <circle
            cx={center}
            cy={center}
            r={radius + 18}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1.5"
          />

          {/* 60 Minute Tick Marks */}
          {tickMarks.map((tick) => (
            <line
              key={tick.id}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={tick.isQuarter ? '#FFFFFF' : tick.isMajor ? '#94A3B8' : '#334155'}
              strokeWidth={tick.isQuarter ? 2 : tick.isMajor ? 1.5 : 1}
              strokeLinecap="round"
            />
          ))}

          {/* Background Groove Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#0F172A"
            strokeWidth="8"
            className="drop-shadow-xs"
          />

          {/* Layer 2: Illuminated Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${progressGradId})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-all duration-500 ease-linear"
            style={{
              filter: effectivePaused ? 'none' : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))'
            }}
          />

          {/* Inner Recessed Stepped Bezel */}
          <circle
            cx={center}
            cy={center}
            r={radius - 12}
            fill={`url(#${dialFillId})`}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="2"
          />
          <circle
            cx={center}
            cy={center}
            r={radius - 24}
            fill="none"
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Horological Escapement Sub-Dial Layer (Active Mechanical Heartbeat) */}
          <g
            className="pointer-events-none transition-opacity duration-300"
            opacity={effectivePaused ? 0.22 : 0.6}
            transform={`translate(${center - 28}, ${center - 28}) scale(0.35)`}
            aria-hidden="true"
          >
            {/* Escapement Wheel: rotates smoothly when active, halts when paused */}
            <g
              style={{
                transformOrigin: '80px 80px',
                animation: !reducedMotion && (status === 'running' || isRunning) && !effectivePaused
                  ? 'spin 12s linear infinite'
                  : 'none'
              }}
            >
              <circle cx="80" cy="80" r="42" stroke="#df8759" strokeWidth="2.5" fill="none" opacity="0.8" />
              <line x1="80" y1="38" x2="80" y2="122" stroke="#df8759" strokeWidth="1.8" opacity="0.7" />
              <line x1="38" y1="80" x2="122" y2="80" stroke="#df8759" strokeWidth="1.8" opacity="0.7" />
              <path
                d="M 80 34 L 83 25 L 87 27 L 85 35 M 103 40 L 110 33 L 114 36 L 109 43 M 120 57 L 128 53 L 131 58 L 124 63 M 126 80 L 135 80 L 136 85 L 126 84 M 120 103 L 128 107 L 126 112 L 117 107 M 103 120 L 109 127 L 105 131 L 99 123 M 80 126 L 81 135 L 76 135 L 77 126 M 57 120 L 51 127 L 47 123 L 53 117 M 40 103 L 32 107 L 30 102 L 38 98 M 34 80 L 25 80 L 25 75 L 34 76 M 40 57 L 33 50 L 37 47 L 44 53 M 57 40 L 52 32 L 57 29 L 63 37"
                fill="#df8759"
                opacity="0.85"
              />
            </g>
            {/* Oscillating Balance Hairspring */}
            <g
              style={{
                transformOrigin: '80px 80px',
                animation: !reducedMotion && (status === 'running' || isRunning) && !effectivePaused
                  ? 'pulse 1s ease-in-out infinite'
                  : 'none'
              }}
            >
              <path
                d="M 80 80 A 2.5 2.5 0 0 1 82.5 77.5 A 5 5 0 0 1 85 82.5 A 7.5 7.5 0 0 1 77.5 87.5 A 10 10 0 0 1 70 80 A 13 13 0 0 1 80 67 A 16 16 0 0 1 96 80 A 20 20 0 0 1 80 100 A 24 24 0 0 1 56 80"
                fill="none"
                stroke="#82b8d0"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.9"
              />
            </g>
          </g>

          {/* Layer 4: Sweeping Needle Indicator */}
          {!reducedMotion && (
            <g
              transform={`rotate(${needleAngle - 90} ${center} ${center})`}
              className="transition-transform duration-500 ease-linear"
            >
              {/* Counter-weight teardrop */}
              <circle cx={center - 18} cy={center} r="4" fill="#64748B" />
              {/* Needle Body */}
              <line
                x1={center - 18}
                y1={center}
                x2={center + radius - 4}
                y2={center}
                stroke={effectivePaused ? '#64748B' : '#FFFFFF'}
                strokeWidth="2.5"
                strokeLinecap="round"
                className="drop-shadow-sm"
              />
              {/* Illuminated Needle Tip */}
              <circle
                cx={center + radius - 4}
                cy={center}
                r="3"
                fill={effectivePaused ? '#A8A29E' : '#FEF3C7'}
                className={effectivePaused ? '' : 'animate-pulse'}
              />
            </g>
          )}

          {/* Center Pivot Jewel / Screw */}
          <circle cx={center} cy={center} r="9" fill="#292524" stroke="#44403C" strokeWidth="1.5" />
          <circle cx={center} cy={center} r="4" fill={effectivePaused ? '#78716C' : '#df8759'} />
        </svg>

        {/* Layer 3: Central High-Legibility Chronometer Readout */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-1">
          <span
            className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-warmwhite drop-shadow-md"
            style={{
              textShadow: effectivePaused ? 'none' : '0 0 12px rgba(223, 135, 89, 0.25)'
            }}
          >
            {formattedTime}
          </span>

          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
            {effectiveTargetMinutes}m Container
          </span>
        </div>

        {/* Layer 5: Convex Glass Lens Specular Glare Arc */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 30%, transparent 60%)',
            boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.2)'
          }}
          aria-hidden="true"
        />
      </div>

      {/* Temporal State Calibration Indicator */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            effectivePaused
              ? 'bg-stone-500'
              : status === 'running' || isRunning
                ? 'bg-amber-500 animate-ping'
                : 'bg-emerald-500'
          }`}
        />
        <span className="text-[11px] font-mono font-extrabold tracking-wider uppercase text-stone-400">
          {stateLabel}
        </span>
      </div>
    </div>
  );
}
