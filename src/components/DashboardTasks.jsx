import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { getLocalDateKey, addDaysToDateKey } from '../utils/dateUtils';
import { CURATED_ROADMAPS } from '../data/curatedRoadmaps';
import LearningVisual from './LearningVisual';
import VisualGuidedPath from './VisualGuidedPath';
import OpenInContextLinks from './OpenInContextLinks';
import AdaptiveInterventionCard from './AdaptiveInterventionCard';
import { resolveLearningVisual, resolveProofCriteria, resolveChallengePrompt } from '../utils/visualResolver';
import { resolveTaskWhyTrace } from '../utils/whyResolver';
import { updateTrajectoryDestination } from '../utils/trajectoryResolver';
import { Play, CheckCircle2, RotateCcw, Clock, Sparkles, BookOpen, Trophy, Compass, X, Layers } from 'lucide-react';

const PERSONALITY_PUNCTUATION = [
  "The electrons were not consulted, but they complied anyway.",
  "Kirchhoff is nodding approvingly at your circuit.",
  "That minus sign had other plans, but you caught it.",
  "Back at the bench. Ready for the next derivation?",
  "Ohm's law does not accept excuses, only deliberate practice."
];

/**
 * DashboardTasks — V4 Truthful & Tactile Polish
 * Truthful to the underlying learning model:
 * - Visual object matches the current task (Capacitors -> real RC charging, Resistors -> Ohm's law, etc.)
 * - Zero fake simulation when no authentic model exists (collapses cleanly to single-column)
 * - Honest progress language ("completed" / "proven", never manufactured "mastered")
 * - Connected sequential guided path
 */
