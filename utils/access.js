import { getServerSession } from 'next-auth';
import { authOptions } from '@utils/auth';
import { connectToDB } from '@utils/database';
import User from '@models/user';
import Invite from '@models/invite';

const deny = (status, error) => ({ response: Response.json({ error }, { status }) });

// Loads the signed-in user and checks them against the allow list on every
// request, so removing someone takes effect on their next page load.
//   roles         only these roles get through (default: any allowed user)
//   allowPending  let signed-in users who are not on the list through too
// Returns { user, allowed } or { response } with a 401/403 to send back.
export const requireUser = async ({ roles, allowPending = false } = {}) => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return deny(401, 'Inicia sesión primero');

  await connectToDB();
  const user = await User.findOne({ email });
  if (!user) return deny(401, 'Inicia sesión primero');

  const allowed = Boolean(await Invite.exists({ email: email.toLowerCase() }));
  if (!allowed && !allowPending) {
    return deny(403, 'Todavía no eres parte de la familia en Carlo App. Pide el código familiar a Mathew.');
  }
  if (roles && !roles.includes(user.role)) return deny(403, 'No tienes permiso para hacer esto');

  return { user, allowed };
};

// The only rule for editing or deleting: the author, or the admin.
export const canEdit = (user, memory) => {
  if (!user || !memory) return false;
  if (user.role === 'admin') return true;
  const creatorId = memory.creator?._id ?? memory.creator;
  return Boolean(creatorId) && creatorId.toString() === user._id.toString();
};
