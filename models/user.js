import { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  email: {
    type: String,
    unique: true,
    required: [true, 'Email is required!'],
  },
  // The old rule required 8-20 characters, which blocked anyone with a short
  // Google name from signing in. Existing usernames still pass this rule.
  username: {
    type: String,
    required: [true, 'Username is required!'],
    minlength: 3,
    maxlength: 30,
  },
  image: {
    type: String,
  },
  // Only scripts/make-admin.mjs sets 'admin'; no screen can grant it.
  role: {
    type: String,
    enum: ['familiar', 'admin', 'carlo'],
    default: 'familiar',
  },
  // Wrong family codes from this account in the current window.
  joinAttempts: {
    count: { type: Number, default: 0 },
    windowStart: Date,
  },
});

const User = models.User || model('User', UserSchema);

export default User;
