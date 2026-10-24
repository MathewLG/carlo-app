import { isValidObjectId } from 'mongoose';
import { connectToDB } from '@utils/database';
import { getSessionUserId } from '@utils/auth';
import { parseMemoryInput } from '@utils/validate';
import Memory from '@models/memory';

export const dynamic = 'force-dynamic';

const notFound = () => Response.json({ error: 'Este recuerdo no existe' }, { status: 404 });

// Shared guard: signed in, valid id, memory exists. Returns { userId, memory } or { response }.
const loadMemory = async (id) => {
  const userId = await getSessionUserId();
  if (!userId) {
    return { response: Response.json({ error: 'Inicia sesión primero' }, { status: 401 }) };
  }
  if (!isValidObjectId(id)) return { response: notFound() };

  await connectToDB();
  const memory = await Memory.findById(id).populate('creator', 'username image');
  if (!memory) return { response: notFound() };
  return { userId, memory };
};

const isOwner = (memory, userId) => memory.creator?._id?.toString() === userId;

export const GET = async (_request, { params }) => {
  try {
    const { response, memory } = await loadMemory(params.id);
    if (response) return response;
    return Response.json(memory, { status: 200 });
  } catch (error) {
    console.error('GET /api/memory/[id] failed', error);
    return Response.json({ error: 'No se pudo cargar el recuerdo' }, { status: 500 });
  }
};

export const PATCH = async (request, { params }) => {
  try {
    const { response, userId, memory } = await loadMemory(params.id);
    if (response) return response;
    if (!isOwner(memory, userId)) {
      return Response.json({ error: 'Solo quien escribió este recuerdo puede editarlo' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
    }
    const input = parseMemoryInput(body);
    if (input.error) return Response.json({ error: input.error }, { status: 400 });

    memory.memory = input.memory;
    memory.tag = input.tag;
    await memory.save();
    return Response.json(memory, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/memory/[id] failed', error);
    return Response.json({ error: 'No se pudo guardar el recuerdo' }, { status: 500 });
  }
};

export const DELETE = async (_request, { params }) => {
  try {
    const { response, userId, memory } = await loadMemory(params.id);
    if (response) return response;
    if (!isOwner(memory, userId)) {
      return Response.json({ error: 'Solo quien escribió este recuerdo puede borrarlo' }, { status: 403 });
    }
    await Memory.deleteOne({ _id: memory._id });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/memory/[id] failed', error);
    return Response.json({ error: 'No se pudo borrar el recuerdo' }, { status: 500 });
  }
};
