/* eslint-disable no-script-url */
/**
 * securityHardeningP2.test.js
 *
 * Automated Security & Privacy Hardening Regression Suite (P2.2).
 *
 * Verifies:
 * 1. URL / Link Security: Unsafe protocol rejection, safe external link attributes.
 * 2. Prototype Pollution Defense: safeJsonParse & sanitizeUntrustedObject neutralize __proto__ and constructor.
 * 3. Information Disclosure Prevention: Internal filesystem path stripping in error reporting.
 * 4. Storage Privacy & Credential Containment: No OAuth tokens or invasive telemetry in app storage.
 * 5. Production / Test Separation: Isolated mock handlers and honest error reporting.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import {
  isSafeUrl,
  sanitizeExternalUrl,
  getSafeExternalLinkProps,
  safeJsonParse,
  sanitizeUntrustedObject,
  sanitizeErrorMessage
} from '../utils/securityUtils';
import { safeStorageGet, safeStorageClear } from '../utils/storage';
import { getOrCreateAccount, linkAuthProvider, ACCOUNT_STORAGE_KEY } from '../services/accountIdentityService';
import { normalizeFocusTelemetry } from '../shared/focusIntegrityProtocol';
import { mapFirebaseAuthError, FIREBASE_AUTH_ERROR_CODES } from '../services/firebase';
import ErrorBoundary from '../components/ErrorBoundary';

describe('P2.2 — Security, Privacy, and Defensive Hardening', () => {
  beforeEach(() => {
    safeStorageClear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    safeStorageClear();
  });

  // ============================================================
  // 1. URL & LINK SECURITY
  // ============================================================
  describe('1. URL Validation & Link Sanitization', () => {
    test('Rejects dangerous and script-executing URL schemes', () => {
      const maliciousUrls = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(document.cookie)',
        'javascript://%0aalert(1)',
        'vbscript:msgbox(1)',
        'VBSCRIPT:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'data:application/javascript;base64,YWxlcnQoMSk=',
        'file:///etc/passwd',
        'file://C:/Windows/System32/calc.exe',
        '\x00javascript:alert(1)',
        '   javascript:void(0)   '
      ];

      maliciousUrls.forEach(url => {
        expect(isSafeUrl(url)).toBe(false);
        expect(sanitizeExternalUrl(url)).toBe('#');
      });
    });

    test('Permits legitimate educational and application URLs', () => {
      const validUrls = [
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
        'https://en.wikipedia.org/wiki/Kirchhoff%27s_circuit_laws',
        'http://localhost:3000',
        '/roadmap',
        './curriculum',
        '#phase-1-foundations'
      ];

      validUrls.forEach(url => {
        expect(isSafeUrl(url)).toBe(true);
        expect(sanitizeExternalUrl(url)).toBe(url.trim());
      });
    });

    test('Enforces noopener noreferrer and target=_blank for external links', () => {
      const props = getSafeExternalLinkProps('https://arxiv.org/abs/2101.00001');
      expect(props.href).toBe('https://arxiv.org/abs/2101.00001');
      expect(props.target).toBe('_blank');
      expect(props.rel).toBe('noopener noreferrer');

      // Malicious URL falls back safely while keeping secure attributes
      const dangerousProps = getSafeExternalLinkProps('javascript:alert(1)', '#fallback');
      expect(dangerousProps.href).toBe('#fallback');
      expect(dangerousProps.rel).toBe('noopener noreferrer');
    });
  });

  // ============================================================
  // 2. PROTOTYPE POLLUTION DEFENSE
  // ============================================================
  describe('2. Prototype Pollution Defense & Safe Parsing', () => {
    test('Neutralizes __proto__ injection via safeJsonParse', () => {
      const payload = '{"__proto__": {"polluted": "yes"}, "subject": "Calculus"}';

      const parsed = safeJsonParse(payload);

      expect(parsed).toBeDefined();
      expect(parsed.subject).toBe('Calculus');
      // Must not pollute Object prototype or standard objects
      expect(({}).polluted).toBeUndefined();
      expect(Object.prototype.polluted).toBeUndefined();
      expect(parsed.__proto__.polluted).toBeUndefined();
    });

    test('Neutralizes constructor and prototype injection via safeJsonParse', () => {
      const payload = '{"constructor": {"prototype": {"pwned": true}}, "title": "Physics"}';

      const parsed = safeJsonParse(payload);
      expect(parsed).toBeDefined();
      expect(parsed.title).toBe('Physics');
      expect(({}).pwned).toBeUndefined();
      expect(Object.prototype.pwned).toBeUndefined();
    });

    test('Handles malformed JSON without throwing exceptions', () => {
      expect(safeJsonParse('{ not valid json }', { fallback: true })).toEqual({ fallback: true });
      expect(safeJsonParse(null, null)).toBeNull();
      expect(safeJsonParse('', 'default')).toBe('default');
    });

    test('Recursively sanitizes untrusted objects from external imports', () => {
      const untrusted = {
        name: 'Quantum Mechanics',
        phases: [
          {
            name: 'Phase 1',
            __proto__: { injected: true },
            tasks: [{ name: 'Task 1' }]
          }
        ],
        constructor: { prototype: { dangerous: true } }
      };

      const sanitized = sanitizeUntrustedObject(untrusted);
      expect(sanitized.name).toBe('Quantum Mechanics');
      expect(sanitized.phases[0].name).toBe('Phase 1');
      expect(Object.prototype.hasOwnProperty.call(sanitized, 'constructor')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(sanitized, '__proto__')).toBe(false);
      expect(({}).injected).toBeUndefined();
      expect(({}).dangerous).toBeUndefined();
    });
  });

  // ============================================================
  // 3. STORAGE PRIVACY & CREDENTIAL CONTAINMENT
  // ============================================================
  describe('3. Storage Privacy & Credential Containment', () => {
    test('Account identity storage does NOT contain raw OAuth tokens or passwords', () => {
      const account = getOrCreateAccount();
      expect(account).toBeDefined();
      expect(account.accountId).toMatch(/^usr_/);
      expect(account).not.toHaveProperty('password');
      expect(account).not.toHaveProperty('accessToken');
      expect(account).not.toHaveProperty('refreshToken');

      // Link external provider
      const linked = linkAuthProvider({
        provider: 'google',
        email: 'learner@example.com',
        displayName: 'Test Learner',
        uid: 'google-uid-12345'
      });

      expect(linked.accountId).toBe('usr_google-uid-12345');
      expect(linked).not.toHaveProperty('accessToken');
      expect(linked).not.toHaveProperty('idToken');
      expect(linked).not.toHaveProperty('clientSecret');

      const persisted = safeStorageGet(ACCOUNT_STORAGE_KEY, {});
      expect(persisted).not.toHaveProperty('accessToken');
      expect(persisted).not.toHaveProperty('refreshToken');
    });

    test('Telemetry normalization stores only summary intervals and app categories, never private history', () => {
      const rawTelemetry = {
        sessionId: 'sess_123',
        intendedSeconds: 1500,
        observedSeconds: 1500,
        interruptionCount: 1,
        interruptionSeconds: 30,
        appBreakdown: [
          { packageName: 'com.android.chrome', durationSeconds: 200, category: 'reference' }
        ],
        // Invasive fields that must NOT be passed or retained in the canonical model
        urlHistory: ['https://private.bank.com'],
        notificationText: 'Secret OTP message',
        screenshots: ['data:image/png;base64,...'],
        keystrokes: 'secret password'
      };

      const normalized = normalizeFocusTelemetry(rawTelemetry);
      expect(normalized.sessionId).toBe('sess_123');
      expect(normalized.interruptionCount).toBe(1);
      expect(normalized.interruptionSeconds).toBe(30);

      // Verify privacy model: no invasive capture fields in normalized telemetry
      expect(normalized).not.toHaveProperty('urlHistory');
      expect(normalized).not.toHaveProperty('notificationText');
      expect(normalized).not.toHaveProperty('screenshots');
      expect(normalized).not.toHaveProperty('keystrokes');
    });

    test('safeStorageInspect neutralizes prototype pollution from storage strings', () => {
      const poisonedRaw = '{"__proto__":{"storagePollution":true},"theme":"dark"}';
      window.localStorage.setItem('test_poison', poisonedRaw);

      const retrieved = safeStorageGet('test_poison', {});
      expect(retrieved.theme).toBe('dark');
      expect(({}).storagePollution).toBeUndefined();
      expect(Object.prototype.storagePollution).toBeUndefined();
    });
  });

  // ============================================================
  // 4. INFORMATION DISCLOSURE PREVENTION
  // ============================================================
  describe('4. Information Disclosure Prevention in UI Errors', () => {
    test('Strips internal Windows and POSIX filesystem paths from error messages', () => {
      const windowsError = 'Error: Cannot find module C:\\Users\\Administrator\\Projects\\app\\src\\secretModule.js';
      const posixError = 'Error reading file /Users/pranesh/todo app/src/config.json: permission denied';
      const cleanError = 'Task title cannot be empty.';

      expect(sanitizeErrorMessage(windowsError)).not.toContain('C:\\Users');
      expect(sanitizeErrorMessage(windowsError)).toContain('[internal path]');

      expect(sanitizeErrorMessage(posixError)).not.toContain('/Users/pranesh');
      expect(sanitizeErrorMessage(posixError)).toContain('[internal path]');

      expect(sanitizeErrorMessage(cleanError)).toBe('Task title cannot be empty.');
    });

    test('ErrorBoundary sanitizes error message before rendering in fallback UI', async () => {
      const ProblematicComponent = () => {
        throw new Error('Crash in C:\\Workspaces\\todo app\\src\\secretComponent.js line 42');
      };

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      // Suppress expected console.error during boundary crash
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        root.render(
          <ErrorBoundary fallbackTitle="Component Crash">
            <ProblematicComponent />
          </ErrorBoundary>
        );
      });

      expect(container.textContent).toContain('Component Crash');
      // Should NOT contain the local filesystem path
      expect(container.textContent).not.toContain('C:\\Workspaces');
      expect(container.textContent).toContain('[internal path]');

      consoleErrorSpy.mockRestore();
      root.unmount();
      container.remove();
    });
  });

  // ============================================================
  // 5. HONEST AUTH CONFIGURATION & ERROR DISCLOSURE
  // ============================================================
  describe('5. Honest Auth Error Disclosure', () => {
    test('Firebase error mapping provides helpful error without leaking internal credentials', () => {
      expect(mapFirebaseAuthError({ code: FIREBASE_AUTH_ERROR_CODES.CONFIG_MISSING }))
        .toContain('Firebase authentication is not configured');

      expect(mapFirebaseAuthError({ code: FIREBASE_AUTH_ERROR_CODES.POPUP_BLOCKED }))
        .toContain('Sign-in popup was blocked');

      expect(mapFirebaseAuthError({ code: FIREBASE_AUTH_ERROR_CODES.UNAUTHORIZED_DOMAIN }))
        .toContain('not authorized for Google Sign-In');

      expect(mapFirebaseAuthError({ code: FIREBASE_AUTH_ERROR_CODES.TOO_MANY_REQUESTS }))
        .toContain('Too many sign-in attempts');
    });
  });
});
