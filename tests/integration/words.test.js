import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as listWords, POST as addWord } from '@/app/api/words/route';
import { DELETE as deleteWord, PATCH as editWord } from '@/app/api/words/[id]/route';
import { GET as getTimeline } from '@/app/api/timeline/route';
import { PATCH as editEvent } from '@/app/api/timeline/events/[id]/route';
import { runAfterResponse } from '@utils/background';
import { rebuildTimeline } from '@utils/timelineBuild';
import Event from '@models/event';
import Settings from '@models/settings';
import Word from '@models/word';
import { makeAdmin, makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, routeParams, signInAs, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

const day = (d) => new Date(`${d}T12:00:00Z`);
const add = async (body) => addWord(request('/api/words', { method: 'POST', body }));
const edit = (id, body) => editWord(request(`/api/words/${id}`, { method: 'PATCH', body }), routeParams({ id: String(id) }));
const remove = (id) => deleteWord(request(`/api/words/${id}`, { method: 'DELETE' }), routeParams({ id: String(id) }));
const dirty = async () => (await Settings.findOne())?.timelineDirty;

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(async () => {
  await clearDatabase();
  vi.mocked(runAfterResponse).mockClear();
});

describe('the dictionary', () => {
  it('adds words under the signed-in author, and lists them A to Z with the name they chose', async () => {
    const rosa = await makeUser({ displayName: 'Abuela Rosa' });
    signInAs(rosa);
    const created = await add({ word: 'tete', meaning: 'chupón', saidAt: '2024-03-01', creator: 'someone-else' });
    expect(created.status).toBe(201);
    await add({ word: 'awa', meaning: 'agua', saidAt: '2024-02-01', heardBy: 'Mamá' });

    const words = await (await listWords()).json();
    expect(words.map((w) => w.word)).toEqual(['awa', 'tete']);
    expect(words[0]).toMatchObject({ meaning: 'agua', saidAt: '2024-02-01', heardBy: 'Mamá', firstWord: false, creator: { _id: String(rosa._id), name: 'Abuela Rosa' } });
    expect((await Word.findOne({ word: 'tete' })).creator).toEqual(rosa._id);
  });

  it('refuses an entry without a day or with a future one', async () => {
    signInAs(await makeUser());
    expect((await add({ word: 'awa', meaning: 'agua' })).status).toBe(400);
    expect((await add({ word: 'awa', meaning: 'agua', saidAt: '2999-01-01' })).status).toBe(400);
    expect((await addWord(request('/api/words', { method: 'POST', body: '{nope' }))).status).toBe(400);
  });

  it('lets the author or the admin change and delete an entry, and answers 404 for a missing one', async () => {
    const rosa = await makeUser();
    signInAs(rosa);
    const { id } = await (await add({ word: 'awa', meaning: 'agua', saidAt: '2024-02-01' })).json();
    expect(await (await edit(id, { word: 'awa', meaning: 'agüita', saidAt: '2024-02-01' })).json()).toMatchObject({ meaning: 'agüita' });
    expect((await edit(id, { word: '', meaning: 'x', saidAt: '2024-02-01' })).status).toBe(400);

    signInAs(await makeAdmin());
    expect((await remove(id)).status).toBe(204);
    expect((await remove(id)).status).toBe(404);
    expect((await remove('nope')).status).toBe(404);
  });
});

describe('first words on the timeline', () => {
  it('marking, changing or deleting a first word marks the timeline out of date; an ordinary word does not', async () => {
    signInAs(await makeUser());
    await Settings.create({ key: 'app', timelineDirty: false });

    const plain = await (await add({ word: 'tete', meaning: 'chupón', saidAt: '2024-03-01' })).json();
    expect(await dirty()).toBe(false);
    await edit(plain.id, { word: 'tete', meaning: 'chupete', saidAt: '2024-03-01' });
    expect(await dirty()).toBe(false);

    const first = await (await add({ word: 'awa', meaning: 'agua', saidAt: '2024-02-01', firstWord: true })).json();
    expect(await dirty()).toBe(true);
    await Settings.updateOne({ key: 'app' }, { timelineDirty: false });
    await edit(first.id, { word: 'awa', meaning: 'agua', saidAt: '2024-02-01', firstWord: false });
    expect(await dirty()).toBe(true);
    await Settings.updateOne({ key: 'app' }, { timelineDirty: false });
    await edit(plain.id, { word: 'tete', meaning: 'chupete', saidAt: '2024-03-01', firstWord: true });
    expect(await dirty()).toBe(true);
    await Settings.updateOne({ key: 'app' }, { timelineDirty: false });
    await remove(plain.id);
    expect(await dirty()).toBe(true);
    expect(runAfterResponse).toHaveBeenCalledTimes(4);
  });

  it('each first word is its own moment with the word itself, and the admin cannot edit or merge into it', async () => {
    const rosa = await makeUser();
    await makeMemory(rosa, { memory: 'Navidad', happenedAt: day('2024-12-24') });
    await Word.create({ creator: rosa._id, word: 'awa', meaning: 'agua', saidAt: day('2024-02-01'), firstWord: true });
    await Word.create({ creator: rosa._id, word: 'tete', meaning: 'chupón', saidAt: day('2024-03-01') });
    await rebuildTimeline({ force: true });

    signInAs(rosa);
    const { events } = await (await getTimeline()).json();
    expect(events.map((e) => [e.title, e.source])).toEqual([['Dijiste «awa»', 'palabra'], ['Diciembre de 2024', 'mes']]);
    expect(events[0].words).toEqual([expect.objectContaining({ word: 'awa', meaning: 'agua', saidAt: '2024-02-01' })]);

    signInAs(await makeAdmin());
    const [wordEvent, monthEvent] = await Event.find().sort({ startDay: 1 });
    const patch = (id, body) => editEvent(request(`/api/timeline/events/${id}`, { method: 'PATCH', body }), routeParams({ id: String(id) }));
    expect((await patch(wordEvent._id, { title: 'Otro' })).status).toBe(400);
    expect((await patch(monthEvent._id, { mergeWith: wordEvent._id })).status).toBe(400);

    // A rebuild keeps it, and drops it once the word is no longer a first word.
    await Word.updateOne({ word: 'awa' }, { firstWord: false });
    await rebuildTimeline({ force: true });
    expect(await Event.countDocuments({ source: 'palabra' })).toBe(0);
  });
});
