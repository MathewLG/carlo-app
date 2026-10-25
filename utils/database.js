import mongoose from 'mongoose';

// Only the production deployment touches the real memories. Previews and local
// dev share a separate database; MONGODB_DB overrides both (tests use it).
export const databaseName = (env = process.env) =>
  env.MONGODB_DB || (env.VERCEL_ENV === 'production' ? 'carlo_app' : 'carlo_app_preview');

export const connectToDB = async () => {
  mongoose.set('strictQuery', true);

  // 1 = connected, 2 = connecting. Reuse the connection across warm invocations.
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return mongoose.connection.asPromise();
  }

  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName() });
};
