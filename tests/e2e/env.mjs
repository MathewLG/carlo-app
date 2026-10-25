// Shared by the test server and the tests, so both talk to the same database.
// None of these values are real: the e2e app never sees production secrets.
export const APP_PORT = 3100;
export const MONGO_PORT = 27999;
export const MONGODB_URI = `mongodb://127.0.0.1:${MONGO_PORT}/`;
export const MONGODB_DB = 'carlo_app_e2e';
export const NEXTAUTH_SECRET = process.env.E2E_NEXTAUTH_SECRET || 'e2e-only-secret-not-used-anywhere-else';
