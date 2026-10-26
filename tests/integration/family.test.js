import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as listPeople } from '@/app/api/family/route';
import { GET as getPerson } from '@/app/api/family/[id]/route';
import { PATCH as changeName } from '@/app/api/profile/route';
import { GET as listMemories } from '@/app/api/memory/route';
import { GET as getMemory } from '@/app/api/memory/[id]/route';
import User from '@models/user';
import { makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, routeParams, signInAs, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

const day = (d) => new Date(`${d}T12:00:00Z`);
const person = (id) => getPerson(request(`/api/family/${id}`), routeParams({ id: String(id) }));
const rename = (displayName) => changeName(request('/api/profile', { method: 'PATCH', body: { displayName } }));

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(() => clearDatabase());

describe('the family index', () => {
  it('lists everyone who has written, most memories first, by the name they chose, without emails', async () => {
    const rosa = await makeUser({ username: 'rosa', displayName: 'Abuela Rosa' });
    const beto = await makeUser({ username: 'beto' });
    await makeUser({ username: 'nadie' }); // has not written
    await makeMemory(beto);
    await makeMemory(rosa);
    await makeMemory(rosa);
    signInAs(beto);

    const people = await (await listPeople()).json();
    expect(people).toEqual([
      { id: String(rosa._id), name: 'Abuela Rosa', image: null, count: 2 },
      { id: String(beto._id), name: 'beto', image: null, count: 1 },
    ]);
    expect(JSON.stringify(people)).not.toContain('@example.com');
  });
});

describe("one person's page", () => {
  it('has their name and count, and their memories in the order they happened', async () => {
    const rosa = await makeUser({ username: 'rosa' });
    const other = await makeUser();
    await makeMemory(rosa, { memory: 'Navidad', happenedAt: day('2024-12-24') });
    await makeMemory(rosa, { memory: 'Naciste', happenedAt: day('2023-05-15') });
    await makeMemory(other, { memory: 'No es de Rosa' });
    signInAs(other);

    expect(await (await person(rosa._id)).json()).toEqual({ id: String(rosa._id), name: 'rosa', image: null, count: 2 });
    const memories = await (await listMemories(request(`/api/memory?author=${rosa._id}&order=oldest`))).json();
    expect(memories.map((m) => m.memory)).toEqual(['Naciste', 'Navidad']);
  });

  it('answers 404 for someone who does not exist, and nothing for a bad author id', async () => {
    signInAs(await makeUser());
    expect((await person('65d1a500aaaaaaaaaaaaaaaa')).status).toBe(404);
    expect((await person('nope')).status).toBe(404);
    expect(await (await listMemories(request('/api/memory?author=nope'))).json()).toEqual([]);
  });
});

describe('Mi nombre en Carlo App', () => {
  it('shows on every memory right away, and an empty name goes back to the username', async () => {
    const rosa = await makeUser({ username: 'rosa' });
    const memory = await makeMemory(rosa);
    signInAs(rosa);

    expect(await (await rename('  Abuela   Rosa ')).json()).toEqual({ displayName: 'Abuela Rosa' });
    const [listed] = await (await listMemories(request('/api/memory'))).json();
    expect(listed.creator).toMatchObject({ username: 'rosa', displayName: 'Abuela Rosa' });
    expect(listed.creator.email).toBeUndefined();
    const single = await (await getMemory(request(`/api/memory/${memory._id}`), routeParams({ id: String(memory._id) }))).json();
    expect(single.creator.displayName).toBe('Abuela Rosa');

    await rename('');
    expect((await User.findById(rosa._id)).displayName).toBeUndefined();
  });

  it('only changes your own name, and refuses a long name or a body that is not text', async () => {
    const rosa = await makeUser();
    const beto = await makeUser({ username: 'beto' });
    signInAs(rosa);
    expect((await rename('x'.repeat(41))).status).toBe(400);
    expect((await changeName(request('/api/profile', { method: 'PATCH', body: { displayName: 5 } }))).status).toBe(400);
    expect((await changeName(request('/api/profile', { method: 'PATCH', body: '{nope' }))).status).toBe(400);
    await rename('Rosa');
    expect((await User.findById(beto._id)).displayName).toBeUndefined();
  });
});
