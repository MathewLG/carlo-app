import { expect, test } from '@playwright/test';
import { closeDatabase, expectAccessible, resetDatabase, seedMemory, seedUser, signIn } from './helpers.mjs';

test.beforeEach(() => resetDatabase());
test.afterAll(() => closeDatabase());

test('a family member writes, finds, edits and deletes a memory', async ({ page, context }) => {
  const rosa = await seedUser({ username: 'abuelarosa' });
  await seedMemory(rosa, { memory: 'Fuimos al parque', tag: '#paseo' });
  await signIn(context, rosa);

  await page.goto('/');
  await expect(page.getByText('Fuimos al parque')).toBeVisible();
  await expectAccessible(page);

  // Write
  await page.getByRole('link', { name: 'Escribir un recuerdo' }).first().click();
  await page.getByLabel('Tu recuerdo con Carlo').fill('Tu primera sonrisa');
  await page.getByLabel('Categoría').fill('#primeravez');
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Tu primera sonrisa')).toBeVisible();

  // Search
  await page.getByLabel('Buscar').fill('sonrisa');
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.locator('article')).toContainText('Tu primera sonrisa');
  await page.getByLabel('Buscar').fill('');
  await expect(page.locator('article')).toHaveCount(2);

  // Tag filter
  await page.getByRole('button', { name: 'Ver recuerdos con la categoría #primeravez' }).click();
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Quitar' }).click();
  await expect(page.locator('article')).toHaveCount(2);

  // Open
  await page.locator('article', { hasText: 'Tu primera sonrisa' }).getByRole('link', { name: 'Abrir' }).click();
  await expect(page.getByText('Tu primera sonrisa')).toBeVisible();
  await expectAccessible(page);

  // Edit
  await page.getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Tu recuerdo con Carlo').fill('Tu primera sonrisa, a las seis semanas');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Tu primera sonrisa, a las seis semanas')).toBeVisible();

  // Mis recuerdos
  await page.getByRole('link', { name: 'Mis recuerdos' }).click();
  await expect(page.getByText('Tu primera sonrisa, a las seis semanas')).toBeVisible();

  // Delete, after confirming
  await page.locator('article', { hasText: 'Tu primera sonrisa' }).getByRole('link', { name: 'Abrir' }).click();
  await page.getByRole('button', { name: 'Borrar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, borrar' }).click();
  await expect(page).toHaveURL('/profile');
  await expect(page.getByText('Tu primera sonrisa')).toHaveCount(0);
});

test('cancelling the delete keeps the memory', async ({ page, context }) => {
  const rosa = await seedUser();
  const memory = await seedMemory(rosa);
  await signIn(context, rosa);

  await page.goto(`/memories/${memory._id}`);
  await page.getByRole('button', { name: 'Borrar' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Tu primer día en casa')).toBeVisible();
});

test("someone else's memory has no edit or delete buttons", async ({ page, context }) => {
  const rosa = await seedUser();
  const memory = await seedMemory(rosa);
  await signIn(context, await seedUser());

  await page.goto(`/memories/${memory._id}`);
  await expect(page.getByText('Tu primer día en casa')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Borrar' })).toHaveCount(0);
});

test('an empty search offers to show everything again', async ({ page, context }) => {
  const rosa = await seedUser();
  await seedMemory(rosa);
  await signIn(context, rosa);

  await page.goto('/');
  await page.getByLabel('Buscar').fill('nada coincide');
  await expect(page.getByText('Ningún recuerdo coincide con tu búsqueda.')).toBeVisible();
  await page.getByRole('button', { name: 'Ver todos los recuerdos' }).click();
  await expect(page.locator('article')).toHaveCount(1);
});
