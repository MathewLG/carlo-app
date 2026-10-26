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
  // 'YYYY-MM-DD' days of the first and last memory, for ordering.
  startDay: String,
  endDay: String,
  // claude: named in a Claude Code session (scripts/timeline.mjs) · mes: grouped by
  // month until then · hito: a first time
  source: {
    type: String,
    enum: ['claude', 'mes', 'hito', 'admin'],
    required: true,
  },
  locked: {
    type: Boolean,
    default: false,
  },
});

const Event = models.Event || model('Event', EventSchema);

export default Event;
