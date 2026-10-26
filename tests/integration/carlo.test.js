import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as listMemories } from '@/app/api/memory/route';
import { GET as getTimeline } from '@/app/api/timeline/route';
import { GET as getSettings } from '@/app/api/settings/route';
import { GET as getCarlo, PATCH as setCarlo } from '@/app/api/admin/carlo/route';
import { GET as listFamily } from '@/app/api/admin/family/route';
import { POST as welcomed } from '@/app/api/carlo/welcomed/route';
import { PATCH as progress } from '@/app/api/carlo/progress/route';
import { authOptions } from '@utils/auth';
import { DEFAULT_WELCOME } from '@utils/carlo';
import { rebuildTimeline } from '@utils/timelineBuild';
import Event from '@models/event';
import Settings from '@models/settings';
import User from '@models/user';
import { makeAdmin, makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, signInAs, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

const day = (d) => new Date(`${d}T12:00:00Z`);
const CARLO = 'carlo@example.com';
const configure = (body) => setCarlo(request('/api/admin/carlo', { method: 'PATCH', body }));
const session = async (user) => (await authOptions.callbacks.session({ session: { user: { email: user.email } } })).user;

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(async () => {
  await clearDatabase();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-25T18:00:00Z'));
  await Settings.create({ key: 'app', carloBirthDate: day('2023-05-15') });
});
afterEach(() => vi.useRealTimers());

describe('setting up his access', () => {
  it('saves his email, age, state and welcome; one account holds the role, never the admin', async () => {
    const admin = await makeAdmin();
    signInAs(admin);
    expect(await (await getCarlo()).json()).toEqual({
      carloEmail: '',
      carloAccessAge: 15,
      carloAccess: 'auto',
      welcomeText: DEFAULT_WELCOME,
      accessDay: '2038-05-15',
      accessOpen: false,
      carloSignedIn: false,
      carloWelcomed: false,
    });

    const first = await makeUser({ email: 'old@example.com' });
    const carlo = await makeUser({ email: CARLO });
    await configure({ carloEmail: 'old@example.com' });
    expect((await User.findById(first._id)).role).toBe('carlo');
    const saved = await (await configure({ carloEmail: ' Carlo@Example.com ', carloAccessAge: 16, welcomeText: 'Hola' })).json();
    expect(saved).toMatchObject({ carloEmail: CARLO, carloAccessAge: 16, accessDay: '2039-05-15', welcomeText: 'Hola', carloSignedIn: true });
    expect((await User.findById(first._id)).role).toBe('familiar');
    expect((await User.findById(carlo._id)).role).toBe('carlo');

    expect((await configure({ carloEmail: admin.email })).status).toBe(400);
    expect((await User.findById(admin._id)).role).toBe('admin');
  });

  it.each([
    ['an email that is not one', { carloEmail: 'carlo' }],
    ['an age of 0', { carloAccessAge: 0 }],
    ['an age that is not whole', { carloAccessAge: 15.5 }],
    ['an unknown state', { carloAccess: 'forever' }],
    ['a welcome over 5000 characters', { welcomeText: 'x'.repeat(5001) }],
    ['a body that is not an object', 'nope'],
  ])('refuses %s', async (_label, body) => {
    signInAs(await makeAdmin());
    expect((await configure(body)).status).toBe(400);
  });
});

describe('before his day', () => {
  it('his account can sign in but reads nothing, and the session says he is waiting', async () => {
    await Settings.updateOne({ key: 'app' }, { carloEmail: CARLO });
    const carlo = await makeUser({ email: CARLO, invited: true }); // an old invite does not let him in early
    signInAs(carlo);
    const refused = await listMemories(request('/api/memory'));
    expect(refused.status).toBe(403);
    expect((await refused.json()).error).toContain('Todavía no es tiempo');
    expect(await session(carlo)).toMatchObject({ role: 'carlo', allowed: false, carloWaiting: true, welcomed: false });
  });

  it("the family is not told he can read yet, and his email never reaches them", async () => {
    await Settings.updateOne({ key: 'app' }, { carloEmail: CARLO });
    signInAs(await makeUser());
    const text = await (await getSettings()).text();
    expect(JSON.parse(text).carloCanRead).toBe(false);
    expect(text).not.toContain(CARLO);
  });
});

describe('once his access opens', () => {
  const open = async () => {
    await Settings.updateOne({ key: 'app' }, { carloEmail: CARLO, carloAccess: 'open' });
    return makeUser({ email: CARLO, invited: false });
  };

  it('he reads everything, sealed letters as envelopes, and the family sees the banner', async () => {
    const carlo = await open();
    const rosa = await makeUser();
    await makeMemory(rosa, { memory: 'Naciste' });
    await makeMemory(rosa, { memory: 'Secreto', unlockAt: day('2045-01-01') });
    signInAs(carlo);
    const memories = await (await listMemories(request('/api/memory'))).json();
    expect(memories.map((m) => m.memory ?? 'sobre')).toEqual(['sobre', 'Naciste']);
    expect(await session(carlo)).toMatchObject({ role: 'carlo', allowed: true, carloWaiting: false });

    signInAs(rosa);
    expect((await (await getSettings()).json()).carloCanRead).toBe(true);
  });

  it('opens on his birthday at the access age without anyone doing anything', async () => {
    await Settings.updateOne({ key: 'app' }, { carloEmail: CARLO });
    const carlo = await makeUser({ email: CARLO, invited: false });
    signInAs(carlo);
    vi.setSystemTime(new Date('2038-05-15T13:00:00Z'));
    expect((await listMemories(request('/api/memory'))).status).toBe(200);

    await Settings.updateOne({ key: 'app' }, { carloAccess: 'paused' });
    expect((await listMemories(request('/api/memory'))).status).toBe(403);
  });

  it('his welcome is remembered, and the timeline picks up where he left off', async () => {
    const carlo = await open();
    await makeMemory(await makeUser(), { happenedAt: day('2024-01-10') });
    await rebuildTimeline({ force: true });
    const [event] = await Event.find();
    signInAs(carlo);

    expect((await welcomed()).status).toBe(200);
    expect((await session(await User.findById(carlo._id))).welcomed).toBe(true);
    expect((await getTimeline().then((r) => r.json())).resumeAt).toBeNull();
    const save = (eventId) => progress(request('/api/carlo/progress', { method: 'PATCH', body: { eventId } }));
    expect((await save(String(event._id))).status).toBe(200);
    expect((await save('65d1a500aaaaaaaaaaaaaaaa')).status).toBe(400);
    expect((await getTimeline().then((r) => r.json())).resumeAt).toBe(String(event._id));

    // Only for Carlo.
    signInAs(await makeUser());
    expect((await welcomed()).status).toBe(403);
    expect((await getTimeline().then((r) => r.json())).resumeAt).toBeNull();
  });

  it('his account is not shown to the admin as someone waiting to join', async () => {
    await open();
    signInAs(await makeAdmin());
    const { pending } = await (await listFamily(request('/api/admin/family'))).json();
    expect(pending.map((p) => p.email)).not.toContain(CARLO);
  });
});
