import React, { useState } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { Plus, CheckCircle } from 'lucide-react';

const LearningPlanPage = () => {
  const { learningPlan, setLearningPlan, subjects, toggleSubtaskComplete, storeAutoAssignAction, storeCompleteAction, lastAction, undoLastAction } = useRoadmap();
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // Get selected subject data
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  // Function to get task details from roadmap
  const getTaskDetails = (taskId, phaseId, subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return { subjectName: 'Unknown Subject', phaseName: 'Unknown Phase', taskName: 'Unknown Task' };
    
    const phase = subject.phases?.find(p => p.id === phaseId);
    if (!phase) return { subjectName: subject.name, phaseName: 'Unknown Phase', taskName: 'Unknown Task' };
    
    const task = phase.tasks?.find(t => t.id === taskId);
    if (!task) return { subjectName: subject.name, phaseName: phase.name, taskName: 'Unknown Task' };
    
    return {
      subjectName: subject.name,
      phaseName: phase.name,
      taskName: task.name
    };
  };

  // Filter learning plan tasks by selected subject
  const subjectLearningTasks = learningPlan?.filter(task => 
    !selectedSubjectId || task.subjectId === selectedSubjectId
  ) || [];

  // Check if selected subject has scheduled tasks
  const hasScheduledTasks = subjectLearningTasks.length > 0;

  // Auto assign tasks for selected subject if no scheduled tasks
  const autoAssignTasks = () => {
    if (!selectedSubject || hasScheduledTasks) return;
    
    const batchId = Date.now();
    const allIncompleteSubtasks = [];
    selectedSubject.phases?.forEach(phase => {
      phase.tasks?.forEach(task => {
        task.subtasks?.forEach(subtask => {
          if (!subtask.completed) {
            allIncompleteSubtasks.push({
              id: Date.now() + Math.random(),
              subjectId: selectedSubject.id,
              phaseId: phase.id,
              taskId: task.id,
              scheduledDate: today,
              isAutoAssigned: true,
              batchId: batchId
            });
          }
        });
      });
    });

    if (allIncompleteSubtasks.length === 0) {
      alert('No incomplete tasks found for auto assignment.');
      return;
    }

    // Assign tasks day by day (max 1 per day for clarity)
    const assignedTasks = allIncompleteSubtasks.map((task, index) => ({
      ...task,
      scheduledDate: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));

    setLearningPlan(prev => [...prev, ...assignedTasks]);
    
    // Store action for undo
    storeAutoAssignAction(batchId);
    
    console.log(`Auto-assigned ${assignedTasks.length} tasks for ${selectedSubject.name}`);
  };

  // Schedule a task for a specific date
  const scheduleTask = (taskId, phaseId, scheduledDate) => {
    const newTask = {
      id: Date.now(),
      subjectId: selectedSubjectId,
      phaseId: phaseId,
      taskId: taskId,
      scheduledDate: scheduledDate
    };
    
    setLearningPlan(prev => [...prev, newTask]);
  };

  // Complete a task by updating roadmap
  const completeTask = (taskId, phaseId, subjectId) => {
    // Find the task and its subtasks
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    const phase = subject.phases?.find(p => p.id === phaseId);
    if (!phase) return;
    
    const task = phase.tasks?.find(t => t.id === taskId);
    if (!task) return;
    
    // Toggle completion for all subtasks in this task
    task.subtasks?.forEach(subtask => {
      toggleSubtaskComplete(subjectId, phaseId, taskId, subtask.id);
    });
    
    // Store completion action for undo (use first subtask as representative)
    if (task.subtasks && task.subtasks.length > 0) {
      storeCompleteAction(task.subtasks[0].id, null);
    }
    
    // Remove from learning plan
    setLearningPlan(prev => prev?.filter(t => t.taskId !== taskId) || []);
  };

  // Group tasks by date for display
  const tasksByDate = subjectLearningTasks?.reduce((groups, task) => {
    const date = task.scheduledDate;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(task);
    return groups;
  }, {}) || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Learning Plan</h1>
        <p className="text-gray-500 mt-1">Schedule and track your learning tasks</p>
      </div>

      {/* Subject Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
        <select
          value={selectedSubjectId || ''}
          onChange={(e) => setSelectedSubjectId(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Subjects</option>
          {subjects.map(subject => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        
        {/* Show total assigned tasks for All Subjects view */}
        {!selectedSubjectId && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">
                Total assigned tasks: <span className="font-semibold text-gray-800">{learningPlan?.length || 0}</span>
              </div>
            </div>
            
            {(learningPlan?.length || 0) > 0 && (
              <button
                onClick={() => {
                  const planLength = learningPlan?.length || 0;
                  if (window.confirm(`Are you sure you want to remove all ${planLength} scheduled tasks from all subjects? This will allow you to auto assign fresh tasks.`)) {
                    setLearningPlan([]);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Clear All Tasks (All Subjects)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Auto Assign Button */}
      {selectedSubject && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-3">
            <button
              onClick={autoAssignTasks}
              disabled={hasScheduledTasks}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                hasScheduledTasks 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              {hasScheduledTasks 
                ? `Tasks Already Assigned for ${selectedSubject.name}`
                : `Auto Assign Tasks for ${selectedSubject.name}`
              }
            </button>
            
            {hasScheduledTasks && (
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to remove all ${subjectLearningTasks.length} scheduled tasks for ${selectedSubject.name}? This will allow you to auto assign fresh tasks.`)) {
                    setLearningPlan(prev => prev?.filter(task => task.subjectId !== selectedSubject.id) || []);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Clear All Tasks for {selectedSubject.name}
              </button>
            )}
            
            {hasScheduledTasks && (
              <p className="text-xs text-gray-500 mt-2">
                This subject already has {subjectLearningTasks.length} scheduled task{subjectLearningTasks.length !== 1 ? 's' : ''}. Remove them to auto assign.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Phases and Tasks */}
      {selectedSubject && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Schedule Tasks</h3>
          <div className="space-y-6">
            {selectedSubject.phases?.map(phase => (
              <div key={phase.id} className="border-b border-gray-200 pb-4 last:border-0">
                <h4 className="font-medium text-gray-800 mb-3">{phase.name}</h4>
                <div className="space-y-2">
                  {phase.tasks?.map(task => {
                    const existingTask = subjectLearningTasks.find(
                      lt => lt.taskId === task.id && lt.phaseId === phase.id
                    );
                    
                    return (
                      <div key={task.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{task.name}</div>
                          {existingTask && (
                            <div className="text-sm text-green-600">
                              Scheduled: {existingTask.scheduledDate}
                            </div>
                          )}
                        </div>
                        <input
                          type="date"
                          min={today}
                          defaultValue={existingTask?.scheduledDate || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              scheduleTask(task.id, phase.id, e.target.value);
                            }
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Tasks by Date */}
      {(Object.keys(tasksByDate || {}).length) > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Scheduled Tasks</h3>
          <div className="space-y-4">
            {Object.entries(tasksByDate)
              .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
              .map(([date, tasks]) => {
                const isToday = date === today;
                return (
                  <div key={date} className={`border rounded-lg p-4 ${isToday ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-semibold ${isToday ? 'text-blue-800' : 'text-gray-800'}`}>
                        {isToday ? 'Today' : new Date(date).toLocaleDateString()}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {(tasks?.length || 0)} {(tasks?.length || 0) === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(tasks || []).map(task => {
                        const taskDetails = getTaskDetails(task.taskId, task.phaseId, task.subjectId);
                        
                        return (
                          <div key={task.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-gray-800">{taskDetails.taskName}</h5>
                                <p className="text-sm text-gray-500">{taskDetails.phaseName}</p>
                                {task.isAutoAssigned && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Auto-assigned</span>
                                )}
                              </div>
                              <button 
                                onClick={() => {
                                  completeTask(task.taskId, task.phaseId, task.subjectId);
                                }}
                                className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg text-sm"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Complete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Undo Option */}
      {lastAction && lastAction.type === "COMPLETE" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Task completed
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
    </div>
  );
};

export default LearningPlanPage;
