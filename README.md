# Carlo App

Memories and messages from the family for Carlo, at [carlo-app.com](https://www.carlo-app.com).

## Running it locally

Needs Node 24 and a `.env.local` with `GOOGLE_ID`, `GOOGLE_CLIENT_SECRET`, `MONGODB_URI`, `NEXTAUTH_URL` and `NEXTAUTH_SECRET`. That file is git-ignored; never commit it.

```
npm install
npm run dev
```

Local development and Vercel previews use the `carlo_app_preview` database; only the production deployment reads the real memories in `carlo_app`.

## Tests

| Command | Runs |
| --- | --- |
| `npm test` | Unit and integration tests (Vitest, with a throwaway in-memory MongoDB) |
| `npm run test:coverage` | The same, with the coverage floors CI enforces |
| `npm run test:e2e` | Browser tests (Playwright) in Chromium, Firefox, WebKit and an iPhone-sized screen. Run `npm run build` first, and `npx playwright install` once |
| `npm run test:all` | Everything CI runs: lint, coverage, build, browser tests |

Tests never use real secrets or real data: the browser tests start their own database and sign in with a session cookie signed by a test-only secret.

- `tests/unit/` pure functions
- `tests/integration/` API routes against a real database; `permissions.test.js` generates a test for every cell of `tests/fixtures/permissions.js`
- `tests/e2e/` user flows; tests tagged `@smoke` also run against every Vercel deployment

Every change ships with tests, and a bug fix starts with a test that fails because of the bug.

## CI

GitHub Actions runs `.github/workflows/ci.yml` on every pull request. `main` only accepts a merge when the `ci-passed` check and the preview smoke test pass. `smoke.yml` checks each Vercel deployment from outside, and `weekly.yml` reruns everything on Mondays.
