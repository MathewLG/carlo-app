import { vi } from 'vitest';

// Loaded before every test file (vitest.config.mjs).

// There is no request to run "after", so background work is recorded
// instead of run; tests that care read runAfterResponse's calls.
vi.mock('@utils/background', () => ({ runAfterResponse: vi.fn() }));

// Tests never call Claude: without a key the timeline groups by month.
delete process.env.ANTHROPIC_API_KEY;
