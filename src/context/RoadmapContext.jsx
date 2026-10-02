import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { getLocalDateKey, addDaysToDateKey } from '../utils/dateUtils';
import { ACHIEVEMENTS, evaluateAchievements } from '../services/achievementService';
import { safeStorageGet, safeStorageSet, safeStorageRemove } from '../utils/storage';

export const RoadmapContext = createContext();

const DEFAULT_SETTINGS = {
  dailyGoalHours: 2,
  dailyLearningHours: 2,
  pomodoroWorkDuration: 25,
  pomodoroBreakDuration: 5,
  pomodoroLongBreakDuration: 15
};

const SETTINGS_STORAGE_KEY = 'learningTracker_settings';
const ACHIEVEMENTS_STORAGE_KEY = 'learningTracker_achievements';
const TASK_COMPLETIONS_STORAGE_KEY = 'learningTracker_taskCompletions';

const migrateSettings = (stored) => {
  if (!stored || typeof stored !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const goal =
    stored.dailyGoalHours ??
    stored.dailyLearningHours ??
    DEFAULT_SETTINGS.dailyGoalHours;

  const shortBreak =
    stored.pomodoroBreakDuration ??
    stored.pomodoroShortBreak ??
    DEFAULT_SETTINGS.pomodoroBreakDuration;

  const longBreak =
    stored.pomodoroLongBreakDuration ??
    stored.pomodoroLongBreak ??
    DEFAULT_SETTINGS.pomodoroLongBreakDuration;

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    dailyGoalHours: goal,
    dailyLearningHours: goal,
    pomodoroBreakDuration: shortBreak,
    pomodoroShortBreak: shortBreak,
    pomodoroLongBreakDuration: longBreak,
    pomodoroLongBreak: longBreak
  };
};

// Migration helper for legacy learning plan entries
const migrateLearningPlan = (plan, roadmap) => {
  if (!Array.isArray(plan)) return [];

  const migrated = [];

  for (const entry of plan) {
    if (Object.prototype.hasOwnProperty.call(entry, 'subtaskId')) {
      migrated.push(entry);
      continue;
    }

    const subject = (roadmap || []).find(s => s.id === entry.subjectId);
    const phase = subject?.phases?.find(p => p.id === entry.phaseId);
    const task = phase?.tasks?.find(t => t.id === entry.taskId);

    if (!task) {
      migrated.push(entry);
      continue;
    }

    const incompleteSubtasks = (task.subtasks || []).filter(subtask => !subtask.completed);

    if (incompleteSubtasks.length > 0) {
      const subtask = incompleteSubtasks[0];
      migrated.push({
        ...entry,
        subtaskId: subtask.id,
        migrationVersion: 1
      });
    } else {
      migrated.push({
        ...entry,
        subtaskId: null,
        migrationVersion: 1
      });
    }
  }

  return migrated;
};

