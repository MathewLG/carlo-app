import { isValidObjectId } from 'mongoose';
import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { escapeRegex } from '@utils/validate';
import { memoryDate } from '@utils/format';
import Memory from '@models/memory';
import { PUBLIC_FIELDS } from '@models/user';

export const dynamic = 'force-dynamic';

// Query params:
//   q    text to search inside the memory or its tag
//   tag  exact tag to filter by
//   mine   "1" to only return the signed-in user's memories
//   author a user id: only that person's memories (their family page)
//   order  "oldest" for the order they happened in; newest written first otherwise
export const GET = async (request) => {
  const { response, user } = await requireUser();
  if (response) return response;

  const params = new URL(request.url).searchParams;
  const q = (params.get('q') || '').trim().substring(0, 100);
  const tag = (params.get('tag') || '').trim().substring(0, 50);
  const mine = params.get('mine') === '1';
  const author = params.get('author');
  const oldest = params.get('order') === 'oldest';
  if (author !== null && !isValidObjectId(author)) return Response.json([], { status: 200 });

  const filter = {};
  if (mine) filter.creator = user._id;
  else if (author) filter.creator = author;
  if (tag) filter.tag = tag;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ memory: pattern }, { tag: pattern }];
  }

  try {
    await connectToDB();
    // Only public profile fields; creator emails stay on the server.
    const memories = await Memory.find(filter)
      .sort({ _id: -1 })
      .populate('creator', PUBLIC_FIELDS);
    if (oldest) memories.sort((a, b) => memoryDate(a) - memoryDate(b));

    return Response.json(memories, { status: 200 });
  } catch (error) {
    console.error('GET /api/memory failed', error);
    return Response.json({ error: 'No se pudieron descargar los recuerdos' }, { status: 500 });
  }
};
