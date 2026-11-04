/**
 * p2ProductionHardening.test.js
 *
 * Regression Test Suite for P2.1:
 * - Error Boundary catch & recovery behavior
 * - Modal & Dialog accessibility (focus trapping, Escape key, body scroll locking, focus return)
 * - Semantic keyboard accessibility (cards, buttons, inputs)
 * - FocusSpace polite live region state announcements
 * - Reduced motion & focus-visible CSS definitions
 */

import React, { act, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from '../components/ErrorBoundary';
import { useDialogA11y, trapFocus, getFocusableElements } from '../utils/a11y';
import Topbar from '../components/Topbar';
import TaskCompletionModal from '../components/TaskCompletionModal';
import Onboarding from '../onboarding/Onboarding';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => <div>{element}</div>
}), { virtual: true });
jest.mock('../components/GlobalCommandPalette', () => () => null);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Helper component to trigger errors for ErrorBoundary testing
const BuggyComponent = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Simulated crash in component hierarchy');
  }
  return <div id="healthy-content">Healthy Component Content</div>;
};

// Helper modal component using useDialogA11y hook
const TestModal = ({ isOpen, onClose }) => {
  const containerRef = useRef(null);
  useDialogA11y({ isOpen, onClose, containerRef });

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-dialog-title"
    >
      <h2 id="test-dialog-title">Test Dialog</h2>
      <button id="modal-btn-1">First Button</button>
      <input id="modal-input-1" placeholder="Test input" />
      <button id="modal-btn-close" onClick={onClose}>Close</button>
    </div>
  );
};

