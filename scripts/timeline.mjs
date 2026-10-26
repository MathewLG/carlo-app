// Names the timeline's moments in a Claude Code session, on demand. The site
// never calls Claude: it keeps the named moments and groups new memories by
// month until the next session.
//
// 1. Export the memories that have no named moment yet (--all: every memory
//    outside the admin's edited moments, to regroup them all):
//      node --env-file=.env.local scripts/timeline.mjs export <out.json> --db carlo_app [--all]
// 2. In the session, write the groups as
//      [{ "title": "Tu primer cumpleaños", "memoryIds": ["…", "…"] }, …]
//    Titles in Spanish speaking to Carlo, six words or fewer, using only what
//    the memories say. To add memories to a named moment, list its memories too.
// 3. Check them, then save:
//      node --env-file=.env.local scripts/timeline.mjs apply <groups.json> --db carlo_app [--apply]
import { readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import './aliases.mjs';
import { connect, parseArgs } from './lib.mjs';

const { checkGroups, planTimeline, timelineItems, withSessionGroups } = await import('@utils/timeline');

const BUILD_LOCK_MS = 3 * 60 * 1000;
const { apply, db, rest } = parseArgs();
const [command, file] = rest;
const all = rest.includes('--all');
if (!['export', 'apply'].includes(command) || !file) {
  throw new Error('Usage: scripts/timeline.mjs export <out.json> [--all] | apply <groups.json> [--apply], with --db <name>');
}

const conn = await connect(db);
const settingsDb = conn.collection('settings');
const eventsDb = conn.collection('events');

const load = async () => {
  const [memories, events, settings] = await Promise.all([
    conn.collection('memories').find({}, { projection: { memory: 1, tag: 1, happenedAt: 1, createdAt: 1, milestone: 1 } }).toArray(),
    eventsDb.find({ $or: [{ locked: true }, { source: 'claude' }] }).toArray(),
    settingsDb.findOne({ key: 'app' }),
  ]);
  return { memories, events, birthDate: settings?.carloBirthDate ?? null };
};

// The groups checked against the memories and events as they are now.
const plan = ({ memories, events, birthDate }, groups) => {
  const invalid = checkGroups(groups, memories.map((m) => m._id));
  const result = invalid ? { error: invalid } : withSessionGroups(events, groups);
  if (result.error) throw new Error(result.error);
  return planTimeline({ memories, keptEvents: result.keptEvents, birthDate });
};

try {
  const state = await load();

  if (command === 'export') {
    const skip = new Set(state.events.filter((e) => e.locked || !all).flatMap((e) => e.memoryIds.map(String)));
    const items = timelineItems(state.memories, state.birthDate).filter((i) => !i.milestone && !skip.has(i.id));
    const named = state.events
      .filter((e) => !e.locked && e.source === 'claude')
      .map((e) => ({ title: e.title, memoryIds: e.memoryIds.map(String), startDay: e.startDay, endDay: e.endDay }));
    await writeFile(file, JSON.stringify({ named, items }, null, 2));
    console.log(`${db}: ${items.length} memories to name and ${named.length} named moments, written to ${file}.`);
  } else {
    const groups = JSON.parse(await readFile(file, 'utf8'));
    const planned = plan(state, groups);
    console.log(`${db}: the timeline ${apply ? 'is now' : 'would be'}:`);
    for (const e of planned) console.log(`  ${e.startDay}  ${e.title} (${e.memoryIds.length}, ${e.locked ? 'admin' : e.source})`);

    if (apply) {
      // The same lock the site's rebuild takes, so the two never overlap.
      const now = new Date();
      await settingsDb.updateOne({ key: 'app' }, { $setOnInsert: { key: 'app' } }, { upsert: true });
      const claimed = await settingsDb.findOneAndUpdate(
        { key: 'app', $or: [{ timelineBuildingUntil: null }, { timelineBuildingUntil: { $lt: now } }] },
        { $set: { timelineBuildingUntil: new Date(now.getTime() + BUILD_LOCK_MS) } },
      );
      if (!claimed) throw new Error('The site is rebuilding the timeline. Try again in a minute.');
      try {
        // Planned again under the lock, in case a memory changed since.
        const events = plan(await load(), groups).map((e) => ({
          ...e,
          memoryIds: e.memoryIds.map((id) => new mongoose.Types.ObjectId(id)),
        }));
        const { insertedIds } = await eventsDb.insertMany(events);
        await eventsDb.deleteMany({ _id: { $nin: Object.values(insertedIds) } });
        await settingsDb.updateOne({ key: 'app' }, { $set: { timelineBuiltAt: new Date(), timelineDirty: false } });
      } finally {
        await settingsDb.updateOne({ key: 'app' }, { $set: { timelineBuildingUntil: null } });
      }
      console.log('Done.');
    } else {
      console.log('Dry run: nothing changed. Add --apply to save it.');
    }
  }
} finally {
  await conn.close();
}
