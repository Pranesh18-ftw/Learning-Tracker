/**
 * WallpaperCustomizerModal.jsx
 *
 * Glassmorphic Wallpaper & Adaptive Theme Color Customizer.
 * Allows learners to upload their own background picture or pick curated presets.
 * Automatically samples the image and adapts the UI accent and ambient glow colors.
 */

import React, { useState, useRef } from 'react';
import { X, Upload, RefreshCw, Check, Palette } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';
import { CURATED_WALLPAPERS } from '../utils/wallpaperManager';

export const WallpaperCustomizerModal = ({ isOpen, onClose }) => {
  const {
    wallpaper,
    setCustomWallpaper,
    resetWallpaper,
    palette
  } = useRoadmap();

  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedbackMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setIsProcessing(true);
    setFeedbackMsg('Analyzing picture and extracting theme colors...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        await setCustomWallpaper(dataUrl);
        setFeedbackMsg('Wallpaper applied! Adaptive theme colors updated.');
      }
      setIsProcessing(false);
      setTimeout(() => setFeedbackMsg(''), 3000);
    };

    reader.onerror = () => {
      setIsProcessing(false);
      setFeedbackMsg('Failed to read image file.');
    };

    reader.readAsDataURL(file);
  };

  const handleSelectPreset = async (preset) => {
    setIsProcessing(true);
    await setCustomWallpaper(preset.url, preset.palette);
    setIsProcessing(false);
    setFeedbackMsg(`Applied "${preset.name}" preset.`);
    setTimeout(() => setFeedbackMsg(''), 2500);
  };

  const handleReset = () => {
    resetWallpaper();
    setFeedbackMsg('Restored default ambient wallpaper and colors.');
    setTimeout(() => setFeedbackMsg(''), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 anim-pop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallpaper-customizer-title"
    >
      <div className="w-full max-w-xl tile-tactile p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl border border-white/20">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md border border-white/30"
              style={{ background: palette?.accent || '#F97316' }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 id="wallpaper-customizer-title" className="font-display font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                Wallpaper & Adaptive Theme
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a background picture — glassmorphism & accent colors will adapt automatically
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Extracted Color Swatches */}
        <div className="glass-panel-warm-interactive p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Active Adaptive Palette:
            </span>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full shadow-md border-2 border-white/80"
                style={{ backgroundColor: palette?.accent || '#F97316' }}
                title={`Accent: ${palette?.accent}`}
              />
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {palette?.accent || '#F97316'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            <span>Extracted from background</span>
          </div>
        </div>

        {/* Upload Custom Picture Box */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Upload Custom Background
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-amber-400 dark:hover:border-amber-400 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5 flex flex-col items-center justify-center gap-2 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform"
              style={{ background: palette?.accent || '#F97316' }}
            >
              {isProcessing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isProcessing ? 'Analyzing picture & extracting colors...' : 'Click or drag image to upload'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              JPG, PNG, WebP supported · High resolution recommended
            </div>
          </div>
        </div>

        {/* Curated Presets Grid */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Or Choose A Curated Atmosphere
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CURATED_WALLPAPERS.map((preset) => {
              const isActive = wallpaper === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`relative rounded-xl overflow-hidden text-left border transition-all p-2 flex flex-col gap-1.5 group cursor-pointer ${
                    isActive
                      ? 'border-2 border-amber-400 ring-2 ring-amber-400/30'
                      : 'border-slate-200 dark:border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="h-16 w-full rounded-lg bg-cover bg-center relative overflow-hidden" style={{ backgroundImage: `url(${preset.url})` }}>
                    {isActive && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {preset.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: preset.palette.accent }}
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {preset.category}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback notification */}
        {feedbackMsg && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2 anim-pop">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full font-bold text-xs text-white shadow-md cursor-pointer transition-all"
            style={{
              background: `linear-gradient(135deg, ${palette?.accent || '#F97316'} 0%, ${palette?.accentHover || '#EA580C'} 100%)`
            }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default WallpaperCustomizerModal;
