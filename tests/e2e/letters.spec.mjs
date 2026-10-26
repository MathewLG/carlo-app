import { expect, test } from '@playwright/test';
import { closeDatabase, day, expectAccessible, resetDatabase, seedMemory, seedSettings, seedUser, signIn } from './helpers.mjs';

test.beforeEach(() => resetDatabase());
test.afterAll(() => closeDatabase());

test('a letter sealed until an age is the author’s alone, and an envelope for everyone else', async ({ page, context, browser }) => {
  await seedSettings({ carloBirthDate: day('2023-05-15') });
  const rosa = await seedUser({ displayName: 'Abuela Rosa' });
  await signIn(context, rosa);

  await page.goto('/create-memory');
  await page.getByLabel('Tu recuerdo con Carlo').fill('Para cuando cumplas quince: estoy orgullosa de ti.');
  await page.getByLabel('Categoría').fill('#carta');
  await page.getByLabel('Hasta que Carlo cumpla una edad').check();
  await page.getByLabel('Se abre cuando Carlo cumpla').fill('15');
  await expect(page.getByText('Se abrirá el 15 de mayo de 2038.')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click();
  await expect(page).toHaveURL('/');

  const mine = page.locator('article', { hasText: 'Para cuando cumplas quince' });
  await expect(mine).toContainText('Carta con candado: solo tú puedes leerla. Se abre cuando cumplas 15, el 15 de mayo de 2038');

  // Someone else in the family.
  const other = await browser.newContext();
  await signIn(other, await seedUser());
  const theirs = await other.newPage();
  await theirs.goto('/');
  const envelope = theirs.getByRole('article', { name: 'Carta con candado de Abuela Rosa' });
  await expect(envelope).toContainText('Se abre cuando cumplas 15, el 15 de mayo de 2038');
  await expect(theirs.getByText('estoy orgullosa')).toHaveCount(0);
  await theirs.getByLabel('Buscar').fill('orgullosa');
  await expect(theirs.getByText('Ningún recuerdo coincide con tu búsqueda.')).toBeVisible();
  await expectAccessible(theirs);
  await other.close();
});

test('the admin sees the envelope, cannot open or edit it, and can delete it after confirming', async ({ page, context }) => {
  const rosa = await seedUser({ displayName: 'Abuela Rosa' });
  const letter = await seedMemory(rosa, { memory: 'Un secreto', unlockAt: day('2039-03-12') });
  await signIn(context, await seedUser({ role: 'admin' }));

  await page.goto(`/memories/${letter._id}`);
  await expect(page.getByRole('article', { name: 'Carta con candado de Abuela Rosa' })).toContainText('Se abre el 12 de marzo de 2039');
  await expect(page.getByText('Un secreto')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);

  await page.goto(`/memories/${letter._id}/edit`);
  await expect(page.getByText('Esta carta tiene candado: solo quien la escribió puede abrirla antes de su fecha.')).toBeVisible();

  await page.goto(`/memories/${letter._id}`);
  await page.getByRole('button', { name: 'Borrar carta' }).click();
  await expect(page.getByText('¿Borrar esta carta sin abrirla? No se puede deshacer y nadie podrá leerla.')).toBeVisible();
  await page.getByRole('button', { name: 'Sí, borrar' }).click();
  await expect(page).toHaveURL('/profile');
});

test('the author changes a sealed letter’s day, and an opened letter says when it opened', async ({ page, context }) => {
  const rosa = await seedUser();
  const sealed = await seedMemory(rosa, { memory: 'Abre esto en 2040', unlockAt: day('2040-01-01') });
  await seedMemory(rosa, { memory: 'Ya se abrió', unlockAt: day('2025-01-01') });
  await signIn(context, rosa);

  await page.goto(`/memories/${sealed._id}/edit`);
  await expect(page.getByLabel('Hasta una fecha')).toBeChecked();
  await page.getByLabel('Se abre el').fill('2041-06-01');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText(/Se abre el 1 de junio de 2041/)).toBeVisible();

  await page.goto('/');
  await expect(page.locator('article', { hasText: 'Ya se abrió' })).toContainText('Carta con candado · Abierta el 1 de enero de 2025');
});

test('the admin turns the monthly email off and on', async ({ page, context }) => {
  await signIn(context, await seedUser({ role: 'admin' }));
  await page.goto('/admin/carlo');
  const box = page.getByLabel('Enviarme el recordatorio mensual');
  await expect(box).toBeChecked();
  await box.uncheck();
  await expect(page.getByText('Listo: ya no te llegará.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Enviarme el recordatorio mensual')).not.toBeChecked();
  await expectAccessible(page);
});
