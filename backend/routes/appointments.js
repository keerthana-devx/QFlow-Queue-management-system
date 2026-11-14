const router      = require('express').Router();
const protect     = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Doctor      = require('../models/Doctor');

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

// Generate next token code for a department today
async function nextTokenCode(managerId, department) {
  const prefix = Appointment.getPrefixForDept(department);
  const start  = todayStart();
  const last   = await Appointment.findOne({ managerId, department, issuedAt: { $gte: start } })
                                  .sort('-tokenNumber');
  const num    = last ? last.tokenNumber + 1 : 1;
  return { tokenCode: `${prefix}-${String(num).padStart(3, '0')}`, tokenNumber: num };
}

// Auto-assign: match department, prefer lowest workload, respect preferred doctor
async function autoAssign(managerId, department, preferredDoctor) {
  const query = { managerId, department, available: true };
  const doctors = await Doctor.find(query).sort('activeCount name');
  if (!doctors.length) return null;

  if (preferredDoctor) {
    const pref = doctors.find(d => d.name.toLowerCase().includes(preferredDoctor.toLowerCase()));
    if (pref) return pref;
  }
  return doctors[0]; // lowest workload
}

// Calculate estimated wait for a department (avg service time × queue position)
async function calcEstimatedWait(managerId, department) {
  const completed = await Appointment.find({
    managerId, department, status: 'completed',
    servingAt: { $exists: true }, completedAt: { $exists: true }
  }).sort('-completedAt').limit(20);

  let avgMin = 5; // default 5 min if no history
  if (completed.length) {
    const total = completed.reduce((s, a) => s + (a.completedAt - a.servingAt), 0);
    avgMin = Math.max(1, Math.round(total / completed.length / 60000));
  }

  const waiting = await Appointment.countDocuments({
    managerId, department, status: { $in: ['waiting', 'assigned', 'called'] }
  });
  return waiting * avgMin;
}

