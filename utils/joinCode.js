import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const MIN_CODE_LENGTH = 8;
export const ACCOUNT_TRY_LIMIT = 5;
export const GLOBAL_TRY_LIMIT = 30;
export const TRY_WINDOW_MS = 60 * 60 * 1000;

// Relatives type the code on phones, so case and repeated spaces don't matter.
export const normalizeCode = (code) =>
  typeof code === 'string' ? code.trim().replace(/\s+/g, ' ').toLowerCase() : '';

export const hashCode = (code) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(normalizeCode(code), salt, 64).toString('hex');
  return { salt, hash };
};

export const verifyCode = (code, salt, hash) => {
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(normalizeCode(code), salt, expected.length);
  return timingSafeEqual(actual, expected);
};

// Counts wrong tries in a fixed window. Returns the new counter and whether
// the limit is now reached; a window older than TRY_WINDOW_MS starts over.
export const countFailure = (counter, limit, now = new Date()) => {
  const fresh = !counter?.windowStart || now - new Date(counter.windowStart) >= TRY_WINDOW_MS;
  const next = fresh ? { count: 1, windowStart: now } : { count: counter.count + 1, windowStart: counter.windowStart };
  return { counter: next, limited: next.count >= limit };
};

// True while the account has used up its tries and the window has not passed.
export const isLockedOut = (counter, limit, now = new Date()) =>
  Boolean(counter?.windowStart) && counter.count >= limit && now - new Date(counter.windowStart) < TRY_WINDOW_MS;
