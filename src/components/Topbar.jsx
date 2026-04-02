import React from 'react';
import { BookOpen, LayoutDashboard, Award, Settings, TrendingUp, Map, Target, Moon, Sun } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';

const Topbar = ({ activeTab, setActiveTab }) => {
  const { isDarkMode, toggleTheme, showTutorial, hasImportedRoadmap } = useRoadmap();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'roadmap', label: 'Roadmap', icon: Map },
    { id: 'learning-plan', label: 'Learning', icon: BookOpen },
    { id: 'stats', label: 'Stats', icon: TrendingUp },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Target className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Learning Tracker
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
    <button
      key={item.id}
      id={`${item.id}-nav-item`}
      onClick={() => {
        if (showTutorial && !hasImportedRoadmap && item.id !== 'roadmap') {
          return; // Block navigation during tutorial except for roadmap
        }
        setActiveTab(item.id);
      }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === item.id
          ? isDarkMode 
            ? 'bg-blue-900 text-blue-300'
            : 'bg-blue-50 text-blue-600'
          : isDarkMode
            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      } ${
        showTutorial && !hasImportedRoadmap && item.id !== 'roadmap'
          ? 'opacity-50 cursor-not-allowed'
          : ''
      }`}
      disabled={showTutorial && !hasImportedRoadmap && item.id !== 'roadmap'}
    >
                  <IconComponent className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Theme Toggle & Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">U</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
