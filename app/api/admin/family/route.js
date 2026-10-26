import { connectToDB } from '@utils/database';
import { requireUser } from '@utils/access';
import Invite from '@models/invite';
import User from '@models/user';
import Memory from '@models/memory';
import { getSettings } from '@models/settings';
import { isCarloEmail } from '@utils/carlo';

export const dynamic = 'force-dynamic';

const reply = (status, body) => Response.json(body, { status });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readEmail = async (request) => {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    return EMAIL.test(email) ? email : null;
  } catch {
    return null;
  }
};

// Everyone on the allow list, and accounts that signed in but never joined.
export const GET = async () => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;

  await connectToDB();
  const [invites, users, counts, settings] = await Promise.all([
    Invite.find().sort({ joinedAt: 1 }).lean(),
    User.find({}, 'email username role').lean(),
    Memory.aggregate([{ $group: { _id: '$creator', count: { $sum: 1 } } }]),
    getSettings(),
  ]);
  const usersByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const memoriesByUser = new Map(counts.map((c) => [String(c._id), c.count]));
  const invited = new Set(invites.map((i) => i.email));

  const members = invites.map((invite) => {
    const user = usersByEmail.get(invite.email);
    return {
      email: invite.email,
      source: invite.source,
      joinedAt: invite.joinedAt,
      username: user?.username ?? null,
      role: user?.role ?? 'familiar',
      memories: user ? memoriesByUser.get(String(user._id)) ?? 0 : 0,
    };
  });
  // Carlo's account is not waiting to join: it opens on its own day.
  const pending = users
    .filter((u) => !invited.has(u.email.toLowerCase()) && !isCarloEmail(settings, u.email))
    .map((u) => ({ email: u.email, username: u.username, firstSeen: u._id.getTimestamp() }));

  return reply(200, { members, pending });
};

// Adds an email to the allow list directly.
export const POST = async (request) => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;

  const email = await readEmail(request);
  if (!email) return reply(400, { error: 'Escribe un correo válido' });

  await connectToDB();
  await Invite.updateOne(
    { email },
    { $setOnInsert: { email, source: 'admin', joinedAt: new Date() } },
    { upsert: true },
  );
  return reply(201, { email });
};

// Removes an email from the allow list. The admin cannot remove themselves.
export const DELETE = async (request) => {
  const { response, user } = await requireUser({ roles: ['admin'] });
  if (response) return response;

  const email = await readEmail(request);
  if (!email) return reply(400, { error: 'Escribe un correo válido' });
  if (email === user.email.toLowerCase()) {
    return reply(400, { error: 'No puedes quitarte a ti mismo' });
  }

  await connectToDB();
  const { deletedCount } = await Invite.deleteOne({ email });
  if (!deletedCount) return reply(404, { error: 'Ese correo no está en la lista' });
  return new Response(null, { status: 204 });
};
