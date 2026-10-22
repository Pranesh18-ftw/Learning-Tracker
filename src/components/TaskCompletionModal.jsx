import React, { useState, useRef } from 'react';
import { CheckCircle2, X, Clock, Target } from 'lucide-react';
import { getLocalDateKey } from '../utils/dateUtils';
import { useDialogA11y } from '../utils/a11y';

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
  const modalContainerRef = useRef(null);

  useDialogA11y({
    isOpen,
    onClose,
    containerRef: modalContainerRef
  });

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
      subtaskId,
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
      subtaskId,
      postponeDate,
      notes,
      timeSpent: timeSpent ? parseFloat(timeSpent) : 25,
      difficulty,
      completed: false
    });
    onClose();
  };

  return (
    <div
      ref={modalContainerRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-completion-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 id="task-completion-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
            Task Completion
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close task completion dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{taskName}</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="task-completion-time" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Time Spent (minutes)
            </label>
            <input
              id="task-completion-time"
              type="number"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.timeSpent ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
              }`}
              placeholder="25"
              min="0"
              step="1"
            />
            {errors.timeSpent && (
              <p className="text-red-500 text-xs mt-1">{errors.timeSpent}</p>
            )}
          </div>

          <div>
            <label htmlFor="task-completion-difficulty" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Difficulty
            </label>
            <select
              id="task-completion-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label htmlFor="task-completion-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              id="task-completion-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any challenges or insights?"
            />
          </div>

          {/* Postpone Options */}
          <div>
            <button
              type="button"
              onClick={() => setShowPostponeOptions(!showPostponeOptions)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium mb-2 focus:outline-none focus:underline"
            >
              {showPostponeOptions ? 'Hide' : 'Show'} postpone options
            </button>

            {showPostponeOptions && (
              <div>
                <label htmlFor="task-completion-postpone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Postpone Until
                </label>
                <input
                  id="task-completion-postpone"
                  type="date"
                  value={postponeDate}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.postponeDate ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                  }`}
                  min={getLocalDateKey()}
                />
                {errors.postponeDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.postponeDate}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleFinish}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finish
          </button>
          <button
            type="button"
            onClick={handlePostpone}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors shadow-sm"
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
