/**
 * Returns the user's local calendar date as YYYY-MM-DD.
 *
 * IMPORTANT:
 * This intentionally does NOT use toISOString().
 * toISOString() converts the date to UTC first.
 */
export const getLocalDateKey = (date = new Date()) => {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const year = d.getFullYear();

  const month = String(
    d.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    d.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const parseLocalDateKey = (dateKey) => {
  if (!dateKey || typeof dateKey !== 'string') {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    dateKey
  );

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );
};

export const addDaysToDateKey = (
  dateKey,
  amount
) => {
  const date = parseLocalDateKey(dateKey);

  if (!date) {
    throw new Error(
      `Invalid date key: ${dateKey}`
    );
  }

  date.setDate(
    date.getDate() + amount
  );

  return getLocalDateKey(date);
};

export const compareDateKeys = (a, b) => {
  const dateA = parseLocalDateKey(a);
  const dateB = parseLocalDateKey(b);

  if (!dateA || !dateB) {
    throw new Error(
      `Invalid date comparison: ${a}, ${b}`
    );
  }

  return dateA.getTime() - dateB.getTime();
};

export const isSameDateKey = (a, b) => {
  return a === b;
};

export const getPreviousLocalDateKey = (dateKey = getLocalDateKey()) => {
  return addDaysToDateKey(dateKey, -1);
};

export const getNextLocalDateKey = (dateKey = getLocalDateKey()) => {
  return addDaysToDateKey(dateKey, 1);
};

export const getDailyFocusMinutes = (
  sessionsList = [],
  dateKey = getLocalDateKey()
) => {
  return (sessionsList || [])
    .filter(session => {
      const sDate = session.date
        ? getLocalDateKey(session.date)
        : (session.startedAt
            ? getLocalDateKey(session.startedAt)
            : (session.timestamp
                ? getLocalDateKey(session.timestamp)
                : (session.completedAt ? getLocalDateKey(session.completedAt) : null)));
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

export const calculateStreak = (
  sessionsList = [],
  todayKey = getLocalDateKey()
) => {
  if (!Array.isArray(sessionsList) || sessionsList.length === 0) {
    return 0;
  }

  // Filter out zero-minute sessions
  const validSessions = sessionsList.filter(
    session => Number(session.durationMinutes || session.duration || 0) > 0
  );

  const sessionDates = new Set(
    validSessions
      .map(session => {
        if (session.date) return getLocalDateKey(session.date);
        if (session.startedAt) return getLocalDateKey(session.startedAt);
        if (session.timestamp) return getLocalDateKey(session.timestamp);
        if (session.completedAt) return getLocalDateKey(session.completedAt);
        return null;
      })
      .filter(Boolean)
  );

  if (sessionDates.size === 0) {
    return 0;
  }

  let currentDate = todayKey;

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