const DashboardTasks = () => {
  const {
    subjects,
    getNextSubtask,
    getNextSubtaskForSubject,
    completeSubtask,
    completeTask,
    toggleSubtask,
    toggleTaskCompletion,
    addFocusSession,
    isTaskCompleted,
    sessions,
    setLearningPlan,
    learningPlan,
    storeCompleteAction,
    undoLastAction,
    clearLastAction,
    lastAction,
    settings,
    selectedSubjectId,
    setSelectedSubjectId,
    importRoadmap,
    startFocusSession,
    currentLearningContext,
    selectLearningContext,
    adaptiveState,
    acceptRecommendation,
    rejectRecommendation,
    revertRecommendation
  } = useRoadmap();

  // Workflow states: 'idle' | 'focus' | 'reflection' | 'postpone'
  const [workflowState, setWorkflowState] = useState('idle');
  const [nextTask, setNextTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // Progressive Disclosure: Proof Criteria, Global Why & Daily Mission Structure
  const [showCriteria, setShowCriteria] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showMissionBrief, setShowMissionBrief] = useState(false);

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

  // Handle Escape key dismissal for dialog states
  useEffect(() => {
    if (workflowState !== 'reflection' && workflowState !== 'postpone') return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setWorkflowState('idle');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workflowState]);

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
          learningUnits: task.learningUnits || [],
          doingTasks: task.doingTasks || [],
          whyItMatters: task.whyItMatters || null,
          depth: task.depth || null,
          practicalFailureModes: task.practicalFailureModes || [],
          highLeverageConcepts: task.highLeverageConcepts || [],
          consequences: task.consequences || [],
          evidenceExpected: task.evidenceExpected || null,
          learningMode: task.learningMode || null,
          adaptationRules: subject.adaptationRules || [],
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
          learningUnits: task.learningUnits || [],
          doingTasks: task.doingTasks || [],
          whyItMatters: task.whyItMatters || null,
          depth: task.depth || null,
          practicalFailureModes: task.practicalFailureModes || [],
          highLeverageConcepts: task.highLeverageConcepts || [],
          consequences: task.consequences || [],
          evidenceExpected: task.evidenceExpected || null,
          learningMode: task.learningMode || null,
          adaptationRules: subject.adaptationRules || [],
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
    // 1. Check if canonical currentLearningContext is selected (Unification Pass #12 & #13)
    if (currentLearningContext && subjects?.length > 0) {
      const subject = subjects.find(s => s.id === currentLearningContext.subjectId);
      const phase = subject?.phases?.find(p => p.id === currentLearningContext.phaseId);
      const task = phase?.tasks?.find(t => t.id === currentLearningContext.taskId);
      if (task) {
        if (currentLearningContext.subtaskId) {
          const subtask = task.subtasks?.find(s => s.id === currentLearningContext.subtaskId || s.name === currentLearningContext.subtaskId);
          if (subtask && !subtask.completed) {
            setNextTask({
              id: subtask.id || subtask.name,
              subtaskId: subtask.id || subtask.name,
              name: subtask.name,
              subjectId: subject.id,
              subjectName: subject.name,
              phaseId: phase.id,
              phaseName: phase.name,
              taskId: task.id,
              taskName: task.name,
              conceptId: subtask.conceptId || task.conceptId || null,
              visualId: subtask.visualId || task.visualId || null,
              learningVisual: subtask.learningVisual || task.learningVisual || null,
              time: task.time || defaultDurationMinutes,
              difficulty: task.difficulty || 'medium',
              learningUnits: task.learningUnits || [],
              doingTasks: task.doingTasks || [],
              whyItMatters: task.whyItMatters || null,
              depth: task.depth || null,
              practicalFailureModes: task.practicalFailureModes || [],
              highLeverageConcepts: task.highLeverageConcepts || [],
              consequences: task.consequences || [],
              evidenceExpected: task.evidenceExpected || null,
              learningMode: task.learningMode || null,
              adaptationRules: subject.adaptationRules || [],
              isLearningPlanTask: false
            });
            return;
          }
        } else if (!task.completed) {
          setNextTask({
            id: task.id,
            name: task.name,
            subjectId: subject.id,
            subjectName: subject.name,
            phaseId: phase.id,
            phaseName: phase.name,
            taskId: task.id,
            taskName: task.name,
            subtaskId: null,
            conceptId: task.conceptId || null,
            visualId: task.visualId || null,
            learningVisual: task.learningVisual || null,
            time: task.time || defaultDurationMinutes,
            difficulty: task.difficulty || 'medium',
            learningUnits: task.learningUnits || [],
            doingTasks: task.doingTasks || [],
            whyItMatters: task.whyItMatters || null,
            depth: task.depth || null,
            practicalFailureModes: task.practicalFailureModes || [],
            highLeverageConcepts: task.highLeverageConcepts || [],
            consequences: task.consequences || [],
            evidenceExpected: task.evidenceExpected || null,
            learningMode: task.learningMode || null,
            adaptationRules: subject.adaptationRules || [],
            isLearningPlanTask: false
          });
          return;
        }
      }
      // If completed or removed, clear canonical context so it gracefully falls back
      selectLearningContext(null);
    }

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
  }, [subjects, getNextSubtask, getNextSubtaskForSubject, selectedSubjectId, learningPlan, findTaskDetailsFromLearningPlan, defaultDurationMinutes, currentLearningContext, selectLearningContext]);

  // Unification Pass #19: Global Why Trace (Task -> Capability -> Trajectory)
  const whyTrace = useMemo(() => {
    return resolveTaskWhyTrace(nextTask);
  }, [nextTask]);

  // Mission Context Detection for Part 4 Daily Experience
  const hasDailyMissionContext = useMemo(() => {
    if (!nextTask) return false;
    return Boolean(
      (nextTask.learningUnits && nextTask.learningUnits.length > 0) ||
      (nextTask.doingTasks && nextTask.doingTasks.length > 0) ||
      nextTask.evidenceExpected ||
      (nextTask.practicalFailureModes && nextTask.practicalFailureModes.length > 0) ||
      (nextTask.consequences && nextTask.consequences.length > 0)
    );
  }, [nextTask]);

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

  // Data-Driven Visual Object Resolution
  const resolvedVisual = useMemo(() => {
    if (!nextTask) return { type: 'none' };
    return resolveLearningVisual(nextTask, nextTask, activeSubject);
  }, [nextTask, activeSubject]);

  // Concrete Proof Criteria Resolution
  const proofCriteria = useMemo(() => {
    if (!nextTask) return [];
    return resolveProofCriteria(nextTask, nextTask, activeSubject);
  }, [nextTask, activeSubject]);

  // Natural Challenge Prompt
  const challengePrompt = useMemo(() => {
    if (!nextTask) return '';
    return resolveChallengePrompt(nextTask, nextTask);
  }, [nextTask]);

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
    const taskMinutes = taskToLaunch.time || defaultDurationMinutes;
    if (startFocusSession) {
      startFocusSession(taskToLaunch, taskMinutes);
      return;
    }
    setSelectedTask(taskToLaunch);
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
    const targetSubtaskId =
      task.subtaskId ||
      (task.taskId && task.id !== task.taskId ? task.id : null);

    if (targetSubtaskId) {
      completion = completeSubtask({
        subjectId: task.subjectId,
        phaseId: task.phaseId,
        taskId: task.taskId,
        subtaskId: targetSubtaskId,
        durationMinutes: durationNum,
        notes: reflectionNotes.trim() || 'Completed without notes.',
        difficulty: reflectionDifficulty
      });
    } else {
      completion = completeTask({
        subjectId: task.subjectId,
        phaseId: task.phaseId,
        taskId: task.taskId,
        durationMinutes: durationNum,
        notes: reflectionNotes.trim() || 'Completed without notes.',
        difficulty: reflectionDifficulty
      });
    }

    const session = addFocusSession({
      subjectId: task.subjectId,
      phaseId: task.phaseId,
      taskId: task.taskId,
      subtaskId: targetSubtaskId || null,
      durationMinutes: durationNum,
      type: 'task-completion',
      notes: reflectionNotes.trim() || 'Completed without notes.',
      difficulty: reflectionDifficulty
    });

    const lpEntry = task.learningPlanEntryId
      ? (learningPlan || []).find(e => e.id === task.learningPlanEntryId)
      : null;

    storeCompleteAction(
      targetSubtaskId || task.taskId,
      session?.id,
      completion?.id,
      {
        subjectId: task.subjectId,
        phaseId: task.phaseId,
        taskId: task.taskId,
        subtaskId: targetSubtaskId,
        taskDetails: task,
        learningPlanEntry: lpEntry
      }
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

  // Direct / Quick Finish Take (Retains original fast-completion capability without forcing timer modal)
  const handleQuickComplete = (taskToComplete = nextTask) => {
    if (!taskToComplete) return;

    const targetSubtaskId =
      taskToComplete.subtaskId ||
      (taskToComplete.taskId && taskToComplete.id !== taskToComplete.taskId ? taskToComplete.id : null);

    let completion = null;
    if (targetSubtaskId) {
      completion = completeSubtask({
        subjectId: taskToComplete.subjectId,
        phaseId: taskToComplete.phaseId,
        taskId: taskToComplete.taskId,
        subtaskId: targetSubtaskId,
        durationMinutes: taskToComplete.time || defaultDurationMinutes,
        notes: 'Completed milestone from dashboard.'
      });
    } else {
      completion = completeTask({
        subjectId: taskToComplete.subjectId,
        phaseId: taskToComplete.phaseId,
        taskId: taskToComplete.taskId,
        durationMinutes: taskToComplete.time || defaultDurationMinutes,
        notes: 'Completed milestone from dashboard.',
        difficulty: 'medium'
      });
    }

    const session = addFocusSession({
      subjectId: taskToComplete.subjectId,
      phaseId: taskToComplete.phaseId,
      taskId: taskToComplete.taskId,
      subtaskId: targetSubtaskId || null,
      durationMinutes: taskToComplete.time || defaultDurationMinutes,
      type: 'task-completion',
      notes: 'Completed milestone from dashboard.',
      difficulty: 'medium'
    });

    const lpEntry = taskToComplete.learningPlanEntryId
      ? (learningPlan || []).find(e => e.id === taskToComplete.learningPlanEntryId)
      : null;

    storeCompleteAction(
      targetSubtaskId || taskToComplete.taskId,
      session?.id,
      completion?.id,
      {
        subjectId: taskToComplete.subjectId,
        phaseId: taskToComplete.phaseId,
        taskId: taskToComplete.taskId,
        subtaskId: targetSubtaskId,
        taskDetails: taskToComplete,
        learningPlanEntry: lpEntry
      }
    );

    if (taskToComplete.learningPlanEntryId) {
      setLearningPlan(prev =>
        (prev || []).filter(entry => entry.id !== taskToComplete.learningPlanEntryId)
      );
    }

    setTimeout(() => {
      const next = selectedSubjectId ? getNextSubtaskForSubject(selectedSubjectId) : getNextSubtask();
      setNextTask(next);
    }, 100);
  };

  // Dedicated Undo Handler that immediately resurrects the undone subtask as nextTask
  const handleUndo = () => {
    const actionToUndo = lastAction;
    undoLastAction();
    if (actionToUndo?.taskDetails) {
      const restoredSubtaskId =
        actionToUndo.subtaskId ||
        actionToUndo.taskDetails.subtaskId ||
        (actionToUndo.taskDetails.taskId && actionToUndo.taskDetails.id !== actionToUndo.taskDetails.taskId
          ? actionToUndo.taskDetails.id
          : null);
      setNextTask({
        ...actionToUndo.taskDetails,
        id: restoredSubtaskId || actionToUndo.taskDetails.id,
        subtaskId: restoredSubtaskId,
        completed: false,
        time: actionToUndo.taskDetails.time || defaultDurationMinutes,
        isLearningPlanTask: Boolean(actionToUndo.learningPlanEntry)
      });
    } else {
      setTimeout(() => {
        const next = selectedSubjectId ? getNextSubtaskForSubject(selectedSubjectId) : getNextSubtask();
        setNextTask(next);
      }, 50);
    }
  };

  // Toggle path step directly from Guided Path cards
  const handleTogglePathStep = (frame) => {
    if (!frame?.raw) return;
    const targetSubtaskId =
      frame.raw.subtaskId ||
      (frame.raw.taskId && frame.raw.id !== frame.raw.taskId ? frame.raw.id : null);

    if (frame.completed) {
      if (
        lastAction &&
        (lastAction.subtaskId === targetSubtaskId ||
          lastAction.subtaskId === frame.raw.taskId ||
          lastAction.subtaskId === frame.name)
      ) {
        handleUndo();
      } else {
        if (targetSubtaskId) {
          toggleSubtask(frame.raw.subjectId, frame.raw.phaseId, frame.raw.taskId, targetSubtaskId);
        } else {
          toggleTaskCompletion(frame.raw.subjectId, frame.raw.phaseId, frame.raw.taskId);
        }
        setNextTask({
          ...frame.raw,
          id: targetSubtaskId || frame.raw.taskId,
          subtaskId: targetSubtaskId,
          completed: false,
          time: frame.raw.time || defaultDurationMinutes,
          isLearningPlanTask: false
        });
      }
    } else {
      handleQuickComplete(frame.raw);
    }
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
      if (curated.id === 'electronics-embedded') {
        updateTrajectoryDestination({
          primaryRole: 'Embedded Systems Internship',
          role: 'Embedded Systems Internship',
          statement: 'I want to build real embedded systems and be ready for internship interviews.',
          mode: 'career'
        });
      } else if (curated.name) {
        updateTrajectoryDestination({
          primaryRole: `${curated.name} Specialist`,
          role: `${curated.name} Specialist`,
          statement: `Develop capability across ${curated.name}.`,
          mode: 'career'
        });
      }
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
            <span className="font-mono text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatTimeStr(timeLeft)}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {isTimerRunning ? 'Concentration Active' : 'Session Paused'}
            </span>
            <div className="w-36 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-electric-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white max-w-md mx-auto leading-snug">
            "{selectedTask.subtaskId ? selectedTask.name : selectedTask.name}"
          </h2>

          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Focus deeply on first principles. Close secondary tabs and distraction sources.
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
      <div
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 anim-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reflection-dialog-title"
      >
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border-4 border-emerald-500">
          <div className="text-center space-y-1">
            <span className="text-3xl" aria-hidden="true">🎉</span>
            <h3 id="reflection-dialog-title" className="font-display font-black text-2xl text-slate-900 dark:text-white">
              Take Concluded!
            </h3>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {reflectionMinutes} Minutes of Deep Practice Completed
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="reflection-notes-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                What did you actually prove or derive from memory?
              </label>
              <textarea
                id="reflection-notes-input"
                value={reflectionNotes}
                onChange={(e) => setReflectionNotes(e.target.value)}
                placeholder="Derived governing relationship without consulting reference materials."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm font-sans focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="reflection-time-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Time (Minutes)
                </label>
                <input
                  id="reflection-time-input"
                  type="number"
                  min="1"
                  value={reflectionMinutes}
                  onChange={(e) => setReflectionMinutes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="reflection-difficulty-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Resistance Level
                </label>
                <select
                  id="reflection-difficulty-select"
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
                type="button"
                onClick={() => setWorkflowState('idle')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Discard
              </button>

              <button
                type="button"
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
      <div
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 anim-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="postpone-dialog-title"
      >
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl border-2 border-slate-200 dark:border-slate-800">
          <h3 id="postpone-dialog-title" className="font-display font-black text-xl text-slate-900 dark:text-white">
            Reschedule Milestone
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pick a new date for "{selectedTask.name}" on your learning path.
          </p>

          <label htmlFor="postpone-date-input" className="sr-only">
            Reschedule Date
          </label>
          <input
            id="postpone-date-input"
            type="date"
            value={postponeDate}
            min={getLocalDateKey()}
            onChange={(e) => setPostponeDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setWorkflowState('idle')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
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

  const hasVisual = resolvedVisual && resolvedVisual.type !== 'none';

  // =========================================================================
  // RENDER: MAIN DASHBOARD V4 — TRUTHFUL, COLORFUL & ALIVE
  // =========================================================================
  return (
    <div className="space-y-8 select-none py-2">

      {/* ── COMPLETION REWARD BANNER ── */}
      {lastAction && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 rounded-2xl p-4 flex items-center justify-between shadow-md anim-pop">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              🎉
            </div>
            <div>
              <div className="font-display font-bold text-sm text-emerald-900 dark:text-emerald-200">
                {lastAction.taskDetails?.name
                  ? `Milestone Completed: “${lastAction.taskDetails.name}”`
                  : 'Milestone Completed! Take logged to permanent archive.'}
              </div>
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {punctuationQuote}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              className="btn-tactile-coral px-4 py-2 text-xs flex items-center gap-1.5 shadow-sm"
              title="Undo this completion and restore milestone"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo Take</span>
            </button>

            <button
              type="button"
              id="dismiss-completion-banner-btn"
              onClick={() => {
                if (clearLastAction) clearLastAction();
                else if (storeCompleteAction) storeCompleteAction(null);
              }}
              className="p-1.5 rounded-xl text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
              title="Dismiss notification"
              aria-label="Dismiss completion notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── ADAPTIVE LEARNING INTERVENTION (Prompt #40 NOW Surface) ── */}
      {adaptiveState?.recommendations?.filter(r => r.surface === 'NOW').map(rec => (
        <AdaptiveInterventionCard
          key={rec.id}
          recommendation={rec}
          onAccept={acceptRecommendation}
          onReject={rejectRecommendation}
          onRevert={revertRecommendation}
        />
      ))}

      {nextTask ? (
        <div className="space-y-8">

          {/* ══════════════════════════════════════════════════════════════
             1. THE HERO CHALLENGE CARD (Truthful, Task-Aware Layout)
             Adapts: 2-column split if visual exists, full-width if no visual
             ══════════════════════════════════════════════════════════════ */}
          <div className="tile-tactile p-6 sm:p-8">
            <div className={`grid grid-cols-1 ${hasVisual ? 'lg:grid-cols-12 gap-8 items-stretch' : 'gap-6'}`}>

              {/* Left Column (5 cols): Rendered ONLY when authentic visual exists */}
              {hasVisual && (
                <div className="lg:col-span-5 h-full min-h-[300px]">
                  <LearningVisual
                    visual={resolvedVisual}
                    taskName={nextTask.taskName || ''}
                    conceptName={nextTask.name || ''}
                  />
                </div>
              )}

              {/* Right/Full Column: Challenge, Rationale & Tactile CTA */}
              <div className={`${hasVisual ? 'lg:col-span-7' : 'max-w-3xl mx-auto w-full'} flex flex-col justify-between space-y-5`}>

                <div className="space-y-4">
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

                    {nextTask.subjectName && (
                      <span className="bg-electric-50 dark:bg-electric-950/40 text-electric-600 dark:text-electric-400 font-semibold text-xs px-2.5 py-1 rounded-full border border-electric-200 dark:border-electric-900">
                        {nextTask.subjectName}
                      </span>
                    )}
                  </div>

                  {/* Task Title */}
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    {nextTask.taskName || 'Concept Take'}
                  </div>

                  {/* Punchy, Clear Question */}
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white leading-tight tracking-tight">
                    {nextTask.subtaskId ? nextTask.name : (nextTask.taskName || nextTask.name)}
                  </h1>

                  {/* Unpretentious Educational Rationale */}
                  <p className="font-sans text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {challengePrompt}
                  </p>

                  {/* Proof Criteria (Conditional & Authentic) */}
                  {proofCriteria && proofCriteria.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => setShowCriteria(!showCriteria)}
                        className="text-xs font-bold text-electric-600 dark:text-electric-400 hover:underline flex items-center gap-1"
                      >
                        <span>{showCriteria ? 'Hide Retrieval Criteria ▴' : 'Unfold What You Will Prove ▾'}</span>
                      </button>

                      {showCriteria && (
                        <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 space-y-2 anim-pop">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-electric-600" />
                            Target Proof Checklist:
                          </div>
                          {proofCriteria.map((criterion, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-500 font-bold shrink-0">✓</span>
                              <span>{criterion}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Global Why Trace (Prompt #19) */}
                  {whyTrace && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowWhy(!showWhy)}
                        className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1.5"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>{showWhy ? 'Hide Trajectory Context ▴' : `Why this matters for ${whyTrace.targetRole} ▾`}</span>
                      </button>

                      {showWhy && (
                        <div className="mt-2.5 p-3.5 bg-violet-50/70 dark:bg-violet-950/30 rounded-2xl border border-violet-200 dark:border-violet-900/40 text-xs font-sans space-y-1.5 anim-pop">
                          <div className="flex items-center justify-between font-mono font-bold text-[11px] text-violet-800 dark:text-violet-300">
                            <span>CAPABILITY: {whyTrace.capabilityName}</span>
                            <span className="opacity-75">{whyTrace.clusterName}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                            "{whyTrace.whyItMatters}"
                          </p>
                          <div className="pt-1 text-[10px] font-mono text-slate-400">
                            Targeting: <strong>{whyTrace.targetRole}</strong> · {whyTrace.targetTimeline}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Daily Mission Brief (Part 4: Understand · Apply · Produce · Verify · Recover · Connect) */}
                  {hasDailyMissionContext && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowMissionBrief(!showMissionBrief)}
                        className="text-xs font-mono font-bold text-electric-600 dark:text-electric-400 hover:underline flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{showMissionBrief ? 'Hide Daily Mission Brief ▴' : 'Unfold Daily Mission Structure ▾'}</span>
                      </button>

                      {showMissionBrief && (
                        <div className="mt-2.5 p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-xs space-y-3 anim-pop">
                          <div className="font-mono font-bold text-[11px] uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span>Mission Execution Structure</span>
                            <span className="text-[10px] text-electric-600 dark:text-electric-400 font-bold">Progressive Components</span>
                          </div>

                          {/* 1. UNDERSTAND */}
                          {nextTask.learningUnits && nextTask.learningUnits.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-mono font-bold text-[10px] uppercase text-electric-600 dark:text-electric-400 block">
                                1. Understand (Learning Units)
                              </span>
                              <div className="space-y-1.5 pl-2.5 border-l-2 border-electric-300 dark:border-electric-700">
                                {nextTask.learningUnits.map((lu, idx) => (
                                  <div key={idx} className="text-slate-800 dark:text-slate-200">
                                    <span className="font-bold">• {lu.name || lu.title}</span>
                                    {lu.depth && <span className="ml-1.5 text-[10px] font-mono opacity-75">[{lu.depth}]</span>}
                                    {lu.whyItMatters && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{lu.whyItMatters}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2 & 3. APPLY / PRACTICE */}
                          {((nextTask.doingTasks && nextTask.doingTasks.length > 0) || nextTask.learningMode) && (
                            <div className="space-y-1">
                              <span className="font-mono font-bold text-[10px] uppercase text-emerald-600 dark:text-emerald-400 block">
                                2 & 3. Apply & Practice (Activity Mode)
                              </span>
                              <div className="pl-2.5 border-l-2 border-emerald-300 dark:border-emerald-700 space-y-1">
                                {nextTask.doingTasks && nextTask.doingTasks.length > 0 ? (
                                  nextTask.doingTasks.map((dt, idx) => (
                                    <div key={idx} className="text-slate-800 dark:text-slate-200">
                                      <span className="font-bold">• {dt.name || dt.title}</span>
                                      {dt.mode && <span className="ml-1.5 px-1.5 py-0.2 rounded font-mono text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold uppercase">{dt.mode}</span>}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-slate-800 dark:text-slate-200">
                                    <span>Cognitive Mode: <strong>{nextTask.learningMode}</strong></span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 4. PRODUCE */}
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-[10px] uppercase text-coral-600 dark:text-coral-400 block">
                              4. Produce (Target Task)
                            </span>
                            <div className="pl-2.5 border-l-2 border-coral-300 dark:border-coral-700 text-slate-800 dark:text-slate-200 font-bold">
                              {nextTask.subtaskId ? nextTask.name : (nextTask.taskName || nextTask.name)}
                            </div>
                          </div>

                          {/* 5. VERIFY YOUR WORK */}
                          {nextTask.evidenceExpected && (
                            <div className="space-y-1">
                              <span className="font-mono font-bold text-[10px] uppercase text-blue-600 dark:text-blue-400 block">
                                5. Verify Your Work (Expected Evidence)
                              </span>
                              <div className="pl-2.5 border-l-2 border-blue-300 dark:border-blue-700 text-slate-700 dark:text-slate-300">
                                {nextTask.evidenceExpected}
                              </div>
                            </div>
                          )}

                          {/* 6. RECOVER */}
                          {((nextTask.practicalFailureModes && nextTask.practicalFailureModes.length > 0) || (nextTask.adaptationRules && nextTask.adaptationRules.length > 0)) && (
                            <div className="space-y-1">
                              <span className="font-mono font-bold text-[10px] uppercase text-amber-600 dark:text-amber-400 block">
                                6. Recover (Failure Mode & Resilience)
                              </span>
                              <div className="pl-2.5 border-l-2 border-amber-300 dark:border-amber-700 text-slate-700 dark:text-slate-300">
                                {nextTask.practicalFailureModes && nextTask.practicalFailureModes.length > 0 ? (
                                  <div>
                                    <span className="font-medium">Watch for: </span>
                                    <span>{nextTask.practicalFailureModes[0]}</span>
                                  </div>
                                ) : (
                                  <div>
                                    <span>Adaptive guidance: {nextTask.adaptationRules[0]?.action || 'Revisit governing intuition'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 7. CONNECTION */}
                          {(nextTask.whyItMatters || (nextTask.consequences && nextTask.consequences.length > 0)) && (
                            <div className="space-y-1">
                              <span className="font-mono font-bold text-[10px] uppercase text-violet-600 dark:text-violet-400 block">
                                7. Connection (Why This Matters & Unlocks Next)
                              </span>
                              <div className="pl-2.5 border-l-2 border-violet-300 dark:border-violet-700 text-slate-700 dark:text-slate-300 space-y-0.5">
                                {nextTask.whyItMatters && <p>{nextTask.whyItMatters}</p>}
                                {nextTask.consequences && nextTask.consequences.length > 0 && (
                                  <p className="text-[11px] font-mono text-violet-700 dark:text-violet-300">
                                    Unlocks downstream: {nextTask.consequences.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cross-Screen Open in Context Strip (Prompt #20) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Explore in Context:
                    </span>
                    <OpenInContextLinks
                      item={{
                        ...nextTask,
                        taskId: nextTask.taskId || nextTask.id,
                        name: nextTask.name || nextTask.taskName
                      }}
                      showNow={false}
                      compact={true}
                    />
                  </div>
                </div>

                {/* Big Chunky Primary Button & Subordinate Secondary Controls */}
                <div className="pt-3 flex flex-wrap items-center gap-3 sm:gap-4">
                  <button
                    onClick={() => handleStartFocus(nextTask)}
                    className="btn-tactile-coral py-3.5 px-7 text-sm sm:text-base shadow-xl flex items-center justify-center gap-2.5 w-full sm:w-auto"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>START {nextTask.time || defaultDurationMinutes} MIN TAKE</span>
                  </button>

                  <button
                    onClick={() => handleQuickComplete(nextTask)}
                    className="btn-tactile-emerald py-3.5 px-6 text-sm shadow-md flex items-center justify-center gap-2 w-full sm:w-auto"
                    title="Directly mark this take complete without timer"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>FINISH TAKE</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenReflection(nextTask)}
                      className="btn-tactile-ghost px-4 py-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      📝 Note
                    </button>
                    <button
                      onClick={() => handleOpenPostpone(nextTask)}
                      className="btn-tactile-ghost px-4 py-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      📅 Postpone
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
             2. THE VISUAL GUIDED PATH (Connected Sequential Trail)
             ══════════════════════════════════════════════════════════════ */}
          <VisualGuidedPath
            frames={guidedFrames}
            activeFrameId={nextTask.id}
            onSelectFrame={handleSelectFrame}
            onToggleStep={handleTogglePathStep}
            phaseName={activePhase?.name}
            subjectName={activeSubject?.name}
          />

          {/* ══════════════════════════════════════════════════════════════
             3. RECENT PROVEN EVIDENCE ARCHIVE
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
                      Recent Reflection
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-bold text-slate-500">{latestProof.date || 'Recent'}</span>
                  </div>
                  <h4 className="font-display font-bold text-base text-slate-900 dark:text-white mt-0.5">
                    “{latestProof.notes || 'Completed without notes.'}”
                  </h4>
                </div>
              </div>

              <div className="font-bold text-xs bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 text-slate-700 dark:text-slate-300">
                {(sessions?.length ?? 0)} Total Sessions in Personal Archive
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
              ? "All milestones in this sequence have been completed. Select another domain or import a path to continue."
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
        Learning Tracker · Serious STEM with Tactile Clarity
      </footer>
    </div>
  );
};

export default DashboardTasks;