export const RoadmapProvider = ({ children }) => {
  // Storage error state for truthful user notification
  const [storageError, setStorageError] = useState(null);

  // Per-key failure tracking — one successful write cannot mask another's failure
  const storageFailuresRef = useRef(new Set());

  // Reset guard ref and reset generation epoch counter
  const isResettingRef = useRef(false);
  const [resetGeneration, setResetGeneration] = useState(0);

  // Persistence handler with quota error catching (per-key tracking)
  const persistState = (key, value) => {
    // Skip writes if we're in a reset cycle
    if (isResettingRef.current) return true;
    const result = safeStorageSet(key, value);
    if (!result.ok) {
      storageFailuresRef.current.add(key);
      setStorageError(
        'Your browser storage is full. Export or clear old tracker data before continuing.'
      );
      return false;
    }
    storageFailuresRef.current.delete(key);
    if (storageFailuresRef.current.size === 0) {
      setStorageError(null);
    }
    return true;
  };

  // Roadmap data with persistence + legacy migration
  const [roadmap, setRoadmap] = useState(() => {
    const canonical = safeStorageGet("roadmap");
    if (canonical) {
      if (safeStorageGet("learningTracker_roadmap") !== null) {
        safeStorageRemove("learningTracker_roadmap");
      }
      return Array.isArray(canonical) ? canonical : [];
    }
    const legacy = safeStorageGet("learningTracker_roadmap");
    if (legacy) {
      // Migrate: write canonical, remove legacy
      const res = safeStorageSet("roadmap", legacy);
      if (res.ok) {
        safeStorageRemove("learningTracker_roadmap");
      }
      return Array.isArray(legacy) ? legacy : [];
    }
    return [];
  });

  const subjects = roadmap;
  const roadmapRef = useRef(roadmap);

  useEffect(() => {
    roadmapRef.current = roadmap;
  }, [roadmap]);

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState("roadmap", roadmap);
  }, [roadmap, resetGeneration]);

  // Last action state for undo functionality
  const [lastAction, setLastAction] = useState(null);
  const lastActionRef = useRef(null);

  // Task completion tracking for accurate time & history
  const [taskCompletions, setTaskCompletions] = useState(() => {
    const canonical = safeStorageGet(TASK_COMPLETIONS_STORAGE_KEY);
    if (canonical) {
      if (safeStorageGet('taskCompletions') !== null) {
        safeStorageRemove('taskCompletions');
      }
      return Array.isArray(canonical) ? canonical : [];
    }
    const legacy = safeStorageGet('taskCompletions');
    if (legacy) {
      const res = safeStorageSet(TASK_COMPLETIONS_STORAGE_KEY, legacy);
      if (res.ok) {
        safeStorageRemove('taskCompletions');
      }
      return Array.isArray(legacy) ? legacy : [];
    }
    return [];
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState(TASK_COMPLETIONS_STORAGE_KEY, taskCompletions);
  }, [taskCompletions, resetGeneration]);

  // Record task completion event into historical log
  const recordTaskCompletion = (dataOrTaskId, maybeDuration) => {
    const now = new Date();
    let record;

    if (typeof dataOrTaskId === 'object' && dataOrTaskId !== null) {
      const start = dataOrTaskId.completedAt ? new Date(dataOrTaskId.completedAt) : now;
      record = {
        id: dataOrTaskId.id || `completion-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        subjectId: dataOrTaskId.subjectId || null,
        phaseId: dataOrTaskId.phaseId || null,
        taskId: dataOrTaskId.taskId || null,
        subtaskId: dataOrTaskId.subtaskId || null,
        completedAt: start.toISOString(),
        date: getLocalDateKey(start),
        durationMinutes: Math.max(0, Number(dataOrTaskId.durationMinutes || dataOrTaskId.duration) || 0),
        notes: dataOrTaskId.notes || '',
        difficulty: dataOrTaskId.difficulty || null
      };
    } else {
      record = {
        id: `completion-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        subjectId: null,
        phaseId: null,
        taskId: dataOrTaskId,
        subtaskId: null,
        completedAt: now.toISOString(),
        date: getLocalDateKey(now),
        durationMinutes: Math.max(0, Number(maybeDuration) || 0),
        notes: '',
        difficulty: null
      };
    }

    setTaskCompletions(prev => [...prev, record]);
    return record;
  };

  // Theme state with persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = safeStorageGet('theme', 'light');
    return savedTheme === 'dark';
  });

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    persistState('theme', theme);

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Tutorial and roadmap import status
  const [showTutorial, setShowTutorial] = useState(() => {
    const hasRoadmapData = Array.isArray(subjects) && subjects.length > 0;
    const tutorialCompleted = safeStorageGet('tutorialCompleted') === 'true' || safeStorageGet('tutorialCompleted') === true;
    return !hasRoadmapData && !tutorialCompleted;
  });
  const [tutorialStep, setTutorialStep] = useState(0);

  const [hasImportedRoadmap, setHasImportedRoadmap] = useState(() => {
    return Array.isArray(subjects) && subjects.length > 0;
  });

  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  // Settings state with migration and persistence
  const [settings, setSettings] = useState(() => {
    const canonical = safeStorageGet(SETTINGS_STORAGE_KEY);
    if (canonical) {
      if (safeStorageGet('settings') !== null) {
        safeStorageRemove('settings');
      }
      return migrateSettings(canonical);
    }
    const legacy = safeStorageGet('settings');
    if (legacy) {
      const migrated = migrateSettings(legacy);
      const res = safeStorageSet(SETTINGS_STORAGE_KEY, migrated);
      if (res.ok) {
        safeStorageRemove('settings');
      }
      return migrated;
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState(SETTINGS_STORAGE_KEY, settings);
  }, [settings, resetGeneration]);

  const updateSettings = (newSettings) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      if (newSettings.dailyGoalHours !== undefined) {
        merged.dailyLearningHours = newSettings.dailyGoalHours;
      } else if (newSettings.dailyLearningHours !== undefined) {
        merged.dailyGoalHours = newSettings.dailyLearningHours;
      }

      if (newSettings.pomodoroShortBreak !== undefined) {
        merged.pomodoroBreakDuration = newSettings.pomodoroShortBreak;
      } else if (newSettings.pomodoroBreakDuration !== undefined) {
        merged.pomodoroShortBreak = newSettings.pomodoroBreakDuration;
      }

      if (newSettings.pomodoroLongBreak !== undefined) {
        merged.pomodoroLongBreakDuration = newSettings.pomodoroLongBreak;
      } else if (newSettings.pomodoroLongBreakDuration !== undefined) {
        merged.pomodoroLongBreak = newSettings.pomodoroLongBreakDuration;
      }

      return merged;
    });
  };

  // Daily goals tracking state
  const [dailyGoals, setDailyGoals] = useState(() => {
    const canonical = safeStorageGet('dailyGoals');
    if (canonical && typeof canonical === 'object') {
      if (safeStorageGet('learningTracker_dailyGoals') !== null) {
        safeStorageRemove('learningTracker_dailyGoals');
      }
      return canonical;
    }
    const legacy = safeStorageGet('learningTracker_dailyGoals');
    if (legacy && typeof legacy === 'object') {
      const res = safeStorageSet('dailyGoals', legacy);
      if (res.ok) {
        safeStorageRemove('learningTracker_dailyGoals');
      }
      return legacy;
    }
    return {};
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState('dailyGoals', dailyGoals);
  }, [dailyGoals, resetGeneration]);

  // Sessions data with persistence
  const [sessions, setSessions] = useState(() => {
    const canonical = safeStorageGet("sessions");
    if (canonical) {
      if (safeStorageGet("learningTracker_sessions") !== null) {
        safeStorageRemove("learningTracker_sessions");
      }
      return Array.isArray(canonical) ? canonical : [];
    }
    const legacy = safeStorageGet("learningTracker_sessions");
    if (legacy) {
      const res = safeStorageSet("sessions", legacy);
      if (res.ok) {
        safeStorageRemove("learningTracker_sessions");
      }
      return Array.isArray(legacy) ? legacy : [];
    }
    return [];
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState("sessions", sessions);
  }, [sessions, resetGeneration]);

  // Learning plan data with persistence
  const [learningPlan, setLearningPlan] = useState(() => {
    const canonical = safeStorageGet("learningPlan");
    if (canonical) {
      if (safeStorageGet("learningTracker_learningPlan") !== null) {
        safeStorageRemove("learningTracker_learningPlan");
      }
      return Array.isArray(canonical) ? canonical : [];
    }
    const legacy = safeStorageGet("learningTracker_learningPlan");
    if (legacy) {
      const res = safeStorageSet("learningPlan", legacy);
      if (res.ok) {
        safeStorageRemove("learningTracker_learningPlan");
      }
      return Array.isArray(legacy) ? legacy : [];
    }
    return [];
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState("learningPlan", learningPlan);
  }, [learningPlan, resetGeneration]);

  // Migrate legacy learning plan entries to retain subtaskId
  useEffect(() => {
    if (isResettingRef.current) return;
    setLearningPlan(prev => {
      if (isResettingRef.current) return prev;
      const migrated = migrateLearningPlan(prev, roadmap);
      const changed = JSON.stringify(migrated) !== JSON.stringify(prev);
      return changed ? migrated : prev;
    });
  }, [roadmap, resetGeneration]);

  // Notes data with persistence
  const [notes, setNotes] = useState(() => {
    const canonical = safeStorageGet("notes");
    if (canonical) {
      if (safeStorageGet("learningTracker_notes") !== null) {
        safeStorageRemove("learningTracker_notes");
      }
      return Array.isArray(canonical) ? canonical : [];
    }
    const legacy = safeStorageGet("learningTracker_notes");
    if (legacy) {
      const res = safeStorageSet("notes", legacy);
      if (res.ok) {
        safeStorageRemove("learningTracker_notes");
      }
      return Array.isArray(legacy) ? legacy : [];
    }
    return [];
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState("notes", notes);
  }, [notes, resetGeneration]);

  // Achievements state with persistence
  const [unlockedAchievements, setUnlockedAchievements] = useState(() => {
    const canonical = safeStorageGet(ACHIEVEMENTS_STORAGE_KEY);
    if (canonical) {
      if (safeStorageGet('achievements') !== null) {
        safeStorageRemove('achievements');
      }
      return Array.isArray(canonical) ? canonical : [];
    }
    const legacy = safeStorageGet('achievements');
    if (legacy) {
      const res = safeStorageSet(ACHIEVEMENTS_STORAGE_KEY, legacy);
      if (res.ok) {
        safeStorageRemove('achievements');
      }
      return Array.isArray(legacy) ? legacy : [];
    }
    return [];
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState(ACHIEVEMENTS_STORAGE_KEY, unlockedAchievements);
  }, [unlockedAchievements, resetGeneration]);

  const [newlyUnlocked, setNewlyUnlocked] = useState(null);

  const clearAchievementNotification = (achievementId) => {
    if (!achievementId) {
      setNewlyUnlocked(null);
    } else if (Array.isArray(newlyUnlocked)) {
      const filtered = newlyUnlocked.filter(a =>
        typeof a === 'string' ? a !== achievementId : a.id !== achievementId
      );
      setNewlyUnlocked(filtered.length > 0 ? filtered : null);
    } else {
      setNewlyUnlocked(null);
    }
  };

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      const { key, newValue } = e;
      if (!newValue) return;

      try {
        if (key === 'roadmap' || key === 'learningTracker_roadmap') {
          setRoadmap(JSON.parse(newValue));
        } else if (key === 'learningPlan' || key === 'learningTracker_learningPlan') {
          setLearningPlan(JSON.parse(newValue));
        } else if (key === 'sessions' || key === 'learningTracker_sessions') {
          setSessions(JSON.parse(newValue));
        } else if (key === TASK_COMPLETIONS_STORAGE_KEY || key === 'taskCompletions') {
          setTaskCompletions(JSON.parse(newValue));
        } else if (key === 'notes' || key === 'learningTracker_notes') {
          setNotes(JSON.parse(newValue));
        } else if (key === SETTINGS_STORAGE_KEY || key === 'settings') {
          setSettings(migrateSettings(JSON.parse(newValue)));
        } else if (key === ACHIEVEMENTS_STORAGE_KEY || key === 'achievements') {
          setUnlockedAchievements(JSON.parse(newValue));
        } else if (key === 'theme') {
          setIsDarkMode(newValue === 'dark');
        }
      } catch (error) {
        console.error('Error syncing from storage event:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ============================================================
  // P1.3 & P1.4 — NORMALIZED FOCUS SESSIONS
  // ============================================================
  const addFocusSession = (sessionData = {}) => {
    const {
      subjectId = null,
      phaseId = null,
      taskId = null,
      subtaskId = null,
      durationMinutes = 0,
      duration = 0,
      startedAt = new Date(),
      endedAt = new Date(),
      type = 'focus',
      notes = '',
      difficulty = null
    } = sessionData;

    const start =
      startedAt instanceof Date
        ? startedAt
        : new Date(startedAt);

    const end =
      endedAt instanceof Date
        ? endedAt
        : new Date(endedAt);

    const normalizedDuration = Math.max(
      0,
      Number(durationMinutes || duration) || 0
    );

    const session = {
      id: sessionData.id || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      subjectId,
      phaseId,
      taskId,
      subtaskId,
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      durationMinutes: normalizedDuration,
      // LOCAL calendar day bucket
      date: getLocalDateKey(start),
      type,
      notes,
      difficulty
    };

    setSessions(prev => [...prev, session]);
    return session;
  };

  // ============================================================
  // P1.5 & P1.6 — STREAK CALCULATION (Ignoring zero-minute sessions)
  // ============================================================
  const calculateStreak = (sessionsList = sessions) => {
    if (!Array.isArray(sessionsList) || sessionsList.length === 0) {
      return 0;
    }

    // Filter out zero-minute sessions
    const validSessions = sessionsList.filter(
      session => Number(session.durationMinutes || session.duration || 0) > 0
    );

    const sessionDates = new Set(
      validSessions
        .map(session => (session.date ? getLocalDateKey(session.date) : null))
        .filter(Boolean)
    );

    if (sessionDates.size === 0) {
      return 0;
    }

    let currentDate = getLocalDateKey();

    // If the user has not studied today, allow the streak to remain alive based on yesterday.
    if (!sessionDates.has(currentDate)) {
      currentDate = addDaysToDateKey(currentDate, -1);

      if (!sessionDates.has(currentDate)) {
        return 0;
      }
    }

    let streak = 0;

    while (sessionDates.has(currentDate)) {
      streak++;
      currentDate = addDaysToDateKey(currentDate, -1);
    }

    return streak;
  };

  // Total learning time in minutes
  const getTotalLearningTime = () => {
    return sessions.reduce(
      (total, session) =>
        total + Math.max(0, Number(session.durationMinutes || session.duration) || 0),
      0
    );
  };

  // ============================================================
  // P1.7 — CANONICAL DAILY GOAL STATS & MINUTES
  // ============================================================
  const getDailyFocusMinutes = (
    sessionsList = sessions,
    dateKey = getLocalDateKey()
  ) => {
    return (sessionsList || [])
      .filter(session => {
        const sDate = session.date ? getLocalDateKey(session.date) : null;
        return sDate === dateKey;
      })
      .reduce(
        (total, session) =>
          total +
          Math.max(
            0,
            Number(session.durationMinutes || session.duration) || 0
          ),
        0
      );
  };

  const getDailyGoalStats = (
    sessionsList = sessions,
    goalHours = settings.dailyGoalHours,
    dateKey = getLocalDateKey()
  ) => {
    const targetGoalHours = goalHours !== undefined ? goalHours : settings.dailyGoalHours;
    const goalMinutes = Math.max(0, Number(targetGoalHours) || 0) * 60;
    const completedMinutes = getDailyFocusMinutes(sessionsList, dateKey);

    const percentage =
      goalMinutes > 0
        ? Math.min(100, Math.round((completedMinutes / goalMinutes) * 100))
        : 0;

    const todayStats = {
      goalMinutes,
      completedMinutes,
      remainingMinutes: Math.max(0, goalMinutes - completedMinutes),
      percentage,
      completed: goalMinutes > 0 && completedMinutes >= goalMinutes
    };

    // Calculate aggregated metrics for StatisticsPage
    const goalDays = Object.values(dailyGoals);
    const achievedDays = goalDays.filter(day => day.achieved).length;
    const totalDays = goalDays.length;
    const achievementRate = totalDays > 0 ? Math.round((achievedDays / totalDays) * 100) : 0;

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = addDaysToDateKey(getLocalDateKey(), -i);
      const dayData = dailyGoals[targetDate];
      const dayMinutes = getDailyFocusMinutes(sessionsList, targetDate);
      const targetM = goalMinutes;
      const isAchieved = targetM > 0 && dayMinutes >= targetM;
      last7Days.push({
        date: targetDate,
        achieved: dayData?.achieved ?? isAchieved,
        actualMinutes: dayData?.actualMinutes ?? dayMinutes,
        targetMinutes: dayData?.targetMinutes ?? targetM
      });
    }

    const recentAchieved = last7Days.filter(day => day.achieved).length;
    const recentRate = Math.round((recentAchieved / 7) * 100);

    return {
      ...todayStats,
      totalDays,
      achievedDays,
      achievementRate,
      recent7Days: last7Days,
      recentAchieved,
      recentRate,
      currentStreak: calculateStreak(sessionsList)
    };
  };

  // Sync daily goal snapshot for today whenever sessions or goal hours change
  useEffect(() => {
    if (isResettingRef.current) return;

    const today = getLocalDateKey();
    const todayMinutes = getDailyFocusMinutes(sessions, today);

    // If there are no sessions at all and dailyGoals is empty, don't resurrect a zero-minute goal snapshot
    if (todayMinutes === 0 && Object.keys(dailyGoals).length === 0 && sessions.length === 0) {
      return;
    }

    const targetMinutes = Math.max(0, Number(settings.dailyGoalHours) || 0) * 60;
    const goalAchieved = targetMinutes > 0 && todayMinutes >= targetMinutes;

    setDailyGoals(prev => {
      if (isResettingRef.current) return prev;
      const existing = prev[today];
      if (
        existing &&
        existing.actualMinutes === todayMinutes &&
        existing.targetMinutes === targetMinutes &&
        existing.achieved === goalAchieved
      ) {
        return prev;
      }
      return {
        ...prev,
        [today]: {
          targetMinutes,
          actualMinutes: todayMinutes,
          achieved: goalAchieved,
          date: today
        }
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, settings.dailyGoalHours, resetGeneration]);

  // ============================================================
  // P1.19 – P1.24 — ACHIEVEMENT ENGINE DOMAIN EVALUATION
  // ============================================================
  useEffect(() => {
    if (isResettingRef.current) return;
    const streak = calculateStreak(sessions);
    const newlyUnlockedIds = evaluateAchievements({
      sessions,
      taskCompletions,
      streak,
      existingAchievements: unlockedAchievements
    });

    if (newlyUnlockedIds.length > 0) {
      setUnlockedAchievements(prev => {
        if (isResettingRef.current) return prev;
        const next = [...prev];
        for (const id of newlyUnlockedIds) {
          if (!next.includes(id)) {
            next.push(id);
          }
        }
        return next;
      });

      const firstUnlocked = ACHIEVEMENTS.find(a => a.id === newlyUnlockedIds[0]);
      if (firstUnlocked) {
        setNewlyUnlocked(firstUnlocked);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, taskCompletions, resetGeneration]);

  // Release reset transaction guard after all reset render effects have completed
  useEffect(() => {
    if (resetGeneration > 0 && isResettingRef.current) {
      isResettingRef.current = false;
    }
  }, [resetGeneration]);

  // ============================================================
  // CANONICAL COMPLETION ENGINE
  // ============================================================
  const isTaskCompleted = (task) => {
    if (!task) return false;

    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      return task.subtasks.every(subtask => subtask.completed === true);
    }

    return task.completed === true;
  };

  const isPhaseCompleted = (phase) => {
    if (!phase) return false;
    const tasks = Array.isArray(phase.tasks) ? phase.tasks : [];
    return tasks.length > 0 && tasks.every(isTaskCompleted);
  };

  const isSubjectCompleted = (subject) => {
    if (!subject) return false;
    const phases = Array.isArray(subject.phases) ? subject.phases : [];
    return phases.length > 0 && phases.every(isPhaseCompleted);
  };

  // Toggle subtask with completedAt timestamp and history recording
  const toggleSubtask = (subjectId, phaseId, taskId, subtaskId) => {
    const currentRoadmap = roadmapRef.current || roadmap;
    const subject = currentRoadmap.find(s => s.id === subjectId);
    const phase = subject?.phases?.find(p => p.id === phaseId);
    const task = phase?.tasks?.find(t => t.id === taskId);
    const subtask = task?.subtasks?.find(st => st.id === subtaskId);

    if (!subtask) return null;

    const nextCompleted = !subtask.completed;
    const nowIso = new Date().toISOString();

    const nextRoadmap = currentRoadmap.map(s => {
      if (s.id !== subjectId) return s;
      return {
        ...s,
        phases: (s.phases || []).map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: (p.tasks || []).map(t => {
              if (t.id !== taskId) return t;
              const updatedSubtasks = (t.subtasks || []).map(st => {
                if (st.id !== subtaskId) return st;
                return {
                  ...st,
                  completed: nextCompleted,
                  completedAt: nextCompleted ? nowIso : null
                };
              });
              return {
                ...t,
                subtasks: updatedSubtasks,
                completed:
                  updatedSubtasks.length > 0 &&
                  updatedSubtasks.every(st => st.completed === true)
              };
            })
          };
        })
      };
    });

    roadmapRef.current = nextRoadmap;
    setRoadmap(nextRoadmap);

    let completionRecord = null;
    if (nextCompleted) {
      completionRecord = recordTaskCompletion({
        subjectId,
        phaseId,
        taskId,
        subtaskId,
        completedAt: nowIso
      });
    }

    return completionRecord;
  };

  const toggleSubtaskComplete = toggleSubtask;

  const completeSubtask = ({
    subjectId,
    phaseId,
    taskId,
    subtaskId,
    durationMinutes = 0,
    notes = '',
    difficulty = null
  }) => {
    if (!subjectId || !phaseId || !taskId || !subtaskId) {
      console.error('completeSubtask: missing identity', {
        subjectId,
        phaseId,
        taskId,
        subtaskId
      });
      return null;
    }

    const currentRoadmap = roadmapRef.current || roadmap;
    const subject = currentRoadmap.find(s => s.id === subjectId);
    const phase = subject?.phases?.find(p => p.id === phaseId);
    const task = phase?.tasks?.find(t => t.id === taskId);
    const subtask = task?.subtasks?.find(st => st.id === subtaskId);

    if (!subtask) {
      return null;
    }

    // Idempotency: if the subtask is already completed, do NOT record another completion event
    if (subtask.completed === true) {
      return null;
    }

    const nowIso = new Date().toISOString();

    const nextRoadmap = currentRoadmap.map(s => {
      if (s.id !== subjectId) return s;
      return {
        ...s,
        phases: (s.phases || []).map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: (p.tasks || []).map(t => {
              if (t.id !== taskId) return t;
              const updatedSubtasks = (t.subtasks || []).map(st => {
                if (st.id !== subtaskId) return st;
                return {
                  ...st,
                  completed: true,
                  completedAt: nowIso
                };
              });
              return {
                ...t,
                subtasks: updatedSubtasks,
                completed:
                  updatedSubtasks.length > 0 &&
                  updatedSubtasks.every(st => st.completed === true)
              };
            })
          };
        })
      };
    });

    roadmapRef.current = nextRoadmap;
    setRoadmap(nextRoadmap);

    const completionRecord = recordTaskCompletion({
      subjectId,
      phaseId,
      taskId,
      subtaskId,
      completedAt: nowIso,
      durationMinutes,
      notes,
      difficulty
    });

    return completionRecord;
  };

  const toggleTaskCompletion = (subjectId, phaseId, taskId) => {
    const currentRoadmap = roadmapRef.current || roadmap;
    const subject = currentRoadmap.find(s => s.id === subjectId);
    const phase = subject?.phases?.find(p => p.id === phaseId);
    const task = phase?.tasks?.find(t => t.id === taskId);

    if (!task) return null;

    const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
    const shouldComplete = hasSubtasks
      ? !task.subtasks.every(st => st.completed === true)
      : !task.completed;

    const nowIso = new Date().toISOString();

    const nextRoadmap = currentRoadmap.map(s => {
      if (s.id !== subjectId) return s;
      return {
        ...s,
        phases: (s.phases || []).map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: (p.tasks || []).map(t => {
              if (t.id !== taskId) return t;

              if (hasSubtasks) {
                return {
                  ...t,
                  subtasks: t.subtasks.map(st => ({
                    ...st,
                    completed: shouldComplete,
                    completedAt: shouldComplete ? (st.completedAt || nowIso) : null
                  })),
                  completed: shouldComplete,
                  completedAt: shouldComplete ? (t.completedAt || nowIso) : null
                };
              }

              return {
                ...t,
                completed: shouldComplete,
                completedAt: shouldComplete ? nowIso : null
              };
            })
          };
        })
      };
    });

    roadmapRef.current = nextRoadmap;
    setRoadmap(nextRoadmap);

    let completedRecord = null;
    if (shouldComplete) {
      completedRecord = recordTaskCompletion({
        subjectId,
        phaseId,
        taskId,
        subtaskId: null,
        completedAt: nowIso
      });
    }

    return completedRecord;
  };

  const toggleTaskComplete = toggleTaskCompletion;

  // ============================================================
  // P1.14 & P1.15 — SCOPED DAILY RESET
  // ============================================================
  const resetTodayRoadmapCompletions = () => {
    const today = getLocalDateKey();

    setRoadmap(prev =>
      prev.map(subject => ({
        ...subject,
        phases: (subject.phases || []).map(phase => ({
          ...phase,
          tasks: (phase.tasks || []).map(task => {
            const subtasks = (task.subtasks || []).map(subtask => {
              if (!subtask.completedAt) {
                return subtask;
              }

              const completedDate = getLocalDateKey(
                new Date(subtask.completedAt)
              );

              if (completedDate !== today) {
                return subtask;
              }

              return {
                ...subtask,
                completed: false,
                completedAt: null
              };
            });

            // Also check atomic task without subtasks
            let taskCompleted = task.completed;
            let taskCompletedAt = task.completedAt;
            if ((!task.subtasks || task.subtasks.length === 0) && task.completedAt) {
              const completedDate = getLocalDateKey(new Date(task.completedAt));
              if (completedDate === today) {
                taskCompleted = false;
                taskCompletedAt = null;
              }
            }

            const completed =
              subtasks.length > 0
                ? subtasks.every(subtask => subtask.completed === true)
                : taskCompleted;

            return {
              ...task,
              subtasks,
              completed,
              completedAt: completed ? taskCompletedAt : null
            };
          })
        }))
      }))
    );
  };

  const resetDailyProgress = () => {
    resetTodayRoadmapCompletions();

    const today = getLocalDateKey();

    // Remove today's learning sessions.
    setSessions(prev =>
      prev.filter(session => {
        const sDate = session.date ? getLocalDateKey(session.date) : null;
        return sDate !== today;
      })
    );

    // Remove today's completion events.
    setTaskCompletions(prev =>
      prev.filter(completion => {
        const cDate = completion.date ? getLocalDateKey(completion.date) : null;
        return cDate !== today;
      })
    );

    // Remove today's scheduled entries that were completed today
    setLearningPlan(prev =>
      prev.filter(entry =>
        !(
          entry.completed === true &&
          entry.completedDate === today
        )
      )
    );

    // Clear today's daily goal record
    setDailyGoals(prev => {
      const next = { ...prev };
      delete next[today];
      return next;
    });
  };

  // ============================================================
  // P1.16 & P1.17 — FULL RESET & INVARIANT INTEGRITY
  // ============================================================
  const resetEverything = () => {
    // Set the guard so persistence useEffects skip writes during this cycle.
    isResettingRef.current = true;

    // 1. Clear storage FIRST, before state changes trigger useEffect hooks.
    const keysToRemove = [
      'roadmap',
      'learningTracker_roadmap',
      'sessions',
      'learningTracker_sessions',
      'learningPlan',
      'learningTracker_learningPlan',
      'taskCompletions',
      TASK_COMPLETIONS_STORAGE_KEY,
      'dailyGoals',
      'learningTracker_dailyGoals',
      'notes',
      'learningTracker_notes',
      'settings',
      SETTINGS_STORAGE_KEY,
      'achievements',
      ACHIEVEMENTS_STORAGE_KEY,
      'userFeedback',
      'tutorialCompleted',
      'selectedSubjectId'
    ];

    keysToRemove.forEach(key => {
      safeStorageRemove(key);
    });

    storageFailuresRef.current.clear();
    setStorageError(null);

    // 2. Reset React state.
    roadmapRef.current = [];
    setRoadmap([]);
    setSessions([]);
    setLearningPlan([]);
    setTaskCompletions([]);
    setDailyGoals({});
    setNotes([]);
    setSettings({
      ...DEFAULT_SETTINGS,
      dailyLearningHours: DEFAULT_SETTINGS.dailyGoalHours
    });
    setUnlockedAchievements([]);
    setNewlyUnlocked(null);
    setLastAction(null);

    setHasImportedRoadmap(false);
    setShowTutorial(true);
    setTutorialStep(0);
    setSelectedSubjectId(null);

    // 3. Increment resetGeneration: triggers transactional reset render cycle.
    // The release useEffect resets isResettingRef.current to false AFTER all
    // reset render effects have completed and skipped writes.
    setResetGeneration(prev => prev + 1);

    return true;
  };

  const resetProgress = resetEverything;

  const resetSubjectProgress = (subjectId) => {
    setRoadmap(prev =>
      prev.map(subject => {
        if (subject.id !== subjectId) return subject;
        return {
          ...subject,
          phases: (subject.phases || []).map(phase => ({
            ...phase,
            tasks: (phase.tasks || []).map(task => ({
              ...task,
              completed: false,
              completedAt: null,
              subtasks: (task.subtasks || []).map(subtask => ({
                ...subtask,
                completed: false,
                completedAt: null
              }))
            }))
          }))
        };
      })
    );
  };

  // Undo functionality
  const storeCompleteAction = (subtaskId, sessionId, completionId) => {
    const action = {
      type: "COMPLETE",
      subtaskId,
      sessionId,
      completionId
    };
    lastActionRef.current = action;
    setLastAction(action);
  };

  const storeAutoAssignAction = (batchId) => {
    const action = {
      type: "AUTO_ASSIGN",
      batchId
    };
    lastActionRef.current = action;
    setLastAction(action);
  };

  const undoLastAction = () => {
    const action = lastActionRef.current || lastAction;
    if (!action) return;

    if (action.type === "COMPLETE") {
      const currentRoadmap = roadmapRef.current || roadmap;
      const nextRoadmap = currentRoadmap.map(subject => ({
        ...subject,
        phases: (subject.phases || []).map(phase => ({
          ...phase,
          tasks: (phase.tasks || []).map(task => {
            const hasTarget = (task.subtasks || []).some(s => s.id === action.subtaskId);
            if (hasTarget) {
              const updatedSubtasks = (task.subtasks || []).map(subtask => {
                if (subtask.id === action.subtaskId) {
                  return { ...subtask, completed: false, completedAt: null };
                }
                return subtask;
              });
              return {
                ...task,
                subtasks: updatedSubtasks,
                completed:
                  updatedSubtasks.length > 0 &&
                  updatedSubtasks.every(s => s.completed === true)
              };
            }
            if (task.id === action.subtaskId) {
              return {
                ...task,
                completed: false,
                completedAt: null
              };
            }
            return task;
          })
        }))
      }));

      roadmapRef.current = nextRoadmap;
      setRoadmap(nextRoadmap);

      if (action.sessionId) {
        setSessions(prev => prev.filter(session => session.id !== action.sessionId));
      }

      if (action.completionId) {
        setTaskCompletions(prev =>
          prev.filter(completion => completion.id !== action.completionId)
        );
      }
    } else if (action.type === "AUTO_ASSIGN") {
      setLearningPlan(prev => prev.filter(task => task.batchId !== action.batchId));
    }

    lastActionRef.current = null;
    setLastAction(null);
  };

  // Next subtask queries
  const getNextSubtask = () => {
    for (const subject of subjects) {
      for (const phase of subject.phases || []) {
        for (const task of phase.tasks || []) {
          for (const subtask of task.subtasks || []) {
            if (!subtask.completed) {
              return {
                id: subtask.id,
                name: subtask.name,
                subjectId: subject.id,
                subjectName: subject.name,
                phaseId: phase.id,
                phaseName: phase.name,
                taskId: task.id,
                taskName: task.name
              };
            }
          }
        }
      }
    }
    return null;
  };

  const getNextSubtaskForSubject = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return null;

    for (const phase of subject.phases || []) {
      for (const task of phase.tasks || []) {
        for (const subtask of task.subtasks || []) {
          if (!subtask.completed) {
            return {
              id: subtask.id,
              name: subtask.name,
              subjectId: subject.id,
              subjectName: subject.name,
              phaseId: phase.id,
              phaseName: phase.name,
              taskId: task.id,
              taskName: task.name
            };
          }
        }
      }
    }
    return null;
  };

  // Notes management
  const addNote = (noteData) => {
    const newNote = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...noteData
    };
    setNotes(prev => [...prev, newNote]);
  };

  const deleteNote = (noteId) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  // Tutorial helpers
  const completeTutorial = () => {
    setShowTutorial(false);
    setTutorialStep(0);
    safeStorageSet('tutorialCompleted', 'true');
  };

  const skipTutorial = () => {
    if (hasImportedRoadmap) {
      completeTutorial();
    }
  };

  const setTutorialStepNumber = (step) => {
    setTutorialStep(step);
  };

  const validateRoadmapImport = (importedData) => {
    if (!importedData) {
      return { valid: false, error: 'No data provided. Please enter JSON or JavaScript object.' };
    }

    let parsedData;
    try {
      parsedData = typeof importedData === 'string' ? JSON.parse(importedData) : importedData;
    } catch (parseError) {
      return {
        valid: false,
        error: `Invalid JSON format: ${parseError.message}\n\nPlease check:\n- Quoted strings\n- No trailing commas\n- Matched brackets\n- Proper comma separation`
      };
    }

    if (!parsedData.subjects || !Array.isArray(parsedData.subjects)) {
      return { valid: false, error: 'Missing "subjects" array. Your data should have:\n{\n  "subjects": [...]\n}' };
    }

    if (parsedData.subjects.length === 0) {
      return { valid: false, error: 'At least one subject is required. Add subjects to your data.' };
    }

    const hasValidStructure = parsedData.subjects.every(subject => {
      if (!subject.name || typeof subject.name !== 'string') return false;
      if (!subject.phases || !Array.isArray(subject.phases)) return false;

      return subject.phases.every(phase => {
        if (!phase.name || typeof phase.name !== 'string') return false;
        if (!phase.tasks || !Array.isArray(phase.tasks)) return false;

        return phase.tasks.every(task => {
          if (!task.name || typeof task.name !== 'string') return false;
          const subtasks = task.subtasks || [];
          return Array.isArray(subtasks) && subtasks.length >= 0;
        });
      });
    });

    if (!hasValidStructure) {
      return {
        valid: false,
        error:
          'Invalid structure. Each subject needs:\n- "name" (string)\n- "phases" (array)\n- Each phase needs:\n  * "name" (string)\n  * "tasks" (array)\n  * Each task needs "name" (string)\n  * Optional "subtasks" (array)'
      };
    }

    return { valid: true, error: null };
  };

  const importRoadmap = (jsonData) => {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const validation = validateRoadmapImport(data);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const processedData = data.subjects.map((subject, subjectIndex) => {
        const processedSubject = {
          ...subject,
          id: subject.id || `subject-${subjects.length + subjectIndex}`,
          phases: subject.phases?.map((phase, phaseIndex) => ({
            ...phase,
            id: phase.id || `phase-${subjects.length + subjectIndex}-${phaseIndex}`,
            tasks: phase.tasks?.map((task, taskIndex) => ({
              ...task,
              id: task.id || `task-${subjects.length + subjectIndex}-${phaseIndex}-${taskIndex}`,
              subtasks: task.subtasks?.map((subtask, subtaskIndex) => {
                const subtaskName = typeof subtask === 'string' ? subtask : (subtask.name || subtask);
                return {
                  id: typeof subtask === 'object' ? (subtask.id || `sub-${subjects.length + subjectIndex}-${phaseIndex}-${taskIndex}-${subtaskIndex}`) : `sub-${subjects.length + subjectIndex}-${phaseIndex}-${taskIndex}-${subtaskIndex}`,
                  name: subtaskName,
                  completed: (typeof subtask === 'object' ? subtask.completed : false) || false
                };
              }) || []
            })) || []
          })) || []
        };
        return processedSubject;
      });

      const existingSubjectNames = new Set(subjects.map(s => s.name.toLowerCase()));
      const newSubjects = processedData.filter(subject => !existingSubjectNames.has(subject.name.toLowerCase()));

      setRoadmap(prev => {
        const next = [...prev, ...newSubjects];
        roadmapRef.current = next;
        return next;
      });
      setHasImportedRoadmap(true);
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  };

  const deleteSubject = (subjectId) => {
    setRoadmap(prev => {
      const next = prev.filter(subject => subject.id !== subjectId);
      roadmapRef.current = next;
      return next;
    });
    setLearningPlan(prev => prev.filter(task => task.subjectId !== subjectId));
  };

  const updateSubjectDeadline = (subjectId, deadline) => {
    setRoadmap(prev => {
      const next = prev.map(subject => {
        if (subject.id !== subjectId) return subject;
        return { ...subject, deadline };
      });
      roadmapRef.current = next;
      return next;
    });
  };

  const updatePhaseDeadline = (subjectId, phaseId, deadline) => {
    setRoadmap(prev => {
      const next = prev.map(subject => {
        if (subject.id !== subjectId) return subject;
        return {
          ...subject,
          phases: subject.phases.map(phase => {
            if (phase.id !== phaseId) return phase;
            return { ...phase, deadline };
          })
        };
      });
      roadmapRef.current = next;
      return next;
    });
  };

  const scheduleSubtask = (
    subjectId,
    phaseId,
    taskId,
    subtaskId,
    scheduledDate
  ) => {
    const exists = learningPlan.some(
      entry =>
        entry.subjectId === subjectId &&
        entry.phaseId === phaseId &&
        entry.taskId === taskId &&
        entry.subtaskId === subtaskId &&
        entry.scheduledDate === scheduledDate
    );

    if (exists) {
      return;
    }

    const newEntry = {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      subjectId,
      phaseId,
      taskId,
      subtaskId,
      scheduledDate
    };

    setLearningPlan(prev => [...prev, newEntry]);
  };

  // Comprehensive stats for dashboard and statistics views
  const getStats = () => {
    const allTasks = subjects.flatMap(s => s.phases || []).flatMap(p => p.tasks || []);
    const allSubtasks = allTasks.flatMap(t => t.subtasks || []);
    const completedSubtasks = allSubtasks.filter(subtask => subtask.completed === true).length;
    const completedTasksCount = allTasks.filter(isTaskCompleted).length;

    const completionRate =
      allSubtasks.length > 0
        ? Math.round((completedSubtasks / allSubtasks.length) * 100)
        : allTasks.length > 0
          ? Math.round((completedTasksCount / allTasks.length) * 100)
          : 0;

    const dailyGoalStats = getDailyGoalStats();

    const totalFocusMinutes = sessions.reduce(
      (total, session) =>
        total + Number(session.durationMinutes || session.duration || 0),
      0
    );

    const totalFocusSessions = sessions.length;
    const totalFocusHours = Math.round((totalFocusMinutes / 60) * 10) / 10;

    return {
      totalSubjects: subjects.length,
      totalPhases: subjects.flatMap(s => s.phases || []).length,
      completedPhases: subjects.flatMap(s => s.phases || []).filter(isPhaseCompleted).length,
      totalTasks: allTasks.length,
      completedTasks: completedTasksCount,
      totalSubtasks: allSubtasks.length,
      completedSubtasks,
      completionRate,
      totalFocusMinutes,
      totalFocusHours,
      totalFocusSessions,
      dailyGoalStats
    };
  };

  const getPendingTasks = () => {
    return subjects.flatMap(s => s.phases || []).flatMap(p => p.tasks || []).filter(t => !isTaskCompleted(t));
  };

  const getTodaysTasks = () => {
    return subjects.flatMap(s => s.phases || []).flatMap(p => p.tasks || []).filter(t => !isTaskCompleted(t)).slice(0, 5);
  };

  return (
    <RoadmapContext.Provider
      value={{
        roadmap,
        setRoadmap,
        subjects,
        learningPlan,
        setLearningPlan,
        sessions,
        setSessions,
        settings,
        DEFAULT_SETTINGS,
        getNextSubtask,
        getNextSubtaskForSubject,

        // Storage error status
        storageError,
        setStorageError,

        // Canonical completion helpers
        isTaskCompleted,
        isPhaseCompleted,
        isSubjectCompleted,
        completeSubtask,
        scheduleSubtask,

        // Session tracking
        addFocusSession,
        calculateStreak,
        getTotalLearningTime,

        // Notes management
        notes,
        setNotes,
        addNote,
        deleteNote,

        // Statistics helpers
        getStats,
        getPendingTasks,
        getTodaysTasks,
        getDailyFocusMinutes,
        getDailyGoalStats,

        // Undo functionality
        lastAction,
        storeCompleteAction,
        storeAutoAssignAction,
        undoLastAction,

        // Task completion tracking
        taskCompletions,
        setTaskCompletions,
        recordTaskCompletion,

        // Settings & Reset helpers
        updateSettings,
        resetDailyProgress,
        resetEverything,
        resetProgress,
        resetSubjectProgress,

        // Achievements
        unlockedAchievements,
        setUnlockedAchievements,
        newlyUnlocked,
        clearAchievementNotification,
        ACHIEVEMENTS,

        // Theme helpers
        isDarkMode,
        toggleTheme,

        // Tutorial helpers
        showTutorial,
        tutorialStep,
        hasImportedRoadmap,
        setHasImportedRoadmap,
        completeTutorial,
        skipTutorial,
        setTutorialStepNumber,
        validateRoadmapImport,
        importRoadmap,
        deleteSubject,
        updateSubjectDeadline,
        updatePhaseDeadline,
        toggleSubtask,
        toggleSubtaskComplete,
        toggleTaskCompletion,
        toggleTaskComplete,

        // Subject selection
        selectedSubjectId,
        setSelectedSubjectId
      }}
    >
      {children}
    </RoadmapContext.Provider>
  );
};

export const useRoadmap = () => useContext(RoadmapContext);
