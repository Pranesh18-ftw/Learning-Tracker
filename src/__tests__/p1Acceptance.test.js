import {
  getLocalDateKey,
  parseLocalDateKey,
  addDaysToDateKey,
  compareDateKeys,
  isSameDateKey
} from '../utils/dateUtils';

import { ACHIEVEMENTS, evaluateAchievements } from '../services/achievementService';

describe('P1.1 & P1.2 — Canonical Date Engine', () => {
  test('formats local date without UTC shift', () => {
    // 23:59 local on Oct 1
    const lateNight = new Date(2026, 9, 1, 23, 59, 0);
    expect(getLocalDateKey(lateNight)).toBe('2026-10-01');

    // 00:01 local on Oct 2
    const earlyMorning = new Date(2026, 9, 2, 0, 1, 0);
    expect(getLocalDateKey(earlyMorning)).toBe('2026-10-02');
  });

  test('parses local date key accurately', () => {
    const parsed = parseLocalDateKey('2026-10-01');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9); // 0-indexed October
    expect(parsed.getDate()).toBe(1);
  });

  test('adds and subtracts days accurately', () => {
    expect(addDaysToDateKey('2026-10-01', 1)).toBe('2026-10-02');
    expect(addDaysToDateKey('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  test('compares date keys accurately', () => {
    expect(compareDateKeys('2026-10-01', '2026-10-02')).toBeLessThan(0);
    expect(compareDateKeys('2026-10-02', '2026-10-01')).toBeGreaterThan(0);
    expect(isSameDateKey('2026-10-01', '2026-10-01')).toBe(true);
    expect(isSameDateKey('2026-10-01', '2026-10-02')).toBe(false);
  });
});

describe('P1.5 & P1.6 — Streak Engine', () => {
  const calculateStreakWithSessions = (sessions, todayKey = getLocalDateKey()) => {
    const validSessions = (sessions || []).filter(
      s => Number(s.durationMinutes || s.duration || 0) > 0
    );

    const sessionDates = new Set(
      validSessions.map(s => getLocalDateKey(s.date)).filter(Boolean)
    );

    if (sessionDates.size === 0) return 0;

    let currentDate = todayKey;

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

  test('study today gives streak 1', () => {
    const today = getLocalDateKey();
    const sessions = [{ date: today, durationMinutes: 25 }];
    expect(calculateStreakWithSessions(sessions, today)).toBe(1);
  });

  test('study yesterday, not today, preserves streak at 1', () => {
    const today = getLocalDateKey();
    const yesterday = addDaysToDateKey(today, -1);
    const sessions = [{ date: yesterday, durationMinutes: 30 }];
    expect(calculateStreakWithSessions(sessions, today)).toBe(1);
  });

  test('study today and yesterday gives streak 2', () => {
    const today = getLocalDateKey();
    const yesterday = addDaysToDateKey(today, -1);
    const sessions = [
      { date: yesterday, durationMinutes: 30 },
      { date: today, durationMinutes: 45 }
    ];
    expect(calculateStreakWithSessions(sessions, today)).toBe(2);
  });

  test('study three consecutive days gives streak 3', () => {
    const today = getLocalDateKey();
    const d1 = addDaysToDateKey(today, -2);
    const d2 = addDaysToDateKey(today, -1);
    const sessions = [
      { date: d1, durationMinutes: 25 },
      { date: d2, durationMinutes: 25 },
      { date: today, durationMinutes: 25 }
    ];
    expect(calculateStreakWithSessions(sessions, today)).toBe(3);
  });

  test('gap of one day breaks streak', () => {
    const today = getLocalDateKey();
    const d2DaysAgo = addDaysToDateKey(today, -2);
    // Studied 2 days ago, but NOT yesterday and NOT today
    const sessions = [{ date: d2DaysAgo, durationMinutes: 30 }];
    expect(calculateStreakWithSessions(sessions, today)).toBe(0);
  });

  test('zero-minute sessions do not count toward streaks', () => {
    const today = getLocalDateKey();
    const sessions = [
      { date: today, durationMinutes: 0 }
    ];
    expect(calculateStreakWithSessions(sessions, today)).toBe(0);
  });
});

describe('P1.7 & P1.8 — Daily Goal Calculation & Settings', () => {
  const getDailyFocusMinutes = (sessions, dateKey) => {
    return (sessions || [])
      .filter(s => getLocalDateKey(s.date) === dateKey)
      .reduce((total, s) => total + Math.max(0, Number(s.durationMinutes || 0)), 0);
  };

  const getDailyGoalStats = (sessions, goalHours, dateKey) => {
    const goalMinutes = Math.max(0, Number(goalHours) || 0) * 60;
    const completedMinutes = getDailyFocusMinutes(sessions, dateKey);
    const percentage = goalMinutes > 0 ? Math.min(100, Math.round((completedMinutes / goalMinutes) * 100)) : 0;
    return {
      goalMinutes,
      completedMinutes,
      remainingMinutes: Math.max(0, goalMinutes - completedMinutes),
      percentage,
      completed: goalMinutes > 0 && completedMinutes >= goalMinutes
    };
  };

  test('calculates daily focus minutes only for specified date', () => {
    const today = '2026-10-01';
    const yesterday = '2026-09-30';
    const sessions = [
      { date: today, durationMinutes: 45 },
      { date: today, durationMinutes: 15 },
      { date: yesterday, durationMinutes: 60 }
    ];
    expect(getDailyFocusMinutes(sessions, today)).toBe(60);
    expect(getDailyFocusMinutes(sessions, yesterday)).toBe(60);
  });

  test('calculates daily goal stats correctly', () => {
    const today = '2026-10-01';
    const sessions = [{ date: today, durationMinutes: 60 }];
    const stats = getDailyGoalStats(sessions, 2, today);
    expect(stats.goalMinutes).toBe(120);
    expect(stats.completedMinutes).toBe(60);
    expect(stats.remainingMinutes).toBe(60);
    expect(stats.percentage).toBe(50);
    expect(stats.completed).toBe(false);

    const achievedStats = getDailyGoalStats(sessions, 1, today);
    expect(achievedStats.percentage).toBe(100);
    expect(achievedStats.completed).toBe(true);
    expect(achievedStats.remainingMinutes).toBe(0);
  });

  test('migrates legacy dailyLearningHours to dailyGoalHours', () => {
    const DEFAULT_SETTINGS = {
      dailyGoalHours: 2,
      dailyLearningHours: 2,
      pomodoroWorkDuration: 25,
      pomodoroBreakDuration: 5
    };

    const migrateSettings = (stored) => {
      if (!stored || typeof stored !== 'object') return { ...DEFAULT_SETTINGS };
      const goal = stored.dailyGoalHours ?? stored.dailyLearningHours ?? DEFAULT_SETTINGS.dailyGoalHours;
      return {
        ...DEFAULT_SETTINGS,
        ...stored,
        dailyGoalHours: goal,
        dailyLearningHours: goal
      };
    };

    const legacy = { dailyLearningHours: 3 };
    const migrated = migrateSettings(legacy);
    expect(migrated.dailyGoalHours).toBe(3);
    expect(migrated.dailyLearningHours).toBe(3);
  });
});

describe('P1.11 – P1.15 — Daily Reset & Historical Preservation', () => {
  test('resets only today completions and preserves historical completion', () => {
    const today = getLocalDateKey();
    const yesterday = addDaysToDateKey(today, -1);

    const initialRoadmap = [
      {
        id: 'sub-1',
        name: 'Subject 1',
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            tasks: [
              {
                id: 'task-1',
                name: 'Historical Task',
                completed: true,
                completedAt: `${yesterday}T10:00:00.000Z`,
                subtasks: [
                  {
                    id: 'sub-a',
                    name: 'Subtask A',
                    completed: true,
                    completedAt: `${yesterday}T10:00:00.000Z`
                  }
                ]
              },
              {
                id: 'task-2',
                name: 'Today Task',
                completed: true,
                completedAt: `${today}T11:00:00.000Z`,
                subtasks: [
                  {
                    id: 'sub-b',
                    name: 'Subtask B',
                    completed: true,
                    completedAt: `${today}T11:00:00.000Z`
                  }
                ]
              }
            ]
          }
        ]
      }
    ];

    // Simulating resetTodayRoadmapCompletions logic
    const resetRoadmap = initialRoadmap.map(subject => ({
      ...subject,
      phases: subject.phases.map(phase => ({
        ...phase,
        tasks: phase.tasks.map(task => {
          const subtasks = task.subtasks.map(subtask => {
            if (!subtask.completedAt) return subtask;
            const completedDate = getLocalDateKey(new Date(subtask.completedAt));
            if (completedDate !== today) return subtask;
            return { ...subtask, completed: false, completedAt: null };
          });
          const completed = subtasks.length > 0
            ? subtasks.every(st => st.completed === true)
            : task.completed;
          return { ...task, subtasks, completed };
        })
      }))
    }));

    // Historical task remains completed
    const preservedTask = resetRoadmap[0].phases[0].tasks[0];
    expect(preservedTask.completed).toBe(true);
    expect(preservedTask.subtasks[0].completed).toBe(true);

    // Today task was reverted
    const todayTask = resetRoadmap[0].phases[0].tasks[1];
    expect(todayTask.completed).toBe(false);
    expect(todayTask.subtasks[0].completed).toBe(false);
  });
});

