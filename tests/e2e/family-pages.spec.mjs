import { expect, test } from '@playwright/test';
import { closeDatabase, day, expectAccessible, resetDatabase, seedMemory, seedSettings, seedUser, seedWord, signIn } from './helpers.mjs';

test.beforeEach(() => resetDatabase());
test.afterAll(() => closeDatabase());

test("the family index leads to one person's memories, oldest first, with Carlo's age", async ({ page, context }) => {
  await seedSettings({ carloBirthDate: day('2023-05-15') });
  const rosa = await seedUser({ username: 'abuelarosa', displayName: 'Abuela Rosa' });
  const beto = await seedUser({ username: 'tiobeto' });
  await seedMemory(rosa, { memory: 'Tu primera Navidad', happenedAt: day('2023-12-24') });
  await seedMemory(rosa, { memory: 'Naciste un lunes', happenedAt: day('2023-05-15') });
  await seedMemory(beto, { memory: 'Fuimos al parque' });
  await signIn(context, beto);

  await page.goto('/');
  await page.getByRole('link', { name: 'Familia', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Familia', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Abuela Rosa/ })).toContainText('2 recuerdos');
  await expect(page.getByRole('link', { name: /tiobeto/ })).toContainText('1 recuerdo');
  await expectAccessible(page);

  await page.getByRole('link', { name: /Abuela Rosa/ }).click();
  await expect(page.getByRole('heading', { name: 'Abuela Rosa', level: 1 })).toBeVisible();
  const cards = page.locator('article');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('Naciste un lunes');
  await expect(cards.last()).toContainText('Tu primera Navidad');
  await expect(cards.last()).toContainText('Carlo tenía 7 meses');
  await expect(page.getByText('Fuimos al parque')).toHaveCount(0);
  await expectAccessible(page);
});

test("tapping an author's name on a card opens their page", async ({ page, context }) => {
  const rosa = await seedUser({ username: 'abuelarosa', displayName: 'Abuela Rosa' });
  await seedMemory(rosa, { memory: 'Tu primera Navidad' });
  await signIn(context, await seedUser());

  await page.goto('/');
  await page.locator('article', { hasText: 'Tu primera Navidad' }).getByRole('link', { name: 'Abuela Rosa' }).click();
  await expect(page).toHaveURL(`/familia/${rosa._id}`);
  await expect(page.getByRole('heading', { name: 'Abuela Rosa', level: 1 })).toBeVisible();
});

test('someone who does not exist gets a friendly page', async ({ page, context }) => {
  await signIn(context, await seedUser());
  await page.goto('/familia/65d1a500aaaaaaaaaaaaaaaa');
  await expect(page.getByText('No encontramos a esta persona.')).toBeVisible();
});

test('the name I choose shows on my memories right away, and empty goes back to my username', async ({ page, context }) => {
  const me = await seedUser({ username: 'rosa' });
  await seedMemory(me, { memory: 'Te cargué por primera vez' });
  await signIn(context, me);

  await page.goto('/profile');
  await page.getByLabel('Mi nombre en Carlo App').fill('Abuela Rosa');
  await page.getByRole('button', { name: 'Guardar nombre' }).click();
  await expect(page.getByText('Listo: tus recuerdos ya muestran este nombre.')).toBeVisible();
  await expect(page.locator('article', { hasText: 'Te cargué' })).toContainText('Abuela Rosa');
  await expectAccessible(page);

  await page.goto('/');
  await expect(page.locator('article', { hasText: 'Te cargué' })).toContainText('Abuela Rosa');

  await page.goto('/profile');
  await page.getByLabel('Mi nombre en Carlo App').fill('');
  await page.getByRole('button', { name: 'Guardar nombre' }).click();
  await expect(page.getByText('Listo: tus recuerdos ya muestran este nombre.')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('article', { hasText: 'Te cargué' }).getByRole('link', { name: 'rosa', exact: true })).toBeVisible();
});

test('the dictionary adds, finds, changes and deletes words, A to Z with his age', async ({ page, context }) => {
  await seedSettings({ carloBirthDate: day('2023-05-15') });
  const me = await seedUser({ displayName: 'Mamá' });
  await seedWord(await seedUser({ username: 'tio' }), { word: 'tete', meaning: 'chupón', saidAt: '2024-03-01' });
  await signIn(context, me);

  await page.goto('/');
  await page.getByRole('link', { name: 'Diccionario' }).first().click();
  await expect(page.getByRole('heading', { name: 'Diccionario de Carlo' })).toBeVisible();

  await page.getByRole('button', { name: 'Agregar una palabra' }).click();
  await page.getByLabel('La palabra, como la dijo').fill('awa');
  await page.getByLabel('Lo que quería decir').fill('agua');
  await page.getByLabel('¿Qué día la dijo?').fill('2024-02-01');
  await page.getByLabel('¿Quién la escuchó?').fill('Mamá y la abuela');
  await page.getByRole('button', { name: 'Agregar al diccionario' }).click();

  const awa = page.locator('li', { has: page.getByRole('heading', { name: '«awa»' }) });
  await expect(awa).toContainText('1 de febrero de 2024 · Carlo tenía 8 meses · Lo escuchó: Mamá y la abuela · Lo anotó Mamá');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['A', 'T']);
  await expectAccessible(page);

  // Only my own entry can be changed.
  const tete = page.locator('li', { has: page.getByRole('heading', { name: '«tete»' }) });
  await expect(tete.getByRole('button', { name: 'Cambiar' })).toHaveCount(0);

  await page.getByLabel('Buscar en el diccionario').fill('CHUPON');
  await expect(page.getByRole('heading', { name: '«tete»' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '«awa»' })).toHaveCount(0);
  await page.getByLabel('Buscar en el diccionario').fill('');

  await awa.getByRole('button', { name: 'Cambiar' }).click();
  await page.getByLabel('Lo que quería decir').fill('agüita');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(awa).toContainText('agüita');

  await awa.getByRole('button', { name: 'Borrar' }).click();
  await awa.getByRole('button', { name: 'Sí, borrar' }).click();
  await expect(page.getByRole('heading', { name: '«awa»' })).toHaveCount(0);
});

test('a first word from the dictionary gets its own moment on the timeline', async ({ page, context }) => {
  await seedSettings({ carloBirthDate: day('2023-05-15') });
  const admin = await seedUser({ role: 'admin' });
  await seedMemory(admin, { memory: 'Tu primera Navidad', happenedAt: day('2023-12-24') });
  await signIn(context, admin);

  await page.goto('/diccionario');
  await page.getByRole('button', { name: 'Agregar una palabra' }).click();
  await page.getByLabel('La palabra, como la dijo').fill('awa');
  await page.getByLabel('Lo que quería decir').fill('agua');
  await page.getByLabel('¿Qué día la dijo?').fill('2024-02-01');
  await page.getByLabel(/Es una de sus primeras palabras/).check();
  await page.getByRole('button', { name: 'Agregar al diccionario' }).click();
  await expect(page.getByRole('heading', { name: /«awa»/ })).toContainText('Primera palabra');

  await page.goto('/linea-del-tiempo');
  await page.getByRole('button', { name: 'Reorganizar' }).click();
  const moment = page.locator('article', { has: page.getByRole('heading', { name: 'Dijiste «awa»' }) });
  await expect(moment).toContainText('Querías decir: agua');
  await expect(moment).toContainText('Carlo tenía 8 meses');
  // Words are changed in the dictionary, not with the timeline tools.
  await expect(moment.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('listitem').filter({ hasText: 'Primera palabra: ya tiene recuerdo' })).toBeVisible();
  await expectAccessible(page);
});
