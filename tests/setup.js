import { vi } from 'vitest';

// Loaded before every test file (vitest.config.mjs).

// There is no request to run "after", so background work is recorded
// instead of run; tests that care read runAfterResponse's calls.
vi.mock('@utils/background', () => ({ runAfterResponse: vi.fn() }));
