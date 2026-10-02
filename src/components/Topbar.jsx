import React from 'react';
import { Moon, Sun, Flame, Zap } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';

/**
 * Topbar
 * V4 Colorful, Tactile & Alive Navigation
 * - Bold branding with colorful accents
 * - Quick subject switch dropdown
 * - Streak flame badge with golden amber glow
 * - Tactile navigation pills with exact test IDs
 * - Theme toggle
 */
const Topbar = ({ activeTab, setActiveTab }) => {
  const { 
    isDarkMode, 
    toggleTheme, 
    showTutorial, 
    hasImportedRoadmap,
    subjects,
    selectedSubjectId,
    setSelectedSubjectId,
    streakCount = 3
  } = useRoadmap();

  const navItems = [
    { id: 'dashboard', label: 'Now', icon: '⚡' },
    { id: 'roadmap', label: 'World', icon: '🗺️' },
    { id: 'learning-plan', label: 'Path', icon: '🧭' },
    { id: 'stats', label: 'Growth', icon: '📈' },
    { id: 'achievements', label: 'Archive', icon: '🏆' },
    { id: 'settings', label: 'Identity', icon: '⚙️' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b-2 border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* ── BRAND & ACTIVE DOMAIN ── */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-electric-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div className="hidden sm:block">
                <span className="font-display font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
                  Learning Tracker
                </span>
                <span className="text-[11px] font-semibold text-electric-600 dark:text-electric-400 font-sans">
                  STEM Studio
                </span>
              </div>
            </button>

            {/* Subject Selector Pill */}
            {subjects && subjects.length > 0 && (
              <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                <span className="mr-1.5 opacity-60">Domain:</span>
                <select
                  value={selectedSubjectId || ''}
                  onChange={(e) => setSelectedSubjectId(e.target.value || null)}
                  className="bg-transparent font-bold text-electric-600 dark:text-electric-400 focus:outline-none cursor-pointer"
                >
                  <option value="">All Domains</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id} className="dark:bg-slate-900">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── TACTILE NAVIGATION PILLS ── */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isDisabled = showTutorial && !hasImportedRoadmap && item.id !== 'roadmap';

              return (
                <button
                  key={item.id}
                  id={`${item.id}-nav-item`}
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    setActiveTab(item.id);
                  }}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-electric-600 text-white shadow-md shadow-blue-500/20 translate-y-[-1px]'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                >
                  <span className="text-xs sm:text-sm">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ── STREAK & THEME CONTROLS ── */}
          <div className="flex items-center gap-2.5">
            {/* Streak Flame Pill */}
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 shadow-xs">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-bounce" style={{ animationDuration: '2s' }} />
              <span>{streakCount || 1}d</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 rounded-xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400 fill-amber-400" /> : <Moon className="w-4 h-4 text-slate-700 fill-slate-700" />}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Topbar;
