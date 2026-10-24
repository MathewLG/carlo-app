import { Schema, model, models } from 'mongoose';

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
  },
  // New memories get createdAt/updatedAt. Older ones don't have them, but
  // their _id still carries the creation time.
  { timestamps: true }
);

const Memory = models.Memory || model('Memory', MemorySchema);

export default Memory;
