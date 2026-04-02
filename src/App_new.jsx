import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import PomodoroTimer from './components/PomodoroTimer';
import Settings from './components/Settings';
import Statistics from './components/Statistics';
import Achievements from './components/Achievements';
import AchievementNotification from './components/AchievementNotification';
import Dashboard from './components/Dashboard';
import LearningPlan from './components/LearningPlan';
import { RoadmapProvider, useRoadmap } from './context/RoadmapContext';

function AppContent() {
  const { subjects, hasRoadmap, getStats, getPendingTasks, selectedSubjectId, selectedSubject, getSubjectStats, toggleTaskComplete, toggleSubtaskComplete } = useRoadmap();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);

  const handleTaskClick = (subject, phase, task) => {
  const pendingTasks = getPendingTasks(selectedSubjectId);

  // Get phases for selected subject only
  const subjectPhases = selectedSubject 
    ? selectedSubject.phases.map((phase, index) => {
        const totalTasks = phase.tasks.length;
        const completedTasks = phase.tasks.filter(t => t.completed).length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        return {
          id: phase.id,
          title: phase.name,
          description: phase.description || `Phase ${index + 1}`,
          progress,
          status: progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started',
          tasks: phase.tasks.map(t => ({ name: t.name, completed: t.completed })),
          color: ['blue', 'green', 'purple', 'orange', 'pink'][0],
        };
      })
    : [];

  const renderDashboard = () => <Dashboard />;

  const handleTaskClick = (subject, phase, task) => {
    setActiveTaskDetails({
      task,
      subjectName: subject.name,
      phaseName: phase.name,
    });
  };

  const renderRoadmap = () => <Roadmap />;

  const renderSetup = () => (
    <LearningPlanSetup onComplete={handleSetupComplete} />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'roadmap':
        return renderRoadmap();
      case 'learning-plan':
        return <LearningPlan />;
      case 'achievements':
        return <Achievements />;
      case 'stats':
        return <Statistics />;
      case 'setup':
        return renderSetup();
      case 'settings':
        return <Settings />;
      default:
        console.error(`Invalid activeTab: ${activeTab}`);
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Page Not Found</h2>
              <p className="text-gray-600 mb-4">The requested page does not exist.</p>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {activeTab !== 'setup' && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}
      <main className={`flex-1 overflow-y-auto p-8 ${activeTab === 'setup' ? 'w-full' : ''}`}>
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
      
      {/* Pomodoro Timer Modal */}
      {timerModalOpen && activeTask && (
        <PomodoroTimer
          taskName={activeTask.name}
          phaseName={activeTask.phaseName}
          isOpen={timerModalOpen}
          onClose={handleCloseTimer}
          autoStart={true}
        />
      )}
      {/* Achievement Notification */}
      <AchievementNotification />
      
    </div>
  );
}

function App() {
  return (
    <RoadmapProvider>
      <AppContent />
    </RoadmapProvider>
  );
}

export default App;
