import { describe, expect, it } from 'vitest';
import { dayParts, isFutureDay, parseDay, toDayString, todayString } from '@utils/dates';

describe('parseDay', () => {
  it('stores a picked day at noon UTC', () => {
    expect(parseDay('2026-10-25').toISOString()).toBe('2026-10-25T12:00:00.000Z');
  });

  it.each([['2026-02-30'], ['2026-13-01'], ['25/10/2026'], ['mañana'], [''], [undefined], [20261025]])(
    'refuses %s',
    (value) => {
      expect(parseDay(value)).toBeNull();
    },
  );

  it('accepts a leap day only in a leap year', () => {
    expect(parseDay('2024-02-29')).not.toBeNull();
    expect(parseDay('2025-02-29')).toBeNull();
  });
});

describe('Mexico City days', () => {
  it('reads a late-evening Mexico City moment as that day, not the UTC day', () => {
    const lateEvening = new Date('2026-10-26T04:30:00Z'); // 22:30 on Oct 25 in Mexico City
    expect(dayParts(lateEvening)).toEqual({ year: 2026, month: 10, day: 25 });
    expect(toDayString(lateEvening)).toBe('2026-10-25');
  });

  it('round-trips a stored day', () => {
    expect(toDayString(parseDay('2023-05-15'))).toBe('2023-05-15');
  });

  it('knows which days are in the future', () => {
    const now = new Date('2026-10-26T04:30:00Z'); // still Oct 25 in Mexico City
    expect(todayString(now)).toBe('2026-10-25');
    expect(isFutureDay('2026-10-25', now)).toBe(false);
    expect(isFutureDay('2026-10-26', now)).toBe(true);
  });
});
