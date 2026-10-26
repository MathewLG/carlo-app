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

// What a session sees of each memory: no author, no files, only the start
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

// Memories not in a named moment yet: one event per calendar month.
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

// Checks the groups named in a Claude Code session before they are saved:
// short non-empty titles, ids of memories that exist, each id at most once.
// Groups may cover only some memories; the rest stay grouped by month.
// Returns an error message, or null when they are fine.
export const checkGroups = (groups, memoryIds) => {
  if (!Array.isArray(groups) || groups.length === 0) return 'There are no groups.';
  const known = new Set(memoryIds.map(String));
  const seen = new Set();
  for (const group of groups) {
    const title = typeof group?.title === 'string' ? group.title.trim() : '';
    if (!title) return 'A group has no title.';
    if (title.length > MAX_TITLE_LENGTH) return `"${title}" is over ${MAX_TITLE_LENGTH} characters.`;
    if (!Array.isArray(group.memoryIds) || group.memoryIds.length === 0) return `"${title}" has no memories.`;
    for (const id of group.memoryIds.map(String)) {
      if (!known.has(id)) return `"${title}" names a memory that does not exist: ${id}.`;
      if (seen.has(id)) return `Memory ${id} is in two groups.`;
      seen.add(id);
    }
  }
  return null;
};

// The events to keep when a session's groups are saved: events the admin
// edited stay as they are, earlier session events lose the memories that
// were regrouped, and each group becomes a new event named in the session.
// Returns { keptEvents } or { error } when a group takes a memory out of an
// event the admin edited.
export const withSessionGroups = (events, groups) => {
  const regrouped = new Set(groups.flatMap((g) => g.memoryIds.map(String)));
  const locked = events.filter((e) => e.locked);
  const taken = locked.find((e) => e.memoryIds.some((id) => regrouped.has(String(id))));
  if (taken) return { error: `"${taken.title}" was edited by the admin; leave its memories out.` };
  const named = events
    .filter((e) => !e.locked && e.source === 'claude')
    .map((e) => ({ ...e, memoryIds: e.memoryIds.map(String).filter((id) => !regrouped.has(id)) }));
  const added = groups.map((g) => ({ title: g.title.trim(), memoryIds: g.memoryIds.map(String), source: 'claude', locked: false }));
  return { keptEvents: [...locked, ...named, ...added] };
};

const span = (memoryIds, dayById) => {
  const days = memoryIds.map((id) => dayById.get(id)).sort();
  return { startDay: days[0], endDay: days.at(-1) };
};

// A first word's moment, speaking to Carlo.
export const firstWordTitle = (word) => `Dijiste «${word}»`;

// The whole timeline, in order. Kept events (the admin's edits and moments
// named in a session) stay as they are, minus memories that no longer
// exist; every milestone memory not in one becomes its own event; the rest
// are grouped by month until the next session names them. Each first word
// from the dictionary is a moment of its own.
// Returns [{ title, memoryIds, wordIds?, startDay, endDay, source, locked }].
export const planTimeline = ({ memories, keptEvents = [], birthDate = null, firstWords = [] }) => {
  const items = timelineItems(memories, birthDate);
  const dayById = new Map(items.map((i) => [i.id, i.day]));
  const events = [];
  const placed = new Set();

  // The admin's edits go first, so they win for a memory in two events.
  const lockedFirst = [...keptEvents].sort((a, b) => Number(Boolean(b.locked)) - Number(Boolean(a.locked)));
  for (const kept of lockedFirst) {
    const memoryIds = kept.memoryIds.map(String).filter((id) => dayById.has(id) && !placed.has(id));
    if (!memoryIds.length) continue;
    memoryIds.forEach((id) => placed.add(id));
    events.push({ title: kept.title, memoryIds, ...span(memoryIds, dayById), source: kept.source, locked: Boolean(kept.locked) });
  }

  for (const item of items) {
    if (!item.milestone || placed.has(item.id)) continue;
    placed.add(item.id);
    events.push({ title: milestoneTitle(item.milestone), memoryIds: [item.id], ...span([item.id], dayById), source: 'hito', locked: false });
  }

  for (const g of groupByMonth(items.filter((i) => !placed.has(i.id)))) {
    events.push({ title: g.title, memoryIds: g.memoryIds, ...span(g.memoryIds, dayById), source: 'mes', locked: false });
  }

  for (const w of firstWords) {
    const day = toDayString(new Date(w.saidAt));
    events.push({ title: firstWordTitle(w.word), memoryIds: [], wordIds: [String(w._id)], startDay: day, endDay: day, source: 'palabra', locked: false });
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
