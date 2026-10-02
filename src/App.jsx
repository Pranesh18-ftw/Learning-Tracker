import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import Topbar from './components/Topbar';
import AchievementNotification from './components/AchievementNotification';
import DashboardPage from './pages/DashboardPage';
import RoadmapPage from './pages/RoadmapPage';
import LearningPlanPage from './pages/LearningPlanPage';
import StatisticsPage from './pages/StatisticsPage';
import SettingsPage from './pages/SettingsPage';
import AchievementsPage from './pages/AchievementsPage';
import Onboarding from './onboarding/Onboarding';
import CustomCursor from './components/CustomCursor';
import { RoadmapProvider, useRoadmap } from './context/RoadmapContext';

import { TAB_TO_PATH, PATH_TO_TAB } from './utils/navigation';
export { TAB_TO_PATH, PATH_TO_TAB };

function AppContent() {
  const { showTutorial, completeTutorial, setTutorialStepNumber, isDarkMode, hasImportedRoadmap } = useRoadmap();
  const location = useLocation();
  const navigate = useNavigate();

  // URL is authoritative
  const activeTab = PATH_TO_TAB[location.pathname] || 'dashboard';

  const setActiveTab = (tab) => {
    navigate(TAB_TO_PATH[tab] || '/');
  };

  const renderContent = () => {
    // During tutorial without imported roadmap, only show roadmap page
    if (showTutorial && !hasImportedRoadmap) {
      return <RoadmapPage />;
    }
    
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'roadmap':
        return <RoadmapPage />;
      case 'learning-plan':
        return <LearningPlanPage />;
      case 'stats':
        return <StatisticsPage />;
      case 'achievements':
        return <AchievementsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      <CustomCursor />
      <Topbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="py-6 sm:py-8 px-4 sm:px-8 relative">
        {/* Tutorial Restriction Overlay */}
        {showTutorial && !hasImportedRoadmap && activeTab !== 'roadmap' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-6">
            <div className={`text-center p-8 max-w-md border ${isDarkMode ? 'bg-[#1E1E1B] border-[#2C2B27] text-[#F4F0E7]' : 'bg-[#FAF8F3] border-[#D8D2C7] text-[#1C1C1A]'}`}>
              <div className="w-12 h-12 border border-[#B84F2B]/40 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-5 h-5 text-[#B84F2B]" />
              </div>
              <h3 className="text-base font-serif italic mb-1">Set up your path</h3>
              <p className="text-xs opacity-70 mb-5 font-sans">Please import your learning roadmap to begin.</p>
              <button
                onClick={() => setActiveTab('roadmap')}
                className="px-4 py-2 bg-[#1C1C1A] dark:bg-[#F4F0E7] text-[#F4F0E7] dark:text-[#1C1C1A] text-xs font-mono tracking-wider uppercase hover:opacity-90 transition-opacity"
              >
                Go to Roadmap
              </button>
            </div>
          </div>
        )}
        
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>

      <AchievementNotification />
      
      {showTutorial && (
        <Onboarding
          onComplete={completeTutorial}
          onStepChange={setTutorialStepNumber}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <RoadmapProvider>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/roadmap" element={<AppContent />} />
        <Route path="/learning-plan" element={<AppContent />} />
        <Route path="/statistics" element={<AppContent />} />
        <Route path="/achievements" element={<AppContent />} />
        <Route path="/settings" element={<AppContent />} />
        <Route path="*" element={<AppContent />} />
      </Routes>
    </RoadmapProvider>
  );
}

export default App;
