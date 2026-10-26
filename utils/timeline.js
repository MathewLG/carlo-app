import { ageAt } from '@utils/age';
import { memoryDate } from '@utils/format';
import { toDayString } from '@utils/dates';
import { milestoneTitle } from '@utils/milestones';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
export const MAX_TITLE_LENGTH = 60;
const PREVIEW_LENGTH = 300;

// What the namer sees of each memory: no author, no files, only the start
// of the text, the day and Carlo's age.
export const timelineItems = (memories, birthDate) =>
  memories.map((m) => {
    const date = memoryDate(m);
    return {
      id: String(m._id),
      day: toDayString(date),
      age: ageAt(birthDate, date),
      tag: m.tag,
      milestone: m.milestone || undefined,
      text: m.memory.length > PREVIEW_LENGTH ? `${m.memory.slice(0, PREVIEW_LENGTH)}…` : m.memory,
    };
  });

// Used when Claude is not available: one event per calendar month.
export const groupByMonth = (items) => {
  const months = new Map();
  for (const item of [...items].sort((a, b) => a.day.localeCompare(b.day))) {
    const key = item.day.slice(0, 7);
    if (!months.has(key)) {
      const [year, month] = key.split('-').map(Number);
      months.set(key, { title: `${MONTHS[month - 1]} de ${year}`, memoryIds: [] });
    }
    months.get(key).memoryIds.push(item.id);
  }
  return [...months.values()];
};

// Claude's answer is only used if it accounts for every memory exactly once,
// with short non-empty titles. Anything else falls back to months.
export const isValidGrouping = (groups, items) => {
  if (!Array.isArray(groups) || groups.length === 0) return false;
  const expected = new Set(items.map((i) => i.id));
  const seen = new Set();
  for (const group of groups) {
    const title = typeof group?.title === 'string' ? group.title.trim() : '';
    if (!title || title.length > MAX_TITLE_LENGTH) return false;
    if (!Array.isArray(group.memoryIds) || group.memoryIds.length === 0) return false;
    for (const id of group.memoryIds) {
      if (!expected.has(id) || seen.has(id)) return false;
      seen.add(id);
    }
  }
  return seen.size === expected.size;
};

const span = (memoryIds, dayById) => {
  const days = memoryIds.map((id) => dayById.get(id)).sort();
  return { startDay: days[0], endDay: days.at(-1) };
};

// The whole timeline, in order. Events the admin touched stay exactly as
// they are (minus memories that no longer exist); every milestone memory not
// in one becomes its own event; the rest are grouped by `group(items)`, which
// returns Claude's groups or null to fall back to months.
// Returns [{ title, memoryIds, startDay, endDay, source, locked }].
export const planTimeline = async ({ memories, lockedEvents = [], birthDate = null, group = async () => null }) => {
  const items = timelineItems(memories, birthDate);
  const dayById = new Map(items.map((i) => [i.id, i.day]));
  const events = [];
  const placed = new Set();

  for (const locked of lockedEvents) {
    const memoryIds = locked.memoryIds.map(String).filter((id) => dayById.has(id) && !placed.has(id));
    if (!memoryIds.length) continue;
    memoryIds.forEach((id) => placed.add(id));
    events.push({ title: locked.title, memoryIds, ...span(memoryIds, dayById), source: locked.source, locked: true });
  }

  for (const item of items) {
    if (!item.milestone || placed.has(item.id)) continue;
    placed.add(item.id);
    events.push({ title: milestoneTitle(item.milestone), memoryIds: [item.id], ...span([item.id], dayById), source: 'hito', locked: false });
  }

  const rest = items.filter((i) => !placed.has(i.id));
  if (rest.length) {
    let groups = null;
    try {
      groups = await group(rest);
    } catch {
      groups = null;
    }
    const valid = isValidGrouping(groups, rest);
    for (const g of valid ? groups : groupByMonth(rest)) {
      events.push({
        title: g.title.trim(),
        memoryIds: g.memoryIds,
        ...span(g.memoryIds, dayById),
        source: valid ? 'claude' : 'mes',
        locked: false,
      });
    }
  }

  return events.sort((a, b) => a.startDay.localeCompare(b.startDay) || a.endDay.localeCompare(b.endDay));
};

// Signposts along the path: birth, 6 months, then each birthday, placed
// before the first event that starts on or after them. Several can land
// before the same event; they show in order. A signpost after the last
// event is left out, since nothing has happened there yet.
// Returns [{ beforeIndex, label }].
export const ageMarkers = (events, birthDate) => {
  if (!birthDate || !events.length) return [];
  const birth = toDayString(new Date(birthDate));
  const [by, bm, bd] = birth.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = events.at(-1).endDay;
  const marks = [{ day: birth, label: 'Naciste' }];
  const half = new Date(Date.UTC(by, bm - 1 + 6, bd));
  marks.push({ day: `${half.getUTCFullYear()}-${pad(half.getUTCMonth() + 1)}-${pad(half.getUTCDate())}`, label: '6 meses' });
  for (let years = 1; `${by + years}-${pad(bm)}-${pad(bd)}` <= lastDay; years += 1) {
    marks.push({ day: `${by + years}-${pad(bm)}-${pad(bd)}`, label: years === 1 ? '1 año' : `${years} años` });
  }
  return marks
    .map((mark) => ({ label: mark.label, beforeIndex: events.findIndex((e) => e.startDay >= mark.day) }))
    .filter((mark) => mark.beforeIndex !== -1);
};
