import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { timelineChanged } from '@utils/timelineBuild';
import { parseWordInput, publicWord, sortWords } from '@utils/words';
import Word from '@models/word';
import { PUBLIC_FIELDS } from '@models/user';

export const dynamic = 'force-dynamic';
// A first word changes the timeline, rebuilt after the response.
export const maxDuration = 60;

// The whole dictionary, A to Z. It is small, so the page searches it itself.
export const GET = async () => {
  const { response } = await requireUser();
  if (response) return response;
  await connectToDB();
  const words = await Word.find().populate('creator', PUBLIC_FIELDS);
  return Response.json(sortWords(words.map(publicWord)));
};

export const POST = async (request) => {
  // The author always comes from the session, never from the request.
  const { response, user } = await requireUser({ write: true });
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
  const input = parseWordInput(body);
  if (input.error) return Response.json({ error: input.error }, { status: 400 });

  await connectToDB();
  const word = await Word.create({ ...input, heardBy: input.heardBy || undefined, creator: user._id });
  if (word.firstWord) await timelineChanged();
  await word.populate('creator', PUBLIC_FIELDS);
  return Response.json(publicWord(word), { status: 201 });
};
