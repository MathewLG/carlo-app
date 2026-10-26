import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as listMemories } from '@/app/api/memory/route';
import { POST as createMemory } from '@/app/api/memory/new/route';
import { DELETE as deleteMemory, GET as getMemory, PATCH as editMemory } from '@/app/api/memory/[id]/route';
import { POST as join } from '@/app/api/join/route';
import { DELETE as removeFamily, GET as listFamily, POST as addFamily } from '@/app/api/admin/family/route';
import { PUT as setCode } from '@/app/api/admin/join-code/route';
import { GET as getSettings, PATCH as updateSettings } from '@/app/api/settings/route';
import { POST as uploadPhoto } from '@/app/api/memory/[id]/photo/route';
import { GET as getMedia } from '@/app/api/media/[id]/[kind]/route';
import { GET as getBackup } from '@/app/api/admin/backup/route';
import { GET as getTimeline } from '@/app/api/timeline/route';
import { POST as reorganize } from '@/app/api/timeline/rebuild/route';
import { PATCH as editEvent } from '@/app/api/timeline/events/[id]/route';
import Event from '@models/event';
import { saveFile } from '@utils/services/storage';
import { FILES } from '../fixtures/files';
import { hashCode } from '@utils/joinCode';
import Settings from '@models/settings';
import { PERMISSIONS, ROLES } from '../fixtures/permissions';
import { makeAdmin, makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, routeParams, signInAs, signOut, startDatabase, uploadRequest } from './setup';

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
  'add a photo to a memory': ({ id }) =>
    uploadPhoto(uploadRequest(`/api/memory/${id}/photo`, { file: FILES.jpeg }), routeParams({ id })),
  'see a photo': ({ id }) => getMedia(request(`/api/media/${id}/photo`), routeParams({ id, kind: 'photo' })),
  'download the backup': () => getBackup(),
  'see the timeline': () => getTimeline(),
  'rename a moment': ({ event }) =>
    editEvent(request(`/api/timeline/events/${event._id}`, { method: 'PATCH', body: { title: 'Nuevo nombre' } }), routeParams({ id: String(event._id) })),
  'reorganize the timeline': () => reorganize(),
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
    // The memory already has a photo, stored where the app would put it.
    const memory = await makeMemory(author);
    memory.photo = { path: `media/${memory._id}/photo-0a0a0a.jpg`, mime: 'image/jpeg' };
    await memory.save();
    await saveFile(memory.photo.path, FILES.jpeg.bytes, 'image/jpeg');
    const other = await makeUser();
    const event = await Event.create({ title: 'Mayo', memoryIds: [memory._id], startDay: '2024-05-01', endDay: '2024-05-01', source: 'mes' });
    if (role === 'visitante') signOut();
    if (role === 'pendiente') signInAs(await makeUser({ invited: false }));
    if (role === 'autor') signInAs(author);
    if (role === 'familiar') signInAs(await makeUser());
    if (role === 'admin') signInAs(await makeAdmin());

    const response = await ACTIONS[row.action]({ id: memory._id.toString(), other, event });

    expect(response.status).toBe(row[role]);
  });
});

it('every action in the table has a way to perform it', () => {
  expect(PERMISSIONS.map((row) => row.action).sort()).toEqual(Object.keys(ACTIONS).sort());
});
