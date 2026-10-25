import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as listMemories } from '@/app/api/memory/route';
import { POST as createMemory } from '@/app/api/memory/new/route';
import { DELETE as deleteMemory, GET as getMemory, PATCH as editMemory } from '@/app/api/memory/[id]/route';
import { POST as join } from '@/app/api/join/route';
import { DELETE as removeFamily, GET as listFamily, POST as addFamily } from '@/app/api/admin/family/route';
import { PUT as setCode } from '@/app/api/admin/join-code/route';
import { GET as getSettings, PATCH as updateSettings } from '@/app/api/settings/route';
import { hashCode } from '@utils/joinCode';
import Settings from '@models/settings';
import { PERMISSIONS, ROLES } from '../fixtures/permissions';
import { makeAdmin, makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, routeParams, signInAs, signOut, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

const FAMILY_CODE = 'tres palabras azules';

// How each action in the permission table is performed. `ctx` holds the
// memory being acted on and another family member to remove.
const ACTIONS = {
  'list memories': () => listMemories(request('/api/memory')),
  'read a memory': ({ id }) => getMemory(request(`/api/memory/${id}`), routeParams({ id })),
  'write a memory': () =>
    createMemory(request('/api/memory/new', { method: 'POST', body: { memory: 'Hola', tag: '#m' } })),
  'edit a memory': ({ id }) =>
    editMemory(request(`/api/memory/${id}`, { method: 'PATCH', body: { memory: 'X', tag: '#x' } }), routeParams({ id })),
  'delete a memory': ({ id }) => deleteMemory(request(`/api/memory/${id}`, { method: 'DELETE' }), routeParams({ id })),
  'join with the family code': () => join(request('/api/join', { method: 'POST', body: { code: FAMILY_CODE } })),
  'see the family list': () => listFamily(request('/api/admin/family')),
  'add someone to the family': () =>
    addFamily(request('/api/admin/family', { method: 'POST', body: { email: 'nuevo@example.com' } })),
  'remove someone from the family': ({ other }) =>
    removeFamily(request('/api/admin/family', { method: 'DELETE', body: { email: other.email } })),
  'change the family code': () =>
    setCode(request('/api/admin/join-code', { method: 'PUT', body: { code: 'otro código largo' } })),
  "see Carlo's birth date": () => getSettings(),
  "change Carlo's birth date": () =>
    updateSettings(request('/api/settings', { method: 'PATCH', body: { carloBirthDate: '2023-05-15' } })),
};

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(async () => {
  await clearDatabase();
  const { salt, hash } = hashCode(FAMILY_CODE);
  await Settings.create({ key: 'app', joinCodeSalt: salt, joinCodeHash: hash, joinOpen: true });
});

describe.each(PERMISSIONS)('$action', (row) => {
  it.each(ROLES)('%s gets the status the table expects', async (role) => {
    const author = await makeUser();
    const memory = await makeMemory(author);
    const other = await makeUser();
    if (role === 'visitante') signOut();
    if (role === 'pendiente') signInAs(await makeUser({ invited: false }));
    if (role === 'autor') signInAs(author);
    if (role === 'familiar') signInAs(await makeUser());
    if (role === 'admin') signInAs(await makeAdmin());

    const response = await ACTIONS[row.action]({ id: memory._id.toString(), other });

    expect(response.status).toBe(row[role]);
  });
});

it('every action in the table has a way to perform it', () => {
  expect(PERMISSIONS.map((row) => row.action).sort()).toEqual(Object.keys(ACTIONS).sort());
});
