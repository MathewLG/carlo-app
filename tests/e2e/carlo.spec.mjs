import { expect, test } from '@playwright/test';
import { closeDatabase, day, expectAccessible, resetDatabase, seedMemory, seedSettings, seedUser, seedWord, signIn } from './helpers.mjs';

const CARLO = 'carlo@example.com';

test.beforeEach(() => resetDatabase());
test.afterAll(() => closeDatabase());

test("the admin sets up Carlo's access and his welcome", async ({ page, context }) => {
  await seedSettings({ carloBirthDate: day('2023-05-15') });
  await signIn(context, await seedUser({ role: 'admin' }));

  // Arrive the way the admin does, so the settings are already loaded once.
  await page.goto('/');
  await page.getByRole('link', { name: 'Admin' }).first().click();
  await page.getByRole('navigation', { name: 'Administración' }).getByRole('link', { name: 'Carlo' }).click();
  const access = page.getByRole('region', { name: 'Acceso de Carlo' });
  await expect(access).toContainText('Todavía no guardas el correo de Carlo');
  await access.getByLabel('Correo de Google de Carlo').fill(CARLO);
  await access.getByLabel('Su acceso se abre cuando cumpla').fill('16');
  await access.getByLabel('Su bienvenida').fill('Hola, Carlo. Esto es para ti.');
  await access.getByRole('button', { name: 'Guardar acceso' }).click();
  await expect(access).toContainText('Su acceso se abre solo el 15 de mayo de 2039, cuando cumpla 16.');
  await expectAccessible(page);

  await access.getByLabel('Pausar').check();
  await access.getByRole('button', { name: 'Guardar acceso' }).click();
  await expect(access).toContainText('En pausa: Carlo no puede entrar hasta que lo reanudes.');

  await access.getByRole('link', { name: 'Ver cómo se ve' }).click();
  await expect(page.getByText('Hola, Carlo. Esto es para ti.')).toBeVisible();
  await expect(page.getByText('Así verá Carlo esta página la primera vez que entre.')).toBeVisible();
});

test('before his day, Carlo signs in to a waiting page and nothing else', async ({ page, context }) => {
  await seedSettings({ carloBirthDate: day('2023-05-15'), carloEmail: CARLO });
  await seedMemory(await seedUser(), { memory: 'Tu primera Navidad' });
  await signIn(context, await seedUser({ email: CARLO, invited: false }));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hola, Carlo' })).toBeVisible();
  await expect(page.getByText('Todavía no es tiempo.')).toBeVisible();
  await expect(page.getByText('Tu primera Navidad')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Línea del tiempo' })).toHaveCount(0);
  await page.goto('/unirse');
  await expect(page.getByLabel(/código/i)).toHaveCount(0);
  await expectAccessible(page);
});

test('once it opens, Carlo is welcomed, starts at the beginning, and only reads', async ({ page, context }) => {
  await seedSettings({ carloBirthDate: day('2023-05-15'), carloEmail: CARLO, carloAccess: 'open', welcomeText: 'Hola, Carlo. Bienvenido a tus recuerdos.' });
  const rosa = await seedUser({ displayName: 'Abuela Rosa' });
  const memory = await seedMemory(rosa, { memory: 'Tu primera Navidad', happenedAt: day('2023-12-24') });
  await seedMemory(rosa, { memory: 'Una carta para después', unlockAt: day('2045-01-01') });
  await seedWord(rosa);
  await signIn(context, await seedUser({ email: CARLO, invited: false }));

  await page.goto('/');
  await expect(page).toHaveURL('/bienvenida');
  await expect(page.getByText('Hola, Carlo. Bienvenido a tus recuerdos.')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Empezar desde el día que naciste' }).click();
  await expect(page).toHaveURL('/linea-del-tiempo');
  await expect(page.getByRole('heading', { name: 'Línea del tiempo' })).toBeVisible();

  // Reading only: no writing anywhere.
  await expect(page.getByRole('link', { name: 'Escribir un recuerdo' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Mis recuerdos' })).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('article', { name: 'Carta con candado de Abuela Rosa' })).toBeVisible();
  await page.goto(`/memories/${memory._id}`);
  await expect(page.getByText('Tu primera Navidad')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Borrar/ })).toHaveCount(0);
  await page.goto('/diccionario');
  await expect(page.getByRole('heading', { name: '«awa»' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agregar una palabra' })).toHaveCount(0);
  await page.goto('/create-memory');
  await expect(page).toHaveURL('/linea-del-tiempo');
});

test('his next visit opens the timeline where he left off', async ({ page, context }) => {
  await seedSettings({ carloBirthDate: day('2023-05-15'), carloEmail: CARLO, carloAccess: 'open' });
  const rosa = await seedUser();
  for (let month = 1; month <= 12; month += 1) {
    await seedMemory(rosa, { memory: `Recuerdo del mes ${month}`, happenedAt: day(`2024-${String(month).padStart(2, '0')}-10`) });
  }
  const carlo = await seedUser({ email: CARLO, invited: false, welcomedAt: new Date() });
  await signIn(context, carlo);
  await page.goto('/linea-del-tiempo');
  await expect(page.getByRole('heading', { name: 'Octubre de 2024' })).toBeAttached({ timeout: 20_000 });

  // He reads down to October, then comes back another day.
  await page.getByRole('heading', { name: 'Octubre de 2024' }).scrollIntoViewIfNeeded();
  await page.waitForResponse((r) => r.url().includes('/api/carlo/progress') && r.ok());
  const later = await context.browser().newContext();
  await signIn(later, carlo);
  const next = await later.newPage();
  await next.goto('/');
  await expect(next).toHaveURL('/linea-del-tiempo');
  await expect(next.getByRole('heading', { name: 'Octubre de 2024' })).toBeInViewport();
  await later.close();
});

test('the family sees when Carlo can read his memories', async ({ page, context }) => {
  await seedSettings({ carloEmail: CARLO, carloAccess: 'open' });
  await signIn(context, await seedUser());
  await page.goto('/');
  await expect(page.getByText('Carlo ya puede leer sus recuerdos')).toBeVisible();
});
