import { isValidObjectId } from 'mongoose';
import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { authorName } from '@utils/format';
import Memory from '@models/memory';
import User, { PUBLIC_FIELDS } from '@models/user';

export const dynamic = 'force-dynamic';

const notFound = () => Response.json({ error: 'Esta persona no existe' }, { status: 404 });

// One person's family page header: their name, photo and how much they wrote.
// Their memories come from /api/memory?author=<id>.
export const GET = async (_request, { params }) => {
  const { response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  if (!isValidObjectId(id)) return notFound();
  await connectToDB();
  const person = await User.findById(id, PUBLIC_FIELDS).lean();
  if (!person) return notFound();
  const count = await Memory.countDocuments({ creator: person._id });
  return Response.json({ id: String(person._id), name: authorName(person), image: person.image ?? null, count });
};
