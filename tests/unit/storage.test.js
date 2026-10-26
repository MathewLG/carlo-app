import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteFiles, readMediaFile, saveFile } from '@utils/services/storage';

// Without BLOB_READ_WRITE_TOKEN, files live in a folder on disk.
let dir;
beforeAll(async () => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  dir = await mkdtemp(path.join(tmpdir(), 'carlo-storage-'));
  process.env.MEDIA_DIR = dir;
});
afterAll(() => rm(dir, { recursive: true, force: true }));

describe('local storage', () => {
  it('saves, reads back and deletes a file', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await saveFile('media/m1/photo-a.jpg', bytes, 'image/jpeg');

    const file = await readMediaFile('media/m1/photo-a.jpg', 'image/jpeg');
    expect([...file.body]).toEqual([1, 2, 3, 4]);
    expect(file).toMatchObject({ contentType: 'image/jpeg', size: 4 });

    await deleteFiles(['media/m1/photo-a.jpg', undefined]);
    expect(await readMediaFile('media/m1/photo-a.jpg', 'image/jpeg')).toBeNull();
  });

  it('does nothing when there is nothing to delete', async () => {
    await expect(deleteFiles([null, undefined])).resolves.toBeUndefined();
  });

  it('never reads or writes outside its folder', async () => {
    await expect(saveFile('../outside.txt', new Uint8Array([1]), 'text/plain')).rejects.toThrow('Bad media path');
    await expect(readMediaFile('../../etc/passwd', 'text/plain')).rejects.toThrow('Bad media path');
  });

  it('refuses to use the disk on any Vercel deployment', async () => {
    process.env.VERCEL = '1';
    try {
      await expect(saveFile('media/m1/x.jpg', new Uint8Array([1]), 'image/jpeg')).rejects.toThrow('BLOB_READ_WRITE_TOKEN');
    } finally {
      delete process.env.VERCEL;
    }
  });
});
