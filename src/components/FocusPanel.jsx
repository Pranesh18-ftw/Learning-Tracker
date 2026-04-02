import React, { useState } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { Play, CheckCircle, Target, Clock, Flame } from 'lucide-react';

const FocusPanel = () => {
  const { subjects, getStats, getTodaysTasks } = useRoadmap();
  const [showTimer, setShowTimer] = useState(false);
  const stats = getStats();
  const todaysTasks = getTodaysTasks();

  // Get current subject and phase (first one for demo)
  const currentSubject = subjects[0];
  const currentPhase = currentSubject?.phases?.[0];

  // Find first incomplete subtask
  const getNextTask = () => {
    for (const subject of subjects) {
      for (const phase of subject.phases) {
        for (const task of phase.tasks) {
          for (const subtask of task.subtasks) {
            if (!subtask.completed) {
              return {
                subject: subject.name,
                phase: phase.name,
                task: task.name,
                subtask: subtask.name,
                subjectId: subject.id,
                phaseId: phase.id,
                taskId: task.id,
                subtaskId: subtask.id
              };
            }
          }
        }
      }
    }
    return null;
  };

  const nextTask = getNextTask();

  return (
    <div className="space-y-6">
      {/* Current Focus */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Current Focus
        </h2>
        
        {currentSubject ? (
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Current Subject:</span>
              <span className="ml-2 font-medium text-gray-800">{currentSubject.name}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Current Phase:</span>
              <span className="ml-2 font-medium text-gray-800">{currentPhase?.name || 'No phase'}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No subjects loaded. Import a roadmap to get started.</p>
        )}
      </div>

      {/* Today's Target */}
      {nextTask && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Target</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="text-gray-700">{nextTask.subject}</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              <span className="text-gray-700">{nextTask.phase}</span>
            </div>
            <div className="flex items-center gap-2 ml-8">
              <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              <span className="text-gray-700">{nextTask.task}</span>
            </div>
            <div className="flex items-center gap-2 ml-12">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                defaultChecked={false}
                onChange={() => {/* Will handle completion */}}
              />
              <span className="text-gray-700 font-medium">{nextTask.subtask}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowTimer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Focus Session
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Completed
            </button>
          </div>
        </div>
      )}

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Progress Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalSubjects}</div>
            <div className="text-sm text-gray-500">Subjects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalPhases}</div>
            <div className="text-sm text-gray-500">Phases</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.totalTasks}</div>
            <div className="text-sm text-gray-500">Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completedSubtasks}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">Streak: 3 days</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Focus Time: 2h 15m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timer Modal */}
      {showTimer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Focus Session</h3>
            
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-blue-600 mb-2">25:00</div>
              <div className="text-gray-500">Work Session</div>
            </div>

            <div className="flex gap-3 mb-6">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Start
              </button>
              <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Pause
              </button>
              <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Reset
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Work (25 min)</option>
                <option>Short Break (5 min)</option>
                <option>Long Break (15 min)</option>
              </select>
            </div>

            <button
              onClick={() => setShowTimer(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusPanel;
