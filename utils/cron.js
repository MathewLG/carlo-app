import { timingSafeEqual } from 'node:crypto';

// Vercel Cron calls the job routes with "Authorization: Bearer <CRON_SECRET>".
// Without CRON_SECRET set, nobody gets in.
export const isCronRequest = (request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
};

export const siteUrl = () => (process.env.NEXTAUTH_URL || 'https://carlo-app.com').replace(/\/$/, '');
