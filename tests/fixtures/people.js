import User from '@models/user';
import Memory from '@models/memory';

let counter = 0;

// A user with a unique email each call; pass overrides for the fields a test cares about.
export const makeUser = (overrides = {}) => {
  counter += 1;
  return User.create({
    email: `familiar${counter}@example.com`,
    username: `familiar${counter}`,
    ...overrides,
  });
};

export const makeMemory = (creator, overrides = {}) =>
  Memory.create({ creator: creator._id, memory: 'Tu primer día en casa', tag: '#recuerdo', ...overrides });
