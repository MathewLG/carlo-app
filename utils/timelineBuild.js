import { connectToDB } from '@utils/database';
import { runAfterResponse } from '@utils/background';
import { planTimeline } from '@utils/timeline';
import Event from '@models/event';
import Memory from '@models/memory';
import Word from '@models/word';
import Settings, { getSettings } from '@models/settings';

export const REBUILD_EVERY_MS = 60 * 1000;
const BUILD_LOCK_MS = 3 * 60 * 1000;

// Marks the timeline out of date after a memory is written, edited or
// deleted, and rebuilds it once the response is sent.
export const timelineChanged = async () => {
  await connectToDB();
  await Settings.updateOne({ key: 'app' }, { $set: { timelineDirty: true } }, { upsert: true });
  runAfterResponse(() => rebuildTimeline());
};

// True when the timeline is out of date and the last rebuild was over a minute ago.
export const rebuildDue = (settings, now = new Date()) =>
  Boolean(settings.timelineDirty) &&
  (!settings.timelineBuiltAt || now - new Date(settings.timelineBuiltAt) >= REBUILD_EVERY_MS);

// Regroups the memories into events. Skips when nothing changed or a rebuild
// ran less than a minute ago, unless force (the admin's "Reorganizar").
// Moments named in a Claude Code session (scripts/timeline.mjs) and the
// admin's edits are kept; new memories are grouped by month. Returns true
// when it rebuilt.
export const rebuildTimeline = async ({ force = false } = {}) => {
  await connectToDB();
  const settings = await getSettings();
  const now = new Date();
  if (!force && !rebuildDue(settings, now)) return false;

  // Take the lock, and clear the flag now: a memory written during the
  // rebuild sets it again, so that change gets the next rebuild.
  const claimed = await Settings.findOneAndUpdate(
    { key: 'app', $or: [{ timelineBuildingUntil: null }, { timelineBuildingUntil: { $lt: now } }] },
    { $set: { timelineBuildingUntil: new Date(now.getTime() + BUILD_LOCK_MS), timelineDirty: false } },
    { returnDocument: 'after' },
  );
  if (!claimed) return false;

  try {
    const [memories, events, firstWords] = await Promise.all([
      Memory.find({}, { memory: 1, tag: 1, happenedAt: 1, createdAt: 1, milestone: 1, unlockAt: 1 }).lean(),
      Event.find({ $or: [{ locked: true }, { source: 'claude' }] }).lean(),
      Word.find({ firstWord: true }, { word: 1, saidAt: 1 }).lean(),
    ]);
    const planned = planTimeline({ memories, keptEvents: events, birthDate: settings.carloBirthDate, firstWords });

    // New events go in before the old ones go out, so the page never sees an
    // empty timeline mid-rebuild.
    const created = planned.length ? await Event.insertMany(planned) : [];
    await Event.deleteMany({ _id: { $nin: created.map((e) => e._id) } });
    await Settings.updateOne({ key: 'app' }, { $set: { timelineBuiltAt: new Date() } });
    return true;
  } catch (error) {
    // Leave it marked out of date, so the next visit tries again.
    await Settings.updateOne({ key: 'app' }, { $set: { timelineDirty: true } });
    throw error;
  } finally {
    await Settings.updateOne({ key: 'app' }, { $set: { timelineBuildingUntil: null } });
  }
};
