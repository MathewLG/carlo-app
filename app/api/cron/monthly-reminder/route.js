import { connectToDB } from '@utils/database';
import { isCronRequest, siteUrl } from '@utils/cron';
import { authorName } from '@utils/format';
import { buildMonthlyReminder, monthKey, previousMonth } from '@utils/reminder';
import { emailAdmins } from '@utils/services/email';
import Memory from '@models/memory';
import Settings, { getSettings } from '@models/settings';
import Word from '@models/word';
import { PUBLIC_FIELDS } from '@models/user';

export const dynamic = 'force-dynamic';

// The 1st of each month (vercel.json): one email to the admin about last
// month. The month is claimed before sending, so a retry never sends twice;
// a failed send gives it back for the next try.
export const GET = async (request) => {
  if (!isCronRequest(request)) return Response.json({ error: 'No autorizado' }, { status: 401 });

  await connectToDB();
  const now = new Date();
  const month = monthKey(now);
  const settings = await getSettings();
  if (settings.monthlyReminder === false) return Response.json({ sent: false, reason: 'off' });

  const previous = settings.lastReminderMonth ?? null;
  const claimed = await Settings.findOneAndUpdate(
    { key: 'app', lastReminderMonth: { $ne: month } },
    { $set: { lastReminderMonth: month } },
  );
  if (!claimed) return Response.json({ sent: false, reason: 'already-sent' });

  const { start, end } = previousMonth(now);
  const [written, milestones, firstWord] = await Promise.all([
    Memory.find({ createdAt: { $gte: start, $lt: end } }, { creator: 1 }).populate('creator', PUBLIC_FIELDS).lean(),
    Memory.distinct('milestone'),
    Word.exists({ firstWord: true }),
  ]);
  const recorded = new Set(milestones.filter(Boolean));
  if (firstWord) recorded.add('Primera palabra');

  const result = await emailAdmins(
    buildMonthlyReminder({
      now,
      authors: written.map((m) => authorName(m.creator)),
      birthDate: settings.carloBirthDate,
      recorded,
      siteUrl: siteUrl(),
    }),
  );
  if (!result.sent && result.reason !== 'not-configured' && result.reason !== 'no-admin') {
    await Settings.updateOne({ key: 'app', lastReminderMonth: month }, { $set: { lastReminderMonth: previous } });
  }
  return Response.json({ sent: result.sent, reason: result.reason, written: written.length });
};
