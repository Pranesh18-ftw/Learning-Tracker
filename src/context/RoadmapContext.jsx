import React, { createContext, useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  getLocalDateKey,
  addDaysToDateKey,
  parseLocalDateKey,
  calculateStreak as pureCalculateStreak,
  getDailyFocusMinutes as pureGetDailyFocusMinutes
} from '../utils/dateUtils';
import { ACHIEVEMENTS, evaluateAchievements } from '../services/achievementService';
import {
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
  safeStorageInspect,
  safeStorageQuarantine,
  STORAGE_STATUS,
  getQuarantinedKeys
} from '../utils/storage';
import {
  validateRoadmapShape,
  validateSessionsShape,
  validateTaskCompletionsShape,
  validateLearningPlanShape,
  validateDailyGoalsShape,
  validateSettingsShape
} from '../utils/storageValidators';
import { safeJsonParse, sanitizeUntrustedObject } from '../utils/securityUtils';
import { normalizeRoadmapInput } from '../services/roadmapBridge';
import {
  normalizeRoadmap,
  isTaskCompleted as canonicalIsTaskCompleted,
  isPhaseCompleted as canonicalIsPhaseCompleted,
  isSubjectCompleted as canonicalIsSubjectCompleted,
  getTaskProgress as canonicalGetTaskProgress,
  getPhaseProgress as canonicalGetPhaseProgress,
  getSubjectProgress as canonicalGetSubjectProgress,
  calculateOverallRoadmapStats
} from '../utils/roadmapProgressResolver';
import {
  notifyFocusStarted,
  notifyFocusEnded,
  notifyFocusCancelled,
  getTelemetryForSession
} from '../services/focusIntegrityService';
import { TELEMETRY_PROVENANCE } from '../shared/focusIntegrityProtocol';
import {
  resolveAdaptiveState,
  acceptAdaptiveRecommendation,
  rejectAdaptiveRecommendation,
  revertAdaptiveRecommendation,
  startExperiment as startAdaptiveExperiment,
  cancelActiveExperiment,
  recordSessionInExperiment,
  RECOMMENDATION_TYPES
} from '../adaptive';
import { saveHypotheses, saveRecommendations } from '../adaptive/adaptiveStorage';
import { loadIdentity } from '../utils/identityRealityResolver';
import {
  enqueueMutation,
  executeSyncCycle,
  getSyncMetadata,
  getOutboxCount,
  clearOutbox,
  migrateExistingLocalUser,
  reassignOutboxToAccount
} from '../services/syncEngine';
import {
  SYNC_ENTITY_TYPES,
  SYNC_OPERATIONS
} from '../shared/accountSyncProtocol';
import {
  getOrCreateAccount,
  linkAuthProvider,
  getRegisteredDevices,
  unlinkDevice,
  createPairingTicket,
  verifyPairingTicket,
  logoutAccount,
  deleteAccount
} from '../services/accountIdentityService';
import {
  subscribeToAuthState,
  checkRedirectResult,
  signOutUser,
  AUTH_LIFECYCLE_STATES
} from '../services/authService';

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
    if (!entry || typeof entry !== 'object') {
      continue;
    }

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

