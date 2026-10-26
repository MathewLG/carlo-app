import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as listMemories } from '@/app/api/memory/route';
import { POST as createMemory } from '@/app/api/memory/new/route';
import { DELETE as deleteMemory, GET as getMemory, PATCH as editMemory } from '@/app/api/memory/[id]/route';
import { POST as uploadPhoto } from '@/app/api/memory/[id]/photo/route';
import { GET as getMedia } from '@/app/api/media/[id]/[kind]/route';
import { GET as getTimeline } from '@/app/api/timeline/route';
import { GET as getBackup } from '@/app/api/admin/backup/route';
import { GET as runUnlocks } from '@/app/api/cron/unlocks/route';
import { GET as runReminder } from '@/app/api/cron/monthly-reminder/route';
import { emailAdmins } from '@utils/services/email';
import { rebuildTimeline } from '@utils/timelineBuild';
import { saveFile } from '@utils/services/storage';
import Memory from '@models/memory';
import Settings from '@models/settings';
import Word from '@models/word';
import { FILES } from '../fixtures/files';
import { makeAdmin, makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, routeParams, signInAs, startDatabase, uploadRequest } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));
vi.mock('@utils/services/email', () => ({ emailAdmins: vi.fn(async () => ({ sent: true })) }));

const day = (d) => new Date(`${d}T12:00:00Z`);
const NOW = new Date('2026-10-25T18:00:00Z');
const at = (when) => vi.setSystemTime(when);
const params = (id) => routeParams({ id: String(id) });
const create = async (body) => createMemory(request('/api/memory/new', { method: 'POST', body: { memory: 'Querido Carlo', tag: '#carta', ...body } }));
const cron = (route, secret = 'cron-test-secret') =>
  route(new Request('http://localhost/api/cron', { headers: { authorization: `Bearer ${secret}` } }));

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(async () => {
  await clearDatabase();
  vi.useFakeTimers({ toFake: ['Date'] });
  at(NOW);
  process.env.CRON_SECRET = 'cron-test-secret';
  vi.mocked(emailAdmins).mockClear();
  vi.mocked(emailAdmins).mockResolvedValue({ sent: true });
  await Settings.create({ key: 'app', carloBirthDate: day('2023-05-15') });
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.CRON_SECRET;
});

// Rosa seals a letter; Beto is family; Mathew is the admin.
const seal = async (lock = { until: '2039-03-12' }) => {
  const rosa = await makeUser({ username: 'rosa', displayName: 'Abuela Rosa' });
  signInAs(rosa);
  const response = await create({ memory: 'Para cuando seas grande', tag: '#secreto', lock });
  expect(response.status).toBe(201);
  const letter = await Memory.findById((await response.json())._id);
  return { rosa, letter, beto: await makeUser({ username: 'beto' }), admin: await makeAdmin() };
};

describe('sealing a letter', () => {
  it('until a day, or until an age worked out from the birth date', async () => {
    const { letter } = await seal();
    expect(letter.unlockAt.toISOString()).toBe('2039-03-12T12:00:00.000Z');
    const byAge = await (await create({ lock: { age: 15 } })).json();
    expect(byAge).toMatchObject({ unlockAt: '2038-05-15T12:00:00.000Z', lockAge: 15, locked: true });
  });

  it('refuses a day that is not in the future, and an age without a birth date', async () => {
    signInAs(await makeUser());
    expect((await create({ lock: { until: '2026-10-25' } })).status).toBe(400);
    await Settings.updateOne({ key: 'app' }, { $unset: { carloBirthDate: 1 } });
    const noBirth = await create({ lock: { age: 15 } });
    expect(noBirth.status).toBe(400);
    expect((await noBirth.json()).error).toContain('fecha de nacimiento');
  });
});

