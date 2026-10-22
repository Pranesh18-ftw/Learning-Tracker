import React, { useState, useEffect, useRef } from 'react';

/**
 * Intelligent, minimal custom cursor.
 * Principle 27:
 * - Desktop only.
 * - Default: small dot ·
 * - Interactive concept: circle ○
 * - Draggable / scrubber: direction indicator ↔
 * - Start action: arrow →
 * - Discovery: crosshair / tiny plus +
 * - Disabled on mobile/touch & for reduced-motion preferences.
 * - Non-blocking (pointer-events-none).
 */
const CustomCursor = () => {
  const cursorRef = useRef(null);
  const [cursorType, setCursorType] = useState('default'); // 'default' | 'concept' | 'action' | 'drag' | 'discovery'
  const [isVisible, setIsVisible] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    // Disable on touch devices or if reduced motion is requested
    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const isReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (isTouch || isReducedMotion) {
      setIsDisabled(true);
      return;
    }

    const onMouseMove = (e) => {
      setIsVisible(true);
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Check the hovered target's data-cursor attribute or semantic role
      let target = e.target;
      let detectedType = 'default';

      while (target && target !== document.body) {
        const customType = target.getAttribute && target.getAttribute('data-cursor');
        if (customType) {
          detectedType = customType;
          break;
        }

        // Implicit detections
        if (target.classList && (target.classList.contains('action-primary') || target.classList.contains('action-start'))) {
          detectedType = 'action';
          break;
        }
        if (target.classList && (target.classList.contains('frame-card') || target.classList.contains('concept-target'))) {
          detectedType = 'concept';
          break;
        }
        if (target.type === 'range') {
          detectedType = 'drag';
          break;
        }

        target = target.parentElement;
      }

      setCursorType(detectedType);
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
    };
  }, []);

  if (isDisabled || !isVisible) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="fixed top-0 left-0 pointer-events-none z-[9999] transition-opacity duration-150 will-change-transform"
      style={{
        transform: 'translate3d(-100px, -100px, 0)',
        opacity: isVisible ? 1 : 0
      }}
    >
      {cursorType === 'default' && (
        <div className="-translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#171716] dark:bg-[#EDE9E0] opacity-80" />
      )}

      {cursorType === 'concept' && (
        <div className="-translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-[#B84F2B] bg-[#B84F2B]/10 flex items-center justify-center transition-all duration-200">
          <div className="w-1 h-1 rounded-full bg-[#B84F2B]" />
        </div>
      )}

      {cursorType === 'action' && (
        <div className="-translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-[#171716] dark:bg-[#EDE9E0] text-[#F7F4EC] dark:text-[#161614] text-xs font-mono font-bold transition-all duration-200 shadow-md">
          <span>→</span>
        </div>
      )}

      {cursorType === 'drag' && (
        <div className="-translate-x-1/2 -translate-y-1/2 flex items-center justify-center px-1.5 py-0.5 rounded-sm bg-[#171716] dark:bg-[#EDE9E0] text-[#F7F4EC] dark:text-[#161614] text-[10px] font-mono tracking-tighter shadow-sm">
          <span>↔</span>
        </div>
      )}

      {cursorType === 'discovery' && (
        <div className="-translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[#B84F2B] font-mono text-sm font-bold">
          <span>+</span>
        </div>
      )}
    </div>
  );
};

export default CustomCursor;
