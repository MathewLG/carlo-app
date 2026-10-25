import { Schema, model, models } from 'mongoose';

// One record for app-wide settings, found by its key.
const SettingsSchema = new Schema({
  key: {
    type: String,
    default: 'app',
    unique: true,
  },
  // The family code is stored only as a scrypt hash; see utils/joinCode.js.
  joinCodeHash: String,
  joinCodeSalt: String,
  joinOpen: {
    type: Boolean,
    default: false,
  },
  // Wrong codes across all accounts in the current window.
  joinFailures: {
    count: { type: Number, default: 0 },
    windowStart: Date,
  },
});

const Settings = models.Settings || model('Settings', SettingsSchema);

export const getSettings = () =>
  Settings.findOneAndUpdate({ key: 'app' }, { $setOnInsert: { key: 'app' } }, { upsert: true, new: true });

export default Settings;
