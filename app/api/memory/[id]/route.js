import { isValidObjectId } from 'mongoose';
import { connectToDB } from '@utils/database';
import { canEdit, requireUser } from '@utils/access';
import { parseMemoryInput } from '@utils/validate';
import { deleteFiles } from '@utils/services/storage';
import { timelineChanged } from '@utils/timelineBuild';
import Memory from '@models/memory';

// The timeline rebuild runs after the response, inside this function.
export const maxDuration = 60;

export const dynamic = 'force-dynamic';

const notFound = () => Response.json({ error: 'Este recuerdo no existe' }, { status: 404 });

// Shared guard: on the allow list, valid id, memory exists. Returns { user, memory } or { response }.
const loadMemory = async (id) => {
  const { response, user } = await requireUser();
  if (response) return { response };
  if (!isValidObjectId(id)) return { response: notFound() };

  await connectToDB();
  const memory = await Memory.findById(id).populate('creator', 'username image');
  if (!memory) return { response: notFound() };
  return { user, memory };
};

export const GET = async (_request, { params }) => {
  try {
    const { response, memory } = await loadMemory((await params).id);
    if (response) return response;
    return Response.json(memory, { status: 200 });
  } catch (error) {
    console.error('GET /api/memory/[id] failed', error);
    return Response.json({ error: 'No se pudo cargar el recuerdo' }, { status: 500 });
  }
};

export const PATCH = async (request, { params }) => {
  try {
    const { response, user, memory } = await loadMemory((await params).id);
    if (response) return response;
    if (!canEdit(user, memory)) {
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

    // The author stays the same even when the admin edits.
    memory.memory = input.memory;
    memory.tag = input.tag;
    memory.happenedAt = input.happenedAt ?? undefined;
    memory.milestone = input.milestone || undefined;
    await memory.save();
    await timelineChanged();
    return Response.json(memory, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/memory/[id] failed', error);
    return Response.json({ error: 'No se pudo guardar el recuerdo' }, { status: 500 });
  }
};

export const DELETE = async (_request, { params }) => {
  try {
    const { response, user, memory } = await loadMemory((await params).id);
    if (response) return response;
    if (!canEdit(user, memory)) {
      return Response.json({ error: 'Solo quien escribió este recuerdo puede borrarlo' }, { status: 403 });
    }
    await Memory.deleteOne({ _id: memory._id });
    // The files go with the memory, so nothing is left behind in storage.
    await deleteFiles([memory.photo?.path, memory.voice?.path]);
    await timelineChanged();
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/memory/[id] failed', error);
    return Response.json({ error: 'No se pudo borrar el recuerdo' }, { status: 500 });
  }
};
