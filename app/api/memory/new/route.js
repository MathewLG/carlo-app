import { connectToDB } from '@utils/database';
import { getSessionUserId } from '@utils/auth';
import { parseMemoryInput } from '@utils/validate';
import Memory from '@models/memory';

export const POST = async (req) => {
  // The creator always comes from the session, never from the request body,
  // so nobody can post a memory under someone else's name.
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: 'Inicia sesión para agregar un recuerdo' }, { status: 401 });
  }

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
    const newMemory = await Memory.create({ creator: userId, memory: input.memory, tag: input.tag });
    return Response.json(newMemory, { status: 201 });
  } catch (error) {
    console.error('POST /api/memory/new failed', error);
    return Response.json({ error: 'No se pudo agregar el recuerdo' }, { status: 500 });
  }
};
