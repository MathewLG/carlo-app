import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as listMemories } from '@/app/api/memory/route';
import { POST as createMemory } from '@/app/api/memory/new/route';
import { DELETE as deleteMemory, GET as getMemory, PATCH as editMemory } from '@/app/api/memory/[id]/route';
import { PERMISSIONS, ROLES } from '../fixtures/permissions';
import { makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, routeParams, signInAs, signOut, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

// How each action in the permission table is performed against a memory id.
const ACTIONS = {
  'list memories': () => listMemories(request('/api/memory')),
  'read a memory': (id) => getMemory(request(`/api/memory/${id}`), routeParams({ id })),
  'write a memory': () =>
    createMemory(request('/api/memory/new', { method: 'POST', body: { memory: 'Hola', tag: '#m' } })),
  'edit a memory': (id) =>
    editMemory(request(`/api/memory/${id}`, { method: 'PATCH', body: { memory: 'X', tag: '#x' } }), routeParams({ id })),
  'delete a memory': (id) => deleteMemory(request(`/api/memory/${id}`, { method: 'DELETE' }), routeParams({ id })),
};

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(() => clearDatabase());

describe.each(PERMISSIONS)('$action', (row) => {
  it.each(ROLES)('%s gets the status the table expects', async (role) => {
    const author = await makeUser();
    const memory = await makeMemory(author);
    if (role === 'visitante') signOut();
    if (role === 'autor') signInAs(author);
    if (role === 'familiar') signInAs(await makeUser());

    const response = await ACTIONS[row.action](memory._id.toString());

    expect(response.status).toBe(row[role]);
  });
});

it('every action in the table has a way to perform it', () => {
  expect(PERMISSIONS.map((row) => row.action).sort()).toEqual(Object.keys(ACTIONS).sort());
});
