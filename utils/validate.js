import { isFutureDay, parseDay } from '@utils/dates';
import { parseMilestone } from '@utils/milestones';

export const MAX_MEMORY_LENGTH = 5000;
export const MAX_TAG_LENGTH = 50;

// A 'YYYY-MM-DD' day that is real and not in the future. Empty means none.
// Returns { date } (null for none) or { error } with a message for the user.
export const parsePastDay = (value, now = new Date()) => {
  if (value === undefined || value === null || value === '') return { date: null };
  const date = parseDay(value);
  if (!date) return { error: 'La fecha no es válida' };
  if (isFutureDay(value, now)) return { error: 'La fecha no puede ser en el futuro' };
  return { date };
};

// Returns { memory, tag, happenedAt, milestone } on success, or { error } with a
// message for the user. happenedAt is null when the author did not say when it
// happened; milestone is '' for an ordinary memory.
export const parseMemoryInput = (body, now = new Date()) => {
  const memory = typeof body?.memory === 'string' ? body.memory.trim() : '';
  const tag = typeof body?.tag === 'string' ? body.tag.trim() : '';

  if (!memory || !tag) {
    return { error: 'El recuerdo y la categoría son obligatorios' };
  }
  if (memory.length > MAX_MEMORY_LENGTH || tag.length > MAX_TAG_LENGTH) {
    return { error: 'El texto es demasiado largo' };
  }
  const happened = parsePastDay(body.happenedAt, now);
  if (happened.error) return { error: happened.error };
  const first = parseMilestone(body.milestone);
  if (first.error) return { error: first.error };
  return { memory, tag, happenedAt: happened.date, milestone: first.milestone };
};

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
