import { connectToDB } from '@utils/database';
import { isCronRequest, siteUrl } from '@utils/cron';
import { authorName, formatDate } from '@utils/format';
import { openBy } from '@utils/letters';
import { buildLetterOpened } from '@utils/reminder';
import { emailAdmins } from '@utils/services/email';
import { rebuildTimeline } from '@utils/timelineBuild';
import Memory from '@models/memory';
import Settings from '@models/settings';
import { PUBLIC_FIELDS } from '@models/user';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Sending can be skipped for good: no Resend key yet, or no admin to tell.
const handled = (result) => result.sent || result.reason === 'not-configured' || result.reason === 'no-admin';

// Daily (vercel.json): tells the admin about each carta con candado that
// opened, and puts it on the timeline. Letters open on their day whether or
// not this runs; it only sends the email and rebuilds. Each letter is marked
// before its email goes out, so a retry never emails twice; a failed send is
// unmarked so the next run tries again.
export const GET = async (request) => {
  if (!isCronRequest(request)) return Response.json({ error: 'No autorizado' }, { status: 401 });

  await connectToDB();
  const now = new Date();
  const due = await Memory.find({ unlockAt: { $lte: openBy(now) }, openedNotifiedAt: null }, { _id: 1 }).lean();

  let notified = 0;
  for (const { _id } of due) {
    const letter = await Memory.findOneAndUpdate(
      { _id, openedNotifiedAt: null },
      { $set: { openedNotifiedAt: now } },
      { returnDocument: 'after' },
    ).populate('creator', PUBLIC_FIELDS);
    if (!letter) continue; // another run took it
    const writtenOn = letter.createdAt ? formatDate(letter.createdAt) : null;
    const result = await emailAdmins(
      buildLetterOpened({ author: authorName(letter.creator), writtenOn, url: `${siteUrl()}/memories/${letter._id}` }),
    );
    if (handled(result)) notified += 1;
    else await Memory.updateOne({ _id }, { $unset: { openedNotifiedAt: 1 } });
  }

  if (due.length) {
    await Settings.updateOne({ key: 'app' }, { $set: { timelineDirty: true } }, { upsert: true });
    await rebuildTimeline({ force: true }).catch((error) => console.error('Rebuild after unlocks failed', error));
  }
  return Response.json({ opened: due.length, notified });
};
