import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getTimeline } from '@/app/api/timeline/route';
import { POST as reorganize } from '@/app/api/timeline/rebuild/route';
import { PATCH as editEvent } from '@/app/api/timeline/events/[id]/route';
import { POST as createMemory } from '@/app/api/memory/new/route';
import { DELETE as deleteMemory, PATCH as editMemory } from '@/app/api/memory/[id]/route';
import { runAfterResponse } from '@utils/background';
import { rebuildTimeline, REBUILD_EVERY_MS } from '@utils/timelineBuild';
import Event from '@models/event';
import Settings from '@models/settings';
import { makeAdmin, makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, routeParams, signInAs, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

const day = (d) => new Date(`${d}T12:00:00Z`);

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(async () => {
  await clearDatabase();
  vi.mocked(runAfterResponse).mockClear();
});
afterEach(() => vi.useRealTimers());

const timeline = async () => (await getTimeline()).json();
const patchEvent = (id, body) => editEvent(request(`/api/timeline/events/${id}`, { method: 'PATCH', body }), routeParams({ id: String(id) }));

// Three memories: two at a birthday party, one at Christmas.
const seed = async () => {
  const rosa = await makeUser({ username: 'abuelarosa' });
  const party = await makeMemory(rosa, { memory: 'Tu fiesta', happenedAt: day('2024-05-15') });
  const gifts = await makeMemory(rosa, { memory: 'Los regalos', happenedAt: day('2024-05-16') });
  const xmas = await makeMemory(rosa, { memory: 'Navidad', happenedAt: day('2024-12-24') });
  return { rosa, party, gifts, xmas };
};
// Moments as a Claude Code session saves them (scripts/timeline.mjs).
const nameInSession = ({ party, gifts, xmas }) =>
  Event.insertMany([
    { title: 'Tu primer cumpleaños', memoryIds: [party._id, gifts._id], startDay: '2024-05-15', endDay: '2024-05-16', source: 'claude' },
    { title: 'Navidad 2024', memoryIds: [xmas._id], startDay: '2024-12-24', endDay: '2024-12-24', source: 'claude' },
  ]);

describe('rebuilding', () => {
  it('keeps the moments named in a session, and the family reads them with their memories', async () => {
    const m = await seed();
    await nameInSession(m);
    expect(await rebuildTimeline()).toBe(true);

    signInAs(m.rosa);
    const json = await timeline();
    expect(json.updating).toBe(false);
    expect(json.events.map((e) => [e.title, e.startDay, e.endDay, e.source])).toEqual([
      ['Tu primer cumpleaños', '2024-05-15', '2024-05-16', 'claude'],
      ['Navidad 2024', '2024-12-24', '2024-12-24', 'claude'],
    ]);
    expect(json.events[0].memories.map((x) => x.memory)).toEqual(['Tu fiesta', 'Los regalos']);
    expect(json.events[0].memories[0].creator.username).toBe('abuelarosa');
  });

  it('groups by month before any session has named a moment', async () => {
    await seed();
    await rebuildTimeline();
    expect((await Event.find().sort({ startDay: 1 })).map((e) => e.title)).toEqual(['Mayo de 2024', 'Diciembre de 2024']);
  });

  it('skips when nothing changed, and when the last rebuild was under a minute ago', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));
    await seed();
    expect(await rebuildTimeline()).toBe(true);
    expect(await rebuildTimeline()).toBe(false); // nothing changed

    await Settings.updateOne({ key: 'app' }, { timelineDirty: true });
    expect(await rebuildTimeline()).toBe(false); // too soon
    vi.setSystemTime(new Date(Date.now() + REBUILD_EVERY_MS));
    expect(await rebuildTimeline()).toBe(true);
  });

  it('never runs two rebuilds at once', async () => {
    await seed();
    await Settings.updateOne({ key: 'app' }, { timelineBuildingUntil: new Date(Date.now() + 60_000) }, { upsert: true });
    expect(await rebuildTimeline({ force: true })).toBe(false);
  });

  it('leaves the timeline marked out of date if the rebuild fails', async () => {
    await seed();
    vi.spyOn(Event, 'insertMany').mockRejectedValueOnce(new Error('db down'));
    await expect(rebuildTimeline()).rejects.toThrow('db down');
    const settings = await Settings.findOne();
    expect(settings.timelineDirty).toBe(true);
    expect(settings.timelineBuildingUntil).toBeNull();
  });

  it('puts a new memory in its month until a session names it, and drops a deleted one from its moment', async () => {
    const m = await seed();
    await nameInSession(m);
    await m.gifts.deleteOne();
    await makeMemory(m.rosa, { memory: 'Año nuevo', happenedAt: day('2024-12-31') });
    await rebuildTimeline({ force: true });
    const events = (await Event.find().sort({ startDay: 1 })).map((e) => [e.title, e.memoryIds.length, e.source]);
    expect(events).toEqual([
      ['Tu primer cumpleaños', 1, 'claude'],
      ['Navidad 2024', 1, 'claude'],
      ['Diciembre de 2024', 1, 'mes'],
    ]);
  });

  it('makes each milestone memory its own event', async () => {
    const rosa = await makeUser();
    await makeMemory(rosa, { memory: 'Dijiste agua', milestone: 'Primera palabra', happenedAt: day('2024-02-01') });
    await rebuildTimeline();
    expect((await Event.findOne()).toObject()).toMatchObject({ title: 'Tu primera palabra', source: 'hito' });
  });
});

