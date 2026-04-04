import React from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { Clock, Target, Flame, Calendar, TrendingUp, BarChart3 } from 'lucide-react';

const StatisticsPage = () => {
  const { subjects, sessions, getStats, calculateStreak } = useRoadmap();
  const stats = getStats();
  const streak = calculateStreak();
  
  // Calculate total study time from focus sessions only
  const totalFocusMinutes = sessions?.reduce((sum, session) => {
    if (session.type !== 'focus' && session.type) return sum;
    
    // Handle both durationMinutes (minutes) and duration (seconds) from old sessions
    const minutes = session.durationMinutes || (session.duration ? session.duration / 60 : 0);
    return sum + minutes;
  }, 0) || 0;
  
  const totalHours = Math.floor(totalFocusMinutes / 60);
  const totalMinutes = totalFocusMinutes % 60;

  // Calculate weekly hours from sessions
  const calculateWeeklyHours = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyData = weekDays.map((day, index) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + index);
      
      const daySessions = sessions?.filter(session => {
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === dayDate.getTime();
      }) || [];

      const totalMinutes = daySessions?.reduce((sum, session) => {
        if (session.type !== 'focus' && session.type) return sum;
        
        // Handle both durationMinutes (minutes) and duration (seconds) from old sessions
        if (session.durationMinutes) {
          return sum + session.durationMinutes;
        } else if (session.duration) {
          // Convert seconds to minutes for old sessions
          return sum + Math.floor(session.duration / 60);
        }
        
        return sum;
      }, 0) || 0;
      const hours = totalMinutes / 60;

      return {
        day,
        date: dayDate,
        hours: Math.round(hours * 10) / 10,
        isToday: dayDate.toDateString() === today.toDateString(),
        isFuture: dayDate > today
      };
    });

    return weeklyData;
  };

  const weeklyHours = calculateWeeklyHours();
  const maxWeeklyHours = Math.max(...weeklyHours.map(d => d.hours));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Statistics</h1>
        <p className="text-gray-500 mt-1">Track your learning progress and achievements</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Flame className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-gray-800">{streak}</span>
          </div>
          <div className="text-sm text-gray-500">Learning Streak (days)</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <Clock className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-gray-800">{totalHours}h {totalMinutes}m</span>
          </div>
          <div className="text-sm text-gray-500">Total Study Time</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold text-gray-800">{stats.completedSubtasks}</span>
          </div>
          <div className="text-sm text-gray-500">Completed Tasks</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold text-gray-800">{stats.completionRate}%</span>
          </div>
          <div className="text-sm text-gray-500">Completion Rate</div>
        </div>
      </div>

      {/* Weekly Hours Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Weekly Study Hours
        </h3>
        
        <div className="space-y-3">
          {weeklyHours.map((day, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-12 text-sm font-medium text-gray-600">
                {day.day}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                {!day.isFuture && (
                  <div 
                    className="bg-blue-600 h-6 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                    style={{ width: `${maxWeeklyHours > 0 ? (day.hours / maxWeeklyHours) * 100 : 0}%` }}
                  >
                    <span className="text-xs text-white font-medium">{day.hours}h</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total this week:</span>
            <span className="font-semibold text-gray-800">
              {weeklyHours.filter(d => !d.isFuture).reduce((sum, day) => sum + day.hours, 0)} hours
            </span>
          </div>
        </div>
      </div>

      {/* Subject Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Subject Progress</h3>
        
        {subjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No subjects yet. Add your first subject to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subjects.map(subject => {
              const allSubtasks = subject.phases?.flatMap(p => p.tasks?.flatMap(t => t.subtasks)) || [];
              const completedSubtasks = allSubtasks.filter(st => st.completed).length;
              const progress = allSubtasks.length > 0 ? Math.round((completedSubtasks / allSubtasks.length) * 100) : 0;
              
              return (
                <div key={subject.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{subject.name}</span>
                      {subject.deadline && new Date(subject.deadline) < new Date() && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                          Overdue
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-600">{progress}%</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          subject.deadline && new Date(subject.deadline) < new Date() ? 'bg-red-600' : 'bg-green-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {completedSubtasks}/{allSubtasks.length}
                    </span>
                  </div>

                  {subject.deadline && (
                    <div className="mt-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Deadline: {new Date(subject.deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;
