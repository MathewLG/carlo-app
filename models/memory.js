import { Schema, model, models } from 'mongoose';
import { isLocked } from '@utils/letters';

// `path` is where the file lives in storage (utils/services/storage.js). It
// never leaves the server: JSON replaces it with an app URL that checks access.
const PhotoSchema = new Schema(
  {
    path: { type: String, required: true },
    mime: { type: String, required: true },
    width: Number,
    height: Number,
    caption: String,
  },
  { _id: false },
);

const VoiceSchema = new Schema(
  {
    path: { type: String, required: true },
    mime: { type: String, required: true },
    durationSec: Number,
  },
  { _id: false },
);

const MemorySchema = new Schema(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memory: {
      type: String,
      required: [true, 'Por favor ingresa un mensaje'],
    },
    tag: {
      type: String,
      required: [true, 'Por favor ingresa una categoria'],
    },
    // The day it happened, stored at noon UTC (see utils/dates.js). Empty
    // means the day it was written.
    happenedAt: {
      type: Date,
    },
    // A first time ("Primera palabra", or the family's own words). Empty for
    // ordinary memories. See utils/milestones.js.
    milestone: {
      type: String,
    },
    photo: PhotoSchema,
    voice: VoiceSchema,
    // Carta con candado: sealed until this day (noon UTC; see utils/letters.js).
    // lockAge is set when it was sealed until an age ("cuando cumplas 15").
    unlockAt: {
      type: Date,
    },
    lockAge: {
      type: Number,
    },
    // When the admin was told it opened, so the daily job never emails twice.
    openedNotifiedAt: {
      type: Date,
    },
  },
  // New memories get createdAt/updatedAt. Older ones don't have them, but
  // their _id still carries the creation time.
  { timestamps: true }
);

// The URL changes with the file, so browsers can cache each version.
const mediaUrl = (id, kind, file) => `/api/media/${id}/${kind}?v=${file.path.split('-').pop().split('.')[0]}`;

// What the browser gets for a memory's files: an app URL, never the storage path.
export const publicMedia = (memory) => ({
  photo: memory.photo
    ? {
        url: mediaUrl(memory._id, 'photo', memory.photo),
        width: memory.photo.width,
        height: memory.photo.height,
        caption: memory.photo.caption ?? '',
      }
    : undefined,
  voice: memory.voice
    ? { url: mediaUrl(memory._id, 'voice', memory.voice), durationSec: memory.voice.durationSec }
    : undefined,
});

MemorySchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.openedNotifiedAt;
    return Object.assign(ret, publicMedia(ret), { locked: isLocked(ret) });
  },
});

const Memory = models.Memory || model('Memory', MemorySchema);

export default Memory;
