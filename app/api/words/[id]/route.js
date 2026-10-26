import { isValidObjectId } from 'mongoose';
import { connectToDB } from '@utils/database';
import { canEdit, requireUser } from '@utils/access';
import { timelineChanged } from '@utils/timelineBuild';
import { parseWordInput, publicWord } from '@utils/words';
import Word from '@models/word';
import { PUBLIC_FIELDS } from '@models/user';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const reply = (status, body) => Response.json(body, { status });

// Shared guard: on the allow list, the entry exists, and the person wrote it
// or is the admin. Returns { word } or { response }.
const loadOwnWord = async (id) => {
  const { response, user } = await requireUser({ write: true });
  if (response) return { response };
  if (!isValidObjectId(id)) return { response: reply(404, { error: 'Esta palabra no existe' }) };
  await connectToDB();
  const word = await Word.findById(id);
  if (!word) return { response: reply(404, { error: 'Esta palabra no existe' }) };
  if (!canEdit(user, word)) return { response: reply(403, { error: 'Solo quien la escribió puede cambiarla' }) };
  return { word };
};

export const PATCH = async (request, { params }) => {
  const { response, word } = await loadOwnWord((await params).id);
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'Solicitud inválida' });
  }
  const input = parseWordInput(body);
  if (input.error) return reply(400, { error: input.error });

  const touchesTimeline = word.firstWord || input.firstWord;
  Object.assign(word, { ...input, heardBy: input.heardBy || undefined });
  await word.save();
  if (touchesTimeline) await timelineChanged();
  await word.populate('creator', PUBLIC_FIELDS);
  return reply(200, publicWord(word));
};

export const DELETE = async (_request, { params }) => {
  const { response, word } = await loadOwnWord((await params).id);
  if (response) return response;
  await word.deleteOne();
  if (word.firstWord) await timelineChanged();
  return new Response(null, { status: 204 });
};
