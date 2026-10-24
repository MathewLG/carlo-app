import { connectToDB } from '@utils/database';
import { getSessionUserId } from '@utils/auth';
import Memory from '@models/memory';

export const dynamic = 'force-dynamic';

export const GET = async () => {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: 'Inicia sesión para ver los recuerdos' }, { status: 401 });
  }

  try {
    await connectToDB();
    // Only public profile fields; creator emails stay on the server.
    const memories = await Memory.find({})
      .sort({ _id: -1 })
      .populate('creator', 'username image');

    return Response.json(memories, { status: 200 });
  } catch (error) {
    console.error('GET /api/memory failed', error);
    return Response.json({ error: 'No se pudieron descargar los recuerdos' }, { status: 500 });
  }
};
