import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import Event from '@models/event';
import Settings from '@models/settings';
import { makeMemory, makeUser } from '../fixtures/people';
import { clearDatabase, startDatabase } from './setup';

// scripts/timeline.mjs, run the way a Claude Code session runs it, against
// the test database.
const run = promisify(execFile);
const script = (...args) =>
  run(process.execPath, ['scripts/timeline.mjs', ...args, '--db', process.env.MONGODB_DB], { env: process.env });
const failure = (promise) => promise.then(() => null, (error) => error.stderr);

const day = (d) => new Date(`${d}T12:00:00Z`);

let stopDatabase;
let dir;
beforeAll(async () => {
  stopDatabase = await startDatabase();
  dir = await mkdtemp(path.join(tmpdir(), 'carlo-timeline-'));
});
afterAll(async () => {
  await stopDatabase();
  await rm(dir, { recursive: true, force: true });
});
beforeEach(() => clearDatabase());

const seed = async () => {
  await Settings.create({ key: 'app', carloBirthDate: day('2023-05-15') });
  const rosa = await makeUser();
  const party = await makeMemory(rosa, { memory: 'Tu fiesta', happenedAt: day('2024-05-15') });
  const gifts = await makeMemory(rosa, { memory: 'Los regalos', happenedAt: day('2024-05-16') });
  const xmas = await makeMemory(rosa, { memory: 'Navidad', happenedAt: day('2024-12-24') });
  const word = await makeMemory(rosa, { memory: 'Dijiste agua', happenedAt: day('2024-02-01'), milestone: 'Primera palabra' });
  return { party, gifts, xmas, word };
};
const exportItems = async (...flags) => {
  const file = path.join(dir, 'items.json');
  await script('export', file, ...flags);
  return JSON.parse(await readFile(file, 'utf8'));
};
const groupsFile = async (groups) => {
  const file = path.join(dir, 'groups.json');
  await writeFile(file, JSON.stringify(groups));
  return file;
};
const timeline = async () => (await Event.find().sort({ startDay: 1 })).map((e) => [e.title, e.source, e.locked]);

describe('scripts/timeline.mjs', () => {
  it('exports the memories without a named moment, without authors or first times', async () => {
    const { party } = await seed();
    const { items, named } = await exportItems();
    expect(items.map((i) => i.text)).toEqual(['Tu fiesta', 'Los regalos', 'Navidad']);
    expect(items[0]).toEqual({ id: String(party._id), day: '2024-05-15', age: 'Carlo tenía 1 año', tag: '#recuerdo', text: 'Tu fiesta' });
    expect(named).toEqual([]);
  });

  it('checks the groups on a dry run, then saves them with --apply', async () => {
    const { party, gifts } = await seed();
    const file = await groupsFile([{ title: 'Tu primer cumpleaños', memoryIds: [String(party._id), String(gifts._id)] }]);

    const { stdout } = await script('apply', file);
    expect(stdout).toContain('2024-05-15  Tu primer cumpleaños (2, claude)');
    expect(stdout).toContain('Dry run');
    expect(await Event.countDocuments()).toBe(0);

    await script('apply', file, '--apply');
    expect(await timeline()).toEqual([
      ['Tu primera palabra', 'hito', false],
      ['Tu primer cumpleaños', 'claude', false],
      ['Diciembre de 2024', 'mes', false],
    ]);
    expect((await Settings.findOne()).toObject()).toMatchObject({ timelineDirty: false, timelineBuildingUntil: null });

    // Next time only the memory still grouped by month is left to name; --all brings back the named ones.
    expect((await exportItems()).items.map((i) => i.text)).toEqual(['Navidad']);
    const all = await exportItems('--all');
    expect(all.items).toHaveLength(3);
    expect(all.named).toEqual([{ title: 'Tu primer cumpleaños', memoryIds: [String(party._id), String(gifts._id)], startDay: '2024-05-15', endDay: '2024-05-16' }]);
  });

  it("regrouping moves memories out of earlier moments and leaves the admin's edits alone", async () => {
    const { party, gifts, xmas } = await seed();
    await Event.create({ title: 'La gran fiesta', memoryIds: [party._id], startDay: '2024-05-15', endDay: '2024-05-15', source: 'claude', locked: true });
    await script('apply', await groupsFile([{ title: 'Regalos', memoryIds: [String(gifts._id)] }]), '--apply');
    await script('apply', await groupsFile([{ title: 'Fin de año', memoryIds: [String(gifts._id), String(xmas._id)] }]), '--apply');
    expect(await timeline()).toEqual([
      ['Tu primera palabra', 'hito', false],
      ['La gran fiesta', 'claude', true],
      ['Fin de año', 'claude', false],
    ]);

    const refused = await failure(script('apply', await groupsFile([{ title: 'X', memoryIds: [String(party._id)] }]), '--apply'));
    expect(refused).toContain('"La gran fiesta" was edited by the admin');
  });

  it('saves even before the site has stored any settings', async () => {
    const lone = await makeMemory(await makeUser(), { happenedAt: day('2024-05-15') });
    await script('apply', await groupsFile([{ title: 'Tu primer día', memoryIds: [String(lone._id)] }]), '--apply');
    expect(await timeline()).toEqual([['Tu primer día', 'claude', false]]);
  });

  it('refuses unknown memories, and waits while the site is rebuilding', async () => {
    const { xmas } = await seed();
    expect(await failure(script('apply', await groupsFile([{ title: 'X', memoryIds: ['65d1a500aaaaaaaaaaaaaaaa'] }]), '--apply')))
      .toContain('does not exist');

    await Settings.updateOne({ key: 'app' }, { timelineBuildingUntil: new Date(Date.now() + 60_000) });
    expect(await failure(script('apply', await groupsFile([{ title: 'Navidad', memoryIds: [String(xmas._id)] }]), '--apply')))
      .toContain('Try again in a minute');
    expect(await Event.countDocuments()).toBe(0);
  });
});
