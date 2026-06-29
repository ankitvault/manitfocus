const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./auth');
const { User, TrackerData } = require('./models');

// JWT Secret Key Helper
const getJwtSecret = () => process.env.JWT_SECRET || 'super_secret_key_for_manit_focus_123!@#';

/* =========================================================================
   AUTH ROUTES
   ========================================================================= */

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  try {
    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save user
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });
    const savedUser = await newUser.save();

    // Create Tracker Data defaults for the new user
    const defaultTopics = [
      { id: 't-rev', name: 'Revision', completed: false, seconds: 0, running: false }
    ];
    const newTrackerData = new TrackerData({
      userId: savedUser._id,
      goalMinutes: 660,
      topics: defaultTopics,
      dailyLog: {}
    });
    await newTrackerData.save();

    // Generate JWT Token
    const token = jwt.sign(
      { userId: savedUser._id },
      getJwtSecret(),
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    // Check user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user._id },
      getJwtSecret(),
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user metadata
router.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get user details error:', err);
    res.status(500).json({ message: 'Server error fetching user details' });
  }
});


/* =========================================================================
   TRACKER DATA ROUTES
   ========================================================================= */

// @route   GET /api/tracker
// @desc    Get user's tracker dataset
router.get('/tracker', authMiddleware, async (req, res) => {
  try {
    let tracker = await TrackerData.findOne({ userId: req.userId });
    
    // Fallback: If no tracker dataset exists (unlikely if created at registration, but safe)
    if (!tracker) {
      const defaultTopics = [
        { id: 't-rev', name: 'Revision', completed: false, seconds: 0, running: false }
      ];
      tracker = new TrackerData({
        userId: req.userId,
        goalMinutes: 660,
        topics: defaultTopics,
        dailyLog: {}
      });
      await tracker.save();
    }
    
    res.json({
      goalMinutes: tracker.goalMinutes,
      topics: tracker.topics,
      dailyLog: tracker.dailyLog,
      todayPlan: tracker.todayPlan
    });

  } catch (err) {
    console.error('Get tracker error:', err);
    res.status(500).json({ message: 'Server error fetching study tracker data' });
  }
});

// @route   POST /api/tracker
// @desc    Full sync / save tracker dataset
router.post('/tracker', authMiddleware, async (req, res) => {
  const { goalMinutes, topics, dailyLog, todayPlan } = req.body;

  try {
    let tracker = await TrackerData.findOne({ userId: req.userId });

    if (!tracker) {
      tracker = new TrackerData({
        userId: req.userId
      });
    }

    if (goalMinutes !== undefined) tracker.goalMinutes = goalMinutes;
    if (topics !== undefined) tracker.topics = topics;
    if (dailyLog !== undefined) tracker.dailyLog = dailyLog;
    if (todayPlan !== undefined) tracker.todayPlan = todayPlan;

    await tracker.save();
    res.json({ success: true, message: 'Study tracker data synced successfully' });

  } catch (err) {
    console.error('Sync tracker error:', err);
    res.status(500).json({ message: 'Server error synchronizing study tracker data' });
  }
});

module.exports = router;
