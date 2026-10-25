import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Memory from '@models/memory';
import { GET as listMemories } from '@/app/api/memory/route';
import { POST as createMemory } from '@/app/api/memory/new/route';
import { DELETE as deleteMemory, GET as getMemory, PATCH as editMemory } from '@/app/api/memory/[id]/route';
import { getServerSession } from 'next-auth';
import { makeAdmin, makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, routeParams, signInAs, signOut, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(async () => {
  await clearDatabase();
  signOut();
});

const list = async (query = '') => {
  const response = await listMemories(request(`/api/memory${query}`));
  return { status: response.status, body: await response.json() };
};

describe('GET /api/memory', () => {
  it('returns newest first, with only public author fields', async () => {
    const rosa = await makeUser({ username: 'abuelarosa', image: 'https://lh3.googleusercontent.com/r' });
    await makeMemory(rosa, { memory: 'Primero' });
    await makeMemory(rosa, { memory: 'Segundo' });
    signInAs(rosa);

    const { status, body } = await list();

    expect(status).toBe(200);
    expect(body.map((m) => m.memory)).toEqual(['Segundo', 'Primero']);
    expect(body[0].creator).toEqual({ _id: rosa._id.toString(), username: 'abuelarosa', image: rosa.image });
  });

  it('searches the text and the tag, ignoring case and regex characters', async () => {
    const rosa = await makeUser();
    await makeMemory(rosa, { memory: 'Fuimos a la PLAYA', tag: '#viaje' });
    await makeMemory(rosa, { memory: 'Tu cumpleaños', tag: '#playa' });
    await makeMemory(rosa, { memory: 'Nada que ver (.*)', tag: '#otro' });
    signInAs(rosa);

    expect((await list('?q=playa')).body).toHaveLength(2);
    expect((await list('?q=(.*)')).body.map((m) => m.tag)).toEqual(['#otro']);
  });

  it('filters by exact tag and by author', async () => {
    const rosa = await makeUser();
    const tio = await makeUser();
    await makeMemory(rosa, { tag: '#mensaje' });
    await makeMemory(tio, { tag: '#mensaje' });
    await makeMemory(tio, { tag: '#recuerdo' });
    signInAs(tio);

    expect((await list('?tag=%23mensaje')).body).toHaveLength(2);
    expect((await list('?mine=1')).body).toHaveLength(2);
    expect((await list('?mine=1&tag=%23mensaje')).body).toHaveLength(1);
  });
});

describe('POST /api/memory/new', () => {
  it('saves the memory under the signed-in user, ignoring any creator in the body', async () => {
    const rosa = await makeUser();
    const other = await makeUser();
    signInAs(rosa);

    const response = await createMemory(
      request('/api/memory/new', { method: 'POST', body: { memory: 'Hola', tag: '#m', creator: other._id } }),
    );

    expect(response.status).toBe(201);
    const saved = await Memory.findOne();
    expect(saved.creator.toString()).toBe(rosa._id.toString());
  });

  it.each([
    ['invalid JSON', '{nope', 'Solicitud inválida'],
    ['missing fields', { memory: '' }, 'El recuerdo y la categoría son obligatorios'],
  ])('refuses %s with a 400', async (_label, body, error) => {
    signInAs(await makeUser());
    const response = await createMemory(request('/api/memory/new', { method: 'POST', body }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
    expect(await Memory.countDocuments()).toBe(0);
  });
});

describe('/api/memory/[id]', () => {
  it('returns 404 for a malformed id and for a memory that does not exist', async () => {
    signInAs(await makeUser());
    expect((await getMemory(request('/api/memory/abc'), routeParams({ id: 'abc' }))).status).toBe(404);
    const missing = '65d1a500aaaaaaaaaaaaaaaa';
    expect((await getMemory(request(`/api/memory/${missing}`), routeParams({ id: missing }))).status).toBe(404);
  });

  it('lets the author edit, keeping text trimmed', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    const id = memory._id.toString();

    const response = await editMemory(
      request(`/api/memory/${id}`, { method: 'PATCH', body: { memory: ' Editado ', tag: '#nuevo' } }),
      routeParams({ id }),
    );

    expect(response.status).toBe(200);
    expect(await Memory.findById(id)).toMatchObject({ memory: 'Editado', tag: '#nuevo' });
  });

  it('refuses an invalid edit and leaves the memory unchanged', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    const id = memory._id.toString();

    const response = await editMemory(
      request(`/api/memory/${id}`, { method: 'PATCH', body: { memory: '', tag: '' } }),
      routeParams({ id }),
    );

    expect(response.status).toBe(400);
    expect((await Memory.findById(id)).memory).toBe('Tu primer día en casa');
  });

  it('does not let someone else edit or delete the memory', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(await makeUser());
    const id = memory._id.toString();

    const edit = await editMemory(
      request(`/api/memory/${id}`, { method: 'PATCH', body: { memory: 'X', tag: '#x' } }),
      routeParams({ id }),
    );
    const remove = await deleteMemory(request(`/api/memory/${id}`, { method: 'DELETE' }), routeParams({ id }));

    expect([edit.status, remove.status]).toEqual([403, 403]);
    expect((await Memory.findById(id)).memory).toBe('Tu primer día en casa');
  });

  it("lets the admin edit someone else's memory and keeps the original author", async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(await makeAdmin());
    const id = memory._id.toString();

    const response = await editMemory(
      request(`/api/memory/${id}`, { method: 'PATCH', body: { memory: 'Corregido', tag: '#recuerdo' } }),
      routeParams({ id }),
    );

    expect(response.status).toBe(200);
    const saved = await Memory.findById(id);
    expect(saved.memory).toBe('Corregido');
    expect(saved.creator.toString()).toBe(rosa._id.toString());
  });

  it('lets the author delete the memory', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    const id = memory._id.toString();

    const response = await deleteMemory(request(`/api/memory/${id}`, { method: 'DELETE' }), routeParams({ id }));

    expect(response.status).toBe(204);
    expect(await Memory.countDocuments()).toBe(0);
  });
});

it('refuses a session whose account no longer exists', async () => {
  vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'borrado@example.com' } });
  expect((await listMemories(request('/api/memory'))).status).toBe(401);
});
