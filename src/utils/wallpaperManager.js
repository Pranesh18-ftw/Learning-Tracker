/**
 * wallpaperManager.js
 *
 * Manages custom glassmorphism wallpaper backgrounds, curated preset themes,
 * and client-side dynamic color extraction via offscreen Canvas.
 *
 * Guarantees:
 * - Real-time extraction of dominant accent and ambient orb colors from any uploaded image.
 * - Dynamic injection of CSS variables (--theme-accent, --theme-glow, --theme-orb-1, --theme-orb-2).
 * - Safe persistence in localStorage with fallbacks.
 * - Clean differentiation between light and dark glassmorphic themes.
 */

import dashboardAmbientBg from '../assets/dashboard/dashboard_ambient_bg.jpg';

export const WALLPAPER_STORAGE_KEY = 'learningTracker_customWallpaper';
export const PALETTE_STORAGE_KEY = 'learningTracker_adaptivePalette';

// Curated high-res glassmorphic presets with precomputed harmonious palettes
export const CURATED_WALLPAPERS = [
  {
    id: 'loft-default',
    name: 'Cozy Study Loft',
    category: 'Warm & Natural',
    url: dashboardAmbientBg,
    palette: {
      accent: '#F97316',
      accentHover: '#EA580C',
      accentGlow: 'rgba(249, 115, 22, 0.45)',
      orb1: 'rgba(245, 158, 11, 0.22)',
      orb2: 'rgba(217, 119, 6, 0.14)',
      tintDark: 'rgba(18, 22, 34, 0.46)',
      tintLight: 'rgba(255, 255, 255, 0.78)'
    }
  },
  {
    id: 'cyber-nebula',
    name: 'Cosmic Sapphire',
    category: 'Deep Space',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1920&auto=format&fit=crop',
    palette: {
      accent: '#06B6D4',
      accentHover: '#0891B2',
      accentGlow: 'rgba(6, 182, 212, 0.45)',
      orb1: 'rgba(14, 165, 233, 0.24)',
      orb2: 'rgba(99, 102, 241, 0.18)',
      tintDark: 'rgba(14, 19, 36, 0.48)',
      tintLight: 'rgba(248, 250, 252, 0.82)'
    }
  },
  {
    id: 'emerald-aurora',
    name: 'Emerald Aurora',
    category: 'Vibrant Nature',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
    palette: {
      accent: '#10B981',
      accentHover: '#059669',
      accentGlow: 'rgba(16, 185, 129, 0.45)',
      orb1: 'rgba(16, 185, 129, 0.22)',
      orb2: 'rgba(20, 184, 166, 0.16)',
      tintDark: 'rgba(13, 24, 25, 0.48)',
      tintLight: 'rgba(240, 253, 244, 0.82)'
    }
  },
  {
    id: 'sunset-amber',
    name: 'Golden Alpine',
    category: 'Atmospheric',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1920&auto=format&fit=crop',
    palette: {
      accent: '#F59E0B',
      accentHover: '#D97706',
      accentGlow: 'rgba(245, 158, 11, 0.45)',
      orb1: 'rgba(251, 146, 60, 0.24)',
      orb2: 'rgba(245, 158, 11, 0.16)',
      tintDark: 'rgba(24, 20, 26, 0.48)',
      tintLight: 'rgba(255, 251, 235, 0.82)'
    }
  }
];

/**
 * Extracts dominant vibrant and ambient colors from an image URL or base64 DataURL
 * via an offscreen HTML5 canvas element.
 */
export function extractDominantColorsFromImage(imageSrc) {
  return new Promise((resolve) => {
    const fallbackPalette = CURATED_WALLPAPERS[0].palette;
    if (!imageSrc) {
      resolve(fallbackPalette);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const sampleSize = 64;
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

        let totalR = 0, totalG = 0, totalB = 0;
        let count = 0;

        let bestVibrant = null;
        let maxScore = -1;

        // Sample pixels
        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 128) continue;

          totalR += r;
          totalG += g;
          totalB += b;
          count++;

          // Convert to HSL to evaluate vibrancy and saturation
          const max = Math.max(r, g, b) / 255;
          const min = Math.min(r, g, b) / 255;
          const l = (max + min) / 2;
          const s = max === min ? 0 : (l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min));

          // Favor medium-luminance, high-saturation colors for UI buttons/accents
          if (l >= 0.25 && l <= 0.80) {
            const score = s * 2 + (1 - Math.abs(l - 0.5));
            if (score > maxScore) {
              maxScore = score;
              bestVibrant = { r, g, b };
            }
          }
        }

        const avgR = count > 0 ? Math.round(totalR / count) : 249;
        const avgG = count > 0 ? Math.round(totalG / count) : 115;
        const avgB = count > 0 ? Math.round(totalB / count) : 22;

        const accentR = bestVibrant ? bestVibrant.r : avgR;
        const accentG = bestVibrant ? bestVibrant.g : avgG;
        const accentB = bestVibrant ? bestVibrant.b : avgB;

        const toHex = (n) => n.toString(16).padStart(2, '0');
        const accentHex = `#${toHex(accentR)}${toHex(accentG)}${toHex(accentB)}`;

        // Calculate slightly darker hover shade
        const hoverR = Math.max(0, Math.round(accentR * 0.85));
        const hoverG = Math.max(0, Math.round(accentG * 0.85));
        const hoverB = Math.max(0, Math.round(accentB * 0.85));
        const hoverHex = `#${toHex(hoverR)}${toHex(hoverG)}${toHex(hoverB)}`;

        const palette = {
          accent: accentHex,
          accentHover: hoverHex,
          accentGlow: `rgba(${accentR}, ${accentG}, ${accentB}, 0.50)`,
          orb1: `rgba(${accentR}, ${accentG}, ${accentB}, 0.26)`,
          orb2: `rgba(${avgR}, ${avgG}, ${avgB}, 0.18)`,
          tintDark: `rgba(${Math.min(30, Math.round(avgR * 0.15))}, ${Math.min(35, Math.round(avgG * 0.15))}, ${Math.min(50, Math.round(avgB * 0.20))}, 0.50)`,
          tintLight: `rgba(255, 255, 255, 0.80)`
        };

        resolve(palette);
      } catch (err) {
        console.warn('Canvas color extraction error:', err);
        resolve(fallbackPalette);
      }
    };

    img.onerror = () => {
      resolve(fallbackPalette);
    };

    img.src = imageSrc;
  });
}

/**
 * Applies palette variables to document.documentElement
 */
export function applyThemeVariables(palette) {
  if (!palette || typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--theme-accent', palette.accent);
  root.style.setProperty('--theme-accent-hover', palette.accentHover);
  root.style.setProperty('--theme-accent-glow', palette.accentGlow);
  root.style.setProperty('--theme-orb-1', palette.orb1);
  root.style.setProperty('--theme-orb-2', palette.orb2);
  root.style.setProperty('--theme-tint-dark', palette.tintDark);
  root.style.setProperty('--theme-tint-light', palette.tintLight);
}

/**
 * Reads custom wallpaper from localStorage
 */
export function getSavedWallpaper() {
  try {
    return localStorage.getItem(WALLPAPER_STORAGE_KEY) || dashboardAmbientBg;
  } catch (e) {
    return dashboardAmbientBg;
  }
}

/**
 * Reads saved adaptive palette from localStorage
 */
export function getSavedPalette() {
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : CURATED_WALLPAPERS[0].palette;
  } catch (e) {
    return CURATED_WALLPAPERS[0].palette;
  }
}
