import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { del, get, put } from '@vercel/blob';

// Where photos and voice notes live. With BLOB_READ_WRITE_TOKEN set (Vercel),
// files go to the private Blob store: every read needs the token, so a file
// cannot be opened by link. Without it (local dev, tests), files go to a
// folder on disk, MEDIA_DIR or .media-local. The rest of the app only ever
// sees a pathname such as media/<memoryId>/photo-<random>.jpg.

const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// The folder is only known at run time; the comment tells Turbopack not to
// bundle the whole project trying to guess which files it might read.
const localRoot = () => path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.MEDIA_DIR || '.media-local');

const localPath = (pathname) => {
  const full = path.resolve(localRoot(), pathname);
  // Pathnames are built by the app, but never let one point outside the folder.
  if (!full.startsWith(localRoot() + path.sep)) throw new Error(`Bad media path: ${pathname}`);
  return full;
};

// Vercel deployments (production and previews) cannot write to disk, so
// without the Blob token they refuse clearly instead of failing halfway.
const assertStorage = () => {
  if (!blobConfigured() && process.env.VERCEL) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set; a Vercel deployment cannot store files on disk.');
  }
};

export const saveFile = async (pathname, bytes, contentType) => {
  assertStorage();
  if (blobConfigured()) {
    await put(pathname, Buffer.from(bytes), { access: 'private', contentType, addRandomSuffix: false });
    return;
  }
  const full = localPath(pathname);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
};

// { body, contentType, size } or null when the file does not exist.
export const readMediaFile = async (pathname, contentType) => {
  assertStorage();
  if (blobConfigured()) {
    const result = await get(pathname, { access: 'private' });
    if (!result || result.statusCode !== 200) return null;
    return { body: result.stream, contentType: result.blob.contentType, size: result.blob.size };
  }
  try {
    const bytes = await readFile(localPath(pathname));
    return { body: bytes, contentType, size: bytes.length };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

export const deleteFiles = async (pathnames) => {
  const list = pathnames.filter(Boolean);
  if (!list.length) return;
  assertStorage();
  if (blobConfigured()) {
    await del(list);
    return;
  }
  await Promise.all(list.map((pathname) => rm(localPath(pathname), { force: true })));
};

// Why storing a file failed, in words safe to show the person: never the
// token, only what kind of problem it was and Vercel Blob's own message.
export const storageProblem = (error) => {
  if (!blobConfigured() && process.env.VERCEL) {
    return 'el almacenamiento de fotos no está configurado en el servidor (falta BLOB_READ_WRITE_TOKEN)';
  }
  const message = String(error?.message ?? error).replace(/vercel_blob_rw_[A-Za-z0-9_]+/g, '[token]');
  return `el almacenamiento respondió: ${message}`;
};

// Writes, reads back and deletes a tiny file, for the admin's storage check.
// Returns { configured, ok, step, reason }; step is where it failed.
export const checkStorage = async () => {
  const configured = blobConfigured();
  const pathname = `media/_prueba/check-${Date.now()}.txt`;
  const bytes = new TextEncoder().encode('carlo-app');
  let step = 'escribir';
  try {
    await saveFile(pathname, bytes, 'text/plain');
    step = 'leer';
    const file = await readMediaFile(pathname, 'text/plain');
    if (!file) throw new Error('el archivo no estaba al leerlo de vuelta');
    step = 'borrar';
    await deleteFiles([pathname]);
    return { configured, ok: true, step: null, reason: null };
  } catch (error) {
    console.error(`Storage check failed while trying to ${step}`, error);
    return { configured, ok: false, step, reason: storageProblem(error) };
  }
};
