import React from 'react';
import { useRoadmap } from "../context/RoadmapContext"
import { 
  Trophy, 
  Target, 
  Clock, 
  Flame, 
  Award, 
  Crown, 
  Star, 
  CalendarCheck, 
  Hourglass, 
  Zap, 
  Skull 
} from 'lucide-react';

const iconMap = {
  trophy: Trophy,
  target: Target,
  clock: Clock,
  flame: Flame,
  award: Award,
  crown: Crown,
  star: Star,
  'calendar-check': CalendarCheck,
  hourglass: Hourglass,
  zap: Zap,
  skull: Skull,
};

const Achievements = () => {
  const { roadmap, getStats } = useRoadmap()

  const allSubtasks = roadmap
    .flatMap(subject => subject.phases)
    .flatMap(phase => phase.tasks)
    .flatMap(task => task.subtasks)

  const completedSubtasks = allSubtasks.filter(s => s.completed)
  const stats = getStats()

  const achievements = [
    {
      id: 'first_task',
      name: 'First Task',
      description: 'Complete your first subtask',
      icon: 'trophy',
      unlocked: completedSubtasks.length >= 1
    },
    {
      id: 'ten_tasks',
      name: '10 Tasks Completed',
      description: 'Complete 10 subtasks',
      icon: 'target',
      unlocked: completedSubtasks.length >= 10
    },
    {
      id: 'phase_completed',
      name: 'Phase Completed',
      description: 'Complete all tasks in a phase',
      icon: 'award',
      unlocked: stats.completedPhases >= 1
    },
    {
      id: 'seven_day_streak',
      name: '7 Day Streak',
      description: 'Maintain a 7-day learning streak',
      icon: 'flame',
      unlocked: false // TODO: Implement streak logic
    }
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPercentage = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Achievements</h1>
        <p className="text-gray-500 mt-1">Track your learning milestones and accomplishments</p>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Achievement Progress</h3>
          <span className="text-sm text-gray-500">
            {unlockedCount} of {totalCount} unlocked
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="mt-2 text-center text-sm text-gray-600">
          {progressPercentage}% Complete
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map(achievement => {
          const IconComponent = iconMap[achievement.icon];
          return (
            <div
              key={achievement.id}
              className={`bg-white rounded-lg shadow-sm border p-6 transition-all duration-300 ${
                achievement.unlocked
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4 mb-3">
                <div
                  className={`p-3 rounded-full ${
                    achievement.unlocked
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {IconComponent && <IconComponent className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    achievement.unlocked ? 'text-gray-800' : 'text-gray-500'
                  }`}>
                    {achievement.name}
                  </h3>
                </div>
              </div>
              <p className={`text-sm ${
                achievement.unlocked ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {achievement.description}
              </p>
              {achievement.unlocked && (
                <div className="mt-3 flex items-center text-green-600 text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 00016zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Unlocked
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{completedSubtasks.length}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{allSubtasks.length - completedSubtasks.length}</div>
            <div className="text-sm text-gray-500">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{progressPercentage}%</div>
            <div className="text-sm text-gray-500">Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{unlockedCount}</div>
            <div className="text-sm text-gray-500">Achievements</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
