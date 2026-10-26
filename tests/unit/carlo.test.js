import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accessDay, carloAccessOpen, isCarloEmail } from '@utils/carlo';
import { redirectFor } from '@components/AccessGate';

const day = (d) => new Date(`${d}T12:00:00Z`);
const settings = (extra = {}) => ({ carloEmail: 'carlo@example.com', carloBirthDate: day('2023-05-15'), carloAccessAge: 15, carloAccess: 'auto', ...extra });

describe("Carlo's access", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('opens on its own on his birthday at the access age, in Mexico City', () => {
    vi.setSystemTime(new Date('2038-05-15T05:30:00Z')); // still the 14th there
    expect(carloAccessOpen(settings())).toBe(false);
    vi.setSystemTime(new Date('2038-05-15T06:00:00Z'));
    expect(carloAccessOpen(settings())).toBe(true);
    expect(accessDay(settings({ carloAccessAge: 18 })).toISOString()).toBe('2041-05-15T12:00:00.000Z');
  });

  it('can be opened early or paused, and stays shut without his email or birth date', () => {
    vi.setSystemTime(new Date('2026-10-25T18:00:00Z'));
    expect(carloAccessOpen(settings({ carloAccess: 'open' }))).toBe(true);
    vi.setSystemTime(new Date('2040-01-01T18:00:00Z'));
    expect(carloAccessOpen(settings({ carloAccess: 'paused' }))).toBe(false);
    expect(carloAccessOpen(settings({ carloEmail: undefined }))).toBe(false);
    expect(carloAccessOpen(settings({ carloBirthDate: null }))).toBe(false);
    expect(carloAccessOpen(null)).toBe(false);
  });

  it('knows his account by its email, whatever the case', () => {
    expect(isCarloEmail(settings(), 'Carlo@Example.com')).toBe(true);
    expect(isCarloEmail(settings(), 'rosa@example.com')).toBe(false);
    expect(isCarloEmail({}, 'carlo@example.com')).toBe(false);
  });
});

describe('where the pages send someone', () => {
  const carlo = { role: 'carlo', allowed: true, welcomed: true };

  it('sends the family to /unirse until they join, and away from it after', () => {
    expect(redirectFor({ role: 'familiar', allowed: false }, '/')).toBe('/unirse');
    expect(redirectFor({ role: 'familiar', allowed: false }, '/unirse')).toBeNull();
    expect(redirectFor({ role: 'familiar', allowed: true }, '/unirse')).toBe('/');
    expect(redirectFor(null, '/profile')).toBeNull();
  });

  it('shows Carlo his welcome first, then starts each visit on the timeline', () => {
    expect(redirectFor({ ...carlo, welcomed: false }, '/linea-del-tiempo')).toBe('/bienvenida');
    expect(redirectFor({ ...carlo, welcomed: false }, '/bienvenida')).toBeNull();
    expect(redirectFor(carlo, '/', { resumed: false })).toBe('/linea-del-tiempo');
    expect(redirectFor(carlo, '/', { resumed: true })).toBeNull();
  });

  it('keeps Carlo off the pages for writing', () => {
    for (const page of ['/create-memory', '/memories/abc/edit', '/profile', '/admin/familia', '/unirse']) {
      expect(redirectFor(carlo, page)).toBe('/linea-del-tiempo');
    }
    expect(redirectFor(carlo, '/memories/abc')).toBeNull();
    expect(redirectFor(carlo, '/diccionario')).toBeNull();
  });

  it('leaves Carlo where he is while he waits, since he sees the waiting page', () => {
    expect(redirectFor({ role: 'carlo', allowed: false, carloWaiting: true }, '/profile')).toBeNull();
  });
});