// Emit to both manager room and public room
function emit(io, managerId, event, data) {
  io.to(`manager:${managerId}`).emit(event, data);
  io.to(`public:${managerId}`).emit(event, data);
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/appointments — today's appointments
router.get('/', protect, async (req, res) => {
  try {
    const appts = await Appointment.find({ managerId: req.user._id, issuedAt: { $gte: todayStart() } })
      .populate('doctorId', 'name department speciality')
      .sort('tokenNumber issuedAt');
    res.json(appts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/appointments/history — all appointments with filters
router.get('/history', protect, async (req, res) => {
  try {
    const { search, department, doctor, status, date } = req.query;
    const filter = { managerId: req.user._id };

    if (department) filter.department = department;
    if (status)     filter.status = status;
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      const e = new Date(date); e.setHours(23, 59, 59, 999);
      filter.issuedAt = { $gte: d, $lte: e };
    }
    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { tokenCode:   { $regex: search, $options: 'i' } }
      ];
    }

    const appts = await Appointment.find(filter)
      .populate('doctorId', 'name department')
      .sort('-issuedAt')
      .limit(200);
    res.json(appts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/appointments/register — register patient + auto-assign
router.post('/register', protect, async (req, res) => {
  try {
    const { patientName, phone, department, purpose, notes, preferredDoctor } = req.body;
    if (!patientName || !department || !purpose) {
      return res.status(400).json({ message: 'Name, department and purpose are required' });
    }

    const { tokenCode, tokenNumber } = await nextTokenCode(req.user._id, department);
    const doctor = await autoAssign(req.user._id, department, preferredDoctor || '');
    const estimatedWait = await calcEstimatedWait(req.user._id, department);

    const appt = await Appointment.create({
      managerId: req.user._id,
      tokenCode, tokenNumber,
      patientName, phone: phone || '',
      department, purpose,
      notes: notes || '',
      preferredDoctor: preferredDoctor || '',
      doctorId: doctor?._id || null,
      status: doctor ? 'assigned' : 'waiting',
      estimatedWait
    });

    if (doctor) {
      await Doctor.findByIdAndUpdate(doctor._id, { $inc: { activeCount: 1 } });
    }

    const populated = await appt.populate('doctorId', 'name department speciality');
    emit(req.io, req.user._id.toString(), 'appointment:new', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/appointments/call-next — call next assigned/waiting patient
router.post('/call-next', protect, async (req, res) => {
  try {
    const { department } = req.body; // optional: call next in specific dept
    const filter = {
      managerId: req.user._id,
      status: { $in: ['waiting', 'assigned'] },
      issuedAt: { $gte: todayStart() }
    };
    if (department) filter.department = department;

    const next = await Appointment.findOne(filter)
      .populate('doctorId', 'name department speciality')
      .sort('tokenNumber issuedAt');

    if (!next) return res.status(404).json({ message: 'No patients waiting' });

    next.status   = 'called';
    next.calledAt = new Date();
    await next.save();

    emit(req.io, req.user._id.toString(), 'appointment:called', next);
    res.json(next);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/appointments/:id/serve — mark as serving
router.post('/:id/serve', protect, async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, managerId: req.user._id })
      .populate('doctorId', 'name department speciality');
    if (!appt) return res.status(404).json({ message: 'Not found' });
    if (appt.status !== 'called') return res.status(400).json({ message: 'Patient must be called first' });

    appt.status    = 'serving';
    appt.servingAt = new Date();
    await appt.save();

    emit(req.io, req.user._id.toString(), 'appointment:serving', appt);
    res.json(appt);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/appointments/:id/complete
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, managerId: req.user._id })
      .populate('doctorId', 'name department speciality');
    if (!appt) return res.status(404).json({ message: 'Not found' });

    appt.status      = 'completed';
    appt.completedAt = new Date();
    await appt.save();

    if (appt.doctorId) {
      await Doctor.findByIdAndUpdate(appt.doctorId._id, { $inc: { activeCount: -1 } });
    }

    emit(req.io, req.user._id.toString(), 'appointment:completed', appt);
    res.json(appt);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/appointments/:id/cancel
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, managerId: req.user._id })
      .populate('doctorId', 'name department speciality');
    if (!appt) return res.status(404).json({ message: 'Not found' });
    if (['completed', 'cancelled'].includes(appt.status)) {
      return res.status(400).json({ message: 'Cannot cancel a completed or already cancelled appointment' });
    }

    const wasActive = ['assigned', 'called', 'serving'].includes(appt.status);
    appt.status      = 'cancelled';
    appt.cancelledAt = new Date();
    await appt.save();

    if (wasActive && appt.doctorId) {
      await Doctor.findByIdAndUpdate(appt.doctorId._id, { $inc: { activeCount: -1 } });
    }

    emit(req.io, req.user._id.toString(), 'appointment:cancelled', appt);
    res.json(appt);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/appointments/:id/reassign
router.patch('/:id/reassign', protect, async (req, res) => {
  try {
    const { doctorId } = req.body;
    const appt = await Appointment.findOne({ _id: req.params.id, managerId: req.user._id });
    if (!appt) return res.status(404).json({ message: 'Not found' });

    const newDoctor = await Doctor.findOne({ _id: doctorId, managerId: req.user._id });
    if (!newDoctor) return res.status(404).json({ message: 'Doctor not found' });

    // Decrement old doctor workload
    if (appt.doctorId) {
      await Doctor.findByIdAndUpdate(appt.doctorId, { $inc: { activeCount: -1 } });
    }

    appt.doctorId = newDoctor._id;
    appt.status   = 'assigned';
    await appt.save();

    await Doctor.findByIdAndUpdate(newDoctor._id, { $inc: { activeCount: 1 } });

    const populated = await appt.populate('doctorId', 'name department speciality');
    emit(req.io, req.user._id.toString(), 'appointment:reassigned', populated);
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/appointments/public/:managerId — public display (no auth, no private data)
router.get('/public/:managerId', async (req, res) => {
  try {
    const called = await Appointment.find({
      managerId: req.params.managerId,
      status: { $in: ['called', 'serving'] },
      issuedAt: { $gte: todayStart() }
    }).populate('doctorId', 'name department').sort('calledAt');

    const waiting = await Appointment.find({
      managerId: req.params.managerId,
      status: { $in: ['waiting', 'assigned'] },
      issuedAt: { $gte: todayStart() }
    }).populate('doctorId', 'name department').sort('tokenNumber').limit(5);

    const recent = await Appointment.find({
      managerId: req.params.managerId,
      status: 'completed',
      issuedAt: { $gte: todayStart() }
    }).populate('doctorId', 'name department').sort('-completedAt').limit(5);

    // Strip private fields before sending
    const strip = (a) => ({
      _id:        a._id,
      tokenCode:  a.tokenCode,
      department: a.department,
      status:     a.status,
      doctor:     a.doctorId ? { name: a.doctorId.name, department: a.doctorId.department } : null,
      calledAt:   a.calledAt,
      completedAt: a.completedAt
    });

    res.json({
      current: called.map(strip),
      waiting: waiting.map(strip),
      recent:  recent.map(strip),
      waitingCount: await Appointment.countDocuments({
        managerId: req.params.managerId,
        status: { $in: ['waiting', 'assigned'] },
        issuedAt: { $gte: todayStart() }
      })
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
