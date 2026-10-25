import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { hashCode, MIN_CODE_LENGTH, normalizeCode } from '@utils/joinCode';
import { getSettings } from '@models/settings';

export const dynamic = 'force-dynamic';

const reply = (status, body) => Response.json(body, { status });

const readBody = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const state = (settings) => ({ hasCode: Boolean(settings.joinCodeHash), open: settings.joinOpen });

// Whether a code is set and joining is open. The code itself is never returned.
export const GET = async () => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;
  await connectToDB();
  return reply(200, state(await getSettings()));
};

// Sets a new code and opens joining. People already in are not affected.
export const PUT = async (request) => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;

  const body = await readBody(request);
  if (normalizeCode(body?.code).length < MIN_CODE_LENGTH) {
    return reply(400, { error: `El código debe tener al menos ${MIN_CODE_LENGTH} caracteres` });
  }

  await connectToDB();
  const settings = await getSettings();
  const { salt, hash } = hashCode(body.code);
  settings.joinCodeSalt = salt;
  settings.joinCodeHash = hash;
  settings.joinOpen = true;
  settings.joinFailures = { count: 0 };
  await settings.save();
  return reply(200, state(settings));
};

// Opens or closes joining by code.
export const PATCH = async (request) => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;

  const body = await readBody(request);
  if (typeof body?.open !== 'boolean') return reply(400, { error: 'Solicitud inválida' });

  await connectToDB();
  const settings = await getSettings();
  if (body.open && !settings.joinCodeHash) {
    return reply(400, { error: 'Primero elige un código' });
  }
  settings.joinOpen = body.open;
  if (body.open) settings.joinFailures = { count: 0 };
  await settings.save();
  return reply(200, state(settings));
};
