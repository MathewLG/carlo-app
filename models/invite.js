import { Schema, model, models } from 'mongoose';

// The allow list: an email here can read and write memories. Everyone else
// can sign in with Google but only reaches /unirse.
const InviteSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  // How they got in: an existing memory, the family code, or added by the admin.
  source: {
    type: String,
    enum: ['memoria', 'codigo', 'admin'],
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const Invite = models.Invite || model('Invite', InviteSchema);

export default Invite;
