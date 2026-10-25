import { describe, expect, it } from 'vitest';
import {
  countFailure,
  hashCode,
  isLockedOut,
  normalizeCode,
  TRY_WINDOW_MS,
  verifyCode,
} from '@utils/joinCode';

describe('normalizeCode', () => {
  it('ignores case, outer spaces and repeated spaces', () => {
    expect(normalizeCode('  Tres   Palabras\tAZULES ')).toBe('tres palabras azules');
  });

  it('turns anything that is not text into an empty code', () => {
    expect(normalizeCode(undefined)).toBe('');
    expect(normalizeCode(12345678)).toBe('');
  });
});

describe('hashCode and verifyCode', () => {
  it('accepts the same code typed differently and refuses another', () => {
    const { salt, hash } = hashCode('Tres palabras azules');
    expect(verifyCode('tres PALABRAS  azules', salt, hash)).toBe(true);
    expect(verifyCode('tres palabras verdes', salt, hash)).toBe(false);
  });

  it('never stores the code itself, and salts every hash', () => {
    const first = hashCode('tres palabras azules');
    const second = hashCode('tres palabras azules');
    expect(first.hash).not.toContain('azules');
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it('refuses everything when no code has been set', () => {
    expect(verifyCode('anything', undefined, undefined)).toBe(false);
  });
});

describe('countFailure and isLockedOut', () => {
  const start = new Date('2026-11-01T12:00:00Z');
  const later = (ms) => new Date(start.getTime() + ms);

  it('starts a new window on the first failure', () => {
    expect(countFailure(undefined, 5, start)).toEqual({ counter: { count: 1, windowStart: start }, limited: false });
  });

  it('reaches the limit on the fifth failure inside the window', () => {
    let counter;
    let limited;
    for (let i = 0; i < 5; i += 1) ({ counter, limited } = countFailure(counter, 5, later(i * 1000)));
    expect(counter.count).toBe(5);
    expect(limited).toBe(true);
    expect(isLockedOut(counter, 5, later(TRY_WINDOW_MS - 1))).toBe(true);
  });

  it('lets the account try again once the window has passed', () => {
    const counter = { count: 5, windowStart: start };
    expect(isLockedOut(counter, 5, later(TRY_WINDOW_MS))).toBe(false);
    expect(countFailure(counter, 5, later(TRY_WINDOW_MS)).counter).toEqual({ count: 1, windowStart: later(TRY_WINDOW_MS) });
  });

  it('is not locked out with no failures', () => {
    expect(isLockedOut(undefined, 5, start)).toBe(false);
    expect(isLockedOut({ count: 0 }, 5, start)).toBe(false);
  });
});
