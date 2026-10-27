import { requireUser } from '@utils/access';
import { checkStorage } from '@utils/services/storage';

export const dynamic = 'force-dynamic';

// The admin's "Probar el almacenamiento": writes, reads back and deletes a
// tiny file in the photo storage, and says which step failed and why.
export const POST = async () => {
  const { response } = await requireUser({ roles: ['admin'] });
  if (response) return response;
  return Response.json(await checkStorage());
};
