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
import SpiderRevisionOverlay from './components/SpiderRevisionOverlay';
import { RoadmapProvider, useRoadmap } from './context/RoadmapContext';
import {
  getDueRevisionTopics,
  isRevisionOverlayPermitted,
  snoozeRevisionReminder,
  dismissRevisionReminderForSession,
  recordTopicRevisionConfirmed
} from './services/revisionReminderService';

import ErrorBoundary from './components/ErrorBoundary';
import { TAB_TO_PATH, PATH_TO_TAB, TAB_TITLES } from './utils/navigation';
import dashboardAmbientBg from './assets/dashboard/dashboard_ambient_bg.jpg';
import WallpaperCustomizerModal from './components/WallpaperCustomizerModal';
export { TAB_TO_PATH, PATH_TO_TAB, TAB_TITLES };

function AppContent() {
  const {
    showTutorial,
    completeTutorial,
    setTutorialStepNumber,
    isDarkMode,
    wallpaper,
    palette,
    isWallpaperModalOpen,
    setIsWallpaperModalOpen,
    focusSession,
    beginFocusRunning,
    pauseFocusSession,
    resumeFocusSession,
    openReflectionSession,
    commitFocusSession,
    abandonFocusSession,
    extendFocusSession,
    startFocusBreak,
    resumeFocusFromBreak,
    storageError,
    setStorageError,
    corruptedDataKeys = [],
    dismissCorruptedNotice,
    subjects = [],
    roadmap = [],
    taskCompletions = [],
    sessions = [],
    settings = {},
    updateSettings,
    selectLearningContext
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

  // Deterministic revision scheduling & spider reminder state
  const [isRevisionOverlayOpen, setIsRevisionOverlayOpen] = React.useState(false);
  const [previewRevisionTopic, setPreviewRevisionTopic] = React.useState(null);

  const dueRevisionData = React.useMemo(() => {
    return getDueRevisionTopics({
      subjects,
      roadmap,
      taskCompletions,
      sessions,
      settings
    });
  }, [subjects, roadmap, taskCompletions, sessions, settings]);

  // Support manual / preview triggering from Settings
  React.useEffect(() => {
    const handleTestPopup = (e) => {
      const interval = e?.detail?.interval || settings?.revisionIntervalDays || 10;
      const sampleTopic = dueRevisionData.mostOverdueTopic || {
        id: 'sample-recall-topic',
        name: 'Harmonic Oscillation & Damped Resonance',
        subjectName: 'Circuits & Physical Systems',
        revisionStatus: {
          daysSinceLastActivity: interval,
          intervalDays: interval,
          daysOverdue: 0,
          lastActivityDateKey: '2026-10-16'
        }
      };
      setPreviewRevisionTopic(sampleTopic);
      setIsRevisionOverlayOpen(true);
    };

    window.addEventListener('lt_test_revision_popup', handleTestPopup);
    return () => window.removeEventListener('lt_test_revision_popup', handleTestPopup);
  }, [dueRevisionData.mostOverdueTopic, settings?.revisionIntervalDays]);

  React.useEffect(() => {
    if (!dueRevisionData.mostOverdueTopic && !previewRevisionTopic) {
      setIsRevisionOverlayOpen(false);
      return;
    }
    const permitted = isRevisionOverlayPermitted({
      isFocusActive: Boolean(focusSession),
      isModalOpen: false,
      isPairingActive: false
    });
    if (permitted) {
      setIsRevisionOverlayOpen(true);
    }
  }, [dueRevisionData.mostOverdueTopic, previewRevisionTopic, focusSession]);

  const handleStartRevision = (topic) => {
    const topicId = topic.subtaskId || topic.taskId || topic.id;
    if (topicId && updateSettings) {
      recordTopicRevisionConfirmed({ updateSettings, topicId });
    }
    if (topic.subjectId && selectLearningContext) {
      selectLearningContext({
        subjectId: topic.subjectId,
        phaseId: topic.phaseId,
        taskId: topic.taskId || topic.id,
        subtaskId: topic.subtaskId || null
      });
    }
    setPreviewRevisionTopic(null);
    navigate('/');
    setIsRevisionOverlayOpen(false);
  };

  const handleSnoozeRevision = () => {
    snoozeRevisionReminder(4);
    setPreviewRevisionTopic(null);
    setIsRevisionOverlayOpen(false);
  };

  const handleDismissRevision = () => {
    dismissRevisionReminderForSession();
    setPreviewRevisionTopic(null);
    setIsRevisionOverlayOpen(false);
  };

  // If currently in Focus Mode, application enters the quiet focus space
  if (focusSession) {
    return (
      <div className="min-h-screen bg-[#141312] text-warmwhite">
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
            onExtendTime={extendFocusSession}
            onStartBreak={startFocusBreak}
            onResumeFromBreak={resumeFocusFromBreak}
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
    <div className={`min-h-screen flex flex-col transition-colors duration-200 spatial-environment relative ${isDarkMode ? 'text-stone-100 bg-[#0A0E17]' : 'text-stone-900 bg-[#FDFBF7]'}`}>
      {/* Dynamic Ambient Background Layer for authentic glassmorphism */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center opacity-95 transition-all duration-700"
        style={{ backgroundImage: `url(${wallpaper || dashboardAmbientBg})` }}
        aria-hidden="true"
      />
      {/* Adaptive Sunlight & Atmosphere Refraction Light Wash */}
      <div
        className="fixed inset-0 pointer-events-none z-0 anim-aurora transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at top left, ${palette?.orb1 || 'rgba(245,158,11,0.22)'} 0%, transparent 55%), radial-gradient(ellipse at bottom right, ${palette?.orb2 || 'rgba(217,119,6,0.14)'} 0%, transparent 50%)`
        }}
        aria-hidden="true"
      />
      {/* Clean Theme Differentiation Wash: Bright Luminous Frosted Veil in Light Mode, Deep Obsidian in Dark Mode */}
      <div
        className={`fixed inset-0 pointer-events-none z-0 transition-colors duration-700 ${
          isDarkMode
            ? 'bg-gradient-to-b from-[#090D16]/45 via-[#070A12]/55 to-[#04060A]/75'
            : 'bg-gradient-to-b from-white/75 via-slate-100/65 to-slate-200/55'
        }`}
        aria-hidden="true"
      />
      <CustomCursor />
      <div className="relative z-10 flex flex-col flex-1">
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

      <main className="py-6 sm:py-8 px-3 sm:px-6 lg:px-8 relative w-full min-w-0 flex-1">
        <div key={activeTab} className="w-full max-w-[min(96vw,1680px)] mx-auto min-w-0 anim-curtain-reveal">
          <ErrorBoundary fallbackTitle={`Unable to display ${activeTab} view`}>
            {renderContent()}
          </ErrorBoundary>
        </div>
      </main>

      <footer className="py-5 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
        <div className="w-full max-w-[min(96vw,1680px)] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span className="min-w-0 break-words">Learning Tracker · Serious STEM with Tactile Clarity</span>
          <span className="min-w-0 break-words">© {new Date().getFullYear()} · Truthful Evidence Engine</span>
        </div>
      </footer>
      </div>

      <AchievementNotification />

      <SpiderRevisionOverlay
        isOpen={isRevisionOverlayOpen && !focusSession}
        dueTopic={dueRevisionData.mostOverdueTopic || previewRevisionTopic}
        totalWaitingCount={dueRevisionData.totalDueCount}
        onStartRevision={handleStartRevision}
        onSnooze={handleSnoozeRevision}
        onDismiss={handleDismissRevision}
        onUpdateInterval={(newDays) => {
          if (updateSettings) {
            updateSettings({ revisionIntervalDays: newDays });
          }
        }}
      />

      {showTutorial && (
        <Onboarding
          onComplete={completeTutorial}
          onStepChange={setTutorialStepNumber}
        />
      )}

      <WallpaperCustomizerModal
        isOpen={Boolean(isWallpaperModalOpen)}
        onClose={() => setIsWallpaperModalOpen && setIsWallpaperModalOpen(false)}
      />
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