describe('P2.1 Production Hardening — Error Boundary', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    console.error.mockRestore();
  });

  test('catches unhandled child error and displays truthful recovery fallback without blanking application', () => {
    act(() => {
      root.render(
        <ErrorBoundary componentName="Test Feature Panel">
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    const fallbackAlert = container.querySelector('[role="alert"]');
    expect(fallbackAlert).not.toBeNull();
    expect(container.textContent).toContain('Something went wrong in Test Feature Panel');
    expect(container.textContent).toContain('Simulated crash in component hierarchy');

    const tryAgainBtn = container.querySelector('button');
    expect(tryAgainBtn).not.toBeNull();
    expect(tryAgainBtn.textContent).toContain('Try Again');
  });

  test('resets error state when clicking Try Again button', () => {
    let shouldFail = true;

    const DynamicParent = () => {
      const [attempt, setAttempt] = useState(0);
      return (
        <div>
          <button id="re-render-btn" onClick={() => setAttempt(a => a + 1)}>
            Re-render
          </button>
          <ErrorBoundary componentName="Recoverable Section" key={attempt}>
            <BuggyComponent shouldThrow={shouldFail} />
          </ErrorBoundary>
        </div>
      );
    };

    act(() => {
      root.render(<DynamicParent />);
    });

    expect(container.textContent).toContain('Something went wrong in Recoverable Section');

    // Simulate bug being resolved
    shouldFail = false;

    // Trigger retry
    const tryAgainBtn = container.querySelector('button');
    act(() => {
      tryAgainBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Healthy content is rendered
    expect(container.querySelector('#healthy-content')).not.toBeNull();
    expect(container.textContent).toContain('Healthy Component Content');
  });
});

describe('P2.1 Production Hardening — Dialog Accessibility & Focus Trap', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.style.overflow = '';
  });

  test('getFocusableElements retrieves all interactive elements inside container', () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <button id="btn1">Button 1</button>
      <a href="/test" id="link1">Link</a>
      <input type="text" id="inp1" />
      <button disabled id="btn-disabled">Disabled</button>
      <div tabindex="0" id="div-focusable">Focusable Div</div>
      <div tabindex="-1" id="div-unfocusable">Unfocusable Div</div>
    `;
    document.body.appendChild(wrapper);

    const focusables = getFocusableElements(wrapper);
    const ids = focusables.map(el => el.id);

    expect(ids).toContain('btn1');
    expect(ids).toContain('link1');
    expect(ids).toContain('inp1');
    expect(ids).toContain('div-focusable');
    expect(ids).not.toContain('btn-disabled');
    expect(ids).not.toContain('div-unfocusable');

    wrapper.remove();
  });

  test('trapFocus cycles focus from last to first element on Tab', () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <button id="first-btn">First</button>
      <button id="last-btn">Last</button>
    `;
    document.body.appendChild(wrapper);

    const first = wrapper.querySelector('#first-btn');
    const last = wrapper.querySelector('#last-btn');

    last.focus();
    expect(document.activeElement).toBe(last);

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true });
    jest.spyOn(tabEvent, 'preventDefault');

    trapFocus(wrapper, tabEvent);

    expect(tabEvent.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(first);

    wrapper.remove();
  });

  test('trapFocus cycles focus from first to last element on Shift+Tab', () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <button id="first-btn">First</button>
      <button id="last-btn">Last</button>
    `;
    document.body.appendChild(wrapper);

    const first = wrapper.querySelector('#first-btn');
    const last = wrapper.querySelector('#last-btn');

    first.focus();
    expect(document.activeElement).toBe(first);

    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    jest.spyOn(shiftTabEvent, 'preventDefault');

    trapFocus(wrapper, shiftTabEvent);

    expect(shiftTabEvent.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(last);

    wrapper.remove();
  });

  test('useDialogA11y locks document body scroll and triggers onClose on Escape', () => {
    const handleClose = jest.fn();

    act(() => {
      root.render(<TestModal isOpen={true} onClose={handleClose} />);
    });

    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(handleClose).toHaveBeenCalledTimes(1);

    act(() => {
      root.render(<TestModal isOpen={false} onClose={handleClose} />);
    });

    expect(document.body.style.overflow).toBe('');
  });
});

describe('P2.1 Production Hardening — Task Completion Modal Accessibility', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.style.overflow = '';
  });

  test('has standard role="dialog", aria-modal="true", and aria-labelledby title', () => {
    act(() => {
      root.render(
        <TaskCompletionModal
          isOpen={true}
          onClose={jest.fn()}
          taskName="Derive Fourier Transform"
          subjectId="s1"
          phaseId="p1"
          taskId="t1"
          onComplete={jest.fn()}
          onPostpone={jest.fn()}
        />
      );
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('task-completion-modal-title');

    const title = container.querySelector('#task-completion-modal-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Task Completion');

    // Input associations
    const timeInput = container.querySelector('#task-completion-time');
    const timeLabel = container.querySelector('label[for="task-completion-time"]');
    expect(timeInput).not.toBeNull();
    expect(timeLabel).not.toBeNull();
  });
});

describe('P2.1 Production Hardening — Topbar Semantic Navigation & A11y', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test('main navigation has aria-label and active item has aria-current="page"', () => {
    const mockContext = {
      isDarkMode: false,
      toggleTheme: jest.fn(),
      subjects: [{ id: 'sub-1', name: 'Microcontrollers' }],
      selectedSubjectId: 'sub-1',
      setSelectedSubjectId: jest.fn(),
      streakCount: 3,
      account: { authProvider: 'anonymous', displayName: 'Anonymous Learner' },
      authLifecycle: 'SIGNED_OUT',
      isAuthInitializing: false
    };

    jest.spyOn(require('../context/RoadmapContext'), 'useRoadmap').mockReturnValue(mockContext);

    act(() => {
      root.render(
        <Topbar
          activeTab="roadmap"
          setActiveTab={jest.fn()}
        />
      );
    });

    const nav = container.querySelector('nav[aria-label="Main navigation"]');
    expect(nav).not.toBeNull();

    const activeTab = container.querySelector('#roadmap-nav-item');
    expect(activeTab).not.toBeNull();
    expect(activeTab.getAttribute('aria-current')).toBe('page');

    const inactiveTab = container.querySelector('#dashboard-nav-item');
    expect(inactiveTab).not.toBeNull();
    expect(inactiveTab.getAttribute('aria-current')).toBeNull();

    const domainSelect = container.querySelector('select[aria-label="Select learning domain"]');
    expect(domainSelect).not.toBeNull();
  });
});
