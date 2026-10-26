import { randomBytes } from 'node:crypto';
import { isValidObjectId } from 'mongoose';
import { connectToDB } from '@utils/database';
import { canChange, requireUser } from '@utils/access';
import { extensionFor, MAX_FILE_BYTES, sniffType } from '@utils/media';
import Memory from '@models/memory';

export const reply = (status, body) => Response.json(body, { status });

// The memory to attach a file to, if the signed-in user may change it.
// Returns { user, memory } or { response }.
export const loadEditableMemory = async (id) => {
  const { response, user } = await requireUser({ write: true });
  if (response) return { response };
  if (!isValidObjectId(id)) return { response: reply(404, { error: 'Este recuerdo no existe' }) };
  await connectToDB();
  const memory = await Memory.findById(id);
  if (!memory) return { response: reply(404, { error: 'Este recuerdo no existe' }) };
  if (!canChange(user, memory)) {
    return { response: reply(403, { error: 'Solo quien escribió este recuerdo puede cambiarlo' }) };
  }
  return { user, memory };
};

// Reads the `file` field of a multipart upload and checks it is one of the
// allowed kinds by its bytes. Returns { form, bytes, mime } or { response }.
export const readUpload = async (request, isAllowed, wrongTypeMessage) => {
  let form;
  try {
    form = await request.formData();
  } catch {
    return { response: reply(400, { error: 'Solicitud inválida' }) };
  }
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return { response: reply(400, { error: 'Falta el archivo' }) };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { response: reply(413, { error: 'El archivo es demasiado grande (máximo 4 MB)' }) };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffType(bytes);
  if (!isAllowed(mime)) return { response: reply(415, { error: wrongTypeMessage }) };
  return { form, bytes, mime };
};

// media/<memoryId>/<kind>-<random>.<ext>: a new name for every upload.
export const mediaPath = (memory, kind, mime) =>
  `media/${memory._id}/${kind}-${randomBytes(12).toString('hex')}.${extensionFor(mime)}`;

export const numberField = (form, name) => {
  const value = Number(form.get(name));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
};