describe('P1.18 – P1.24 — Achievement Engine', () => {
  test('unlocks First Focus on first session with duration > 0', () => {
    const sessions = [{ durationMinutes: 25 }];
    const newlyUnlocked = evaluateAchievements({
      sessions,
      existingAchievements: []
    });
    expect(newlyUnlocked).toContain('first-session');
  });

  test('Focused Hour unlocks at 60 minutes and does NOT require 120 minutes', () => {
    const sessions = [{ durationMinutes: 60 }];
    const newlyUnlocked = evaluateAchievements({
      sessions,
      existingAchievements: []
    });
    expect(newlyUnlocked).toContain('focused-hour');
    expect(newlyUnlocked).not.toContain('two-hour-focus');
  });

  test('Deep Work unlocks with 5 hours (300 minutes) aggregate', () => {
    const sessions = [
      { durationMinutes: 100 },
      { durationMinutes: 100 },
      { durationMinutes: 100 }
    ];
    const newlyUnlocked = evaluateAchievements({
      sessions,
      existingAchievements: []
    });
    expect(newlyUnlocked).toContain('five-hours');
  });

  test('does not duplicate already unlocked achievements', () => {
    const sessions = [{ durationMinutes: 60 }];
    const newlyUnlocked = evaluateAchievements({
      sessions,
      existingAchievements: ['first-session', 'focused-hour']
    });
    expect(newlyUnlocked).not.toContain('first-session');
    expect(newlyUnlocked).not.toContain('focused-hour');
  });
});
