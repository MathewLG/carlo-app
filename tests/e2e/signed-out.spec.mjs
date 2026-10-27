import { expect, test } from '@playwright/test';
import { expectAccessible, watchConsoleErrors } from './helpers.mjs';

// Safe against any deployment: reads nothing and needs no database access.
test.describe('signed out @smoke', () => {
  test('home invites the visitor to sign in and shows no memories', async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Iniciar sesión' }).first()).toBeVisible();
    await expect(page.getByText('Los recuerdos son solo para la familia')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(0);
    await expectAccessible(page);
    expect(errors).toEqual([]);
  });

  for (const [path, message] of [
    ['/profile', 'Los recuerdos son solo para la familia. Inicia sesión para verlos.'],
    ['/create-memory', 'Inicia sesión para escribir un recuerdo.'],
    ['/memories/65d1a500aaaaaaaaaaaaaaaa', 'Inicia sesión para ver este recuerdo.'],
  ]) {
    test(`${path} asks to sign in instead of showing content`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(message).first()).toBeVisible();
      await expect(page.locator('article')).toHaveCount(0);
    });
  }

  test('the memory API refuses strangers', async ({ request }) => {
    expect((await request.get('/api/memory')).status()).toBe(401);
    expect((await request.get('/api/memory/65d1a500aaaaaaaaaaaaaaaa')).status()).toBe(401);
    expect((await request.post('/api/memory/new', { data: { memory: 'x', tag: '#x' } })).status()).toBe(401);
  });

  test('the browser tab has the Carlo App icon', async ({ request }) => {
    const response = await request.get('/favicon.ico');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/');
  });

  test('the page never scrolls sideways', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('every response carries the security headers', async ({ request }) => {
    for (const path of ['/', '/api/memory']) {
      const headers = (await request.get(path)).headers();
      expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['permissions-policy']).toContain('microphone=(self)');
      expect(headers['x-powered-by']).toBeUndefined();
    }
  });

  test('the privacy page says what is kept and who sees it, linked from every page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacidad' }).click();
    await expect(page).toHaveTitle('Privacidad · Carlo App');
    await expect(page.getByRole('heading', { name: 'Qué guardamos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quién lo puede ver' })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('contentinfo').getByRole('link', { name: 'Acerca de' }).click();
    await expect(page.getByRole('heading', { name: 'Acerca de' })).toBeVisible();
  });

  test('a page that does not exist answers 404 in Spanish', async ({ page }) => {
    const response = await page.goto('/esta-pagina-no-existe');
    expect(response.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible();
    await page.getByRole('link', { name: 'Volver a los recuerdos' }).click();
    await expect(page).toHaveURL('/');
  });

  test('each page names itself in the browser tab', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Carlo App');
    await page.goto('/linea-del-tiempo');
    await expect(page).toHaveTitle('Línea del tiempo · Carlo App');
    await page.goto('/diccionario');
    await expect(page).toHaveTitle('Diccionario de Carlo · Carlo App');
  });
});
