// The family lives in Mexico, so a moment's calendar day is its day in Mexico City.
export const TIME_ZONE = 'America/Mexico_City';

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// { year, month, day } of a moment as seen in Mexico City.
export const dayParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get('year'), month: get('month'), day: get('day') };
};

// 'YYYY-MM-DD' of a moment in Mexico City; what a date input shows.
export const toDayString = (date) => {
  const { year, month, day } = dayParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const todayString = (now = new Date()) => toDayString(now);

// A picked day is stored at noon UTC, which is the same day everywhere from
// UTC-11 to UTC+11, so it never shows as the day before. Returns null for
// anything that is not a real calendar day (2026-02-30, 'mañana', …).
export const parseDay = (value) => {
  const match = typeof value === 'string' ? DAY.exec(value) : null;
  if (!match) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
    ? date
    : null;
};

// Day strings sort like dates, so a plain comparison works.
export const isFutureDay = (value, now = new Date()) => value > todayString(now);
