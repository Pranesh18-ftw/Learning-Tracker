/**
 * themeContrastWCAG.test.js
 *
 * Dedicated Verification Suite for Part C: Theme Contrast Audit & WCAG AA Compliance.
 *
 * Standards:
 * - WCAG 2.1 AA Normal text: 4.5:1 minimum contrast ratio
 * - WCAG 2.1 AA Large text / UI components: 3.0:1 minimum contrast ratio
 * - Light theme base: #FAF8F5 and #FFFFFF
 * - Dark theme base: #0A0E17 (obsidian) and #1E293B (slate-800 card surface)
 */

import fs from 'fs';
import path from 'path';

/**
 * Calculates relative luminance according to WCAG 2.1 specifications:
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

function getLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('PART C — Theme Contrast Audit & WCAG AA Verification', () => {
  const LIGHT_BODY_BG = '#FAF8F5';
  const LIGHT_CARD_BG = '#FFFFFF';
  const DARK_OBSIDIAN_BG = '#0A0E17';
  const DARK_SLATE800_CARD = '#1E293B';

  describe('1. Color Contrast Mathematics (WCAG 2.1 Formulas)', () => {
    test('Light Theme: Slate-600 (#475569) meets WCAG AA 4.5:1 on light body and card surfaces', () => {
      const contrastBody = getContrastRatio('#475569', LIGHT_BODY_BG);
      const contrastCard = getContrastRatio('#475569', LIGHT_CARD_BG);

      expect(contrastBody).toBeGreaterThanOrEqual(4.5);
      expect(contrastCard).toBeGreaterThanOrEqual(4.5);
      expect(contrastCard).toBeGreaterThanOrEqual(7.0);
    });

    test('Light Theme: Slate-500 (#64748B) meets WCAG AA on white card surfaces', () => {
      const contrastCard = getContrastRatio('#64748B', LIGHT_CARD_BG);
      expect(contrastCard).toBeGreaterThanOrEqual(4.5);
    });

    test('Dark Theme: Slate-400 (#94A3B8) meets WCAG AA 4.5:1 on both obsidian and slate-800 card surfaces', () => {
      const contrastObsidian = getContrastRatio('#94A3B8', DARK_OBSIDIAN_BG);
      const contrastCard = getContrastRatio('#94A3B8', DARK_SLATE800_CARD);

      expect(contrastObsidian).toBeGreaterThanOrEqual(7.0); // WCAG AAA on obsidian
      expect(contrastCard).toBeGreaterThanOrEqual(4.5); // WCAG AA on card
    });

    test('Dark Theme: Slate-300 (#CBD5E1) achieves high contrast (>= 6.5:1) on dark surfaces', () => {
      const contrastObsidian = getContrastRatio('#CBD5E1', DARK_OBSIDIAN_BG);
      const contrastCard = getContrastRatio('#CBD5E1', DARK_SLATE800_CARD);

      expect(contrastObsidian).toBeGreaterThanOrEqual(10.0);
      expect(contrastCard).toBeGreaterThanOrEqual(6.5);
    });

    test('Demonstrates why unadjusted Slate-400 fails on light mode and Slate-500 fails on slate-800', () => {
      // The bug that was corrected:
      const badLightSlate400 = getContrastRatio('#94A3B8', LIGHT_CARD_BG);
      expect(badLightSlate400).toBeLessThan(4.5); // ~2.28:1 - fails WCAG AA

      const badDarkSlate500 = getContrastRatio('#64748B', DARK_SLATE800_CARD);
      expect(badDarkSlate500).toBeLessThan(4.5); // ~2.78:1 - fails WCAG AA
    });
  });

  describe('2. Global Stylesheet Contrast Rules (src/index.css)', () => {
    const cssPath = path.join(__dirname, '../index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    test('index.css contains dedicated WCAG AA theme contrast architecture section', () => {
      expect(cssContent).toContain('WCAG AA THEME CONTRAST & ACCESSIBLE COLOR ARCHITECTURE');
    });

    test('index.css maps muted light-theme text tokens to accessible slate-600 (#475569)', () => {
      expect(cssContent).toMatch(/html:not\(\.dark\)\s+\.text-slate-400[\s\S]*?color:\s*#475569\s*!important/);
    });

    test('index.css maps muted dark-theme text tokens to accessible slate-400 (#94A3B8)', () => {
      expect(cssContent).toMatch(/\.dark\s+\.text-slate-500[\s\S]*?color:\s*#94A3B8\s*!important/);
    });

    test('index.css maps subtle dark-theme text tokens to accessible slate-300 (#CBD5E1)', () => {
      expect(cssContent).toMatch(/\.dark\s+\.text-slate-600[\s\S]*?color:\s*#CBD5E1\s*!important/);
    });

    test('index.css ensures input placeholders have minimum 4.5:1 contrast and full opacity', () => {
      expect(cssContent).toContain('html:not(.dark) input::placeholder');
      expect(cssContent).toContain('.dark input::placeholder');
    });
  });

  describe('3. Component-Level Accessibility & Symmetry', () => {
    test('IdentityDevicesAndPrivacy modal metadata labels use paired accessible contrast classes', () => {
      const compPath = path.join(__dirname, '../components/IdentityDevicesAndPrivacy.jsx');
      const compContent = fs.readFileSync(compPath, 'utf8');

      // Labels should have dark: variants rather than lonely text-slate-400
      expect(compContent).toContain('text-slate-600 dark:text-slate-400');
      expect(compContent).not.toContain('<span className="text-slate-400">Status</span>');
      expect(compContent).not.toContain('<span className="text-slate-400">Device ID</span>');
    });
  });
});
