import { requireUser } from '@utils/access';
import { MAX_DISPLAY_NAME_LENGTH } from '@utils/format';

export const dynamic = 'force-dynamic';

// Changes the signed-in person's own name in the app ("Mi nombre en Carlo
// App"). An empty name goes back to the username.
export const PATCH = async (request) => {
  const { response, user } = await requireUser({ write: true });
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
  if (typeof body?.displayName !== 'string') return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  const displayName = body.displayName.trim().replace(/\s+/g, ' ');
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return Response.json({ error: `Tu nombre puede tener hasta ${MAX_DISPLAY_NAME_LENGTH} caracteres` }, { status: 400 });
  }

  user.displayName = displayName || undefined;
  await user.save();
  return Response.json({ displayName });
};
