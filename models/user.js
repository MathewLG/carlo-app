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
  // "Mi nombre en Carlo App": shown instead of username when set.
  displayName: {
    type: String,
    trim: true,
    maxlength: 40,
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

// What anyone in the family may see of an author. Emails stay on the server.
export const PUBLIC_FIELDS = 'username displayName image';

const User = models.User || model('User', UserSchema);

export default User;
