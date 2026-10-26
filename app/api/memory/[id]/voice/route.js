import { isVoiceType, MAX_VOICE_SECONDS } from '@utils/media';
import { loadEditableMemory, mediaPath, numberField, readUpload, reply } from '@utils/mediaRoutes';
import { deleteFiles, saveFile } from '@utils/services/storage';

export const dynamic = 'force-dynamic';

// Adds or replaces the memory's one voice note. Multipart: file, durationSec.
export const POST = async (request, { params }) => {
  const { response, memory } = await loadEditableMemory((await params).id);
  if (response) return response;

  const upload = await readUpload(request, isVoiceType, 'La nota de voz debe ser un audio (M4A, MP3, WebM, OGG o WAV)');
  if (upload.response) return upload.response;

  const durationSec = numberField(upload.form, 'durationSec');
  if (durationSec > MAX_VOICE_SECONDS) {
    return reply(413, { error: 'La nota de voz puede durar hasta 5 minutos' });
  }

  const previous = memory.voice?.path;
  const path = mediaPath(memory, 'voice', upload.mime);
  await saveFile(path, upload.bytes, upload.mime);
  memory.voice = { path, mime: upload.mime, durationSec };
  await memory.save();
  await deleteFiles([previous]);
  return reply(201, memory);
};

export const DELETE = async (_request, { params }) => {
  const { response, memory } = await loadEditableMemory((await params).id);
  if (response) return response;
  const previous = memory.voice?.path;
  memory.voice = undefined;
  await memory.save();
  await deleteFiles([previous]);
  return new Response(null, { status: 204 });
};
