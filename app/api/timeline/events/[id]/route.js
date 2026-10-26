import { isValidObjectId } from 'mongoose';
import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { toDayString } from '@utils/dates';
import { memoryDate } from '@utils/format';
import { MAX_TITLE_LENGTH } from '@utils/timeline';
import Event from '@models/event';
import Memory from '@models/memory';

export const dynamic = 'force-dynamic';

const reply = (status, body) => Response.json(body, { status });

// Recomputes the first and last day of an event from its memories.
const refreshSpan = async (event) => {
  const memories = await Memory.find({ _id: { $in: event.memoryIds } }, { happenedAt: 1, createdAt: 1 }).lean();
  const days = memories.map((m) => toDayString(memoryDate(m))).sort();
  event.startDay = days[0];
  event.endDay = days.at(-1);
};

// The admin's changes to an event. Every change locks the event (and the
// other one involved), so no rebuild or session regroups or renames it again.
//   { title }                      rename
//   { mergeWith: eventId }         take in all of another event's memories
//   { moveMemory, toEvent }        move one memory from this event to another
export const PATCH = async (request, { params }) => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'Solicitud inválida' });
  }
  if (!isValidObjectId(id)) return reply(404, { error: 'Ese momento no existe' });

  await connectToDB();
  const event = await Event.findById(id);
  if (!event) return reply(404, { error: 'Ese momento no existe' });
  if (event.source === 'palabra') return reply(400, { error: 'Las palabras se cambian en el Diccionario' });

  if (typeof body?.title === 'string') {
    const title = body.title.trim();
    if (!title || title.length > MAX_TITLE_LENGTH) {
      return reply(400, { error: `El nombre debe tener entre 1 y ${MAX_TITLE_LENGTH} caracteres` });
    }
    event.title = title;
    event.locked = true;
    await event.save();
    return reply(200, { id: String(event._id), title: event.title });
  }

  const otherId = body?.mergeWith ?? body?.toEvent;
  if (!isValidObjectId(otherId) || String(otherId) === id) return reply(400, { error: 'Solicitud inválida' });
  const other = await Event.findById(otherId);
  if (!other) return reply(404, { error: 'Ese momento no existe' });
  if (other.source === 'palabra') return reply(400, { error: 'Las palabras se cambian en el Diccionario' });

  if (body.mergeWith) {
    event.memoryIds.push(...other.memoryIds);
    event.locked = true;
    await refreshSpan(event);
    await event.save();
    await other.deleteOne();
    return reply(200, { id: String(event._id) });
  }

  const memoryId = String(body?.moveMemory ?? '');
  if (!event.memoryIds.some((m) => String(m) === memoryId)) {
    return reply(400, { error: 'Ese recuerdo no está en este momento' });
  }
  event.memoryIds = event.memoryIds.filter((m) => String(m) !== memoryId);
  other.memoryIds.push(memoryId);
  other.locked = true;
  await refreshSpan(other);
  await other.save();
  if (event.memoryIds.length) {
    event.locked = true;
    await refreshSpan(event);
    await event.save();
  } else {
    await event.deleteOne();
  }
  return reply(200, { id: String(other._id) });
};
