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
      className="fixed inset-0 bg-[#141312]/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-completion-modal-title"
    >
      <div className="glass-panel-elevated rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-stone-200 dark:border-[#2A2725]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-stone-500 dark:text-stone-400 font-bold mb-0.5">
              Workbench · Log Entry
            </div>
            <h3 id="task-completion-modal-title" className="text-xl font-bold text-[#141312] dark:text-[#FAF8F5] tracking-tight">
              Task Completion
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-[#2A2725] transition-colors"
            aria-label="Close task completion dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2.5 p-3.5 bg-stone-100 dark:bg-[#141312] rounded-xl border border-stone-200 dark:border-[#2A2725]">
            <Target className="w-5 h-5 text-[#3B5571] dark:text-[#486581] shrink-0" />
            <span className="font-semibold text-[#141312] dark:text-stone-200 text-sm truncate">{taskName}</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="task-completion-time" className="block text-xs font-mono font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wide">
              Time Spent (minutes)
            </label>
            <input
              id="task-completion-time"
              type="number"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              className={`w-full px-3.5 py-2.5 border rounded-xl bg-white dark:bg-[#141312] text-[#141312] dark:text-[#FAF8F5] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#C25524] transition-colors ${
                errors.timeSpent ? 'border-red-500' : 'border-stone-300 dark:border-[#2A2725]'
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
            <label htmlFor="task-completion-difficulty" className="block text-xs font-mono font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wide">
              Difficulty
            </label>
            <select
              id="task-completion-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-[#2A2725] rounded-xl bg-white dark:bg-[#141312] text-[#141312] dark:text-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#C25524] transition-colors"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label htmlFor="task-completion-notes" className="block text-xs font-mono font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wide">
              Notes (optional)
            </label>
            <textarea
              id="task-completion-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-[#2A2725] rounded-xl bg-white dark:bg-[#141312] text-[#141312] dark:text-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#C25524] transition-colors resize-none"
              rows={3}
              placeholder="Any challenges or insights?"
            />
          </div>

          {/* Postpone Options */}
          <div>
            <button
              type="button"
              onClick={() => setShowPostponeOptions(!showPostponeOptions)}
              className="text-[#3B5571] dark:text-[#486581] hover:text-[#C25524] dark:hover:text-[#D96E3A] text-xs font-mono font-bold uppercase tracking-wider mb-2 focus:outline-none transition-colors"
            >
              {showPostponeOptions ? 'Hide' : 'Show'} postpone options
            </button>

            {showPostponeOptions && (
              <div className="pt-2">
                <label htmlFor="task-completion-postpone" className="block text-xs font-mono font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wide">
                  Postpone Until
                </label>
                <input
                  id="task-completion-postpone"
                  type="date"
                  value={postponeDate}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl bg-white dark:bg-[#141312] text-[#141312] dark:text-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#C25524] transition-colors ${
                    errors.postponeDate ? 'border-red-500' : 'border-stone-300 dark:border-[#2A2725]'
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

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleFinish}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 btn-workbench-sage font-medium rounded-xl shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finish
          </button>
          <button
            type="button"
            onClick={handlePostpone}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 btn-workbench-copper font-medium rounded-xl shadow-sm cursor-pointer"
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
