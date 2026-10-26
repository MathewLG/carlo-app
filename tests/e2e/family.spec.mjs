import { expect, test } from '@playwright/test';
import { closeDatabase, expectAccessible, resetDatabase, seedMemory, seedUser, signIn } from './helpers.mjs';

const FAMILY_CODE = 'tres palabras azules';

test.beforeEach(() => resetDatabase());
test.afterAll(() => closeDatabase());

// The admin chooses the family code on the admin page, in their own browser.
const setFamilyCode = async (browser, admin) => {
  const context = await browser.newContext();
  await signIn(context, admin);
  const page = await context.newPage();
  await page.goto('/admin/familia');
  await page.getByLabel('Elegir un código').fill(FAMILY_CODE);
  await page.getByRole('button', { name: 'Guardar código' }).click();
  await expect(page.getByText('Abierto: quien tenga el código puede unirse.')).toBeVisible();
  await context.close();
};

test('a new relative is sent to the join page and gets in with the family code', async ({ browser, page, context }) => {
  const admin = await seedUser({ role: 'admin', username: 'mathew' });
  await seedMemory(admin, { memory: 'Bienvenido a casa' });
  await setFamilyCode(browser, admin);
  await signIn(context, await seedUser({ invited: false, username: 'primo' }));

  await page.goto('/');
  await expect(page).toHaveURL('/unirse');
  await expect(page.getByRole('heading', { name: 'Únete a la familia' })).toBeVisible();
  await expectAccessible(page);

  await page.getByLabel('Código familiar').fill('carlo2023');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Ese no es el código familiar. Te quedan 4 intentos.')).toBeVisible();

  await page.getByLabel('Código familiar').fill('Tres Palabras Azules');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Bienvenido a casa')).toBeVisible();
});

test('someone not on the list cannot reach any other page', async ({ page, context }) => {
  const rosa = await seedUser();
  const memory = await seedMemory(rosa);
  await signIn(context, await seedUser({ invited: false }));

  for (const path of ['/profile', '/create-memory', `/memories/${memory._id}`]) {
    await page.goto(path);
    await expect(page).toHaveURL('/unirse');
  }
});

test('the admin sees the family, adds someone waiting and removes someone', async ({ page, context }) => {
  const admin = await seedUser({ role: 'admin', username: 'mathew' });
  const rosa = await seedUser({ username: 'abuelarosa' });
  await seedMemory(rosa);
  await seedUser({ invited: false, username: 'primo', email: 'primo@example.com' });
  await signIn(context, admin);

  await page.goto('/');
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: 'En la familia (2)' })).toBeVisible();
  await expect(page.getByText('abuelarosa')).toBeVisible();
  await expectAccessible(page);

  // Add the account that is waiting
  await expect(page.getByRole('heading', { name: 'Esperando código (1)' })).toBeVisible();
  await page.locator('li', { hasText: 'primo@example.com' }).getByRole('button', { name: 'Agregar' }).click();
  await expect(page.getByRole('heading', { name: 'En la familia (3)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Esperando código (0)' })).toBeVisible();

  // Remove someone, after confirming; the admin has no Quitar button. Their
  // account stays, so they move to the waiting list and can be added back.
  await expect(page.locator('li', { hasText: 'mathew' }).getByRole('button', { name: 'Quitar' })).toHaveCount(0);
  await page.locator('li', { hasText: 'abuelarosa' }).getByRole('button', { name: 'Quitar' }).click();
  await page.getByRole('button', { name: 'Sí, quitar' }).click();
  await expect(page.getByRole('heading', { name: 'En la familia (2)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Esperando código (1)' })).toBeVisible();
  await expect(page.locator('li', { hasText: 'abuelarosa' }).getByRole('button', { name: 'Agregar' })).toBeVisible();
});

test("the admin can edit anyone's memory, and the author stays the same", async ({ page, context }) => {
  const admin = await seedUser({ role: 'admin' });
  const rosa = await seedUser({ username: 'abuelarosa' });
  const memory = await seedMemory(rosa, { memory: 'Tu primer dia en casa' });
  await signIn(context, admin);

  await page.goto(`/memories/${memory._id}`);
  await page.getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Tu recuerdo con Carlo').fill('Tu primer día en casa');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Tu primer día en casa')).toBeVisible();
  await expect(page.getByText('abuelarosa')).toBeVisible();
});

test('a family member cannot open the admin page', async ({ page, context }) => {
  await signIn(context, await seedUser());
  await page.goto('/admin/familia');
  await expect(page.getByText('Solo el administrador puede ver esta página.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
});
