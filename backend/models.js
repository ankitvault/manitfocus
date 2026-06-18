const mongoose = require('mongoose');

// Topic schema
const TopicSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  completed: { type: Boolean, default: false },
  seconds: { type: Number, default: 0 },
  running: { type: Boolean, default: false },
  startedAt: { type: Number, default: null },
  targetMinutes: { type: Number, default: 0 },
  lastStart: { type: Number, default: null },
  lastEnd: { type: Number, default: null }
});

// Daily log schema
const DailyLogItemSchema = new mongoose.Schema({
  total: { type: Number, default: 0 },
  topics: [{
    name: { type: String },
    seconds: { type: Number }
  }]
}, { _id: false });

// Plan schema
const PlanRowSchema = new mongoose.Schema({
  time: { type: String, required: true },
  desc: { type: String, required: true }
}, { _id: false });

// User schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Tracker Data Schema (linked to User)
const TrackerDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  goalMinutes: { type: Number, default: 660 },
  topics: [TopicSchema],
  dailyLog: {
    type: Map,
    of: DailyLogItemSchema,
    default: {}
  },
  todayPlan: {
    type: [PlanRowSchema],
    default: [
      { time: '10:00 – 12:00', desc: 'DSA' },
      { time: '12:00 – 12:30', desc: 'Rest + research' },
      { time: '12:30 – 14:30', desc: 'SQL practice' },
      { time: '14:30 – 17:00', desc: 'OS — all topics' },
      { time: '17:00 – 18:00', desc: 'Research — Manidweep project' },
      { time: '18:00 – 21:00', desc: 'Gadget project · 2× speed' },
      { time: '21:00 – 22:00', desc: 'DSA & SQL revision' },
      { time: '22:00 →', desc: 'Hostel · cook · job research' }
    ]
  }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const TrackerData = mongoose.model('TrackerData', TrackerDataSchema);

module.exports = { User, TrackerData };
