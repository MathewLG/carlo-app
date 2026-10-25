import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as join } from '@/app/api/join/route';
import { GET as listMemories } from '@/app/api/memory/route';
import { ACCOUNT_TRY_LIMIT, GLOBAL_TRY_LIMIT, hashCode } from '@utils/joinCode';
import Invite from '@models/invite';
import Settings from '@models/settings';
import User from '@models/user';
import { makeUser } from '../fixtures/people';
import { clearDatabase, request, signInAs, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

const FAMILY_CODE = 'Tres Palabras Azules';
const tryCode = (code) => join(request('/api/join', { method: 'POST', body: { code } }));

const setFamilyCode = async (overrides = {}) => {
  const { salt, hash } = hashCode(FAMILY_CODE);
  await Settings.findOneAndUpdate(
    { key: 'app' },
    { joinCodeSalt: salt, joinCodeHash: hash, joinOpen: true, ...overrides },
    { upsert: true },
  );
};

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(() => clearDatabase());
afterEach(() => vi.useRealTimers());

describe('POST /api/join', () => {
  it('puts the account on the list with the right code, and the memories open up', async () => {
    await setFamilyCode();
    const rosa = await makeUser({ invited: false });
    signInAs(rosa);
    expect((await listMemories(request('/api/memory'))).status).toBe(403);

    // Case and extra spaces don't matter on a phone keyboard.
    const response = await tryCode('  tres   palabras AZULES ');

    expect(response.status).toBe(200);
    expect(await Invite.findOne({ email: rosa.email })).toMatchObject({ source: 'codigo' });
    expect((await listMemories(request('/api/memory'))).status).toBe(200);
  });

  it('refuses a wrong code and says how many tries are left', async () => {
    await setFamilyCode();
    signInAs(await makeUser({ invited: false }));

    const response = await tryCode('carlo2023');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Ese no es el código familiar.', triesLeft: ACCOUNT_TRY_LIMIT - 1 });
    expect(await Invite.countDocuments()).toBe(0);
  });

  it(`locks the account for an hour after ${ACCOUNT_TRY_LIMIT} wrong codes, even the right one`, async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));
    await setFamilyCode();
    signInAs(await makeUser({ invited: false }));

    for (let i = 1; i < ACCOUNT_TRY_LIMIT; i += 1) expect((await tryCode('nope')).status).toBe(400);
    expect((await tryCode('nope')).status).toBe(429);
    expect((await tryCode(FAMILY_CODE)).status).toBe(429);

    vi.setSystemTime(new Date('2026-11-01T13:00:01Z'));
    expect((await tryCode(FAMILY_CODE)).status).toBe(200);
  });

  it(`closes joining after ${GLOBAL_TRY_LIMIT} wrong codes across all accounts`, async () => {
    await setFamilyCode({ joinFailures: { count: GLOBAL_TRY_LIMIT - 1, windowStart: new Date() } });
    signInAs(await makeUser({ invited: false }));

    await tryCode('nope');

    expect((await Settings.findOne()).joinOpen).toBe(false);
    signInAs(await makeUser({ invited: false }));
    expect((await tryCode(FAMILY_CODE)).status).toBe(403);
  });

  it('refuses everyone while joining is closed or no code is set', async () => {
    signInAs(await makeUser({ invited: false }));
    expect((await tryCode(FAMILY_CODE)).status).toBe(403);

    await setFamilyCode({ joinOpen: false });
    expect((await tryCode(FAMILY_CODE)).status).toBe(403);
  });

  it('clears the wrong-try count after a successful join', async () => {
    await setFamilyCode();
    const rosa = await makeUser({ invited: false });
    signInAs(rosa);
    await tryCode('nope');
    await tryCode(FAMILY_CODE);
    expect((await User.findById(rosa._id)).joinAttempts.count).toBe(0);
  });

  it('answers 200 for someone already in, without touching their entry', async () => {
    await setFamilyCode();
    const rosa = await makeUser();
    signInAs(rosa);
    expect((await tryCode('anything')).status).toBe(200);
    expect(await Invite.findOne({ email: rosa.email })).toMatchObject({ source: 'admin' });
  });

  it('refuses a body that is not JSON', async () => {
    await setFamilyCode();
    signInAs(await makeUser({ invited: false }));
    expect((await join(request('/api/join', { method: 'POST', body: '{nope' }))).status).toBe(400);
  });
});
