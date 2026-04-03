const express = require('express');
const RoutineData = require('../models/RoutineData');
const router = express.Router();

// GET /api/routine/list
// Returns a list of all dateKeys for the logged-in user (for history/analytics)
router.get('/list', async (req, res) => {
  try {
    const data = await RoutineData.find({ userId: req.user.userId }).sort({ dateKey: 1 });
    // Transform into standard payload
    const records = data.map(d => ({
      date: d.dateKey,
      completed: d.completed,
      notes: d.notes
    }));
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching routine list' });
  }
});

// GET /api/routine/history/keys
// Specifically returns just the string prefix keys mimicking the old localStorage `list` method
router.get('/history/keys', async (req, res) => {
    try {
        const data = await RoutineData.find({ userId: req.user.userId }).select('dateKey');
        const keys = data.map(d => `routine:day:${d.dateKey}`);
        res.json(keys);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching history keys' });
    }
});

// GET /api/routine/:dateKey
// Gets the data for a specific day
router.get('/:dateKey', async (req, res) => {
  try {
    const { dateKey } = req.params;
    const routine = await RoutineData.findOne({ userId: req.user.userId, dateKey });
    
    if (!routine) {
        // Return null/empty if not tracked yet
        return res.json(null);
    }
    
    res.json({
        date: routine.dateKey,
        completed: routine.completed,
        notes: routine.notes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching daily routine' });
  }
});

// POST /api/routine/:dateKey
// Upserts the tracking data for a specific day
router.post('/:dateKey', async (req, res) => {
  try {
    const { dateKey } = req.params;
    const { completed, notes } = req.body;

    const updatedData = await RoutineData.findOneAndUpdate(
      { userId: req.user.userId, dateKey },
      { $set: { completed: completed || [], notes: notes || '' } },
      { new: true, upsert: true }
    );

    res.json(updatedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving daily routine' });
  }
});

module.exports = router;
