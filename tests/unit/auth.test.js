import { describe, expect, it } from 'vitest';
import { makeUsername } from '@utils/auth';

describe('makeUsername', () => {
  it('strips accents before anything else', () => {
    expect(makeUsername({ name: 'José Pérez', email: 'x@example.com' })).toBe('joseperez');
  });

  it('falls back to the email when the name is too short', () => {
    expect(makeUsername({ name: 'Al', email: 'al.garcia+1@example.com' })).toBe('algarcia1');
  });

  it('uses "familia" when neither gives anything usable', () => {
    expect(makeUsername({ name: '', email: '..@example.com' })).toBe('familia');
  });

  it('keeps usernames at 30 characters or fewer', () => {
    expect(makeUsername({ name: 'a'.repeat(50), email: 'x@example.com' })).toHaveLength(30);
  });
});
