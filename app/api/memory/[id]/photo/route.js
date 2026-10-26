import { isPhotoType, MAX_CAPTION_LENGTH } from '@utils/media';
import { loadEditableMemory, mediaPath, numberField, readUpload, reply } from '@utils/mediaRoutes';
import { deleteFiles, saveFile } from '@utils/services/storage';

export const dynamic = 'force-dynamic';

const readCaption = (value) => (typeof value === 'string' ? value.trim().substring(0, MAX_CAPTION_LENGTH) : '');

// Adds or replaces the memory's one photo. Multipart: file, width, height, caption.
export const POST = async (request, { params }) => {
  const { response, memory } = await loadEditableMemory((await params).id);
  if (response) return response;

  const upload = await readUpload(request, isPhotoType, 'La foto debe ser JPG, PNG o WebP');
  if (upload.response) return upload.response;

  const previous = memory.photo?.path;
  const path = mediaPath(memory, 'photo', upload.mime);
  await saveFile(path, upload.bytes, upload.mime);
  memory.photo = {
    path,
    mime: upload.mime,
    width: numberField(upload.form, 'width'),
    height: numberField(upload.form, 'height'),
    caption: readCaption(upload.form.get('caption')),
  };
  await memory.save();
  // The old file goes only after the memory points at the new one.
  await deleteFiles([previous]);
  return reply(201, memory);
};

// Changes the caption without uploading the photo again.
export const PATCH = async (request, { params }) => {
  const { response, memory } = await loadEditableMemory((await params).id);
  if (response) return response;
  if (!memory.photo) return reply(404, { error: 'Este recuerdo no tiene foto' });

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'Solicitud inválida' });
  }
  memory.photo.caption = readCaption(body?.caption);
  await memory.save();
  return reply(200, memory);
};

export const DELETE = async (_request, { params }) => {
  const { response, memory } = await loadEditableMemory((await params).id);
  if (response) return response;
  const previous = memory.photo?.path;
  memory.photo = undefined;
  await memory.save();
  await deleteFiles([previous]);
  return new Response(null, { status: 204 });
};
