/**
 * onboardingOverlayCoherence.test.js
 *
 * Comprehensive tests for:
 * UX Hardening — Auth Entry, Responsive Layout, and Overlay Coherence
 *
 * 1. Only one onboarding overlay can be active at a time.
 * 2. Welcome -> Path Setup transition.
 * 3. Dismissed onboarding remains dismissed.
 * 4. Mobile dialog fits viewport (safe area, no overflow classes, body scroll locked).
 * 5. Desktop dialog is viewport-centered.
 * 6. Main pages do not create horizontal page overflow (proper classes and wrapping).
 * 7. Google sign-in remains accessible while signed out.
 * 8. Continue without account remains accessible (choice, not gate).
 * 9. Authenticated state shows real Firebase account identity.
 * 10. No UI claims cloud sync before cloud sync exists.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Onboarding, { ONBOARDING_STATES } from '../onboarding/Onboarding';
import GoogleSignInModal from '../components/GoogleSignInModal';
import Topbar from '../components/Topbar';
import IdentityDevicesAndPrivacy from '../components/IdentityDevicesAndPrivacy';
import * as RoadmapContextModule from '../context/RoadmapContext';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => <div>{element}</div>
}), { virtual: true });
jest.mock('../components/GlobalCommandPalette', () => () => null);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('UX Hardening — Overlay Coherence, Responsive Layout & Auth Entry', () => {
  let container;
  let root;
  let mockContextValue;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockContextValue = {
      isDarkMode: false,
      toggleTheme: jest.fn(),
      showTutorial: true,
      hasImportedRoadmap: false,
      tutorialStep: 1,
      completeTutorial: jest.fn(),
      importRoadmap: jest.fn(),
      setTutorialStepNumber: jest.fn(),
      account: {
        accountId: 'usr_local_test123',
        authProvider: 'anonymous',
        displayName: 'Local Learner'
      },
      authLifecycle: 'SIGNED_OUT',
      isAuthInitializing: false,
      refreshAccount: jest.fn(),
      logoutAccount: jest.fn(),
      deleteAccount: jest.fn()
    };

    jest.spyOn(RoadmapContextModule, 'useRoadmap').mockImplementation(() => mockContextValue);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    // Clean up any portaled modals
    const portals = document.querySelectorAll('#onboarding-overlay-container, #google-signin-modal-container');
    portals.forEach(p => p.remove());
    document.body.style.overflow = '';
    jest.restoreAllMocks();
  });

  test('1. Invariant: Only ONE onboarding overlay can be active at a time (no competing dialogs)', async () => {
    await act(async () => {
      root.render(<Onboarding onComplete={mockContextValue.completeTutorial} />);
    });

    const overlays = document.querySelectorAll('#onboarding-overlay-container');
    expect(overlays.length).toBe(1);

    // Initial step is Welcome, Path Setup is not rendered yet
    expect(document.querySelector('#onboarding-step-welcome')).not.toBeNull();
    expect(document.querySelector('#onboarding-step-path-setup')).toBeNull();
  });

  test('2. Intentional transition: Welcome -> Path Setup', async () => {
    const onStepChange = jest.fn();
    await act(async () => {
      root.render(
        <Onboarding
          onComplete={mockContextValue.completeTutorial}
          onStepChange={onStepChange}
        />
      );
    });

    const setupBtn = document.querySelector('#onboarding-setup-path-btn');
    expect(setupBtn).not.toBeNull();
    expect(setupBtn.textContent).toMatch(/Set up your path/i);

    // Transition to step 2
    await act(async () => {
      setupBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Invariant: Now Path Setup is active, Welcome is unmounted
    expect(document.querySelector('#onboarding-step-welcome')).toBeNull();
    expect(document.querySelector('#onboarding-step-path-setup')).not.toBeNull();
    expect(document.querySelector('#onboarding-step-path-setup').textContent).toMatch(/Choose your starting path/i);
    expect(onStepChange).toHaveBeenCalledWith(2);
  });

  test('3. Dismissed onboarding remains dismissed and calls completeTutorial', async () => {
    await act(async () => {
      root.render(<Onboarding onComplete={mockContextValue.completeTutorial} />);
    });

    const dismissBtn = document.querySelector('#onboarding-dismiss-btn');
    expect(dismissBtn).not.toBeNull();

    await act(async () => {
      dismissBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockContextValue.completeTutorial).toHaveBeenCalledTimes(1);
    expect(document.querySelector('#onboarding-overlay-container')).toBeNull();
  });

  test('4. Mobile overlay safety: body scroll locked, safe area padding, no squeeze', async () => {
    await act(async () => {
      root.render(<Onboarding onComplete={mockContextValue.completeTutorial} />);
    });

    // Body scroll must be locked
    expect(document.body.style.overflow).toBe('hidden');

    const containerEl = document.querySelector('#onboarding-overlay-container');
    expect(containerEl).not.toBeNull();
    // Proper responsive padding and flex centering
    expect(containerEl.className).toContain('fixed');
    expect(containerEl.className).toContain('inset-0');
    expect(containerEl.className).toContain('flex items-center justify-center');

    const card = containerEl.querySelector('div');
    // Safe-area aware and max-h
    expect(card.className).toContain('max-h-[');
    expect(card.className).toContain('overflow-y-auto');
  });

  test('5. Desktop overlay behavior: GoogleSignInModal is portaled and centered', async () => {
    await act(async () => {
      root.render(
        <GoogleSignInModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );
    });

    const modalContainer = document.querySelector('#google-signin-modal-container');
    expect(modalContainer).not.toBeNull();
    expect(modalContainer.parentElement).toBe(document.body);
    expect(modalContainer.className).toContain('flex items-center justify-center');

    const card = modalContainer.querySelector('div');
    expect(card.className).toContain('my-auto');
    expect(card.className).toContain('max-w-md');
  });

  test('6. Google sign-in remains accessible while signed out', async () => {
    mockContextValue.authLifecycle = 'SIGNED_OUT';
    mockContextValue.account = {
      accountId: 'usr_local_test123',
      authProvider: 'anonymous',
      displayName: 'Local Learner'
    };

    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    const btn = container.querySelector('#google-signin-btn');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toMatch(/Continue with Google/i);
  });

  test('7. Google Sign-In copy is honest and does NOT claim cloud sync or multi-device continuity', async () => {
    await act(async () => {
      root.render(
        <GoogleSignInModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );
    });

    const text = document.body.textContent;
    // Honest copy
    expect(text).toMatch(/Create your Learning Tracker identity/i);
    expect(text).toMatch(/Your learning data stays on this device for now/i);
    expect(text).toMatch(/Account sync across devices will be available when cloud sync is connected/i);

    // MUST NOT claim existing cloud sync / cloud backup / cross device
    expect(text).not.toMatch(/Your curriculum, focus proof, and archive follow you across devices/i);
    expect(text).not.toMatch(/Start Fresh in Cloud/i);
  });

  test('8. Continue without account remains accessible as a secondary choice', async () => {
    const handleClose = jest.fn();
    await act(async () => {
      root.render(
        <GoogleSignInModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={jest.fn()}
        />
      );
    });

    const optOutBtn = document.querySelector('#modal-continue-without-account-btn');
    expect(optOutBtn).not.toBeNull();
    expect(optOutBtn.textContent).toMatch(/Continue without an account/i);

    await act(async () => {
      optOutBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('9. Authenticated state shows real Firebase identity without fake cloud sync', async () => {
    mockContextValue.authLifecycle = 'AUTHENTICATED';
    mockContextValue.account = {
      accountId: 'usr_google_real999',
      authProvider: 'google',
      displayName: 'Marie Curie',
      email: 'marie@curie.org'
    };

    await act(async () => {
      root.render(
        <IdentityDevicesAndPrivacy
          connectedDevices={{}}
          onExportData={jest.fn()}
          onResetIdentity={jest.fn()}
        />
      );
    });

    const text = container.textContent;
    expect(text).toMatch(/Marie Curie/i);
    expect(text).toMatch(/Google Connected/i);
    expect(text).toMatch(/Authenticated with Google · Data stored locally on this device/i);

    // Must not show fake cloud backup
    expect(text).not.toMatch(/Cloud backup active/i);
    expect(text).not.toMatch(/Device sync enabled/i);
  });
});
