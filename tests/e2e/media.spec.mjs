import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { closeDatabase, expectAccessible, resetDatabase, seedMemory, seedUser, signIn } from './helpers.mjs';
import { makePhoto, makeVoice } from './files.mjs';

test.beforeEach(() => resetDatabase());
test.afterAll(() => closeDatabase());

const write = async (page, text) => {
  await page.goto('/create-memory');
  await page.getByLabel('Tu recuerdo con Carlo').fill(text);
  await page.getByLabel('Categoría').fill('#paseo');
};

test('a memory with a photo, a caption and a voice note', async ({ page, context, browser, browserName }) => {
  await signIn(context, await seedUser());
  await write(page, 'En el parque con la abuela');

  await page.getByLabel('Agregar una foto').setInputFiles(await makePhoto());
  await expect(page.getByRole('img', { name: 'Foto elegida para este recuerdo' })).toBeVisible();
  await page.getByLabel('Pie de foto').fill('Columpios');
  await page.getByLabel('o sube un audio').setInputFiles(makeVoice(2));
  await expect(page.getByRole('button', { name: 'Quitar nota de voz' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click();
  await expect(page).toHaveURL('/');

  // The feed shows an instant photo with its handwritten caption, and the voice note.
  const card = page.locator('article', { hasText: 'En el parque' });
  const photo = card.getByRole('img', { name: 'Foto: Columpios' });
  await expect(photo).toBeVisible();
  await expect(card.locator('figcaption', { hasText: 'Columpios' })).toBeVisible();
  // Playwright's WebKit build cannot decode audio, so it cannot read the length;
  // the note is still saved, just shown without its time.
  await expect(card.getByText(browserName === 'webkit' ? /^Nota de voz/ : 'Nota de voz · 0:02')).toBeVisible();
  // The photo was shrunk on the way: 3000 px wide became 2000.
  expect(await photo.evaluate((img) => img.naturalWidth)).toBe(2000);
  await expectAccessible(page);

  // The whole photo opens on tap and closes with Escape.
  await card.getByRole('button', { name: 'Ver la foto completa' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  // The file is only for the family: a stranger gets nothing.
  const src = await photo.getAttribute('src');
  const stranger = await browser.newContext();
  expect((await stranger.request.get(src)).status()).toBe(401);
  await stranger.close();
});

test('changing the caption and removing the photo', async ({ page, context }) => {
  const rosa = await seedUser();
  await signIn(context, rosa);
  await write(page, 'Tu primer helado');
  await page.getByLabel('Agregar una foto').setInputFiles(await makePhoto('helado.png', 800, 800));
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click();
  await page.locator('article', { hasText: 'Tu primer helado' }).getByRole('link', { name: 'Abrir' }).click();

  await page.getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Pie de foto').fill('De fresa');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('img', { name: 'Foto: De fresa' })).toBeVisible();

  await page.getByRole('link', { name: 'Editar' }).click();
  await page.getByRole('button', { name: 'Quitar foto' }).click();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Tu primer helado')).toBeVisible();
  await expect(page.getByRole('img', { name: /^Foto/ })).toHaveCount(0);
});

test('a file that is not a photo is turned away before saving', async ({ page, context }) => {
  await signIn(context, await seedUser());
  await write(page, 'Algo');
  await page.getByLabel('Agregar una foto').setInputFiles(makeVoice(1, 'no-es-foto.wav'));
  await expect(page.getByText('No se pudo abrir esa foto.')).toBeVisible();
});

// Older browsers (iPhones before iOS 17, older Chrome) reject the option that
// turns a photo the right way up, and some have no createImageBitmap at all.
for (const [label, olderBrowser] of [
  [
    'that rejects the rotation option',
    () => {
      const original = window.createImageBitmap;
      window.createImageBitmap = (source, options) =>
        options ? Promise.reject(new TypeError('The provided value is not a valid enum value')) : original(source);
    },
  ],
  ['without createImageBitmap', () => delete window.createImageBitmap],
]) {
  test(`a photo still uploads from a browser ${label}`, async ({ page, context }) => {
    await page.addInitScript(olderBrowser);
    await signIn(context, await seedUser());
    await write(page, `Foto desde un navegador viejo: ${label}`);
    await page.getByLabel('Agregar una foto').setInputFiles(await makePhoto());
    await expect(page.getByRole('img', { name: 'Foto elegida para este recuerdo' })).toBeVisible();
    await page.getByRole('button', { name: 'Guardar recuerdo' }).click();
    await expect(page).toHaveURL('/');
    const photo = page.locator('article', { hasText: label }).getByRole('img', { name: /^Foto/ });
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((img) => img.naturalWidth)).toBe(2000);
  });
}

test('an iPhone HEIC photo the browser cannot open gets a clear message', async ({ page, context }) => {
  await signIn(context, await seedUser());
  await write(page, 'Algo');
  await page.getByLabel('Agregar una foto').setInputFiles({ name: 'IMG_0001.HEIC', mimeType: 'image/heic', buffer: Buffer.from('not really a photo') });
  await expect(page.getByText('Esta foto está en formato HEIC')).toBeVisible();
});

test('recording a voice note in the browser', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Only Chromium has a fake microphone for tests');
  await context.grantPermissions(['microphone']);
  await signIn(context, await seedUser());
  await write(page, 'Te canté las mañanitas');

  await page.getByRole('button', { name: 'Grabar nota de voz' }).click();
  await expect(page.getByText(/Grabando 0:0\d \/ 5:00/)).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Detener' }).click();
  await expect(page.getByRole('button', { name: 'Quitar nota de voz' })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('article', { hasText: 'mañanitas' }).getByText(/Nota de voz · 0:0[12]/)).toBeVisible();
});

test('the admin downloads a backup that works without the app', async ({ page, context }) => {
  const admin = await seedUser({ role: 'admin' });
  await signIn(context, admin);
  await seedMemory(admin, { memory: 'Sin fotos, solo palabras' });
  await write(page, 'Con foto');
  await page.getByLabel('Agregar una foto').setInputFiles(await makePhoto('respaldo.png', 600, 400));
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/admin/respaldo');
  await expectAccessible(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar respaldo' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^carlo-app-respaldo-\d{4}-\d{2}-\d{2}\.zip$/);
  await expect(page.getByText('Listo: 2 recuerdos')).toBeVisible();

  const files = unzipSync(new Uint8Array(readFileSync(await download.path())));
  const names = Object.keys(files);
  expect(names).toEqual(expect.arrayContaining(['recuerdos.html', 'recuerdos.json']));
  const photos = names.filter((n) => /^media\/.+-foto\.jpg$/.test(n));
  expect(photos).toHaveLength(1);
  // The photo in the zip is a real JPEG, and the page links to it.
  expect([...files[photos[0]].slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  const html = new TextDecoder().decode(files['recuerdos.html']);
  expect(html).toContain(`src="${photos[0]}"`);
  expect(html).toContain('Sin fotos, solo palabras');
});
