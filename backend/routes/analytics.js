const router      = require('express').Router();
const protect     = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Doctor      = require('../models/Doctor');

router.get('/', protect, async (req, res) => {
  try {
    const mid   = req.user._id;
    const start = new Date(); start.setHours(0, 0, 0, 0);

    const [today, allCompleted, doctors] = await Promise.all([
      Appointment.find({ managerId: mid, issuedAt: { $gte: start } }),
      Appointment.find({ managerId: mid, status: 'completed', servingAt: { $exists: true }, completedAt: { $exists: true } }),
      Doctor.find({ managerId: mid })
    ]);

    const byStatus = (s) => today.filter(a => a.status === s).length;

    // Avg service duration (serving → completed)
    let avgServiceTime = 0;
    if (allCompleted.length) {
      const total = allCompleted.reduce((s, a) => s + (a.completedAt - a.servingAt), 0);
      avgServiceTime = Math.round(total / allCompleted.length / 60000);
    }

    // Avg waiting time (issued → called)
    const withWait = allCompleted.filter(a => a.calledAt);
    let avgWaitTime = 0;
    if (withWait.length) {
      const total = withWait.reduce((s, a) => s + (a.calledAt - a.issuedAt), 0);
      avgWaitTime = Math.round(total / withWait.length / 60000);
    }

    const waiting   = byStatus('waiting') + byStatus('assigned');
    const serving   = byStatus('serving') + byStatus('called');
    const completed = byStatus('completed');
    const cancelled = byStatus('cancelled');

    const estimatedWait = waiting * (avgServiceTime || 5);

    // Department breakdown
    const deptMap = {};
    today.forEach(a => {
      deptMap[a.department] = (deptMap[a.department] || 0) + 1;
    });
    const byDepartment = Object.entries(deptMap).map(([dept, count]) => ({ dept, count }));

    // Doctor workload today
    const doctorWorkload = doctors.map(d => ({
      name:        d.name,
      department:  d.department,
      available:   d.available,
      activeCount: d.activeCount,
      completedToday: today.filter(a => String(a.doctorId) === String(d._id) && a.status === 'completed').length
    }));

    // Last 7 days trend
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0);
    const weekly = await Appointment.aggregate([
      { $match: { managerId: mid, issuedAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$issuedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      total: today.length, waiting, serving, completed, cancelled,
      avgServiceTime, avgWaitTime, estimatedWait,
      byDepartment, doctorWorkload, weekly
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
