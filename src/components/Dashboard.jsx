import React from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { BookOpen, CheckCircle, Clock, Target, AlertTriangle, AlertCircle, Calendar, TrendingUp, Award, Flame } from 'lucide-react';

const Dashboard = ({ handleStartTask }) => {
  const { 
    subjects, 
    selectedSubjectId, 
    setSelectedSubjectId, 
    sessions,
    getSubjectProgress,
    dailyRecords
  } = useRoadmap();

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  // Calculate current learning streak
  const calculateStreak = () => {
    if (!dailyRecords || dailyRecords.length === 0) return 0;
    
    const sorted = [...dailyRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    // Check if active today or yesterday (allow 1 day grace)
    const lastActive = sorted[0]?.date;
    if (lastActive !== today && lastActive !== yesterday) return 0;
    
    for (let i = 0; i < sorted.length; i++) {
      const record = sorted[i];
      const hasActivity = (record.tasksCompleted > 0) || (record.focusMinutes > 0);
      
      if (hasActivity) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  // Calculate deadline alerts
  const getDeadlineAlerts = () => {
    const alerts = [];
    const today = new Date();
    
    subjects.forEach(subject => {
      subject.phases?.forEach(phase => {
        if (phase.deadline && !phase.completed) {
          const deadline = new Date(phase.deadline);
          const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntil < 0) {
            alerts.push({
              type: 'error',
              message: `${phase.name} in ${subject.name} is overdue by ${Math.abs(daysUntil)} days`,
              daysUntil
            });
          } else if (daysUntil <= 3) {
            alerts.push({
              type: 'warning',
              message: `${phase.name} in ${subject.name} due in ${daysUntil} days`,
              daysUntil
            });
          }
        }
      });
    });
    
    return alerts.slice(0, 5); // Limit to 5 alerts
  };

  const deadlineAlerts = getDeadlineAlerts();

  // Calculate subject progress
  const getSubjectStats = (subject) => {
    if (!subject?.phases) return { completedTasks: 0, totalTasks: 0, completedPhases: 0, totalPhases: 0, focusHours: 0 };
    
    let completedTasks = 0;
    let totalTasks = 0;
    let completedPhases = 0;
    
    subject.phases.forEach(phase => {
      if (phase.completed) completedPhases++;
      phase.tasks?.forEach(task => {
        totalTasks++;
        if (task.completed) completedTasks++;
      });
    });

    const subjectSessions = sessions.filter(s => s.subjectId === subject.id);
    const focusHours = subjectSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;

    return {
      completedTasks,
      totalTasks,
      completedPhases,
      totalPhases: subject.phases.length,
      focusHours: Math.round(focusHours * 10) / 10
    };
  };

  const subjectStats = selectedSubject ? getSubjectStats(selectedSubject) : null;
  const progress = selectedSubject ? getSubjectProgress(selectedSubject.id) : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header with Subject Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {selectedSubject ? `Currently learning: ${selectedSubject.name}` : 'Select a subject to get started'}
          </p>
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
      </div>

      {/* Deadline Alerts */}
      {deadlineAlerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Deadline Alerts
          </h2>
          <div className="space-y-2">
            {deadlineAlerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg flex items-center gap-3 ${
                  alert.type === 'error' 
                    ? 'bg-red-50 border border-red-200 text-red-700' 
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                }`}
              >
                {alert.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-sm">{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {selectedSubject ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Progress Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <Target className="w-6 h-6 text-primary-600" />
                </div>
                <span className="text-2xl font-bold text-primary-600">{Math.round(progress)}%</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Overall Progress</h3>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Tasks Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-800">
                  {subjectStats?.completedTasks}/{subjectStats?.totalTasks}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Tasks Completed</h3>
              <p className="text-xs text-gray-400 mt-1">
                {subjectStats?.totalTasks > 0 
                  ? Math.round((subjectStats.completedTasks / subjectStats.totalTasks) * 100) 
                  : 0}% completion rate
              </p>
            </div>

            {/* Phases Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-800">
                  {subjectStats?.completedPhases}/{subjectStats?.totalPhases}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Phases Completed</h3>
              <p className="text-xs text-gray-400 mt-1">
                {subjectStats?.totalPhases > 0 
                  ? Math.round((subjectStats.completedPhases / subjectStats.totalPhases) * 100) 
                  : 0}% of phases done
              </p>
            </div>

            {/* Focus Time Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-2xl font-bold text-gray-800">{subjectStats?.focusHours}h</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Total Focus Time</h3>
              <p className="text-xs text-gray-400 mt-1">
                Across {sessions.filter(s => s.subjectId === selectedSubject.id).length} sessions
              </p>
            </div>

            {/* Learning Streak Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Flame className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-2xl font-bold text-orange-600">{streak}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Current Streak</h3>
              <p className="text-xs text-gray-400 mt-1">
                {streak === 1 ? '1 day' : `${streak} days`} of consecutive learning
              </p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </h2>
            {sessions.filter(s => s.subjectId === selectedSubject.id).length > 0 ? (
              <div className="space-y-3">
                {sessions
                  .filter(s => s.subjectId === selectedSubject.id)
                  .slice(-5)
                  .reverse()
                  .map((session, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 rounded-lg">
                          <Clock className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">Focus Session</p>
                          <p className="text-xs text-gray-500">
                            {new Date(session.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {Math.round(session.duration || 0)} min
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No recent activity. Start a focus session to track your progress!</p>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Welcome to Your Learning Dashboard</h3>
          <p className="text-gray-500 mb-4">Select a subject from the dropdown above to view your progress and statistics.</p>
          {subjects.length === 0 && (
            <p className="text-sm text-gray-400">Create a roadmap first to get started with tracking your learning journey.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
