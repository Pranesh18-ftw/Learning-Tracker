import React, { useState } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { 
  Settings2, 
  Clock, 
  Sun, 
  Moon, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Target
} from 'lucide-react';

const Settings = () => {
  const { subjects, settings, updateSettings, resetSubjectProgress } = useRoadmap();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedSubjectToReset, setSelectedSubjectToReset] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = () => {
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleResetSubject = () => {
    if (selectedSubjectToReset) {
      resetSubjectProgress(selectedSubjectToReset);
      setShowResetConfirm(false);
      setSelectedSubjectToReset('');
      setSaveMessage('Subject progress has been reset');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Settings2 className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-primary-100">
          Customize your learning experience and preferences.
        </p>
      </div>

      {saveMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          {saveMessage}
        </div>
      )}

      {/* Daily Learning Goals */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-600" />
          Daily Learning Goals
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Learning Hours Goal
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={settings.dailyLearningHours}
                onChange={(e) => updateSettings({ dailyLearningHours: parseFloat(e.target.value) || 2 })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-gray-600">hours per day</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This goal is shown in your sidebar and dashboard progress.
            </p>
          </div>
        </div>
      </div>

      {/* Pomodoro Timer Settings */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-600" />
          Pomodoro Timer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Focus Time (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={settings.pomodoroFocusTime}
              onChange={(e) => updateSettings({ pomodoroFocusTime: parseInt(e.target.value) || 25 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: 25 minutes
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Short Break (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.pomodoroShortBreak}
              onChange={(e) => updateSettings({ pomodoroShortBreak: parseInt(e.target.value) || 5 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: 5 minutes
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Long Break (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.pomodoroLongBreak}
              onChange={(e) => updateSettings({ pomodoroLongBreak: parseInt(e.target.value) || 15 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: 15 minutes
            </p>
          </div>
        </div>
      </div>

      {/* Theme Preferences */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Sun className="w-5 h-5 text-primary-600" />
          Theme Preferences
        </h2>
        <div className="flex gap-4">
          <button
            onClick={() => updateSettings({ theme: 'light' })}
            className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all ${
              settings.theme === 'light' 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Sun className={`w-6 h-6 ${settings.theme === 'light' ? 'text-primary-600' : 'text-gray-500'}`} />
            <div className="text-left">
              <p className={`font-medium ${settings.theme === 'light' ? 'text-primary-900' : 'text-gray-700'}`}>Light</p>
              <p className="text-sm text-gray-500">Clean and bright</p>
            </div>
          </button>
          <button
            onClick={() => updateSettings({ theme: 'dark' })}
            className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all ${
              settings.theme === 'dark' 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Moon className={`w-6 h-6 ${settings.theme === 'dark' ? 'text-primary-600' : 'text-gray-500'}`} />
            <div className="text-left">
              <p className={`font-medium ${settings.theme === 'dark' ? 'text-primary-900' : 'text-gray-700'}`}>Dark</p>
              <p className="text-sm text-gray-500">Easy on the eyes</p>
            </div>
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-primary-600" />
          Data Management
        </h2>
        
        {!showResetConfirm ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-yellow-800">Reset Subject Progress</h3>
                  <p className="text-sm text-yellow-600 mt-1">
                    This will reset all progress (tasks and subtasks) for a specific subject. 
                    The roadmap structure will remain intact. This action cannot be undone.
                  </p>
                  
                  {/* Subject Selector */}
                  <div className="mt-3">
                    <select
                      value={selectedSubjectToReset}
                      onChange={(e) => setSelectedSubjectToReset(e.target.value)}
                      className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select a subject to reset</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    disabled={!selectedSubjectToReset}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Subject Progress
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800">Are you sure?</h3>
                <p className="text-sm text-red-600 mt-1">
                  All progress for this subject will be permanently reset. This cannot be undone.
                </p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={handleResetSubject}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Yes, Reset Progress
                  </button>
                  <button
                    onClick={() => {
                      setShowResetConfirm(false);
                      setSelectedSubjectToReset('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-lg"
        >
          <CheckCircle className="w-5 h-5" />
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
