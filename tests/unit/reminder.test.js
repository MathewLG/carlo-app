import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildLetterOpened, buildMonthlyReminder, monthKey, previousMonth } from '@utils/reminder';
import { isCronRequest, siteUrl } from '@utils/cron';
import { emailAdmins } from '@utils/services/email';

const day = (d) => new Date(`${d}T12:00:00Z`);
// 1 November 2026, 9:00 in Mexico City.
const firstOfMonth = new Date('2026-11-01T15:00:00Z');

describe('months in Mexico City', () => {
  it('names the month a moment falls in, and spans the month before', () => {
    expect(monthKey(firstOfMonth)).toBe('2026-11');
    expect(monthKey(new Date('2026-11-01T05:00:00Z'))).toBe('2026-10'); // still 31 October there
    const { start, end } = previousMonth(firstOfMonth);
    expect(start.toISOString()).toBe('2026-10-01T06:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-01T06:00:00.000Z');
    expect(previousMonth(new Date('2027-01-01T15:00:00Z')).start.toISOString()).toBe('2026-12-01T06:00:00.000Z');
  });
});

describe('buildMonthlyReminder', () => {
  const base = { now: firstOfMonth, birthDate: day('2023-05-15'), siteUrl: 'https://carlo-app.com' };

  it('says who wrote last month, Carlo’s age now and the first times still missing, with one button', () => {
    const email = buildMonthlyReminder({
      ...base,
      authors: ['Beto', 'Abuela Rosa', 'Abuela Rosa'],
      recorded: new Set(['Primera sonrisa', 'Primer diente', 'Primera palabra']),
    });
    expect(email.subject).toBe('Carlo App: 3 recuerdos en octubre de 2026');
    expect(email.text).toContain('En octubre de 2026 la familia escribió 3 recuerdos: Abuela Rosa (2), Beto (1).');
    expect(email.text).toContain('Este mes Carlo tiene 3 años.');
    expect(email.text).toContain('Primeras veces sin recuerdo todavía:');
    expect(email.text).not.toMatch(/todavía:.*Primer diente/);
    expect(email.html).toContain('href="https://carlo-app.com/create-memory"');
    expect(email.html).toContain('Admin → Carlo');
  });

  it('says so when nobody wrote, and escapes names in the HTML', () => {
    const quiet = buildMonthlyReminder({ ...base, authors: [], recorded: new Set() });
    expect(quiet.subject).toBe('Carlo App: nadie escribió en octubre de 2026');
    const tricky = buildMonthlyReminder({ ...base, authors: ['<b>Tío</b>'], recorded: new Set() });
    expect(tricky.html).toContain('&lt;b&gt;Tío&lt;/b&gt;');
    expect(tricky.html).not.toContain('<b>Tío');
  });

  it('leaves out the age without a birth date', () => {
    expect(buildMonthlyReminder({ ...base, birthDate: null, authors: [], recorded: new Set() }).text).not.toContain('Carlo tiene');
  });
});

describe('buildLetterOpened', () => {
  it('names the author and links to the letter, never quoting it', () => {
    const email = buildLetterOpened({ author: 'Abuela Rosa', writtenOn: '3 de mayo de 2026', url: 'https://carlo-app.com/memories/abc' });
    expect(email.subject).toBe('Hoy se abrió una carta de Abuela Rosa');
    expect(email.text).toContain('La carta con candado que Abuela Rosa escribió el 3 de mayo de 2026 se abrió hoy.');
    expect(email.html).toContain('href="https://carlo-app.com/memories/abc"');
  });
});

describe('cron requests', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'cron-test-secret';
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXTAUTH_URL;
  });
  const call = (authorization) => new Request('http://localhost/api/cron/unlocks', { headers: authorization ? { authorization } : {} });

  it('only lets in Vercel Cron with the secret', () => {
    expect(isCronRequest(call('Bearer cron-test-secret'))).toBe(true);
    expect(isCronRequest(call('Bearer wrong'))).toBe(false);
    expect(isCronRequest(call())).toBe(false);
  });

  it('lets nobody in when no secret is set', () => {
    delete process.env.CRON_SECRET;
    expect(isCronRequest(call('Bearer '))).toBe(false);
    expect(isCronRequest(call('Bearer undefined'))).toBe(false);
  });

  it('links to the site the app runs on', () => {
    expect(siteUrl()).toBe('https://carlo-app.com');
    process.env.NEXTAUTH_URL = 'https://preview.example.com/';
    expect(siteUrl()).toBe('https://preview.example.com');
  });
});

describe('emailAdmins', () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends nothing without RESEND_API_KEY', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await emailAdmins({ subject: 'x', html: 'x', text: 'x' })).toEqual({ sent: false, reason: 'not-configured' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
