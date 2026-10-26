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

test('tablets get the menu button, since the full set of links would wrap', async ({ page, context }) => {
  await signIn(context, await seedUser({ role: 'admin' }));
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Menú' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mis recuerdos' })).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('from 1024 px every link fits on one line, the admin’s too', async ({ page, context }) => {
  await signIn(context, await seedUser({ role: 'admin', displayName: 'Mathew' }));
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/');
  const nav = page.getByRole('navigation').first();
  const names = ['Línea del tiempo', 'Familia', 'Diccionario', 'Mis recuerdos', 'Admin', 'Escribir un recuerdo'];
  const tops = [];
  for (const name of names) {
    const box = await nav.getByRole('link', { name, exact: true }).boundingBox();
    expect(box, name).not.toBeNull();
    tops.push(Math.round(box.y + box.height / 2));
  }
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(4);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
