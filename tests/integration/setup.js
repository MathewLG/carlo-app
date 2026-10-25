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
  await connectToDB();
  return async () => {
    await mongoose.disconnect();
    await server.stop();
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
