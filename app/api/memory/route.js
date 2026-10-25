import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { escapeRegex } from '@utils/validate';
import Memory from '@models/memory';

export const dynamic = 'force-dynamic';

// Query params:
//   q    text to search inside the memory or its tag
//   tag  exact tag to filter by
//   mine "1" to only return the signed-in user's memories
export const GET = async (request) => {
  const { response, user } = await requireUser();
  if (response) return response;

  const params = new URL(request.url).searchParams;
  const q = (params.get('q') || '').trim().substring(0, 100);
  const tag = (params.get('tag') || '').trim().substring(0, 50);
  const mine = params.get('mine') === '1';

  const filter = {};
  if (mine) filter.creator = user._id;
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
      .populate('creator', 'username image');

    return Response.json(memories, { status: 200 });
  } catch (error) {
    console.error('GET /api/memory failed', error);
    return Response.json({ error: 'No se pudieron descargar los recuerdos' }, { status: 500 });
  }
};
