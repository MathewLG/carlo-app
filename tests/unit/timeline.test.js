import { describe, expect, it } from 'vitest';
import { ageMarkers, checkGroups, groupByMonth, planTimeline, timelineItems, withSessionGroups } from '@utils/timeline';
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
  it('keeps named moments, makes each first time its own event, and groups the rest by month', () => {
    const events = planTimeline({
      memories,
      keptEvents: [{ title: 'Tu primer cumpleaños', memoryIds: ['a', 'b'], source: 'claude' }],
    });

    expect(events).toEqual([
      { title: 'Tu primer cumpleaños', memoryIds: ['a', 'b'], startDay: '2024-05-15', endDay: '2024-05-16', source: 'claude', locked: false },
      { title: 'Tus primeros pasos', memoryIds: ['c'], startDay: '2024-07-02', endDay: '2024-07-02', source: 'hito', locked: false },
      { title: 'Diciembre de 2024', memoryIds: ['d'], startDay: '2024-12-24', endDay: '2024-12-24', source: 'mes', locked: false },
    ]);
  });

  it('groups everything by month before any session has named a moment', () => {
    expect(planTimeline({ memories }).map((e) => [e.title, e.source])).toEqual([
      ['Mayo de 2024', 'mes'],
      ['Tus primeros pasos', 'hito'],
      ['Diciembre de 2024', 'mes'],
    ]);
  });

  it('keeps events the admin edited exactly, minus deleted memories, and they win over a session name', () => {
    const events = planTimeline({
      memories,
      keptEvents: [
        { title: 'Fiesta', memoryIds: ['a'], source: 'claude' },
        { title: 'La gran fiesta', memoryIds: ['a', 'b', 'gone'], source: 'claude', locked: true },
      ],
    });
    expect(events[0]).toEqual({
      title: 'La gran fiesta', memoryIds: ['a', 'b'], startDay: '2024-05-15', endDay: '2024-05-16', source: 'claude', locked: true,
    });
    expect(events.map((e) => e.title)).not.toContain('Fiesta');
  });

  it('drops a kept event whose memories were all deleted', () => {
    const events = planTimeline({ memories: [memory('d', '2024-12-24')], keptEvents: [{ title: 'Vacío', memoryIds: ['gone'], source: 'claude' }] });
    expect(events.map((e) => e.title)).toEqual(['Diciembre de 2024']);
  });

  it('gives each first word from the dictionary its own moment, in date order', () => {
    const events = planTimeline({ memories: [memories[3]], firstWords: [{ _id: 'w1', word: 'awa', saidAt: day('2024-08-01') }] });
    expect(events).toEqual([
      { title: 'Dijiste «awa»', memoryIds: [], wordIds: ['w1'], startDay: '2024-08-01', endDay: '2024-08-01', source: 'palabra', locked: false },
      { title: 'Diciembre de 2024', memoryIds: ['d'], startDay: '2024-12-24', endDay: '2024-12-24', source: 'mes', locked: false },
    ]);
  });

  it('leaves sealed letters out until they open, then places them on the day they open', () => {
    const letter = memory('l', '2024-01-01', { unlockAt: day('2030-06-01') });
    const before = planTimeline({ memories: [letter], now: new Date('2030-05-31T18:00:00Z') });
    expect(before).toEqual([]);
    const after = planTimeline({ memories: [letter], now: new Date('2030-06-01T18:00:00Z') });
    expect(after.map((e) => [e.title, e.startDay])).toEqual([['Junio de 2030', '2030-06-01']]);
  });

  it('returns nothing for no memories', () => {
    expect(planTimeline({ memories: [] })).toEqual([]);
  });
});

describe('checkGroups', () => {
  const ids = ['a', 'b', 'd'];
  it('accepts groups that cover only some memories', () => {
    expect(checkGroups([{ title: ' Tu fiesta ', memoryIds: ['a', 'b'] }], ids)).toBeNull();
  });

  it.each([
    ['no groups', [], 'There are no groups.'],
    ['not a list', { title: 'X' }, 'There are no groups.'],
    ['an empty title', [{ title: '  ', memoryIds: ['a'] }], 'A group has no title.'],
    ['a title over 60 characters', [{ title: 'x'.repeat(61), memoryIds: ['a'] }], 'is over 60 characters'],
    ['an empty group', [{ title: 'X', memoryIds: [] }], '"X" has no memories.'],
    ['an unknown id', [{ title: 'X', memoryIds: ['zzz'] }], 'does not exist: zzz'],
    ['a memory twice', [{ title: 'X', memoryIds: ['a'] }, { title: 'Y', memoryIds: ['a'] }], 'Memory a is in two groups.'],
  ])('refuses %s', (_label, groups, message) => {
    expect(checkGroups(groups, ids)).toContain(message);
  });
});

describe('withSessionGroups', () => {
  const events = [
    { title: 'La gran fiesta', memoryIds: ['a'], source: 'claude', locked: true },
    { title: 'Navidad', memoryIds: ['d', 'e'], source: 'claude', locked: false },
  ];

  it('takes regrouped memories out of earlier session moments and adds the new ones', () => {
    const { keptEvents } = withSessionGroups(events, [{ title: ' Tu Navidad ', memoryIds: ['d', 'f'] }]);
    expect(keptEvents).toEqual([
      events[0],
      { title: 'Navidad', memoryIds: ['e'], source: 'claude', locked: false },
      { title: 'Tu Navidad', memoryIds: ['d', 'f'], source: 'claude', locked: false },
    ]);
  });

  it("refuses a group that takes a memory from the admin's edited moment", () => {
    expect(withSessionGroups(events, [{ title: 'X', memoryIds: ['a'] }]).error).toContain('La gran fiesta');
  });
});

describe('groupByMonth', () => {
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
