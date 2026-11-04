import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Trash2,
  Search,
  Filter,
  Layers,
  X
} from 'lucide-react';
import { addDaysToDateKey, getLocalDateKey } from '../utils/dateUtils';

/**
 * ScheduleTreeSelector
 *
 * Interactive tree-based manual scheduler for the Schedule Grid.
 * Allows learners to navigate domain phases, tasks, and subtasks (milestones),
 * select any objective from the tree hierarchy, and schedule or reschedule it
 * to a chosen calendar date with quick presets or custom date selection.
 */
export default function ScheduleTreeSelector({
  subject,
  learningPlan = [],
  onScheduleMilestone,
  onUnscheduleMilestone,
  onClose,
  today = getLocalDateKey()
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyUnscheduled, setOnlyUnscheduled] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState(() => {
    // Expand the first phase by default for quick discovery
    const firstId = subject?.phases?.[0]?.id;
    return new Set(firstId ? [firstId] : []);
  });
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [selectedDates, setSelectedDates] = useState({}); // key: `${phaseId}_${taskId}_${subtaskId || 'root'}` -> dateString

  // Map existing scheduled milestones for quick lookup: `${phaseId}_${taskId}_${subtaskId || 'root'}` -> planEntry
  const scheduledMap = useMemo(() => {
    const map = new Map();
    (learningPlan || []).forEach(entry => {
      if (!subject || entry.subjectId === subject.id) {
        const key = `${entry.phaseId}_${entry.taskId}_${entry.subtaskId || 'root'}`;
        map.set(key, entry);
      }
    });
    return map;
  }, [learningPlan, subject]);

  const togglePhase = (phaseId) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const expandAll = () => {
    const allPhaseIds = (subject?.phases || []).map(p => p.id);
    const allTaskIds = (subject?.phases || []).flatMap(p => (p.tasks || []).map(t => t.id));
    setExpandedPhases(new Set(allPhaseIds));
    setExpandedTasks(new Set(allTaskIds));
  };

  const collapseAll = () => {
    setExpandedPhases(new Set());
    setExpandedTasks(new Set());
  };

  const getItemKey = (phaseId, taskId, subtaskId = null) => {
    return `${phaseId}_${taskId}_${subtaskId || 'root'}`;
  };

  const getTargetDate = (itemKey) => {
    return selectedDates[itemKey] || today;
  };

  const handleDateChange = (itemKey, dateValue) => {
    setSelectedDates(prev => ({
      ...prev,
      [itemKey]: dateValue
    }));
  };

  const handleQuickPreset = (itemKey, daysToAdd) => {
    const calculatedDate = daysToAdd === 0 ? today : addDaysToDateKey(today, daysToAdd);
    handleDateChange(itemKey, calculatedDate);
  };

  // Filtered phases and tasks
  const filteredPhases = useMemo(() => {
    if (!subject?.phases) return [];
    const query = searchQuery.trim().toLowerCase();

    return subject.phases.map(phase => {
      const phaseTasks = (phase.tasks || []).filter(task => {
        const subtasks = task.subtasks || [];
        const taskMatches = !query || task.name?.toLowerCase().includes(query) || phase.name?.toLowerCase().includes(query);
        const subtaskMatches = !query || subtasks.some(st => st.name?.toLowerCase().includes(query));

        if (!taskMatches && !subtaskMatches) return false;

        if (onlyUnscheduled) {
          if (subtasks.length > 0) {
            const hasUnscheduledIncompleteSubtask = subtasks.some(st => {
              if (st.completed) return false;
              const key = getItemKey(phase.id, task.id, st.id);
              return !scheduledMap.has(key);
            });
            return hasUnscheduledIncompleteSubtask;
          } else {
            if (task.completed) return false;
            const key = getItemKey(phase.id, task.id, null);
            return !scheduledMap.has(key);
          }
        }

        return true;
      });

      return {
        ...phase,
        tasks: phaseTasks
      };
    }).filter(phase => phase.tasks.length > 0);
  }, [subject, searchQuery, onlyUnscheduled, scheduledMap]);

  return (
    <div className="bg-white dark:bg-[#0F172A] border-2 border-electric-500/30 dark:border-electric-500/20 rounded-3xl p-5 sm:p-6 shadow-md anim-fade-in space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-electric-500/10 text-electric-600 dark:text-electric-400">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
              Roadmap Tree · Manual Scheduler
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose specific milestones from <span className="font-bold text-slate-700 dark:text-slate-200">{subject?.name || 'Roadmap'}</span> and schedule them to any date
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Collapse All
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
              aria-label="Close tree scheduler"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts or milestones in tree..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-electric-500/40"
          />
        </div>

        <button
          type="button"
          onClick={() => setOnlyUnscheduled(prev => !prev)}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            onlyUnscheduled
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Only Unscheduled</span>
        </button>
      </div>

      {/* Tree View Body */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 focus-scrollbar">
        {filteredPhases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No milestones found matching your filter.
          </div>
        ) : (
          filteredPhases.map(phase => {
            const isPhaseExpanded = expandedPhases.has(phase.id);
            const totalTasks = phase.tasks.length;
            const completedSubtasksCount = phase.tasks.flatMap(t => t.subtasks || []).filter(st => st.completed).length;

            return (
              <div
                key={phase.id}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40"
              >
                {/* Phase Row */}
                <div
                  onClick={() => togglePhase(phase.id)}
                  className="flex items-center justify-between p-3.5 cursor-pointer select-none bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isPhaseExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="font-display font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      {phase.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>{totalTasks} concept{totalTasks !== 1 ? 's' : ''}</span>
                    {completedSubtasksCount > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        · {completedSubtasksCount} done
                      </span>
                    )}
                  </div>
                </div>

                {/* Phase Tasks */}
                {isPhaseExpanded && (
                  <div className="p-3 space-y-3">
                    {phase.tasks.map(task => {
                      const subtasks = task.subtasks || [];
                      const isTaskExpanded = expandedTasks.has(task.id);
                      const hasSubtasks = subtasks.length > 0;

                      // If task has no subtasks, it is an atomic task
                      if (!hasSubtasks) {
                        const itemKey = getItemKey(phase.id, task.id, null);
                        const scheduledEntry = scheduledMap.get(itemKey);
                        const isScheduled = Boolean(scheduledEntry);
                        const isDone = Boolean(task.completed);
                        const targetDate = getTargetDate(itemKey);

                        return (
                          <div
                            key={task.id}
                            className={`p-3 rounded-xl border transition-all ${
                              isDone
                                ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-500/20 opacity-75'
                                : isScheduled
                                ? 'bg-electric-50/30 dark:bg-electric-950/20 border-electric-500/30'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                )}
                                <div className="truncate">
                                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {task.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Concept Task
                                  </div>
                                </div>
                              </div>

                              {/* Status & Date Actions */}
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {isDone ? (
                                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    Completed
                                  </span>
                                ) : (
                                  <>
                                    {isScheduled && (
                                      <span className="text-[11px] font-mono font-bold text-electric-600 dark:text-electric-400 bg-electric-500/10 px-2 py-0.5 rounded-md">
                                        Scheduled: {scheduledEntry.scheduledDate}
                                      </span>
                                    )}

                                    {/* Quick Preset Pills */}
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickPreset(itemKey, 0)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                                          targetDate === today
                                            ? 'bg-electric-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                      >
                                        Today
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickPreset(itemKey, 1)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                                          targetDate === addDaysToDateKey(today, 1)
                                            ? 'bg-electric-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                      >
                                        Tmrw
                                      </button>
                                    </div>

                                    {/* Date Input */}
                                    <input
                                      type="date"
                                      min={today}
                                      value={targetDate}
                                      onChange={(e) => handleDateChange(itemKey, e.target.value)}
                                      className="px-2 py-1 text-[11px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-electric-500"
                                    />

                                    {/* Schedule / Reschedule Button */}
                                    <button
                                      type="button"
                                      onClick={() => onScheduleMilestone(subject.id, phase.id, task.id, null, targetDate)}
                                      className="px-3 py-1 bg-electric-600 hover:bg-electric-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                                    >
                                      {isScheduled ? 'Move Date' : 'Schedule'}
                                    </button>

                                    {isScheduled && (
                                      <button
                                        type="button"
                                        onClick={() => onUnscheduleMilestone(subject.id, phase.id, task.id, null)}
                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                        title="Remove from schedule"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Task with Subtasks
                      return (
                        <div
                          key={task.id}
                          className="border border-slate-200/80 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-900/90 overflow-hidden"
                        >
                          {/* Task Header */}
                          <div
                            onClick={() => toggleTask(task.id)}
                            className="flex items-center justify-between p-2.5 cursor-pointer select-none bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              {isTaskExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {task.name}
                              </span>
                            </div>

                            <span className="text-[10px] font-mono text-slate-400">
                              {subtasks.length} milestone{subtasks.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Subtasks List */}
                          {isTaskExpanded && (
                            <div className="p-2 space-y-2 border-t border-slate-100 dark:border-slate-800/60">
                              {subtasks.map(subtask => {
                                const itemKey = getItemKey(phase.id, task.id, subtask.id);
                                const scheduledEntry = scheduledMap.get(itemKey);
                                const isScheduled = Boolean(scheduledEntry);
                                const isDone = Boolean(subtask.completed);
                                const targetDate = getTargetDate(itemKey);

                                return (
                                  <div
                                    key={subtask.id}
                                    className={`p-2.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                      isDone
                                        ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-500/20 opacity-70'
                                        : isScheduled
                                        ? 'bg-electric-50/30 dark:bg-electric-950/20 border-electric-500/30'
                                        : 'bg-slate-50/60 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {isDone ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                      )}
                                      <span className="text-xs text-slate-800 dark:text-slate-200 font-medium truncate">
                                        {subtask.name}
                                      </span>
                                    </div>

                                    {/* Action Controls */}
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                      {isDone ? (
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                          Done
                                        </span>
                                      ) : (
                                        <>
                                          {isScheduled && (
                                            <span className="text-[10px] font-mono font-bold text-electric-600 dark:text-electric-400 bg-electric-500/10 px-1.5 py-0.5 rounded">
                                              {scheduledEntry.scheduledDate}
                                            </span>
                                          )}

                                          {/* Quick Preset Pills */}
                                          <button
                                            type="button"
                                            onClick={() => handleQuickPreset(itemKey, 0)}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                              targetDate === today
                                                ? 'bg-electric-600 text-white'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                            }`}
                                          >
                                            Today
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickPreset(itemKey, 1)}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                              targetDate === addDaysToDateKey(today, 1)
                                                ? 'bg-electric-600 text-white'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                            }`}
                                          >
                                            +1d
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickPreset(itemKey, 2)}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                              targetDate === addDaysToDateKey(today, 2)
                                                ? 'bg-electric-600 text-white'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                            }`}
                                          >
                                            +2d
                                          </button>

                                          {/* Custom Date Input */}
                                          <input
                                            type="date"
                                            min={today}
                                            value={targetDate}
                                            onChange={(e) => handleDateChange(itemKey, e.target.value)}
                                            className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                                          />

                                          {/* Action */}
                                          <button
                                            type="button"
                                            onClick={() => onScheduleMilestone(subject.id, phase.id, task.id, subtask.id, targetDate)}
                                            className="px-2.5 py-1 bg-electric-600 hover:bg-electric-700 text-white rounded text-[11px] font-bold transition-colors shadow-xs"
                                          >
                                            {isScheduled ? 'Move' : 'Schedule'}
                                          </button>

                                          {isScheduled && (
                                            <button
                                              type="button"
                                              onClick={() => onUnscheduleMilestone(subject.id, phase.id, task.id, subtask.id)}
                                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                              title="Remove from schedule"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
