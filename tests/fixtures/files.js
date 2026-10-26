// The first bytes of each file type, enough for the server's type check.
// Real photos come from the browser tests; these only need to look right.
const pad = (header, size = 64) => {
  const bytes = new Uint8Array(size);
  bytes.set(header);
  return bytes;
};
const text = (s) => [...s].map((c) => c.charCodeAt(0));

export const FILES = {
  jpeg: { bytes: pad([0xff, 0xd8, 0xff, 0xe0]), name: 'foto.jpg', type: 'image/jpeg' },
  png: { bytes: pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), name: 'foto.png', type: 'image/png' },
  webp: { bytes: pad([...text('RIFF'), 0, 0, 0, 0, ...text('WEBP')]), name: 'foto.webp', type: 'image/webp' },
  m4a: { bytes: pad([0, 0, 0, 0x20, ...text('ftypM4A ')]), name: 'voz.m4a', type: 'audio/mp4' },
  webm: { bytes: pad([0x1a, 0x45, 0xdf, 0xa3]), name: 'voz.webm', type: 'audio/webm' },
  ogg: { bytes: pad(text('OggS')), name: 'voz.ogg', type: 'audio/ogg' },
  mp3: { bytes: pad(text('ID3')), name: 'voz.mp3', type: 'audio/mpeg' },
  wav: { bytes: pad([...text('RIFF'), 0, 0, 0, 0, ...text('WAVE')]), name: 'voz.wav', type: 'audio/wav' },
  // Claims to be a photo but is a web page: must be refused.
  html: { bytes: pad(text('<html><script>')), name: 'foto.jpg', type: 'image/jpeg' },
  svg: { bytes: pad(text('<svg xmlns="http://www.w3.org/2000/svg">')), name: 'dibujo.svg', type: 'image/svg+xml' },
};

export const bigFile = (template, size) => ({ ...template, bytes: pad(template.bytes.slice(0, 16), size) });
