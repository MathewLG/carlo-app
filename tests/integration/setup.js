import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getServerSession } from 'next-auth';
import { vi } from 'vitest';
import { connectToDB } from '@utils/database';

// Starts a throwaway MongoDB for one test file and points the app at it.
// Call from beforeAll; the returned function goes in afterAll.
export const startDatabase = async () => {
  const server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri();
  process.env.MONGODB_DB = 'carlo_app_test';
  // Photos and voice notes go to a throwaway folder, never to Vercel Blob.
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const mediaDir = await mkdtemp(path.join(tmpdir(), 'carlo-media-'));
  process.env.MEDIA_DIR = mediaDir;
  await connectToDB();
  return async () => {
    await mongoose.disconnect();
    await server.stop();
    await rm(mediaDir, { recursive: true, force: true });
  };
};

export const clearDatabase = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};

// Test files mock next-auth's getServerSession (see the vi.mock at the top of
// each file); these set who the next request comes from.
export const signInAs = (user) =>
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: user._id.toString(), email: user.email, username: user.username },
  });

export const signOut = () => vi.mocked(getServerSession).mockResolvedValue(null);

export const request = (path, { method = 'GET', body } = {}) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

// Next 16 passes dynamic route params as a promise.
export const routeParams = (params) => ({ params: Promise.resolve(params) });

// A multipart upload like the browser sends: { file: { bytes, name, type }, …other fields }.
export const uploadRequest = (urlPath, { file, ...fields } = {}, method = 'POST') => {
  const form = new FormData();
  if (file) form.append('file', new Blob([file.bytes], { type: file.type ?? 'application/octet-stream' }), file.name ?? 'archivo');
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
  return new Request(`http://localhost${urlPath}`, { method, body: form });
};
