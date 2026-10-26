import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import {
  ACCOUNT_TRY_LIMIT,
  countFailure,
  GLOBAL_TRY_LIMIT,
  isLockedOut,
  verifyCode,
} from '@utils/joinCode';
import Invite from '@models/invite';
import { getSettings } from '@models/settings';

export const dynamic = 'force-dynamic';

const reply = (status, body) => Response.json(body, { status });

// A signed-in account that is not on the allow list joins by typing the family code.
export const POST = async (request) => {
  const { response, user, allowed } = await requireUser({ allowPending: true });
  if (response) return response;
  // Carlo's account opens on its own day; the family code is not a way around it.
  if (user.role === 'carlo') return reply(403, { error: 'Esta es la cuenta de Carlo: se abre sola cuando llegue el día.' });
  if (allowed) return reply(200, { joined: true });

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'Solicitud inválida' });
  }

  await connectToDB();
  const settings = await getSettings();
  if (!settings.joinOpen || !settings.joinCodeHash) {
    return reply(403, { error: 'Por ahora no se puede entrar con código. Pídele a Mathew que te agregue.' });
  }
  if (isLockedOut(user.joinAttempts, ACCOUNT_TRY_LIMIT)) {
    return reply(429, { error: 'Demasiados intentos. Espera una hora y vuelve a intentarlo.' });
  }

  if (verifyCode(body?.code, settings.joinCodeSalt, settings.joinCodeHash)) {
    await Invite.updateOne(
      { email: user.email.toLowerCase() },
      { $setOnInsert: { email: user.email.toLowerCase(), source: 'codigo', joinedAt: new Date() } },
      { upsert: true },
    );
    user.joinAttempts = { count: 0 };
    await user.save();
    return reply(200, { joined: true });
  }

  const mine = countFailure(user.joinAttempts, ACCOUNT_TRY_LIMIT);
  user.joinAttempts = mine.counter;
  await user.save();

  // Many wrong codes across all accounts look like guessing: close joining
  // until the admin opens it again.
  const everyone = countFailure(settings.joinFailures, GLOBAL_TRY_LIMIT);
  settings.joinFailures = everyone.counter;
  if (everyone.limited) settings.joinOpen = false;
  await settings.save();

  if (mine.limited) {
    return reply(429, { error: 'Demasiados intentos. Espera una hora y vuelve a intentarlo.' });
  }
  return reply(400, {
    error: 'Ese no es el código familiar.',
    triesLeft: ACCOUNT_TRY_LIMIT - mine.counter.count,
  });
};
