import {
  getLocalDateKey,
  parseLocalDateKey,
  addDaysToDateKey,
  compareDateKeys,
  isSameDateKey,
  getPreviousLocalDateKey,
  getNextLocalDateKey,
  getDailyFocusMinutes,
  calculateStreak
} from '../utils/dateUtils';

describe('P1.1 — Canonical Time Engine & Date Utility Truthfulness', () => {
  test('generates deterministic YYYY-MM-DD local date keys without UTC shift', () => {
    // 11:30 PM local time on Oct 7, 2026
    const localDate = new Date(2026, 9, 7, 23, 30, 0);
    expect(getLocalDateKey(localDate)).toBe('2026-10-07');

    // 00:15 AM local time on Oct 8, 2026
    const morningDate = new Date(2026, 9, 8, 0, 15, 0);
    expect(getLocalDateKey(morningDate)).toBe('2026-10-08');

    // Already valid string passes through
    expect(getLocalDateKey('2026-10-07')).toBe('2026-10-07');
  });

  test('parses local date keys accurately to local Date midnight', () => {
    const parsed = parseLocalDateKey('2026-10-07');
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9); // 0-indexed: October is 9
    expect(parsed.getDate()).toBe(7);

    // Invalid formats return null safely
    expect(parseLocalDateKey('invalid-date')).toBeNull();
    expect(parseLocalDateKey('')).toBeNull();
    expect(parseLocalDateKey(null)).toBeNull();
  });

  test('handles calendar boundary arithmetic correctly: leap years, month ends, year ends', () => {
    // Leap day in leap year 2024
    expect(addDaysToDateKey('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDaysToDateKey('2024-02-29', 1)).toBe('2024-03-01');

    // Non-leap year 2025
    expect(addDaysToDateKey('2025-02-28', 1)).toBe('2025-03-01');

    // Month boundary: April 30 to May 1
    expect(addDaysToDateKey('2026-04-30', 1)).toBe('2026-05-01');
    expect(addDaysToDateKey('2026-05-01', -1)).toBe('2026-04-30');

    // Year boundary: Dec 31 to Jan 1
    expect(addDaysToDateKey('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDaysToDateKey('2026-01-01', -1)).toBe('2025-12-31');

    // Helpers
    expect(getNextLocalDateKey('2026-10-07')).toBe('2026-10-08');
    expect(getPreviousLocalDateKey('2026-10-07')).toBe('2026-10-06');
  });

  test('compares date keys accurately', () => {
    expect(compareDateKeys('2026-10-07', '2026-10-08')).toBeLessThan(0);
    expect(compareDateKeys('2026-10-08', '2026-10-07')).toBeGreaterThan(0);
    expect(compareDateKeys('2026-10-07', '2026-10-07')).toBe(0);
    expect(isSameDateKey('2026-10-07', '2026-10-07')).toBe(true);
    expect(isSameDateKey('2026-10-07', '2026-10-08')).toBe(false);
  });
});

describe('P1.1 — Streak Calculation Correctness (Cases A through J)', () => {
  const FIXED_TODAY = '2026-10-07';

  test('Case A: activity today only gives streak 1', () => {
    const sessions = [
      { date: FIXED_TODAY, durationMinutes: 25 }
    ];
    expect(calculateStreak(sessions, FIXED_TODAY)).toBe(1);
  });

  test('Case B: activity yesterday + today gives streak 2', () => {
    const yesterday = addDaysToDateKey(FIXED_TODAY, -1);
    const sessions = [
      { date: yesterday, durationMinutes: 30 },
      { date: FIXED_TODAY, durationMinutes: 25 }
    ];
    expect(calculateStreak(sessions, FIXED_TODAY)).toBe(2);
  });

  test('Case C: activity two days ago + today (gap yesterday) resets streak to 1', () => {
    const twoDaysAgo = addDaysToDateKey(FIXED_TODAY, -2);
    const sessions = [
      { date: twoDaysAgo, durationMinutes: 45 },
      { date: FIXED_TODAY, durationMinutes: 20 }
    ];
    // Yesterday was missed, so the streak started fresh today
    expect(calculateStreak(sessions, FIXED_TODAY)).toBe(1);
  });

  test('Case D: multiple sessions on the same day count as ONE streak day', () => {
    const sessions = [
      { id: 's1', date: FIXED_TODAY, durationMinutes: 25 },
      { id: 's2', date: FIXED_TODAY, durationMinutes: 30 },
      { id: 's3', date: FIXED_TODAY, durationMinutes: 15 }
    ];
    expect(calculateStreak(sessions, FIXED_TODAY)).toBe(1);
  });

  test('Case E: session crossing midnight attributes to its canonical start date', () => {
    // Session started at 23:50 on 2026-10-06 and ended 00:20 on 2026-10-07
    const sessionCrossMidnight = {
      startedAt: '2026-10-06T23:50:00.000Z',
      endedAt: '2026-10-07T00:20:00.000Z',
      date: '2026-10-06',
      durationMinutes: 30
    };
    // If today is 2026-10-06, streak is 1
    expect(calculateStreak([sessionCrossMidnight], '2026-10-06')).toBe(1);
    // If today is 2026-10-07, streak is still alive from yesterday at 1
    expect(calculateStreak([sessionCrossMidnight], '2026-10-07')).toBe(1);

    // If learner also studied today (2026-10-07), streak becomes 2
    const sessionToday = {
      date: '2026-10-07',
      durationMinutes: 25
    };
    expect(calculateStreak([sessionCrossMidnight, sessionToday], '2026-10-07')).toBe(2);
  });

  test('Case F: late-night session near local midnight does not get misplaced', () => {
    // 23:58 local time
    const lateNightDate = new Date(2026, 9, 6, 23, 58, 0);
    const dateKey = getLocalDateKey(lateNightDate);
    expect(dateKey).toBe('2026-10-06');

    const sessions = [{ date: dateKey, durationMinutes: 20 }];
    expect(calculateStreak(sessions, '2026-10-06')).toBe(1);
  });

  test('Case G: timezone and date rollover preserves streak when studying yesterday', () => {
    const yesterday = addDaysToDateKey(FIXED_TODAY, -1);
    const sessions = [
      { date: yesterday, durationMinutes: 40 }
    ];
    // Not studied yet today, but streak remains alive based on yesterday
    expect(calculateStreak(sessions, FIXED_TODAY)).toBe(1);

    // If 2 days elapse without study, streak drops to 0
    const tomorrow = addDaysToDateKey(FIXED_TODAY, 1);
    expect(calculateStreak(sessions, tomorrow)).toBe(0);
  });

  test('Case H: zero-minute sessions do not count toward streaks', () => {
    const sessions = [
      { date: FIXED_TODAY, durationMinutes: 0 },
      { date: FIXED_TODAY, duration: 0 }
    ];
    expect(calculateStreak(sessions, FIXED_TODAY)).toBe(0);
  });

  test('Case I: handles sessions without explicit .date but with .startedAt or .timestamp', () => {
    const sessions = [
      { startedAt: '2026-10-06T10:00:00.000Z', durationMinutes: 25 },
      { timestamp: '2026-10-07T14:30:00.000Z', durationMinutes: 30 }
    ];
    // Resolves startedAt and timestamp to local date keys
    const d1 = getLocalDateKey('2026-10-06T10:00:00.000Z');
    const d2 = getLocalDateKey('2026-10-07T14:30:00.000Z');
    const streak = calculateStreak(sessions, d2);
    if (d1 !== d2 && addDaysToDateKey(d1, 1) === d2) {
      expect(streak).toBe(2);
    } else {
      expect(streak).toBeGreaterThanOrEqual(1);
    }
  });

  test('Case J: multi-day consecutive streak across month and year boundaries', () => {
    // Dec 30, Dec 31, Jan 1, Jan 2
    const sessions = [
      { date: '2025-12-30', durationMinutes: 25 },
      { date: '2025-12-31', durationMinutes: 25 },
      { date: '2026-01-01', durationMinutes: 25 },
      { date: '2026-01-02', durationMinutes: 25 }
    ];
    expect(calculateStreak(sessions, '2026-01-02')).toBe(4);
    expect(calculateStreak(sessions, '2026-01-03')).toBe(4); // alive on next day before study
    expect(calculateStreak(sessions, '2026-01-04')).toBe(0); // broken after gap
  });
});

describe('P1.1 — Daily Focus Minutes Pure Calculation', () => {
  test('accurately aggregates only sessions for the requested dateKey', () => {
    const sessions = [
      { id: '1', date: '2026-10-07', durationMinutes: 25 },
      { id: '2', date: '2026-10-07', durationMinutes: 35 },
      { id: '3', date: '2026-10-06', durationMinutes: 60 },
      { id: '4', date: '2026-10-08', durationMinutes: 45 }
    ];

    expect(getDailyFocusMinutes(sessions, '2026-10-07')).toBe(60);
    expect(getDailyFocusMinutes(sessions, '2026-10-06')).toBe(60);
    expect(getDailyFocusMinutes(sessions, '2026-10-08')).toBe(45);
    expect(getDailyFocusMinutes(sessions, '2026-10-09')).toBe(0);
  });

  test('handles legacy duration field and falls back to startedAt/completedAt', () => {
    const sessions = [
      { id: '1', startedAt: new Date(2026, 9, 7, 10, 0, 0).toISOString(), duration: 50 },
      { id: '2', completedAt: new Date(2026, 9, 7, 14, 0, 0).toISOString(), durationMinutes: 30 }
    ];
    const targetKey = getLocalDateKey(new Date(2026, 9, 7, 10, 0, 0));
    expect(getDailyFocusMinutes(sessions, targetKey)).toBe(80);
  });
});
