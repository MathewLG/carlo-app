import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import User from '@models/user';
import { authOptions } from '@utils/auth';
import { makeUser } from '../fixtures/people';
import { clearDatabase, startDatabase } from './setup';

vi.mock('next-auth', async (importOriginal) => ({ ...(await importOriginal()), getServerSession: vi.fn() }));

const { signIn, session } = authOptions.callbacks;

let stopDatabase;
beforeAll(async () => {
  stopDatabase = await startDatabase();
});
afterAll(() => stopDatabase());
beforeEach(() => clearDatabase());

describe('signIn callback', () => {
  it('creates a user the first time someone signs in', async () => {
    const profile = { email: 'rosa@example.com', name: 'Rosa María', picture: 'https://lh3.googleusercontent.com/r' };

    expect(await signIn({ profile })).toBe(true);

    expect(await User.findOne({ email: 'rosa@example.com' })).toMatchObject({
      username: 'rosamaria',
      image: profile.picture,
    });
  });

  it('does not create a second user on the next sign-in', async () => {
    const profile = { email: 'rosa@example.com', name: 'Rosa' };
    await signIn({ profile });
    await signIn({ profile });
    expect(await User.countDocuments()).toBe(1);
  });

  it('refuses a profile without an email', async () => {
    expect(await signIn({ profile: { name: 'Sin correo' } })).toBe(false);
    expect(await User.countDocuments()).toBe(0);
  });
});

describe('session callback', () => {
  it('adds the id, username, role and allow-list status to the session', async () => {
    const rosa = await makeUser({ username: 'abuelarosa' });
    const result = await session({ session: { user: { email: rosa.email } } });
    expect(result.user).toMatchObject({ id: rosa._id.toString(), username: 'abuelarosa', role: 'familiar', allowed: true });
  });

  it('marks an account that is not on the list yet', async () => {
    const primo = await makeUser({ invited: false });
    const result = await session({ session: { user: { email: primo.email } } });
    expect(result.user.allowed).toBe(false);
  });

  it('leaves a session without an email untouched', async () => {
    const empty = { user: {} };
    expect(await session({ session: empty })).toBe(empty);
  });
});
