import { dayParts, parseDay, todayString, toDayString } from '@utils/dates';
import { formatDate } from '@utils/format';

// Cartas con candado: a memory with `unlockAt` stays sealed until that day
// arrives in Mexico City. Checked on every request, so a letter opens on time
// even if the daily job does not run.

export const MAX_LOCK_AGE = 30;

export const isLocked = (memory, now = new Date()) =>
  Boolean(memory?.unlockAt) && toDayString(new Date(memory.unlockAt)) > todayString(now);

// Unlock days are stored at noon UTC, so a letter is open once its unlockAt
// is at or before noon UTC of today's date in Mexico City. For queries.
export const openBy = (now = new Date()) => parseDay(todayString(now));

// The day Carlo turns `age`. A 29 February birthday falls on 1 March in
// years without one.
export const dateAtAge = (birthDate, age) => {
  const birth = dayParts(new Date(birthDate));
  return new Date(Date.UTC(birth.year + age, birth.month - 1, birth.day, 12));
};

// The lock part of a memory form: none, { until: 'YYYY-MM-DD' } or
// { age: 15 }. The day must be in the future. Returns { unlockAt, lockAge }
// (both null for no lock) or { error } with a message for the user.
export const parseLock = (lock, birthDate, now = new Date()) => {
  if (lock === undefined || lock === null || lock === '') return { unlockAt: null, lockAge: null };
  if (typeof lock !== 'object') return { error: 'Solicitud inválida' };

  let unlockAt;
  let lockAge = null;
  if (lock.age !== undefined) {
    if (!Number.isInteger(lock.age) || lock.age < 1 || lock.age > MAX_LOCK_AGE) {
      return { error: `La edad debe ser un número entre 1 y ${MAX_LOCK_AGE}` };
    }
    if (!birthDate) return { error: 'Para cerrar hasta una edad, primero hay que guardar la fecha de nacimiento de Carlo' };
    unlockAt = dateAtAge(birthDate, lock.age);
    lockAge = lock.age;
  } else {
    unlockAt = parseDay(lock.until);
    if (!unlockAt) return { error: 'La fecha para abrir la carta no es válida' };
  }
  if (toDayString(unlockAt) <= todayString(now)) {
    return { error: lockAge ? `Carlo ya cumplió ${lockAge}; elige una edad que todavía no tenga` : 'La carta tiene que abrirse en un día futuro' };
  }
  return { unlockAt, lockAge };
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// "en 13 años", "en 2 meses", "mañana": how long until the letter opens.
export const timeUntil = (unlockAt, now = new Date()) => {
  const to = dayParts(new Date(unlockAt));
  const from = dayParts(now);
  const months = (to.year - from.year) * 12 + (to.month - from.month) - (to.day < from.day ? 1 : 0);
  if (months >= 12) return `en ${plural(Math.floor(months / 12), 'año', 'años')}`;
  if (months >= 1) return `en ${plural(months, 'mes', 'meses')}`;
  const days = Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86400000);
  return days <= 1 ? 'mañana' : `en ${days} días`;
};

// What the envelope says: "Se abre el 12 de marzo de 2039, en 13 años",
// or "Se abre cuando cumplas 15, el …" for a letter sealed until an age.
export const unlockText = (memory, now = new Date()) => {
  const day = formatDate(new Date(memory.unlockAt));
  const when = timeUntil(memory.unlockAt, now);
  return memory.lockAge ? `Se abre cuando cumplas ${memory.lockAge}, el ${day} (${when})` : `Se abre el ${day}, ${when}`;
};
