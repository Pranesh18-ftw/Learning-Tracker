import React, { useState, useEffect } from 'react';
import { Moon, Sun, Activity, Zap, Search } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';
import GlobalCommandPalette from './GlobalCommandPalette';
import GoogleSignInModal from './GoogleSignInModal';

/**
 * Topbar
 * V4 Colorful, Tactile & Truthful Navigation
 * - Bold branding with colorful accents
 * - Domain selector with subject-aware accenting
 * - Global search / command palette trigger (Ctrl+K)
 * - Calm rhythm indicator ("3-day rhythm", no toxic streak pressure)
 * - Tactile navigation pills with preserved test IDs
 * - Theme toggle
 * - Account identity status & Google sign-in trigger
 */
const Topbar = ({ activeTab, setActiveTab, streakCount: propStreakCount }) => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsPaletteOpen(true);
    window.addEventListener('open-command-palette', handleOpen);
    return () => window.removeEventListener('open-command-palette', handleOpen);
  }, []);

  const roadmapContext = useRoadmap() || {};
  const {
    isDarkMode,
    toggleTheme,
    subjects,
    selectedSubjectId,
    setSelectedSubjectId,
    streakCount = 0,
    calculateStreak,
    account,
    isAuthInitializing,
    refreshAccount,
    logoutAccount
  } = roadmapContext;

  const resolvedStreak = propStreakCount !== undefined ? propStreakCount : streakCount;
  const effectiveStreak = typeof resolvedStreak === 'number' && !isNaN(resolvedStreak)
    ? resolvedStreak
    : (typeof calculateStreak === 'function' ? calculateStreak() : 0);

  const navItems = [
    { id: 'dashboard', label: 'Now', icon: '⚡' },
    { id: 'roadmap', label: 'World', icon: '🗺️' },
    { id: 'learning-plan', label: 'Path', icon: '🧭' },
    { id: 'stats', label: 'Growth', icon: '📈' },
    { id: 'achievements', label: 'Archive', icon: '🏛️' },
    { id: 'trajectory', label: 'Trajectory', icon: '🎯' },
    { id: 'settings', label: 'Identity', icon: '🎛️' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b-2 border-slate-200 dark:border-slate-800 transition-colors">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">

          {/* ── BRAND & ACTIVE DOMAIN ── */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              aria-label="Learning Tracker Home"
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

            {/* Domain Selector Pill */}
            {subjects && subjects.length > 0 && (
              <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                <span className="mr-1.5 opacity-60">Domain:</span>
                <select
                  aria-label="Select learning domain"
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
          <nav
            aria-label="Main navigation"
            className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none min-w-0 py-0.5"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isDisabled = false;

              return (
                <button
                  key={item.id}
                  id={`${item.id}-nav-item`}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all flex items-center gap-1 sm:gap-1.5 ${
                    isActive
                      ? 'bg-electric-600 text-white shadow-md shadow-blue-500/20 translate-y-[-1px]'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                >
                  <span className="text-xs sm:text-sm shrink-0" aria-hidden="true">{item.icon}</span>
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ── SEARCH, CALM RHYTHM & THEME CONTROLS ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Command / Search Palette Trigger */}
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-mono transition-colors shadow-2xs cursor-pointer"
              title="Search concepts, projects, and capabilities (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search learning...</span>
              <kbd className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Mobile / Compact Search Icon Button */}
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              aria-label="Search learning"
              className="xl:hidden w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Search className="w-4 h-4 text-slate-500" />
            </button>

            {/* Calmer rhythm presentation: e.g. "3-day rhythm", or "Fresh start" if 0 */}
            <div
              title={effectiveStreak > 0 ? "Consecutive active learning rhythm" : "No active learning rhythm recorded yet"}
              className="hidden 2xl:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs"
            >
              <Activity className={`w-3.5 h-3.5 ${effectiveStreak > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>{effectiveStreak > 0 ? `${effectiveStreak}-day rhythm` : 'Fresh start'}</span>
            </div>

            {/* Account / Google Identity Status Area */}
            {isAuthInitializing ? (
              <div
                id="auth-initializing-state"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium select-none"
                title="Checking authentication..."
              >
                <span className="w-2 h-2 rounded-full bg-electric-500 animate-ping shrink-0" />
                <span className="hidden sm:inline text-[11px] font-semibold">Verifying...</span>
              </div>
            ) : account?.authProvider === 'google' ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="google-connected-pill"
                  onClick={() => setActiveTab('settings')}
                  title={`Connected as ${account.displayName || account.email || 'Learner'} (ID: LT-${(account.accountId || '').slice(-6).toUpperCase()})`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-xs"
                >
                  {account.avatar ? (
                    <img
                      src={account.avatar}
                      alt={account.displayName || 'Google Account'}
                      className="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {account.displayName ? account.displayName.split(' ')[0] : 'Google'}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 hidden sm:inline">●</span>
                </button>

                <button
                  type="button"
                  id="topbar-signout-btn"
                  onClick={async () => {
                    if (logoutAccount) await logoutAccount();
                    else if (refreshAccount) refreshAccount();
                  }}
                  title="Sign out of Google"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-mono font-semibold transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="google-signin-btn"
                onClick={() => setShowAuthModal(true)}
                title="Continue with Google"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-xs font-mono font-bold shadow-xs hover:shadow transition-all cursor-pointer shrink-0"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="hidden sm:inline">Continue with Google</span>
                <span className="sm:hidden">Google</span>
              </button>
            )}

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

      {/* Global Command Palette */}
      <GlobalCommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
      />

      {/* Google Sign-In & Minimal Onboarding Modal */}
      <GoogleSignInModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          refreshAccount && refreshAccount();
        }}
      />
    </header>
  );
};

export default Topbar;
