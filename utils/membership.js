import Invite from '@models/invite';
import Settings from '@models/settings';
import { carloAccessOpen, isCarloEmail } from '@utils/carlo';

// Whether a signed-in user may use the app, for the API (requireUser) and the
// pages (the session). Family members need to be on the allow list; Carlo's
// account (settings.carloEmail) gets in only once his access is open. Keeps
// users.role in step with settings.carloEmail, so the role follows the email.
// Takes the user's mongoose document. Returns { allowed, carloWaiting }.
export const membership = async (user) => {
  const settings = await Settings.findOne(
    { key: 'app' },
    { carloEmail: 1, carloAccess: 1, carloAccessAge: 1, carloBirthDate: 1 },
  ).lean();
  const carlo = isCarloEmail(settings, user.email) && user.role !== 'admin';
  if (carlo !== (user.role === 'carlo')) {
    user.role = carlo ? 'carlo' : 'familiar';
    await user.save();
  }
  if (carlo) {
    const open = carloAccessOpen(settings);
    return { allowed: open, carloWaiting: !open };
  }
  return { allowed: Boolean(await Invite.exists({ email: user.email.toLowerCase() })), carloWaiting: false };
};
