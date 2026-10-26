import { todayString, toDayString } from '@utils/dates';
import { dateAtAge, MAX_LOCK_AGE } from '@utils/letters';

// Carlo's own account: read-only, and only from the day the family chose.
// Who is Carlo comes from one saved email (settings.carloEmail), so only one
// account can ever hold the role.

export const DEFAULT_ACCESS_AGE = 15;
export const MAX_ACCESS_AGE = MAX_LOCK_AGE;
export const MAX_WELCOME_LENGTH = 5000;
// auto: opens on his birthday at the access age · open: opened early · paused
export const ACCESS_MODES = ['auto', 'open', 'paused'];

export const DEFAULT_WELCOME = `Hola, Carlo.

Desde que naciste, tu familia fue guardando aquí lo que vivimos contigo: lo que dijiste, lo que nos hiciste reír, las fiestas, los primeros pasos y muchas cartas para ti.

Ahora todo esto es tuyo. Empieza por el principio, el día que naciste, y ve a tu ritmo.

Te queremos mucho.`;

export const isCarloEmail = (settings, email) =>
  Boolean(settings?.carloEmail && email) && email.toLowerCase() === settings.carloEmail;

// The day his access opens on its own, or null without a birth date.
export const accessDay = (settings) =>
  settings?.carloBirthDate ? dateAtAge(settings.carloBirthDate, settings.carloAccessAge ?? DEFAULT_ACCESS_AGE) : null;

export const carloAccessOpen = (settings, now = new Date()) => {
  if (!settings?.carloEmail) return false;
  const mode = settings.carloAccess ?? 'auto';
  if (mode === 'paused') return false;
  if (mode === 'open') return true;
  const day = accessDay(settings);
  return Boolean(day) && toDayString(day) <= todayString(now);
};
