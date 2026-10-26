import { requireUser } from '@utils/access';
import { rebuildTimeline } from '@utils/timelineBuild';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// The admin's "Reorganizar": regroups everything now, keeping the events the
// admin edited. Waits for the result, so the page can show it right away.
export const POST = async () => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;
  const rebuilt = await rebuildTimeline({ force: true });
  if (!rebuilt) {
    return Response.json({ error: 'Ya se está reorganizando. Inténtalo en un momento.' }, { status: 409 });
  }
  return Response.json({ rebuilt });
};
