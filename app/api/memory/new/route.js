import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { parseMemoryInput } from '@utils/validate';
import { timelineChanged } from '@utils/timelineBuild';
import Memory from '@models/memory';
import { getSettings } from '@models/settings';
import { parseLock } from '@utils/letters';

// The timeline rebuild runs after the response, inside this function.
export const maxDuration = 60;

export const POST = async (req) => {
  // The creator always comes from the session, never from the request body,
  // so nobody can post a memory under someone else's name.
  const { response, user } = await requireUser();
  if (response) return response;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const input = parseMemoryInput(body);
  if (input.error) {
    return Response.json({ error: input.error }, { status: 400 });
  }

  try {
    await connectToDB();
    const lock = parseLock(body.lock, body.lock?.age !== undefined ? (await getSettings()).carloBirthDate : null);
    if (lock.error) return Response.json({ error: lock.error }, { status: 400 });
    const newMemory = await Memory.create({
      creator: user._id,
      memory: input.memory,
      tag: input.tag,
      happenedAt: input.happenedAt ?? undefined,
      milestone: input.milestone || undefined,
      unlockAt: lock.unlockAt ?? undefined,
      lockAge: lock.lockAge ?? undefined,
    });
    await timelineChanged();
    return Response.json(newMemory, { status: 201 });
  } catch (error) {
    console.error('POST /api/memory/new failed', error);
    return Response.json({ error: 'No se pudo agregar el recuerdo' }, { status: 500 });
  }
};
