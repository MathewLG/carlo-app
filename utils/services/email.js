import { connectToDB } from '@utils/database';
import User from '@models/user';

// Emails go through Resend's shared sender, which can only deliver to the
// address the Resend account is registered with: the admin's. That is all
// these emails need, so the domain's DNS stays untouched. Without
// RESEND_API_KEY (local dev, tests, before setup) nothing is sent.
const FROM = 'Carlo App <onboarding@resend.dev>';
const ENDPOINT = 'https://api.resend.com/emails';

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

// The admin accounts' addresses; every email the app sends goes only to them.
export const adminEmails = async () => {
  await connectToDB();
  return (await User.find({ role: 'admin' }, 'email').lean()).map((u) => u.email);
};

// Sends one email to the admins. Returns { sent: true } or { sent: false,
// reason }: 'not-configured', 'no-admin' or the error from Resend. Never throws.
export const emailAdmins = async ({ subject, html, text }) => {
  if (!emailConfigured()) {
    console.warn(`Email not sent (RESEND_API_KEY is not set): ${subject}`);
    return { sent: false, reason: 'not-configured' };
  }
  const to = await adminEmails();
  if (!to.length) return { sent: false, reason: 'no-admin' };
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html, text }),
    });
    if (!response.ok) {
      const reason = `Resend HTTP ${response.status}`;
      console.error(`Email failed: ${reason}`, await response.text().catch(() => ''));
      return { sent: false, reason };
    }
    return { sent: true };
  } catch (error) {
    console.error('Email failed', error);
    return { sent: false, reason: error.message };
  }
};
