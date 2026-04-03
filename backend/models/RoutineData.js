const mongoose = require('mongoose');

const routineDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateKey: {
    type: String, // e.g., "2026-04-03"
    required: true
  },
  completed: {
    type: [String], // Array of task IDs like ["m1", "e2"]
    default: []
  },
  notes: {
    type: String,
    default: ""
  }
}, { timestamps: true });

// Ensure a user only has one entry per dateKey
routineDataSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('RoutineData', routineDataSchema);
