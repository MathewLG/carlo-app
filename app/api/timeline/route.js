import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { runAfterResponse } from '@utils/background';
import { rebuildDue, rebuildTimeline } from '@utils/timelineBuild';
import { toDayString } from '@utils/dates';
import Event from '@models/event';
import Memory from '@models/memory';
import Word from '@models/word';
import { publicWord } from '@utils/words';
import { isLocked } from '@utils/letters';
import { PUBLIC_FIELDS } from '@models/user';
import { getSettings } from '@models/settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// The timeline: events in order, each with its memories. If it is out of
// date, it is rebuilt after this response and `updating` says so.
export const GET = async () => {
  const { response, user } = await requireUser();
  if (response) return response;

  await connectToDB();
  const settings = await getSettings();
  const due = rebuildDue(settings);
  if (due) runAfterResponse(() => rebuildTimeline());

  const events = await Event.find().sort({ startDay: 1, endDay: 1 }).lean();
  const memories = await Memory.find({ _id: { $in: events.flatMap((e) => e.memoryIds) } }).populate('creator', PUBLIC_FIELDS);
  const byId = new Map(memories.map((m) => [String(m._id), m]));
  const words = await Word.find({ _id: { $in: events.flatMap((e) => e.wordIds ?? []) } }).populate('creator', PUBLIC_FIELDS);
  const wordById = new Map(words.map((w) => [String(w._id), publicWord(w)]));

  return Response.json({
    birthDate: settings.carloBirthDate ? toDayString(settings.carloBirthDate) : null,
    updating: Boolean(settings.timelineDirty),
    // Carlo picks up where he left off.
    resumeAt: user.role === 'carlo' ? (user.lastSeenEventId ?? null) : null,
    events: events
      .map((event) => ({
        id: String(event._id),
        title: event.title,
        startDay: event.startDay,
        endDay: event.endDay,
        source: event.source,
        locked: event.locked,
        // Each memory's JSON swaps file paths for app URLs (models/memory.js).
        // A letter sealed after the last rebuild stays hidden until it opens.
        memories: event.memoryIds.map((id) => byId.get(String(id))).filter((m) => m && !isLocked(m)),
        words: (event.wordIds ?? []).map((id) => wordById.get(String(id))).filter(Boolean),
      }))
      // A moment whose memories are all sealed letters has nothing to show yet.
      .filter((event) => event.memories.length || event.words.length),
  });
};
