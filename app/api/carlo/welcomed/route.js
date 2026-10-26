import { requireUser } from '@utils/access';

export const dynamic = 'force-dynamic';

// Carlo saw his welcome: from now on he starts on the timeline.
export const POST = async () => {
  const { response, user } = await requireUser({ roles: ['carlo'] });
  if (response) return response;
  if (!user.welcomedAt) {
    user.welcomedAt = new Date();
    await user.save();
  }
  return Response.json({ welcomed: true });
};
