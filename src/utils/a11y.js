import { useEffect, useRef } from 'react';

/**
 * Get all focusable elements inside a container
 */
export function getFocusableElements(container) {
  if (!container) return [];
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');
  return Array.from(container.querySelectorAll(selector)).filter(el => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
    if (el.hidden || el.style?.display === 'none' || el.style?.visibility === 'hidden') return false;
    return true;
  });
}

/**
 * Trap keyboard focus within a container when pressing Tab or Shift+Tab
 */
export function trapFocus(container, event) {
  if (event.key !== 'Tab' || !container) return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first || !container.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last || !container.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Custom React hook for complete WAI-ARIA dialog accessibility:
 * - Focus trapping (Tab / Shift+Tab)
 * - Escape key dismissal
 * - Initial focus management
 * - Focus restoration to trigger element upon closing
 * - Body scroll lock while modal is open
 */
export function useDialogA11y({
  isOpen,
  onClose,
  containerRef,
  initialFocusRef,
  preventScroll = true
}) {
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Remember trigger element to return focus on close
    triggerRef.current = document.activeElement;

    // Prevent background body scroll
    const originalOverflow = document.body.style.overflow;
    if (preventScroll) {
      document.body.style.overflow = 'hidden';
    }

    // Set initial focus
    const focusTimer = setTimeout(() => {
      if (initialFocusRef && initialFocusRef.current) {
        initialFocusRef.current.focus();
      } else if (containerRef && containerRef.current) {
        const focusable = getFocusableElements(containerRef.current);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          containerRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose && onClose();
        return;
      }

      if (e.key === 'Tab' && containerRef && containerRef.current) {
        trapFocus(containerRef.current, e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (preventScroll) {
        document.body.style.overflow = originalOverflow;
      }
      // Return focus to trigger
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, onClose, containerRef, initialFocusRef, preventScroll]);
}
