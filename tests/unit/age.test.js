import { describe, expect, it } from 'vitest';
import { ageAt } from '@utils/age';
import { parseDay } from '@utils/dates';

const born = parseDay('2023-05-15');
const on = (day) => parseDay(day);

describe('ageAt', () => {
  it.each([
    ['2023-05-27', 'Carlo tenía 12 días'],
    ['2023-05-16', 'Carlo tenía 1 día'],
    ['2023-06-15', 'Carlo tenía 1 mes'],
    ['2023-12-20', 'Carlo tenía 7 meses'],
    ['2024-05-15', 'Carlo tenía 1 año'],
    ['2024-08-20', 'Carlo tenía 1 año y 3 meses'],
    ['2024-06-15', 'Carlo tenía 1 año y 1 mes'],
    ['2025-05-15', 'Carlo tenía 2 años'],
    ['2027-11-01', 'Carlo tenía 4 años'],
  ])('on %s says "%s"', (day, text) => {
    expect(ageAt(born, on(day))).toBe(text);
  });

  it('counts a month or a year only once its day arrives', () => {
    expect(ageAt(born, on('2023-06-14'))).toBe('Carlo tenía 30 días');
    expect(ageAt(born, on('2024-05-14'))).toBe('Carlo tenía 11 meses');
  });

  it('handles month ends: born on the 31st, a month later is the next month-end day', () => {
    const lastDay = parseDay('2024-01-31');
    expect(ageAt(lastDay, on('2024-02-29'))).toBe('Carlo tenía 29 días');
    expect(ageAt(lastDay, on('2024-03-31'))).toBe('Carlo tenía 2 meses');
  });

  it('handles a leap-day birthday', () => {
    const leap = parseDay('2024-02-29');
    expect(ageAt(leap, on('2025-02-28'))).toBe('Carlo tenía 11 meses');
    expect(ageAt(leap, on('2025-03-01'))).toBe('Carlo tenía 1 año');
  });

  it('marks the day he was born and the days before', () => {
    expect(ageAt(born, on('2023-05-15'))).toBe('El día que nació Carlo');
    expect(ageAt(born, on('2023-02-01'))).toBe('Antes de nacer');
  });

  it('uses the Mexico City day of a timestamp, not the UTC day', () => {
    // 03:00 UTC on May 16 is still 21:00 on May 15 in Mexico City.
    expect(ageAt(born, new Date('2023-05-16T03:00:00Z'))).toBe('El día que nació Carlo');
  });

  it('accepts the birth date as text, as the API sends it', () => {
    expect(ageAt('2023-05-15T12:00:00.000Z', on('2023-12-20'))).toBe('Carlo tenía 7 meses');
  });

  it('shows nothing until the birth date is set', () => {
    expect(ageAt(null, on('2023-12-20'))).toBeNull();
    expect(ageAt(born, null)).toBeNull();
  });
});
