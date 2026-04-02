import React, { useState } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { ChevronRight, ChevronDown, CheckCircle2, Trash2, Calendar } from 'lucide-react';

const TaskTree = () => {
  const { subjects, toggleSubtask, deleteSubject, updateSubjectDeadline } = useRoadmap();
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [deadlineModal, setDeadlineModal] = useState({ show: false, subjectId: null, deadline: '' });

  const toggleExpand = (type, id) => {
    switch (type) {
      case 'subject':
        setExpandedSubjects(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return newSet;
        });
        break;
      case 'phase':
        setExpandedPhases(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return newSet;
        });
        break;
      case 'task':
        setExpandedTasks(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return newSet;
        });
        break;
    }
  };

  const handleSubtaskToggle = (subjectId, phaseId, taskId, subtaskId, e) => {
    e.stopPropagation();
    toggleSubtask(subjectId, phaseId, taskId, subtaskId);
  };

  const handleDeleteSubject = (subjectId) => {
    if (window.confirm('Are you sure you want to delete this subject and all its phases and tasks?')) {
      deleteSubject(subjectId);
    }
  };

  const handleSetDeadline = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    setDeadlineModal({
      show: true,
      subjectId: subjectId,
      deadline: subject.deadline ? new Date(subject.deadline).toISOString().split('T')[0] : ''
    });
  };

  const handleSaveDeadline = () => {
    if (deadlineModal.subjectId && deadlineModal.deadline) {
      updateSubjectDeadline(deadlineModal.subjectId, deadlineModal.deadline);
      setDeadlineModal({ show: false, subjectId: null, deadline: '' });
    }
  };

  const getProgress = (items) => {
    if (!items || items.length === 0) return 0;
    const completed = items.filter(item => item.completed).length;
    return Math.round((completed / items.length) * 100);
  };

  const getTaskProgress = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return task.completed ? 100 : 0;
    }
    const completed = task.subtasks.filter(st => st.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const getPhaseProgress = (phase) => {
    if (!phase.tasks || phase.tasks.length === 0) return 0;
    const completed = phase.tasks.filter(task => {
      if (!task.subtasks || task.subtasks.length === 0) {
        return task.completed;
      }
      return task.subtasks.every(st => st.completed);
    }).length;
    return Math.round((completed / phase.tasks.length) * 100);
  };

  const getSubjectProgress = (subject) => {
    if (!subject.phases || subject.phases.length === 0) return 0;
    const completed = subject.phases.filter(phase => {
      if (!phase.tasks || phase.tasks.length === 0) return false;
      return phase.tasks.every(task => {
        if (!task.subtasks || task.subtasks.length === 0) {
          return task.completed;
        }
        return task.subtasks.every(st => st.completed);
      });
    }).length;
    return Math.round((completed / subject.phases.length) * 100);
  };

  return (
    <div className="space-y-4">
      {subjects.map((subject) => {
        const isSubjectExpanded = expandedSubjects.has(subject.id);
        const subjectProgress = getSubjectProgress(subject);

        return (
          <div key={subject.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Subject Header */}
            <div
              className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => toggleExpand('subject', subject.id)}
            >
              <div className="flex items-center gap-3">
                <div className="text-blue-600">
                  {isSubjectExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{subject.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>Progress: {subjectProgress}%</span>
                    {subject.deadline && <span>Deadline: {new Date(subject.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${subjectProgress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600">{subjectProgress}%</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetDeadline(subject.id);
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Set deadline"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubject(subject.id);
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Delete subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Phases */}
            {isSubjectExpanded && subject.phases && (
              <div className="border-t border-gray-100">
                {subject.phases.map((phase) => {
                  const isPhaseExpanded = expandedPhases.has(phase.id);
                  const phaseProgress = getPhaseProgress(phase);

                  return (
                    <div key={phase.id} className="border-b border-gray-100 last:border-0">
                      {/* Phase Header */}
                      <div
                        className="flex items-center justify-between p-4 pl-12 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleExpand('phase', phase.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-purple-600">
                            {isPhaseExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{phase.name}</h4>
                            <div className="text-sm text-gray-500 mt-1">
                              Progress: {phaseProgress}% ({phase.tasks?.filter(t => {
                                if (!t.subtasks || t.subtasks.length === 0) return t.completed;
                                return t.subtasks.every(st => st.completed);
                              }).length || 0}/{phase.tasks?.length || 0} tasks)
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${phaseProgress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-600">{phaseProgress}%</span>
                        </div>
                      </div>

                      {/* Tasks */}
                      {isPhaseExpanded && phase.tasks && (
                        <div className="pl-16 pr-4 pb-4">
                          {phase.tasks.map((task) => {
                            const isTaskExpanded = expandedTasks.has(task.id);
                            const taskProgress = getTaskProgress(task);
                            const taskCompleted = !task.subtasks || task.subtasks.length === 0 
                              ? task.completed 
                              : task.subtasks.every(st => st.completed);
                            const hasSubtasks = task.subtasks && task.subtasks.length > 0;

                            return (
                              <div key={task.id} className="mb-3 last:mb-0">
                                {/* Task Header */}
                                <div
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                  onClick={() => toggleExpand('task', task.id)}
                                >
                                  <div className="text-gray-600">
                                    {hasSubtasks ? (
                                      isTaskExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                    ) : (
                                      <input
                                        type="checkbox"
                                        checked={taskCompleted}
                                        onChange={(e) => e.stopPropagation()}
                                        className="w-4 h-4 text-gray-600 rounded border-gray-300 focus:ring-gray-500"
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className={`font-medium ${
                                      taskCompleted ? 'text-green-600 line-through' : 'text-gray-800'
                                    }`}>
                                      {task.name}
                                    </h5>
                                    <div className="text-sm text-gray-500 mt-1">
                                      Progress: {taskProgress}% 
                                      {hasSubtasks && (
                                        <span> ({task.subtasks?.filter(s => s.completed).length || 0}/{task.subtasks?.length || 0})</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                          taskCompleted ? 'bg-green-600' : 'bg-gray-600'
                                        }`}
                                        style={{ width: `${taskProgress}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">{taskProgress}%</span>
                                  </div>
                                </div>

                                {/* Subtasks */}
                                {isTaskExpanded && hasSubtasks && (
                                  <div className="ml-8 mt-2 space-y-1">
                                    {task.subtasks.map((subtask, index) => (
                                      <div
                                        key={subtask.id}
                                        id={index === 0 && task.subtasks.length > 0 ? 'first-task-item' : undefined}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={subtask.completed}
                                          onChange={(e) => handleSubtaskToggle(subject.id, phase.id, task.id, subtask.id, e)}
                                          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                        />
                                        <span className={`flex-1 ${
                                          subtask.completed 
                                            ? 'text-green-600 line-through' 
                                            : 'text-gray-700'
                                        }`}>
                                          {subtask.name}
                                        </span>
                                        {subtask.completed && (
                                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Deadline Modal */}
            {deadlineModal.show && deadlineModal.subjectId === subject.id && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md w-full">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6">Set Subject Deadline</h3>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deadline Date:
                    </label>
                    <input
                      type="date"
                      value={deadlineModal.deadline}
                      onChange={(e) => setDeadlineModal(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveDeadline}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Deadline
                    </button>
                    <button
                      onClick={() => setDeadlineModal({ show: false, subjectId: null, deadline: '' })}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TaskTree;
