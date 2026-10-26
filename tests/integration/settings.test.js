import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getSettings, PATCH as updateSettings } from '@/app/api/settings/route';
import { hashCode } from '@utils/joinCode';
import { DEFAULT_WELCOME } from '@utils/carlo';
import Settings from '@models/settings';
import { makeAdmin, makeUser } from '../fixtures/people';
import { clearDatabase, request, signInAs, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

const setBirthDate = (carloBirthDate) =>
  updateSettings(request('/api/settings', { method: 'PATCH', body: { carloBirthDate } }));

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(async () => {
  await clearDatabase();
  signInAs(await makeAdmin());
});
afterEach(() => vi.useRealTimers());

describe('/api/settings', () => {
  it('has no birth date until the admin sets one', async () => {
    expect(await (await getSettings()).json()).toEqual({ carloBirthDate: null, monthlyReminder: true, carloCanRead: false, welcomeText: DEFAULT_WELCOME });
  });

  it('saves the birth date as a day, and the family reads it back the same', async () => {
    const response = await setBirthDate('2023-05-15');
    expect(await response.json()).toMatchObject({ carloBirthDate: '2023-05-15', monthlyReminder: true });
    expect((await Settings.findOne()).carloBirthDate.toISOString()).toBe('2023-05-15T12:00:00.000Z');

    signInAs(await makeUser());
    expect(await (await getSettings()).json()).toEqual({ carloBirthDate: '2023-05-15', carloCanRead: false, welcomeText: DEFAULT_WELCOME });
  });

  it('never sends the family code, even hashed', async () => {
    const { salt, hash } = hashCode('tres palabras azules');
    await Settings.create({ key: 'app', joinCodeSalt: salt, joinCodeHash: hash, joinOpen: true });
    const text = await (await getSettings()).text();
    expect(text).not.toContain(hash);
    expect(text).not.toContain('joinCode');
  });

  it.each([
    ['an empty date', '', 'Escribe la fecha de nacimiento'],
    ['a day that does not exist', '2023-02-30', 'La fecha no es válida'],
    ['a future day', '2999-01-01', 'La fecha no puede ser en el futuro'],
  ])('refuses %s', async (_label, value, error) => {
    const response = await setBirthDate(value);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
  });

  it('turns the monthly email off and on without touching the birth date; only the admin sees it', async () => {
    await setBirthDate('2023-05-15');
    const off = await updateSettings(request('/api/settings', { method: 'PATCH', body: { monthlyReminder: false } }));
    expect(await off.json()).toMatchObject({ carloBirthDate: '2023-05-15', monthlyReminder: false });
    expect((await Settings.findOne()).monthlyReminder).toBe(false);
    const bad = await updateSettings(request('/api/settings', { method: 'PATCH', body: { monthlyReminder: 'no' } }));
    expect(bad.status).toBe(400);

    signInAs(await makeUser());
    expect(await (await getSettings()).json()).not.toHaveProperty('monthlyReminder');
  });

  it("never sends Carlo's email", async () => {
    await Settings.updateOne({ key: 'app' }, { carloEmail: 'carlo@example.com' }, { upsert: true });
    expect(await (await getSettings()).text()).not.toContain('carlo@example.com');
  });

  it('refuses a body that is not JSON', async () => {
    const response = await updateSettings(request('/api/settings', { method: 'PATCH', body: '{nope' }));
    expect(response.status).toBe(400);
  });
});