export const RoadmapProvider = ({ children, initialSubjects }) => {
  // Storage error state for truthful user notification
  const [storageError, setStorageError] = useState(null);

  // Per-key failure tracking — one successful write cannot mask another's failure
  const storageFailuresRef = useRef(new Set());

  // Reset guard ref and reset generation epoch counter
  const isResettingRef = useRef(false);
  const isFocusCommittingRef = useRef(false);
  const [resetGeneration, setResetGeneration] = useState(0);

  // Corrupted persisted data keys that were safely quarantined to prevent silent overwrite
  const [corruptedDataKeys, setCorruptedDataKeys] = useState(() => getQuarantinedKeys());
  const corruptedKeysRef = useRef(new Set(corruptedDataKeys));

  const dismissCorruptedNotice = (key) => {
    if (!key) {
      corruptedKeysRef.current.clear();
      setCorruptedDataKeys([]);
    } else {
      corruptedKeysRef.current.delete(key);
      setCorruptedDataKeys(prev => prev.filter(k => k !== key));
    }
  };

  // Canonical User Identity & Account state
  const [account, setAccount] = useState(() => getOrCreateAccount());
  const [registeredDevices, setRegisteredDevices] = useState(() => getRegisteredDevices());

  // Sync state
  const [syncMetadata, setSyncMetadata] = useState(() => getSyncMetadata());
  const [outboxCount, setOutboxCount] = useState(() => getOutboxCount());

  // Auth lifecycle state: 'AUTH_INITIALIZING' | 'AUTHENTICATED' | 'SIGNED_OUT'
  const [authLifecycle, setAuthLifecycle] = useState(AUTH_LIFECYCLE_STATES.INITIALIZING);

  // Canonical Firebase Auth State Listener (preserves real auth across page refreshes and resolves startup identity safely)
  useEffect(() => {
    checkRedirectResult().catch(err => console.warn('Redirect auth check warning:', err));
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (firebaseUser) {
        // Authenticated with Google via Firebase
        const updated = linkAuthProvider({
          provider: 'google',
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          externalId: firebaseUser.uid,
          uid: firebaseUser.uid,
          accountId: firebaseUser.id
        });
        setAccount(updated);
        setAuthLifecycle(AUTH_LIFECYCLE_STATES.AUTHENTICATED);

        // Migrate local-first learner data and ensure outbox mutations are tagged with verified account ID
        migrateExistingLocalUser();
        reassignOutboxToAccount(firebaseUser.id);
        setOutboxCount(getOutboxCount());
        setSyncMetadata(getSyncMetadata());
      } else {
        // Firebase reports signed out / anonymous local learner
        setAuthLifecycle(AUTH_LIFECYCLE_STATES.SIGNED_OUT);
        const currentAccount = getOrCreateAccount();
        if (currentAccount.authProvider === 'google') {
          // Firebase reports signed-out but local storage retained a stale google link
          const fresh = logoutAccount();
          setAccount(fresh);
        } else {
          setAccount(currentAccount);
        }

        // Migrate local-first learner data under the local anonymous account
        migrateExistingLocalUser();
        setOutboxCount(getOutboxCount());
        setSyncMetadata(getSyncMetadata());
      }
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Listen for decoupled identity changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleIdentityUpdated = (e) => {
      if (e.detail) {
        enqueueMutation({
          entityType: SYNC_ENTITY_TYPES.USER_IDENTITY,
          operation: SYNC_OPERATIONS.UPDATE_STATE,
          payload: { ...e.detail, version: Date.now() }
        });
        setOutboxCount(getOutboxCount());
      }
    };
    window.addEventListener('learningTracker_identity_updated', handleIdentityUpdated);
    return () => window.removeEventListener('learningTracker_identity_updated', handleIdentityUpdated);
  }, []);

  // Persistence handler with quota error catching (per-key tracking)
  const persistState = (key, value) => {
    // Skip writes if we're in a reset cycle
    if (isResettingRef.current) return true;
    // Skip initial write if this key was quarantined as malformed on boot
    if (corruptedKeysRef.current.has(key)) return true;

    const result = safeStorageSet(key, value);
    if (!result.ok) {
      storageFailuresRef.current.add(key);
      setStorageError(
        result.status === STORAGE_STATUS.QUOTA_EXCEEDED || result.error === 'quota'
          ? 'Your browser storage is full. Export or clear old tracker data before continuing.'
          : `Storage write failed for ${key}. Changes may only exist in memory.`
      );
      return false;
    }
    storageFailuresRef.current.delete(key);
    if (storageFailuresRef.current.size === 0) {
      setStorageError(null);
    }
    return true;
  };

  // Safely loads a domain array key, checking for corruption, quarantining malformed data,
  // and migrating legacy keys only when canonical is empty or missing.
  const loadDomainArrayKey = (canonicalKey, legacyKey, validator, normalizer = (x) => x) => {
    const inspectedCanonical = safeStorageInspect(canonicalKey);
    let canonicalData = null;

    if (inspectedCanonical.status === STORAGE_STATUS.MALFORMED) {
      safeStorageQuarantine(canonicalKey, inspectedCanonical.raw, inspectedCanonical.error);
      corruptedKeysRef.current.add(canonicalKey);
      setCorruptedDataKeys(prev => Array.from(new Set([...prev, canonicalKey])));
    } else if (inspectedCanonical.status === STORAGE_STATUS.SUCCESS) {
      const validated = validator(inspectedCanonical.data);
      if (validated.valid) {
        canonicalData = validated.data;
      } else if (!validated.isEmpty) {
        safeStorageQuarantine(canonicalKey, inspectedCanonical.raw, new Error(validated.reason));
        corruptedKeysRef.current.add(canonicalKey);
        setCorruptedDataKeys(prev => Array.from(new Set([...prev, canonicalKey])));
      }
    }

    const inspectedLegacy = legacyKey ? safeStorageInspect(legacyKey) : { status: STORAGE_STATUS.MISSING };
    let legacyData = null;

    if (inspectedLegacy.status === STORAGE_STATUS.MALFORMED) {
      safeStorageQuarantine(legacyKey, inspectedLegacy.raw, inspectedLegacy.error);
      corruptedKeysRef.current.add(legacyKey);
      setCorruptedDataKeys(prev => Array.from(new Set([...prev, legacyKey])));
    } else if (inspectedLegacy.status === STORAGE_STATUS.SUCCESS) {
      const validatedLegacy = validator(inspectedLegacy.data);
      if (validatedLegacy.valid) {
        legacyData = validatedLegacy.data;
      }
    }

    // Invariant: If canonical has items, use canonical and safely clean up legacy
    if (Array.isArray(canonicalData) && canonicalData.length > 0) {
      if (legacyKey && inspectedLegacy.status !== STORAGE_STATUS.MISSING) {
        safeStorageRemove(legacyKey);
      }
      return normalizer(canonicalData);
    }

    // Invariant: If canonical is empty/missing, but legacy has items, migrate legacy to canonical
    if (Array.isArray(legacyData) && legacyData.length > 0) {
      const normalizedLegacy = normalizer(legacyData);
      const res = safeStorageSet(canonicalKey, normalizedLegacy);
      if (res.ok && legacyKey) {
        safeStorageRemove(legacyKey);
      }
      return normalizedLegacy;
    }

    // Invariant: If canonical was an explicitly valid empty array [], use it
    if (Array.isArray(canonicalData)) {
      if (legacyKey && inspectedLegacy.status !== STORAGE_STATUS.MISSING) {
        safeStorageRemove(legacyKey);
      }
      return normalizer(canonicalData);
    }

    return normalizer([]);
  };

  // Roadmap data with persistence + legacy migration
  const [roadmap, setRoadmap] = useState(() => {
    if (Array.isArray(initialSubjects)) {
      return normalizeRoadmap(initialSubjects);
    }
    return loadDomainArrayKey("roadmap", "learningTracker_roadmap", validateRoadmapShape, normalizeRoadmap);
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
    return loadDomainArrayKey(TASK_COMPLETIONS_STORAGE_KEY, "taskCompletions", validateTaskCompletionsShape);
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
        difficulty: dataOrTaskId.difficulty || null,
        explainWithoutNotes: dataOrTaskId.explainWithoutNotes || null
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
    try {
      enqueueMutation({
        entityType: SYNC_ENTITY_TYPES.TASK_COMPLETION,
        operation: SYNC_OPERATIONS.APPEND_EVENT,
        eventId: record.id,
        payload: record
      });
      setOutboxCount(getOutboxCount());
    } catch (e) {
      // Failsafe: local state remains fully functional
    }
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

  // Global Canonical Learning Context (Unification Pass #12 & #13)
  const [currentLearningContext, setCurrentLearningContext] = useState(() => {
    return safeStorageGet('learningTracker_currentLearningContext', null);
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    if (currentLearningContext) {
      persistState('learningTracker_currentLearningContext', currentLearningContext);
    } else {
      safeStorageRemove('learningTracker_currentLearningContext');
    }
  }, [currentLearningContext, resetGeneration]);

  const selectLearningContext = (ctx) => {
    if (!ctx) {
      setCurrentLearningContext(null);
      return;
    }
    setCurrentLearningContext(ctx);
    if (ctx.subjectId && ctx.subjectId !== selectedSubjectId) {
      setSelectedSubjectId(ctx.subjectId);
    }
  };

  // Settings state with migration and persistence
  const [settings, setSettings] = useState(() => {
    const inspected = safeStorageInspect(SETTINGS_STORAGE_KEY);
    let canonical = null;
    if (inspected.status === STORAGE_STATUS.MALFORMED) {
      safeStorageQuarantine(SETTINGS_STORAGE_KEY, inspected.raw, inspected.error);
      corruptedKeysRef.current.add(SETTINGS_STORAGE_KEY);
      setCorruptedDataKeys(prev => Array.from(new Set([...prev, SETTINGS_STORAGE_KEY])));
    } else if (inspected.status === STORAGE_STATUS.SUCCESS) {
      const validated = validateSettingsShape(inspected.data);
      if (validated.valid) {
        canonical = migrateSettings(validated.data);
      }
    }

    const legacyInspected = safeStorageInspect('settings');
    let legacy = null;
    if (legacyInspected.status === STORAGE_STATUS.SUCCESS) {
      const validated = validateSettingsShape(legacyInspected.data);
      if (validated.valid) {
        legacy = migrateSettings(validated.data);
      }
    }

    if (canonical) {
      if (legacyInspected.status !== STORAGE_STATUS.MISSING) {
        safeStorageRemove('settings');
      }
      return canonical;
    }
    if (legacy) {
      const res = safeStorageSet(SETTINGS_STORAGE_KEY, legacy);
      if (res.ok) {
        safeStorageRemove('settings');
      }
      return legacy;
    }
    return { ...DEFAULT_SETTINGS };
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState(SETTINGS_STORAGE_KEY, settings);
  }, [settings, resetGeneration]);

  const updateSettings = useCallback((newSettings) => {
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

      try {
        enqueueMutation({
          entityType: SYNC_ENTITY_TYPES.USER_SETTINGS,
          operation: SYNC_OPERATIONS.UPDATE_STATE,
          payload: { ...merged, version: Date.now() }
        });
        setOutboxCount(getOutboxCount());
      } catch (e) {
        // Failsafe
      }

      return merged;
    });
  }, []);

  // Daily goals tracking state
  const [dailyGoals, setDailyGoals] = useState(() => {
    const inspected = safeStorageInspect('dailyGoals');
    let canonical = null;
    if (inspected.status === STORAGE_STATUS.MALFORMED) {
      safeStorageQuarantine('dailyGoals', inspected.raw, inspected.error);
      corruptedKeysRef.current.add('dailyGoals');
      setCorruptedDataKeys(prev => Array.from(new Set([...prev, 'dailyGoals'])));
    } else if (inspected.status === STORAGE_STATUS.SUCCESS) {
      const validated = validateDailyGoalsShape(inspected.data);
      if (validated.valid) {
        canonical = validated.data;
      }
    }

    const legacyInspected = safeStorageInspect('learningTracker_dailyGoals');
    let legacy = null;
    if (legacyInspected.status === STORAGE_STATUS.SUCCESS) {
      const validated = validateDailyGoalsShape(legacyInspected.data);
      if (validated.valid) {
        legacy = validated.data;
      }
    }

    if (canonical && Object.keys(canonical).length > 0) {
      if (legacyInspected.status !== STORAGE_STATUS.MISSING) {
        safeStorageRemove('learningTracker_dailyGoals');
      }
      return canonical;
    }
    if (legacy && Object.keys(legacy).length > 0) {
      const res = safeStorageSet('dailyGoals', legacy);
      if (res.ok) {
        safeStorageRemove('learningTracker_dailyGoals');
      }
      return legacy;
    }
    if (canonical) {
      if (legacyInspected.status !== STORAGE_STATUS.MISSING) {
        safeStorageRemove('learningTracker_dailyGoals');
      }
      return canonical;
    }
    return {};
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState('dailyGoals', dailyGoals);
  }, [dailyGoals, resetGeneration]);

  // Sessions data with persistence
  const [sessions, setSessions] = useState(() => {
    return loadDomainArrayKey("sessions", "learningTracker_sessions", validateSessionsShape);
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState("sessions", sessions);
  }, [sessions, resetGeneration]);

  // Learning plan data with persistence
  const [learningPlan, setLearningPlan] = useState(() => {
    return loadDomainArrayKey("learningPlan", "learningTracker_learningPlan", validateLearningPlanShape);
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
    return loadDomainArrayKey("notes", "learningTracker_notes", (data) => ({
      valid: Array.isArray(data),
      isEmpty: Array.isArray(data) && data.length === 0,
      data: Array.isArray(data) ? data : [],
      reason: Array.isArray(data) ? null : 'NOT_AN_ARRAY'
    }));
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    persistState("notes", notes);
  }, [notes, resetGeneration]);

  // Achievements state with persistence
  const [unlockedAchievements, setUnlockedAchievements] = useState(() => {
    return loadDomainArrayKey(ACHIEVEMENTS_STORAGE_KEY, "achievements", (data) => ({
      valid: Array.isArray(data),
      isEmpty: Array.isArray(data) && data.length === 0,
      data: Array.isArray(data) ? data : [],
      reason: Array.isArray(data) ? null : 'NOT_AN_ARRAY'
    }));
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

  // Canonical Focus Session state with wall-clock persistence and validation guard
  const [focusSession, setFocusSession] = useState(() => {
    const saved = safeStorageGet('currentFocusSession', null);
    if (!saved || typeof saved !== 'object') return null;
    if ((!saved.id && !saved.sessionId) || !saved.task || typeof saved.task !== 'object') {
      safeStorageRemove('currentFocusSession');
      return null;
    }
    const validStatuses = ['ready', 'running', 'paused', 'reflection'];
    if (!validStatuses.includes(saved.status)) {
      safeStorageRemove('currentFocusSession');
      return null;
    }
    return saved;
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    if (focusSession) {
      safeStorageSet('currentFocusSession', focusSession);
    } else {
      safeStorageRemove('currentFocusSession');
    }
  }, [focusSession, resetGeneration]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      const { key, newValue } = e;
      if (isResettingRef.current) return;

      try {
        if (newValue === null) {
          if (key === 'roadmap' || key === 'learningTracker_roadmap') {
            setRoadmap([]);
          } else if (key === 'learningPlan' || key === 'learningTracker_learningPlan') {
            setLearningPlan([]);
          } else if (key === 'sessions' || key === 'learningTracker_sessions') {
            setSessions([]);
          } else if (key === TASK_COMPLETIONS_STORAGE_KEY || key === 'taskCompletions') {
            setTaskCompletions([]);
          } else if (key === 'dailyGoals' || key === 'learningTracker_dailyGoals') {
            setDailyGoals({});
          } else if (key === 'notes' || key === 'learningTracker_notes') {
            setNotes([]);
          } else if (key === 'currentFocusSession') {
            setFocusSession(null);
          }
          return;
        }

        const parsed = JSON.parse(newValue);
        if (key === 'roadmap' || key === 'learningTracker_roadmap') {
          setRoadmap(normalizeRoadmap(Array.isArray(parsed) ? parsed : []));
        } else if (key === 'learningPlan' || key === 'learningTracker_learningPlan') {
          setLearningPlan(Array.isArray(parsed) ? parsed : []);
        } else if (key === 'sessions' || key === 'learningTracker_sessions') {
          setSessions(Array.isArray(parsed) ? parsed : []);
        } else if (key === TASK_COMPLETIONS_STORAGE_KEY || key === 'taskCompletions') {
          setTaskCompletions(Array.isArray(parsed) ? parsed : []);
        } else if (key === 'dailyGoals' || key === 'learningTracker_dailyGoals') {
          setDailyGoals(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
        } else if (key === 'notes' || key === 'learningTracker_notes') {
          setNotes(Array.isArray(parsed) ? parsed : []);
        } else if (key === SETTINGS_STORAGE_KEY || key === 'settings') {
          setSettings(migrateSettings(parsed));
        } else if (key === ACHIEVEMENTS_STORAGE_KEY || key === 'achievements') {
          setUnlockedAchievements(Array.isArray(parsed) ? parsed : []);
        } else if (key === 'theme') {
          setIsDarkMode(newValue === 'dark');
        } else if (key === 'currentFocusSession') {
          if (parsed && typeof parsed === 'object' && (parsed.id || parsed.sessionId) && parsed.task) {
            setFocusSession(parsed);
          } else {
            setFocusSession(null);
          }
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
      startedAt,
      endedAt = new Date(),
      type = 'focus',
      notes = '',
      difficulty = null,
      explainWithoutNotes = null,
      companionTelemetry = null
    } = sessionData;

    const normalizedDuration = Math.max(
      0,
      Number(durationMinutes || duration) || 0
    );

    const sessionDateKey = sessionData.date
      ? getLocalDateKey(sessionData.date)
      : null;

    const start = startedAt
      ? (startedAt instanceof Date ? startedAt : new Date(startedAt))
      : (sessionDateKey ? (parseLocalDateKey(sessionDateKey) || new Date()) : new Date());

    const validStart = !isNaN(start.getTime()) ? start : new Date();

    const end =
      endedAt instanceof Date && !isNaN(endedAt.getTime())
        ? endedAt
        : (endedAt && !isNaN(new Date(endedAt).getTime())
            ? new Date(endedAt)
            : new Date(validStart.getTime() + normalizedDuration * 60000));

    const resolvedDate = sessionDateKey || getLocalDateKey(validStart);
    const canonicalId = sessionData.id || sessionData.sessionId || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const session = {
      id: canonicalId,
      sessionId: canonicalId,
      subjectId,
      phaseId,
      taskId,
      subtaskId,
      startedAt: validStart.toISOString(),
      endedAt: end.toISOString(),
      durationMinutes: normalizedDuration,
      // LOCAL calendar day bucket
      date: resolvedDate,
      type,
      notes,
      difficulty,
      explainWithoutNotes,
      companionTelemetry: companionTelemetry || null
    };

    setSessions(prev => {
      const exists = prev.some(s => s.id === canonicalId || (s.sessionId && s.sessionId === canonicalId));
      if (exists) {
        return prev.map(s => (s.id === canonicalId || (s.sessionId && s.sessionId === canonicalId) ? { ...s, ...session } : s));
      }
      return [...prev, session];
    });
    try {
      enqueueMutation({
        entityType: SYNC_ENTITY_TYPES.FOCUS_SESSION,
        operation: SYNC_OPERATIONS.APPEND_EVENT,
        eventId: session.id,
        payload: session
      });
      setOutboxCount(getOutboxCount());
    } catch (e) {
      // Failsafe
    }
    return session;
  };

  // ============================================================
  // P1.5 & P1.6 — STREAK CALCULATION (Ignoring zero-minute sessions)
  // ============================================================
  const calculateStreak = (sessionsList = sessions, todayKey = getLocalDateKey()) => {
    return pureCalculateStreak(sessionsList, todayKey);
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
    return pureGetDailyFocusMinutes(sessionsList, dateKey);
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
      const targetDate = addDaysToDateKey(dateKey, -i);
      const dayData = dailyGoals[targetDate];
      const dayMinutes = getDailyFocusMinutes(sessionsList, targetDate);
      const targetM = dayData?.targetMinutes ?? goalMinutes;
      const isAchieved = targetM > 0 && dayMinutes >= targetM;
      last7Days.push({
        date: targetDate,
        achieved: dayData?.achieved ?? isAchieved,
        actualMinutes: dayData?.actualMinutes ?? dayMinutes,
        targetMinutes: targetM
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

  // Keep ref to always have latest unlocked achievements without stale closures
  const unlockedAchievementsRef = useRef(unlockedAchievements);
  useEffect(() => {
    unlockedAchievementsRef.current = unlockedAchievements;
  }, [unlockedAchievements]);

  const isInitialMountRef = useRef(true);

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
      existingAchievements: unlockedAchievementsRef.current
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

      // INVARIANT: On initial mount/rehydration, silently record earned achievements
      // without firing UI notification pop-ups for historical actions.
      if (!isInitialMountRef.current) {
        const newAchievements = newlyUnlockedIds
          .map(id => ACHIEVEMENTS.find(a => a.id === id))
          .filter(Boolean);
        if (newAchievements.length > 0) {
          setNewlyUnlocked(prev => {
            if (!prev) return newAchievements.length === 1 ? newAchievements[0] : newAchievements;
            const currentList = Array.isArray(prev) ? prev : [prev];
            return [...currentList, ...newAchievements];
          });
        }
      }
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
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
  // CANONICAL COMPLETION ENGINE (P1.2 Authoritative Invariants)
  // ============================================================
  const isTaskCompleted = (taskOrId) => {
    if (!taskOrId) return false;
    if (typeof taskOrId === 'string') {
      const currentRoadmap = roadmapRef.current || roadmap;
      for (const s of currentRoadmap) {
        for (const p of s.phases || []) {
          for (const t of p.tasks || []) {
            if (t.id === taskOrId) return canonicalIsTaskCompleted(t);
          }
        }
      }
      return false;
    }
    if (taskOrId.id && taskOrId.completed === undefined && (!taskOrId.subtasks || taskOrId.subtasks.length === 0)) {
      const currentRoadmap = roadmapRef.current || roadmap;
      for (const s of currentRoadmap) {
        for (const p of s.phases || []) {
          for (const t of p.tasks || []) {
            if (t.id === taskOrId.id) return canonicalIsTaskCompleted(t);
          }
        }
      }
    }
    return canonicalIsTaskCompleted(taskOrId);
  };
  const isPhaseCompleted = canonicalIsPhaseCompleted;
  const isSubjectCompleted = canonicalIsSubjectCompleted;

  // Toggle subtask with completedAt timestamp and history recording
  const toggleSubtask = (subjectId, phaseId, taskId, subtaskId) => {
    const currentRoadmap = roadmapRef.current || roadmap;
    const subject = currentRoadmap.find(s => s.id === subjectId);
    const phase = subject?.phases?.find(p => p.id === phaseId);
    const task = phase?.tasks?.find(t => t.id === taskId);
    const subtask = task?.subtasks?.find(
      st => st.id === subtaskId || (subtaskId && st.name === subtaskId)
    );

    if (!subtask) return null;

    const actualSubtaskId = subtask.id || subtaskId;
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
                if (
                  st.id === subtaskId ||
                  st.id === actualSubtaskId ||
                  (subtaskId && st.name === subtaskId)
                ) {
                  return {
                    ...st,
                    completed: nextCompleted,
                    completedAt: nextCompleted ? nowIso : null
                  };
                }
                return st;
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
        subtaskId: actualSubtaskId,
        completedAt: nowIso
      });

      // Synchronize Learning Plan: remove any scheduled entry for this subtask and preserve for undo
      const lpEntry = (learningPlan || []).find(
        entry => entry.subtaskId === actualSubtaskId ||
                 (entry.taskId === taskId && (!entry.subtaskId || entry.subtaskId === actualSubtaskId))
      );
      if (lpEntry) {
        setLearningPlan(prev => (prev || []).filter(e => e.id !== lpEntry.id));
      }

      storeCompleteAction(actualSubtaskId, null, completionRecord?.id, {
        subjectId,
        phaseId,
        taskId,
        subtaskId: actualSubtaskId,
        learningPlanEntry: lpEntry || null,
        taskDetails: {
          id: actualSubtaskId,
          subtaskId: actualSubtaskId,
          name: subtask.name,
          taskId: task.id,
          taskName: task.name,
          subjectId: subject.id,
          subjectName: subject.name,
          phaseId: phase.id,
          phaseName: phase.name
        }
      });
    } else {
      // Revert completion history for this subtask (most recent entry)
      setTaskCompletions(prev => {
        const idx = [...prev].reverse().findIndex(
          c =>
            (c.subtaskId &&
              (c.subtaskId === subtaskId ||
                c.subtaskId === actualSubtaskId ||
                c.subtaskId === subtask.name)) ||
            (c.taskId === taskId && !c.subtaskId)
        );
        if (idx !== -1) {
          const actualIdx = prev.length - 1 - idx;
          return prev.filter((_, i) => i !== actualIdx);
        }
        return prev;
      });
      if (
        lastAction?.subtaskId === subtaskId ||
        lastAction?.subtaskId === actualSubtaskId ||
        lastAction?.subtaskId === subtask.name
      ) {
        lastActionRef.current = null;
        setLastAction(null);
      }
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
    difficulty = null,
    explainWithoutNotes = null
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
    const subtask = task?.subtasks?.find(
      st => st.id === subtaskId || (subtaskId && st.name === subtaskId)
    );

    if (!subtask) {
      return null;
    }

    const actualSubtaskId = subtask.id || subtaskId;

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
                if (
                  st.id === subtaskId ||
                  st.id === actualSubtaskId ||
                  (subtaskId && st.name === subtaskId)
                ) {
                  return {
                    ...st,
                    completed: true,
                    completedAt: nowIso
                  };
                }
                return st;
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
      subtaskId: actualSubtaskId,
      completedAt: nowIso,
      durationMinutes,
      notes,
      difficulty,
      explainWithoutNotes
    });

    // Synchronize Learning Plan: remove matching scheduled entry and store for undo
    const lpEntry = (learningPlan || []).find(
      entry => entry.subtaskId === actualSubtaskId ||
               (entry.taskId === taskId && (!entry.subtaskId || entry.subtaskId === actualSubtaskId))
    );
    if (lpEntry) {
      setLearningPlan(prev => (prev || []).filter(e => e.id !== lpEntry.id));
    }

    storeCompleteAction(actualSubtaskId, null, completionRecord?.id, {
      subjectId,
      phaseId,
      taskId,
      subtaskId: actualSubtaskId,
      learningPlanEntry: lpEntry || null,
      taskDetails: {
        id: actualSubtaskId,
        subtaskId: actualSubtaskId,
        name: subtask.name,
        taskId: task.id,
        taskName: task.name,
        subjectId: subject.id,
        subjectName: subject.name,
        phaseId: phase.id,
        phaseName: phase.name
      }
    });

    return completionRecord;
  };

  const completeTask = ({
    subjectId,
    phaseId,
    taskId,
    durationMinutes = 0,
    notes = '',
    difficulty = null,
    explainWithoutNotes = null
  }) => {
    if (!subjectId || !phaseId || !taskId) {
      console.error('completeTask: missing identity', {
        subjectId,
        phaseId,
        taskId
      });
      return null;
    }

    const currentRoadmap = roadmapRef.current || roadmap;
    const subject = currentRoadmap.find(s => s.id === subjectId);
    const phase = subject?.phases?.find(p => p.id === phaseId);
    const task = phase?.tasks?.find(t => t.id === taskId);

    if (!task) {
      return null;
    }

    const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
    const isAlreadyCompleted = hasSubtasks
      ? task.subtasks.every(st => st.completed === true)
      : task.completed === true;

    // Idempotency: if already completed, do NOT record duplicate completion event
    if (isAlreadyCompleted) {
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

              if (hasSubtasks) {
                const updatedSubtasks = (t.subtasks || []).map(st => ({
                  ...st,
                  completed: true,
                  completedAt: st.completed ? (st.completedAt || nowIso) : nowIso
                }));
                return {
                  ...t,
                  subtasks: updatedSubtasks,
                  completed: true,
                  completedAt: t.completedAt || nowIso
                };
              }

              return {
                ...t,
                completed: true,
                completedAt: nowIso
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
      subtaskId: null,
      completedAt: nowIso,
      durationMinutes,
      notes,
      difficulty,
      explainWithoutNotes
    });

    // Synchronize Learning Plan: remove any scheduled entries for this task or its subtasks
    const matchingLpEntries = (learningPlan || []).filter(
      entry => entry.taskId === taskId
    );
    const primaryLpEntry = matchingLpEntries[0] || null;
    if (matchingLpEntries.length > 0) {
      const idsToRemove = new Set(matchingLpEntries.map(e => e.id));
      setLearningPlan(prev => (prev || []).filter(e => !idsToRemove.has(e.id)));
    }

    storeCompleteAction(taskId, null, completionRecord?.id, {
      subjectId,
      phaseId,
      taskId,
      subtaskId: null,
      learningPlanEntry: primaryLpEntry,
      taskDetails: {
        id: task.id,
        taskId: task.id,
        subtaskId: null,
        name: task.name,
        subjectId: subject.id,
        subjectName: subject.name,
        phaseId: phase.id,
        phaseName: phase.name
      }
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

      // Synchronize Learning Plan: remove any scheduled entries for this task or its subtasks
      const matchingLpEntries = (learningPlan || []).filter(
        entry => entry.taskId === taskId
      );
      const primaryLpEntry = matchingLpEntries[0] || null;
      if (matchingLpEntries.length > 0) {
        const idsToRemove = new Set(matchingLpEntries.map(e => e.id));
        setLearningPlan(prev => (prev || []).filter(e => !idsToRemove.has(e.id)));
      }

      storeCompleteAction(taskId, null, completedRecord?.id, {
        subjectId,
        phaseId,
        taskId,
        subtaskId: null,
        learningPlanEntry: primaryLpEntry,
        taskDetails: {
          id: task.id,
          taskId: task.id,
          subtaskId: null,
          name: task.name,
          subjectId: subject.id,
          subjectName: subject.name,
          phaseId: phase.id,
          phaseName: phase.name
        }
      });
    } else {
      // Revert completion history for this task (most recent entry only)
      setTaskCompletions(prev => {
        const idx = [...prev].reverse().findIndex(c => c.taskId === taskId && !c.subtaskId);
        if (idx !== -1) {
          const actualIdx = prev.length - 1 - idx;
          return prev.filter((_, i) => i !== actualIdx);
        }
        return prev;
      });
      if (lastAction?.subtaskId === taskId || lastAction?.taskId === taskId) {
        lastActionRef.current = null;
        setLastAction(null);
      }
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
        const sDate = session.date
          ? getLocalDateKey(session.date)
          : (session.startedAt
              ? getLocalDateKey(session.startedAt)
              : (session.timestamp
                  ? getLocalDateKey(session.timestamp)
                  : (session.completedAt ? getLocalDateKey(session.completedAt) : null)));
        return sDate !== today;
      })
    );

    // Remove today's completion events.
    setTaskCompletions(prev =>
      prev.filter(completion => {
        const cDate = completion.date
          ? getLocalDateKey(completion.date)
          : (completion.completedAt
              ? getLocalDateKey(completion.completedAt)
              : (completion.timestamp ? getLocalDateKey(completion.timestamp) : null));
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
      'selectedSubjectId',
      'currentFocusSession',
      'learningTracker_currentLearningContext',
      'pinnedArchiveArtifactIds',
      'archiveAnnotations',
      'learningTracker_adaptiveHypotheses',
      'learningTracker_adaptiveRecommendations',
      'learningTracker_adaptiveRejections',
      'learningTracker_adaptiveExperiments',
      'learningTracker_adaptiveAcceptedActions'
    ];

    keysToRemove.forEach(key => {
      safeStorageRemove(key);
    });

    storageFailuresRef.current.clear();
    corruptedKeysRef.current.clear();
    setCorruptedDataKeys([]);
    setStorageError(null);

    // 2. Reset React state.
    roadmapRef.current = [];
    setRoadmap([]);
    setSessions([]);
    setLearningPlan([]);
    setTaskCompletions([]);
    setDailyGoals({});
    setNotes([]);
    setFocusSession(null);
    setCurrentLearningContext(null);
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

    // 3. Clear sync outbox
    clearOutbox();
    setOutboxCount(0);

    // 4. Increment resetGeneration: triggers transactional reset render cycle.
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
  const storeCompleteAction = (subtaskId, sessionId, completionId, extra = {}) => {
    const action = {
      type: "COMPLETE",
      subtaskId,
      sessionId,
      completionId,
      ...extra
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
      const targetSubtaskId =
        action.subtaskId ||
        action.taskDetails?.subtaskId ||
        (action.taskDetails?.taskId && action.taskDetails?.id !== action.taskDetails?.taskId
          ? action.taskDetails?.id
          : null);
      const targetTaskId =
        action.taskId ||
        action.taskDetails?.taskId ||
        (!targetSubtaskId ? action.subtaskId : null);
      const targetSubtaskName =
        action.taskDetails?.name || (typeof action.subtaskId === 'string' ? action.subtaskId : null);

      const nextRoadmap = currentRoadmap.map(subject => ({
        ...subject,
        phases: (subject.phases || []).map(phase => ({
          ...phase,
          tasks: (phase.tasks || []).map(task => {
            const hasSubtaskMatch = (task.subtasks || []).some(s =>
              Boolean(
                (targetSubtaskId && (s.id === targetSubtaskId || s.name === targetSubtaskId)) ||
                (targetSubtaskName && s.name === targetSubtaskName)
              )
            );

            if (hasSubtaskMatch) {
              const updatedSubtasks = (task.subtasks || []).map(subtask => {
                if (
                  (targetSubtaskId && (subtask.id === targetSubtaskId || subtask.name === targetSubtaskId)) ||
                  (targetSubtaskName && subtask.name === targetSubtaskName)
                ) {
                  return { ...subtask, completed: false, completedAt: null };
                }
                return subtask;
              });
              const allDone =
                updatedSubtasks.length > 0 &&
                updatedSubtasks.every(s => s.completed === true);
              return {
                ...task,
                subtasks: updatedSubtasks,
                completed: allDone,
                completedAt: allDone ? task.completedAt : null
              };
            }

            if (
              (targetTaskId && (task.id === targetTaskId || task.name === targetTaskId)) ||
              (action.subtaskId && (task.id === action.subtaskId || task.name === action.subtaskId))
            ) {
              const updatedSubtasks = (task.subtasks || []).map(subtask => ({
                ...subtask,
                completed: false,
                completedAt: null
              }));
              return {
                ...task,
                completed: false,
                completedAt: null,
                subtasks: updatedSubtasks
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
      } else if (targetSubtaskId || targetTaskId) {
        setSessions(prev => {
          const idx = [...prev].reverse().findIndex(
            s =>
              (targetSubtaskId && (s.subtaskId === targetSubtaskId || s.subtaskId === targetSubtaskName)) ||
              (targetTaskId && s.taskId === targetTaskId)
          );
          if (idx !== -1) {
            const actualIdx = prev.length - 1 - idx;
            return prev.filter((_, i) => i !== actualIdx);
          }
          return prev;
        });
      }

      if (action.completionId) {
        setTaskCompletions(prev =>
          prev.filter(completion => completion.id !== action.completionId)
        );
      } else if (targetSubtaskId || targetTaskId) {
        setTaskCompletions(prev => {
          const idx = [...prev].reverse().findIndex(
            c =>
              (targetSubtaskId && (c.subtaskId === targetSubtaskId || c.subtaskId === targetSubtaskName)) ||
              (targetTaskId && c.taskId === targetTaskId)
          );
          if (idx !== -1) {
            const actualIdx = prev.length - 1 - idx;
            return prev.filter((_, i) => i !== actualIdx);
          }
          return prev;
        });
      }

      if (action.learningPlanEntry) {
        setLearningPlan(prev => {
          const exists = (prev || []).some(e => e.id === action.learningPlanEntry.id);
          return exists ? prev : [...(prev || []), action.learningPlanEntry];
        });
      }

      // Enqueue revocation tombstone for sync propagation
      try {
        const targetEventId = action.completionId || action.sessionId || targetSubtaskId || targetTaskId;
        if (targetEventId) {
          enqueueMutation({
            entityType: SYNC_ENTITY_TYPES.UNDO_REVOCATION,
            operation: SYNC_OPERATIONS.REVOKE_EVENT,
            payload: {
              targetEventId,
              reason: 'user_undo'
            }
          });
          setOutboxCount(getOutboxCount());
        }
      } catch (e) {
        // Failsafe
      }
    } else if (action.type === "AUTO_ASSIGN") {
      setLearningPlan(prev => prev.filter(task => task.batchId !== action.batchId));
    }

    lastActionRef.current = null;
    setLastAction(null);
  };

  const clearLastAction = () => {
    lastActionRef.current = null;
    setLastAction(null);
  };

  // Next subtask queries
  const getNextSubtask = () => {
    for (const subject of subjects) {
      for (const phase of subject.phases || []) {
        for (const task of phase.tasks || []) {
          if (task.subtasks && task.subtasks.length > 0) {
            for (const subtask of task.subtasks) {
              if (!subtask.completed) {
                return {
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
                  learningUnits: task.learningUnits || [],
                  doingTasks: task.doingTasks || [],
                  whyItMatters: task.whyItMatters || null,
                  depth: task.depth || null,
                  practicalFailureModes: task.practicalFailureModes || [],
                  highLeverageConcepts: task.highLeverageConcepts || [],
                  consequences: task.consequences || [],
                  evidenceExpected: task.evidenceExpected || null,
                  learningMode: task.learningMode || null,
                  adaptationRules: subject.adaptationRules || []
                };
              }
            }
          } else if (!task.completed) {
            return {
              id: task.id,
              subtaskId: null,
              name: task.name,
              subjectId: subject.id,
              subjectName: subject.name,
              phaseId: phase.id,
              phaseName: phase.name,
              taskId: task.id,
              taskName: task.name,
              conceptId: task.conceptId || null,
              visualId: task.visualId || null,
              learningVisual: task.learningVisual || null,
              learningUnits: task.learningUnits || [],
              doingTasks: task.doingTasks || [],
              whyItMatters: task.whyItMatters || null,
              depth: task.depth || null,
              practicalFailureModes: task.practicalFailureModes || [],
              highLeverageConcepts: task.highLeverageConcepts || [],
              consequences: task.consequences || [],
              evidenceExpected: task.evidenceExpected || null,
              learningMode: task.learningMode || null,
              adaptationRules: subject.adaptationRules || []
            };
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
        if (task.subtasks && task.subtasks.length > 0) {
          for (const subtask of task.subtasks) {
            if (!subtask.completed) {
              return {
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
                learningUnits: task.learningUnits || [],
                doingTasks: task.doingTasks || [],
                whyItMatters: task.whyItMatters || null,
                depth: task.depth || null,
                practicalFailureModes: task.practicalFailureModes || [],
                highLeverageConcepts: task.highLeverageConcepts || [],
                consequences: task.consequences || [],
                evidenceExpected: task.evidenceExpected || null,
                learningMode: task.learningMode || null,
                adaptationRules: subject.adaptationRules || []
              };
            }
          }
        } else if (!task.completed) {
          return {
            id: task.id,
            subtaskId: null,
            name: task.name,
            subjectId: subject.id,
            subjectName: subject.name,
            phaseId: phase.id,
            phaseName: phase.name,
            taskId: task.id,
            taskName: task.name,
            conceptId: task.conceptId || null,
            visualId: task.visualId || null,
            learningVisual: task.learningVisual || null,
            learningUnits: task.learningUnits || [],
            doingTasks: task.doingTasks || [],
            whyItMatters: task.whyItMatters || null,
            depth: task.depth || null,
            practicalFailureModes: task.practicalFailureModes || [],
            highLeverageConcepts: task.highLeverageConcepts || [],
            consequences: task.consequences || [],
            evidenceExpected: task.evidenceExpected || null,
            learningMode: task.learningMode || null,
            adaptationRules: subject.adaptationRules || []
          };
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
      if (typeof importedData === 'string') {
        parsedData = safeJsonParse(importedData);
        if (!parsedData) {
          return {
            valid: false,
            error: 'Invalid JSON format: Could not parse JSON structure. Please check syntax.'
          };
        }
      } else {
        parsedData = sanitizeUntrustedObject(importedData);
      }
    } catch (parseError) {
      return {
        valid: false,
        error: `Invalid JSON format: ${parseError.message}\n\nPlease check:\n- Quoted strings\n- No trailing commas\n- Matched brackets\n- Proper comma separation`
      };
    }

    let rawSubjects = null;
    if (Array.isArray(parsedData)) {
      rawSubjects = parsedData;
    } else if (parsedData && Array.isArray(parsedData.subjects)) {
      rawSubjects = parsedData.subjects;
    } else if (parsedData && Array.isArray(parsedData.canonicalRoadmap)) {
      rawSubjects = parsedData.canonicalRoadmap;
    } else if (parsedData && (Array.isArray(parsedData.phases) || Array.isArray(parsedData.learningArcs))) {
      rawSubjects = [parsedData];
    }

    if (!rawSubjects) {
      return { valid: false, error: 'Missing "subjects" array. Your data should have:\n{\n  "subjects": [...]\n}' };
    }

    if (rawSubjects.length === 0) {
      return { valid: false, error: 'At least one subject is required. Add subjects to your data.' };
    }

    const hasValidStructure = rawSubjects.every(subject => {
      if (!subject || typeof subject !== 'object') return false;
      const name = subject.name || subject.title;
      if (!name || typeof name !== 'string') return false;
      const phases = subject.phases || subject.learningArcs;
      if (!phases || !Array.isArray(phases)) return false;

      return phases.every(phase => {
        if (!phase || typeof phase !== 'object') return false;
        const phaseName = phase.name || phase.title;
        if (!phaseName || typeof phaseName !== 'string') return false;
        const tasks = phase.tasks || phase.modules || phase.lessons;
        if (!tasks || !Array.isArray(tasks)) return false;

        return tasks.every(task => {
          if (!task || typeof task !== 'object') return false;
          const taskName = task.name || task.title;
          if (!taskName || typeof taskName !== 'string') return false;
          const subtasks = task.subtasks || task.steps || task.items || [];
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

  const importRoadmap = (jsonData, options = {}) => {
    try {
      const mode = options.mode || 'append';
      let normalizedData = [];

      // 1. Direct canonical roadmap pass-through (Array of subjects)
      if (Array.isArray(jsonData)) {
        normalizedData = normalizeRoadmap(jsonData);
      } else if (jsonData && Array.isArray(jsonData.canonicalRoadmap)) {
        normalizedData = normalizeRoadmap(jsonData.canonicalRoadmap);
      } else if (jsonData && Array.isArray(jsonData.subjects)) {
        normalizedData = normalizeRoadmap(jsonData.subjects);
      } else if (typeof jsonData === 'string') {
        const rawJson = safeJsonParse(jsonData);
        if (rawJson) {
          const sanitized = sanitizeUntrustedObject(rawJson);
          if (Array.isArray(sanitized)) {
            normalizedData = normalizeRoadmap(sanitized);
          } else if (sanitized && Array.isArray(sanitized.canonicalRoadmap)) {
            normalizedData = normalizeRoadmap(sanitized.canonicalRoadmap);
          } else if (sanitized && Array.isArray(sanitized.subjects)) {
            normalizedData = normalizeRoadmap(sanitized.subjects);
          } else if (sanitized && (Array.isArray(sanitized.phases) || Array.isArray(sanitized.learningArcs))) {
            const validation = validateRoadmapImport(sanitized);
            if (validation.valid) {
              normalizedData = normalizeRoadmap([sanitized]);
            }
          }
        }
        // If not standard JSON, process via Universal AI normalizer
        if (normalizedData.length === 0) {
          const report = normalizeRoadmapInput(jsonData);
          if (report.canImportDirectly && report.canonicalRoadmap.length > 0) {
            normalizedData = normalizeRoadmap(report.canonicalRoadmap);
          }
        }
      } else if (typeof jsonData === 'object' && jsonData !== null) {
        const sanitized = sanitizeUntrustedObject(jsonData);
        if (Array.isArray(sanitized)) {
          normalizedData = normalizeRoadmap(sanitized);
        } else if (sanitized && Array.isArray(sanitized.canonicalRoadmap)) {
          normalizedData = normalizeRoadmap(sanitized.canonicalRoadmap);
        } else if (sanitized && Array.isArray(sanitized.subjects)) {
          normalizedData = normalizeRoadmap(sanitized.subjects);
        } else if (sanitized && (Array.isArray(sanitized.phases) || Array.isArray(sanitized.learningArcs))) {
          const validation = validateRoadmapImport(sanitized);
          if (validation.valid) {
            normalizedData = normalizeRoadmap([sanitized]);
          }
        }

        if (normalizedData.length === 0) {
          const report = normalizeRoadmapInput(sanitized);
          if (report.canImportDirectly && report.canonicalRoadmap.length > 0) {
            normalizedData = normalizeRoadmap(report.canonicalRoadmap);
          }
        }
      }

      if (!normalizedData || normalizedData.length === 0) {
        throw new Error('No valid subjects could be imported.');
      }

      if (mode === 'replace') {
        setRoadmap(normalizedData);
        roadmapRef.current = normalizedData;
        setLearningPlan([]);
        setCurrentLearningContext(null);
        if (normalizedData[0]?.id) {
          setSelectedSubjectId(normalizedData[0].id);
        }
      } else {
        const existingSubjectNames = new Set(subjects.map(s => (s.name || '').toLowerCase()));
        const newSubjects = normalizedData.map(subject => {
          if (existingSubjectNames.has((subject.name || '').toLowerCase())) {
            return { ...subject, name: `${subject.name} (Imported)` };
          }
          return subject;
        });

        setRoadmap(prev => {
          const next = [...prev, ...newSubjects];
          roadmapRef.current = next;
          return next;
        });

        if (newSubjects[0]?.id) {
          setSelectedSubjectId(newSubjects[0].id);
        }
      }

      setHasImportedRoadmap(true);
      return true;
    } catch (error) {
      console.error('Import error:', error.message || 'Validation failed');
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
    if (currentLearningContext?.subjectId === subjectId) {
      setCurrentLearningContext(null);
    }
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

  // ============================================================
  // CANONICAL FOCUS SESSION MANAGEMENT
  // ============================================================
  const startFocusSession = (taskToLaunch, durationMinutes = 25) => {
    if (!taskToLaunch) return;
    const mins = Number(durationMinutes || taskToLaunch.time || 25);
    const sessionId = taskToLaunch.sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const sessionObj = {
      sessionId,
      id: sessionId,
      task: taskToLaunch,
      status: 'ready',
      targetMinutes: mins,
      timeLeftSeconds: mins * 60,
      sessionStartTime: null,
      sessionEndTime: null,
      elapsedMs: 0
    };
    setFocusSession(sessionObj);
    notifyFocusStarted(sessionObj);
  };

  const beginFocusRunning = () => {
    setFocusSession(prev => {
      if (!prev) return null;
      const secs = typeof prev.timeLeftSeconds === 'number' && prev.timeLeftSeconds > 0
        ? prev.timeLeftSeconds
        : prev.targetMinutes * 60;
      const now = Date.now();
      return {
        ...prev,
        status: 'running',
        initialStartTime: prev.initialStartTime || now,
        sessionStartTime: now,
        sessionEndTime: now + secs * 1000
      };
    });
  };

  const pauseFocusSession = () => {
    setFocusSession(prev => {
      if (!prev || prev.status !== 'running') return prev;
      const remainingSecs = prev.sessionEndTime
        ? Math.max(0, Math.ceil((prev.sessionEndTime - Date.now()) / 1000))
        : (typeof prev.timeLeftSeconds === 'number' ? prev.timeLeftSeconds : prev.targetMinutes * 60);
      const maxRemainingMs = prev.sessionStartTime && prev.sessionEndTime
        ? Math.max(0, prev.sessionEndTime - prev.sessionStartTime)
        : (typeof prev.timeLeftSeconds === 'number' ? prev.timeLeftSeconds : prev.targetMinutes * 60) * 1000;
      const additionalElapsed = prev.sessionStartTime
        ? Math.min(Date.now() - prev.sessionStartTime, maxRemainingMs)
        : 0;
      const maxTotalMs = (prev.targetMinutes || 25) * 60 * 1000;
      const newElapsedMs = Math.min(maxTotalMs, (prev.elapsedMs || 0) + additionalElapsed);
      return {
        ...prev,
        status: 'paused',
        timeLeftSeconds: remainingSecs,
        sessionStartTime: null,
        sessionEndTime: null,
        elapsedMs: newElapsedMs
      };
    });
  };

  const resumeFocusSession = () => {
    setFocusSession(prev => {
      if (!prev || prev.status !== 'paused') return prev;
      const secs = typeof prev.timeLeftSeconds === 'number' && prev.timeLeftSeconds > 0
        ? prev.timeLeftSeconds
        : prev.targetMinutes * 60;
      return {
        ...prev,
        status: 'running',
        sessionStartTime: Date.now(),
        sessionEndTime: Date.now() + secs * 1000
      };
    });
  };

  const openReflectionSession = () => {
    setFocusSession(prev => {
      if (!prev) return null;
      const maxRemainingMs = prev.sessionStartTime && prev.sessionEndTime
        ? Math.max(0, prev.sessionEndTime - prev.sessionStartTime)
        : (typeof prev.timeLeftSeconds === 'number' ? prev.timeLeftSeconds : prev.targetMinutes * 60) * 1000;
      const additionalElapsed = (prev.status === 'running' && prev.sessionStartTime)
        ? Math.min(Date.now() - prev.sessionStartTime, maxRemainingMs)
        : 0;
      const maxTotalMs = (prev.targetMinutes || 25) * 60 * 1000;
      const newElapsedMs = Math.min(maxTotalMs, (prev.elapsedMs || 0) + additionalElapsed);
      return {
        ...prev,
        status: 'reflection',
        timeLeftSeconds: 0,
        sessionStartTime: null,
        sessionEndTime: null,
        elapsedMs: newElapsedMs
      };
    });
  };

  const commitFocusSession = (reflectionData = {}) => {
    if (isFocusCommittingRef.current) return;
    if (!focusSession || !focusSession.task) return;
    isFocusCommittingRef.current = true;
    try {
      const task = focusSession.task;
      const maxAllowedMinutes = focusSession.targetMinutes || 25;
      const computedMinutes = Math.max(1, Math.min(maxAllowedMinutes, Math.round((focusSession.elapsedMs || 0) / 60000)));
      const durationNum = Number(reflectionData.durationMinutes) || computedMinutes;

      const targetSubtaskId =
        task.subtaskId ||
        (task.taskId && task.id !== task.taskId ? task.id : null);

      let completion = null;
      if (targetSubtaskId) {
        completion = completeSubtask({
          subjectId: task.subjectId,
          phaseId: task.phaseId,
          taskId: task.taskId,
          subtaskId: targetSubtaskId,
          durationMinutes: durationNum,
          notes: reflectionData.notes || '',
          difficulty: reflectionData.difficulty || 'medium',
          explainWithoutNotes: reflectionData.explainWithoutNotes || null
        });

        storeCompleteAction(targetSubtaskId, null, completion?.id, {
          subjectId: task.subjectId,
          phaseId: task.phaseId,
          taskId: task.taskId,
          subtaskId: targetSubtaskId,
          taskDetails: {
            id: targetSubtaskId,
            subtaskId: targetSubtaskId,
            name: task.name,
            taskId: task.taskId,
            taskName: task.taskName || task.name,
            subjectId: task.subjectId,
            subjectName: task.subjectName,
            phaseId: task.phaseId,
            phaseName: task.phaseName
          }
        });
      } else {
        completion = completeTask({
          subjectId: task.subjectId,
          phaseId: task.phaseId,
          taskId: task.taskId,
          durationMinutes: durationNum,
          notes: reflectionData.notes || '',
          difficulty: reflectionData.difficulty || 'medium',
          explainWithoutNotes: reflectionData.explainWithoutNotes || null
        });
        storeCompleteAction(task.taskId, null, completion?.id, {
          subjectId: task.subjectId,
          phaseId: task.phaseId,
          taskId: task.taskId,
          subtaskId: null,
          taskDetails: {
            id: task.taskId,
            name: task.name,
            subjectId: task.subjectId,
            phaseId: task.phaseId
          }
        });
      }

      // Record canonical Focus Session record with Focus Integrity telemetry if available
      const rawTelemetry = focusSession.sessionId ? getTelemetryForSession(focusSession.sessionId) : null;
      const isTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
      const companionTelemetry = (isTest || rawTelemetry?.provenance === TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE) ? rawTelemetry : null;
      const sessionStartInstant = focusSession.initialStartTime
        ? new Date(focusSession.initialStartTime)
        : (focusSession.sessionStartTime
            ? new Date(focusSession.sessionStartTime)
            : new Date(Date.now() - durationNum * 60000));
      const recordedSession = addFocusSession({
        id: focusSession.sessionId,
        sessionId: focusSession.sessionId,
        subjectId: task.subjectId,
        phaseId: task.phaseId,
        taskId: task.taskId,
        subtaskId: targetSubtaskId,
        durationMinutes: durationNum,
        startedAt: sessionStartInstant,
        endedAt: new Date(),
        type: 'focus',
        notes: reflectionData.notes || '',
        difficulty: reflectionData.difficulty || 'medium',
        explainWithoutNotes: reflectionData.explainWithoutNotes || null,
        companionTelemetry: companionTelemetry || null
      });

      // Update lastAction to bind both the task/subtask completion and the focus session
      storeCompleteAction(
        targetSubtaskId || task.taskId,
        recordedSession?.id || focusSession.sessionId,
        completion?.id,
        {
          subjectId: task.subjectId,
          phaseId: task.phaseId,
          taskId: task.taskId,
          subtaskId: targetSubtaskId || null,
          taskDetails: task
        }
      );

      // Feed session trial result to any active experiment (Prompt #20)
      recordSessionInExperiment({
        id: focusSession.sessionId,
        durationMinutes: durationNum,
        interruptionCount: companionTelemetry ? companionTelemetry.interruptionCount : null,
        hasPhoneTelemetry: Boolean(companionTelemetry),
        difficulty: reflectionData.difficulty || 'medium',
        explainWithoutNotes: reflectionData.explainWithoutNotes || null
      });

      if (task.learningPlanEntryId) {
        setLearningPlan(prev => (prev || []).filter(e => e.id !== task.learningPlanEntryId));
      }

      if (focusSession.sessionId) {
        notifyFocusEnded(focusSession.sessionId);
      }

      setAdaptiveTick(t => t + 1);
      setFocusSession(null);
    } finally {
      isFocusCommittingRef.current = false;
    }
  };

  const abandonFocusSession = () => {
    if (focusSession?.sessionId) {
      notifyFocusCancelled(focusSession.sessionId);
    }
    setFocusSession(null);
  };

  /**
   * Reconciles late-arriving companion telemetry with an already-committed Focus session.
   * Strict Invariant: Enriches ONLY companionTelemetry; never alters durationMinutes,
   * task completions, or manufactured evidence.
   */
  const reconcileSessionTelemetry = (sessionId, telemetryData) => {
    if (!sessionId || !telemetryData) return false;
    const isTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
    if (!isTest && telemetryData.provenance !== TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE) {
      return false;
    }

    let didReconcile = false;
    setSessions(prevSessions => {
      const updated = (prevSessions || []).map(s => {
        if (s.id === sessionId || s.sessionId === sessionId) {
          didReconcile = true;
          return {
            ...s,
            companionTelemetry: telemetryData
          };
        }
        return s;
      });
      if (didReconcile) {
        persistState("sessions", updated);
      }
      return updated;
    });

    if (didReconcile) {
      setAdaptiveTick(t => t + 1);
    }
    return didReconcile;
  };

  // Comprehensive stats for dashboard and statistics views
  const getStats = () => {
    const roadmapStats = calculateOverallRoadmapStats(subjects);
    const dailyGoalStats = getDailyGoalStats();

    const totalFocusMinutes = sessions.reduce(
      (total, session) =>
        total + Number(session.durationMinutes || session.duration || 0),
      0
    );

    const totalFocusSessions = sessions.length;
    const totalFocusHours = Math.round((totalFocusMinutes / 60) * 10) / 10;

    return {
      ...roadmapStats,
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

  // ============================================================
  // ADAPTIVE LEARNING ENGINE (Prompt #28, #32, #44)
  // ============================================================
  const [adaptiveTick, setAdaptiveTick] = useState(0);

  const adaptiveState = useMemo(() => {
    const currentIdentity = loadIdentity();
    return resolveAdaptiveState({
      sessions,
      subjects: roadmap,
      identity: currentIdentity,
      learningPlan,
      persist: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, roadmap, learningPlan, adaptiveTick]);

  // Persist hypotheses and recommendations in a React useEffect, keeping useMemo 100% pure
  useEffect(() => {
    if (isResettingRef.current) return;
    if (adaptiveState?.hypotheses) {
      saveHypotheses(adaptiveState.hypotheses);
    }
    if (adaptiveState?.recommendations) {
      saveRecommendations(adaptiveState.recommendations);
    }
  }, [adaptiveState]);

  const acceptRecommendation = useCallback((id, recommendation) => {
    if (recommendation?.type === RECOMMENDATION_TYPES.SESSION_DURATION && recommendation.suggestedValue) {
      updateSettings({
        ...settings,
        pomodoroWorkDuration: Number(recommendation.suggestedValue)
      });
    }

    acceptAdaptiveRecommendation(id, recommendation);
    setAdaptiveTick(t => t + 1);
  }, [settings, updateSettings]);

  const rejectRecommendation = useCallback((id, hypothesisKey) => {
    rejectAdaptiveRecommendation(id, hypothesisKey);
    setAdaptiveTick(t => t + 1);
  }, []);

  const revertRecommendation = useCallback((id) => {
    revertAdaptiveRecommendation(id);
    setAdaptiveTick(t => t + 1);
  }, []);

  const startExperiment = useCallback((params) => {
    const exp = startAdaptiveExperiment(params);
    setAdaptiveTick(t => t + 1);
    return exp;
  }, []);

  const cancelExperiment = useCallback((id) => {
    cancelActiveExperiment(id);
    setAdaptiveTick(t => t + 1);
  }, []);

  // ============================================================
  // ACCOUNT & SYNCHRONIZATION FOUNDATION
  // ============================================================
  const triggerSync = async () => {
    const result = await executeSyncCycle();
    setSyncMetadata(getSyncMetadata());
    setOutboxCount(getOutboxCount());
    return result;
  };

  const handleLinkAuthProvider = (authData) => {
    const updated = linkAuthProvider(authData);
    setAccount(updated);
    enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.USER_IDENTITY,
      operation: SYNC_OPERATIONS.UPDATE_STATE,
      payload: { account: updated, version: Date.now() }
    });
    setOutboxCount(getOutboxCount());
    return updated;
  };

  const handleUnlinkDevice = (targetDeviceId) => {
    const res = unlinkDevice(targetDeviceId);
    setRegisteredDevices(getRegisteredDevices());
    return res;
  };

  const handleCreatePairingTicket = () => {
    return createPairingTicket();
  };

  const handleVerifyPairingTicket = (code, meta) => {
    const res = verifyPairingTicket(code, meta);
    if (res.success) {
      setRegisteredDevices(getRegisteredDevices());
    }
    return res;
  };

  const handleLogoutAccount = async () => {
    await signOutUser({ clearLocalData: false });
    const freshLocal = getOrCreateAccount();
    setAccount(freshLocal);
    setRegisteredDevices(getRegisteredDevices());
    clearOutbox();
    setOutboxCount(0);
    return freshLocal;
  };

  const handleDeleteAccount = () => {
    deleteAccount();
    clearOutbox();
    resetEverything();
  };

  const refreshAccount = () => {
    setAccount(getOrCreateAccount());
    setRegisteredDevices(getRegisteredDevices());
    setSyncMetadata(getSyncMetadata());
    setOutboxCount(getOutboxCount());
  };

  return (
    <RoadmapContext.Provider
      value={{
        // Account & Identity Foundation
        account,
        authLifecycle,
        isAuthInitializing: authLifecycle === AUTH_LIFECYCLE_STATES.INITIALIZING,
        refreshAccount,
        linkAuthProvider: handleLinkAuthProvider,
        registeredDevices,
        unlinkDevice: handleUnlinkDevice,
        createPairingTicket: handleCreatePairingTicket,
        verifyPairingTicket: handleVerifyPairingTicket,
        logoutAccount: handleLogoutAccount,
        deleteAccount: handleDeleteAccount,

        // Synchronization Foundation
        syncMetadata,
        syncStatus: syncMetadata?.status || 'idle',
        outboxCount,
        triggerSync,

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

        // Adaptive Learning Engine (Prompt #28, #32, #44)
        adaptiveState,
        acceptRecommendation,
        rejectRecommendation,
        revertRecommendation,
        startExperiment,
        cancelExperiment,

        // Storage error status
        storageError,
        setStorageError,
        corruptedDataKeys,
        dismissCorruptedNotice,

        // Canonical completion helpers
        isTaskCompleted,
        isPhaseCompleted,
        isSubjectCompleted,
        completeTask,
        completeSubtask,
        scheduleSubtask,

        // Session tracking
        addFocusSession,
        calculateStreak,
        streakCount: calculateStreak(sessions),
        getTotalLearningTime,

        // Canonical Focus Session state & actions
        focusSession,
        setFocusSession,
        startFocusSession,
        beginFocusRunning,
        pauseFocusSession,
        resumeFocusSession,
        openReflectionSession,
        commitFocusSession,
        abandonFocusSession,
        reconcileSessionTelemetry,

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
        clearLastAction,

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
        getTaskProgress: canonicalGetTaskProgress,
        getPhaseProgress: canonicalGetPhaseProgress,
        getSubjectProgress: canonicalGetSubjectProgress,
        calculateOverallRoadmapStats,
        normalizeRoadmap,

        // Subject selection
        selectedSubjectId,
        setSelectedSubjectId,

        // Global Canonical Learning Context (Unification Pass #12 & #13)
        currentLearningContext,
        setCurrentLearningContext,
        selectLearningContext
      }}
    >
      {children}
    </RoadmapContext.Provider>
  );
};

export const useRoadmap = () => useContext(RoadmapContext);
