import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Topbar from '../components/Topbar';
import * as RoadmapContextModule from '../context/RoadmapContext';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' })
}), { virtual: true });
jest.mock('../components/GlobalCommandPalette', () => () => null);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('P0.1B — Topbar Google Sign-In Entry Point & Auth States', () => {
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
      showTutorial: false,
      hasImportedRoadmap: true,
      subjects: [],
      selectedSubjectId: null,
      setSelectedSubjectId: jest.fn(),
      streakCount: 0,
      account: {
        accountId: 'usr_local_test123',
        authProvider: 'anonymous',
        displayName: 'Local Learner'
      },
      authLifecycle: 'SIGNED_OUT',
      isAuthInitializing: false,
      refreshAccount: jest.fn(),
      logoutAccount: jest.fn()
    };

    jest.spyOn(RoadmapContextModule, 'useRoadmap').mockImplementation(() => mockContextValue);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  test('1. AUTH_INITIALIZING: renders loading state and hides signed-out button', async () => {
    mockContextValue.isAuthInitializing = true;
    mockContextValue.authLifecycle = 'AUTH_INITIALIZING';

    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    // Verifying state must be present
    const initEl = container.querySelector('#auth-initializing-state');
    expect(initEl).not.toBeNull();
    expect(initEl.textContent).toMatch(/Verifying/i);

    // Google sign-in and connected pill must NOT be rendered
    expect(container.querySelector('#google-signin-btn')).toBeNull();
    expect(container.querySelector('#google-connected-pill')).toBeNull();
  });

  test('2. SIGNED_OUT: renders prominent "Continue with Google" button with shrink-0', async () => {
    mockContextValue.isAuthInitializing = false;
    mockContextValue.authLifecycle = 'SIGNED_OUT';
    mockContextValue.account = {
      accountId: 'usr_local_test123',
      authProvider: 'anonymous',
      displayName: 'Local Learner'
    };

    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    // Must render #google-signin-btn
    const signinBtn = container.querySelector('#google-signin-btn');
    expect(signinBtn).not.toBeNull();
    expect(signinBtn.textContent).toMatch(/Continue with Google/i);
    expect(signinBtn.className).toContain('shrink-0');

    // Initializing and connected states must not be rendered
    expect(container.querySelector('#auth-initializing-state')).toBeNull();
    expect(container.querySelector('#google-connected-pill')).toBeNull();
  });

  test('3. Clicking "Continue with Google" opens GoogleSignInModal', async () => {
    mockContextValue.isAuthInitializing = false;
    mockContextValue.authLifecycle = 'SIGNED_OUT';

    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    const signinBtn = container.querySelector('#google-signin-btn');
    expect(signinBtn).not.toBeNull();

    await act(async () => {
      signinBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // GoogleSignInModal opens (rendered via portal into document.body)
    expect(document.body.textContent).toMatch(/Create your Learning Tracker identity/i);
    expect(document.body.textContent).toMatch(/Continue without an account/i);
  });

  test('4. AUTHENTICATED: renders connected account pill and "Sign out" button', async () => {
    mockContextValue.isAuthInitializing = false;
    mockContextValue.authLifecycle = 'AUTHENTICATED';
    mockContextValue.account = {
      accountId: 'usr_google_12345678',
      authProvider: 'google',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      avatar: null
    };

    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    // Connected pill present with user display name
    const pill = container.querySelector('#google-connected-pill');
    expect(pill).not.toBeNull();
    expect(pill.textContent).toMatch(/Ada/i);

    // Inline Sign out button present
    const signoutBtn = container.querySelector('#topbar-signout-btn');
    expect(signoutBtn).not.toBeNull();
    expect(signoutBtn.textContent).toMatch(/Sign out/i);

    // Sign in button must NOT be rendered
    expect(container.querySelector('#google-signin-btn')).toBeNull();
  });

  test('5. Clicking Topbar "Sign out" calls logoutAccount', async () => {
    mockContextValue.isAuthInitializing = false;
    mockContextValue.authLifecycle = 'AUTHENTICATED';
    mockContextValue.account = {
      accountId: 'usr_google_12345678',
      authProvider: 'google',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com'
    };

    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    const signoutBtn = container.querySelector('#topbar-signout-btn');
    expect(signoutBtn).not.toBeNull();

    await act(async () => {
      signoutBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockContextValue.logoutAccount).toHaveBeenCalledTimes(1);
  });

  test('6. Navigation container contains min-w-0 and overflow-x-auto to prevent layout squeeze', async () => {
    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    const nav = container.querySelector('nav');
    expect(nav).not.toBeNull();
    expect(nav.className).toContain('min-w-0');
    expect(nav.className).toContain('overflow-x-auto');
  });

  test('7. Topbar renders "Fresh start" when streakCount is 0, refusing to claim fabricated rhythm', async () => {
    mockContextValue.streakCount = 0;

    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    const rhythmPill = container.querySelector('div[title="No active learning rhythm recorded yet"]');
    expect(rhythmPill).not.toBeNull();
    expect(rhythmPill.textContent).toContain('Fresh start');
    expect(rhythmPill.textContent).not.toMatch(/1-day rhythm|3-day rhythm/);
  });

  test('8. Topbar renders "5-day rhythm" when real streakCount is 5', async () => {
    mockContextValue.streakCount = 5;

    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    const rhythmPill = container.querySelector('div[title="Consecutive active learning rhythm"]');
    expect(rhythmPill).not.toBeNull();
    expect(rhythmPill.textContent).toContain('5-day rhythm');
  });
});
