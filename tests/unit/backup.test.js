import { describe, expect, it, vi } from 'vitest';
import { buildBackupFiles, buildBackupHtml, buildSealedHtml } from '@utils/backup';

const backup = {
  exportedAt: '2026-10-25T18:00:00.000Z',
  carloBirthDate: '2023-05-15',
  memories: [
    {
      id: 'a1',
      author: 'abuelarosa',
      day: '2023-12-24',
      tag: '#navidad',
      memory: 'Tu primera Navidad.\nAbriste todo.',
      photo: { url: '/api/media/a1/photo?v=1', name: 'media/2023-12-24-a1-foto.jpg', caption: 'Con el árbol' },
      voice: { url: '/api/media/a1/voice?v=2', name: 'media/2023-12-24-a1-voz.m4a' },
    },
    { id: 'b2', author: 'tio', day: '2024-06-02', tag: '#paseo', memory: 'Sin archivos' },
  ],
};

describe('buildBackupHtml', () => {
  const html = buildBackupHtml(backup);

  it('shows each memory with its day, Carlo’s age, author and words', () => {
    expect(html).toContain('24 de diciembre de 2023 · Carlo tenía 7 meses · abuelarosa');
    expect(html).toContain('Tu primera Navidad.\nAbriste todo.');
    expect(html).toContain('2 recuerdos, respaldados el 25 de octubre de 2026');
  });

  it('links the photo and voice note from the media folder in the zip', () => {
    expect(html).toContain('<img src="media/2023-12-24-a1-foto.jpg" alt="Con el árbol">');
    expect(html).toContain('<audio controls src="media/2023-12-24-a1-voz.m4a"></audio>');
  });

  it('cannot be broken by what someone wrote', () => {
    const tricky = buildBackupHtml({
      ...backup,
      memories: [{ ...backup.memories[1], memory: '<script>alert(1)</script>', author: '"><img onerror=x>' }],
    });
    expect(tricky).not.toContain('<script>alert');
    expect(tricky).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(tricky).not.toContain('<img onerror');
  });

  it('adds the Diccionario after the memories, escaped like everything else', () => {
    const withWords = buildBackupHtml({
      ...backup,
      words: [
        { word: 'awa', meaning: 'agua', day: '2024-02-01', heardBy: 'Mamá', firstWord: true, author: 'abuelarosa' },
        { word: '<b>', meaning: 'x', day: '2024-03-01', heardBy: '', firstWord: false, author: 'tio' },
      ],
    });
    expect(withWords).toContain('<h2>Diccionario de Carlo</h2>');
    expect(withWords).toContain('<dt>«awa»</dt>');
    expect(withWords).toContain('1 de febrero de 2024 · Carlo tenía 8 meses · Lo escuchó: Mamá · Primera palabra · abuelarosa');
    expect(withWords).toContain('<dt>«&lt;b&gt;»</dt>');
    expect(html).not.toContain('Diccionario');
  });

  it('keeps sealed letters on their own page, each with the day it opens', () => {
    const letter = { id: 'c3', author: 'abuelarosa', day: '2026-10-25', tag: '#carta', memory: 'Para cuando cumplas 15', unlockAt: '2038-05-15' };
    const withSealed = { ...backup, sealed: [letter] };
    const main = buildBackupHtml(withSealed);
    expect(main).toContain('Hay 1 carta con candado en cartas-con-candado.html');
    expect(main).not.toContain('Para cuando cumplas 15');
    const sealedPage = buildSealedHtml(withSealed);
    expect(sealedPage).toContain('Estas cartas todavía no deben abrirse.');
    expect(sealedPage).toContain('Se abre el 15 de mayo de 2038');
    expect(sealedPage).toContain('Para cuando cumplas 15');
  });

  it('leaves out ages when no birth date was set', () => {
    expect(buildBackupHtml({ ...backup, carloBirthDate: null })).not.toContain('Carlo tenía');
  });
});

describe('buildBackupFiles', () => {
  it('collects the page, the data and every file, reporting progress', async () => {
    const fetchFile = vi.fn(async (url) => new TextEncoder().encode(url));
    const progress = vi.fn();

    const files = await buildBackupFiles(backup, fetchFile, progress);

    expect(Object.keys(files).sort()).toEqual([
      'media/2023-12-24-a1-foto.jpg',
      'media/2023-12-24-a1-voz.m4a',
      'recuerdos.html',
      'recuerdos.json',
    ]);
    expect(JSON.parse(new TextDecoder().decode(files['recuerdos.json']))).toEqual(backup);
    expect(fetchFile).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenLastCalledWith(2, 2);
  });
});

describe('buildBackupFiles with sealed letters', () => {
  it('adds their page and their files from their own folder', async () => {
    const sealed = [
      {
        id: 'c3',
        author: 'abuelarosa',
        day: '2026-10-25',
        tag: '#carta',
        memory: 'Para cuando cumplas 15',
        unlockAt: '2038-05-15',
        voice: { url: '/api/media/c3/voice?v=9', name: 'cartas-con-candado/media/2026-10-25-c3-voz.m4a' },
      },
    ];
    const files = await buildBackupFiles({ ...backup, sealed }, async (url) => new TextEncoder().encode(url));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['cartas-con-candado.html', 'cartas-con-candado/media/2026-10-25-c3-voz.m4a']));
  });
});
