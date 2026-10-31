import { useCallback, useRef } from 'react';
import { isReducedMotion } from '../utils/motionTokens';

/**
 * usePointerDepth.js
 *
 * Lightweight pointer-driven depth variables for a 2.5D spatial surface.
 * Directly mutates CSS variables (--depth-rotate-x, --depth-rotate-y, --depth-light-x, --depth-light-y)
 * via requestAnimationFrame without triggering React re-renders on pointer movement.
 * Automatically respects prefers-reduced-motion and skips touch devices.
 */
export function usePointerDepth({ maxTilt = 2.5, enabled = true } = {}) {
  const frameRef = useRef(0);
  const latestRef = useRef(null);
  const elementRef = useRef(null);

  const applyRestingState = useCallback((element) => {
    if (!element) return;
    element.style.setProperty('--depth-rotate-x', '0deg');
    element.style.setProperty('--depth-rotate-y', '0deg');
    element.style.setProperty('--depth-light-x', '50%');
    element.style.setProperty('--depth-light-y', '35%');
  }, []);

  const onPointerEnter = useCallback((event) => {
    const element = event.currentTarget;
    elementRef.current = element;
    if (!enabled || event.pointerType === 'touch' || isReducedMotion()) return;
    element.dataset.depthActive = 'true';
  }, [enabled]);

  const onPointerMove = useCallback((event) => {
    const element = event.currentTarget;
    if (!enabled || event.pointerType === 'touch' || isReducedMotion()) return;

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const nx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    latestRef.current = {
      element,
      rotateX: -ny * maxTilt,
      rotateY: nx * maxTilt,
      lightX: 50 + nx * 32,
      lightY: 35 + ny * 32
    };

    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      const value = latestRef.current;
      if (!value?.element?.isConnected) return;
      value.element.style.setProperty('--depth-rotate-x', `${value.rotateX.toFixed(2)}deg`);
      value.element.style.setProperty('--depth-rotate-y', `${value.rotateY.toFixed(2)}deg`);
      value.element.style.setProperty('--depth-light-x', `${value.lightX.toFixed(1)}%`);
      value.element.style.setProperty('--depth-light-y', `${value.lightY.toFixed(1)}%`);
    });
  }, [enabled, maxTilt]);

  const onPointerLeave = useCallback((event) => {
    const element = event.currentTarget;
    delete element.dataset.depthActive;
    applyRestingState(element);
    latestRef.current = null;
    if (frameRef.current && typeof window !== 'undefined') {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  }, [applyRestingState]);

  return { onPointerEnter, onPointerMove, onPointerLeave };
}
