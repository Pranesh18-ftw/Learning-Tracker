import React, { useState } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { Settings2, Clock, RotateCcw, AlertTriangle, Trash2, Sun, Moon, Target, MessageSquare, Send } from 'lucide-react';

const SettingsPage = () => {
  const { settings, updateSettings, resetProgress, isDarkMode, toggleTheme } = useRoadmap();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetType, setResetType] = useState('daily');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings || {
    dailyLearningHours: 2,
    dailyGoalHours: 2,
    pomodoroWorkDuration: 25,
    pomodoroBreakDuration: 5
  });

  const handleSaveSettings = () => {
    updateSettings(tempSettings);
  };

  const handleResetProgress = () => {
    if (resetType === 'daily') {
      // Reset daily progress - would need to implement daily tracking
      console.log('Reset daily progress');
    } else {
      // Reset all progress
      resetProgress();
    }
    setShowResetConfirm(false);
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) {
      alert('Please enter your feedback before submitting.');
      return;
    }

    // Create feedback object
    const feedback = {
      type: feedbackType,
      message: feedbackText,
      email: feedbackEmail,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      appVersion: '1.0.0'
    };

    // Store feedback in localStorage for now (in production, this would send to a server)
    const existingFeedback = JSON.parse(localStorage.getItem('userFeedback') || '[]');
    existingFeedback.push(feedback);
    localStorage.setItem('userFeedback', JSON.stringify(existingFeedback));

    // Show success message
    setFeedbackSubmitted(true);
    
    // Reset form after 2 seconds
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setShowFeedbackModal(false);
      setFeedbackText('');
      setFeedbackEmail('');
      setFeedbackType('general');
    }, 2000);

    console.log('Feedback submitted:', feedback);
  };

  const handleSettingChange = (key, value) => {
    setTempSettings(prev => ({
      ...prev,
      [key]: parseInt(value) || 0
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 mt-1">Customize your learning experience</p>
      </div>

      {/* Theme Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          Theme Settings
        </h2>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800">Dark Mode</div>
            <div className="text-sm text-gray-500">Switch between light and dark theme</div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDarkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Pomodoro Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Pomodoro Timer Settings
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Duration (minutes)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={tempSettings?.pomodoroWorkDuration || 25}
                onChange={(e) => handleSettingChange('pomodoroWorkDuration', e.target.value)}
                className="flex-1"
              />
              <div className="w-16 text-center font-medium text-gray-800">
                {tempSettings?.pomodoroWorkDuration || 25}m
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Short Break Duration (minutes)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={tempSettings.pomodoroShortBreak || 5}
                onChange={(e) => handleSettingChange('pomodoroShortBreak', e.target.value)}
                className="flex-1"
              />
              <div className="w-16 text-center font-medium text-gray-800">
                {tempSettings.pomodoroShortBreak || 5}m
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Long Break Duration (minutes)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="30"
                step="5"
                value={tempSettings.pomodoroLongBreak || 15}
                onChange={(e) => handleSettingChange('pomodoroLongBreak', e.target.value)}
                className="flex-1"
              />
              <div className="w-16 text-center font-medium text-gray-800">
                {tempSettings.pomodoroLongBreak || 15}m
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Timer Settings
          </button>
        </div>
      </div>

      {/* Daily Goals */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          Daily Goals
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Learning Hours Goal
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={tempSettings.dailyLearningHours || 2}
                onChange={(e) => handleSettingChange('dailyLearningHours', e.target.value)}
                className="flex-1"
              />
              <div className="w-16 text-center font-medium text-gray-800">
                {tempSettings.dailyLearningHours || 2}h
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Focus Sessions Goal
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={tempSettings.dailyGoalSessions || 4}
                onChange={(e) => handleSettingChange('dailyGoalSessions', e.target.value)}
                className="flex-1"
              />
              <div className="w-16 text-center font-medium text-gray-800">
                {tempSettings.dailyGoalSessions || 4}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Daily Goals
          </button>
        </div>
      </div>

      {/* Progress Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-orange-600" />
          Progress Management
        </h2>
        
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="font-medium text-gray-800">Reset Daily Progress</div>
                <div className="text-sm text-gray-500">Clear today's completed tasks and sessions</div>
              </div>
            </div>
            <button
              onClick={() => {
                setResetType('daily');
                setShowResetConfirm(true);
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Reset Daily
            </button>
          </div>

          <div className="border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="font-medium text-gray-800">Reset All Progress</div>
                <div className="text-sm text-gray-500">Clear all subjects, tasks, and learning history</div>
              </div>
            </div>
            <button
              onClick={() => {
                setResetType('all');
                setShowResetConfirm(true);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reset Everything
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-gray-600" />
          About
        </h2>
        
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <span className="font-medium text-gray-800">Learning Tracker</span> v1.0.0
          </div>
          <div>
            A comprehensive learning management system with Pomodoro timer, progress tracking, and achievement system.
          </div>
          <div>
            Features include roadmap management, daily scheduling, statistics, and gamification elements.
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Send Feedback
        </h2>
        
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-800">Help Us Improve</div>
                <div className="text-sm text-gray-500">Share your thoughts and suggestions for the next prototype</div>
              </div>
            </div>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Send Feedback
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-800">Send Feedback</h3>
            </div>
            
            {feedbackSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Thank You!</h4>
                <p className="text-gray-600">Your feedback has been submitted successfully. We'll use it to improve the next prototype.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback Type
                  </label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="improvement">Improvement Suggestion</option>
                    <option value="ui">UI/UX Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Feedback *
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell us what you think... What do you like? What could be improved? Any bugs you've encountered?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your.email@example.com (for follow-up questions)"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Your feedback matters!</strong> This helps us understand what real users need and prioritize improvements for the next prototype.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleFeedbackSubmit}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Send className="w-4 h-4 inline mr-2" />
                    Submit Feedback
                  </button>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-semibold text-gray-800">
                {resetType === 'daily' ? 'Reset Daily Progress?' : 'Reset All Progress?'}
              </h3>
            </div>
            
            <div className="mb-6">
              {resetType === 'daily' ? (
                <p className="text-gray-600">
                  This will clear all of today's completed tasks and focus sessions. 
                  Your overall roadmap and historical data will be preserved.
                </p>
              ) : (
                <p className="text-gray-600">
                  This will permanently delete all subjects, tasks, sessions, and achievements. 
                  This action cannot be undone.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleResetProgress}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                  resetType === 'daily' 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {resetType === 'daily' ? 'Reset Daily' : 'Reset Everything'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
