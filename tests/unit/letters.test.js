import { describe, expect, it } from 'vitest';
import { dateAtAge, isLocked, openBy, parseLock, timeUntil, unlockText } from '@utils/letters';

const day = (d) => new Date(`${d}T12:00:00Z`);
// 25 October 2026 at 23:30 in Mexico City is already the 26th in UTC.
const lateEvening = new Date('2026-10-26T05:30:00Z');

describe('isLocked', () => {
  it('stays sealed until its day arrives in Mexico City, then opens all day', () => {
    const letter = { unlockAt: day('2026-10-26') };
    expect(isLocked(letter, lateEvening)).toBe(true);
    expect(isLocked(letter, new Date('2026-10-26T06:00:00Z'))).toBe(false); // midnight in Mexico City
    expect(isLocked(letter, new Date('2027-01-01T00:00:00Z'))).toBe(false);
  });

  it('never locks an ordinary memory', () => {
    expect(isLocked({}, lateEvening)).toBe(false);
    expect(isLocked(null, lateEvening)).toBe(false);
  });

  it('openBy matches isLocked for queries', () => {
    const boundary = openBy(lateEvening);
    expect(boundary.toISOString()).toBe('2026-10-25T12:00:00.000Z');
    expect(isLocked({ unlockAt: boundary }, lateEvening)).toBe(false);
  });
});

describe('dateAtAge', () => {
  it('is the birthday that year, and 1 March for a 29 February birthday in a common year', () => {
    expect(dateAtAge(day('2023-05-15'), 15).toISOString()).toBe('2038-05-15T12:00:00.000Z');
    expect(dateAtAge(day('2024-02-29'), 1).toISOString()).toBe('2025-03-01T12:00:00.000Z');
  });
});

describe('parseLock', () => {
  const now = new Date('2026-10-25T18:00:00Z');
  const birth = day('2023-05-15');

  it('no lock is fine', () => {
    for (const none of [undefined, null, '']) expect(parseLock(none, birth, now)).toEqual({ unlockAt: null, lockAge: null });
  });

  it('seals until a future day, or until an age from the birth date', () => {
    expect(parseLock({ until: '2039-03-12' }, birth, now)).toEqual({ unlockAt: day('2039-03-12'), lockAge: null });
    expect(parseLock({ age: 15 }, birth, now)).toEqual({ unlockAt: day('2038-05-15'), lockAge: 15 });
  });

  it.each([
    ['today', { until: '2026-10-25' }, 'día futuro'],
    ['a day that is not real', { until: '2030-02-30' }, 'no es válida'],
    ['an age he already turned', { age: 3 }, 'Carlo ya cumplió 3'],
    ['an age that is not a whole number', { age: 15.5 }, 'entre 1 y 30'],
    ['an age over 30', { age: 31 }, 'entre 1 y 30'],
    ['a lock that is not an object', 'pronto', 'Solicitud inválida'],
  ])('refuses %s', (_label, lock, message) => {
    expect(parseLock(lock, birth, now).error).toContain(message);
  });

  it('needs the birth date to seal until an age', () => {
    expect(parseLock({ age: 15 }, null, now).error).toContain('fecha de nacimiento');
  });
});

describe('what the envelope says', () => {
  const now = new Date('2026-10-25T18:00:00Z');
  it('counts years, months or days until it opens', () => {
    expect(timeUntil(day('2039-03-12'), now)).toBe('en 12 años');
    expect(timeUntil(day('2027-01-30'), now)).toBe('en 3 meses');
    expect(timeUntil(day('2026-11-05'), now)).toBe('en 11 días');
    expect(timeUntil(day('2026-10-26'), now)).toBe('mañana');
  });

  it('names the day, and the age when it was sealed until one', () => {
    expect(unlockText({ unlockAt: day('2039-03-12') }, now)).toBe('Se abre el 12 de marzo de 2039, en 12 años');
    expect(unlockText({ unlockAt: day('2038-05-15'), lockAge: 15 }, now)).toBe('Se abre cuando cumplas 15, el 15 de mayo de 2038 (en 11 años)');
  });
});
