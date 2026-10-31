import React from 'react';
import { usePointerDepth } from '../hooks/usePointerDepth';

/**
 * SpatialSurface.jsx
 *
 * Composable 2.5D spatial material wrapper adapted from the starter kit.
 * Renders an elevated, directional-lit surface with subtle pointer-driven depth.
 * Pass interactive={true} only to major surfaces (e.g. Hero cards, prominent workbench panels).
 */
export default function SpatialSurface({
  as: Element = 'section',
  children,
  className = '',
  glass = false,
  interactive = false,
  maxTilt = 2.2,
  elevated = false,
  ...rest
}) {
  const pointerProps = usePointerDepth({ maxTilt, enabled: interactive });
  const classes = [
    'spatial-surface',
    glass && 'spatial-surface--glass',
    elevated && 'spatial-surface--elevated',
    interactive && 'spatial-surface--interactive',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={interactive ? 'spatial-scene' : undefined}>
      <Element className={classes} {...(interactive ? pointerProps : {})} {...rest}>
        <div className="spatial-surface__content">{children}</div>
      </Element>
    </div>
  );
}
