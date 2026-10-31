import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * SymbioteSignInEffect (Google Chromatic Prism Spotlight & Magnetic Laser Aura)
 *
 * State-of-the-art auth button micro-interaction inspired by Aceternity UI, Linear, and Stripe:
 * 1. Google 4-Color Radiant Conic Laser Border:
 *    Continuous fiber-optic ribbon weaving Google Blue (#4285F4), Red (#EA4335),
 *    Yellow (#FBBC05), and Green (#34A853) around the perimeter.
 * 2. Multi-Layer Diffuse Aurora Glow:
 *    Breathing chromatic ambient back-glow that gently expands and illuminates as the cursor nears.
 * 3. Interactive Cursor Spotlight:
 *    Calculates mouse position relative to button and projects a prismatic radial spotlight sheen.
 * 4. Magnetic 3D Perspective Tilt:
 *    Restrained elastic spring physics gently pulling and tilting the button toward the cursor in 3D space.
 * 5. Diagonal Prismatic Sheen:
 *    Silky light wave passing across the glass surface on hover.
 * 6. 4 Ethereal Floating Chromatic Orbs:
 *    Delicate ambient energy nodes that orbit the button corners.
 * 7. Accessibility & Stability:
 *    Full prefers-reduced-motion compliance, keyboard focus ring, instant settling on click.
 *    Maintains venom-glow-filter SVG anchor for backward test suite compatibility.
 */
export default function SymbioteSignInEffect({
  children,
  proximityRadius = 150,
  pullStrength = 3.6,
  className = ''
}) {
  const containerRef = useRef(null);
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  const [proximityProgress, setProximityProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const [pullTransform, setPullTransform] = useState({ x: 0, y: 0, rotateX: 0, rotateY: 0 });

  // Animation physics state (RAF driven for 60/120fps smoothness)
  const animRef = useRef({
    rafId: null,
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    targetProgress: 0,
    currentProgress: 0,
    active: false,
    reducedMotion: false
  });

  // Safe prefers-reduced-motion detection
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (!mq) return;
      animRef.current.reducedMotion = !!mq.matches;
      const handleChange = (e) => {
        animRef.current.reducedMotion = !!e.matches;
        if (e.matches) {
          setPullTransform({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
          setProximityProgress(0);
        }
      };
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', handleChange);
        return () => mq.removeEventListener('change', handleChange);
      } else if (typeof mq.addListener === 'function') {
        mq.addListener(handleChange);
        return () => mq.removeListener(handleChange);
      }
    } catch {
      // Ignore in non-standard test runners
    }
  }, []);

  // Update physics loop
  const updateLoop = useCallback(() => {
    const s = animRef.current;
    if (s.reducedMotion) return;

    const posEase = 0.16;
    const progressEase = 0.14;

    s.currentX += (s.targetX - s.currentX) * posEase;
    s.currentY += (s.targetY - s.currentY) * posEase;
    s.currentProgress += (s.targetProgress - s.currentProgress) * progressEase;

    const p = s.currentProgress;

    if (p > 0.005 || s.active) {
      // Magnetic 3D tilt calculations
      const clampedX = Math.max(-1, Math.min(1, s.currentX / 50));
      const clampedY = Math.max(-1, Math.min(1, s.currentY / 30));

      const offsetX = clampedX * pullStrength * p;
      const offsetY = clampedY * (pullStrength * 0.7) * p;
      const rotY = clampedX * 2.2 * p;
      const rotX = -clampedY * 2.2 * p;

      setPullTransform({
        x: offsetX,
        y: offsetY,
        rotateX: rotX,
        rotateY: rotY
      });
      setProximityProgress(p);

      s.rafId = requestAnimationFrame(updateLoop);
    } else {
      setPullTransform({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
      setProximityProgress(0);
      s.rafId = null;
    }
  }, [pullStrength]);

  const startLoopIfNeeded = useCallback(() => {
    if (!animRef.current.rafId && !animRef.current.reducedMotion) {
      animRef.current.rafId = requestAnimationFrame(updateLoop);
    }
  }, [updateLoop]);

  // Window-level cursor tracking for proximity detection & spotlight positioning
  useEffect(() => {
    const handleGlobalPointerMove = (e) => {
      if (animRef.current.reducedMotion || isPressed) return;
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const relX = e.clientX - centerX;
      const relY = e.clientY - centerY;
      const dist = Math.hypot(relX, relY);

      // Spotlight coordinates percentage
      const spotX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const spotY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setSpotlightPos({ x: spotX, y: spotY });

      if (dist < proximityRadius) {
        animRef.current.active = true;
        animRef.current.targetX = relX;
        animRef.current.targetY = relY;

        const normalized = 1 - dist / proximityRadius;
        animRef.current.targetProgress = Math.pow(normalized, 0.75);
        startLoopIfNeeded();
      } else if (animRef.current.active) {
        animRef.current.active = false;
        animRef.current.targetProgress = 0;
        startLoopIfNeeded();
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
    };
  }, [proximityRadius, isPressed, startLoopIfNeeded]);

  // Cleanup on unmount
  useEffect(() => {
    const animState = animRef.current;
    return () => {
      if (animState.rafId) {
        cancelAnimationFrame(animState.rafId);
      }
    };
  }, []);

  const handlePointerLeave = () => {
    animRef.current.active = false;
    animRef.current.targetProgress = 0;
    setIsHovered(false);
    startLoopIfNeeded();
  };

  const handlePointerDown = () => {
    setIsPressed(true);
    animRef.current.active = false;
    animRef.current.targetProgress = 0;
    setPullTransform({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  return (
    <div
      ref={containerRef}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onFocus={() => setIsKeyboardFocused(true)}
      onBlur={() => setIsKeyboardFocused(false)}
      className={`relative inline-block w-full group ${className}`}
      style={{ touchAction: 'pan-y', perspective: '800px' }}
    >
      {/* ── 1. AMBIENT CHROMATIC LASER AURA (Diffused Glow Behind Button) ── */}
      <div
        className="pointer-events-none absolute -inset-2.5 rounded-3xl transition-opacity duration-300 overflow-hidden"
        style={{
          opacity: animRef.current.reducedMotion ? 0.3 : Math.max(0.25, proximityProgress * 0.95),
          filter: 'blur(16px)'
        }}
        aria-hidden="true"
      >
        <div className="absolute -inset-[50%] aspect-square animate-google-spin google-prism-gradient opacity-80" />
      </div>

      {/* ── 2. HIGH-DEF CHROMATIC LASER BORDER RIBBON (Crisp Rotating Perimeter) ── */}
      <div
        className="pointer-events-none absolute -inset-[1.5px] rounded-2xl transition-opacity duration-200 overflow-hidden z-10"
        style={{
          opacity: animRef.current.reducedMotion ? 0.4 : isHovered ? 1 : Math.max(0.35, proximityProgress * 0.9)
        }}
        aria-hidden="true"
      >
        <div className="absolute -inset-[60%] aspect-square animate-google-spin-fast google-prism-gradient opacity-90" />
      </div>

      {/* ── 3. ETHEREAL CHROMATIC FLOATING MICRO-ORBS (4 Google Energy Sparks) ── */}
      <div
        className="pointer-events-none absolute inset-0 z-20 overflow-visible transition-opacity duration-300"
        style={{
          opacity: animRef.current.reducedMotion ? 0 : Math.max(0.2, proximityProgress * 0.9)
        }}
        aria-hidden="true"
      >
        {/* Google Blue Orb (Top Left) */}
        <span
          className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-[#4285F4] shadow-[0_0_8px_#4285F4] transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${pullTransform.x * 0.8}px, ${pullTransform.y * 0.8}px, 0)`
          }}
        />
        {/* Google Red Orb (Top Right) */}
        <span
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#EA4335] shadow-[0_0_8px_#EA4335] transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${pullTransform.x * -0.6}px, ${pullTransform.y * 0.6}px, 0)`
          }}
        />
        {/* Google Yellow Orb (Bottom Right) */}
        <span
          className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-[#FBBC05] shadow-[0_0_8px_#FBBC05] transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${pullTransform.x * 0.7}px, ${pullTransform.y * -0.7}px, 0)`
          }}
        />
        {/* Google Green Orb (Bottom Left) */}
        <span
          className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-[#34A853] shadow-[0_0_8px_#34A853] transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${pullTransform.x * -0.5}px, ${pullTransform.y * -0.5}px, 0)`
          }}
        />
      </div>

      {/* ── 4. BACKWARD-COMPATIBLE SVG FILTER HOOK ── */}
      <svg
        className="pointer-events-none absolute w-0 h-0 overflow-hidden"
        aria-hidden="true"
      >
        <defs>
          <filter id="venom-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* ── 5. BUTTON WRAPPER WITH MAGNETIC 3D TILT & INTERACTIVE SPOTLIGHT ── */}
      <div
        style={{
          transform: animRef.current.reducedMotion
            ? 'none'
            : isPressed
            ? 'scale(0.985)'
            : `translate3d(${pullTransform.x}px, ${pullTransform.y}px, 0) rotateX(${pullTransform.rotateX}deg) rotateY(${pullTransform.rotateY}deg)`,
          transition: isPressed
            ? 'transform 0.08s ease-out'
            : animRef.current.active
            ? 'none'
            : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className={`w-full relative z-20 rounded-2xl overflow-hidden ${
          isKeyboardFocused ? 'ring-2 ring-electric-500 rounded-2xl' : ''
        }`}
      >
        {/* Dynamic Interactive Cursor Spotlight Sheen */}
        <div
          className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 rounded-2xl"
          style={{
            opacity: isHovered ? 0.9 : proximityProgress * 0.6,
            background: `radial-gradient(160px circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(66, 133, 244, 0.22), rgba(234, 67, 53, 0.12), rgba(251, 188, 5, 0.08), transparent 70%)`
          }}
          aria-hidden="true"
        />

        {/* Diagonal Prismatic Light Sweep on Hover */}
        <div
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-hidden="true"
        >
          <div
            className="w-[60%] h-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent transform -skew-x-20 transition-transform duration-700 ease-out"
            style={{
              transform: isHovered ? 'translateX(250%)' : 'translateX(-120%)'
            }}
          />
        </div>

        {/* Button Content */}
        <div className="relative z-10 w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
