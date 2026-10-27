import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE as deletePhoto, PATCH as captionPhoto, POST as uploadPhoto } from '@/app/api/memory/[id]/photo/route';
import { DELETE as deleteVoice, POST as uploadVoice } from '@/app/api/memory/[id]/voice/route';
import { GET as getMedia } from '@/app/api/media/[id]/[kind]/route';
import { DELETE as deleteMemory, GET as getMemory } from '@/app/api/memory/[id]/route';
import { GET as getBackup } from '@/app/api/admin/backup/route';
import { POST as checkStorage } from '@/app/api/admin/storage-check/route';
import { MAX_FILE_BYTES } from '@utils/media';
import Memory from '@models/memory';
import Word from '@models/word';
import { bigFile, FILES } from '../fixtures/files';
import { makeAdmin, makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, request, routeParams, signInAs, startDatabase, uploadRequest } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(() => clearDatabase());

const params = (memory, kind) => routeParams({ id: memory._id.toString(), ...(kind && { kind }) });
const addPhoto = (memory, fields) => uploadPhoto(uploadRequest(`/api/memory/${memory._id}/photo`, fields), params(memory));
const addVoice = (memory, fields) => uploadVoice(uploadRequest(`/api/memory/${memory._id}/voice`, fields), params(memory));
const fetchMedia = (memory, kind) => getMedia(request(`/api/media/${memory._id}/${kind}`), params(memory, kind));
const storedFiles = async (memory) => {
  try {
    return await readdir(path.join(process.env.MEDIA_DIR, 'media', memory._id.toString()));
  } catch {
    return [];
  }
};

describe('photos', () => {
  it('stores a photo and serves it back to the family, with the size and caption', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);

    const response = await addPhoto(memory, { file: FILES.jpeg, width: 1600, height: 1200, caption: ' En el parque ' });

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.photo).toEqual({ url: expect.stringMatching(/^\/api\/media\/.+\/photo\?v=/), width: 1600, height: 1200, caption: 'En el parque' });

    signInAs(await makeUser());
    const served = await fetchMedia(memory, 'photo');
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/jpeg');
    expect(served.headers.get('x-content-type-options')).toBe('nosniff');
    expect(served.headers.get('cache-control')).toBe('private, max-age=86400');
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(FILES.jpeg.bytes);
  });

  it('never sends the storage path, in the memory or the upload reply', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    const uploaded = await (await addPhoto(memory, { file: FILES.png })).text();
    const read = await (await getMemory(request(`/api/memory/${memory._id}`), params(memory))).text();
    for (const body of [uploaded, read]) expect(body).not.toMatch(/\/(photo|voice)-[0-9a-f]{24}\./);
  });

  it('replaces the old photo and deletes its file', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    await addPhoto(memory, { file: FILES.jpeg });
    await addPhoto(memory, { file: FILES.png });

    expect((await Memory.findById(memory._id)).photo.mime).toBe('image/png');
    expect(await storedFiles(memory)).toEqual([expect.stringMatching(/^photo-[0-9a-f]{24}\.png$/)]);
  });

  it.each([
    ['a web page pretending to be a photo', FILES.html, 415],
    ['an SVG', FILES.svg, 415],
    ['an audio file', FILES.m4a, 415],
    ['a file over 4 MB', bigFile(FILES.jpeg, MAX_FILE_BYTES + 1), 413],
  ])('refuses %s', async (_label, file, status) => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    expect((await addPhoto(memory, { file })).status).toBe(status);
    expect((await Memory.findById(memory._id)).photo).toBeUndefined();
    expect(await storedFiles(memory)).toEqual([]);
  });

  it('refuses an upload without a file, or that is not a form', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    expect((await addPhoto(memory, { caption: 'sin foto' })).status).toBe(400);
    const notAForm = await uploadPhoto(request(`/api/memory/${memory._id}/photo`, { method: 'POST', body: { a: 1 } }), params(memory));
    expect(notAForm.status).toBe(400);
  });

  it('changes the caption alone, and removes the photo with its file', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    await addPhoto(memory, { file: FILES.jpeg, caption: 'Antes' });

    const caption = (body) =>
      captionPhoto(request(`/api/memory/${memory._id}/photo`, { method: 'PATCH', body }), params(memory));
    expect((await (await caption({ caption: 'Después' })).json()).photo.caption).toBe('Después');
    expect((await caption('{nope')).status).toBe(400);

    expect((await deletePhoto(request(`/api/memory/${memory._id}/photo`, { method: 'DELETE' }), params(memory))).status).toBe(204);
    expect((await Memory.findById(memory._id)).photo).toBeUndefined();
    expect(await storedFiles(memory)).toEqual([]);
    expect((await caption({ caption: 'x' })).status).toBe(404);
  });
});