describe('before it opens', () => {
  it('everyone but the author sees only an envelope, in the list and on its own', async () => {
    const { rosa, letter, beto, admin } = await seal();
    const envelope = {
      _id: String(letter._id),
      creator: { _id: String(rosa._id), username: 'rosa', displayName: 'Abuela Rosa' },
      locked: true,
      unlockAt: '2039-03-12T12:00:00.000Z',
      lockAge: null,
      createdAt: NOW.toISOString(),
    };
    for (const reader of [beto, admin]) {
      signInAs(reader);
      expect(await (await listMemories(request('/api/memory'))).json()).toEqual([envelope]);
      expect(await (await getMemory(request(`/api/memory/${letter._id}`), params(letter._id))).json()).toEqual(envelope);
    }
    signInAs(rosa);
    expect(await (await getMemory(request(`/api/memory/${letter._id}`), params(letter._id))).json()).toMatchObject({
      memory: 'Para cuando seas grande',
      locked: true,
    });
  });

  it('its words and tag are never found by search, except by its author', async () => {
    const { rosa, beto } = await seal();
    signInAs(beto);
    expect(await (await listMemories(request('/api/memory?q=grande'))).json()).toEqual([]);
    expect(await (await listMemories(request('/api/memory?tag=%23secreto'))).json()).toEqual([]);
    signInAs(rosa);
    expect(await (await listMemories(request('/api/memory?q=grande'))).json()).toHaveLength(1);
  });

  it('only its author may change it or add files; the admin may only delete it', async () => {
    const { rosa, letter, admin } = await seal();
    const edit = (body) => editMemory(request(`/api/memory/${letter._id}`, { method: 'PATCH', body }), params(letter._id));

    signInAs(admin);
    expect((await edit({ memory: 'X', tag: '#x' })).status).toBe(403);
    expect((await uploadPhoto(uploadRequest(`/api/memory/${letter._id}/photo`, { file: FILES.jpeg }), params(letter._id))).status).toBe(403);

    signInAs(rosa);
    expect((await edit({ memory: 'Para cuando seas mayor', tag: '#carta' })).status).toBe(200);
    expect((await Memory.findById(letter._id)).unlockAt.toISOString()).toBe('2039-03-12T12:00:00.000Z'); // no lock field: kept
    expect(await (await edit({ memory: 'Ya no es secreto', tag: '#carta', lock: null })).json()).toMatchObject({ locked: false });

    await Memory.updateOne({ _id: letter._id }, { unlockAt: day('2039-03-12') });
    signInAs(admin);
    expect((await deleteMemory(request(`/api/memory/${letter._id}`, { method: 'DELETE' }), params(letter._id))).status).toBe(204);
  });

  it('its files are hidden from the family, but not from its author or the admin (for the backup)', async () => {
    const { rosa, letter, beto, admin } = await seal();
    letter.photo = { path: `media/${letter._id}/photo-0b0b0b.jpg`, mime: 'image/jpeg' };
    await letter.save();
    await saveFile(letter.photo.path, FILES.jpeg.bytes, 'image/jpeg');
    const photo = () => getMedia(request(`/api/media/${letter._id}/photo`), routeParams({ id: String(letter._id), kind: 'photo' }));

    signInAs(beto);
    expect((await photo()).status).toBe(404);
    signInAs(rosa);
    expect((await photo()).status).toBe(200);
    signInAs(admin);
    expect((await photo()).status).toBe(200);
  });

  it('stays off the timeline, and the backup keeps it apart', async () => {
    const { rosa, beto, admin } = await seal();
    await makeMemory(rosa, { memory: 'Navidad', happenedAt: day('2024-12-24') });
    await rebuildTimeline({ force: true });
    signInAs(beto);
    const { events } = await (await getTimeline()).json();
    expect(events.flatMap((e) => e.memories.map((m) => m.memory))).toEqual(['Navidad']);

    signInAs(admin);
    const backup = await (await getBackup()).json();
    expect(backup.memories.map((m) => m.memory)).toEqual(['Navidad']);
    expect(backup.sealed).toEqual([expect.objectContaining({ memory: 'Para cuando seas grande', unlockAt: '2039-03-12' })]);
  });
});

