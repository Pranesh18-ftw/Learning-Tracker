import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoadmap } from '../context/RoadmapContext';
import {
  Compass,
  RotateCcw,
  Plus,
  CheckCircle,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import {
  getLocalDateKey,
  addDaysToDateKey,
  compareDateKeys
} from '../utils/dateUtils';
import PathDestinationHeader from '../components/PathDestinationHeader';
import PathRealityBar from '../components/PathRealityBar';
import PathWeeklyRoute from '../components/PathWeeklyRoute';
import PathDetourDrawer from '../components/PathDetourDrawer';
import {
  resolveDestination,
  buildWeeklyRouteStops,
  detectRecoveryNeeds
} from '../utils/pathRouteResolver';
import { loadIdentity, saveIdentity } from '../utils/identityRealityResolver';

const deriveRealityFromIdentity = (id) => {
  const currentIdentity = id || loadIdentity();
  const weekdayMins = Number(currentIdentity?.timeReality?.weekdayMinutes) || 45;
  const initialBudget = weekdayMins <= 25 ? 20 : weekdayMins >= 60 ? 90 : 45;

  const access = currentIdentity?.resources?.access || [];
  const hardware = currentIdentity?.resources?.hardware || [];
  const isLab = access.some(a => a.toLowerCase().includes('lab'));
  const hasHardware = hardware.some(h => {
    const l = h.toLowerCase();
    return l.includes('esp32') || l.includes('breadboard') || l.includes('kit') || l.includes('multimeter') || l.includes('arduino');
  });

  const initialResource = isLab ? 'lab' : hasHardware ? 'kit' : 'laptop';
  return { budget: initialBudget, resource: initialResource };
};

/**
 * LearningPlanPage (PATH REDESIGN)
 *
 * Answers:
 * “Given where I am, what I want to achieve, and the reality of my life, what should I do next?”
 *
 * Features:
 * 1. 3 Levels: Destination -> Route Stages -> Weekly Stops
 * 2. Reality-Aware Routing: Time Budget (20m, 45m, 90m) & Resource Toggles (Laptop, Kit, Lab)
 * 3. Pedagogical Rationale: "Why this comes next" for each stop
 * 4. Bounded STEM Detours: Curiosity without route destruction
 * 5. Non-punitive Recovery Route: Anti-cascade recalibration
 * 6. Direct Connection to NOW: One-click challenge launch
 * 7. Dual View: Visual Route vs Classic Schedule Grid
 */
const LearningPlanPage = () => {
  const navigate = useNavigate();
  const {
    learningPlan = [],
    setLearningPlan,
    subjects = [],
    selectedSubjectId,
    setSelectedSubjectId,
    getNextSubtask,
    getNextSubtaskForSubject,
    completeSubtask,
    completeTask,
    isTaskCompleted,
    scheduleSubtask,
    storeAutoAssignAction,
    storeCompleteAction,
    lastAction,
    undoLastAction,
    startFocusSession,
    currentLearningContext,
    selectLearningContext,
    settings,
    updateSettings
  } = useRoadmap();

  // View state: 'route' (visual journey) | 'grid' (classic calendar breakdown)
  const [viewMode, setViewMode] = useState('route');

  // Reality parameters initialized from Identity control room
  const initialReality = useMemo(() => deriveRealityFromIdentity(), []);
  const [timeBudget, setTimeBudget] = useState(initialReality.budget);
  const [resourceLevel, setResourceLevel] = useState(initialReality.resource);
  const [activeDetourStop, setActiveDetourStop] = useState(null);

  // Sync reality controls with Identity
  const handleUpdateTimeBudget = (newBudget) => {
    setTimeBudget(newBudget);
    const id = loadIdentity();
    const updated = {
      ...id,
      timeReality: {
        ...(id.timeReality || {}),
        weekdayMinutes: newBudget
      }
    };
    saveIdentity(updated);
    if (updateSettings) {
      updateSettings({
        ...settings,
        dailyLearningHours: newBudget / 60,
        dailyGoalHours: newBudget / 60
      });
    }
  };

  const handleUpdateResourceLevel = (newLevel) => {
    setResourceLevel(newLevel);
    const id = loadIdentity();
    let hardware = id.resources?.hardware || [];
    let access = id.resources?.access || [];

    if (newLevel === 'laptop') {
      hardware = ['Laptop'];
      access = access.filter(a => !a.toLowerCase().includes('lab'));
    } else if (newLevel === 'kit') {
      hardware = Array.from(new Set([...hardware, 'Laptop', 'ESP32', 'Breadboard']));
      access = access.filter(a => !a.toLowerCase().includes('lab'));
    } else if (newLevel === 'lab') {
      hardware = Array.from(new Set([...hardware, 'Laptop', 'ESP32', 'Breadboard', 'Multimeter']));
      if (!access.some(a => a.toLowerCase().includes('lab'))) {
        access = [...access, 'College lab'];
      }
    }

    const updated = {
      ...id,
      resources: {
        ...(id.resources || {}),
        hardware,
        access
      }
    };
    saveIdentity(updated);
  };

  const today = getLocalDateKey();

  // Active Subject selection
  const activeSubject = useMemo(() => {
    if (!subjects || subjects.length === 0) return null;
    if (selectedSubjectId) {
      return subjects.find(s => s.id === selectedSubjectId) || subjects[0];
    }
    return subjects[0];
  }, [subjects, selectedSubjectId]);

  // Next active task (Unification Pass #12)
  const activeNextTask = useMemo(() => {
    if (!activeSubject) return null;
    if (currentLearningContext && currentLearningContext.subjectId === activeSubject.id) {
      return currentLearningContext;
    }
    return getNextSubtaskForSubject ? getNextSubtaskForSubject(activeSubject.id) : getNextSubtask();
  }, [activeSubject, currentLearningContext, getNextSubtaskForSubject, getNextSubtask]);

  // Evidence metrics & Destination
  const destination = useMemo(() => {
    const allTasks = activeSubject?.phases?.flatMap(p => p.tasks || []) || [];
    const allSubtasks = allTasks.flatMap(t => t.subtasks || []);
    const completedCount = allSubtasks.filter(s => s.completed).length;

    return resolveDestination(activeSubject, allSubtasks.length, completedCount);
  }, [activeSubject]);

  // Editorial weekly route stops
  const weeklyRouteStops = useMemo(() => {
    return buildWeeklyRouteStops(
      activeSubject,
      activeNextTask,
      learningPlan,
      timeBudget,
      resourceLevel,
      isTaskCompleted
    );
  }, [activeSubject, activeNextTask, learningPlan, timeBudget, resourceLevel, isTaskCompleted]);

  // Recovery detection (anti-cascade)
  const recoveryInfo = useMemo(() => {
    return detectRecoveryNeeds(learningPlan, today);
  }, [learningPlan, today]);

  // Recalibrate overdue tasks without punitive pileup
  const handleRecalibrateRoute = () => {
    if (!learningPlan || learningPlan.length === 0) return;

    // Keep today's tasks intact, push overdue items forward starting today
    const validFuture = learningPlan.filter(task =>
      task.scheduledDate && compareDateKeys(task.scheduledDate, today) >= 0
    );

    const overdue = learningPlan.filter(task =>
      task.scheduledDate && compareDateKeys(task.scheduledDate, today) < 0
    );

    // Limit to max 2 recovered items for today, defer the rest smoothly
    const recalibrated = overdue.map((item, idx) => ({
      ...item,
      scheduledDate: addDaysToDateKey(today, Math.floor(idx / 2))
    }));

    setLearningPlan([...validFuture, ...recalibrated]);
  };

  // Launch stop in NOW dashboard
  const handleContinueInNow = (stop) => {
    if (!stop) return;

    if (stop.subjectId) {
      setSelectedSubjectId(stop.subjectId);
    }

    const targetSubtaskId = stop.targetSubtask?.id || stop.targetSubtask?.name || null;

    if (scheduleSubtask) {
      scheduleSubtask(
        stop.subjectId,
        stop.phaseId,
        stop.taskId,
        targetSubtaskId,
        today
      );
    }

    if (selectLearningContext) {
      selectLearningContext({
        id: stop.taskId || stop.id,
        taskId: stop.taskId || stop.id,
        subtaskId: targetSubtaskId,
        name: stop.name,
        taskName: stop.name,
        subjectId: stop.subjectId,
        subjectName: stop.subjectName || activeSubject?.name,
        phaseId: stop.phaseId,
        phaseName: stop.phaseName
      });
    }

    if (startFocusSession) {
      startFocusSession({
        ...stop,
        subtaskId: targetSubtaskId,
        subtaskName: stop.targetSubtask?.name || stop.name,
        taskName: stop.name,
        subjectName: stop.subjectName || activeSubject?.name,
        phaseName: stop.phaseName,
        time: stop.estimatedMinutes || 25,
        glyph: stop.glyph
      }, stop.estimatedMinutes || 25);
    } else {
      navigate('/');
    }
  };

  // View stop in World
  const handleViewInWorld = (stop) => {
    if (!stop) return;
    if (selectLearningContext) {
      selectLearningContext({
        id: stop.taskId || stop.id,
        taskId: stop.taskId || stop.id,
        subtaskId: stop.targetSubtask?.id || null,
        name: stop.name,
        taskName: stop.name,
        subjectId: stop.subjectId,
        subjectName: stop.subjectName || activeSubject?.name,
        phaseId: stop.phaseId,
        phaseName: stop.phaseName
      });
    } else if (stop.subjectId) {
      setSelectedSubjectId(stop.subjectId);
    }
    navigate('/roadmap');
  };

  // Complete stop directly from Path
  const handleCompleteStop = (stop) => {
    if (!stop) return;

    const { subjectId, phaseId, taskId, targetSubtask, planEntryId } = stop;

    if (targetSubtask) {
      const completion = completeSubtask({
        subjectId,
        phaseId,
        taskId,
        subtaskId: targetSubtask.id
      });

      storeCompleteAction(targetSubtask.id, null, completion?.id, {
        subjectId,
        phaseId,
        taskId,
        subtaskId: targetSubtask.id,
        learningPlanEntry: planEntryId ? { id: planEntryId, subjectId, phaseId, taskId, subtaskId: targetSubtask.id, scheduledDate: today } : null
      });
    } else {
      const completion = completeTask({
        subjectId,
        phaseId,
        taskId
      });
      storeCompleteAction(taskId, null, completion?.id, {
        subjectId,
        phaseId,
        taskId,
        subtaskId: null,
        learningPlanEntry: planEntryId ? { id: planEntryId, subjectId, phaseId, taskId, scheduledDate: today } : null
      });
    }

    // Remove from plan if scheduled
    if (planEntryId) {
      setLearningPlan(prev => (prev || []).filter(e => e.id !== planEntryId));
    }
  };

  // Launch detour in NOW
  const handleLaunchDetourInNow = (detour, stop) => {
    if (!stop) return;
    setActiveDetourStop(null);

    if (stop.subjectId) {
      setSelectedSubjectId(stop.subjectId);
    }

    // Schedule and start focus session
    if (scheduleSubtask) {
      scheduleSubtask(
        stop.subjectId,
        stop.phaseId,
        stop.taskId,
        stop.targetSubtask?.id || null,
        today
      );
    }

    if (startFocusSession) {
      startFocusSession({
        ...stop,
        subtaskId: stop.targetSubtask?.id || null,
        subtaskName: detour.title,
        taskName: stop.name,
        subjectName: stop.subjectName || activeSubject?.name,
        phaseName: stop.phaseName,
        time: parseInt(detour.duration) || 15,
        glyph: stop.glyph,
        whyItMatters: detour.description
      }, parseInt(detour.duration) || 15);
    } else {
      navigate('/');
    }
  };

  // ── CLASSIC SCHEDULE GRID SUPPORT (PRESERVES EXISTING CAPABILITIES) ──
  const getTaskDetails = (taskId, phaseId, subjectId, subtaskId = null) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return { subjectName: 'Unknown Subject', phaseName: 'Unknown Phase', taskName: 'Unknown Task', subtaskName: null };

    const phase = subject.phases?.find(p => p.id === phaseId);
    if (!phase) return { subjectName: subject.name, phaseName: 'Unknown Phase', taskName: 'Unknown Task', subtaskName: null };

    const task = phase.tasks?.find(t => t.id === taskId);
    if (!task) return { subjectName: subject.name, phaseName: phase.name, taskName: 'Unknown Task', subtaskName: null };

    let subtaskName = null;
    if (subtaskId && task.subtasks) {
      const subtask = task.subtasks.find(s => s.id === subtaskId);
      if (subtask) subtaskName = subtask.name;
    }

    return {
      subjectName: subject.name,
      phaseName: phase.name,
      taskName: task.name,
      subtaskName
    };
  };

  const subjectLearningTasks = (learningPlan || []).filter(task =>
    !selectedSubjectId || task.subjectId === selectedSubjectId
  );

  const tasksByDate = subjectLearningTasks.reduce((groups, task) => {
    const date = task.scheduledDate || 'Unscheduled';
    if (!groups[date]) groups[date] = [];
    groups[date].push(task);
    return groups;
  }, {});

  const autoAssignTasks = () => {
    if (!activeSubject) return;

    const batchId = `auto-${Date.now()}`;
    const incompleteItems = [];

    activeSubject.phases?.forEach(phase => {
      phase.tasks?.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach(subtask => {
            if (!subtask.completed) {
              incompleteItems.push({
                subjectId: activeSubject.id,
                phaseId: phase.id,
                taskId: task.id,
                subtaskId: subtask.id
              });
            }
          });
        } else if (!task.completed) {
          incompleteItems.push({
            subjectId: activeSubject.id,
            phaseId: phase.id,
            taskId: task.id,
            subtaskId: null
          });
        }
      });
    });

    if (incompleteItems.length === 0) {
      alert('No incomplete tasks found for auto assignment.');
      return;
    }

    const assignedTasks = incompleteItems.map((item, index) => ({
      id: `plan-${Date.now()}-${index}`,
      ...item,
      scheduledDate: addDaysToDateKey(today, index),
      isAutoAssigned: true,
      batchId
    }));

    setLearningPlan(prev => [...(prev || []), ...assignedTasks]);
    storeAutoAssignAction(batchId);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">

      {/* ── TOP CONTROLS & DUAL VIEW MODE SWITCH ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
            Learning Route
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Realistic, adaptable path through your knowledge world
          </p>
        </div>

        {/* View Mode Toggle: Route vs Schedule Grid */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('route')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'route'
                ? 'bg-white dark:bg-slate-900 text-electric-600 dark:text-electric-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Route View
          </button>

          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-electric-600 dark:text-electric-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Schedule Grid
          </button>
        </div>
      </div>

      {/* ── VIEW MODE 1: ROUTE EXPEDITION (PRIMARY) ── */}
      {viewMode === 'route' && (
        <div className="space-y-8 anim-fade-in">

          {/* Level 1: Destination & Route Expedition Thread */}
          <PathDestinationHeader
            destination={destination}
            subjects={subjects}
            selectedSubjectId={activeSubject?.id}
            onSelectSubject={setSelectedSubjectId}
            currentPhaseName={activeSubject?.phases?.[0]?.name || 'Foundations'}
            phases={activeSubject?.phases || []}
          />

          {/* Level 2: Reality Bar (Time Budget, Resources, Recovery Notification) */}
          <PathRealityBar
            timeBudget={timeBudget}
            setTimeBudget={handleUpdateTimeBudget}
            resourceLevel={resourceLevel}
            setResourceLevel={handleUpdateResourceLevel}
            recoveryInfo={recoveryInfo}
            onRecalibrateRoute={handleRecalibrateRoute}
          />

          {/* Level 3: Editorial Weekly Route Stops */}
          <PathWeeklyRoute
            routeStops={weeklyRouteStops}
            onContinueInNow={handleContinueInNow}
            onViewInWorld={handleViewInWorld}
            onExploreDetour={(stop) => setActiveDetourStop(stop)}
            onCompleteStop={handleCompleteStop}
          />

        </div>
      )}

      {/* ── VIEW MODE 2: CLASSIC SCHEDULE GRID (MANAGEMENT & CALENDAR) ── */}
      {viewMode === 'grid' && (
        <div className="space-y-6 anim-fade-in">

          {/* Management Actions */}
          <div className="bg-white dark:bg-[#0F172A] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
                Scheduled Tasks for {activeSubject?.name || 'All Domains'}
              </h3>
              <p className="text-xs text-slate-400">
                {subjectLearningTasks.length} total scheduled tasks
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={autoAssignTasks}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Auto-Assign Sequential Days
              </button>

              {subjectLearningTasks.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Clear all scheduled tasks for this domain?")) {
                      setLearningPlan(prev => prev.filter(t => t.subjectId !== activeSubject?.id));
                    }
                  }}
                  className="px-3 py-2 rounded-xl border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs transition-colors"
                >
                  Clear Domain Tasks
                </button>
              )}
            </div>
          </div>

          {/* Date-grouped Tasks */}
          <div className="space-y-4">
            {Object.keys(tasksByDate).length === 0 ? (
              <div className="bg-white dark:bg-[#0F172A] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-400 text-xs">
                No scheduled tasks. Switch to Route View or click Auto-Assign.
              </div>
            ) : (
              Object.entries(tasksByDate)
                .sort(([a], [b]) => compareDateKeys(a, b))
                .map(([date, tasks]) => {
                  const isCurrentDay = date === today;
                  return (
                    <div
                      key={date}
                      className={`border-2 rounded-3xl p-5 ${
                        isCurrentDay
                          ? 'border-coral-500 bg-coral-50/20 dark:bg-coral-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
                        <span className={`font-display font-black text-sm ${isCurrentDay ? 'text-coral-600 dark:text-coral-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {isCurrentDay ? 'Today · Scheduled' : date}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {tasks.length} task{tasks.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {tasks.map(task => {
                          const details = getTaskDetails(task.taskId, task.phaseId, task.subjectId, task.subtaskId);
                          return (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {details.subtaskName || details.taskName}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {details.phaseName}
                                </div>
                              </div>

                              <button
                                onClick={() => handleCompleteStop({
                                  subjectId: task.subjectId,
                                  phaseId: task.phaseId,
                                  taskId: task.taskId,
                                  targetSubtask: task.subtaskId ? { id: task.subtaskId } : null,
                                  planEntryId: task.id
                                })}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Complete
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
            )}
          </div>

        </div>
      )}

      {/* ── CURIOSITY DETOUR DRAWER ── */}
      {activeDetourStop && (
        <PathDetourDrawer
          stop={activeDetourStop}
          onClose={() => setActiveDetourStop(null)}
          onReturnToRoute={() => setActiveDetourStop(null)}
          onLaunchDetourInNow={handleLaunchDetourInNow}
        />
      )}

      {/* ── FLOATING UNDO BANNER (RETAINS STATE INTEGRITY) ── */}
      {lastAction && (
        <div
          role="region"
          aria-label="Undo action banner"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 border-2 border-slate-700 dark:border-slate-300 rounded-2xl px-5 py-3 shadow-2xl backdrop-blur-md anim-pop flex items-center gap-4"
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>Task completed and removed from route</span>
          </div>

          <button
            onClick={undoLastAction}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <RotateCcw className="w-3 h-3" />
            Undo
          </button>
        </div>
      )}

    </div>
  );
};

export default LearningPlanPage;
