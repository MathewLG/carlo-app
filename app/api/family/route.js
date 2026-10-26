import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import { authorName } from '@utils/format';
import Memory from '@models/memory';
import User, { PUBLIC_FIELDS } from '@models/user';

export const dynamic = 'force-dynamic';

// Everyone who has written for Carlo, with how many memories each, most first.
export const GET = async () => {
  const { response } = await requireUser();
  if (response) return response;

  await connectToDB();
  const counts = await Memory.aggregate([{ $group: { _id: '$creator', count: { $sum: 1 } } }]);
  const people = await User.find({ _id: { $in: counts.map((c) => c._id) } }, PUBLIC_FIELDS).lean();
  const countById = new Map(counts.map((c) => [String(c._id), c.count]));

  return Response.json(
    people
      .map((p) => ({ id: String(p._id), name: authorName(p), image: p.image ?? null, count: countById.get(String(p._id)) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es')),
  );
};
