import { after } from 'next/server';

// Runs work after the response has been sent, so the person never waits for
// it. Errors are logged, never thrown at anyone. Tests replace this module
// (tests/setup.js), since there is no request to run after.
export const runAfterResponse = (task) =>
  after(async () => {
    try {
      await task();
    } catch (error) {
      console.error('Background task failed', error);
    }
  });
