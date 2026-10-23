import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Topbar from './components/Topbar';
import FocusSpace from './components/FocusSpace';
import AchievementNotification from './components/AchievementNotification';
import DashboardPage from './pages/DashboardPage';
import RoadmapPage from './pages/RoadmapPage';
import LearningPlanPage from './pages/LearningPlanPage';
import StatisticsPage from './pages/StatisticsPage';
import SettingsPage from './pages/SettingsPage';
import AchievementsPage from './pages/AchievementsPage';
import TrajectoryPage from './pages/TrajectoryPage';
import NotFoundPage from './pages/NotFoundPage';
import Onboarding from './onboarding/Onboarding';
import CustomCursor from './components/CustomCursor';
import { RoadmapProvider, useRoadmap } from './context/RoadmapContext';

import ErrorBoundary from './components/ErrorBoundary';
import { TAB_TO_PATH, PATH_TO_TAB, TAB_TITLES } from './utils/navigation';
export { TAB_TO_PATH, PATH_TO_TAB, TAB_TITLES };

function AppContent() {
  const {
    showTutorial,
    completeTutorial,
    setTutorialStepNumber,
    isDarkMode,
    focusSession,
    beginFocusRunning,
    pauseFocusSession,
    resumeFocusSession,
    openReflectionSession,
    commitFocusSession,
    abandonFocusSession,
    storageError,
    setStorageError,
    corruptedDataKeys = [],
    dismissCorruptedNotice
  } = useRoadmap();
  const location = useLocation();
  const navigate = useNavigate();

  // URL is authoritative; recognize valid paths or route to 404
  const normalizedPath = location.pathname.endsWith('/') && location.pathname.length > 1
    ? location.pathname.slice(0, -1)
    : location.pathname;
  const isKnownRoute = Object.prototype.hasOwnProperty.call(PATH_TO_TAB, normalizedPath);
  const activeTab = isKnownRoute ? PATH_TO_TAB[normalizedPath] : 'not-found';

  // Dynamic document title per route and focus mode (unconditional hook)
  React.useEffect(() => {
    if (focusSession) {
      document.title = 'Focus Space | Learning Tracker';
    } else {
      document.title = TAB_TITLES[activeTab] || 'Learning Tracker';
    }
  }, [activeTab, focusSession]);

  // If currently in Focus Mode, application enters the quiet focus space
  if (focusSession) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white">
        <CustomCursor />
        <ErrorBoundary fallbackTitle="Focus Space Error">
          <FocusSpace
            session={focusSession}
            onBeginRunning={beginFocusRunning}
            onPause={pauseFocusSession}
            onResume={resumeFocusSession}
            onOpenReflection={openReflectionSession}
            onCommitEvidence={commitFocusSession}
            onAbandon={abandonFocusSession}
          />
        </ErrorBoundary>
      </div>
    );
  }

  const setActiveTab = (tab) => {
    navigate(TAB_TO_PATH[tab] || '/');
  };

  const renderContent = () => {
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
      case 'trajectory':
        return <TrajectoryPage />;
      case 'settings':
        return <SettingsPage />;
      case 'not-found':
        return <NotFoundPage requestedPath={location.pathname} />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      <CustomCursor />
      <Topbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {corruptedDataKeys.length > 0 && (
        <div
          role="alert"
          className="bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 px-4 py-2 text-xs flex items-center justify-between"
        >
          <span className="min-w-0 break-words flex-1 pr-2">
            We could not read part of your saved data ({corruptedDataKeys.join(', ')}). Your raw data has been safely preserved in local quarantine.
          </span>
          <button
            onClick={() => dismissCorruptedNotice && dismissCorruptedNotice()}
            className="text-amber-800 dark:text-amber-200 hover:underline ml-4 font-semibold shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {storageError && (
        <div
          role="alert"
          className="bg-rose-500/10 border-b border-rose-500/20 text-rose-700 dark:text-rose-300 px-4 py-2 text-xs flex items-center justify-between"
        >
          <span className="min-w-0 break-words flex-1 pr-2">{storageError}</span>
          <button
            onClick={() => setStorageError && setStorageError(null)}
            className="text-rose-800 dark:text-rose-200 hover:underline ml-4 font-semibold shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <main className="py-6 sm:py-8 px-4 sm:px-8 relative w-full min-w-0 flex-1">
        <div className="max-w-6xl mx-auto min-w-0">
          <ErrorBoundary key={activeTab} fallbackTitle={`Unable to display ${activeTab} view`}>
            {renderContent()}
          </ErrorBoundary>
        </div>
      </main>

      <footer className="py-5 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Learning Tracker · Serious STEM with Tactile Clarity</span>
          <span>© {new Date().getFullYear()} · Truthful Evidence Engine</span>
        </div>
      </footer>

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
        <Route path="/trajectory" element={<AppContent />} />
        <Route path="/settings" element={<AppContent />} />
        <Route path="*" element={<AppContent />} />
      </Routes>
    </RoadmapProvider>
  );
}

export default App;
