import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { extensionFor } from '@utils/media';
import { authorName, memoryDate } from '@utils/format';
import { toDayString } from '@utils/dates';
import Memory, { publicMedia } from '@models/memory';
import { getSettings } from '@models/settings';
import Word from '@models/word';
import { isLocked } from '@utils/letters';
import { sortWords } from '@utils/words';

export const dynamic = 'force-dynamic';

// Everything the admin's browser needs to build the backup zip: every memory
// in the order it happened, where to fetch each file through the app, and
// the Diccionario A to Z. Cartas con candado still sealed come apart, in the
// order they open (decided: they belong in the family's copy).
// Files are fetched one by one, since a zip of them all would not fit in one
// Vercel response.
export const GET = async () => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;

  await connectToDB();
  const [memories, settings, words] = await Promise.all([
    Memory.find().populate('creator', 'username displayName').lean(),
    getSettings(),
    Word.find().populate('creator', 'username displayName').lean(),
  ]);

  // Sealed letters keep their own folder, so nobody opens them by accident.
  const entry = (memory, folder) => {
    const date = memoryDate(memory);
    const media = publicMedia(memory);
    const file = (kind) =>
      memory[kind] && {
        url: media[kind].url,
        name: `${folder}${toDayString(date)}-${memory._id}-${kind === 'photo' ? 'foto' : 'voz'}.${extensionFor(memory[kind].mime)}`,
      };
    return {
      id: String(memory._id),
      author: authorName(memory.creator),
      day: toDayString(date),
      writtenAt: memory.createdAt ?? null,
      tag: memory.tag,
      memory: memory.memory,
      ...(memory.unlockAt && { unlockAt: toDayString(memory.unlockAt) }),
      photo: file('photo') && { ...file('photo'), caption: memory.photo.caption ?? '' },
      voice: file('voice') || undefined,
    };
  };
  const byDay = (a, b) => a.day.localeCompare(b.day);
  const entries = memories.filter((m) => !isLocked(m)).map((m) => entry(m, 'media/')).sort(byDay);
  const sealed = memories
    .filter((m) => isLocked(m))
    .map((m) => entry(m, 'cartas-con-candado/media/'))
    .sort((a, b) => a.unlockAt.localeCompare(b.unlockAt));

  return Response.json({
    exportedAt: new Date().toISOString(),
    carloBirthDate: settings.carloBirthDate ? toDayString(settings.carloBirthDate) : null,
    memories: entries,
    sealed,
    words: sortWords(words).map((w) => ({
      word: w.word,
      meaning: w.meaning,
      day: toDayString(w.saidAt),
      heardBy: w.heardBy ?? '',
      firstWord: Boolean(w.firstWord),
      author: authorName(w.creator),
    })),
  });
};
