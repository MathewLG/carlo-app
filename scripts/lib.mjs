import mongoose from 'mongoose';

// Shared by the one-off scripts. Each script names its database explicitly
// (--db carlo_app for production) and only writes when given --apply.
export const parseArgs = (argv = process.argv.slice(2)) => {
  const args = { apply: false, db: null, rest: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--apply') args.apply = true;
    else if (argv[i] === '--db') args.db = argv[(i += 1)];
    else args.rest.push(argv[i]);
  }
  return args;
};

export const connect = async (db) => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set. Run with: node --env-file=.env.local …');
  if (!db) throw new Error('Name the database with --db (carlo_app is production).');
  return mongoose.createConnection(process.env.MONGODB_URI, { dbName: db }).asPromise();
};
