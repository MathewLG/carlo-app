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
});

const User = models.User || model('User', UserSchema);

export default User;
