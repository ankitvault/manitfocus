// Trigger server reload
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Serve static assets in production (if requested later)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  // Simple health check route for API in dev
  app.get('/', (req, res) => {
    res.send('MANIT Focus Backend API is running...');
  });
}

// Connect to MongoDB Database
const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manitfocus';
console.log('Connecting to MongoDB...');

mongoose.connect(mongodbUri)
  .then(() => {
    console.log('MongoDB connected successfully.');
    // Start Listening
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB database connection error:', err.message);
    process.exit(1);
  });
