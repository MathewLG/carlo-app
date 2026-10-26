import { isValidObjectId } from 'mongoose';
import { connectToDB } from '@utils/database';
import { canEdit, requireUser } from '@utils/access';
import { isLocked } from '@utils/letters';
import { readMediaFile } from '@utils/services/storage';
import Memory from '@models/memory';

export const dynamic = 'force-dynamic';

const KINDS = ['photo', 'voice'];
const notFound = () => Response.json({ error: 'No existe' }, { status: 404 });

// Streams a memory's photo or voice note to someone in the family. The
// storage address stays on the server; this route is the only way in.
// A sealed letter's files stay hidden (404) from everyone but its author and
// the admin, whose backup keeps sealed letters in their own folder.
export const GET = async (_request, { params }) => {
  const { response, user } = await requireUser();
  if (response) return response;

  const { id, kind } = await params;
  if (!KINDS.includes(kind) || !isValidObjectId(id)) return notFound();

  await connectToDB();
  const memory = await Memory.findById(id, { [kind]: 1, creator: 1, unlockAt: 1 }).lean();
  const media = memory?.[kind];
  if (!media) return notFound();
  // A sealed letter's files: its author, and the admin for the backup zip.
  if (isLocked(memory) && !canEdit(user, memory)) return notFound();

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