describe('when storage fails', () => {
  // A Vercel deployment without the Blob token: nothing can be stored.
  const onVercelWithoutStorage = () => {
    process.env.VERCEL = '1';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  };
  afterEach(() => {
    delete process.env.VERCEL;
    vi.restoreAllMocks();
  });

  it('a photo or voice note upload answers with the reason, and the memory keeps no file', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    onVercelWithoutStorage();

    const photo = await addPhoto(memory, { file: FILES.jpeg });
    expect(photo.status).toBe(502);
    expect((await photo.json()).error).toBe(
      'No se pudo guardar el archivo: el almacenamiento de fotos no está configurado en el servidor (falta BLOB_READ_WRITE_TOKEN).',
    );
    expect((await addVoice(memory, { file: FILES.m4a })).status).toBe(502);
    const saved = await Memory.findById(memory._id);
    expect(saved.photo).toBeUndefined();
    expect(saved.voice).toBeUndefined();
  });

  it("the admin's storage check says which step failed and why", async () => {
    signInAs(await makeAdmin());
    expect(await (await checkStorage()).json()).toEqual({ configured: false, ok: true, step: null, reason: null });
    onVercelWithoutStorage();
    expect(await (await checkStorage()).json()).toEqual({
      configured: false,
      ok: false,
      step: 'escribir',
      reason: 'el almacenamiento de fotos no está configurado en el servidor (falta BLOB_READ_WRITE_TOKEN)',
    });
  });
});

describe('voice notes', () => {
  it.each([['m4a'], ['webm'], ['ogg'], ['mp3'], ['wav']])('stores and serves a %s voice note', async (name) => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);

    const response = await addVoice(memory, { file: FILES[name], durationSec: 42 });

    expect(response.status).toBe(201);
    expect((await response.json()).voice).toEqual({ url: expect.any(String), durationSec: 42 });
    const served = await fetchMedia(memory, 'voice');
    expect(served.headers.get('content-type')).toBe(FILES[name].type);
  });

  it('refuses a recording longer than 5 minutes, and a photo', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    expect((await addVoice(memory, { file: FILES.m4a, durationSec: 301 })).status).toBe(413);
    expect((await addVoice(memory, { file: FILES.jpeg })).status).toBe(415);
    expect(await storedFiles(memory)).toEqual([]);
  });

  it('removes the voice note and its file', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    await addVoice(memory, { file: FILES.m4a, durationSec: 10 });
    await deleteVoice(request(`/api/memory/${memory._id}/voice`, { method: 'DELETE' }), params(memory));
    expect((await Memory.findById(memory._id)).voice).toBeUndefined();
    expect(await storedFiles(memory)).toEqual([]);
  });
});

