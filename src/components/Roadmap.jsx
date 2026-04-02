import React, { useState } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2,
  Circle, 
  Calendar, 
  Upload
} from 'lucide-react';

const Roadmap = () => {
  const { 
    subjects, 
    selectedSubjectId,
    toggleTaskComplete, 
    toggleSubtaskComplete, 
    updatePhaseDeadline,
    importRoadmap,
    setSelectedSubjectId
  } = useRoadmap();

  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedPhases, setExpandedPhases] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [importError, setImportError] = useState('');

  const toggleSubject = (subjectId) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  const togglePhase = (phaseId) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
  };

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleDeadlineChange = (phaseId, date) => {
    updatePhaseDeadline(phaseId, date);
    setEditingDeadline(null);
  };

  const getDaysUntilDeadline = (deadline) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    return daysUntil;
  };

  // Parse import text
  const parseImportText = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const structure = [];
    let currentSubject = null;
    let currentPhase = null;
    let currentTask = null;

    lines.forEach(line => {
      if (line.startsWith('Subject:')) {
        currentSubject = { 
          id: Date.now().toString() + Math.random().toString(),
          name: line.replace('Subject:', '').trim(), 
          phases: [] 
        };
        currentPhase = null;
        currentTask = null;
        structure.push(currentSubject);
      } else if (line.startsWith('Phase:')) {
        if (currentSubject) {
          currentPhase = { 
            id: Date.now().toString() + Math.random().toString(),
            name: line.replace('Phase:', '').trim(), 
            tasks: [] 
          };
          currentTask = null;
          currentSubject.phases.push(currentPhase);
        }
      } else if (line.startsWith('- ')) {
        if (currentPhase) {
          currentTask = { 
            id: Date.now().toString() + Math.random().toString(),
            name: line.replace('- ', '').trim(), 
            subtasks: [],
            completed: false
          };
          currentPhase.tasks.push(currentTask);
        }
      } else if (line.startsWith('  - ')) {
        if (currentTask) {
          currentTask.subtasks.push({
            id: Date.now().toString() + Math.random().toString(),
            name: line.replace('  - ', '').trim(),
            completed: false
          });
        }
      }
    });

    return structure;
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const parsed = parseImportText(importText);
    if (parsed.length > 0) {
      importRoadmap(parsed);
      setImportText('');
      setShowImportModal(false);
    }
  };

  const getPhaseProgress = (phase) => {
    if (!phase.tasks || phase.tasks.length === 0) return 0;
    let totalItems = 0;
    let completedItems = 0;
    
    phase.tasks.forEach(task => {
      if (task.subtasks && task.subtasks.length > 0) {
        totalItems += task.subtasks.length;
        completedItems += task.subtasks.filter(s => s.completed).length;
      } else {
        totalItems += 1;
        if (task.completed) completedItems += 1;
      }
    });
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with Import Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Learning Roadmap</h1>
          <p className="text-gray-500 mt-1">Visual structure of your learning journey</p>
        </div>
        <button
          id="import-roadmap-btn"
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import Roadmap
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Import Roadmap</h2>
            <p className="text-sm text-gray-600 mb-4">
              Paste your roadmap in the following format:
            </p>
            <pre className="bg-gray-100 p-3 rounded-lg text-sm text-gray-700 mb-4">
{`Subject: Embedded Systems

Phase: C Programming
- Pointers
  - pointer arithmetic
  - pointer arrays
- Memory management
  - malloc
  - free

Phase: Microcontrollers
- GPIO
- Timers`}
            </pre>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm"
              placeholder="Paste your roadmap here..."
            />
            {importError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800 mb-1">Import Error</h3>
                    <p className="text-sm text-red-600">{importError}</p>
                  </div>
                </div>
              </div>
            )}
            {importText && !importError && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-700 mb-2">Preview:</h3>
                <div className="space-y-2">
                  {parseImportText(importText).map((subject, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="font-medium text-primary-600">{subject.name}</div>
                      {subject.phases.map((phase, phaseIdx) => (
                        <div key={phaseIdx} className="ml-4 space-y-1">
                          <div className="font-medium text-gray-700">{phase.name}</div>
                          {phase.tasks.map((task, taskIdx) => (
                            <div key={taskIdx} className="ml-4 space-y-1">
                              <div className="text-sm text-gray-600">- {task.name}</div>
                              {task.subtasks && task.subtasks.map((subtask, subtaskIdx) => (
                                <div key={subtaskIdx} className="ml-4 text-sm text-gray-500">
                                  - {subtask.name}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subjects List */}
      <div className="space-y-4">
        {subjects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗺️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Roadmap Found</h3>
            <p className="text-gray-500 mb-4">Import a roadmap to start tracking your learning progress.</p>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors mx-auto"
            >
              <Upload className="w-4 h-4" />
              Import Roadmap
            </button>
          </div>
        ) : (
          subjects.map((subject) => (
            <div key={subject.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Subject Header */}
              <button
                onClick={() => toggleSubject(subject.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedSubjects.has(subject.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <h2 className="text-lg font-semibold text-gray-800">{subject.name}</h2>
                  <span className="text-sm text-gray-500">
                    ({subject.phases?.length || 0} phases)
                  </span>
                </div>
              </button>

              {/* Phases List */}
              {expandedSubjects.has(subject.id) && (
                <div className="border-t border-gray-100">
                  {subject.phases?.map((phase, phaseIndex) => {
                    const progress = getPhaseProgress(phase);
                    const daysUntil = getDaysUntilDeadline(phase.deadline);
                    
                    return (
                      <div key={phase.id || phaseIndex} className="border-b border-gray-100 last:border-0">
                        {/* Phase Header */}
                        <button
                          onClick={() => togglePhase(phase.id || phaseIndex)}
                          className="w-full flex items-center justify-between p-4 pl-12 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {expandedPhases.has(phase.id || phaseIndex) ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="font-medium text-gray-700">{phase.name}</span>
                            
                            {/* Progress Bar */}
                            <div className="flex-1 max-w-xs mx-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-8">{progress}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Deadline */}
                          <div className="flex items-center gap-2">
                            {editingDeadline === (phase.id || phaseIndex) ? (
                              <input
                                type="date"
                                defaultValue={phase.deadline || ''}
                                onChange={(e) => handleDeadlineChange(phase.id || phaseIndex, e.target.value)}
                                onBlur={() => setEditingDeadline(null)}
                                autoFocus
                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDeadline(phase.id || phaseIndex);
                                }}
                                className={`flex items-center gap-1 text-sm ${
                                  (daysUntil !== null && daysUntil < 0) 
                                    ? 'text-red-600' 
                                    : (daysUntil !== null && daysUntil <= 3) 
                                      ? 'text-yellow-600' 
                                      : 'text-gray-500'
                                } hover:text-primary-600`}
                              >
                                <Calendar className="w-4 h-4" />
                                {phase.deadline ? (
                                  <>
                                    {new Date(phase.deadline).toLocaleDateString()}
                                    {daysUntil !== null && daysUntil < 0 && (
                                      <span className="text-red-600 font-medium"> (Overdue)</span>
                                    )}
                                    {daysUntil !== null && daysUntil > 0 && daysUntil <= 3 && (
                                      <span className="text-yellow-600 font-medium"> ({daysUntil}d left)</span>
                                    )}
                                  </>
                                ) : (
                                  <span>Set deadline</span>
                                )}
                              </button>
                            )}
                          </div>
                        </button>

                        {/* Tasks List */}
                        {expandedPhases.has(phase.id || phaseIndex) && phase.tasks && (
                          <div className="pl-16 pr-4 pb-4">
                            {phase.tasks.map((task, taskIndex) => (
                              <div key={task.id || taskIndex} className="border-l-2 border-gray-200 ml-2">
                                {/* Task */}
                                <div className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded-lg">
                                  <button
                                    onClick={() => toggleTaskComplete(subject.id, phase.id || phaseIndex, task.id || taskIndex)}
                                    className="mt-0.5"
                                  >
                                    {task.completed ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-gray-400 hover:text-primary-500" />
                                    )}
                                  </button>
                                  <div className="flex-1">
                                    <span className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                      {task.name}
                                    </span>
                                    {task.estimatedTime && (
                                      <span className="text-xs text-gray-400 ml-2 flex items-center gap-1 inline-flex">
                                        <Clock className="w-3 h-3" />
                                        {task.estimatedTime}h
                                      </span>
                                    )}
                                  </div>
                                  {task.subtasks && task.subtasks.length > 0 && (
                                    <button
                                      onClick={() => toggleTask(task.id || taskIndex)}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      {expandedTasks.has(task.id || taskIndex) ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                </div>

                                {/* Subtasks */}
                                {expandedTasks.has(task.id || taskIndex) && task.subtasks && (
                                  <div className="pl-8 pr-2">
                                    {task.subtasks.map((subtask, subtaskIndex) => (
                                      <div 
                                        key={subtask.id || subtaskIndex}
                                        className="flex items-start gap-2 p-1.5 hover:bg-gray-50 rounded"
                                      >
                                        <button
                                          onClick={() => toggleSubtaskComplete(
                                            subject.id, 
                                            phase.id || phaseIndex, 
                                            task.id || taskIndex,
                                            subtask.id || subtaskIndex
                                          )}
                                          className="mt-0.5"
                                        >
                                          {subtask.completed ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                          ) : (
                                            <Circle className="w-4 h-4 text-gray-300 hover:text-primary-500" />
                                          )}
                                        </button>
                                        <span className={`text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                          {subtask.name}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
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
          ))
        )}
      </div>
    </div>
  );
};

export default Roadmap;
