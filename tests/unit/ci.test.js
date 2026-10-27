import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// CI runs the browser tests in Playwright's image, which has its browsers
// built in. The image must be the same version as @playwright/test, or the
// tests look for browsers that are not there. Dependabot bumps the package
// alone, so this fails until the image tag is bumped too.
const installed = JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8')).version;

describe('the Playwright image in CI', () => {
  it.each(['.github/workflows/ci.yml', '.github/workflows/smoke.yml'])('%s uses the installed Playwright version', (file) => {
    const tags = [...readFileSync(file, 'utf8').matchAll(/mcr\.microsoft\.com\/playwright:v([\d.]+)-/g)].map((m) => m[1]);
    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags)).toEqual(new Set([installed]));
  });

  it('no job installs browsers itself', () => {
    for (const file of ['.github/workflows/ci.yml', '.github/workflows/smoke.yml']) {
      expect(readFileSync(file, 'utf8')).not.toContain('playwright install');
    }
  });
});
