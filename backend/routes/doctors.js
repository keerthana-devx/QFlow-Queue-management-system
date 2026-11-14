const router  = require('express').Router();
const protect = require('../middleware/auth');
const Doctor  = require('../models/Doctor');

// GET /api/doctors
router.get('/', protect, async (req, res) => {
  try {
    const doctors = await Doctor.find({ managerId: req.user._id }).sort('department name');
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/doctors
router.post('/', protect, async (req, res) => {
  try {
    const { name, department, speciality } = req.body;
    if (!name || !department) return res.status(400).json({ message: 'Name and department required' });
    const doctor = await Doctor.create({ managerId: req.user._id, name, department, speciality: speciality || '' });
    req.io.to(`manager:${req.user._id}`).emit('doctor:updated', doctor);
    res.status(201).json(doctor);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/doctors/:id — update availability or details
router.patch('/:id', protect, async (req, res) => {
  try {
    const doctor = await Doctor.findOneAndUpdate(
      { _id: req.params.id, managerId: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    req.io.to(`manager:${req.user._id}`).emit('doctor:updated', doctor);
    res.json(doctor);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/doctors/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Doctor.findOneAndDelete({ _id: req.params.id, managerId: req.user._id });
    req.io.to(`manager:${req.user._id}`).emit('doctor:deleted', { id: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
