// Vercel functions accept at most 4.5 MB per request; files stay under 4 MB.
// A photo is shrunk on the phone first, and a voice note is recorded at
// 32 kbps, so 5 minutes is about 1.2 MB.
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_VOICE_SECONDS = 5 * 60;
export const MAX_CAPTION_LENGTH = 80;

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

export const extensionFor = (mime) => EXTENSIONS[mime];

const startsWith = (bytes, signature, offset = 0) => signature.every((b, i) => bytes[offset + i] === b);
const ascii = (bytes, text, offset = 0) => startsWith(bytes, [...text].map((c) => c.charCodeAt(0)), offset);

// The real type of a file, from its first bytes, ignoring what the browser
// claims. Only types the app can show or play; anything else (SVG, HTML,
// videos, …) is null and gets refused.
export const sniffType = (bytes) => {
  if (!bytes || bytes.length < 12) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (ascii(bytes, 'RIFF') && ascii(bytes, 'WEBP', 8)) return 'image/webp';
  if (ascii(bytes, 'RIFF') && ascii(bytes, 'WAVE', 8)) return 'audio/wav';
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'audio/webm';
  if (ascii(bytes, 'OggS')) return 'audio/ogg';
  if (ascii(bytes, 'ID3') || startsWith(bytes, [0xff, 0xfb]) || startsWith(bytes, [0xff, 0xf3])) return 'audio/mpeg';
  // MP4 audio (iPhone recordings, .m4a): an "ftyp" box right after its size.
  if (ascii(bytes, 'ftyp', 4)) return 'audio/mp4';
  return null;
};

export const isPhotoType = (mime) => mime?.startsWith('image/') ?? false;
export const isVoiceType = (mime) => mime?.startsWith('audio/') ?? false;
