// Puts everyone who has written at least one memory on the allow list.
// Safe to run more than once: existing entries are left as they are.
//   node --env-file=.env.local scripts/migrate-invites.mjs --db carlo_app [--apply]
import { connect, parseArgs } from './lib.mjs';

const { apply, db } = parseArgs();
const conn = await connect(db);
try {
  const creatorIds = await conn.collection('memories').distinct('creator');
  const authors = await conn
    .collection('users')
    .find({ _id: { $in: creatorIds } }, { projection: { email: 1, username: 1 } })
    .toArray();
  const existing = new Set((await conn.collection('invites').distinct('email')).map((e) => e.toLowerCase()));
  const toAdd = authors.filter((a) => !existing.has(a.email.toLowerCase()));

  console.log(`${db}: ${authors.length} people have written memories; ${toAdd.length} are not on the list yet.`);
  for (const a of toAdd) console.log(`  ${apply ? 'adding' : 'would add'} ${a.username} (${a.email})`);

  if (apply && toAdd.length) {
    await conn.collection('invites').bulkWrite(
      toAdd.map((a) => {
        const email = a.email.toLowerCase();
        return {
          updateOne: {
            filter: { email },
            update: { $setOnInsert: { email, source: 'memoria', joinedAt: new Date() } },
            upsert: true,
          },
        };
      }),
    );
    console.log('Done.');
  } else if (!apply) {
    console.log('Dry run: nothing changed. Add --apply to do it.');
  }
} finally {
  await conn.close();
}
