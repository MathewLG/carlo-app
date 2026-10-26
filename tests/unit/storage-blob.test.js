import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { del, get, put } from '@vercel/blob';
import { deleteFiles, readMediaFile, saveFile } from '@utils/services/storage';

// The Vercel Blob calls themselves, without the network: what matters is
// that every file is stored and read as private.
vi.mock('@vercel/blob', () => ({ put: vi.fn(), get: vi.fn(), del: vi.fn() }));

beforeAll(() => {
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
});
afterAll(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});
beforeEach(() => vi.clearAllMocks());

describe('Vercel Blob storage', () => {
  it('stores files as private, under the exact pathname the app chose', async () => {
    await saveFile('media/m1/photo-a.jpg', new Uint8Array([1, 2]), 'image/jpeg');
    expect(put).toHaveBeenCalledWith('media/m1/photo-a.jpg', expect.any(Buffer), {
      access: 'private',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
    });
  });

  it('reads files with private access and passes the stream through', async () => {
    const stream = new ReadableStream();
    vi.mocked(get).mockResolvedValue({ statusCode: 200, stream, blob: { contentType: 'image/jpeg', size: 9 } });

    expect(await readMediaFile('media/m1/photo-a.jpg', 'image/jpeg')).toEqual({
      body: stream,
      contentType: 'image/jpeg',
      size: 9,
    });
    expect(get).toHaveBeenCalledWith('media/m1/photo-a.jpg', { access: 'private' });
  });

  it('answers null for a file that is gone', async () => {
    vi.mocked(get).mockResolvedValue(null);
    expect(await readMediaFile('media/m1/nada.jpg', 'image/jpeg')).toBeNull();
  });

  it('deletes several files in one call, skipping empty entries', async () => {
    await deleteFiles(['media/m1/a.jpg', undefined, 'media/m1/b.m4a']);
    expect(del).toHaveBeenCalledWith(['media/m1/a.jpg', 'media/m1/b.m4a']);
  });
});
