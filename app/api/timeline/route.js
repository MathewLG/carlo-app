import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { runAfterResponse } from '@utils/background';
import { rebuildDue, rebuildTimeline } from '@utils/timelineBuild';
import { toDayString } from '@utils/dates';
import Event from '@models/event';
import Memory from '@models/memory';
import { getSettings } from '@models/settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// The timeline: events in order, each with its memories. If it is out of
// date, it is rebuilt after this response and `updating` says so.
export const GET = async () => {
  const { response } = await requireUser();
  if (response) return response;

  await connectToDB();
  const settings = await getSettings();
  const due = rebuildDue(settings);
  if (due) runAfterResponse(() => rebuildTimeline());

  const events = await Event.find().sort({ startDay: 1, endDay: 1 }).lean();
  const memories = await Memory.find({ _id: { $in: events.flatMap((e) => e.memoryIds) } }).populate(
    'creator',
    'username image',
  );
  const byId = new Map(memories.map((m) => [String(m._id), m]));

  return Response.json({
    birthDate: settings.carloBirthDate ? toDayString(settings.carloBirthDate) : null,
    updating: Boolean(settings.timelineDirty),
    events: events.map((event) => ({
      id: String(event._id),
      title: event.title,
      startDay: event.startDay,
      endDay: event.endDay,
      source: event.source,
      locked: event.locked,
      // Each memory's JSON swaps file paths for app URLs (models/memory.js).
      memories: event.memoryIds.map((id) => byId.get(String(id))).filter(Boolean),
    })),
  });
};
