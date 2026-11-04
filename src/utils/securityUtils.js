/* eslint-disable no-script-url */
/**
 * securityUtils.js
 *
 * Production Security & Defensive Hardening Utilities (P2.2).
 *
 * Enforces security boundaries:
 * 1. Safe URL validation & sanitization (mitigates XSS via javascript:, vbscript:, data: links, and reverse-tabnabbing).
 * 2. Prototype pollution defense for untrusted JSON/object parsing (mitigates __proto__, constructor, prototype pollution).
 * 3. Information disclosure prevention (strips internal filesystem paths from user-facing error messages).
 */

const DANGEROUS_PROTOCOLS = ['javascript:', 'vbscript:', 'data:', 'file:'];
const ALLOWED_WEB_PROTOCOLS = ['http:', 'https:'];

/**
 * Validates whether a given URL is safe for external navigation or rendering.
 * Allows standard web schemes (https:, http:) and relative paths (/path, #anchor).
 * Rejects javascript:, data:, vbscript:, file:, and malformed protocol payloads.
 *
 * @param {string} url - Candidate URL
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;

  // Strip leading/trailing whitespace and control/invisible characters
  // eslint-disable-next-line no-control-regex
  const sanitized = url.replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, '').trim();
  if (!sanitized) return false;

  const lower = sanitized.toLowerCase();

  // Check directly for dangerous protocol prefixes
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(protocol)) return false;
  }

  // Safe relative paths
  if (sanitized.startsWith('/') || sanitized.startsWith('./') || sanitized.startsWith('../') || sanitized.startsWith('#')) {
    return true;
  }

  // Check for absolute protocol
  try {
    const parsed = new URL(sanitized, 'https://learningtracker.local');
    // If it was parsed as a full URL with an explicit protocol
    if (sanitized.includes(':')) {
      return ALLOWED_WEB_PROTOCOLS.includes(parsed.protocol);
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Sanitizes an external URL, falling back to a safe placeholder if invalid or dangerous.
 *
 * @param {string} url - Candidate URL
 * @param {string} fallback - Safe fallback (default '#')
 * @returns {string}
 */
export function sanitizeExternalUrl(url, fallback = '#') {
  if (isSafeUrl(url)) {
    return url.trim();
  }
  return fallback;
}

/**
 * Returns safe anchor attributes for external navigation, enforcing noopener noreferrer.
 *
 * @param {string} url - Candidate external URL
 * @param {string} fallback - Safe fallback URL
 * @returns {{ href: string, target: string, rel: string }}
 */
export function getSafeExternalLinkProps(url, fallback = '#') {
  return {
    href: sanitizeExternalUrl(url, fallback),
    target: '_blank',
    rel: 'noopener noreferrer'
  };
}

/**
 * Safely parses a JSON string while stripping prototype-polluting keys (__proto__, constructor, prototype).
 *
 * @param {string} text - JSON string to parse
 * @param {any} fallback - Value to return on parse error (default null)
 * @returns {any}
 */
export function safeJsonParse(text, fallback = null) {
  if (typeof text !== 'string') return fallback;
  try {
    return JSON.parse(text, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined; // neutralized & stripped from parsed object
      }
      return value;
    });
  } catch {
    return fallback;
  }
}

/**
 * Deeply sanitizes an untrusted JavaScript object, removing any __proto__,
 * constructor, or prototype properties that could pollute object prototypes.
 *
 * @param {any} data - Untrusted input object/array
 * @returns {any}
 */
export function sanitizeUntrustedObject(data) {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeUntrustedObject);
  }

  const clean = Object.create(null);
  for (const [key, val] of Object.entries(data)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    clean[key] = sanitizeUntrustedObject(val);
  }

  return { ...clean };
}

/**
 * Sanitizes technical error messages before display in user-facing UI,
 * stripping internal file system paths (Windows and POSIX).
 *
 * @param {string|Error} error - Error or message string
 * @returns {string}
 */
export function sanitizeErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.';
  const message = typeof error === 'string' ? error : (error.message || String(error));

  return message
    // Strip Windows paths (e.g., C:\Users\... or \\server\share\...)
    .replace(/[a-zA-Z]:\\[^\\/:*?"<>|\r\n]+/g, '[internal path]')
    // Strip POSIX paths (e.g., /Users/..., /home/..., /var/...)
    .replace(/(?:\/(?:Users|home|root|var|tmp|etc|usr|opt|app|src|node_modules)[^\s:]+)/g, '[internal path]');
}
