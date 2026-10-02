import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { getLocalDateKey, addDaysToDateKey } from '../utils/dateUtils';
import { CURATED_ROADMAPS } from '../data/curatedRoadmaps';
import InteractiveLessonStage from './InteractiveLessonStage';
import VisualGuidedPath from './VisualGuidedPath';
import { Play, CheckCircle2, RotateCcw, Clock, Sparkles, BookOpen, Trophy } from 'lucide-react';

const PERSONALITY_PUNCTUATION = [
  "The electrons were not consulted, but they complied anyway.",
  "Kirchhoff is nodding approvingly at your circuit.",
  "That minus sign had other plans, but you caught it.",
  "We are so back. Ready for the next derivation?",
  "Ohm's law does not accept excuses, only deliberate practice."
];

/**
 * DashboardTasks — V4 Redesign
 * Bold, Colorful, Tactile, Playful & Alive
 * (Duolingo visual energy + Brilliant interactive models + Serious STEM rigor)
 */
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
    setSelectedSubjectId,
    importRoadmap
  } = useRoadmap();

  // Workflow states: 'idle' | 'focus' | 'reflection' | 'postpone'
  const [workflowState, setWorkflowState] = useState('idle');
  const [nextTask, setNextTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // Progressive Disclosure: Proof Criteria
  const [showCriteria, setShowCriteria] = useState(false);

  // Timer State
  const defaultDurationMinutes = settings?.pomodoroWorkDuration || 25;
  const [timeLeft, setTimeLeft] = useState(defaultDurationMinutes * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const endTimeRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const elapsedMsRef = useRef(0);
  const timerIntervalRef = useRef(null);

  // Reflection Modal Form
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [reflectionDifficulty, setReflectionDifficulty] = useState('medium');
  const [reflectionMinutes, setReflectionMinutes] = useState(defaultDurationMinutes);

  // Postpone Form
  const [postponeDate, setPostponeDate] = useState('');

  // Random personality moment
  const punctuationQuote = useMemo(() => {
    return PERSONALITY_PUNCTUATION[Math.floor(Math.random() * PERSONALITY_PUNCTUATION.length)];
  }, []);

  // Helper to extract task details from learning plan entry
  const findTaskDetailsFromLearningPlan = useCallback(
    (learningTask, subjectsArray) => {
      if (!learningTask || !Array.isArray(subjectsArray)) return null;

      const subject = subjectsArray.find(s => s.id === learningTask.subjectId);
      const phase = subject?.phases?.find(p => p.id === learningTask.phaseId);
      const task = phase?.tasks?.find(t => t.id === learningTask.taskId);

      if (!subject || !phase || !task) return null;

      if (learningTask.subtaskId) {
        const subtask = task.subtasks?.find(s => s.id === learningTask.subtaskId);
        if (!subtask || subtask.completed) return null;

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
          time: task.time || defaultDurationMinutes,
          difficulty: task.difficulty || 'medium',
          learningPlanEntryId: learningTask.id,
          isLearningPlanTask: true
        };
      }

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
          time: task.time || defaultDurationMinutes,
          difficulty: task.difficulty || 'medium',
          learningPlanEntryId: learningTask.id,
          isLearningPlanTask: true
        };
      }

      return null;
    },
    [defaultDurationMinutes]
  );

  // Synchronize next task
  useEffect(() => {
    const today = getLocalDateKey();
    const todayLearningTask = learningPlan?.find(task => 
      task.scheduledDate === today && 
      (!selectedSubjectId || task.subjectId === selectedSubjectId)
    );
    
    if (todayLearningTask) {
      const taskDetails = findTaskDetailsFromLearningPlan(todayLearningTask, subjects);
      if (taskDetails) {
        setNextTask(taskDetails);
        return;
      }
    }

    const task = selectedSubjectId ? getNextSubtaskForSubject(selectedSubjectId) : getNextSubtask();
    if (task) {
      setNextTask({
        ...task,
        time: task.time || defaultDurationMinutes,
        isLearningPlanTask: false
      });
    } else {
      setNextTask(null);
    }
  }, [subjects, getNextSubtask, getNextSubtaskForSubject, selectedSubjectId, learningPlan, findTaskDetailsFromLearningPlan, defaultDurationMinutes]);

  // Active Subject & Phase
  const activeSubject = useMemo(() => {
    if (!subjects || !subjects.length) return null;
    if (selectedSubjectId) {
      return subjects.find(s => s.id === selectedSubjectId) || subjects[0];
    }
    if (nextTask?.subjectId) {
      return subjects.find(s => s.id === nextTask.subjectId) || subjects[0];
    }
    return subjects[0];
  }, [subjects, selectedSubjectId, nextTask]);

  const activePhase = useMemo(() => {
    if (!activeSubject?.phases?.length) return null;
    if (nextTask?.phaseId) {
      return activeSubject.phases.find(p => p.id === nextTask.phaseId) || activeSubject.phases[0];
    }
    return activeSubject.phases[0];
  }, [activeSubject, nextTask]);

  // Guided Path Frames
  const guidedFrames = useMemo(() => {
    if (!activePhase?.tasks) return [];
    const frames = [];

    activePhase.tasks.forEach((task) => {
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach((subtask) => {
          frames.push({
            id: subtask.id,
            name: subtask.name,
            taskName: task.name,
            completed: Boolean(subtask.completed),
            isCurrent: nextTask && (nextTask.subtaskId === subtask.id || nextTask.id === subtask.id),
            raw: {
              subjectId: activeSubject.id,
              subjectName: activeSubject.name,
              phaseId: activePhase.id,
              phaseName: activePhase.name,
              taskId: task.id,
              taskName: task.name,
              subtaskId: subtask.id,
              name: subtask.name,
              time: task.time || defaultDurationMinutes
            }
          });
        });
      } else {
        const completed = isTaskCompleted(task);
        frames.push({
          id: task.id,
          name: task.name,
          taskName: task.name,
          completed,
          isCurrent: nextTask && nextTask.taskId === task.id,
          raw: {
            subjectId: activeSubject.id,
            subjectName: activeSubject.name,
            phaseId: activePhase.id,
            phaseName: activePhase.name,
            taskId: task.id,
            taskName: task.name,
            subtaskId: null,
            name: task.name,
            time: task.time || defaultDurationMinutes
          }
        });
      }
    });

    return frames;
  }, [activePhase, activeSubject, nextTask, isTaskCompleted, defaultDurationMinutes]);

  // Latest evidence record
  const latestProof = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    const sorted = [...sessions].reverse();
    return sorted.find(s => s.notes && s.notes.trim().length > 0) || sorted[0];
  }, [sessions]);

  // Wall-Clock Accurate Timer Tick
  const tickTimer = useCallback(() => {
    if (!endTimeRef.current) return;
    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setTimeLeft(remaining);

    if (remaining <= 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setIsTimerRunning(false);
      endTimeRef.current = null;
      const totalElapsedMs = elapsedMsRef.current + (sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : 0);
      const minutesSpent = Math.max(1, Math.round(totalElapsedMs / 60000));
      setReflectionMinutes(minutesSpent);
      setWorkflowState('reflection');
    }
  }, []);

  // Start Focus
  const handleStartFocus = (taskToLaunch = nextTask) => {
    if (!taskToLaunch) return;
    setSelectedTask(taskToLaunch);
    const taskMinutes = taskToLaunch.time || defaultDurationMinutes;
    setTimeLeft(taskMinutes * 60);
    elapsedMsRef.current = 0;
    sessionStartTimeRef.current = Date.now();
    endTimeRef.current = Date.now() + taskMinutes * 60 * 1000;
    setIsTimerRunning(true);
    setWorkflowState('focus');

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(tickTimer, 250);
  };

  // Pause Focus
  const handlePauseFocus = () => {
    if (!isTimerRunning) return;
    if (endTimeRef.current) {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
    }
    if (sessionStartTimeRef.current) {
      elapsedMsRef.current += Date.now() - sessionStartTimeRef.current;
      sessionStartTimeRef.current = null;
    }
    endTimeRef.current = null;
    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // Resume Focus
  const handleResumeFocus = () => {
    if (isTimerRunning) return;
    const targetSeconds = timeLeft > 0 ? timeLeft : defaultDurationMinutes * 60;
    sessionStartTimeRef.current = Date.now();
    endTimeRef.current = Date.now() + targetSeconds * 1000;
    setIsTimerRunning(true);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(tickTimer, 250);
  };

  // Open Reflection Modal
  const handleOpenReflection = (task = selectedTask || nextTask) => {
    setSelectedTask(task);
    handlePauseFocus();
    const totalElapsedMs = elapsedMsRef.current + (sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : 0);
    const calculatedMins = Math.max(1, Math.round(totalElapsedMs / 60000)) || defaultDurationMinutes;
    setReflectionMinutes(calculatedMins);
    setWorkflowState('reflection');
  };

  // Commit Reflection & Evidence
  const handleCommitEvidence = () => {
    if (!selectedTask) return;

    const task = selectedTask;
    const durationNum = Number(reflectionMinutes) || defaultDurationMinutes;

    let completion = null;
    if (task.subtaskId) {
      completion = completeSubtask({
        subjectId: task.subjectId,
        phaseId: task.phaseId,
        taskId: task.taskId,
        subtaskId: task.subtaskId
      });
    } else {
      completion = toggleTaskCompletion(
        task.subjectId,
        task.phaseId,
        task.taskId
      );
    }

    const session = addFocusSession({
      subjectId: task.subjectId,
      phaseId: task.phaseId,
      taskId: task.taskId,
      subtaskId: task.subtaskId || null,
      durationMinutes: durationNum,
      type: 'task-completion',
      notes: reflectionNotes.trim() || 'Mastered physical mechanism without reference materials.',
      difficulty: reflectionDifficulty
    });

    storeCompleteAction(
      task.subtaskId || task.taskId,
      session?.id,
      completion?.id
    );

    if (task.learningPlanEntryId) {
      setLearningPlan(prev =>
        (prev || []).filter(entry => entry.id !== task.learningPlanEntryId)
      );
    }

    setWorkflowState('idle');
    setSelectedTask(null);
    setReflectionNotes('');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsTimerRunning(false);

    setTimeout(() => {
      const next = selectedSubjectId ? getNextSubtaskForSubject(selectedSubjectId) : getNextSubtask();
      setNextTask(next);
    }, 120);
  };

  // Postpone handlers
  const handleOpenPostpone = (task = nextTask) => {
    setSelectedTask(task);
    setPostponeDate(addDaysToDateKey(getLocalDateKey(), 1));
    setWorkflowState('postpone');
  };

  const handleConfirmPostpone = () => {
    if (!selectedTask || !postponeDate) return;

    const newLearningPlanEntry = {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      subjectId: selectedTask.subjectId,
      phaseId: selectedTask.phaseId,
      taskId: selectedTask.taskId,
      subtaskId: selectedTask.subtaskId || null,
      scheduledDate: postponeDate
    };

    setLearningPlan(prev => {
      const filtered = selectedTask.learningPlanEntryId
        ? (prev || []).filter(e => e.id !== selectedTask.learningPlanEntryId)
        : (prev || []);
      return [...filtered, newLearningPlanEntry];
    });

    setWorkflowState('idle');
    setSelectedTask(null);
    setPostponeDate('');

    setTimeout(() => {
      const next = selectedSubjectId ? getNextSubtaskForSubject(selectedSubjectId) : getNextSubtask();
      setNextTask(next);
    }, 120);
  };

  // Switch active task to frame clicked on path
  const handleSelectFrame = (frame) => {
    if (!frame?.raw) return;
    setNextTask({
      id: frame.raw.subtaskId || frame.raw.taskId,
      name: frame.name,
      taskName: frame.taskName,
      subjectId: frame.raw.subjectId,
      subjectName: frame.raw.subjectName,
      phaseId: frame.raw.phaseId,
      phaseName: frame.raw.phaseName,
      taskId: frame.raw.taskId,
      subtaskId: frame.raw.subtaskId,
      time: frame.raw.time || defaultDurationMinutes,
      difficulty: 'medium',
      isLearningPlanTask: false
    });
  };

  // Format MM:SS
  const formatTimeStr = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Load Curated Pathway
  const handleLoadCurated = (curated) => {
    if (!curated?.subjects) return;
    const success = importRoadmap(curated);
    if (success && curated.subjects[0]) {
      setSelectedSubjectId(null);
    }
  };

  // =========================================================================
  // RENDER: FOCUS STATION (Tactile, Concentrated, Punchy)
  // =========================================================================
  if (workflowState === 'focus' && selectedTask) {
    const totalSecs = (selectedTask.time || 25) * 60;
    const progressPercent = Math.max(0, 100 - (timeLeft / totalSecs) * 100);

    return (
      <div className="min-h-[75vh] flex flex-col justify-between py-10 max-w-xl mx-auto text-center anim-pop">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider text-electric-600 dark:text-electric-400 bg-electric-50 dark:bg-electric-950/60 px-4 py-1.5 rounded-full border border-electric-200 dark:border-electric-900 w-fit mx-auto">
          <span>⚡ {selectedTask.subjectName}</span>
          <span>·</span>
          <span>{selectedTask.phaseName}</span>
        </div>

        {/* Central Focus Orb & Clock */}
        <div className="my-10 space-y-6">
          <div className="relative w-64 h-64 mx-auto rounded-full bg-white dark:bg-slate-900 border-8 border-electric-500 shadow-2xl flex flex-col items-center justify-center">
            {/* Countdown Clock */}
            <span className="font-mono text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatTimeStr(timeLeft)}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {isTimerRunning ? 'Concentration Active' : 'Session Paused'}
            </span>
            {/* Progress Fill Indicator */}
            <div className="w-36 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-electric-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Central Question */}
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white max-w-md mx-auto leading-snug">
            "{selectedTask.subtaskId ? selectedTask.name : 'Explain the mechanism without looking at notes.'}"
          </h2>

          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Focus deeply on the physics. Close secondary browser tabs and references.
          </p>
        </div>

        {/* Tactile Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={isTimerRunning ? handlePauseFocus : handleResumeFocus}
            className="btn-tactile-ghost px-6 py-3 text-sm"
          >
            {isTimerRunning ? '⏸️ PAUSE' : '▶️ RESUME'}
          </button>

          <button
            onClick={() => handleOpenReflection(selectedTask)}
            className="btn-tactile-emerald px-8 py-3 text-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>COMPLETE TAKE</span>
          </button>

          <button
            onClick={() => {
              handlePauseFocus();
              setWorkflowState('idle');
            }}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors px-3 py-2"
          >
            Abandon
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: REFLECTION DIALOG
  // =========================================================================
  if (workflowState === 'reflection' && selectedTask) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 anim-pop">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border-4 border-emerald-500">
          <div className="text-center space-y-1">
            <span className="text-3xl">🎉</span>
            <h3 className="font-display font-black text-2xl text-slate-900 dark:text-white">
              Take Concluded!
            </h3>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {reflectionMinutes} Minutes of Deep STEM Practice Completed
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                What did you actually prove or derive from memory?
              </label>
              <textarea
                value={reflectionNotes}
                onChange={(e) => setReflectionNotes(e.target.value)}
                placeholder="Derived base-emitter threshold (0.7V) and saturation boundary without notes."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm font-sans focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Time (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={reflectionMinutes}
                  onChange={(e) => setReflectionMinutes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Resistance Level
                </label>
                <select
                  value={reflectionDifficulty}
                  onChange={(e) => setReflectionDifficulty(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="easy">Smooth Recall</option>
                  <option value="medium">Moderate Effort</option>
                  <option value="hard">Breakthrough Insight</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setWorkflowState('idle')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Discard
              </button>

              <button
                onClick={handleCommitEvidence}
                className="btn-tactile-emerald px-6 py-2.5 text-sm"
              >
                Commit to Archive ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: POSTPONE DIALOG
  // =========================================================================
  if (workflowState === 'postpone' && selectedTask) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 anim-pop">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl border-2 border-slate-200 dark:border-slate-800">
          <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
            Reschedule Milestone
          </h3>
          <p className="text-xs text-slate-500">
            Pick a new date for "{selectedTask.name}" on your learning path.
          </p>

          <input
            type="date"
            value={postponeDate}
            min={getLocalDateKey()}
            onChange={(e) => setPostponeDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setWorkflowState('idle')}
              className="text-xs font-bold text-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPostpone}
              className="btn-tactile-electric px-5 py-2 text-xs"
            >
              Confirm Reschedule
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: MAIN DASHBOARD V4 — COLORFUL, TACTILE & ALIVE
  // =========================================================================
  return (
    <div className="space-y-8 select-none py-2">
      
      {/* ── CELEBRATORY COMPLETION REWARD BANNER (Principle 12, 13, 24) ── */}
      {lastAction && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 rounded-2xl p-4 flex items-center justify-between shadow-md anim-pop">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              🎉
            </div>
            <div>
              <div className="font-display font-bold text-sm text-emerald-900 dark:text-emerald-200">
                Milestone Mastered! Take locked into permanent memory.
              </div>
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {punctuationQuote}
              </div>
            </div>
          </div>

          <button
            onClick={undoLastAction}
            className="btn-tactile-ghost px-4 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo Take</span>
          </button>
        </div>
      )}

      {nextTask ? (
        <div className="space-y-8">
          
          {/* ══════════════════════════════════════════════════════════════
             1. THE HERO INTERACTIVE LESSON OBJECT (Principles 5, 6, 7, 10)
             Asymmetric Split: Interactive STEM Simulator + Question & Action
             ══════════════════════════════════════════════════════════════ */}
          <div className="tile-tactile p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Column (5 cols): Brilliant-style Interactive Lesson Stage */}
              <div className="lg:col-span-5 h-full">
                <InteractiveLessonStage 
                  taskName={nextTask.taskName || ''} 
                  conceptName={nextTask.name || ''} 
                />
              </div>

              {/* Right Column (7 cols): Challenge, Rationale & Chunky Tactile Button */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Status & Session Badge */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="bg-coral-50 dark:bg-coral-950/60 border border-coral-200 dark:border-coral-800 text-coral-600 dark:text-coral-400 font-extrabold text-xs uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    Today's Challenge
                  </span>

                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 opacity-60" />
                    {nextTask.time || defaultDurationMinutes} Min Focused Take
                  </span>
                </div>

                {/* The Cognitive Center: Big, Friendly, Punchy Question */}
                <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-slate-900 dark:text-white leading-tight tracking-tight">
                  {nextTask.subtaskId ? nextTask.name : "Why does current fall when resistance increases?"}
                </h1>

                {/* Friendly Approachable Explanation */}
                <p className="font-sans text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {nextTask.taskName 
                    ? `Master ${nextTask.taskName} from first principles before advancing to integrated applications.` 
                    : "Derive the mathematical and physical relationship directly from memory without notes."}
                </p>

                {/* Proof Criteria Disclosure Toggle */}
                <div>
                  <button
                    onClick={() => setShowCriteria(!showCriteria)}
                    className="text-xs font-bold text-electric-600 dark:text-electric-400 hover:underline flex items-center gap-1"
                  >
                    <span>{showCriteria ? 'Hide Retrieval Criteria ▴' : 'Unfold What You Will Prove ▾'}</span>
                  </button>

                  {showCriteria && (
                    <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 space-y-1.5 anim-pop">
                      <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-electric-600" />
                        Target Mastery Checklist:
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>Reconstruct the governing equation without consulting reference slides.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>State boundary conditions (e.g. forward bias threshold vs complete saturation).</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── BIG CHUNKY TACTILE BUTTON & SECONDARY CONTROLS ── */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
                  <button
                    onClick={() => handleStartFocus(nextTask)}
                    className="btn-tactile-coral py-4 px-8 text-base shadow-xl flex items-center justify-center gap-3 w-full sm:w-auto"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>START {nextTask.time || defaultDurationMinutes} MIN TAKE</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenReflection(nextTask)}
                      className="btn-tactile-ghost px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300"
                    >
                      📝 Note
                    </button>
                    <button
                      onClick={() => handleOpenPostpone(nextTask)}
                      className="btn-tactile-ghost px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300"
                    >
                      📅 Postpone
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
             2. THE VISUAL GUIDED PATH (Duolingo-inspired STEM Path)
             ══════════════════════════════════════════════════════════════ */}
          <VisualGuidedPath 
            frames={guidedFrames}
            activeFrameId={nextTask.id}
            onSelectFrame={handleSelectFrame}
            phaseName={activePhase?.name}
            subjectName={activeSubject?.name}
          />

          {/* ══════════════════════════════════════════════════════════════
             3. VISUAL EVIDENCE ARCHIVE (Principle 18, 21)
             ══════════════════════════════════════════════════════════════ */}
          {latestProof && (
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-300 dark:border-amber-700/60 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                  <Trophy className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Recent Proven Proof
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-bold text-slate-500">{latestProof.date || 'Yesterday'}</span>
                  </div>
                  <h4 className="font-display font-bold text-base text-slate-900 dark:text-white mt-0.5">
                    “{latestProof.notes || 'Mastered semiconductor junction forward bias without notes.'}”
                  </h4>
                </div>
              </div>

              <div className="font-bold text-xs bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 text-slate-700 dark:text-slate-300">
                {sessions?.length || 1} Total Proven Takes in Personal Archive
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Empty / Concluded State */
        <div className="tile-tactile p-8 text-center max-w-xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center text-3xl mx-auto shadow-lg">
            🎉
          </div>
          <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white">
            {subjects && subjects.length > 0 ? "You Have Concluded This Arc!" : "Welcome to Learning Tracker"}
          </h2>
          <p className="text-sm font-semibold text-slate-500 leading-relaxed">
            {subjects && subjects.length > 0 
              ? "All milestones in this sequence have been verified into your permanent memory archive. Select another domain or import a path to continue."
              : "Mount one of our curated STEM tracks below to begin your guided learning adventure."}
          </p>

          <div className="space-y-3 pt-2 text-left">
            {CURATED_ROADMAPS.map((c) => (
              <div 
                key={c.id}
                className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 hover:border-electric-500 transition-colors"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                  <p className="text-xs text-slate-500">{c.tagline}</p>
                </div>
                <button
                  onClick={() => handleLoadCurated(c)}
                  className="btn-tactile-electric px-4 py-2 text-xs shrink-0"
                >
                  Start Path ➔
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtle Personality Footer */}
      <footer className="pt-4 text-center font-semibold text-xs text-slate-400">
        Learning Tracker V4 · Serious STEM with Playful Tactility
      </footer>
    </div>
  );
};

export default DashboardTasks;
