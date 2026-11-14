const router = require('express').Router();
const protect = require('../middleware/auth');
const Token = require('../models/Token');

// GET /api/queue — list today's tokens for this manager
router.get('/', protect, async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const tokens = await Token.find({ managerId: req.user._id, issuedAt: { $gte: start } }).sort('number');
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/queue/issue — issue a new token
router.post('/issue', protect, async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const last = await Token.findOne({ managerId: req.user._id, issuedAt: { $gte: start } }).sort('-number');
    const number = last ? last.number + 1 : 1;
    const token = await Token.create({ number, managerId: req.user._id, customerName: req.body.customerName || 'Walk-in' });
    res.status(201).json(token);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/queue/call-next — mark next waiting token as serving
router.post('/call-next', protect, async (req, res) => {
  try {
    // Complete any currently serving token first
    await Token.updateMany({ managerId: req.user._id, status: 'serving' }, { status: 'completed', completedAt: new Date() });

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const next = await Token.findOne({ managerId: req.user._id, status: 'waiting', issuedAt: { $gte: start } }).sort('number');
    if (!next) return res.status(404).json({ message: 'No waiting tokens' });

    next.status = 'serving';
    next.calledAt = new Date();
    await next.save();
    res.json(next);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/queue/complete/:id — mark a specific token as completed
router.post('/complete/:id', protect, async (req, res) => {
  try {
    const token = await Token.findOne({ _id: req.params.id, managerId: req.user._id });
    if (!token) return res.status(404).json({ message: 'Token not found' });
    token.status = 'completed';
    token.completedAt = new Date();
    await token.save();
    res.json(token);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/queue/reset — clear today's queue (manager only)
router.delete('/reset', protect, async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    await Token.deleteMany({ managerId: req.user._id, issuedAt: { $gte: start } });
    res.json({ message: 'Queue reset' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
