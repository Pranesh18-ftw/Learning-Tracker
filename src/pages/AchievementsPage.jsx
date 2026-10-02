import React, { useMemo } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { Award, Target, Clock, Flame, Lock, CheckCircle } from 'lucide-react';
import { ACHIEVEMENTS } from '../services/achievementService';

const iconMap = {
  target: Target,
  clock: Clock,
  flame: Flame,
  award: Award,
  'check-circle': CheckCircle
};

const AchievementsPage = () => {
  const { getStats, calculateStreak, getTotalLearningTime, sessions, taskCompletions, unlockedAchievements } = useRoadmap();
  const stats = getStats();
  const streak = calculateStreak();
  const totalTime = getTotalLearningTime();

  // Canonical achievements mapped with unlocked status and progress
  const achievements = useMemo(() => {
    return ACHIEVEMENTS.map(achievement => {
      const isUnlocked =
        unlockedAchievements.includes(achievement.id) ||
        achievement.check({ sessions, taskCompletions, streak });

      const currentProgress = achievement.getProgress
        ? achievement.getProgress({ sessions, taskCompletions, streak })
        : (isUnlocked ? achievement.maxProgress : 0);

      return {
        ...achievement,
        title: achievement.name || achievement.title,
        unlocked: isUnlocked,
        progress: Math.min(currentProgress, achievement.maxProgress || 1),
        maxProgress: achievement.maxProgress || 1
      };
    });
  }, [unlockedAchievements, sessions, taskCompletions, streak]);

  const unlockedCount = achievements?.filter(a => a.unlocked).length || 0;
  const totalCount = achievements?.length || 0;

  // Group achievements by category
  const categories = {
    tasks: achievements?.filter(a => a.category === 'tasks') || [],
    focus: achievements?.filter(a => a.category === 'focus') || [],
    streak: achievements?.filter(a => a.category === 'streak') || [],
    time: achievements?.filter(a => a.category === 'time') || []
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
            style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
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
              const IconComponent = (typeof achievement.icon === 'string' ? iconMap[achievement.icon] : achievement.icon) || Award;
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

                  {/* Unlocked Badge */}
                  {achievement.unlocked && (
                    <div className="mt-2 text-xs font-semibold text-green-700">
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
      {unlockedCount === totalCount && totalCount > 0 && (
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
