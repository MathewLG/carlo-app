import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { ACCESS_MODES, accessDay, carloAccessOpen, DEFAULT_ACCESS_AGE, DEFAULT_WELCOME, MAX_ACCESS_AGE, MAX_WELCOME_LENGTH } from '@utils/carlo';
import { toDayString } from '@utils/dates';
import { getSettings } from '@models/settings';
import User from '@models/user';

export const dynamic = 'force-dynamic';

const reply = (status, body) => Response.json(body, { status });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const carloSettings = async (settings) => {
  const carlo = settings.carloEmail ? await User.findOne({ email: settings.carloEmail }, 'welcomedAt').lean() : null;
  const day = accessDay(settings);
  return {
    carloEmail: settings.carloEmail ?? '',
    carloAccessAge: settings.carloAccessAge ?? DEFAULT_ACCESS_AGE,
    carloAccess: settings.carloAccess ?? 'auto',
    welcomeText: settings.welcomeText || DEFAULT_WELCOME,
    accessDay: day ? toDayString(day) : null,
    accessOpen: carloAccessOpen(settings),
    // Whether Carlo has signed in and seen his welcome yet.
    carloSignedIn: Boolean(carlo),
    carloWelcomed: Boolean(carlo?.welcomedAt),
  };
};

// Carlo's own access, for the admin: his email, the age it opens at, opening
// early or pausing, and his welcome text.
export const GET = async () => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;
  await connectToDB();
  return reply(200, await carloSettings(await getSettings()));
};

// Any of: carloEmail ('' to clear), carloAccessAge, carloAccess, welcomeText.
export const PATCH = async (request) => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'Solicitud inválida' });
  }
  if (!body || typeof body !== 'object') return reply(400, { error: 'Solicitud inválida' });

  await connectToDB();
  const settings = await getSettings();
  const previousEmail = settings.carloEmail;

  if ('carloEmail' in body) {
    const email = typeof body.carloEmail === 'string' ? body.carloEmail.trim().toLowerCase() : null;
    if (email === null || (email && !EMAIL.test(email))) return reply(400, { error: 'Escribe un correo válido' });
    if (email && (await User.exists({ email, role: 'admin' }))) {
      return reply(400, { error: 'Ese correo es del administrador; Carlo necesita su propia cuenta' });
    }
    settings.carloEmail = email || undefined;
  }
  if ('carloAccessAge' in body) {
    const age = body.carloAccessAge;
    if (!Number.isInteger(age) || age < 1 || age > MAX_ACCESS_AGE) {
      return reply(400, { error: `La edad debe ser un número entre 1 y ${MAX_ACCESS_AGE}` });
    }
    settings.carloAccessAge = age;
  }
  if ('carloAccess' in body) {
    if (!ACCESS_MODES.includes(body.carloAccess)) return reply(400, { error: 'Solicitud inválida' });
    settings.carloAccess = body.carloAccess;
  }
  if ('welcomeText' in body) {
    const text = typeof body.welcomeText === 'string' ? body.welcomeText.trim() : null;
    if (text === null || text.length > MAX_WELCOME_LENGTH) {
      return reply(400, { error: `La bienvenida puede tener hasta ${MAX_WELCOME_LENGTH} caracteres` });
    }
    settings.welcomeText = text || undefined;
  }
  await settings.save();

  // Only one account holds the role: the old one goes back to the family's.
  if (previousEmail !== settings.carloEmail) {
    await User.updateMany({ role: 'carlo', email: { $ne: settings.carloEmail ?? null } }, { $set: { role: 'familiar' } });
    if (settings.carloEmail) await User.updateOne({ email: settings.carloEmail, role: { $ne: 'admin' } }, { $set: { role: 'carlo' } });
  }
  return reply(200, await carloSettings(settings));
};
