// Starts a throwaway MongoDB and the built app on top of it, for Playwright.
// Run `npm run build` first; Playwright starts this through `webServer`.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { APP_PORT, MONGO_PORT, MONGODB_DB, MONGODB_URI, NEXTAUTH_SECRET } from './env.mjs';

const mongo = await MongoMemoryServer.create({ instance: { port: MONGO_PORT } });
const appUrl = `http://localhost:${APP_PORT}`;

// Values set here win over .env.local, so a developer's real secrets are never used.
const env = {
  ...process.env,
  MONGODB_URI,
  MONGODB_DB,
  NEXTAUTH_URL: appUrl,
  NEXTAUTH_URL_INTERNAL: appUrl,
  NEXTAUTH_SECRET,
  GOOGLE_ID: 'e2e-google-id',
  GOOGLE_CLIENT_SECRET: 'e2e-google-secret',
  // Photos and voice notes go to a throwaway folder, never to Vercel Blob.
  BLOB_READ_WRITE_TOKEN: '',
  MEDIA_DIR: mkdtempSync(path.join(tmpdir(), 'carlo-e2e-media-')),
};

const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
const app = spawn(process.execPath, [nextBin, 'start', '-p', String(APP_PORT)], { env, stdio: 'inherit' });

const stop = async () => {
  app.kill();
  await mongo.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
app.on('exit', async (code) => {
  await mongo.stop();
  process.exit(code ?? 0);
});
