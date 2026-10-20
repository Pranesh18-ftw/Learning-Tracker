/**
 * firebase.js
 *
 * Modular Firebase Web SDK initialization and authentication helpers.
 * Configured entirely through environment variables (REACT_APP_FIREBASE_*).
 *
 * Never commits credentials/secrets to source control.
 * Fails visibly and honestly if configuration is absent.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';

export function getFirebaseConfig() {
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
  };
}

/**
 * Checks whether mandatory Firebase environment variables are configured.
 */
export function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.appId &&
    !config.apiKey.includes('YOUR_') &&
    config.apiKey.trim().length > 0
  );
}

/**
 * Returns active Firebase App instance or initializes one if configured.
 * Returns null if environment variables are missing.
 */
export function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    return null;
  }
  const existingApps = (typeof getApps === 'function' && getApps()) || [];
  return existingApps.length > 0 ? getApp() : initializeApp(getFirebaseConfig());
}

/**
 * Returns active Firebase Auth instance.
 * Returns null if Firebase is not configured.
 */
export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app || typeof getAuth !== 'function') {
    return null;
  }
  return getAuth(app);
}

/**
 * Returns configured GoogleAuthProvider instance.
 */
export function getGoogleAuthProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
}

export const FIREBASE_AUTH_ERROR_CODES = {
  CONFIG_MISSING: 'auth/configuration-missing',
  POPUP_BLOCKED: 'auth/popup-blocked',
  POPUP_CLOSED: 'auth/popup-closed-by-user',
  UNAUTHORIZED_DOMAIN: 'auth/unauthorized-domain',
  PROVIDER_DISABLED: 'auth/operation-not-allowed',
  NETWORK_REQUEST_FAILED: 'auth/network-request-failed',
  ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL: 'auth/account-exists-with-different-credential',
  INVALID_CREDENTIAL: 'auth/invalid-credential',
  USER_DISABLED: 'auth/user-disabled',
  TOO_MANY_REQUESTS: 'auth/too-many-requests'
};

/**
 * Maps raw Firebase Auth errors to honest, human-readable explanations.
 */
export function mapFirebaseAuthError(error) {
  if (!error) return 'An unknown authentication error occurred.';
  const code = error.code || '';

  switch (code) {
    case FIREBASE_AUTH_ERROR_CODES.CONFIG_MISSING:
      return 'Firebase authentication is not configured. Missing REACT_APP_FIREBASE_* environment variables.';
    case FIREBASE_AUTH_ERROR_CODES.POPUP_BLOCKED:
      return 'Sign-in popup was blocked by your browser. Please allow popups or use redirect.';
    case FIREBASE_AUTH_ERROR_CODES.POPUP_CLOSED:
      return 'Sign-in popup was closed before completing authentication.';
    case FIREBASE_AUTH_ERROR_CODES.UNAUTHORIZED_DOMAIN:
      return 'This domain is not authorized for Google Sign-In in Firebase Console.';
    case FIREBASE_AUTH_ERROR_CODES.PROVIDER_DISABLED:
      return 'Google sign-in provider is disabled in Firebase Console. Enable it in Authentication > Sign-in method.';
    case FIREBASE_AUTH_ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'Network connection error. Check your internet connection and try again.';
    case FIREBASE_AUTH_ERROR_CODES.ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL:
      return 'An account already exists with the same email using a different sign-in provider.';
    case FIREBASE_AUTH_ERROR_CODES.USER_DISABLED:
      return 'This user account has been disabled.';
    case FIREBASE_AUTH_ERROR_CODES.TOO_MANY_REQUESTS:
      return 'Too many sign-in attempts. Please try again later.';
    default:
      return error.message || 'Authentication could not be completed.';
  }
}

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  firebaseSignOut,
  onAuthStateChanged
};
