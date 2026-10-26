import { describe, expect, it } from 'vitest';
import { extensionFor, isPhotoType, isVoiceType, sniffType } from '@utils/media';
import Memory, { publicMedia } from '@models/memory';
import { FILES } from '../fixtures/files';

describe('sniffType', () => {
  it.each([
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['webp', 'image/webp'],
    ['m4a', 'audio/mp4'],
    ['webm', 'audio/webm'],
    ['ogg', 'audio/ogg'],
    ['mp3', 'audio/mpeg'],
    ['wav', 'audio/wav'],
  ])('recognizes %s by its bytes', (name, mime) => {
    expect(sniffType(FILES[name].bytes)).toBe(mime);
  });

  it('refuses a web page or an SVG, whatever name or type it claims', () => {
    expect(sniffType(FILES.html.bytes)).toBeNull();
    expect(sniffType(FILES.svg.bytes)).toBeNull();
  });

  it('refuses files too short to tell', () => {
    expect(sniffType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(sniffType(undefined)).toBeNull();
  });

  it('gives every recognized type an extension and a kind', () => {
    for (const name of ['jpeg', 'png', 'webp']) {
      const mime = sniffType(FILES[name].bytes);
      expect(isPhotoType(mime) && !isVoiceType(mime) && extensionFor(mime)).toBeTruthy();
    }
    for (const name of ['m4a', 'webm', 'ogg', 'mp3', 'wav']) {
      const mime = sniffType(FILES[name].bytes);
      expect(isVoiceType(mime) && !isPhotoType(mime) && extensionFor(mime)).toBeTruthy();
    }
    expect(isPhotoType(null)).toBe(false);
  });
});

describe('what the browser sees of a memory', () => {
  const memory = new Memory({
    creator: '65d1a500aaaaaaaaaaaaaaaa',
    memory: 'En el parque',
    tag: '#paseo',
    photo: { path: 'media/x/photo-abc123def.jpg', mime: 'image/jpeg', width: 800, height: 600, caption: 'Columpios' },
    voice: { path: 'media/x/voice-0f0f0f.m4a', mime: 'audio/mp4', durationSec: 42 },
  });

  it('replaces storage paths with app URLs that change with the file', () => {
    const json = JSON.parse(JSON.stringify(memory));
    expect(json.photo).toEqual({
      url: `/api/media/${memory._id}/photo?v=abc123def`,
      width: 800,
      height: 600,
      caption: 'Columpios',
    });
    expect(json.voice).toEqual({ url: `/api/media/${memory._id}/voice?v=0f0f0f`, durationSec: 42 });
    expect(JSON.stringify(json)).not.toContain('media/x/');
  });

  it('leaves out files a memory does not have', () => {
    const plain = JSON.parse(JSON.stringify(new Memory({ creator: memory.creator, memory: 'Hola', tag: '#m' })));
    expect(plain).not.toHaveProperty('photo');
    expect(plain).not.toHaveProperty('voice');
    expect(publicMedia({ _id: 'x' })).toEqual({ photo: undefined, voice: undefined });
  });
});
