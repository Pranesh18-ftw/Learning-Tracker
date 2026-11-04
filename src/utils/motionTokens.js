import { useState, useEffect, useRef } from 'react';

/**
 * motionTokens.js
 *
 * Engineering Workbench Shared Motion System
 * Unified tokens for duration, easing, transitions, and accessibility.
 * Presentation-only: never alters underlying business logic or domain models.
 */

export const MOTION_DURATIONS = {
  instant: 150,       // Micro-interactions, press feedback (ms)
  menu: 280,          // Menu unfold / fold (220–350ms window)
  modal: 240,         // Modal / dialog transitions (ms)
  dashboardStagger: 80,// Step between dashboard staggered items (ms)
  dashboardTotal: 950, // Dashboard entrance total (800–1100ms window)
  scanPulse: 1800,    // Camera / sensor radar sweep cycle (ms)
  successDraw: 400    // Verification checkmark draw (ms)
};

export const MOTION_EASINGS = {
  // Fluid curtain unfold: spring-like deceleration without artificial bounce
  curtain: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // Tactile press & mechanical switch response
  tactile: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
  // Standard UI transition
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  // Natural decay for release / rebound
  decay: 'cubic-bezier(0, 0, 0.2, 1)'
};

/**
 * Safely inspects prefers-reduced-motion in any environment (including jsdom).
 * @returns {boolean}
 */
export const isReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/**
 * Custom hook to animate a numerical value only when data actually changes.
 * Preserves stable numeric presentation and respects reduced motion.
 */
export const useAnimatedNumber = (targetValue, duration = 600) => {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const prevTargetRef = useRef(targetValue);
  const frameRef = useRef(null);

  useEffect(() => {
    // If value has not changed, don't run animation
    if (prevTargetRef.current === targetValue) {
      return;
    }

    const startVal = Number(prevTargetRef.current) || 0;
    const endVal = Number(targetValue) || 0;
    prevTargetRef.current = targetValue;

    // Immediately update if reduced-motion is requested or running in non-browser
    if (isReducedMotion() || typeof window === 'undefined') {
      setDisplayValue(endVal);
      return;
    }

    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quartic for rapid scientific instrument dial settling
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startVal + (endVal - startVal) * ease);

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetValue, duration]);

  return displayValue;
};
