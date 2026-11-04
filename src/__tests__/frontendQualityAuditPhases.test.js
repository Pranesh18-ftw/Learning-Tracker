import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'fs';
import path from 'path';
import Topbar from '../components/Topbar';
import NotFoundPage from '../pages/NotFoundPage';
import { TAB_TO_PATH, PATH_TO_TAB, TAB_TITLES } from '../utils/navigation';
import * as RoadmapContextModule from '../context/RoadmapContext';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/random-uncharted-coordinate' })
}), { virtual: true });

jest.mock('../components/GlobalCommandPalette', () => () => null);
jest.mock('../components/GoogleSignInModal', () => () => null);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Frontend Quality Audit — JARVIS Verification Suites', () => {
  let container;
  let root;
  let mockContextValue;

  beforeEach(() => {
    mockNavigate.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockContextValue = {
      isDarkMode: false,
      toggleTheme: jest.fn(),
      showTutorial: false,
      subjects: [
        { id: 'sub-embedded', name: 'Embedded Systems' },
        { id: 'sub-compilers', name: 'Compilers' }
      ],
      selectedSubjectId: null,
      setSelectedSubjectId: jest.fn(),
      streakCount: 3,
      calculateStreak: () => 3,
      account: {
        accountId: 'usr_audit_test',
        authProvider: 'google',
        displayName: 'Auditor Learner'
      },
      authLifecycle: 'SIGNED_IN',
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

  describe('Phase 1 & 6: Mobile Navigation Drawer, Responsiveness & A11y', () => {
    test('1. Mobile menu toggle button renders with aria-expanded="false" and aria-controls', async () => {
      await act(async () => {
        root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
      });

      const toggleBtn = container.querySelector('#mobile-menu-toggle-btn');
      expect(toggleBtn).not.toBeNull();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(toggleBtn.getAttribute('aria-controls')).toBe('mobile-nav-drawer');
      expect(toggleBtn.getAttribute('aria-label')).toBe('Open navigation menu');
    });

    test('2. Clicking mobile menu toggle opens drawer with all 7 destinations and aria-expanded="true"', async () => {
      const mockSetActiveTab = jest.fn();
      await act(async () => {
        root.render(<Topbar activeTab="dashboard" setActiveTab={mockSetActiveTab} />);
      });

      const toggleBtn = container.querySelector('#mobile-menu-toggle-btn');

      // Click to open
      await act(async () => {
        toggleBtn.click();
      });

      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(toggleBtn.getAttribute('aria-label')).toBe('Close navigation menu');

      const drawer = container.querySelector('#mobile-nav-drawer');
      expect(drawer).not.toBeNull();
      expect(drawer.getAttribute('aria-label')).toBe('Mobile navigation menu');

      // Verify all 7 tabs exist in mobile drawer
      const expectedTabs = ['dashboard', 'roadmap', 'learning-plan', 'stats', 'achievements', 'trajectory', 'settings'];
      expectedTabs.forEach((tabId) => {
        const item = drawer.querySelector(`#mobile-${tabId}-nav-item`);
        expect(item).not.toBeNull();
      });

      // Active tab has aria-current="page"
      const activeMobileItem = drawer.querySelector('#mobile-dashboard-nav-item');
      expect(activeMobileItem.getAttribute('aria-current')).toBe('page');

      // Inactive tab does not have aria-current
      const inactiveMobileItem = drawer.querySelector('#mobile-roadmap-nav-item');
      expect(inactiveMobileItem.getAttribute('aria-current')).toBeNull();

      // Clicking an item triggers setActiveTab and closes drawer
      await act(async () => {
        inactiveMobileItem.click();
      });

      expect(mockSetActiveTab).toHaveBeenCalledWith('roadmap');
      expect(container.querySelector('#mobile-nav-drawer')).toBeNull();
    });

    test('3. Escape key closes the open mobile navigation drawer', async () => {
      await act(async () => {
        root.render(<Topbar activeTab="roadmap" setActiveTab={jest.fn()} />);
      });

      const toggleBtn = container.querySelector('#mobile-menu-toggle-btn');
      await act(async () => {
        toggleBtn.click();
      });
      expect(container.querySelector('#mobile-nav-drawer')).not.toBeNull();

      // Press Escape
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(container.querySelector('#mobile-nav-drawer')).toBeNull();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    });

    test('4. Mobile drawer provides accessible domain selector and calm rhythm readout', async () => {
      await act(async () => {
        root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
      });

      const toggleBtn = container.querySelector('#mobile-menu-toggle-btn');
      await act(async () => {
        toggleBtn.click();
      });

      const domainSelect = container.querySelector('#mobile-domain-select');
      expect(domainSelect).not.toBeNull();
      expect(domainSelect.getAttribute('aria-label')).toBe('Select learning domain on mobile');

      // Verify domain change event
      await act(async () => {
        domainSelect.value = 'sub-compilers';
        domainSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(mockContextValue.setSelectedSubjectId).toHaveBeenCalledWith('sub-compilers');

      // Verify rhythm readout
      const drawer = container.querySelector('#mobile-nav-drawer');
      expect(drawer.textContent).toContain('3-day rhythm active');
    });

    test('5. Icon-only and identity buttons have explicit accessible names and titles', async () => {
      await act(async () => {
        root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
      });

      const searchBtn = container.querySelector('button[aria-label="Search learning"]');
      expect(searchBtn).not.toBeNull();

      const themeBtn = container.querySelector('button[aria-label="Toggle theme"]');
      expect(themeBtn).not.toBeNull();

      const signoutBtn = container.querySelector('#topbar-signout-btn');
      expect(signoutBtn.getAttribute('aria-label')).toBe('Sign out of Google');

      const connectedPill = container.querySelector('#google-connected-pill');
      expect(connectedPill.getAttribute('aria-label')).toContain('Connected as Auditor Learner');
    });
  });

  describe('Phase 4: Dedicated 404 Not Found Page, Routing & Dynamic Titles', () => {
    test('6. NotFoundPage renders 404 badge, clear heading, and requested path', async () => {
      await act(async () => {
        root.render(<NotFoundPage requestedPath="/unknown-secret-laboratory" />);
      });

      expect(container.textContent).toContain('404 · Uncharted Coordinate');
      expect(container.textContent).toContain('Page Not Found');
      expect(container.textContent).toContain('/unknown-secret-laboratory');

      // Return button exists and navigates to '/'
      const returnBtn = container.querySelector('button');
      expect(returnBtn).not.toBeNull();
      expect(returnBtn.textContent).toContain('Return to Dashboard (Now)');

      await act(async () => {
        returnBtn.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    test('7. NotFoundPage provides direct shortcut cards to major learning views', async () => {
      await act(async () => {
        root.render(<NotFoundPage requestedPath="/invalid" />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const roadmapBtn = buttons.find(b => b.textContent.includes('World Roadmap'));
      expect(roadmapBtn).toBeDefined();

      await act(async () => {
        roadmapBtn.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/roadmap');
    });

    test('8. TAB_TITLES maps all 7 views and 404 to descriptive page titles', () => {
      expect(TAB_TITLES.dashboard).toBe('Now | Learning Tracker');
      expect(TAB_TITLES.roadmap).toBe('World Roadmap | Learning Tracker');
      expect(TAB_TITLES['learning-plan']).toBe('Learning Path | Learning Tracker');
      expect(TAB_TITLES.stats).toBe('Growth & Analytics | Learning Tracker');
      expect(TAB_TITLES.achievements).toBe('Learning Archive | Learning Tracker');
      expect(TAB_TITLES.trajectory).toBe('Trajectory & Capabilities | Learning Tracker');
      expect(TAB_TITLES.settings).toBe('Identity & Settings | Learning Tracker');
      expect(TAB_TITLES['not-found']).toBe('Page Not Found (404) | Learning Tracker');
    });

    test('9. PATH_TO_TAB and TAB_TO_PATH retain bijective correspondence for all core tabs', () => {
      const tabs = ['dashboard', 'roadmap', 'learning-plan', 'stats', 'achievements', 'trajectory', 'settings'];
      tabs.forEach((tab) => {
        const path = TAB_TO_PATH[tab];
        expect(path).toBeDefined();
        expect(PATH_TO_TAB[path]).toBe(tab);
      });
    });
  });

  describe('Phase 4 & 5: Branding, Favicon & Static 404 Integrity', () => {
    test('10. public/favicon.svg exists, is valid SVG, and matches electric brand color', () => {
      const faviconPath = path.resolve(__dirname, '../../public/favicon.svg');
      expect(fs.existsSync(faviconPath)).toBe(true);

      const content = fs.readFileSync(faviconPath, 'utf8');
      expect(content).toContain('<svg');
      expect(content).toContain('#2563EB'); // electric-600
      expect(content).toContain('polygon');
    });

    test('11. public/index.html includes favicon link, dark theme color, and metadata description', () => {
      const indexPath = path.resolve(__dirname, '../../public/index.html');
      expect(fs.existsSync(indexPath)).toBe(true);

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg"');
      expect(content).toContain('<meta name="theme-color" content="#0B0F19"');
      expect(content).toContain('<meta name="description"');
    });

    test('12. public/404.html contains styled static fallback with return link', () => {
      const notFoundHtmlPath = path.resolve(__dirname, '../../public/404.html');
      expect(fs.existsSync(notFoundHtmlPath)).toBe(true);

      const content = fs.readFileSync(notFoundHtmlPath, 'utf8');
      expect(content).toContain('404 — Page Not Found');
      expect(content).toContain('href="/"');
      expect(content).toContain('#0B0F19');
    });
  });
});
