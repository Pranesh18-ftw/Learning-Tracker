/**
 * AchievementNotification.jsx
 *
 * Upgraded 2.5D Expressive Physical Celebration (Phase 5.C)
 *
 * Sequence:
 * 1. 2.5D Volumetric Trophy emerges on stepped marble/obsidian pedestal.
 * 2. Small original spider-hero character executes a 3-stage celebration sequence:
 *    - Anticipation (0–400ms): vaults into space toward trophy
 *    - Contact (400–1200ms): wraps arms around volumetric trophy in celebratory hug
 *    - Follow-Through (1200–5000ms): victory pose perched on trophy rim with celebratory sparks
 * 3. 100% truthful trigger: unlocks strictly when confirmed by achievement system.
 * 4. Respects prefers-reduced-motion and full keyboard/screen reader accessibility.
 */

import React, { useState, useEffect } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { ACHIEVEMENTS } from '../services/achievementService';
import { X, Sparkles } from 'lucide-react';
import { isReducedMotion } from '../utils/motionTokens';

/**
 * VolumetricTrophySvg
 * 3D-shaded metallic trophy with pedestal, stepped base, and directional specular sheen.
 */
export const VolumetricTrophySvg = ({ size = 80, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[0_8px_18px_rgba(217,119,6,0.35)] ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="trophy-gold-body" x1="20" y1="20" x2="80" y2="70" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="25%" stopColor="#F59E0B" />
        <stop offset="70%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="trophy-cup-interior" x1="50" y1="20" x2="50" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#78350F" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <linearGradient id="trophy-pedestal-sheen" x1="30" y1="75" x2="70" y2="92" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#44403C" />
        <stop offset="50%" stopColor="#1C1917" />
        <stop offset="100%" stopColor="#0C0A09" />
      </linearGradient>
    </defs>

    {/* Ground contact shadow */}
    <ellipse cx="50" cy="94" rx="34" ry="4.5" fill="rgba(0, 0, 0, 0.55)" />

    {/* Radial Celebratory Rays & Sparkle Aura from trophy-burst.svg */}
    <g className="celebration-rays" stroke="#FDE68A" strokeWidth="1" strokeLinecap="round" opacity="0.65">
      <line x1="50" y1="6" x2="50" y2="14" />
      <line x1="78" y1="18" x2="73" y2="23" />
      <line x1="90" y1="45" x2="83" y2="45" />
      <line x1="78" y1="72" x2="73" y2="67" />
      <line x1="22" y1="18" x2="27" y2="23" />
      <line x1="10" y1="45" x2="17" y2="45" />
      <line x1="22" y1="72" x2="27" y2="67" />
    </g>
    <g className="celebration-sparkles" fill="#FDE68A">
      <path d="M 78 12 Q 80 14 82 14 Q 80 14 80 16 Q 80 14 78 14 Q 80 14 78 12 Z" />
      <path d="M 22 14 Q 24 16 26 16 Q 24 16 24 18 Q 24 16 22 16 Q 24 16 22 14 Z" />
    </g>

    {/* Stepped Pedestal Base */}
    <rect x="22" y="86" width="56" height="6" rx="2" fill="url(#trophy-pedestal-sheen)" stroke="#57534E" strokeWidth="0.8" />
    <line x1="24" y1="87" x2="76" y2="87" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.8" />
    <rect x="28" y="78" width="44" height="8" rx="1.5" fill="#262320" stroke="#44403C" strokeWidth="0.8" />
    <rect x="36" y="80.5" width="28" height="3.5" rx="0.8" fill="#F59E0B" />

    {/* Turned Stem & Base Collar */}
    <path
      d="M44 78 L44 68 C44 64 47 61 50 61 C53 61 56 64 56 68 L56 78 Z"
      fill="url(#trophy-gold-body)"
      stroke="#B45309"
      strokeWidth="0.8"
    />
    <ellipse cx="50" cy="62" rx="7" ry="2.5" fill="#F59E0B" stroke="#D97706" strokeWidth="0.8" />

    {/* Swept Twin Handles */}
    <path
      d="M32 30 C20 30 14 42 22 52 C26 56 32 54 36 48"
      fill="none"
      stroke="url(#trophy-gold-body)"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    <path
      d="M32 30 C20 30 14 42 22 52 C26 56 32 54 36 48"
      fill="none"
      stroke="#FDE68A"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.8"
    />
    <path
      d="M68 30 C80 30 86 42 78 52 C74 56 68 54 64 48"
      fill="none"
      stroke="url(#trophy-gold-body)"
      strokeWidth="4.5"
      strokeLinecap="round"
    />

    {/* Flared Volumetric Cup */}
    <ellipse cx="50" cy="26" rx="20" ry="7" fill="url(#trophy-cup-interior)" />
    <path
      d="M30 26 C30 46 40 58 50 58 C60 58 70 46 70 26 Z"
      fill="url(#trophy-gold-body)"
      stroke="#92400E"
      strokeWidth="1"
    />
    <path
      d="M30 26 C30 30 40 33 50 33 C60 33 70 30 70 26"
      stroke="#FEF3C7"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M36 29 C38 42 44 50 49 53"
      stroke="rgba(255, 255, 255, 0.45)"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    {/* Embossed Emblem */}
    <polygon points="50,38 52,43 57,43 53,46 55,51 50,48 45,51 47,46 43,43 48,43" fill="#FFFBEB" opacity="0.9" />
  </svg>
);

/**
 * SpiderHeroCelebrantSvg
 *
 * Original athletic spider-hero figure executing dynamic celebratory animation stages:
 * - 'anticipate': leaping/vaulting toward trophy
 * - 'contact': wrapping arms around trophy in joyful hug
 * - 'victory': perching on trophy rim with arm raised in triumph
 */
export const SpiderHeroCelebrantSvg = ({ stage = 'victory', className = '' }) => {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="spider-suit-blue" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="spider-suit-red" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>

      {stage === 'anticipate' && (
        <g transform="translate(18, 12) rotate(-15)">
          {/* Silk strand anchored above */}
          <line x1="12" y1="-10" x2="12" y2="6" stroke="#FEF3C7" strokeWidth="1.2" strokeDasharray="2 1" />
          {/* Mask / Head */}
          <ellipse cx="12" cy="10" rx="6" ry="7.5" fill="url(#spider-suit-red)" />
          {/* Lens Eyes */}
          <path d="M8 9 Q10 7 11 11 Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="0.6" />
          <path d="M16 9 Q14 7 13 11 Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="0.6" />
          {/* Torso */}
          <path d="M7 16 C7 16 12 18 17 16 L15 28 L9 28 Z" fill="url(#spider-suit-blue)" />
          <path d="M9 16 L12 28 L15 16 Z" fill="url(#spider-suit-red)" />
          {/* Reaching Arms */}
          <path d="M7 17 C2 19 -1 25 2 30" stroke="url(#spider-suit-red)" strokeWidth="3" strokeLinecap="round" />
          <path d="M17 17 C22 19 25 25 22 30" stroke="url(#spider-suit-red)" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {stage === 'contact' && (
        <g transform="translate(14, 10)">
          {/* Head hugging close */}
          <ellipse cx="20" cy="12" rx="6.5" ry="7.5" fill="url(#spider-suit-red)" />
          {/* Expressive Lens Eyes */}
          <path d="M16 11 Q18 9 19 13 Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="0.6" />
          <path d="M24 11 Q22 9 21 13 Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="0.6" />
          {/* Torso */}
          <path d="M14 18 C14 18 20 20 26 18 L24 30 L16 30 Z" fill="url(#spider-suit-blue)" />
          <path d="M17 18 L20 30 L23 18 Z" fill="url(#spider-suit-red)" />
          {/* Embracing Arms (Wrapping around trophy cup) */}
          <path d="M14 19 C6 18 4 30 16 33" stroke="url(#spider-suit-red)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M26 19 C34 18 36 30 24 33" stroke="url(#spider-suit-red)" strokeWidth="3.5" strokeLinecap="round" />
          {/* Legs clinging to stem */}
          <path d="M16 30 C12 36 10 42 16 45" stroke="url(#spider-suit-blue)" strokeWidth="3" strokeLinecap="round" />
          <path d="M24 30 C28 36 30 42 24 45" stroke="url(#spider-suit-blue)" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {stage === 'victory' && (
        <g transform="translate(16, 8)">
          {/* Head tilted upward in celebration */}
          <ellipse cx="16" cy="14" rx="6.5" ry="7.5" fill="url(#spider-suit-red)" />
          <path d="M12 13 Q14 10 15 15 Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="0.6" />
          <path d="M20 13 Q18 10 17 15 Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="0.6" />
          {/* Torso */}
          <path d="M10 20 C10 20 16 22 22 20 L20 32 L12 32 Z" fill="url(#spider-suit-blue)" />
          <path d="M13 20 L16 32 L19 20 Z" fill="url(#spider-suit-red)" />
          {/* Left Arm Resting on Rim */}
          <path d="M10 21 C4 23 3 28 8 32" stroke="url(#spider-suit-red)" strokeWidth="3" strokeLinecap="round" />
          {/* Right Arm Raised in Triumphant Fist */}
          <path d="M22 21 C28 17 31 10 29 4" stroke="url(#spider-suit-red)" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="29" cy="4" r="2.5" fill="#EF4444" />
          {/* Legs firmly balanced */}
          <path d="M12 32 C8 38 7 44 12 46" stroke="url(#spider-suit-blue)" strokeWidth="3" strokeLinecap="round" />
          <path d="M20 32 C23 38 24 44 20 46" stroke="url(#spider-suit-blue)" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};

const AchievementNotification = () => {
  const { newlyUnlocked, clearAchievementNotification } = useRoadmap() || {};
  const reducedMotion = isReducedMotion();
  const [animStage, setAnimStage] = useState('anticipate'); // 'anticipate' | 'contact' | 'victory'

  const activeNotification = newlyUnlocked
    ? (typeof newlyUnlocked === 'string'
        ? ACHIEVEMENTS.find(a => a.id === newlyUnlocked)
        : (Array.isArray(newlyUnlocked)
            ? (typeof newlyUnlocked[0] === 'string' ? ACHIEVEMENTS.find(a => a.id === newlyUnlocked[0]) : newlyUnlocked[0])
            : newlyUnlocked))
    : null;

  useEffect(() => {
    if (!activeNotification) return;

    if (reducedMotion) {
      setAnimStage('victory');
    } else {
      setAnimStage('anticipate');
      const t1 = setTimeout(() => setAnimStage('contact'), 450);
      const t2 = setTimeout(() => setAnimStage('victory'), 1250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [activeNotification, reducedMotion]);

  useEffect(() => {
    if (activeNotification) {
      const timer = setTimeout(() => {
        clearAchievementNotification && clearAchievementNotification(activeNotification.id);
      }, 6500);

      return () => clearTimeout(timer);
    }
  }, [activeNotification, clearAchievementNotification]);

  if (!activeNotification) return null;

  return (
    <div
      className="fixed top-6 right-6 z-50 select-none max-w-md w-[calc(100vw-3rem)] anim-curtain-reveal"
      role="alert"
      aria-live="assertive"
    >
      {/* 2.5D Layered Notification Card */}
      <div className="tile-tactile rounded-3xl p-5 border border-amber-400/50 shadow-[0_24px_60px_rgba(0,0,0,0.65)] relative overflow-hidden backdrop-blur-2xl">
        {/* Subtle top directional specular sheen */}
        <div
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="flex items-start gap-4">
          {/* Left: Volumetric Trophy with Celebrant Character */}
          <div className="relative shrink-0 w-20 h-20 flex items-center justify-center">
            {/* Volumetric Trophy */}
            <VolumetricTrophySvg size={74} />

            {/* Spider Hero Celebrant Overlay */}
            {!reducedMotion && (
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center transition-all duration-300"
                style={{
                  transform:
                    animStage === 'anticipate'
                      ? 'translate(10px, -18px) scale(0.9)'
                      : animStage === 'contact'
                        ? 'translate(-4px, -8px) scale(1)'
                        : 'translate(14px, -14px) scale(0.95)'
                }}
              >
                <SpiderHeroCelebrantSvg stage={animStage} />
              </div>
            )}
          </div>

          {/* Right: Achievement Content */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="glass-pill-warm bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-400/40 flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-400 fill-current" />
                Physical Milestone Unlocked
              </span>
            </div>

            <h3 className="font-display font-black text-base sm:text-lg text-white truncate">
              {activeNotification.name || activeNotification.title}
            </h3>

            <p className="text-xs text-slate-200 line-clamp-2 mt-0.5">
              {activeNotification.description}
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => clearAchievementNotification && clearAchievementNotification(activeNotification.id)}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors shrink-0"
            aria-label="Dismiss achievement notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tactile Timer Gauge */}
        <div className="mt-4 w-full bg-stone-200 dark:bg-stone-800 rounded-full h-1 overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all"
            style={{
              animation: 'shrink 6.5s linear forwards'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default AchievementNotification;
