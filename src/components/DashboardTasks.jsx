import React, { useState, useEffect, useCallback } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import PomodoroTimer from './PomodoroTimer';
import TaskCompletionModal from './TaskCompletionModal';
import { Play, CheckCircle, Clock, Target, Brain } from 'lucide-react';
import { getLocalDateKey, addDaysToDateKey } from '../utils/dateUtils';

const DashboardTasks = () => {
  const { 
    subjects, 
    getNextSubtask, 
    getNextSubtaskForSubject, 
    completeSubtask,
    toggleTaskCompletion,
    addFocusSession,
    isTaskCompleted,
    sessions,
    setLearningPlan, 
    learningPlan, 
    storeCompleteAction, 
    undoLastAction, 
    lastAction, 
    settings,
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
  const totalTasks = (subjects || []).reduce(
    (total, subject) =>
      total +
      (subject.phases || []).reduce(
        (phaseTotal, phase) =>
          phaseTotal + (phase.tasks || []).length,
        0
      ),
    0
  );

  const tasksCompleted = (subjects || []).reduce(
    (total, subject) =>
      total +
      (subject.phases || []).reduce(
        (phaseTotal, phase) =>
          phaseTotal +
          (phase.tasks || []).filter(isTaskCompleted).length,
        0
      ),
    0
  );

  const summaryStats = {
    totalSubjects: Array.isArray(subjects) ? subjects.length : 0,
    totalPhases: Array.isArray(subjects) ? subjects.reduce((sum, subject) => sum + (subject.phases?.length || 0), 0) : 0,
    totalTasks,
    tasksCompleted
  };

  // Focus stats for today
  const today = getLocalDateKey();
  const todaySessions = (sessions || []).filter(session =>
    session.date?.startsWith(today)
  );
  const todayFocusMinutes = todaySessions.reduce(
    (total, session) =>
      total +
      Number(
        session.durationMinutes ||
        session.duration ||
        0
      ),
    0
  );

  // Utility function to find task details from learning plan task
  const findTaskDetailsFromLearningPlan = useCallback(
    (learningTask, subjectsArray) => {
      if (!learningTask || !Array.isArray(subjectsArray)) {
        return null;
      }

      const subject = subjectsArray.find(
        s => s.id === learningTask.subjectId
      );

      const phase = subject?.phases?.find(
        p => p.id === learningTask.phaseId
      );

      const task = phase?.tasks?.find(
        t => t.id === learningTask.taskId
      );

      if (!subject || !phase || !task) {
        return null;
      }

      // Scheduled subtask
      if (learningTask.subtaskId) {
        const subtask = task.subtasks?.find(
          s => s.id === learningTask.subtaskId
        );

        if (!subtask || subtask.completed) {
          return null;
        }

        return {
          id: subtask.id,
          name: subtask.name,

          subjectId: subject.id,
          subjectName: subject.name,

          phaseId: phase.id,
          phaseName: phase.name,

          taskId: task.id,
          taskName: task.name,

          subtaskId: subtask.id,

          learningPlanEntryId: learningTask.id,
          isLearningPlanTask: true
        };
      }

      // Task with no subtasks
      if (!task.subtasks?.length && !task.completed) {
        return {
          id: task.id,
          name: task.name,

          subjectId: subject.id,
          subjectName: subject.name,

          phaseId: phase.id,
          phaseName: phase.name,

          taskId: task.id,
          taskName: task.name,

          subtaskId: null,

          learningPlanEntryId: learningTask.id,
          isLearningPlanTask: true
        };
      }

      return null;
    },
    []
  );

  // Get today's task with priority: learning plan first, then roadmap
  useEffect(() => {
    const today = getLocalDateKey();
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

  const finishTask = (task, completionData = {}) => {
    if (!task) return;

    const {
      timeSpent = settings?.pomodoroWorkDuration || 25,
      notes = '',
      difficulty = 'medium'
    } = completionData;

    // Complete the exact atomic item.
    let completion = null;
    if (task.subtaskId) {
      completion = completeSubtask({
        subjectId: task.subjectId,
        phaseId: task.phaseId,
        taskId: task.taskId,
        subtaskId: task.subtaskId
      });
    } else {
      // Task without subtasks.
      completion = toggleTaskCompletion(
        task.subjectId,
        task.phaseId,
        task.taskId
      );
    }

    const durationNum = Number(timeSpent) || 25;

    // Record learning session.
    const session = addFocusSession({
      subjectId: task.subjectId,
      phaseId: task.phaseId,
      taskId: task.taskId,
      subtaskId: task.subtaskId || null,
      durationMinutes: durationNum,
      type: 'task-completion',
      notes,
      difficulty
    });

    // Store action for undo — use the real session.id and completion.id so undo can invert all records.
    storeCompleteAction(
      task.subtaskId || task.taskId,
      session?.id,
      completion?.id
    );

    // If this came from Learning Plan,
    // remove ONLY that scheduled occurrence.
    if (task.learningPlanEntryId) {
      setLearningPlan(prev =>
        prev.filter(
          entry => entry.id !== task.learningPlanEntryId
        )
      );
    }

    setShowCompletionModal(false);
    setSelectedTask(null);
    setShowTimer(false);

    // Auto-load next task
    setTimeout(() => {
      const next = selectedSubjectId ? getNextSubtaskForSubject(selectedSubjectId) : getNextSubtask();
      setNextTask(next);
    }, 100);
  };

  const postponeTask = (task) => {
    setSelectedTask(task);
    setShowPostponeModal(true);
    // Set default date to tomorrow
    setPostponeDate(addDaysToDateKey(getLocalDateKey(), 1));
  };

  const confirmPostpone = (customDate = null) => {
    const targetDate = typeof customDate === 'string' ? customDate : postponeDate;
    if (!targetDate || !selectedTask) return;
    
    const newLearningPlanEntry = {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      subjectId: selectedTask.subjectId,
      phaseId: selectedTask.phaseId,
      taskId: selectedTask.taskId,
      subtaskId: selectedTask.subtaskId || null,
      scheduledDate: targetDate
    };
    
    setLearningPlan(prev => {
      const filtered = selectedTask.learningPlanEntryId
        ? (prev || []).filter(e => e.id !== selectedTask.learningPlanEntryId)
        : (prev || []);
      return [...filtered, newLearningPlanEntry];
    });
    
    // Close modals
    setShowPostponeModal(false);
    setShowCompletionModal(false);
    setSelectedTask(null);
    setPostponeDate('');
    
    // Refresh today's task
    const today = getLocalDateKey();
    const todayLearningTask = (learningPlan || []).find(task => 
      task.scheduledDate === today && 
      task.id !== selectedTask.learningPlanEntryId &&
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
      } else {
        setNextTask(null);
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
                subtaskId={selectedTask.subtaskId || null}
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
            <div className="text-2xl font-bold text-blue-600">{todaySessions.length}</div>
            <div className="text-sm text-gray-500">Sessions Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{(todayFocusMinutes / 60).toFixed(1)}h</div>
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
          subtaskId={selectedTask.subtaskId || null}
          onComplete={(completionData) => finishTask(selectedTask, completionData)}
          onPostpone={(postponeData) => {
            if (postponeData?.postponeDate) {
              confirmPostpone(postponeData.postponeDate);
            } else {
              postponeTask(selectedTask);
            }
          }}
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
                  min={getLocalDateKey()}
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
