const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const routineRoutes = require('./routes/routine');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB Local
mongoose.connect('mongodb://127.0.0.1:27017/routineDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Compass (routineDB)'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/routine', authMiddleware, routineRoutes);

// Fallback for SPA or unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
