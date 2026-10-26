'use client';
import { MAX_FILE_BYTES, MAX_VOICE_SECONDS } from '@utils/media';

const MAX_PHOTO_EDGE = 2000;

const isHeic = (file) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name ?? '');

const openAsBitmap = async (file, options) => {
  const bitmap = await (options ? createImageBitmap(file, options) : createImageBitmap(file));
  return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() };
};

const openAsImage = async (file) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
};

// Opens a picked photo for drawing, the right way up. createImageBitmap's
// 'from-image' option turns it by the photo's own rotation, but older
// browsers (iPhones before iOS 17, older Chrome) reject the option and some
// have no createImageBitmap; an <img> also turns it in every current browser.
// Returns { source, width, height, close } or throws when nothing can open it.
export const openPhoto = async (file) => {
  const ways = [
    ...(typeof createImageBitmap === 'function' ? [() => openAsBitmap(file, { imageOrientation: 'from-image' })] : []),
    () => openAsImage(file),
    ...(typeof createImageBitmap === 'function' ? [() => openAsBitmap(file)] : []),
  ];
  for (const open of ways) {
    try {
      return await open();
    } catch {
      // Try the next way.
    }
  }
  throw new Error(
    isHeic(file)
      ? 'Esta foto está en formato HEIC y este navegador no puede abrirla. Súbela desde el iPhone, o guárdala como JPG.'
      : 'No se pudo abrir esa foto. Prueba con una foto JPG o PNG.',
  );
};

// Shrinks a photo on the phone before it is sent: at most 2,000 px on the long
// edge, saved as JPEG. Redrawing it on a canvas also drops the location and
// camera data stored inside the original file.
export const shrinkPhoto = async (file) => {
  const photo = await openPhoto(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(photo.width, photo.height));
  const width = Math.round(photo.width * scale);
  const height = Math.round(photo.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(photo.source, 0, 0, width, height);
  photo.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('No se pudo preparar la foto. Inténtalo de nuevo.');
  if (blob.size > MAX_FILE_BYTES) throw new Error('La foto es demasiado grande, incluso reducida.');
  return { blob, width, height };
};

// Checks an audio file someone picked: size, and length read from the file.
export const checkVoiceFile = (file) =>
  new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error('El audio es demasiado grande (máximo 4 MB).'));
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (Number.isFinite(audio.duration) && audio.duration > MAX_VOICE_SECONDS) {
        reject(new Error('La nota de voz puede durar hasta 5 minutos.'));
      } else {
        resolve({ blob: file, durationSec: Number.isFinite(audio.duration) ? audio.duration : undefined });
      }
    };
    // This browser cannot read the file's length (some cannot decode every
    // format). Send it anyway: the server checks its real type and size, and
    // other phones may well play it.
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: file, durationSec: undefined });
    };
    audio.src = url;
  });

// The recording format to use. AAC in MP4 first, because every phone and
// browser can play it back; Opus only where the browser cannot record AAC.
export const recordingType = () =>
  ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(
    (type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type),
  );

// What a form holds for a memory's files before saving. `current*` is what
// the memory already has; the rest are the changes picked on the page.
export const emptyMedia = (memory = {}) => ({
  currentPhoto: memory.photo ?? null,
  currentVoice: memory.voice ?? null,
  photo: null, // { blob, width, height, previewUrl }
  removePhoto: false,
  caption: memory.photo?.caption ?? '',
  voice: null, // { blob, durationSec, previewUrl }
  removeVoice: false,
});

const send = async (url, init) => {
  const response = await fetch(url, init);
  if (response.ok) return;
  const data = await response.json().catch(() => ({}));
  throw new Error(data.error || 'No se pudo guardar el archivo.');
};

// Sends the photo and voice changes for a saved memory. Throws with a
// message for the person when something fails.
export const saveMedia = async (memoryId, media) => {
  const base = `/api/memory/${memoryId}`;
  if (media.photo) {
    const form = new FormData();
    form.append('file', media.photo.blob, 'foto.jpg');
    form.append('width', String(media.photo.width));
    form.append('height', String(media.photo.height));
    form.append('caption', media.caption);
    await send(`${base}/photo`, { method: 'POST', body: form });
  } else if (media.removePhoto && media.currentPhoto) {
    await send(`${base}/photo`, { method: 'DELETE' });
  } else if (media.currentPhoto && media.caption !== (media.currentPhoto.caption ?? '')) {
    await send(`${base}/photo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: media.caption }),
    });
  }

  if (media.voice) {
    const form = new FormData();
    form.append('file', media.voice.blob, 'nota-de-voz');
    if (media.voice.durationSec) form.append('durationSec', String(Math.round(media.voice.durationSec)));
    await send(`${base}/voice`, { method: 'POST', body: form });
  } else if (media.removeVoice && media.currentVoice) {
    await send(`${base}/voice`, { method: 'DELETE' });
  }
};
