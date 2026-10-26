import { Schema, model, models } from 'mongoose';

// An entry in the Diccionario de Carlo: a word as he said it, and what he
// meant. Marked first words also get their own moment on the timeline.
const WordSchema = new Schema(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // As he said it: "awa".
    word: {
      type: String,
      required: true,
    },
    // What he meant: "agua".
    meaning: {
      type: String,
      required: true,
    },
    // The day he said it, stored at noon UTC (see utils/dates.js).
    saidAt: {
      type: Date,
      required: true,
    },
    // Who heard it, in the family's words: "Mamá y la abuela".
    heardBy: {
      type: String,
    },
    firstWord: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Word = models.Word || model('Word', WordSchema);

export default Word;
