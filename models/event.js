import { Schema, model, models } from 'mongoose';

// An event on the timeline: a named group of memories, such as "Tu primer
// cumpleaños". Rebuilt from the memories after they change, except events
// the admin edited (locked), which are never regrouped or renamed again.
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
  // claude: named by Claude · mes: grouped by month (no Claude) · hito: a first time
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
