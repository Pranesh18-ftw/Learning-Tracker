import React, { useEffect } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { Trophy, X, Footprints, Rocket, CheckCircle, ListChecks, ClipboardCheck, CheckSquare, Timer, Flame, Award, Crown, Star, CalendarCheck, Clock, Hourglass, Zap, Target } from 'lucide-react';

const iconMap = {
  footprints: Footprints,
  rocket: Rocket,
  'check-circle': CheckCircle,
  'list-checks': ListChecks,
  'clipboard-check': ClipboardCheck,
  'check-square': CheckSquare,
  timer: Timer,
  flame: Flame,
  award: Award,
  crown: Crown,
  star: Star,
  'calendar-check': CalendarCheck,
  clock: Clock,
  hourglass: Hourglass,
  zap: Zap,
  target: Target,
};

const AchievementNotification = () => {
  const { newlyUnlocked, clearAchievementNotification } = useRoadmap();

  useEffect(() => {
    if (newlyUnlocked) {
      const timer = setTimeout(() => {
        clearAchievementNotification();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [newlyUnlocked, clearAchievementNotification]);

  if (!newlyUnlocked) return null;

  const IconComponent = iconMap[newlyUnlocked.icon] || Trophy;

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-primary-200 p-5 max-w-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg">
            <IconComponent className="w-8 h-8 text-primary-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-600 mb-1">
              Achievement Unlocked!
            </p>
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              {newlyUnlocked.name}
            </h3>
            <p className="text-sm text-gray-500">
              {newlyUnlocked.description}
            </p>
          </div>
          
          <button
            onClick={clearAchievementNotification}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Progress bar animation */}
        <div className="mt-4 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
          <div 
            className="bg-primary-500 h-full rounded-full animate-[shrink_5s_linear_forwards]"
            style={{ 
              animationName: 'shrink',
              animationDuration: '5s',
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards'
            }}
          />
        </div>
      </div>
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default AchievementNotification;
