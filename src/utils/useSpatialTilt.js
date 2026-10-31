/**
 * useSpatialTilt.js
 *
 * 2.5D Controlled Spatial Perspective & Dynamic Lighting Hook
 *
 * Requirements:
 * - Tilts panel gently toward cursor (max 2–3 degrees).
 * - Shifts subtle specular light field across the surface.
 * - Smooth spring-damped return to resting state on pointer leave.
 * - Throttled with requestAnimationFrame for 60fps performance without layout thrashing.
 * - Completely skips pointer tracking for prefers-reduced-motion users and touch devices.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { isReducedMotion } from './motionTokens';

export function useSpatialTilt(options = {}) {
  const {
    maxTilt = 2.5,
    perspective = 1000,
    glare = true
  } = options;

  const elementRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
    glareStyle: { opacity: 0 }
  });

  const rafIdRef = useRef(null);
  const isReduced = isReducedMotion();
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const handlePointerMove = useCallback((e) => {
    if (isReduced || isTouchDevice || !elementRef.current) return;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (!elementRef.current) return;
      const rect = elementRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const clientX = e.clientX;
      const clientY = e.clientY;

      // Normalized coordinates from center: -1 to +1
      const normX = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1));
      const normY = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1));

      // 2.5D rotation: tilting toward cursor
      const rotY = normX * maxTilt;
      const rotX = -normY * maxTilt;

      // Specular sheen coordinate percentage
      const glareX = ((normX + 1) / 2) * 100;
      const glareY = ((normY + 1) / 2) * 100;

      setTransformStyle({
        transform: `perspective(${perspective}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`,
        glareStyle: glare ? {
          opacity: 0.15,
          background: `radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)`
        } : { opacity: 0 }
      });
    });
  }, [maxTilt, perspective, glare, isReduced, isTouchDevice]);

  const handlePointerLeave = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    setTransformStyle({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`,
      glareStyle: { opacity: 0 }
    });
  }, [perspective]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || isReduced || isTouchDevice) return;

    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerleave', handlePointerLeave);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handlePointerMove, handlePointerLeave, isReduced, isTouchDevice]);

  return {
    ref: elementRef,
    style: isReduced || isTouchDevice ? {} : {
      transform: transformStyle.transform,
      transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      transformStyle: 'preserve-3d'
    },
    glareStyle: transformStyle.glareStyle
  };
}
