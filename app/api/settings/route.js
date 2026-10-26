import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { toDayString } from '@utils/dates';
import { parsePastDay } from '@utils/validate';
import { getSettings } from '@models/settings';

export const dynamic = 'force-dynamic';

const reply = (status, body) => Response.json(body, { status });

// Only what the family needs; the join code never leaves the server. The
// admin also sees whether the monthly email is on.
const publicSettings = (settings, user) => ({
  carloBirthDate: settings.carloBirthDate ? toDayString(settings.carloBirthDate) : null,
  ...(user.role === 'admin' && { monthlyReminder: settings.monthlyReminder !== false }),
});

export const GET = async () => {
  const { response, user } = await requireUser();
  if (response) return response;
  await connectToDB();
  return reply(200, publicSettings(await getSettings(), user));
};

// The admin sets Carlo's birth date (a real day, not in the future) and
// turns the monthly email on or off. Either field may come alone.
export const PATCH = async (request) => {
  const { response, user } = await requireUser({ roles: ['admin'] });
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'Solicitud inválida' });
  }
  const hasBirth = Boolean(body) && 'carloBirthDate' in body;
  const hasReminder = Boolean(body) && 'monthlyReminder' in body;
  if (!hasBirth && !hasReminder) return reply(400, { error: 'Escribe la fecha de nacimiento' });
  if (hasReminder && typeof body.monthlyReminder !== 'boolean') return reply(400, { error: 'Solicitud inválida' });
  const birth = hasBirth ? parsePastDay(body.carloBirthDate) : null;
  if (birth?.error) return reply(400, { error: birth.error });
  if (birth && !birth.date) return reply(400, { error: 'Escribe la fecha de nacimiento' });

  await connectToDB();
  const settings = await getSettings();
  if (birth) settings.carloBirthDate = birth.date;
  if (hasReminder) settings.monthlyReminder = body.monthlyReminder;
  await settings.save();
  return reply(200, publicSettings(settings, user));
};
