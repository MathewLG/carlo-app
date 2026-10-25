import { describe, expect, it } from 'vitest';
import { databaseName } from '@utils/database';

describe('databaseName', () => {
  it('uses the real database only on the production deployment', () => {
    expect(databaseName({ VERCEL_ENV: 'production' })).toBe('carlo_app');
  });

  it.each([['preview'], ['development'], [undefined]])('keeps VERCEL_ENV=%s away from real memories', (env) => {
    expect(databaseName({ VERCEL_ENV: env })).toBe('carlo_app_preview');
  });

  it('lets MONGODB_DB override both', () => {
    expect(databaseName({ VERCEL_ENV: 'production', MONGODB_DB: 'carlo_app_test' })).toBe('carlo_app_test');
  });
});
