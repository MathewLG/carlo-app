import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { del, get, put } from '@vercel/blob';
import { checkStorage, deleteFiles, readMediaFile, saveFile, storageProblem } from '@utils/services/storage';

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

describe('when storing fails', () => {
  it('says what Vercel Blob answered, without ever showing a token', () => {
    const error = new Error('Vercel Blob: Access denied for vercel_blob_rw_AbC123_secret');
    expect(storageProblem(error)).toBe('el almacenamiento respondió: Vercel Blob: Access denied for [token]');
  });

  it('the storage check writes, reads back and deletes a test file', async () => {
    vi.mocked(get).mockResolvedValue({ statusCode: 200, stream: new ReadableStream(), blob: { contentType: 'text/plain', size: 9 } });
    expect(await checkStorage()).toEqual({ configured: true, ok: true, step: null, reason: null });
    const [pathname] = vi.mocked(put).mock.calls[0];
    expect(pathname.startsWith('media/_prueba/')).toBe(true);
    expect(del).toHaveBeenCalledWith([pathname]);
  });

  it('the storage check names the step that failed and why', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(put).mockRejectedValueOnce(new Error('Vercel Blob: This store does not exist.'));
    expect(await checkStorage()).toEqual({
      configured: true,
      ok: false,
      step: 'escribir',
      reason: 'el almacenamiento respondió: Vercel Blob: This store does not exist.',
    });
  });
});
