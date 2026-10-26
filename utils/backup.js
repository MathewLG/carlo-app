import { ageAt } from '@utils/age';
import { formatDate } from '@utils/format';
import { parseDay } from '@utils/dates';

const escapeHtml = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// recuerdos.html in the backup zip: every memory in one plain page that opens
// in any browser, with no app, account or internet needed. Files are linked
// from the zip's media folder.
export const buildBackupHtml = (backup) => {
  const items = backup.memories
    .map((m) => {
      const day = parseDay(m.day);
      const age = ageAt(backup.carloBirthDate && parseDay(backup.carloBirthDate), day);
      const photo = m.photo
        ? `<figure><img src="${escapeHtml(m.photo.name)}" alt="${escapeHtml(m.photo.caption || 'Foto del recuerdo')}"><figcaption>${escapeHtml(m.photo.caption)}</figcaption></figure>`
        : '';
      const voice = m.voice ? `<audio controls src="${escapeHtml(m.voice.name)}"></audio>` : '';
      return `<article>
<p class="meta">${escapeHtml(formatDate(day))}${age ? ` · ${escapeHtml(age)}` : ''} · ${escapeHtml(m.author)}</p>
${photo}
<p class="text">${escapeHtml(m.memory)}</p>
${voice}
<p class="tag">${escapeHtml(m.tag)}</p>
</article>`;
    })
    .join('\n');

  const words = backup.words ?? [];
  const entries = words
    .map((w) => {
      const day = parseDay(w.day);
      const age = ageAt(backup.carloBirthDate && parseDay(backup.carloBirthDate), day);
      const meta = [formatDate(day), age, w.heardBy && `Lo escuchó: ${w.heardBy}`, w.firstWord && 'Primera palabra', w.author];
      return `<dt>«${escapeHtml(w.word)}»</dt>
<dd>${escapeHtml(w.meaning)}<br><span class="meta">${escapeHtml(meta.filter(Boolean).join(' · '))}</span></dd>`;
    })
    .join('\n');
  const dictionary = words.length ? `<h2>Diccionario de Carlo</h2>\n<dl>\n${entries}\n</dl>` : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recuerdos para Carlo</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; color: #14274A; background: #EEF7FF; }
article { background: #fff; border: 2px solid #14274A; border-radius: 1rem; padding: 1rem 1.25rem; margin: 1.5rem 0; }
.meta, .tag { color: #46607F; font-size: .9rem; }
.text { white-space: pre-line; line-height: 1.6; }
img { max-width: 100%; display: block; }
figure { margin: 1rem 0; }
audio { width: 100%; }
dt { font-weight: 700; font-size: 1.2rem; margin-top: 1rem; }
dd { margin: .25rem 0 0; }
</style>
</head>
<body>
<h1>Recuerdos para Carlo</h1>
<p>${backup.memories.length} recuerdos, respaldados el ${escapeHtml(formatDate(new Date(backup.exportedAt)))}.</p>
${items}
${dictionary}
</body>
</html>
`;
};

// Every file for the zip, as { name: bytes }. `fetchFile(url)` returns the
// bytes of one photo or voice note; `onProgress(done, total)` reports along the way.
export const buildBackupFiles = async (backup, fetchFile, onProgress = () => {}) => {
  const encoder = new TextEncoder();
  const files = {
    'recuerdos.html': encoder.encode(buildBackupHtml(backup)),
    'recuerdos.json': encoder.encode(JSON.stringify(backup, null, 2)),
  };
  const media = backup.memories.flatMap((m) => [m.photo, m.voice].filter(Boolean));
  for (const [index, file] of media.entries()) {
    onProgress(index, media.length);
    files[file.name] = await fetchFile(file.url);
  }
  onProgress(media.length, media.length);
  return files;
};
