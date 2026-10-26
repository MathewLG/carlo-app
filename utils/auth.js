import GoogleProvider from 'next-auth/providers/google';
import User from '@models/user';
import Invite from '@models/invite';
import { connectToDB } from '@utils/database';

// Builds a username from the Google display name. Accents are stripped
// before anything else so "José" becomes "jose", not "jos".
export const makeUsername = (profile) => {
  const fromName = (profile.name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const fromEmail = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const base = fromName.length >= 3 ? fromName : fromEmail;
  return (base || 'familia').substring(0, 30);
};

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session }) {
      if (!session?.user?.email) return session;
      await connectToDB();
      const sessionUser = await User.findOne({ email: session.user.email });
      if (sessionUser) {
        session.user.id = sessionUser._id.toString();
        session.user.username = sessionUser.username;
        session.user.displayName = sessionUser.displayName ?? '';
        session.user.role = sessionUser.role;
        // The pages use this to send people who are not on the list to /unirse;
        // the API checks the list again on every request.
        session.user.allowed = Boolean(await Invite.exists({ email: sessionUser.email.toLowerCase() }));
      }
      return session;
    },
    async signIn({ profile }) {
      if (!profile?.email) return false;
      try {
        await connectToDB();
        const userExists = await User.findOne({ email: profile.email });
        if (!userExists) {
          await User.create({
            email: profile.email,
            username: makeUsername(profile),
            image: profile.picture,
          });
        }
        return true;
      } catch (error) {
        console.error('signIn failed', error);
        return false;
      }
    },
  },
};

