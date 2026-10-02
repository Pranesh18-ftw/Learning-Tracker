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
