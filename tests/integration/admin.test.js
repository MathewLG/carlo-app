import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE as removeFamily, GET as listFamily, POST as addFamily } from '@/app/api/admin/family/route';
import { GET as getCode, PATCH as toggleCode, PUT as setCode } from '@/app/api/admin/join-code/route';
import { GET as listMemories } from '@/app/api/memory/route';
import { verifyCode } from '@utils/joinCode';
import Invite from '@models/invite';
import Settings from '@models/settings';
import { makeAdmin, makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, signInAs, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

let stopDatabase;
let admin;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(async () => {
  await clearDatabase();
  admin = await makeAdmin({ email: 'Mathew@example.com' });
  signInAs(admin);
});

const body = async (response) => ({ status: response.status, json: await response.json() });

describe('/api/admin/family', () => {
  it('lists members with how they joined and their memory count, and accounts still waiting', async () => {
    const rosa = await makeUser({ username: 'abuelarosa' });
    await makeMemory(rosa);
    await makeMemory(rosa);
    await makeUser({ invited: false, username: 'primo', email: 'primo@example.com' });

    const { status, json } = await body(await listFamily(request('/api/admin/family')));

    expect(status).toBe(200);
    expect(json.members).toContainEqual(
      expect.objectContaining({ username: 'abuelarosa', source: 'admin', memories: 2, role: 'familiar' }),
    );
    expect(json.members).toContainEqual(expect.objectContaining({ email: 'mathew@example.com', role: 'admin' }));
    expect(json.pending).toEqual([expect.objectContaining({ email: 'primo@example.com', username: 'primo' })]);
  });

  it('adds an email, lowercased, and adding it again changes nothing', async () => {
    const add = () => addFamily(request('/api/admin/family', { method: 'POST', body: { email: ' Tia@Example.com ' } }));
    expect((await add()).status).toBe(201);
    expect((await add()).status).toBe(201);
    expect(await Invite.find({ email: 'tia@example.com' })).toHaveLength(1);
  });

  it('refuses an email that is not valid', async () => {
    const response = await addFamily(request('/api/admin/family', { method: 'POST', body: { email: 'no es correo' } }));
    expect(response.status).toBe(400);
  });

  it('removes someone, who is blocked on their next request', async () => {
    const rosa = await makeUser();
    const response = await removeFamily(request('/api/admin/family', { method: 'DELETE', body: { email: rosa.email } }));
    expect(response.status).toBe(204);

    signInAs(rosa);
    expect((await listMemories(request('/api/memory'))).status).toBe(403);
  });

  it('does not let the admin remove themselves', async () => {
    const response = await removeFamily(
      request('/api/admin/family', { method: 'DELETE', body: { email: 'MATHEW@example.com' } }),
    );
    expect(response.status).toBe(400);
    expect(await Invite.exists({ email: 'mathew@example.com' })).toBeTruthy();
  });

  it('answers 404 for an email that is not on the list', async () => {
    const response = await removeFamily(
      request('/api/admin/family', { method: 'DELETE', body: { email: 'nadie@example.com' } }),
    );
    expect(response.status).toBe(404);
  });
});

describe('/api/admin/join-code', () => {
  it('starts with no code and joining closed', async () => {
    expect((await body(await getCode())).json).toEqual({ hasCode: false, open: false });
  });

  it('stores only a hash of a new code and opens joining', async () => {
    const { json } = await body(
      await setCode(request('/api/admin/join-code', { method: 'PUT', body: { code: 'tres palabras azules' } })),
    );

    expect(json).toEqual({ hasCode: true, open: true });
    const settings = await Settings.findOne().lean();
    expect(JSON.stringify(settings)).not.toContain('tres palabras azules');
    expect(verifyCode('tres palabras azules', settings.joinCodeSalt, settings.joinCodeHash)).toBe(true);
  });

  it('refuses a code shorter than 8 characters', async () => {
    const response = await setCode(request('/api/admin/join-code', { method: 'PUT', body: { code: 'carlo' } }));
    expect(response.status).toBe(400);
  });

  it('closes and reopens joining, but cannot open it before a code exists', async () => {
    const toggle = (open) => toggleCode(request('/api/admin/join-code', { method: 'PATCH', body: { open } }));
    expect((await toggle(true)).status).toBe(400);

    await setCode(request('/api/admin/join-code', { method: 'PUT', body: { code: 'tres palabras azules' } }));
    expect((await body(await toggle(false))).json).toEqual({ hasCode: true, open: false });
    expect((await body(await toggle(true))).json).toEqual({ hasCode: true, open: true });
    expect((await toggle('yes')).status).toBe(400);
  });
});
