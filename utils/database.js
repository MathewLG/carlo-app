import mongoose from 'mongoose';

export const connectToDB = async () => {
  mongoose.set('strictQuery', true);

  // 1 = connected, 2 = connecting. Reuse the connection across warm invocations.
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return mongoose.connection.asPromise();
  }

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'carlo_app' });
};
