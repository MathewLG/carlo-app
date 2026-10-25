import { TIME_ZONE } from '@utils/dates';

// The day the memory happened when the author gave one; otherwise the day it
// was written. Older memories have no createdAt, but a MongoDB _id starts
// with the creation time in seconds, so it works as a fallback.
export const memoryDate = (memory) => {
  if (memory.happenedAt) return new Date(memory.happenedAt);
  if (memory.createdAt) return new Date(memory.createdAt);
  return new Date(parseInt(String(memory._id).substring(0, 8), 16) * 1000);
};

export const formatDate = (date) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE }).format(
    date,
  );