describe('memory changes mark the timeline out of date', () => {
  it('on writing, editing and deleting a memory, and rebuild after the response', async () => {
    const rosa = await makeUser();
    signInAs(rosa);
    await rebuildTimeline({ force: true });

    const created = await (await createMemory(request('/api/memory/new', { method: 'POST', body: { memory: 'Hola', tag: '#m', milestone: 'Primer diente' } }))).json();
    expect(created.milestone).toBe('Primer diente');
    expect((await Settings.findOne()).timelineDirty).toBe(true);
    expect(runAfterResponse).toHaveBeenCalledTimes(1);

    await Settings.updateOne({ key: 'app' }, { timelineDirty: false });
    await editMemory(request(`/api/memory/${created._id}`, { method: 'PATCH', body: { memory: 'Hola', tag: '#m' } }), routeParams({ id: created._id }));
    expect((await Settings.findOne()).timelineDirty).toBe(true);

    await Settings.updateOne({ key: 'app' }, { timelineDirty: false });
    await deleteMemory(request(`/api/memory/${created._id}`, { method: 'DELETE' }), routeParams({ id: created._id }));
    expect((await Settings.findOne()).timelineDirty).toBe(true);
    expect(runAfterResponse).toHaveBeenCalledTimes(3);
  });

  it('the timeline page asks for a rebuild only when one is due', async () => {
    const { rosa } = await seed();
    signInAs(rosa);
    expect((await timeline()).updating).toBe(true); // brand new: never built
    expect(runAfterResponse).toHaveBeenCalledTimes(1);

    await rebuildTimeline();
    vi.mocked(runAfterResponse).mockClear();
    expect((await timeline()).updating).toBe(false);
    expect(runAfterResponse).not.toHaveBeenCalled();
  });
});

describe("the admin's edits", () => {
  const setup = async () => {
    const m = await seed();
    await nameInSession(m);
    await rebuildTimeline({ force: true });
    const [birthday, christmas] = await Event.find().sort({ startDay: 1 });
    signInAs(await makeAdmin());
    return { ...m, birthday, christmas };
  };

  it('renaming locks the event, and a rebuild keeps it', async () => {
    const { birthday } = await setup();
    expect((await patchEvent(birthday._id, { title: ' La gran fiesta ' })).status).toBe(200);

    await rebuildTimeline({ force: true });

    const titles = (await Event.find().sort({ startDay: 1 })).map((e) => [e.title, e.locked]);
    expect(titles).toEqual([['La gran fiesta', true], ['Navidad 2024', false]]);
  });

  it('merging takes in the other event and spans both', async () => {
    const { birthday, christmas } = await setup();
    await patchEvent(birthday._id, { mergeWith: christmas._id });
    const events = await Event.find();
    expect(events).toHaveLength(1);
    expect(events[0].toObject()).toMatchObject({ startDay: '2024-05-15', endDay: '2024-12-24', locked: true });
  });

  it('moving a memory updates both events, and removes one left empty', async () => {
    const { birthday, christmas, gifts, xmas } = await setup();
    await patchEvent(birthday._id, { moveMemory: String(gifts._id), toEvent: christmas._id });
    expect((await Event.findById(christmas._id)).toObject()).toMatchObject({ startDay: '2024-05-16', locked: true });

    await patchEvent(christmas._id, { moveMemory: String(xmas._id), toEvent: birthday._id });
    await patchEvent(christmas._id, { moveMemory: String(gifts._id), toEvent: birthday._id });
    expect(await Event.findById(christmas._id)).toBeNull();
  });

  it.each([
    ['an empty name', { title: '  ' }, 400],
    ['a name over 60 characters', { title: 'x'.repeat(61) }, 400],
    ['merging with itself', 'self', 400],
    ['moving a memory that is not there', { moveMemory: '65d1a500aaaaaaaaaaaaaaaa', toEvent: 'other' }, 400],
  ])('refuses %s', async (_label, body, status) => {
    const { birthday, christmas } = await setup();
    const payload = body === 'self' ? { mergeWith: birthday._id } : body.toEvent === 'other' ? { ...body, toEvent: christmas._id } : body;
    expect((await patchEvent(birthday._id, payload)).status).toBe(status);
  });

  it('answers 404 for an event that does not exist, and 400 for a body that is not JSON', async () => {
    await setup();
    expect((await patchEvent('65d1a500aaaaaaaaaaaaaaaa', { title: 'X' })).status).toBe(404);
    expect((await patchEvent('nope', { title: 'X' })).status).toBe(404);
    const notJson = await editEvent(request('/api/timeline/events/x', { method: 'PATCH', body: '{nope' }), routeParams({ id: 'x' }));
    expect(notJson.status).toBe(400);
  });

  it('Reorganizar rebuilds right away, and says so when one is already running', async () => {
    await setup();
    expect((await reorganize()).status).toBe(200);
    await Settings.updateOne({ key: 'app' }, { timelineBuildingUntil: new Date(Date.now() + 60_000) });
    expect((await reorganize()).status).toBe(409);
  });
});
