import React, { useState, useEffect } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  Target,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Trophy,
  AlertCircle
} from 'lucide-react';

const LearningPlan = () => {
  const { 
    subjects, 
    selectedSubjectId,
    setSelectedSubjectId,
    toggleTaskCompletion,
    toggleSubtaskComplete,
    sessions,
    settings,
    dailyRecords,
    recordDailyActivity,
    schedule,
    generateSchedule
  } = useRoadmap();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('day'); // 'day' or 'month'

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];

  // Regenerate schedule when subjects or settings change
  useEffect(() => {
    if (subjects.length > 0) {
      generateSchedule();
    }
  }, [subjects, settings?.dailyLearningHours, schedule]);

  // Get today's tasks from global schedule (reactive)
  const getTodaysTasks = () => {
    const today = new Date().toDateString();
    const todaysSchedule = schedule[today] || [];
    
    // Filter tasks for selected subject
    return todaysSchedule.filter(task => 
      !selectedSubjectId || task.subjectId === selectedSubjectId
    );
  };

  // Handle subtask completion with daily activity recording
  const handleSubtaskToggle = (subtask) => {
    toggleSubtaskComplete(selectedSubject.id, subtask.phaseId, subtask.taskId, subtask.id || subtask.index);
    
    // Record daily activity
    const today = new Date().toDateString();
    const currentRecord = dailyRecords?.find(r => r.date === today);
    const completedSubtasks = currentRecord?.completedSubtasks || 0;
    const focusTime = currentRecord?.focusMinutes || 0;
    
    recordDailyActivity({
      completedSubtasks: subtask.completed ? completedSubtasks - 1 : completedSubtasks + 1,
      focusMinutes: subtask.completed ? focusTime - subtask.estimatedMinutes : focusTime + subtask.estimatedMinutes,
      tasksCompleted: subtask.completed ? Math.max(0, (currentRecord?.tasksCompleted || 0) - 1) : (currentRecord?.tasksCompleted || 0) + 1
    });
  };

  const todaysTasks = getTodaysTasks();

  // Calculate daily progress
  const getDailyProgress = (date) => {
    const dateStr = date.toDateString();
    const record = dailyRecords?.find(r => r.date === dateStr);
    if (!record) return { completed: 0, total: todaysTasks.length, focusMinutes: 0 };
    return {
      completed: record.tasksCompleted || 0,
      total: record.totalTasks || todaysTasks.length,
      focusMinutes: record.focusMinutes || 0
    };
  };

  // Get scheduled tasks for a specific date from global schedule
  const getScheduledTasksForDate = (date) => {
    const dateStr = date.toDateString();
    const daySchedule = schedule[dateStr] || [];
    
    // Filter tasks for selected subject
    return daySchedule.filter(task => 
      !selectedSubjectId || task.subjectId === selectedSubjectId
    );
  };

  // Get calendar data for the month
  const getCalendarData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toDateString();
      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.timestamp);
        return sessionDate.toDateString() === dateStr;
      });
      const record = dailyRecords?.find(r => r.date === dateStr);
      const scheduledTasks = getScheduledTasksForDate(date);
      
      days.push({
        date,
        day,
        sessions: daySessions,
        tasksCompleted: record?.tasksCompleted || 0,
        focusMinutes: record?.focusMinutes || daySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
        scheduledTasks,
        hasLearning: daySessions.length > 0 || (record?.tasksCompleted || 0) > 0 || scheduledTasks.length > 0
      });
    }
    
    return days;
  };

  const today = new Date();
  const dailyProgress = getDailyProgress(today);
  const targetMinutes = (settings?.dailyLearningHours || 2) * 60;

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Learning Plan</h1>
          <p className="text-gray-500 mt-1">Daily execution and tracking</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('day')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'day' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'month' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Subject Selector */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary-600" />
        <select
          value={selectedSubjectId || ''}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Select a subject</option>
          {subjects.map(subject => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
      </div>

      {view === 'day' ? (
        <>
          {/* Today's Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <Target className="w-6 h-6 text-primary-600" />
                </div>
                <span className="text-2xl font-bold text-gray-800">
                  {dailyProgress.completed}/{dailyProgress.total}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Tasks Completed</h3>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${dailyProgress.total > 0 ? (dailyProgress.completed / dailyProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-800">
                  {Math.round(dailyProgress.focusMinutes)}m
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Focus Time</h3>
              <p className="text-xs text-gray-400 mt-1">Target: {targetMinutes}m</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-800">
                  {Math.round((dailyProgress.focusMinutes / targetMinutes) * 100)}%
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Daily Goal</h3>
              <p className="text-xs text-gray-400 mt-1">{settings?.dailyLearningHours || 2} hours target</p>
            </div>
          </div>

          {/* Today's Tasks */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Learning
            </h2>
            
            {selectedSubject ? (
              todaysTasks.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-2">
                    {selectedSubject.name}
                  </div>
                  {Object.entries(
                    todaysTasks.reduce((acc, subtask) => {
                      const phaseKey = subtask.phaseId;
                      if (!acc[phaseKey]) {
                        acc[phaseKey] = {
                          phaseName: subtask.phaseName,
                          subtasks: []
                        };
                      }
                      acc[phaseKey].subtasks.push(subtask);
                      return acc;
                    }, {})
                  ).map(([phaseId, phase]) => (
                    <div key={phaseId} className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-700 bg-gray-100 p-2 rounded">
                        Phase: {phase.phaseName}
                      </h3>
                      {phase.subtasks.map((subtask, index) => (
                        <div key={subtask.id || index} className="pl-4 space-y-1">
                          <div className="text-sm text-gray-600 mb-1">{subtask.taskName}</div>
                          <div className="flex items-start gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <button
                              onClick={() => handleSubtaskToggle({...subtask, index})}
                              className="mt-0.5"
                            >
                              {subtask.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-300 hover:text-primary-500" />
                              )}
                            </button>
                            <div className="flex-1">
                              <span className={`text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                {subtask.name}
                              </span>
                              <div className="text-xs text-gray-400 mt-1">
                                {subtask.estimatedMinutes} minutes
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">All tasks completed!</p>
                  <p className="text-sm text-gray-400 mt-1">Great job! You've finished all scheduled tasks for today.</p>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Select a subject to see today's tasks</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Calendar View */
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {getCalendarData().map((day, index) => (
              <div
                key={index}
                className={`min-h-[80px] p-2 rounded-lg border ${
                  day?.date.toDateString() === today.toDateString()
                    ? 'border-primary-500 bg-primary-50'
                    : day?.hasLearning
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-100'
                } ${!day ? 'bg-gray-50' : ''}`}
              >
                {day && (
                  <>
                    <div className="text-sm font-medium text-gray-700 mb-1">{day.day}</div>
                    {day.scheduledTasks && day.scheduledTasks.length > 0 && (
                      <div className="space-y-1">
                        {day.scheduledTasks.slice(0, 2).map((task, idx) => (
                          <div key={idx} className="text-xs text-primary-600 truncate">
                            {task.phaseName || task.taskName}
                          </div>
                        ))}
                        {day.scheduledTasks.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{day.scheduledTasks.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                    {day.hasLearning && (
                      <div className="space-y-1 mt-1">
                        {day.tasksCompleted > 0 && (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {day.tasksCompleted} done
                          </div>
                        )}
                        {day.focusMinutes > 0 && (
                          <div className="text-xs text-blue-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {Math.round(day.focusMinutes)}m
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary-50 border border-primary-500 rounded"></div>
              <span className="text-gray-600">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span className="text-gray-600">Learning Day</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPlan;
