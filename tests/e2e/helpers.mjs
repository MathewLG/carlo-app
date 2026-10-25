import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import mongoose from 'mongoose';
import { encode } from 'next-auth/jwt';
import { APP_PORT, MONGODB_DB, MONGODB_URI, NEXTAUTH_SECRET } from './env.mjs';

let connection;
const db = async () => {
  connection ??= await mongoose.createConnection(MONGODB_URI, { dbName: MONGODB_DB }).asPromise();
  return connection;
};

export const resetDatabase = async () => {
  const conn = await db();
  await Promise.all(['users', 'memories'].map((name) => conn.collection(name).deleteMany({})));
};

export const closeDatabase = async () => {
  await connection?.close();
  connection = undefined;
};

let counter = 0;
export const seedUser = async (overrides = {}) => {
  counter += 1;
  const user = {
    _id: new mongoose.Types.ObjectId(),
    email: `familiar${counter}-${Date.now()}@example.com`,
    username: `familiar${counter}`,
    ...overrides,
  };
  await (await db()).collection('users').insertOne(user);
  return user;
};

export const seedMemory = async (creator, overrides = {}) => {
  const now = new Date();
  const memory = {
    _id: new mongoose.Types.ObjectId(),
    creator: creator._id,
    memory: 'Tu primer día en casa',
    tag: '#recuerdo',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  await (await db()).collection('memories').insertOne(memory);
  return memory;
};

// Google refuses automated browsers, so tests sign in by writing the same
// session cookie next-auth would, signed with the e2e-only secret.
export const signIn = async (context, user) => {
  const value = await encode({
    token: { name: user.username, email: user.email, sub: user._id.toString() },
    secret: NEXTAUTH_SECRET,
  });
  await context.addCookies([
    { name: 'next-auth.session-token', value, url: `http://localhost:${APP_PORT}`, httpOnly: true, sameSite: 'Lax' },
  ]);
};

// Fails on serious or critical accessibility problems; minor ones are left to review.
export const expectAccessible = async (page) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const blocking = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
  expect(blocking).toEqual([]);
};

// Collects console errors so a test can assert the page loaded cleanly.
export const watchConsoleErrors = (page) => {
  const errors = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
};
