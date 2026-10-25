import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { toDayString } from '@utils/dates';
import { parsePastDay } from '@utils/validate';
import { getSettings } from '@models/settings';

export const dynamic = 'force-dynamic';

const reply = (status, body) => Response.json(body, { status });

// Only what the family needs; the join code never leaves the server.
const publicSettings = (settings) => ({
  carloBirthDate: settings.carloBirthDate ? toDayString(settings.carloBirthDate) : null,
});

export const GET = async () => {
  const { response } = await requireUser();
  if (response) return response;
  await connectToDB();
  return reply(200, publicSettings(await getSettings()));
};

// The admin sets Carlo's birth date: a real day, not in the future.
export const PATCH = async (request) => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'Solicitud inválida' });
  }
  const birth = parsePastDay(body?.carloBirthDate);
  if (birth.error) return reply(400, { error: birth.error });
  if (!birth.date) return reply(400, { error: 'Escribe la fecha de nacimiento' });

  await connectToDB();
  const settings = await getSettings();
  settings.carloBirthDate = birth.date;
  await settings.save();
  return reply(200, publicSettings(settings));
};
