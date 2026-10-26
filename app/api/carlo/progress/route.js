import { isValidObjectId } from 'mongoose';
import { requireUser } from '@utils/access';
import Event from '@models/event';

export const dynamic = 'force-dynamic';

// The timeline moment Carlo is reading, so his next visit picks up there.
export const PATCH = async (request) => {
  const { response, user } = await requireUser({ roles: ['carlo'] });
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
  const eventId = body?.eventId;
  if (!isValidObjectId(eventId) || !(await Event.exists({ _id: eventId }))) {
    return Response.json({ error: 'Ese momento no existe' }, { status: 400 });
  }
  user.lastSeenEventId = String(eventId);
  await user.save();
  return Response.json({ eventId: user.lastSeenEventId });
};
