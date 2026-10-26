import { expect, test } from '@playwright/test';
import { closeDatabase, day, expectAccessible, resetDatabase, seedMemory, seedSettings, seedUser, signIn } from './helpers.mjs';

test.beforeEach(() => resetDatabase());
test.afterAll(() => closeDatabase());

test('the admin sets the birth date and every memory shows Carlo’s age', async ({ page, context }) => {
  const admin = await seedUser({ role: 'admin' });
  await seedMemory(admin, { memory: 'Tu primera Navidad', happenedAt: day('2023-12-24') });
  await signIn(context, admin);

  await page.goto('/');
  await expect(page.getByText('Tu primera Navidad')).toBeVisible();
  await expect(page.getByText('Carlo tenía')).toHaveCount(0);

  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('navigation', { name: 'Administración' }).getByRole('link', { name: 'Carlo' }).click();
  await expect(page.getByText('Todavía no está guardada')).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel('Fecha de nacimiento de Carlo').fill('2023-05-15');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Carlo nació el 15 de mayo de 2023.')).toBeVisible();

  await page.goto('/');
  await expect(page.locator('article', { hasText: 'Tu primera Navidad' })).toContainText(
    '24 de diciembre de 2023 · Carlo tenía 7 meses',
  );
});

test('a memory written today about the past shows the day it happened and his age then', async ({ page, context }) => {
  await seedSettings({ carloBirthDate: day('2023-05-15') });
  await signIn(context, await seedUser());

  await page.goto('/create-memory');
  await page.getByLabel('Tu recuerdo con Carlo').fill('Tus primeros pasos en el jardín');
  await page.getByLabel('Categoría').fill('#primeravez');
  await page.getByLabel('¿Cuándo pasó?').fill('2024-06-02');
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click();
  await expect(page).toHaveURL('/');

  const card = page.locator('article', { hasText: 'Tus primeros pasos' });
  await expect(card).toContainText('2 de junio de 2024 · Carlo tenía 1 año');
  await card.getByRole('link', { name: 'Abrir' }).click();
  await expect(page.getByText('Carlo tenía 1 año')).toBeVisible();

  // The edit page shows the saved day, ready to change.
  await page.getByRole('link', { name: 'Editar' }).click();
  await expect(page.getByLabel('¿Cuándo pasó?')).toHaveValue('2024-06-02');
});

test('memories from before he was born say so', async ({ page, context }) => {
  await seedSettings({ carloBirthDate: day('2023-05-15') });
  const rosa = await seedUser();
  await seedMemory(rosa, { memory: 'El día que supimos que venías', happenedAt: day('2022-10-01') });
  await signIn(context, rosa);

  await page.goto('/');
  await expect(page.locator('article', { hasText: 'supimos que venías' })).toContainText('Antes de nacer');
});

test('the date field does not offer future days', async ({ page, context }) => {
  await signIn(context, await seedUser());
  await page.goto('/create-memory');
  const max = await page.getByLabel('¿Cuándo pasó?').getAttribute('max');
  expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(new Date(`${max}T12:00:00Z`).getTime()).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);
});

test('a family member cannot open the Carlo admin page', async ({ page, context }) => {
  await signIn(context, await seedUser());
  await page.goto('/admin/carlo');
  await expect(page.getByText('Solo el administrador puede ver esta página.')).toBeVisible();
});
