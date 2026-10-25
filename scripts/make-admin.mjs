// Makes one account the admin and puts it on the allow list.
// The person must have signed in once so their account exists.
//   node --env-file=.env.local scripts/make-admin.mjs you@gmail.com --db carlo_app [--apply]
import { connect, parseArgs } from './lib.mjs';

const { apply, db, rest } = parseArgs();
const email = rest[0]?.trim().toLowerCase();
if (!email) throw new Error('Usage: make-admin.mjs <email> --db <database> [--apply]');

const conn = await connect(db);
try {
  // Strength 2 compares without case, since stored emails keep Google's casing.
  const user = await conn.collection('users').findOne({ email }, { collation: { locale: 'en', strength: 2 } });
  if (!user) throw new Error(`No account for ${email} in ${db}. Sign in to the app once first.`);

  console.log(`${apply ? 'Making' : 'Would make'} ${user.username} (${email}) the admin in ${db}.`);
  if (apply) {
    await conn.collection('users').updateOne({ _id: user._id }, { $set: { role: 'admin' } });
    await conn
      .collection('invites')
      .updateOne({ email }, { $setOnInsert: { email, source: 'admin', joinedAt: new Date() } }, { upsert: true });
    console.log('Done.');
  } else {
    console.log('Dry run: nothing changed. Add --apply to do it.');
  }
} finally {
  await conn.close();
}
