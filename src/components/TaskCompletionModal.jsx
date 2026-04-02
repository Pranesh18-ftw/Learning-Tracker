import React, { useState } from 'react';
import { CheckCircle2, X, Clock, Target } from 'lucide-react';

const TaskCompletionModal = ({ 
  isOpen, 
  onClose, 
  taskName, 
  subjectId, 
  phaseId, 
  taskId, 
  subtaskId,
  onComplete,
  onPostpone 
}) => {
  const [notes, setNotes] = useState('');
  const [timeSpent, setTimeSpent] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [postponeDate, setPostponeDate] = useState('');
  const [showPostponeOptions, setShowPostponeOptions] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validateInputs = () => {
    const newErrors = {};
    
    if (timeSpent && (isNaN(timeSpent) || parseFloat(timeSpent) < 0)) {
      newErrors.timeSpent = 'Time spent must be a positive number';
    }
    
    if (showPostponeOptions && !postponeDate) {
      newErrors.postponeDate = 'Please select a date to postpone the task';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFinish = () => {
    if (!validateInputs()) return;
    
    onComplete({
      subjectId,
      phaseId, 
      taskId,
      notes,
      timeSpent: timeSpent ? parseFloat(timeSpent) : 25,
      difficulty,
      completed: true
    });
    onClose();
  };

  const handlePostpone = () => {
    if (!validateInputs()) return;
    
    onPostpone({
      subjectId,
      phaseId,
      taskId,
      postponeDate,
      notes,
      timeSpent: timeSpent ? parseFloat(timeSpent) : 25,
      difficulty,
      completed: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Task Completion</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-800">{taskName}</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Spent (minutes)
            </label>
            <input
              type="number"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.timeSpent ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="25"
              min="0"
              step="1"
            />
            {errors.timeSpent && (
              <p className="text-red-500 text-sm mt-1">{errors.timeSpent}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any challenges or insights?"
            />
          </div>

          {/* Postpone Options */}
          <div>
            <button
              type="button"
              onClick={() => setShowPostponeOptions(!showPostponeOptions)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2"
            >
              {showPostponeOptions ? 'Hide' : 'Show'} postpone options
            </button>
            
            {showPostponeOptions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postpone Until
                </label>
                <input
                  type="date"
                  value={postponeDate}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.postponeDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.postponeDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.postponeDate}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleFinish}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finish
          </button>
          <button
            onClick={handlePostpone}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Postpone
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCompletionModal;
