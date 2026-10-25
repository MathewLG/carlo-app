import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = (dir) => fileURLToPath(new URL(`./${dir}/`, import.meta.url));

export default defineConfig({
  resolve: {
    // Same aliases as jsconfig.json, so tests import code the way the app does.
    // `@/app/...` is only used by tests, to import route handlers.
    alias: [
      { find: /^@\//, replacement: root('') },
      { find: /^@(utils|models|components|styles)\//, replacement: `${root('')}$1/` },
    ],
  },
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    environment: 'node',
    // Each integration file starts its own in-memory MongoDB; the first run downloads it.
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      include: ['utils/**', 'app/api/**'],
      reporter: ['text', 'html'],
      thresholds: {
        'utils/**': { lines: 90 },
        'app/api/**': { lines: 80 },
      },
    },
  },
});