describe('who can change and see files', () => {
  it("does not let someone else change a memory's photo, but lets the admin", async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(await makeUser());
    expect((await addPhoto(memory, { file: FILES.jpeg })).status).toBe(403);
    signInAs(await makeAdmin());
    expect((await addPhoto(memory, { file: FILES.jpeg })).status).toBe(201);
  });

  it('serves nothing to an account not on the list', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    await addPhoto(memory, { file: FILES.jpeg });
    signInAs(await makeUser({ invited: false }));
    expect((await fetchMedia(memory, 'photo')).status).toBe(403);
  });

  it('answers 404 for a memory without that file, an unknown kind or a bad id', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    expect((await fetchMedia(memory, 'photo')).status).toBe(404);
    expect((await getMedia(request('/x'), routeParams({ id: memory._id.toString(), kind: 'video' }))).status).toBe(404);
    expect((await getMedia(request('/x'), routeParams({ id: 'nope', kind: 'photo' }))).status).toBe(404);
    expect((await addPhoto({ _id: 'nope' }, { file: FILES.jpeg })).status).toBe(404);
    expect((await addPhoto({ _id: '65d1a500aaaaaaaaaaaaaaaa' }, { file: FILES.jpeg })).status).toBe(404);
  });

  it('answers 404 when the file is missing from storage', async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa, { photo: { path: 'media/gone/photo-0.jpg', mime: 'image/jpeg' } });
    signInAs(rosa);
    expect((await fetchMedia(memory, 'photo')).status).toBe(404);
  });

  it("deletes a memory's files when the memory is deleted", async () => {
    const rosa = await makeUser();
    const memory = await makeMemory(rosa);
    signInAs(rosa);
    await addPhoto(memory, { file: FILES.jpeg });
    await addVoice(memory, { file: FILES.m4a });
    expect(await storedFiles(memory)).toHaveLength(2);

    await deleteMemory(request(`/api/memory/${memory._id}`, { method: 'DELETE' }), params(memory));
    expect(await storedFiles(memory)).toEqual([]);
  });
});

describe('/api/admin/backup', () => {
  it('lists every memory in the order it happened, with author, words and file names', async () => {
    const admin = await makeAdmin();
    const rosa = await makeUser({ username: 'abuelarosa' });
    const later = await makeMemory(rosa, { memory: 'Después', happenedAt: new Date('2024-06-02T12:00:00Z') });
    await makeMemory(rosa, { memory: 'Antes', happenedAt: new Date('2023-12-24T12:00:00Z') });
    signInAs(rosa);
    await addPhoto(later, { file: FILES.jpeg, caption: 'Pasitos' });
    await addVoice(later, { file: FILES.m4a, durationSec: 8 });
    signInAs(admin);

    const json = await (await getBackup()).json();

    expect(json.memories.map((m) => m.memory)).toEqual(['Antes', 'Después']);
    expect(json.memories[1]).toMatchObject({
      author: 'abuelarosa',
      day: '2024-06-02',
      tag: '#recuerdo',
      photo: { url: expect.stringContaining('/photo?v='), name: `media/2024-06-02-${later._id}-foto.jpg`, caption: 'Pasitos' },
      voice: { url: expect.stringContaining('/voice?v='), name: `media/2024-06-02-${later._id}-voz.m4a` },
    });
    expect(json.memories[0].photo).toBeUndefined();
    expect(JSON.stringify(json)).not.toMatch(/\/(photo|voice)-[0-9a-f]{24}\./);
  });

  it('includes the Diccionario A to Z, with the name each author chose', async () => {
    const rosa = await makeUser({ username: 'rosa', displayName: 'Abuela Rosa' });
    await Word.create({ creator: rosa._id, word: 'tete', meaning: 'chupón', saidAt: new Date('2024-03-01T12:00:00Z') });
    await Word.create({ creator: rosa._id, word: 'awa', meaning: 'agua', saidAt: new Date('2024-02-01T12:00:00Z'), firstWord: true });
    signInAs(await makeAdmin());

    const { words } = await (await getBackup()).json();
    expect(words).toEqual([
      { word: 'awa', meaning: 'agua', day: '2024-02-01', heardBy: '', firstWord: true, author: 'Abuela Rosa' },
      { word: 'tete', meaning: 'chupón', day: '2024-03-01', heardBy: '', firstWord: false, author: 'Abuela Rosa' },
    ]);
  });
});
