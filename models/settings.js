import { Schema, model, models } from 'mongoose';

// One record for app-wide settings, found by its key.
const SettingsSchema = new Schema({
  key: {
    type: String,
    default: 'app',
    unique: true,
  },
  // Stored at noon UTC like every picked day; see utils/dates.js.
  carloBirthDate: Date,
  // The family code is stored only as a scrypt hash; see utils/joinCode.js.
  joinCodeHash: String,
  joinCodeSalt: String,
  joinOpen: {
    type: Boolean,
    default: false,
  },
  // The timeline is rebuilt after memories change: dirty marks that it is
  // out of date, builtAt limits rebuilds to one a minute, and buildingUntil
  // keeps two rebuilds from running at once.
  timelineDirty: {
    type: Boolean,
    default: true,
  },
  timelineBuiltAt: Date,
  timelineBuildingUntil: Date,
  // Carlo's own account (utils/carlo.js): his email, the age his access
  // opens at, whether it was opened early or paused, and his welcome.
  carloEmail: {
    type: String,
    lowercase: true,
    trim: true,
  },
  carloAccessAge: {
    type: Number,
    default: 15,
  },
  carloAccess: {
    type: String,
    enum: ['auto', 'open', 'paused'],
    default: 'auto',
  },
  welcomeText: String,
  // The admin's monthly email: on unless turned off; lastReminderMonth
  // ('YYYY-MM') is the month already sent, so it goes out once.
  monthlyReminder: {
    type: Boolean,
    default: true,
  },
  lastReminderMonth: String,
  // Wrong codes across all accounts in the current window.
  joinFailures: {
    count: { type: Number, default: 0 },
    windowStart: Date,
  },
});

const Settings = models.Settings || model('Settings', SettingsSchema);

export const getSettings = () =>
  Settings.findOneAndUpdate({ key: 'app' }, { $setOnInsert: { key: 'app' } }, { upsert: true, returnDocument: 'after' });

export default Settings;
