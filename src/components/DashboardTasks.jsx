import React, { useState, useEffect, useCallback } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import PomodoroTimer from './PomodoroTimer';
import TaskCompletionModal from './TaskCompletionModal';
import { Play, CheckCircle, Clock, Target, Brain } from 'lucide-react';

const DashboardTasks = () => {
  const { 
    subjects, 
    getNextSubtask, 
    getNextSubtaskForSubject, 
    addFocusSession, 
    toggleSubtaskComplete, 
    setLearningPlan, 
    learningPlan, 
    storeCompleteAction, 
    undoLastAction, 
    lastAction, 
    settings,
    recordTaskCompletion,
    selectedSubjectId,
    setSelectedSubjectId
  } = useRoadmap();
  const [showTimer, setShowTimer] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [nextTask, setNextTask] = useState(null);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponeDate, setPostponeDate] = useState('');

  // Calculate summary statistics
  const summaryStats = {
    totalSubjects: Array.isArray(subjects) ? subjects.length : 0,
    totalPhases: Array.isArray(subjects) ? subjects.reduce((sum, subject) => sum + (subject.phases?.length || 0), 0) : 0,
    totalTasks: Array.isArray(subjects) ? subjects.reduce((sum, subject) => 
      sum + subject.phases?.reduce((phaseSum, phase) => phaseSum + (phase.tasks?.length || 0), 0) || 0, 0) : 0,
    tasksCompleted: Array.isArray(subjects) ? subjects.reduce((sum, subject) => 
      sum + subject.phases?.reduce((phaseSum, phase) => 
        phaseSum + phase.tasks?.reduce((taskSum, task) => 
          taskSum + (task.subtasks?.filter(subtask => subtask.completed).length || 0), 0) || 0, 0) || 0, 0) : 0
  };

  // Utility function to find task details from learning plan task
  const findTaskDetailsFromLearningPlan = useCallback((learningTask, subjectsArray) => {
    if (!learningTask || !Array.isArray(subjectsArray)) return null;
    
    let taskDetails = null;
    subjectsArray.forEach(subject => {
      if (subject.id === learningTask.subjectId) {
        subject.phases?.forEach(phase => {
          if (phase.id === learningTask.phaseId) {
            phase.tasks?.forEach(task => {
              if (task.id === learningTask.taskId) {
                taskDetails = {
                  id: task.id,
                  name: task.name,
                  subjectId: learningTask.subjectId,
                  subjectName: subject.name,
                  phaseId: learningTask.phaseId,
                  phaseName: phase.name,
                  taskId: task.id,
                  taskName: task.name,
                  isLearningPlanTask: true
                };
              }
            });
          }
        });
      }
    });
    return taskDetails;
  }, []);

  // Get today's task with priority: learning plan first, then roadmap
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLearningTask = learningPlan?.find(task => 
      task.scheduledDate === today && 
      (!selectedSubjectId || task.subjectId === selectedSubjectId)
    );
    
    if (todayLearningTask) {
      const taskDetails = findTaskDetailsFromLearningPlan(todayLearningTask, subjects);
      setNextTask(taskDetails);
    } else {
      const task = selectedSubjectId ? getNextSubtaskForSubject(selectedSubjectId) : getNextSubtask();
      if (task) {
        setNextTask({
          ...task,
          isLearningPlanTask: false
        });
      }
    }
  }, [subjects, getNextSubtask, getNextSubtaskForSubject, selectedSubjectId, learningPlan, findTaskDetailsFromLearningPlan]);

  const handleStartTask = (task) => {
    setSelectedTask(task);
    setShowTimer(true);
  };

  const handleCompleteTask = (task) => {
    setSelectedTask(task);
    setShowCompletionModal(true);
  };

  const finishTask = (task) => {
    // Calculate actual elapsed time - this would come from timer state
    // For now, we'll use the settings duration as a fallback
    const durationMinutes = settings?.pomodoroWorkDuration || 25;
    
    // Record the task completion with actual time spent
    recordTaskCompletion(task.taskId, durationMinutes);
    
    // Toggle subtask completion
    toggleSubtaskComplete(task.subjectId, task.phaseId, task.taskId, task.id);
    
    // Store action for undo
    storeCompleteAction(task.id, Date.now());
    
    // Close modal
    setShowCompletionModal(false);
    setSelectedTask(null);
    
    // Auto-load next task
    setTimeout(() => {
      const next = getNextSubtask();
      setNextTask(next);
    }, 100);
  };

  const postponeTask = (task) => {
    setSelectedTask(task);
    setShowPostponeModal(true);
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPostponeDate(tomorrow.toISOString().split('T')[0]);
  };

  const confirmPostpone = () => {
    if (!postponeDate || !selectedTask) return;
    
    const newLearningPlanEntry = {
      id: Date.now(),
      subjectId: selectedTask.subjectId,
      phaseId: selectedTask.phaseId,
      taskId: selectedTask.taskId,
      scheduledDate: postponeDate
    };
    
    setLearningPlan(prev => [...prev, newLearningPlanEntry]);
    
    // Close modal
    setShowPostponeModal(false);
    setSelectedTask(null);
    setPostponeDate('');
    
    // Refresh today's task
    const today = new Date().toISOString().split('T')[0];
    const todayLearningTask = learningPlan?.find(task => 
      task.scheduledDate === today && 
      (!selectedSubjectId || task.subjectId === selectedSubjectId)
    );
    
    if (todayLearningTask) {
      const taskDetails = findTaskDetailsFromLearningPlan(todayLearningTask, subjects);
      setNextTask(taskDetails);
    } else {
      const task = selectedSubjectId ? getNextSubtaskForSubject(selectedSubjectId) : getNextSubtask();
      if (task) {
        setNextTask({
          ...task,
          isLearningPlanTask: false
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summaryStats.totalSubjects}</div>
            <div className="text-sm text-gray-500">Total Subjects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summaryStats.totalPhases}</div>
            <div className="text-sm text-gray-500">Total Phases</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{summaryStats.totalTasks}</div>
            <div className="text-sm text-gray-500">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{summaryStats.tasksCompleted}</div>
            <div className="text-sm text-gray-500">Tasks Completed</div>
          </div>
        </div>
      </div>

      {/* Subject Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Subject</h3>
        <select
          value={selectedSubjectId || ''}
          onChange={(e) => setSelectedSubjectId(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Subjects</option>
          {Array.isArray(subjects) && subjects.map(subject => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      {/* Today's Task */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Task</h3>
        {nextTask ? (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Phase</div>
              <div className="font-medium text-gray-800">{nextTask.phaseName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Task</div>
              <div className="font-medium text-gray-800">{nextTask.taskName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Subtask</div>
              <div className="font-medium text-gray-800">{nextTask.name}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleStartTask(nextTask)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Timer
              </button>
              <button
                onClick={() => handleCompleteTask(nextTask)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Finish
              </button>
              <button
                onClick={() => postponeTask(nextTask)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Postpone
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No tasks available for selected subject.</p>
          </div>
        )}
      </div>

      {/* Undo Option */}
      {lastAction && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {lastAction.type === "COMPLETE" 
                ? "Task completed" 
                : "Auto assign completed"
              }
            </div>
            <button
              onClick={undoLastAction}
              className="flex items-center gap-2 px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Current Task */}
      {selectedTask && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Current Task</h3>
            <button
              onClick={() => setShowTimer(!showTimer)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showTimer ? 'Hide Timer' : 'Show Timer'}
            </button>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium text-gray-800">{selectedTask.name}</div>
              <div className="text-sm text-gray-500">
                {selectedTask.subjectName} → {selectedTask.phaseName}
              </div>
            </div>
          </div>

          {showTimer && (
            <div className="mb-4">
              <PomodoroTimer
                subjectId={selectedTask.subjectId}
                phaseId={selectedTask.phaseId}
                taskId={selectedTask.taskId}
                subtaskId={selectedTask.id}
                taskName={selectedTask.name}
                phaseName={selectedTask.phaseName}
                onClose={() => setShowTimer(false)}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleCompleteTask(selectedTask)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Mark as Complete
            </button>
            <button
              onClick={() => postponeTask(selectedTask)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Postpone
            </button>
          </div>
        </div>
      )}

      {/* Focus Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Focus Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-500">Sessions Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">0h</div>
            <div className="text-sm text-gray-500">Focus Time</div>
          </div>
        </div>
      </div>

      {/* No Tasks */}
      {!nextTask && !selectedTask && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">All Tasks Completed!</h3>
          <p className="text-gray-500">
            Great job! You've completed all your tasks. Time to add more to your roadmap.
          </p>
        </div>
      )}

      {/* Task Completion Modal */}
      {showCompletionModal && selectedTask && (
        <TaskCompletionModal
          isOpen={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false);
            setSelectedTask(null);
          }}
          taskName={selectedTask.name}
          subjectId={selectedTask.subjectId}
          phaseId={selectedTask.phaseId}
          taskId={selectedTask.taskId}
          subtaskId={selectedTask.id}
          onComplete={() => finishTask(selectedTask)}
          onPostpone={() => postponeTask(selectedTask)}
        />
      )}

      {/* Postpone Modal */}
      {showPostponeModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Postpone Task</h3>
              <button
                onClick={() => {
                  setShowPostponeModal(false);
                  setSelectedTask(null);
                  setPostponeDate('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Date
                </label>
                <input
                  type="date"
                  value={postponeDate}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPostponeModal(false);
                    setSelectedTask(null);
                    setPostponeDate('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPostpone}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTasks;
