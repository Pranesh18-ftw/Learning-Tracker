import React from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { BookOpen, LayoutDashboard, Award, Settings, TrendingUp, Map } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { settings, sessions } = useRoadmap();
  
  // Calculate today's progress
  const today = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.date).toDateString() === today);
  const todayHours = todaySessions.reduce((acc, s) => acc + (s.duration / 60), 0);
  const dailyGoalHours = settings?.dailyLearningHours || 2;
  const progressPercentage = Math.min((todayHours / dailyGoalHours) * 100, 100);
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'roadmap', label: 'Roadmap', icon: Map },
    { id: 'learning-plan', label: 'Learning Plan', icon: BookOpen },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'stats', label: 'Statistics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-white h-screen shadow-lg flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary-600" />
          Learning Tracker
        </h1>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  id={item.id === 'roadmap' ? 'roadmap-nav-item' : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    activeTab === item.id
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white">
          <p className="text-sm font-medium mb-1">Daily Goal</p>
          <p className="text-xs opacity-90 mb-3">Complete {dailyGoalHours} hours of learning</p>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs mt-2">{todayHours.toFixed(1)} / {dailyGoalHours} hours</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