describe('the day it opens', () => {
  it('opens for everyone, joins the timeline on that day, and the admin hears about it once', async () => {
    const { letter, beto } = await seal({ until: '2026-11-05' });
    at(new Date('2026-11-05T13:00:00Z')); // 7:00 in Mexico City

    signInAs(beto);
    expect(await (await getMemory(request(`/api/memory/${letter._id}`), params(letter._id))).json()).toMatchObject({
      memory: 'Para cuando seas grande',
      locked: false,
    });

    expect(await (await cron(runUnlocks)).json()).toEqual({ opened: 1, notified: 1 });
    expect(emailAdmins).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Hoy se abrió una carta de Abuela Rosa' }));
    const { events } = await (await getTimeline()).json();
    expect(events.map((e) => [e.startDay, e.memories[0].memory])).toEqual([['2026-11-05', 'Para cuando seas grande']]);

    expect(await (await cron(runUnlocks)).json()).toEqual({ opened: 0, notified: 0 });
    expect(emailAdmins).toHaveBeenCalledTimes(1);
  });

  it('tries again the next day when the email fails', async () => {
    const { letter } = await seal({ until: '2026-11-05' });
    at(new Date('2026-11-05T13:00:00Z'));
    vi.mocked(emailAdmins).mockResolvedValueOnce({ sent: false, reason: 'Resend HTTP 500' });
    expect(await (await cron(runUnlocks)).json()).toEqual({ opened: 1, notified: 0 });
    expect((await Memory.findById(letter._id)).openedNotifiedAt).toBeUndefined();
    expect(await (await cron(runUnlocks)).json()).toEqual({ opened: 1, notified: 1 });
  });

  it('refuses anyone without the cron secret, and everyone when none is set', async () => {
    expect((await cron(runUnlocks, 'wrong')).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await cron(runUnlocks, 'undefined')).status).toBe(401);
    expect((await cron(runReminder, '')).status).toBe(401);
  });
});

describe('the monthly reminder', () => {
  const firstOfNovember = new Date('2026-11-01T15:00:00Z');

  it('tells the admin about last month once, and counts a first word as recorded', async () => {
    const rosa = await makeUser({ displayName: 'Abuela Rosa' });
    at(new Date('2026-10-10T18:00:00Z'));
    await makeMemory(rosa, { milestone: 'Primer diente' });
    await makeMemory(rosa);
    at(new Date('2026-09-10T18:00:00Z'));
    await makeMemory(rosa); // the month before: not counted
    await Word.create({ creator: rosa._id, word: 'awa', meaning: 'agua', saidAt: day('2024-02-01'), firstWord: true });

    at(firstOfNovember);
    expect(await (await cron(runReminder)).json()).toEqual({ sent: true, written: 2 });
    const [[email]] = vi.mocked(emailAdmins).mock.calls;
    expect(email.text).toContain('En octubre de 2026 la familia escribió 2 recuerdos: Abuela Rosa (2).');
    expect(email.text).not.toMatch(/todavía:.*(Primer diente|Primera palabra)/);

    expect(await (await cron(runReminder)).json()).toEqual({ sent: false, reason: 'already-sent' });
    expect(emailAdmins).toHaveBeenCalledTimes(1);
  });

  it('gives the month back when the email fails, and stays quiet when turned off', async () => {
    at(firstOfNovember);
    vi.mocked(emailAdmins).mockResolvedValueOnce({ sent: false, reason: 'Resend HTTP 500' });
    expect(await (await cron(runReminder)).json()).toMatchObject({ sent: false, reason: 'Resend HTTP 500' });
    expect((await Settings.findOne()).lastReminderMonth).toBeNull();
    expect(await (await cron(runReminder)).json()).toMatchObject({ sent: true });

    await Settings.updateOne({ key: 'app' }, { monthlyReminder: false, lastReminderMonth: null });
    expect(await (await cron(runReminder)).json()).toEqual({ sent: false, reason: 'off' });
  });
});
