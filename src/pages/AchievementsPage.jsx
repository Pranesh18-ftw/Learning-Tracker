import React, { useMemo } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { Award, Target, Clock, Flame, Lock, CheckCircle } from 'lucide-react';

const AchievementsPage = () => {
  const { getStats, calculateStreak, getTotalLearningTime, sessions } = useRoadmap();
  const stats = getStats();
  const streak = calculateStreak();
  const totalTime = getTotalLearningTime();

  // Calculate achievements
  const achievements = useMemo(() => {
    const totalHours = totalTime / 60;
    const completedTasks = stats.completedSubtasks;
    const focusSessions = sessions?.filter(s => s.type === 'focus').length || 0;
    const longSessions = sessions?.filter(s => s.duration >= 120).length || 0;

    return [
      // Task achievements
      {
        id: 'first-task',
        title: 'First Task Completed',
        description: 'Complete your first learning task',
        icon: Target,
        color: 'green',
        unlocked: completedTasks >= 1,
        progress: Math.min(completedTasks, 1),
        maxProgress: 1
      },
      {
        id: 'ten-tasks',
        title: 'Task Master',
        description: 'Complete 10 learning tasks',
        icon: Target,
        color: 'blue',
        unlocked: completedTasks >= 10,
        progress: Math.min(completedTasks, 10),
        maxProgress: 10
      },
      {
        id: 'fifty-tasks',
        title: 'Task Expert',
        description: 'Complete 50 learning tasks',
        icon: Target,
        color: 'purple',
        unlocked: completedTasks >= 50,
        progress: Math.min(completedTasks, 50),
        maxProgress: 50
      },
      {
        id: 'hundred-tasks',
        title: 'Task Legend',
        description: 'Complete 100 learning tasks',
        icon: Award,
        color: 'gold',
        unlocked: completedTasks >= 100,
        progress: Math.min(completedTasks, 100),
        maxProgress: 100
      },

      // Focus achievements
      {
        id: 'one-hour-focus',
        title: 'Focused Hour',
        description: 'Complete a 1-hour focus session',
        icon: Clock,
        color: 'blue',
        unlocked: longSessions >= 1,
        progress: Math.min(longSessions, 1),
        maxProgress: 1
      },
      {
        id: 'two-hour-focus',
        title: 'Deep Focus',
        description: 'Complete a 2-hour focus session',
        icon: Clock,
        color: 'purple',
        unlocked: sessions?.some(s => s.duration >= 120) || false,
        progress: sessions?.some(s => s.duration >= 120) || false ? 1 : 0,
        maxProgress: 1
      },
      {
        id: 'five-hour-focus',
        title: 'Focus Marathon',
        description: 'Complete a 5-hour focus session',
        icon: Clock,
        color: 'red',
        unlocked: sessions?.some(s => s.duration >= 300) || false,
        progress: sessions?.some(s => s.duration >= 300) || false ? 1 : 0,
        maxProgress: 1
      },

      // Streak achievements
      {
        id: 'three-day-streak',
        title: 'Getting Started',
        description: 'Maintain a 3-day learning streak',
        icon: Flame,
        color: 'orange',
        unlocked: streak >= 3,
        progress: Math.min(streak, 3),
        maxProgress: 3
      },
      {
        id: 'seven-day-streak',
        title: 'Week Warrior',
        description: 'Maintain a 7-day learning streak',
        icon: Flame,
        color: 'red',
        unlocked: streak >= 7,
        progress: Math.min(streak, 7),
        maxProgress: 7
      },
      {
        id: 'thirty-day-streak',
        title: 'Monthly Master',
        description: 'Maintain a 30-day learning streak',
        icon: Flame,
        color: 'purple',
        unlocked: streak >= 30,
        progress: Math.min(streak, 30),
        maxProgress: 30
      },
      {
        id: 'hundred-day-streak',
        title: 'Century Streak',
        description: 'Maintain a 100-day learning streak',
        icon: Award,
        color: 'gold',
        unlocked: streak >= 100,
        progress: Math.min(streak, 100),
        maxProgress: 100
      },

      // Time achievements
      {
        id: 'ten-hours',
        title: 'Dedicated Learner',
        description: 'Complete 10 hours of learning',
        icon: Clock,
        color: 'green',
        unlocked: totalHours >= 10,
        progress: Math.min(totalHours, 10),
        maxProgress: 10
      },
      {
        id: 'fifty-hours',
        title: 'Time Investor',
        description: 'Complete 50 hours of learning',
        icon: Clock,
        color: 'blue',
        unlocked: totalHours >= 50,
        progress: Math.min(totalHours, 50),
        maxProgress: 50
      },
      {
        id: 'hundred-hours',
        title: 'Learning Expert',
        description: 'Complete 100 hours of learning',
        icon: Award,
        color: 'purple',
        unlocked: totalHours >= 100,
        progress: Math.min(totalHours, 100),
        maxProgress: 100
      }
    ];
  }, [stats, streak, totalTime, sessions]);

  const unlockedCount = achievements?.filter(a => a.unlocked).length || 0;
  const totalCount = achievements?.length || 0;

  // Group achievements by category
  const categories = {
    tasks: achievements?.filter(a => a.id.includes('task')) || [],
    focus: achievements?.filter(a => a.id.includes('focus')) || [],
    streak: achievements?.filter(a => a.id.includes('streak')) || [],
    time: achievements?.filter(a => a.id.includes('hours')) || []
  };

  const getColorClasses = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-600 border-green-200',
      blue: 'bg-blue-100 text-blue-600 border-blue-200',
      purple: 'bg-purple-100 text-purple-600 border-purple-200',
      red: 'bg-red-100 text-red-600 border-red-200',
      orange: 'bg-orange-100 text-orange-600 border-orange-200',
      gold: 'bg-yellow-100 text-yellow-600 border-yellow-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Achievements</h1>
        <p className="text-gray-500 mt-1">Track your learning milestones and unlock badges</p>
      </div>

      {/* Overall Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Achievement Progress</h2>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            <span className="text-lg font-bold text-gray-800">
              {unlockedCount}/{totalCount}
            </span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completedSubtasks}</div>
            <div className="text-sm text-gray-500">Tasks Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{streak}</div>
            <div className="text-sm text-gray-500">Day Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{Math.floor(totalTime / 60)}h</div>
            <div className="text-sm text-gray-500">Total Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{unlockedCount}</div>
            <div className="text-sm text-gray-500">Badges Earned</div>
          </div>
        </div>
      </div>

      {/* Achievement Categories */}
      {Object.entries(categories).map(([categoryName, categoryAchievements]) => (
        <div key={categoryName} className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
            {categoryName} Achievements
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryAchievements.map((achievement) => {
              const IconComponent = achievement.icon;
              const colorClasses = getColorClasses(achievement.color);
              
              return (
                <div
                  key={achievement.id}
                  className={`relative p-4 rounded-lg border transition-all duration-300 ${
                    achievement.unlocked
                      ? `${colorClasses} shadow-md`
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  {/* Achievement Icon */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      achievement.unlocked ? colorClasses : 'bg-gray-200 text-gray-400'
                    }`}>
                      {achievement.unlocked ? (
                        <IconComponent className="w-6 h-6" />
                      ) : (
                        <Lock className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${
                        achievement.unlocked ? 'text-gray-800' : 'text-gray-500'
                      }`}>
                        {achievement.title}
                      </h4>
                    </div>
                    {achievement.unlocked && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>

                  {/* Achievement Description */}
                  <p className={`text-sm mb-3 ${
                    achievement.unlocked ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  {achievement.maxProgress > 1 && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={achievement.unlocked ? 'text-gray-600' : 'text-gray-400'}>
                          Progress
                        </span>
                        <span className={achievement.unlocked ? 'text-gray-800' : 'text-gray-500'}>
                          {achievement.progress}/{achievement.maxProgress}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            achievement.unlocked ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Unlocked Date */}
                  {achievement.unlocked && (
                    <div className="mt-2 text-xs text-gray-500">
                      Unlocked! 🎉
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Motivational Message */}
      {unlockedCount === totalCount && (
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg p-8 text-center">
          <Award className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Achievement Master!</h2>
          <p className="text-lg">
            You've unlocked all achievements! You're truly a learning legend. 🎉
          </p>
        </div>
      )}
    </div>
  );
};

export default AchievementsPage;
