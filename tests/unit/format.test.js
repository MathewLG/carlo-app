import { describe, expect, it } from 'vitest';
import { authorName, formatDate, memoryDate } from '@utils/format';

describe('memoryDate', () => {
  it('prefers the day it happened over the day it was written', () => {
    const memory = { _id: '65d1a500aaaaaaaaaaaaaaaa', createdAt: '2026-10-25T18:00:00.000Z', happenedAt: '2025-05-01T12:00:00.000Z' };
    expect(memoryDate(memory).toISOString()).toBe('2025-05-01T12:00:00.000Z');
  });

  it('uses createdAt when the memory has it', () => {
    const memory = { _id: '000000000000000000000000', createdAt: '2026-10-25T18:00:00.000Z' };
    expect(memoryDate(memory).toISOString()).toBe('2026-10-25T18:00:00.000Z');
  });

  it('falls back to the time stored in the _id for older memories', () => {
    // 0x65d1a500 seconds = 2024-02-18T06:34:40Z, around the app's first upload.
    const memory = { _id: '65d1a500aaaaaaaaaaaaaaaa' };
    expect(memoryDate(memory).toISOString()).toBe('2024-02-18T06:34:40.000Z');
  });
});

describe('formatDate', () => {
  it('shows the Mexico City day for a late-evening moment', () => {
    expect(formatDate(new Date('2026-10-26T04:30:00Z'))).toBe('25 de octubre de 2026');
  });

  it('writes the date in Mexican Spanish', () => {
    expect(formatDate(new Date('2026-10-25T18:00:00Z'))).toBe('25 de octubre de 2026');
  });
});

describe('authorName', () => {
  it('prefers the name the person chose, then their username, then Familia', () => {
    expect(authorName({ username: 'rosa', displayName: 'Abuela Rosa' })).toBe('Abuela Rosa');
    expect(authorName({ username: 'rosa', displayName: '' })).toBe('rosa');
    expect(authorName(null)).toBe('Familia');
  });
});
