import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const dir = mkdtempSync(path.join(tmpdir(), 'carlo-e2e-files-'));

// A real, decodable photo: a big image, so the test also sees it shrunk.
export const makePhoto = async (name = 'foto.png', width = 3000, height = 2000) => {
  const file = path.join(dir, name);
  await sharp({ create: { width, height, channels: 3, background: { r: 12, g: 192, b: 223 } } })
    .png()
    .toFile(file);
  return file;
};

// A real, playable WAV: `seconds` of silence, 8 kHz, 8-bit mono.
export const makeVoice = (seconds = 2, name = 'voz.wav') => {
  const rate = 8000;
  const samples = rate * seconds;
  const buffer = Buffer.alloc(44 + samples, 128);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples, 40);
  const file = path.join(dir, name);
  writeFileSync(file, buffer);
  return file;
};
