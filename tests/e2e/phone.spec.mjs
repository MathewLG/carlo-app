import { expect, test } from '@playwright/test';
import { closeDatabase, expectAccessible, resetDatabase, seedMemory, seedUser, signIn } from './helpers.mjs';

test.beforeEach(() => resetDatabase());
test.afterAll(() => closeDatabase());

test.beforeEach(async ({ page, context }) => {
  const rosa = await seedUser();
  await seedMemory(rosa);
  await signIn(context, rosa);
  await page.goto('/');
  await expect(page.locator('article')).toHaveCount(1);
});

test('the feed fits the screen with no sideways scroll', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});

test('the menu opens, and Escape closes it', async ({ page }) => {
  await page.getByRole('button', { name: 'Menú' }).click();
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-menu')).toHaveCount(0);
});

test('the menu closes after moving to another page', async ({ page }) => {
  await page.getByRole('button', { name: 'Menú' }).click();
  await page.locator('#mobile-menu').getByRole('link', { name: 'Mis recuerdos' }).click();
  await expect(page).toHaveURL('/profile');
  await expect(page.locator('#mobile-menu')).toHaveCount(0);
});

test('a tap outside closes the menu', async ({ page }) => {
  await page.getByRole('button', { name: 'Menú' }).click();
  // The menu hangs from the right edge; the left side of the page is outside it.
  await page.mouse.click(8, 600);
  await expect(page.locator('#mobile-menu')).toHaveCount(0);
});

test('the timeline fits a phone screen, with the menu link', async ({ page }) => {
  await page.getByRole('button', { name: 'Menú' }).click();
  await page.locator('#mobile-menu').getByRole('link', { name: 'Línea del tiempo' }).click();
  await expect(page).toHaveURL('/linea-del-tiempo');
  await expect(page.getByRole('heading', { name: 'Línea del tiempo' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
