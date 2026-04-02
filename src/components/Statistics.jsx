import React from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Target, 
  Flame, 
  Calendar,
  BarChart3,
  Layers,
  CheckSquare,
  Activity
} from 'lucide-react';

const Statistics = () => {
  const { subjects, sessions, getStats } = useRoadmap();
  const stats = getStats();

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Calculate max hours for chart scaling
  const maxWeeklyHours = Math.max(...stats.weeklyHours.map(d => d.hours), 1);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <TrendingUp className="w-8 h-8" />
          Learning Statistics
        </h1>
        <p className="text-primary-100">
          Track your progress, focus time, and learning streaks.
        </p>
      </div>

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tasks Completed */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Tasks Completed</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.completedTasks}/{stats.totalTasks}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {stats.taskCompletionRate}% completion rate
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Subtasks Completed */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Subtasks Completed</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.completedSubtasks}/{stats.totalSubtasks}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.subtaskCompletionRate}% completion rate
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckSquare className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        {/* Phases Completed */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Phases Completed</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.completedPhases}/{stats.totalPhases}
              </p>
              <p className="text-sm text-purple-600 mt-1">
                {stats.phaseCompletionRate}% completion rate
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Layers className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Focus Sessions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Focus Sessions</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.totalFocusSessions}
              </p>
              <p className="text-sm text-orange-600 mt-1">
                {stats.totalFocusHours} hours total
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Learning Streak & Weekly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streak Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Learning Streak
          </h2>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-4xl font-bold text-orange-500">{stats.currentStreak}</p>
              <p className="text-sm text-gray-500">Current Streak</p>
              <p className="text-xs text-gray-400">days</p>
            </div>
            <div className="h-16 w-px bg-gray-200"></div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary-600">{stats.longestStreak}</p>
              <p className="text-sm text-gray-500">Longest Streak</p>
              <p className="text-xs text-gray-400">days</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-700 text-center">
              Keep learning daily to maintain your streak!
            </p>
          </div>
        </div>

        {/* Focus Time Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" />
            Focus Time Summary
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Focus Time</span>
              <span className="font-semibold text-gray-800">{formatTime(stats.totalFocusMinutes)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Focus Sessions</span>
              <span className="font-semibold text-gray-800">{stats.totalFocusSessions}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Average per Session</span>
              <span className="font-semibold text-gray-800">
                {stats.totalFocusSessions > 0 
                  ? formatTime(Math.round(stats.totalFocusMinutes / stats.totalFocusSessions))
                  : '0m'}
              </span>
            </div>
          </div>
        </div>

        {/* Subjects Overview */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-500" />
            Subjects Overview
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Subjects</span>
              <span className="font-semibold text-gray-800">{stats.subjectsCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Phases</span>
              <span className="font-semibold text-gray-800">{stats.totalPhases}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Tasks</span>
              <span className="font-semibold text-gray-800">{stats.totalTasks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-500" />
          Weekly Learning Hours
        </h2>
        <div className="flex items-end justify-between gap-2 h-48">
          {stats.weeklyHours.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '100%' }}>
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all duration-500"
                  style={{ height: `${(day.hours / maxWeeklyHours) * 100}%` }}
                ></div>
                {day.hours > 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700">
                    {day.hours}h
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">{day.day}</p>
                {day.sessions > 0 && (
                  <p className="text-xs text-gray-500">{day.sessions} sessions</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary-500 rounded"></div>
              <span>Learning Hours</span>
            </div>
          </div>
          <p>
            Total this week: {' '}
            <span className="font-semibold text-gray-800">
              {stats.weeklyHours.reduce((sum, d) => sum + d.hours, 0).toFixed(1)} hours
            </span>
          </p>
        </div>
      </div>

      {/* Completion Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Task Completion */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Task Completion</h3>
          <div className="relative pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-lg font-bold text-blue-600">{stats.taskCompletionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${stats.taskCompletionRate}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats.completedTasks} of {stats.totalTasks} tasks completed
            </p>
          </div>
        </div>

        {/* Subtask Completion */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Subtask Completion</h3>
          <div className="relative pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-lg font-bold text-green-600">{stats.subtaskCompletionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${stats.subtaskCompletionRate}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats.completedSubtasks} of {stats.totalSubtasks} subtasks completed
            </p>
          </div>
        </div>

        {/* Phase Completion */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Phase Completion</h3>
          <div className="relative pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-lg font-bold text-purple-600">{stats.phaseCompletionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-purple-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${stats.phaseCompletionRate}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats.completedPhases} of {stats.totalPhases} phases completed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
