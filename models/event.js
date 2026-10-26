import { Schema, model, models } from 'mongoose';

// An event on the timeline: a named group of memories, such as "Tu primer
// cumpleaños". Rebuilt from the memories after they change. Events named in a
// session and events the admin edited (locked) are kept; a session never
// regroups or renames the admin's.
const EventSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  memoryIds: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Memory',
    },
  ],
  // A first word from the Diccionario (source 'palabra'). Such an event has
  // no memories and is rebuilt from the dictionary, never edited here.
  wordIds: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Word',
    },
  ],
  // 'YYYY-MM-DD' days of the first and last memory, for ordering.
  startDay: String,
  endDay: String,
  // claude: named in a Claude Code session (scripts/timeline.mjs) · mes: grouped by
  // month until then · hito: a first time · palabra: a first word
  source: {
    type: String,
    enum: ['claude', 'mes', 'hito', 'palabra', 'admin'],
    required: true,
  },
  locked: {
    type: Boolean,
    default: false,
  },
});

const Event = models.Event || model('Event', EventSchema);

export default Event;
