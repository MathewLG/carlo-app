import { describe, expect, it, vi } from 'vitest';
import { ageMarkers, groupByMonth, isValidGrouping, planTimeline, timelineItems } from '@utils/timeline';
import { milestoneTitle, parseMilestone } from '@utils/milestones';

const day = (d) => new Date(`${d}T12:00:00Z`);
const memory = (id, d, extra = {}) => ({ _id: id, memory: `Recuerdo ${id}`, tag: '#r', happenedAt: day(d), ...extra });

const memories = [
  memory('a', '2024-05-15', { memory: 'Tu fiesta de cumpleaños' }),
  memory('b', '2024-05-16', { memory: 'Abriste los regalos' }),
  memory('c', '2024-07-02', { milestone: 'Primeros pasos' }),
  memory('d', '2024-12-24'),
];

describe('timelineItems', () => {
  it('sends only the day, age, tag, milestone and the start of the text', () => {
    const [item] = timelineItems([memory('x', '2024-05-15', { memory: 'a'.repeat(400), creator: 'secret' })], day('2023-05-15'));
    expect(item).toEqual({ id: 'x', day: '2024-05-15', age: 'Carlo tenía 1 año', tag: '#r', milestone: undefined, text: `${'a'.repeat(300)}…` });
  });
});

describe('planTimeline', () => {
  it("uses Claude's groups and names when they account for every memory", async () => {
    const group = vi.fn(async () => [
      { title: ' Tu primer cumpleaños ', memoryIds: ['a', 'b'] },
      { title: 'Navidad 2024', memoryIds: ['d'] },
    ]);

    const events = await planTimeline({ memories, group });

    expect(events).toEqual([
      { title: 'Tu primer cumpleaños', memoryIds: ['a', 'b'], startDay: '2024-05-15', endDay: '2024-05-16', source: 'claude', locked: false },
      { title: 'Tus primeros pasos', memoryIds: ['c'], startDay: '2024-07-02', endDay: '2024-07-02', source: 'hito', locked: false },
      { title: 'Navidad 2024', memoryIds: ['d'], startDay: '2024-12-24', endDay: '2024-12-24', source: 'claude', locked: false },
    ]);
    // A milestone memory is its own event, so Claude never sees it.
    expect(group.mock.calls[0][0].map((i) => i.id)).toEqual(['a', 'b', 'd']);
  });

  it.each([
    ['nothing', null],
    ['a memory left out', [{ title: 'X', memoryIds: ['a', 'b'] }]],
    ['a memory twice', [{ title: 'X', memoryIds: ['a', 'b', 'd'] }, { title: 'Y', memoryIds: ['d'] }]],
    ['an unknown id', [{ title: 'X', memoryIds: ['a', 'b', 'd', 'zzz'] }]],
    ['an empty title', [{ title: '  ', memoryIds: ['a', 'b', 'd'] }]],
  ])('falls back to months when Claude returns %s', async (_label, answer) => {
    const events = await planTimeline({ memories, group: async () => answer });
    expect(events.filter((e) => e.source !== 'hito').map((e) => [e.title, e.source])).toEqual([
      ['Mayo de 2024', 'mes'],
      ['Diciembre de 2024', 'mes'],
    ]);
  });

  it('falls back to months when Claude throws', async () => {
    const events = await planTimeline({ memories, group: async () => { throw new Error('down'); } });
    expect(events.map((e) => e.source)).toEqual(['mes', 'hito', 'mes']);
  });

  it('keeps events the admin edited exactly, and never sends their memories to Claude', async () => {
    const group = vi.fn(async (items) => [{ title: 'Navidad', memoryIds: items.map((i) => i.id) }]);
    const events = await planTimeline({
      memories,
      lockedEvents: [{ title: 'La gran fiesta', memoryIds: ['a', 'b', 'gone'], source: 'claude' }],
      group,
    });
    expect(events[0]).toEqual({
      title: 'La gran fiesta', memoryIds: ['a', 'b'], startDay: '2024-05-15', endDay: '2024-05-16', source: 'claude', locked: true,
    });
    expect(group.mock.calls[0][0].map((i) => i.id)).toEqual(['d']);
  });

  it('drops an edited event whose memories were all deleted', async () => {
    const events = await planTimeline({ memories: [memory('d', '2024-12-24')], lockedEvents: [{ title: 'Vacío', memoryIds: ['gone'], source: 'claude' }] });
    expect(events.map((e) => e.title)).toEqual(['Diciembre de 2024']);
  });

  it('returns nothing for no memories, without asking Claude', async () => {
    const group = vi.fn();
    expect(await planTimeline({ memories: [], group })).toEqual([]);
    expect(group).not.toHaveBeenCalled();
  });
});

describe('isValidGrouping and groupByMonth', () => {
  const items = timelineItems(memories.slice(0, 2), null);
  it('rejects titles over 60 characters and empty groups', () => {
    expect(isValidGrouping([{ title: 'x'.repeat(61), memoryIds: ['a', 'b'] }], items)).toBe(false);
    expect(isValidGrouping([{ title: 'X', memoryIds: [] }, { title: 'Y', memoryIds: ['a', 'b'] }], items)).toBe(false);
    expect(isValidGrouping([], items)).toBe(false);
  });

  it('groups by calendar month in order', () => {
    expect(groupByMonth(timelineItems([memory('z', '2025-01-03'), memory('y', '2024-11-30'), memory('x', '2025-01-20')], null))).toEqual([
      { title: 'Noviembre de 2024', memoryIds: ['y'] },
      { title: 'Enero de 2025', memoryIds: ['z', 'x'] },
    ]);
  });
});

describe('ageMarkers', () => {
  const events = [
    { startDay: '2023-04-01', endDay: '2023-04-01' }, // before birth
    { startDay: '2023-05-20', endDay: '2023-05-20' },
    { startDay: '2024-01-10', endDay: '2024-01-10' },
    { startDay: '2025-06-01', endDay: '2025-06-01' },
  ];

  it('places birth, 6 months and each birthday before the first moment after them', () => {
    expect(ageMarkers(events, day('2023-05-15'))).toEqual([
      { label: 'Naciste', beforeIndex: 1 },
      { label: '6 meses', beforeIndex: 2 },
      { label: '1 año', beforeIndex: 3 },
      { label: '2 años', beforeIndex: 3 },
    ]);
  });

  it('shows no signposts without a birth date or moments', () => {
    expect(ageMarkers(events, null)).toEqual([]);
    expect(ageMarkers([], day('2023-05-15'))).toEqual([]);
  });
});

describe('milestones', () => {
  it('names listed milestones speaking to Carlo, and keeps the family’s own words', () => {
    expect(milestoneTitle('Primera palabra')).toBe('Tu primera palabra');
    expect(milestoneTitle('Primera vez en el mar')).toBe('Primera vez en el mar');
  });

  it('accepts none, trims, and refuses long or non-text values', () => {
    expect(parseMilestone(undefined)).toEqual({ milestone: '' });
    expect(parseMilestone('  Primer diente ')).toEqual({ milestone: 'Primer diente' });
    expect(parseMilestone('x'.repeat(61)).error).toBeDefined();
    expect(parseMilestone(5).error).toBeDefined();
  });
});
