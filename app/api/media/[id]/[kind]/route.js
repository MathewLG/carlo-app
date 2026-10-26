import { isValidObjectId } from 'mongoose';
import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { readMediaFile } from '@utils/services/storage';
import Memory from '@models/memory';

export const dynamic = 'force-dynamic';

const KINDS = ['photo', 'voice'];
const notFound = () => Response.json({ error: 'No existe' }, { status: 404 });

// Streams a memory's photo or voice note to someone in the family. The
// storage address stays on the server; this route is the only way in.
export const GET = async (_request, { params }) => {
  const { response } = await requireUser();
  if (response) return response;

  const { id, kind } = await params;
  if (!KINDS.includes(kind) || !isValidObjectId(id)) return notFound();

  await connectToDB();
  const memory = await Memory.findById(id, { [kind]: 1 }).lean();
  const media = memory?.[kind];
  if (!media) return notFound();

  const file = await readMediaFile(media.path, media.mime);
  if (!file) return notFound();

  return new Response(file.body, {
    headers: {
      // The stored type was checked against the file's bytes on upload.
      'Content-Type': media.mime,
      'Content-Length': String(file.size),
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      // Only the visitor's own browser may keep a copy, never a shared cache.
      'Cache-Control': 'private, max-age=86400',
    },
  });
};
