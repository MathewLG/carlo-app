import { connectToDB } from '@utils/database';
import { getSessionUserId } from '@utils/auth';
import Memory from '@models/memory';

const MAX_MEMORY_LENGTH = 5000;
const MAX_TAG_LENGTH = 50;

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

  const memory = typeof body.memory === 'string' ? body.memory.trim() : '';
  const tag = typeof body.tag === 'string' ? body.tag.trim() : '';

  if (!memory || !tag) {
    return Response.json({ error: 'El recuerdo y la categoría son obligatorios' }, { status: 400 });
  }
  if (memory.length > MAX_MEMORY_LENGTH || tag.length > MAX_TAG_LENGTH) {
    return Response.json({ error: 'El texto es demasiado largo' }, { status: 400 });
  }

  try {
    await connectToDB();
    const newMemory = await Memory.create({ creator: userId, memory, tag });
    return Response.json(newMemory, { status: 201 });
  } catch (error) {
    console.error('POST /api/memory/new failed', error);
    return Response.json({ error: 'No se pudo agregar el recuerdo' }, { status: 500 });
  }
};
