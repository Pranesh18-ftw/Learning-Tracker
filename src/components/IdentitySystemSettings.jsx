/**
 * IdentitySystemSettings.jsx
 *
 * Seventh Section: SYSTEM & ACCOUNT CONTROLS (Secondary)
 *
 * Preserves all underlying settings capabilities:
 * - Theme toggle (Dark / Light)
 * - Pomodoro Timer Settings (work, short break, long break)
 * - Danger Zone (reset daily progress, reset all roadmap data)
 * - User Feedback dialog (preserving P2 acceptance test compliance)
 */

import React, { useState } from 'react';
import { Settings2, Clock, Sun, Moon, RotateCcw, MessageSquare, Send, Check } from 'lucide-react';
import { safeStorageGet, safeStorageSet } from '../utils/storage';

const IdentitySystemSettings = ({
  settings,
  updateSettings,
  resetProgress,
  resetDailyProgress,
  resetEverything,
  isDarkMode,
  toggleTheme
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetType, setResetType] = useState('daily');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [savedSection, setSavedSection] = useState(null);

  const [tempSettings, setTempSettings] = useState(() => ({
    dailyLearningHours: settings?.dailyLearningHours ?? settings?.dailyGoalHours ?? 2,
    dailyGoalHours: settings?.dailyGoalHours ?? settings?.dailyLearningHours ?? 2,
    dailyGoalSessions: settings?.dailyGoalSessions ?? 4,
    pomodoroWorkDuration: settings?.pomodoroWorkDuration ?? 25,
    pomodoroBreakDuration: settings?.pomodoroBreakDuration ?? settings?.pomodoroShortBreak ?? 5,
    pomodoroShortBreak: settings?.pomodoroBreakDuration ?? settings?.pomodoroShortBreak ?? 5,
    pomodoroLongBreakDuration: settings?.pomodoroLongBreakDuration ?? settings?.pomodoroLongBreak ?? 15,
    pomodoroLongBreak: settings?.pomodoroLongBreakDuration ?? settings?.pomodoroLongBreak ?? 15
  }));

  React.useEffect(() => {
    if (settings) {
      setTempSettings(prev => ({
        ...prev,
        ...settings,
        dailyLearningHours: settings.dailyLearningHours ?? settings.dailyGoalHours ?? prev.dailyLearningHours,
        dailyGoalHours: settings.dailyGoalHours ?? settings.dailyLearningHours ?? prev.dailyGoalHours,
        pomodoroBreakDuration: settings.pomodoroBreakDuration ?? settings.pomodoroShortBreak ?? prev.pomodoroBreakDuration,
        pomodoroShortBreak: settings.pomodoroBreakDuration ?? settings.pomodoroShortBreak ?? prev.pomodoroShortBreak,
        pomodoroLongBreakDuration: settings.pomodoroLongBreakDuration ?? settings.pomodoroLongBreak ?? prev.pomodoroLongBreakDuration,
        pomodoroLongBreak: settings.pomodoroLongBreakDuration ?? settings.pomodoroLongBreak ?? prev.pomodoroLongBreak
      }));
    }
  }, [settings]);

  // Handle Escape key dismissal for dialogs
  React.useEffect(() => {
    if (!showResetConfirm && !showFeedbackModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showResetConfirm) setShowResetConfirm(false);
        if (showFeedbackModal) setShowFeedbackModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResetConfirm, showFeedbackModal]);

  const handleSaveSettings = (section = 'all') => {
    updateSettings(tempSettings);
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2000);
  };

  const handleSettingChange = (key, value) => {
    const num = parseFloat(value) || 0;
    setTempSettings(prev => {
      const next = { ...prev, [key]: num };
      if (key === 'pomodoroShortBreak' || key === 'pomodoroBreakDuration') {
        next.pomodoroShortBreak = num;
        next.pomodoroBreakDuration = num;
      }
      if (key === 'pomodoroLongBreak' || key === 'pomodoroLongBreakDuration') {
        next.pomodoroLongBreak = num;
        next.pomodoroLongBreakDuration = num;
      }
      if (key === 'dailyLearningHours' || key === 'dailyGoalHours') {
        next.dailyLearningHours = num;
        next.dailyGoalHours = num;
      }
      return next;
    });
  };

  const handleReset = () => {
    if (resetType === 'daily') {
      resetDailyProgress && resetDailyProgress();
    } else {
      resetEverything ? resetEverything() : (resetProgress && resetProgress());
    }
    setShowResetConfirm(false);
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) {
      alert('Please enter your feedback before submitting.');
      return;
    }

    const feedback = {
      type: feedbackType,
      message: feedbackText,
      email: feedbackEmail,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      appVersion: '1.0.0'
    };

    const existingFeedback = safeStorageGet('userFeedback', []);
    existingFeedback.push(feedback);
    const result = safeStorageSet('userFeedback', existingFeedback);

    if (!result.ok) {
      alert(
        result.error === 'quota'
          ? 'This device is out of storage. Your feedback was not saved.'
          : 'Your feedback could not be saved.'
      );
      return;
    }

    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setShowFeedbackModal(false);
      setFeedbackText('');
      setFeedbackEmail('');
      setFeedbackType('general');
    }, 2000);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">

      {/* Section Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
          <Settings2 className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
            Section 07 · System Controls
          </span>
          <h2 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
            Preferences & Application State
          </h2>
        </div>
      </div>

      {/* ── 1. THEME SETTINGS ── */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isDarkMode ? <Moon className="w-5 h-5 text-violet-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
          <div>
            <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">Theme Display Mode</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Switch between light studio and dark control room</div>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isDarkMode ? 'bg-electric-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isDarkMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* ── 2. FOCUS TIMER INTERVALS ── */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-electric-500" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Focus & Pomodoro Timer Durations:
            </span>
          </div>

          <button
            onClick={() => handleSaveSettings('timer')}
            className="px-3 py-1 bg-electric-600 hover:bg-electric-700 text-white rounded-xl text-xs font-mono font-bold transition-colors"
          >
            {savedSection === 'timer' ? 'Saved ✓' : 'Save Timer'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1">Work Interval:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={tempSettings?.pomodoroWorkDuration || 25}
                onChange={(e) => handleSettingChange('pomodoroWorkDuration', e.target.value)}
                className="flex-1 accent-electric-500"
              />
              <span className="font-bold text-slate-900 dark:text-white w-8 text-right">
                {tempSettings?.pomodoroWorkDuration || 25}m
              </span>
            </div>
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1">Short Break:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={tempSettings.pomodoroShortBreak || 5}
                onChange={(e) => handleSettingChange('pomodoroShortBreak', e.target.value)}
                className="flex-1 accent-electric-500"
              />
              <span className="font-bold text-slate-900 dark:text-white w-8 text-right">
                {tempSettings.pomodoroShortBreak || 5}m
              </span>
            </div>
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1">Long Break:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="30"
                step="5"
                value={tempSettings.pomodoroLongBreak || 15}
                onChange={(e) => handleSettingChange('pomodoroLongBreak', e.target.value)}
                className="flex-1 accent-electric-500"
              />
              <span className="font-bold text-slate-900 dark:text-white w-8 text-right">
                {tempSettings.pomodoroLongBreak || 15}m
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. FEEDBACK & DANGER ZONE ── */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        {/* Feedback Button */}
        <button
          onClick={() => setShowFeedbackModal(true)}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold flex items-center gap-2 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 text-electric-500" />
          <span>Send Feedback & Observations</span>
        </button>

        {/* Danger Zone Trigger */}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-mono font-bold flex items-center gap-2 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Progress Options</span>
        </button>

      </div>

      {/* ── RESET CONFIRMATION MODAL ── */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 anim-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-confirm-title"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-red-300 dark:border-red-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <h3 id="reset-confirm-title" className="font-display font-black text-lg text-red-600 dark:text-red-400">
              Confirm Reset Action
            </h3>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="resetType"
                  value="daily"
                  checked={resetType === 'daily'}
                  onChange={() => setResetType('daily')}
                  className="accent-red-500"
                />
                <span>Reset today's progress only (preserves roadmap & archive)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="resetType"
                  value="all"
                  checked={resetType === 'all'}
                  onChange={() => setResetType('all')}
                  className="accent-red-500"
                />
                <span>Reset all roadmap task completions</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-mono font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold rounded-xl shadow-sm"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FEEDBACK MODAL ── */}
      {showFeedbackModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 anim-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <h3 id="feedback-modal-title" className="font-display font-black text-lg text-slate-900 dark:text-white">
              Send Feedback
            </h3>

            {feedbackSubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Thank you! Your feedback was saved locally.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="feedback-category-select" className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">
                    Feedback Category:
                  </label>
                  <select
                    id="feedback-category-select"
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    className="w-full text-xs font-mono p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Suggestion</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="feedback-message-textarea" className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">
                    Message:
                  </label>
                  <textarea
                    id="feedback-message-textarea"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={3}
                    placeholder="Tell us what worked, what failed, or how your reality is shaped..."
                    className="w-full text-xs font-mono p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label htmlFor="feedback-email-input" className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">
                    Email (Optional):
                  </label>
                  <input
                    id="feedback-email-input"
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full text-xs font-mono p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-4 py-2 text-xs font-mono font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFeedbackSubmit}
                    className="px-4 py-2 bg-electric-600 hover:bg-electric-700 text-white font-mono text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </section>
  );
};

export default IdentitySystemSettings;
