import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
import { RoadmapProvider, useRoadmap } from './context/RoadmapContext';

function AppContent() {
  const { showTutorial, completeTutorial, setTutorialStepNumber, isDarkMode, toggleTheme, hasImportedRoadmap } = useRoadmap();
  const [activeTab, setActiveTab] = React.useState('roadmap'); // Start with roadmap for new users

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
        return <RoadmapPage />;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Topbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="p-8 relative">
        {/* Tutorial Restriction Overlay */}
        {showTutorial && !hasImportedRoadmap && activeTab !== 'roadmap' && (
          <div className="absolute inset-0 bg-white bg-opacity-90 z-40 flex items-center justify-center rounded-lg">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Setup First</h3>
              <p className="text-gray-600 mb-4">Please import your learning roadmap to access this feature.</p>
              <button
                onClick={() => setActiveTab('roadmap')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Roadmap
              </button>
            </div>
          </div>
        )}
        
        <div className={`max-w-6xl mx-auto ${isDarkMode ? 'text-white' : ''}`}>
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
        <Route path="/settings" element={<AppContent />} />
      </Routes>
    </RoadmapProvider>
  );
}

export default App;
