import User from '@models/user';
import Memory from '@models/memory';
import Invite from '@models/invite';

let counter = 0;

// A user with a unique email each call, on the allow list unless invited: false.
// Pass overrides (role, username, …) for the fields a test cares about.
export const makeUser = async ({ invited = true, ...overrides } = {}) => {
  counter += 1;
  const user = await User.create({
    email: `familiar${counter}@example.com`,
    username: `familiar${counter}`,
    ...overrides,
  });
  if (invited) await Invite.create({ email: user.email.toLowerCase(), source: 'admin' });
  return user;
};

export const makeAdmin = (overrides = {}) => makeUser({ role: 'admin', ...overrides });

export const makeMemory = (creator, overrides = {}) =>
  Memory.create({ creator: creator._id, memory: 'Tu primer día en casa', tag: '#recuerdo', ...overrides });
