import { dayParts } from '@utils/dates';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const DAY_MS = 24 * 60 * 60 * 1000;

// Carlo's age on a date, in Spanish: "Carlo tenía 12 días", "7 meses",
// "1 año y 3 meses", "4 años". Null when the birth date is not set.
export const ageAt = (birthDate, date) => {
  if (!birthDate || !date) return null;
  const birth = dayParts(new Date(birthDate));
  const then = dayParts(new Date(date));

  const birthDay = Date.UTC(birth.year, birth.month - 1, birth.day);
  const thenDay = Date.UTC(then.year, then.month - 1, then.day);
  if (thenDay < birthDay) return 'Antes de nacer';
  if (thenDay === birthDay) return 'El día que nació Carlo';

  // Whole months, counting a month only once its day of the month is reached.
  const months = (then.year - birth.year) * 12 + (then.month - birth.month) - (then.day < birth.day ? 1 : 0);
  if (months < 1) return `Carlo tenía ${plural(Math.round((thenDay - birthDay) / DAY_MS), 'día', 'días')}`;
  if (months < 12) return `Carlo tenía ${plural(months, 'mes', 'meses')}`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years < 2 && rest > 0) return `Carlo tenía 1 año y ${plural(rest, 'mes', 'meses')}`;
  return `Carlo tenía ${plural(years, 'año', 'años')}`;
};
