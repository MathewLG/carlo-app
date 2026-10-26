import { expect, test } from '@playwright/test';
import { closeDatabase, day, expectAccessible, resetDatabase, seedMemory, seedSettings, seedUser, signIn } from './helpers.mjs';

test.beforeEach(() => resetDatabase());
test.afterAll(() => closeDatabase());

const seedFamily = async () => {
  await seedSettings({ carloBirthDate: day('2023-05-15') });
  const admin = await seedUser({ role: 'admin', username: 'mathew' });
  const rosa = await seedUser({ username: 'abuelarosa' });
  await seedMemory(rosa, { memory: 'Tu fiesta con pastel azul', happenedAt: day('2024-05-15') });
  await seedMemory(rosa, { memory: 'Abriste los regalos', happenedAt: day('2024-05-16') });
  await seedMemory(rosa, { memory: 'Dijiste agua', happenedAt: day('2024-02-01'), milestone: 'Primera palabra' });
  await seedMemory(admin, { memory: 'Tu primera Navidad', happenedAt: day('2023-12-24') });
  return { admin, rosa };
};

const moment = (page, title) => page.locator('article', { has: page.getByRole('heading', { name: title }) });

test('the timeline groups memories into moments, with ages and first times', async ({ page, context }) => {
  const { admin } = await seedFamily();
  await signIn(context, admin);

  await page.goto('/');
  await page.getByRole('link', { name: 'Línea del tiempo' }).click();
  await page.getByRole('button', { name: 'Reorganizar' }).click();

  // Without Claude (as in these tests) memories group by month; first times stand alone.
  await expect(page.getByRole('heading', { name: 'Diciembre de 2023' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu primera palabra' })).toBeVisible();
  await expect(moment(page, 'Mayo de 2024')).toContainText('Tu fiesta con pastel azul');
  await expect(moment(page, 'Mayo de 2024')).toContainText('Abriste los regalos');
  await expect(moment(page, 'Mayo de 2024')).toContainText('Del 15 de mayo de 2024 al 16 de mayo de 2024 · Carlo tenía 1 año');

  // In order, with signposts on the path.
  const titles = await page.locator('article h2').allTextContents();
  expect(titles).toEqual(['Diciembre de 2023', 'Tu primera palabra', 'Mayo de 2024']);
  await expect(page.locator('.timeline-marker')).toHaveText(['Naciste', '6 meses', '1 año']);

  // The recorded first time is marked in Primeras veces.
  await expect(page.getByRole('listitem').filter({ hasText: 'Primera palabra: ya tiene recuerdo' })).toBeVisible();
  await expectAccessible(page);
});

test('the admin renames, merges and moves, and the changes stay through a rebuild', async ({ page, context }) => {
  const { admin } = await seedFamily();
  await signIn(context, admin);
  await page.goto('/linea-del-tiempo');
  await page.getByRole('button', { name: 'Reorganizar' }).click();

  // Rename
  await moment(page, 'Mayo de 2024').getByRole('button', { name: 'Cambiar nombre' }).click();
  await page.getByLabel('Nombre del momento').fill('Tu primer cumpleaños');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(moment(page, 'Tu primer cumpleaños')).toContainText('Editado por ti');

  // A rebuild leaves it alone
  await page.getByRole('button', { name: 'Reorganizar' }).click();
  await expect(page.getByRole('heading', { name: 'Tu primer cumpleaños' })).toBeVisible();

  // Merge the first two moments
  await moment(page, 'Diciembre de 2023').getByRole('button', { name: 'Unir con el siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Tu primera palabra' })).toHaveCount(0);
  await expect(moment(page, 'Diciembre de 2023')).toContainText('Dijiste agua');

  // Move a memory to the next moment
  const xmas = moment(page, 'Diciembre de 2023').getByRole('listitem').filter({ hasText: 'Tu primera Navidad' });
  await xmas.getByRole('button', { name: 'Mover al momento siguiente' }).click();
  await expect(moment(page, 'Tu primer cumpleaños')).toContainText('Tu primera Navidad');
});

test('family members see the timeline but not the editing tools', async ({ page, context }) => {
  const { admin, rosa } = await seedFamily();
  await signIn(context, admin);
  await page.goto('/linea-del-tiempo');
  await page.getByRole('button', { name: 'Reorganizar' }).click();
  await expect(page.getByRole('heading', { name: 'Mayo de 2024' })).toBeVisible();

  await context.clearCookies();
  await signIn(context, rosa);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mayo de 2024' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reorganizar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cambiar nombre' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Mover/ })).toHaveCount(0);
});

test('a memory can be marked as a first time, from the list or in the family’s own words', async ({ page, context }) => {
  await signIn(context, await seedUser());
  await page.goto('/create-memory');
  await page.getByLabel('Tu recuerdo con Carlo').fill('Metiste los pies al agua');
  await page.getByLabel('Categoría').fill('#playa');
  await page.getByLabel('¿Es una primera vez?').selectOption('Otra primera vez…');
  await page.getByLabel('¿Cuál primera vez?').fill('Primera vez en el mar');
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click();
  await expect(page).toHaveURL('/');

  await page.locator('article', { hasText: 'Metiste los pies' }).getByRole('link', { name: 'Abrir' }).click();
  await page.getByRole('link', { name: 'Editar' }).click();
  await expect(page.getByLabel('¿Cuál primera vez?')).toHaveValue('Primera vez en el mar');
  await page.getByLabel('¿Es una primera vez?').selectOption('Primeros pasos');
  await expect(page.getByLabel('¿Cuál primera vez?')).toHaveCount(0);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.getByRole('link', { name: 'Editar' }).click();
  await expect(page.getByLabel('¿Es una primera vez?')).toHaveValue('Primeros pasos');
});

test('an empty timeline invites the family to write', async ({ page, context }) => {
  await signIn(context, await seedUser());
  await page.goto('/linea-del-tiempo');
  await expect(page.getByText('Todavía no hay recuerdos en la línea del tiempo.')).toBeVisible();
});
